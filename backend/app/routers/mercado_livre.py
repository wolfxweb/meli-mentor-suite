from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import MercadoLivreIntegration, ProductAdsData, MercadoLivreOrder
from app.schemas import MercadoLivreIntegration as MercadoLivreIntegrationSchema, OAuth2AuthorizationRequest
from app.auth import get_current_user
from app.services.mercado_livre import mercado_livre_service
from typing import Optional
import logging
import httpx
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/authorization-url")
async def get_authorization_url(
    current_user = Depends(get_current_user),
    redirect_uri: Optional[str] = Query(None)
):
    """Gera a URL de autorização do Mercado Livre."""
    try:
        # Usa a redirect_uri fornecida ou a padrão
        if redirect_uri:
            mercado_livre_service.redirect_uri = redirect_uri
        
        # Gera um state único baseado no ID da empresa
        state = f"company_{current_user.company_id}"
        
        auth_url = mercado_livre_service.get_authorization_url(state=state)
        
        return {
            "authorization_url": auth_url,
            "state": state
        }
    except Exception as e:
        logger.error(f"Error generating authorization URL: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao gerar URL de autorização"
        )

@router.post("/callback")
async def handle_oauth_callback(
    code: str = Query(...),
    state: str = Query(None),
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Processa o callback do OAuth2 do Mercado Livre."""
    try:
        # Valida o state se fornecido
        if state and not state.startswith(f"company_{current_user.company_id}"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="State inválido"
            )
        
        # Troca o código por um token
        token_response = await mercado_livre_service.exchange_code_for_token(code)
        
        # Salva a integração no banco
        integration = mercado_livre_service.save_integration(
            db, current_user.company_id, token_response
        )
        
        # Obtém informações do usuário no Mercado Livre
        user_info = await mercado_livre_service.get_user_info(token_response.access_token)
        
        return {
            "message": "Integração com Mercado Livre realizada com sucesso!",
            "integration_id": integration.id,
            "user_info": {
                "id": user_info.get("id"),
                "nickname": user_info.get("nickname"),
                "email": user_info.get("email"),
                "first_name": user_info.get("first_name"),
                "last_name": user_info.get("last_name")
            },
            "expires_at": integration.expires_at
        }
        
    except Exception as e:
        logger.error(f"Error handling OAuth callback: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Erro ao processar callback do Mercado Livre"
        )

@router.get("/status")
async def get_integration_status(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Verifica o status da integração com o Mercado Livre."""
    try:
        integration = db.query(MercadoLivreIntegration).filter(
            MercadoLivreIntegration.company_id == current_user.company_id
        ).first()
        
        if not integration:
            return {
                "connected": False,
                "message": "Nenhuma integração encontrada"
            }
        
        # Testa se a conexão ainda está válida
        is_valid = await mercado_livre_service.test_connection(integration.access_token)
        
        return {
            "connected": integration.is_active and is_valid,
            "integration": MercadoLivreIntegrationSchema.from_orm(integration),
            "expires_at": integration.expires_at,
            "user_id": integration.user_id
        }
        
    except Exception as e:
        logger.error(f"Error checking integration status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao verificar status da integração"
        )

@router.post("/refresh")
async def refresh_token(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Renova o token de acesso do Mercado Livre."""
    try:
        integration = db.query(MercadoLivreIntegration).filter(
            MercadoLivreIntegration.company_id == current_user.company_id,
            MercadoLivreIntegration.is_active == True
        ).first()
        
        if not integration or not integration.refresh_token:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Nenhuma integração ativa encontrada ou refresh token indisponível"
            )
        
        # Renova o token
        token_response = await mercado_livre_service.refresh_access_token(
            integration.refresh_token
        )
        
        # Atualiza a integração
        updated_integration = mercado_livre_service.save_integration(
            db, current_user.company_id, token_response
        )
        
        return {
            "message": "Token renovado com sucesso",
            "expires_at": updated_integration.expires_at
        }
        
    except Exception as e:
        logger.error(f"Error refreshing token: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Erro ao renovar token"
        )

@router.delete("/disconnect")
async def disconnect_integration(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Desconecta a integração com o Mercado Livre."""
    try:
        integration = db.query(MercadoLivreIntegration).filter(
            MercadoLivreIntegration.company_id == current_user.company_id
        ).first()
        
        if not integration:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Nenhuma integração encontrada"
            )
        
        # Desativa a integração
        integration.is_active = False
        db.commit()
        
        return {
            "message": "Integração desconectada com sucesso"
        }
        
    except Exception as e:
        logger.error(f"Error disconnecting integration: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao desconectar integração"
        )

@router.get("/test-connection")
async def test_connection(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Testa a conexão com o Mercado Livre."""
    try:
        valid_token = mercado_livre_service.get_valid_token(db, current_user.company_id)
        
        if not valid_token:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Token inválido ou expirado"
            )
        
        # Testa a conexão
        is_working = await mercado_livre_service.test_connection(valid_token)
        
        if is_working:
            user_info = await mercado_livre_service.get_user_info(valid_token)
            return {
                "status": "success",
                "message": "Conexão com Mercado Livre funcionando",
                "user_info": {
                    "id": user_info.get("id"),
                    "nickname": user_info.get("nickname"),
                    "email": user_info.get("email")
                }
            }
        else:
            return {
                "status": "error",
                "message": "Conexão com Mercado Livre falhou"
            }
            
    except Exception as e:
        logger.error(f"Error testing connection: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao testar conexão"
        )

@router.get("/auth/callback")
async def handle_auth_callback(
    code: str = Query(...),
    state: str = Query(None),
    db: Session = Depends(get_db)
):
    """Processa o callback do OAuth2 do Mercado Livre - endpoint público."""
    try:
        # Valida o state para extrair o company_id
        if not state or not state.startswith("company_"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="State inválido"
            )
        
        company_id = int(state.replace("company_", ""))
        
        # Troca o código por um token
        token_response = await mercado_livre_service.exchange_code_for_token(code)
        
        # Salva a integração no banco
        integration = mercado_livre_service.save_integration(
            db, company_id, token_response
        )
        
        # Obtém informações do usuário no Mercado Livre
        user_info = await mercado_livre_service.get_user_info(token_response.access_token)
        
        return {
            "message": "Integração com Mercado Livre realizada com sucesso!",
            "integration_id": integration.id,
            "user_info": {
                "id": user_info.get("id"),
                "nickname": user_info.get("nickname"),
                "email": user_info.get("email"),
                "first_name": user_info.get("first_name"),
                "last_name": user_info.get("last_name")
            },
            "expires_at": integration.expires_at
        }
        
    except Exception as e:
        logger.error(f"Error handling OAuth callback: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Erro ao processar callback do Mercado Livre"
        )

@router.post("/notifications/callback")
async def handle_notifications_callback(
    request: dict,
    db: Session = Depends(get_db)
):
    """Processa notificações webhook do Mercado Livre."""
    try:
        logger.info(f"Received notification from Mercado Livre: {request}")
        
        # Aqui você pode processar diferentes tipos de notificações
        # Exemplo: mudanças em produtos, pedidos, etc.
        
        return {"status": "received", "message": "Notification processed successfully"}
        
    except Exception as e:
        logger.error(f"Error processing notification: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao processar notificação"
        )

@router.get("/item-details/{item_id}")
async def get_item_details(
    item_id: str,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Busca detalhes de um anúncio específico via API do Mercado Livre."""
    try:
        async with httpx.AsyncClient() as client:
            # Primeiro, tentar buscar como anúncio público (sem autenticação)
            response = await client.get(
                f"https://api.mercadolibre.com/items/{item_id}"
            )
            
            if response.status_code == 200:
                item_data = response.json()
                logger.info(f"Item details retrieved successfully for {item_id} (public)")
                return item_data
            elif response.status_code == 404:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Anúncio não encontrado no Mercado Livre"
                )
            elif response.status_code == 403:
                # Se for anúncio privado ou restrito, tentar com token do usuário
                integration = db.query(MercadoLivreIntegration).filter(
                    MercadoLivreIntegration.company_id == current_user.company_id,
                    MercadoLivreIntegration.is_active == True
                ).first()
                
                if not integration:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Anúncio não está disponível publicamente e você não tem permissão para acessá-lo"
                    )
                
                # Tentar com token autenticado
                response = await client.get(
                    f"https://api.mercadolibre.com/items/{item_id}",
                    headers={"Authorization": f"Bearer {integration.access_token}"}
                )
                
                if response.status_code == 200:
                    item_data = response.json()
                    logger.info(f"Item details retrieved successfully for {item_id} (authenticated)")
                    return item_data
                elif response.status_code == 401:
                    # Token pode ter expirado, tentar renovar
                    try:
                        if integration.refresh_token:
                            token_response = await mercado_livre_service.refresh_access_token(
                                integration.refresh_token
                            )
                            updated_integration = mercado_livre_service.save_integration(
                                db, current_user.company_id, token_response
                            )
                            
                            # Tentar novamente com o novo token
                            response = await client.get(
                                f"https://api.mercadolibre.com/items/{item_id}",
                                headers={"Authorization": f"Bearer {updated_integration.access_token}"}
                            )
                            
                            if response.status_code == 200:
                                item_data = response.json()
                                return item_data
                    except Exception as refresh_error:
                        logger.error(f"Error refreshing token: {refresh_error}")
                    
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="Token de acesso expirado ou inválido"
                    )
                elif response.status_code == 403:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Anúncio não está disponível ou você não tem permissão para acessá-lo"
                    )
                else:
                    raise HTTPException(
                        status_code=response.status_code,
                        detail=f"Erro ao buscar detalhes do anúncio: {response.text}"
                    )
            else:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Erro ao buscar detalhes do anúncio: {response.text}"
                )
                
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao buscar detalhes do item {item_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro interno ao buscar detalhes do anúncio"
        )

def process_listing_prices_data(listing_data: dict, item_data: dict) -> dict:
    """Processa dados oficiais da API de listing_prices do Mercado Livre."""
    costs_data = {
        "listing_type": listing_data.get("listing_type_name", "N/A"),
        "listing_type_id": listing_data.get("listing_type_id", "N/A"),
        "listing_exposure": listing_data.get("listing_exposure", "N/A"),
        "currency_id": listing_data.get("currency_id", "BRL"),
        "requires_picture": listing_data.get("requires_picture", False),
        "free_relist": listing_data.get("free_relist", False),
        "stop_time": listing_data.get("stop_time"),
        
        # Custos de listagem
        "listing_fee_amount": listing_data.get("listing_fee_amount", 0),
        "listing_fee_details": listing_data.get("listing_fee_details", {}),
        
        # Custos de venda
        "sale_fee_amount": listing_data.get("sale_fee_amount", 0),
        "sale_fee_details": listing_data.get("sale_fee_details", {}),
        
        # Informações do item
        "item_info": {
            "price": item_data.get("price", 0),
            "category_id": item_data.get("category_id"),
            "condition": item_data.get("condition"),
            "sold_quantity": item_data.get("sold_quantity", 0),
            "available_quantity": item_data.get("available_quantity", 0),
            "shipping": item_data.get("shipping", {})
        }
    }
    
    # Calcular custos totais
    total_costs = costs_data["listing_fee_amount"] + costs_data["sale_fee_amount"]
    costs_data["total_estimated_cost"] = total_costs
    
    return costs_data

def create_fallback_costs_data(item_data: dict) -> dict:
    """Cria dados de custos básicos quando não consegue acessar a API oficial."""
    listing_type_id = item_data.get("listing_type_id", "free")
    
    # Estimativas baseadas no tipo de listagem
    if listing_type_id in ["gold_special", "gold_pro"]:
        listing_fee = 15.90
        sale_fee_percentage = 0.12
    elif listing_type_id == "gold":
        listing_fee = 7.90
        sale_fee_percentage = 0.12
    else:
        listing_fee = 0
        sale_fee_percentage = 0.12
    
    price = item_data.get("price", 0)
    sale_fee_amount = price * sale_fee_percentage
    
    return {
        "listing_type": "Estimativa",
        "listing_type_id": listing_type_id,
        "listing_exposure": "N/A",
        "currency_id": item_data.get("currency_id", "BRL"),
        "requires_picture": True,
        "free_relist": False,
        "stop_time": None,
        
        "listing_fee_amount": listing_fee,
        "listing_fee_details": {
            "fixed_fee": listing_fee,
            "gross_amount": listing_fee
        },
        
        "sale_fee_amount": sale_fee_amount,
        "sale_fee_details": {
            "percentage_fee": sale_fee_percentage * 100,
            "gross_amount": sale_fee_amount
        },
        
        "item_info": {
            "price": price,
            "category_id": item_data.get("category_id"),
            "condition": item_data.get("condition"),
            "sold_quantity": item_data.get("sold_quantity", 0),
            "available_quantity": item_data.get("available_quantity", 0),
            "shipping": item_data.get("shipping", {})
        },
        
        "total_estimated_cost": listing_fee + sale_fee_amount,
        "is_estimate": True
    }

@router.get("/item-costs/{item_id}")
async def get_item_costs(
    item_id: str,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Busca informações de custos e taxas de um anúncio do Mercado Livre usando a API oficial de listing_prices."""
    try:
        # Buscar integração ativa do usuário
        integration = db.query(MercadoLivreIntegration).filter(
            MercadoLivreIntegration.company_id == current_user.company_id,
            MercadoLivreIntegration.is_active == True
        ).first()
        
        if not integration:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Integração com Mercado Livre não encontrada"
            )
        
        # Verificar se o token precisa ser renovado
        valid_token = integration.access_token
        if integration.expires_at and datetime.utcnow() >= integration.expires_at:
            # Renovar token
            try:
                new_token_data = await mercado_livre_service.refresh_access_token(integration.refresh_token)
                integration.access_token = new_token_data.access_token
                integration.refresh_token = new_token_data.refresh_token
                integration.expires_at = datetime.utcnow() + timedelta(seconds=new_token_data.expires_in)
                db.commit()
                valid_token = integration.access_token
            except Exception as e:
                logger.error(f"Erro ao renovar token: {e}")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Erro ao renovar token de acesso"
                )
        
        async with httpx.AsyncClient() as client:
            costs_data = {}
            
            try:
                # 1. Buscar informações básicas do item
                item_response = await client.get(
                    f"https://api.mercadolibre.com/items/{item_id}",
                    headers={"Authorization": f"Bearer {valid_token}"}
                )
                
                if item_response.status_code == 200:
                    item_data = item_response.json()
                    price = item_data.get("price", 0)
                    category_id = item_data.get("category_id")
                    listing_type_id = item_data.get("listing_type_id")
                    currency_id = item_data.get("currency_id", "BRL")
                    site_id = item_data.get("site_id", "MLB")
                    
                    # 2. Buscar custos oficiais usando a API de listing_prices
                    listing_prices_url = f"https://api.mercadolibre.com/sites/{site_id}/listing_prices"
                    params = {
                        "price": price,
                        "category_id": category_id,
                        "currency_id": currency_id
                    }
                    
                    # Se temos o listing_type_id, adicionar aos parâmetros para busca mais específica
                    if listing_type_id:
                        params["listing_type_id"] = listing_type_id
                    
                    listing_prices_response = await client.get(
                        listing_prices_url,
                        params=params,
                        headers={"Authorization": f"Bearer {valid_token}"}
                    )
                    
                    if listing_prices_response.status_code == 200:
                        listing_prices_data = listing_prices_response.json()
                        
                        # Se retornou array, pegar o primeiro item (ou o que corresponde ao listing_type_id)
                        if isinstance(listing_prices_data, list):
                            if listing_type_id:
                                # Buscar o item que corresponde ao listing_type_id do anúncio
                                current_listing_data = next(
                                    (item for item in listing_prices_data if item.get("listing_type_id") == listing_type_id),
                                    listing_prices_data[0] if listing_prices_data else None
                                )
                            else:
                                current_listing_data = listing_prices_data[0] if listing_prices_data else None
                        else:
                            current_listing_data = listing_prices_data
                        
                        if current_listing_data:
                            # Processar dados oficiais de custos
                            costs_data = process_listing_prices_data(current_listing_data, item_data)
                        else:
                            # Fallback para dados básicos se não conseguir buscar custos oficiais
                            costs_data = create_fallback_costs_data(item_data)
                    else:
                        logger.warning(f"Erro ao buscar listing_prices: {listing_prices_response.status_code}")
                        # Fallback para dados básicos
                        costs_data = create_fallback_costs_data(item_data)
                    
                else:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="Anúncio não encontrado"
                    )
                    
            except httpx.RequestError as e:
                logger.error(f"Erro na requisição para API do Mercado Livre: {e}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Erro ao acessar API do Mercado Livre"
                )
        
        return {
            "success": True,
            "item_id": item_id,
            "costs_data": costs_data,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao buscar custos do item: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro interno ao buscar custos do item"
        )

# ===== ENDPOINTS DE PUBLICIDADE (PRODUCT ADS) =====

@router.get("/advertisers")
async def get_advertisers(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Busca os anunciantes (advertisers) disponíveis para o usuário."""
    try:
        integration = db.query(MercadoLivreIntegration).filter(
            MercadoLivreIntegration.company_id == current_user.company_id,
            MercadoLivreIntegration.is_active == True
        ).first()
        
        if not integration:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Integração com Mercado Livre não encontrada"
            )
        
        # Verificar se o token precisa ser renovado
        valid_token = integration.access_token
        if integration.expires_at and datetime.utcnow() >= integration.expires_at:
            try:
                new_token_data = await mercado_livre_service.refresh_access_token(integration.refresh_token)
                integration.access_token = new_token_data.access_token
                integration.refresh_token = new_token_data.refresh_token
                integration.expires_at = datetime.utcnow() + timedelta(seconds=new_token_data.expires_in)
                db.commit()
                valid_token = integration.access_token
            except Exception as e:
                logger.error(f"Erro ao renovar token: {e}")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Erro ao renovar token de acesso"
                )
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"https://api.mercadolibre.com/advertising/advertisers?product_id=PADS&user_id={integration.user_id}",
                headers={
                    "Authorization": f"Bearer {valid_token}",
                    "Content-Type": "application/json",
                    "Api-Version": "1"
                }
            )
            
            if response.status_code == 200:
                advertisers_data = response.json()
                advertisers_result = {
                    "success": True,
                    "advertisers": advertisers_data.get("advertisers", []),
                    "timestamp": datetime.utcnow().isoformat()
                }
            elif response.status_code == 404:
                advertisers_result = {
                    "success": False,
                    "message": "Usuário não tem permissões para Product Ads",
                    "advertisers": [],
                    "timestamp": datetime.utcnow().isoformat()
                }
            else:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Erro ao buscar anunciantes: {response.text}"
                )
        
        return advertisers_result
                
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao buscar anunciantes: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro interno ao buscar anunciantes"
        )

@router.get("/product-ads/items/{item_id}")
async def get_product_ads_item_details(
    item_id: str,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Busca detalhes de um anúncio específico no Product Ads."""
    try:
        integration = db.query(MercadoLivreIntegration).filter(
            MercadoLivreIntegration.company_id == current_user.company_id,
            MercadoLivreIntegration.is_active == True
        ).first()
        
        if not integration:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Integração com Mercado Livre não encontrada"
            )
        
        # Verificar se o token precisa ser renovado
        valid_token = integration.access_token
        if integration.expires_at and datetime.utcnow() >= integration.expires_at:
            try:
                new_token_data = await mercado_livre_service.refresh_access_token(integration.refresh_token)
                integration.access_token = new_token_data.access_token
                integration.refresh_token = new_token_data.refresh_token
                integration.expires_at = datetime.utcnow() + timedelta(seconds=new_token_data.expires_in)
                db.commit()
                valid_token = integration.access_token
            except Exception as e:
                logger.error(f"Erro ao renovar token: {e}")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Erro ao renovar token de acesso"
                )
        
        # Primeiro, buscar os anunciantes para obter o advertiser_id
        async with httpx.AsyncClient() as client:
            advertisers_response = await client.get(
                f"https://api.mercadolibre.com/advertising/advertisers?product_id=PADS&user_id={integration.user_id}",
                headers={
                    "Authorization": f"Bearer {valid_token}",
                    "Content-Type": "application/json",
                    "Api-Version": "1"
                }
            )
            
            if advertisers_response.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Não foi possível obter informações do anunciante"
                )
            
            advertisers_data = advertisers_response.json()
            advertisers = advertisers_data.get("advertisers", [])
            
            if not advertisers:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Nenhum anunciante encontrado"
                )
            
            # Usar o primeiro anunciante (geralmente há apenas um por usuário)
            advertiser = advertisers[0]
            advertiser_id = advertiser.get("advertiser_id")
            site_id = advertiser.get("site_id", "MLB")
            
            # Buscar detalhes do anúncio no Product Ads - endpoint correto
            ads_response = await client.get(
                f"https://api.mercadolibre.com/marketplace/advertising/{site_id}/product_ads/ads/{item_id}",
                headers={
                    "Authorization": f"Bearer {valid_token}",
                    "api-version": "2"
                }
            )
            
            if ads_response.status_code == 200:
                ads_data = ads_response.json()
                logger.info(f"Dados do anúncio obtidos: {ads_data}")
                ads_result = {
                    "success": True,
                    "item_id": item_id,
                    "advertiser_id": advertiser_id,
                    "site_id": site_id,
                    "ads_data": ads_data,
                    "timestamp": datetime.utcnow().isoformat()
                }
            elif ads_response.status_code == 404:
                ads_result = {
                    "success": False,
                    "message": "Anúncio não encontrado no Product Ads",
                    "item_id": item_id,
                    "timestamp": datetime.utcnow().isoformat()
                }
            else:
                raise HTTPException(
                    status_code=ads_response.status_code,
                    detail=f"Erro ao buscar anúncio no Product Ads: {ads_response.text}"
                )
        
        return ads_result
                
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao buscar anúncio no Product Ads: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro interno ao buscar anúncio no Product Ads"
        )

@router.post("/product-ads/sync/{item_id}")
async def sync_product_ads_data(
    item_id: str,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Sincroniza dados de publicidade de um anúncio específico para todos os períodos e salva no banco de dados.
    
    Args:
        item_id: ID do item no Mercado Livre
    """
    try:
        logger.info(f"=== INICIANDO SINCRONIZAÇÃO DE PUBLICIDADE PARA {item_id} ===")
        integration = db.query(MercadoLivreIntegration).filter(
            MercadoLivreIntegration.company_id == current_user.company_id,
            MercadoLivreIntegration.is_active == True
        ).first()
        
        if not integration:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Integração com Mercado Livre não encontrada"
            )
        
        # Verificar se o token precisa ser renovado
        valid_token = integration.access_token
        if integration.expires_at and datetime.utcnow() >= integration.expires_at:
            try:
                new_token_data = await mercado_livre_service.refresh_access_token(integration.refresh_token)
                integration.access_token = new_token_data.access_token
                integration.refresh_token = new_token_data.refresh_token
                integration.expires_at = datetime.utcnow() + timedelta(seconds=new_token_data.expires_in)
                db.commit()
                valid_token = integration.access_token
            except Exception as e:
                logger.error(f"Erro ao renovar token: {e}")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Erro ao renovar token de acesso"
                )
        
        # Inicializar variáveis
        sync_result = None
        error_detail = None
        periods = [7, 15, 30, 60, 90]  # Todos os períodos para sincronizar
        sync_results = []
        
        async with httpx.AsyncClient() as client:
            try:
                # Buscar anunciantes - endpoint correto conforme documentação
                advertisers_response = await client.get(
                    f"https://api.mercadolibre.com/advertising/advertisers?product_id=PADS&user_id={integration.user_id}",
                    headers={
                        "Authorization": f"Bearer {valid_token}",
                        "Content-Type": "application/json",
                        "Api-Version": "1"
                    }
                )
                
                if advertisers_response.status_code != 200:
                    error_detail = "Não foi possível obter informações do anunciante"
                    logger.error(f"Erro ao buscar anunciantes: {advertisers_response.status_code} - {advertisers_response.text}")
                    return
                
                advertisers_data = advertisers_response.json()
                advertisers = advertisers_data.get("advertisers", [])
                
                if not advertisers:
                    error_detail = "Nenhum anunciante encontrado"
                    logger.error("Nenhum anunciante encontrado na resposta")
                    return
                
                advertiser = advertisers[0]
                advertiser_id = advertiser.get("advertiser_id")
                site_id = advertiser.get("site_id", "MLB")
                
                # Buscar dados do anúncio no Product Ads - endpoint correto conforme documentação
                ads_response = await client.get(
                    f"https://api.mercadolibre.com/marketplace/advertising/{site_id}/product_ads/ads/{item_id}",
                    headers={
                        "Authorization": f"Bearer {valid_token}",
                        "api-version": "2"
                    }
                )
                
                if ads_response.status_code != 200:
                    if ads_response.status_code == 404:
                        error_detail = "Anúncio não encontrado no Product Ads"
                        logger.error(f"Anúncio não encontrado: {item_id}")
                    else:
                        error_detail = f"Erro ao buscar anúncio no Product Ads: {ads_response.text}"
                        logger.error(f"Erro ao buscar anúncio: {ads_response.status_code} - {ads_response.text}")
                    return
                
                # Sucesso - continuar com o processamento
                ads_data = ads_response.json()
                logger.info(f"Dados do anúncio obtidos na sincronização: {ads_data}")
                
                # Iterar sobre todos os períodos
                for period_days in periods:
                    logger.info(f"=== SINCRONIZANDO PERÍODO DE {period_days} DIAS ===")
                    
                    # Buscar métricas do anúncio (período atual)
                    date_to = datetime.utcnow().strftime("%Y-%m-%d")
                    date_from = (datetime.utcnow() - timedelta(days=period_days)).strftime("%Y-%m-%d")
                    
                    logger.info(f"Buscando métricas do período: {date_from} até {date_to} ({period_days} dias)")
                    
                    # Buscar métricas do anúncio específico - usar endpoint correto conforme documentação
                    metrics_response = await client.get(
                        f"https://api.mercadolibre.com/marketplace/advertising/{site_id}/product_ads/ads/{item_id}",
                        params={
                            "date_from": date_from,
                            "date_to": date_to,
                            "metrics": "clicks,prints,ctr,cost,cpc,acos,organic_units_quantity,organic_units_amount,organic_items_quantity,direct_items_quantity,indirect_items_quantity,advertising_items_quantity,cvr,roas,sov,direct_units_quantity,indirect_units_quantity,units_quantity,direct_amount,indirect_amount,total_amount"
                        },
                        headers={
                            "Authorization": f"Bearer {valid_token}",
                            "api-version": "2"
                        }
                    )
                    
                    metrics_data = {}
                    if metrics_response.status_code == 200:
                        metrics_data = metrics_response.json()
                        logger.info(f"Métricas obtidas para {period_days} dias: {metrics_data}")
                    else:
                        logger.warning(f"Erro ao obter métricas para {period_days} dias: {metrics_response.status_code} - {metrics_response.text}")
                        continue  # Pular para o próximo período se houver erro
                    
                    # Salvar ou atualizar no banco de dados para este período
                    existing_ads = db.query(ProductAdsData).filter(
                        ProductAdsData.company_id == current_user.company_id,
                        ProductAdsData.item_id == item_id,
                        ProductAdsData.period_days == period_days
                    ).first()
                    
                    # Criar ou atualizar registro para este período
                    if existing_ads:
                        # Atualizar dados existentes
                        existing_ads.campaign_id = ads_data.get("campaign_id")
                        existing_ads.advertiser_id = advertiser_id
                        existing_ads.title = ads_data.get("title", "")
                        existing_ads.price = ads_data.get("price", 0)
                        existing_ads.status = ads_data.get("status", "")
                        existing_ads.data_period_start = datetime.strptime(date_from, "%Y-%m-%d")
                        existing_ads.data_period_end = datetime.strptime(date_to, "%Y-%m-%d")
                        existing_ads.ml_last_updated = datetime.utcnow()
                        existing_ads.updated_at = datetime.utcnow()
                        ads_record = existing_ads
                    else:
                        # Criar novo registro
                        ads_record = ProductAdsData(
                            company_id=current_user.company_id,
                            item_id=item_id,
                            campaign_id=ads_data.get("campaign_id"),
                            advertiser_id=advertiser_id,
                            title=ads_data.get("title", ""),
                            price=ads_data.get("price", 0),
                            status=ads_data.get("status", ""),
                            period_days=period_days,
                            data_period_start=datetime.strptime(date_from, "%Y-%m-%d"),
                            data_period_end=datetime.strptime(date_to, "%Y-%m-%d"),
                            ml_date_created=datetime.utcnow(),
                            ml_last_updated=datetime.utcnow()
                        )
                        db.add(ads_record)
                    
                    # Processar métricas se disponíveis
                    if metrics_data:
                        metrics = None
                        if "metrics_summary" in metrics_data:
                            metrics = metrics_data["metrics_summary"]
                        elif "metrics" in metrics_data:
                            metrics = metrics_data["metrics"]
                        elif isinstance(metrics_data, dict) and any(key in metrics_data for key in ["clicks", "prints", "cost"]):
                            metrics = metrics_data
                        
                        if metrics:
                            ads_record.clicks = metrics.get("clicks", 0)
                            ads_record.prints = metrics.get("prints", 0)
                            ads_record.ctr = metrics.get("ctr")
                            ads_record.cost = metrics.get("cost", 0)
                            ads_record.cpc = metrics.get("cpc")
                            ads_record.acos = metrics.get("acos")
                            ads_record.tacos = metrics.get("tacos")
                            ads_record.organic_units_quantity = metrics.get("organic_units_quantity", 0)
                            ads_record.organic_units_amount = metrics.get("organic_units_amount", 0)
                            ads_record.organic_items_quantity = metrics.get("organic_items_quantity", 0)
                            ads_record.direct_items_quantity = metrics.get("direct_items_quantity", 0)
                            ads_record.direct_units_quantity = metrics.get("direct_units_quantity", 0)
                            ads_record.direct_amount = metrics.get("direct_amount", 0)
                            ads_record.indirect_items_quantity = metrics.get("indirect_items_quantity", 0)
                            ads_record.indirect_units_quantity = metrics.get("indirect_units_quantity", 0)
                            ads_record.indirect_amount = metrics.get("indirect_amount", 0)
                            ads_record.advertising_items_quantity = metrics.get("advertising_items_quantity", 0)
                            ads_record.units_quantity = metrics.get("units_quantity", 0)
                            ads_record.total_amount = metrics.get("total_amount", 0)
                            ads_record.cvr = metrics.get("cvr")
                            ads_record.roas = metrics.get("roas")
                            ads_record.sov = metrics.get("sov")
                            
                            # Calcular TACOS se não estiver disponível
                            if ads_record.tacos is None and ads_record.cost and ads_record.total_amount:
                                total_revenue = float(ads_record.total_amount) + float(ads_record.organic_units_amount or 0)
                                if total_revenue > 0:
                                    ads_record.tacos = (float(ads_record.cost) / total_revenue) * 100
                    
                    ads_record.full_data = ads_data
                    ads_record.metrics_data = metrics_data
                    db.commit()
                    
                    sync_results.append({
                        "period_days": period_days,
                        "success": True,
                        "record_id": ads_record.id
                    })
                    
                    logger.info(f"Período de {period_days} dias sincronizado com sucesso")
                
                sync_result = {
                    "success": True,
                    "message": f"Dados de publicidade sincronizados com sucesso para {len(sync_results)} períodos",
                    "item_id": item_id,
                    "advertiser_id": advertiser_id,
                    "site_id": site_id,
                    "ads_data": ads_data,
                    "sync_results": sync_results,
                    "timestamp": datetime.utcnow().isoformat()
                }
                
            except Exception as e:
                logger.error(f"Erro durante a sincronização: {e}")
                error_detail = f"Erro interno durante a sincronização: {str(e)}"
        
        # Verificar se houve erro durante o processamento
        if error_detail:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error_detail
            )
        
        return sync_result
                
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao sincronizar dados de publicidade: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro interno ao sincronizar dados de publicidade"
        )

@router.get("/product-ads/db/{item_id}")
async def get_product_ads_from_db(
    item_id: str,
    period_days: int = 15,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Busca dados de publicidade de um anúncio específico do banco de dados para o período selecionado."""
    try:
        ads_data = db.query(ProductAdsData).filter(
            ProductAdsData.company_id == current_user.company_id,
            ProductAdsData.item_id == item_id,
            ProductAdsData.period_days == period_days
        ).first()
        
        if not ads_data:
            return {
                "success": False,
                "message": "Dados de publicidade não encontrados no banco de dados",
                "item_id": item_id,
                "timestamp": datetime.utcnow().isoformat()
            }
        
        return {
            "success": True,
            "item_id": item_id,
            "ads_data": {
                "id": ads_data.id,
                "item_id": ads_data.item_id,
                "campaign_id": ads_data.campaign_id,
                "advertiser_id": ads_data.advertiser_id,
                "title": ads_data.title,
                "price": float(ads_data.price) if ads_data.price else 0,
                "status": ads_data.status,
                "has_discount": ads_data.has_discount,
                "catalog_listing": ads_data.catalog_listing,
                "logistic_type": ads_data.logistic_type,
                "listing_type_id": ads_data.listing_type_id,
                "domain_id": ads_data.domain_id,
                "buy_box_winner": ads_data.buy_box_winner,
                "channel": ads_data.channel,
                "official_store_id": ads_data.official_store_id,
                "brand_value_id": ads_data.brand_value_id,
                "brand_value_name": ads_data.brand_value_name,
                "condition": ads_data.condition,
                "current_level": ads_data.current_level,
                "deferred_stock": ads_data.deferred_stock,
                "picture_id": ads_data.picture_id,
                "thumbnail": ads_data.thumbnail,
                "permalink": ads_data.permalink,
                "recommended": ads_data.recommended,
                "clicks": ads_data.clicks,
                "prints": ads_data.prints,
                "ctr": float(ads_data.ctr) if ads_data.ctr else None,
                "cost": float(ads_data.cost) if ads_data.cost else 0,
                "cpc": float(ads_data.cpc) if ads_data.cpc else None,
                "acos": float(ads_data.acos) if ads_data.acos else None,
                "tacos": float(ads_data.tacos) if ads_data.tacos else None,
                "organic_units_quantity": ads_data.organic_units_quantity,
                "organic_units_amount": float(ads_data.organic_units_amount) if ads_data.organic_units_amount else 0,
                "organic_items_quantity": ads_data.organic_items_quantity,
                "direct_items_quantity": ads_data.direct_items_quantity,
                "direct_units_quantity": ads_data.direct_units_quantity,
                "direct_amount": float(ads_data.direct_amount) if ads_data.direct_amount else 0,
                "indirect_items_quantity": ads_data.indirect_items_quantity,
                "indirect_units_quantity": ads_data.indirect_units_quantity,
                "indirect_amount": float(ads_data.indirect_amount) if ads_data.indirect_amount else 0,
                "advertising_items_quantity": ads_data.advertising_items_quantity,
                "units_quantity": ads_data.units_quantity,
                "total_amount": float(ads_data.total_amount) if ads_data.total_amount else 0,
                "cvr": float(ads_data.cvr) if ads_data.cvr else None,
                "roas": float(ads_data.roas) if ads_data.roas else None,
                "sov": float(ads_data.sov) if ads_data.sov else None,
                "period_days": ads_data.period_days,
                "impression_share": float(ads_data.impression_share) if ads_data.impression_share else None,
                "top_impression_share": float(ads_data.top_impression_share) if ads_data.top_impression_share else None,
                "lost_impression_share_by_budget": float(ads_data.lost_impression_share_by_budget) if ads_data.lost_impression_share_by_budget else None,
                "lost_impression_share_by_ad_rank": float(ads_data.lost_impression_share_by_ad_rank) if ads_data.lost_impression_share_by_ad_rank else None,
                "acos_benchmark": float(ads_data.acos_benchmark) if ads_data.acos_benchmark else None,
                "campaign_name": ads_data.campaign_name,
                "campaign_status": ads_data.campaign_status,
                "campaign_budget": float(ads_data.campaign_budget) if ads_data.campaign_budget else None,
                "campaign_acos_target": float(ads_data.campaign_acos_target) if ads_data.campaign_acos_target else None,
                "campaign_strategy": ads_data.campaign_strategy,
                "ml_date_created": ads_data.ml_date_created.isoformat() if ads_data.ml_date_created else None,
                "ml_last_updated": ads_data.ml_last_updated.isoformat() if ads_data.ml_last_updated else None,
                "created_at": ads_data.created_at.isoformat() if ads_data.created_at else None,
                "updated_at": ads_data.updated_at.isoformat() if ads_data.updated_at else None
            },
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Erro ao buscar dados de publicidade do banco: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro interno ao buscar dados de publicidade"
        )

# ==================== ENDPOINTS PARA PEDIDOS ====================

@router.get("/orders/search")
async def search_orders(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
    status: Optional[str] = Query(None, description="Status do pedido (paid, confirmed, cancelled, etc.)"),
    date_from: Optional[str] = Query(None, description="Data de início (YYYY-MM-DD)"),
    date_to: Optional[str] = Query(None, description="Data de fim (YYYY-MM-DD)"),
    limit: int = Query(50, description="Número máximo de pedidos por página"),
    offset: int = Query(0, description="Número de pedidos para pular")
):
    """Busca pedidos do Mercado Livre via API e retorna os resultados."""
    try:
        logger.info(f"=== BUSCANDO PEDIDOS PARA EMPRESA {current_user.company_id} ===")
        
        integration = db.query(MercadoLivreIntegration).filter(
            MercadoLivreIntegration.company_id == current_user.company_id,
            MercadoLivreIntegration.is_active == True
        ).first()

        if not integration:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Integração com Mercado Livre não encontrada ou inativa para esta empresa."
            )

        # Verificar se o token precisa ser renovado
        if integration.expires_at and integration.expires_at <= datetime.utcnow():
            try:
                new_token_data = await mercado_livre_service.refresh_access_token(integration.refresh_token)
                integration.access_token = new_token_data.access_token
                integration.refresh_token = new_token_data.refresh_token
                integration.expires_at = datetime.utcnow() + timedelta(seconds=new_token_data.expires_in)
                db.commit()
                logger.info("Token renovado com sucesso")
            except Exception as e:
                logger.error(f"Erro ao renovar token: {e}")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Erro ao renovar token de acesso"
                )
        
        valid_token = integration.access_token
        if not valid_token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Erro ao renovar token de acesso"
            )
        
        # Construir parâmetros da busca
        params = {
            "seller": integration.user_id,
            "limit": limit,
            "offset": offset
        }
        
        if status:
            params["order.status"] = status
        if date_from:
            params["order.date_created.from"] = f"{date_from}T00:00:00.000-03:00"
        if date_to:
            params["order.date_created.to"] = f"{date_to}T23:59:59.999-03:00"
        
        logger.info(f"Parâmetros da busca: {params}")
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://api.mercadolibre.com/orders/search",
                params=params,
                headers={
                    "Authorization": f"Bearer {valid_token}",
                    "Content-Type": "application/json"
                }
            )
            
            if response.status_code != 200:
                logger.error(f"Erro na API do Mercado Livre: {response.status_code} - {response.text}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Erro na API do Mercado Livre: {response.text}"
                )
            
            data = response.json()
            logger.info(f"Pedidos encontrados: {data.get('paging', {}).get('total', 0)}")
            
            return {
                "success": True,
                "orders": data.get("results", []),
                "paging": data.get("paging", {}),
                "total": data.get("paging", {}).get("total", 0),
                "timestamp": datetime.utcnow().isoformat()
            }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao buscar pedidos: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro interno ao buscar pedidos"
        )

@router.post("/orders/sync")
async def sync_orders(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
    days_back: int = Query(30, description="Número de dias para buscar pedidos (padrão: 30)")
):
    """Sincroniza pedidos do Mercado Livre e salva no banco de dados."""
    try:
        logger.info(f"=== SINCRONIZANDO PEDIDOS PARA EMPRESA {current_user.company_id} ===")
        
        integration = db.query(MercadoLivreIntegration).filter(
            MercadoLivreIntegration.company_id == current_user.company_id,
            MercadoLivreIntegration.is_active == True
        ).first()

        if not integration:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Integração com Mercado Livre não encontrada ou inativa para esta empresa."
            )

        # Verificar se o token precisa ser renovado
        if integration.expires_at and integration.expires_at <= datetime.utcnow():
            try:
                new_token_data = await mercado_livre_service.refresh_access_token(integration.refresh_token)
                integration.access_token = new_token_data.access_token
                integration.refresh_token = new_token_data.refresh_token
                integration.expires_at = datetime.utcnow() + timedelta(seconds=new_token_data.expires_in)
                db.commit()
                logger.info("Token renovado com sucesso")
            except Exception as e:
                logger.error(f"Erro ao renovar token: {e}")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Erro ao renovar token de acesso"
                )
        
        valid_token = integration.access_token
        if not valid_token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Erro ao renovar token de acesso"
            )
        
        # Configuração para buscar TODOS os pedidos (sem filtro de data)
        logger.info(f"Buscando TODOS os pedidos disponíveis (sem filtro de data)")
        
        params = {
            "seller": integration.user_id,
            "limit": 50,  # Limite máximo permitido pela API
            "offset": 0
        }
        
        sync_results = []
        total_orders = 0
        total_available = 0
        
        async with httpx.AsyncClient() as client:
            # Paginação simples para buscar TODOS os pedidos
            while True:
                response = await client.get(
                    "https://api.mercadolibre.com/orders/search",
                    params=params,
                    headers={
                        "Authorization": f"Bearer {valid_token}",
                        "Content-Type": "application/json"
                    }
                )
                
                if response.status_code != 200:
                    logger.error(f"Erro na API do Mercado Livre: {response.status_code} - {response.text}")
                    break
                
                data = response.json()
                orders = data.get("results", [])
                paging = data.get("paging", {})
                
                # Obter total disponível na primeira iteração
                if total_available == 0:
                    total_available = paging.get("total", 0)
                    logger.info(f"Total de pedidos disponíveis: {total_available}")
                
                if not orders:
                    break
                
                logger.info(f"Processando página {params['offset']//50 + 1} - {len(orders)} pedidos")
                
                # Processar cada pedido com dados completos
                for order_data in orders:
                    try:
                        order_id = str(order_data.get("id"))
                        
                        # Verificar se o pedido já existe
                        existing_order = db.query(MercadoLivreOrder).filter(
                            MercadoLivreOrder.company_id == current_user.company_id,
                            MercadoLivreOrder.order_id == order_id
                        ).first()
                        
                        if existing_order:
                            logger.info(f"Pedido {order_id} já existe - pulando")
                            continue
                        
                        # Buscar detalhes completos do pedido
                        try:
                            order_detail_response = await client.get(
                                f"https://api.mercadolibre.com/orders/{order_id}",
                                headers={
                                    "Authorization": f"Bearer {valid_token}",
                                    "Content-Type": "application/json"
                                }
                            )
                            
                            if order_detail_response.status_code == 200:
                                order_detail = order_detail_response.json()
                                
                                # Extrair dados completos do pedido
                                buyer = order_detail.get("buyer", {})
                                seller = order_detail.get("seller", {})
                                shipping = order_detail.get("shipping", {})
                                payments = order_detail.get("payments", [])
                                
                                # Criar pedido com dados completos
                                order_record = MercadoLivreOrder(
                                    company_id=current_user.company_id,
                                    order_id=order_id,
                                    status=order_detail.get("status", ""),
                                    status_detail=order_detail.get("status_detail", {}).get("description") if order_detail.get("status_detail") else None,
                                    date_created=datetime.fromisoformat(order_detail.get("date_created", "").replace("Z", "+00:00")),
                                    date_closed=datetime.fromisoformat(order_detail.get("date_closed", "").replace("Z", "+00:00")) if order_detail.get("date_closed") else None,
                                    date_last_updated=datetime.fromisoformat(order_detail.get("date_last_updated", "").replace("Z", "+00:00")) if order_detail.get("date_last_updated") else None,
                                    total_amount=float(order_detail.get("total_amount", 0)),
                                    paid_amount=float(order_detail.get("paid_amount", 0)) if order_detail.get("paid_amount") else None,
                                    currency_id=order_detail.get("currency_id", "BRL"),
                                    comment=order_detail.get("comment"),
                                    pack_id=str(order_detail.get("pack_id")) if order_detail.get("pack_id") else None,
                                    pickup_id=str(order_detail.get("pickup_id")) if order_detail.get("pickup_id") else None,
                                    fulfilled=order_detail.get("fulfilled"),
                                    
                                    # Dados do comprador
                                    buyer_id=str(buyer.get("id", "")),
                                    buyer_nickname=buyer.get("nickname"),
                                    buyer_email=buyer.get("email"),
                                    buyer_first_name=buyer.get("first_name"),
                                    buyer_last_name=buyer.get("last_name"),
                                    buyer_phone=f"{buyer.get('phone', {}).get('area_code', '')}{buyer.get('phone', {}).get('number', '')}" if buyer.get("phone") else None,
                                    buyer_alternative_phone=f"{buyer.get('alternative_phone', {}).get('area_code', '')}{buyer.get('alternative_phone', {}).get('number', '')}" if buyer.get("alternative_phone") else None,
                                    buyer_registration_date=datetime.fromisoformat(buyer.get("registration_date", "").replace("Z", "+00:00")) if buyer.get("registration_date") else None,
                                    buyer_user_type=buyer.get("user_type"),
                                    buyer_country_id=buyer.get("country_id"),
                                    buyer_site_id=buyer.get("site_id"),
                                    buyer_permalink=buyer.get("permalink"),
                                    buyer_address_state=buyer.get("address", {}).get("state"),
                                    buyer_address_city=buyer.get("address", {}).get("city"),
                                    buyer_address_address=buyer.get("address", {}).get("address"),
                                    buyer_address_zip_code=buyer.get("address", {}).get("zip_code"),
                                    buyer_identification_type=buyer.get("identification", {}).get("type"),
                                    buyer_identification_number=buyer.get("identification", {}).get("number"),
                                    
                                    # Dados do vendedor
                                    seller_id=str(seller.get("id", "")),
                                    seller_nickname=seller.get("nickname"),
                                    seller_email=seller.get("email"),
                                    seller_first_name=seller.get("first_name"),
                                    seller_last_name=seller.get("last_name"),
                                    seller_phone=f"{seller.get('phone', {}).get('area_code', '')}{seller.get('phone', {}).get('number', '')}" if seller.get("phone") else None,
                                    seller_alternative_phone=f"{seller.get('alternative_phone', {}).get('area_code', '')}{seller.get('alternative_phone', {}).get('number', '')}" if seller.get("alternative_phone") else None,
                                    seller_registration_date=datetime.fromisoformat(seller.get("registration_date", "").replace("Z", "+00:00")) if seller.get("registration_date") else None,
                                    seller_user_type=seller.get("user_type"),
                                    seller_country_id=seller.get("country_id"),
                                    seller_site_id=seller.get("site_id"),
                                    seller_permalink=seller.get("permalink"),
                                    seller_address_state=seller.get("address", {}).get("state"),
                                    seller_address_city=seller.get("address", {}).get("city"),
                                    seller_address_address=seller.get("address", {}).get("address"),
                                    seller_address_zip_code=seller.get("address", {}).get("zip_code"),
                                    seller_identification_type=seller.get("identification", {}).get("type"),
                                    seller_identification_number=seller.get("identification", {}).get("number"),
                                    
                                    # Dados de envio
                                    shipping_id=str(shipping.get("id")) if shipping.get("id") else None,
                                    shipping_status=shipping.get("status"),
                                    shipping_substatus=shipping.get("substatus"),
                                    shipping_cost=float(shipping.get("cost", 0)) if shipping.get("cost") else None,
                                    shipping_tracking_number=shipping.get("tracking_number"),
                                    shipping_tracking_method=shipping.get("tracking_method"),
                                    shipping_declared_value=float(shipping.get("declared_value", 0)) if shipping.get("declared_value") else None,
                                    
                                    # Dados de pagamento (primeiro pagamento)
                                    payment_method_id=payments[0].get("payment_method_id") if payments else None,
                                    payment_type=payments[0].get("payment_type") if payments else None,
                                    payment_status=payments[0].get("status") if payments else None,
                                    payment_installments=payments[0].get("installments") if payments else None,
                                    payment_operation_type=payments[0].get("operation_type") if payments else None,
                                    payment_status_code=payments[0].get("status_code") if payments else None,
                                    payment_status_detail=payments[0].get("status_detail") if payments else None,
                                    payment_transaction_amount=float(payments[0].get("transaction_amount", 0)) if payments and payments[0].get("transaction_amount") else None,
                                    payment_transaction_amount_refunded=float(payments[0].get("transaction_amount_refunded", 0)) if payments and payments[0].get("transaction_amount_refunded") else None,
                                    payment_taxes_amount=float(payments[0].get("taxes_amount", 0)) if payments and payments[0].get("taxes_amount") else None,
                                    payment_coupon_amount=float(payments[0].get("coupon_amount", 0)) if payments and payments[0].get("coupon_amount") else None,
                                    payment_overpaid_amount=float(payments[0].get("overpaid_amount", 0)) if payments and payments[0].get("overpaid_amount") else None,
                                    payment_installment_amount=float(payments[0].get("installment_amount", 0)) if payments and payments[0].get("installment_amount") else None,
                                    payment_authorization_code=payments[0].get("authorization_code") if payments else None,
                                    payment_transaction_order_id=payments[0].get("transaction_order_id") if payments else None,
                                    payment_date_approved=datetime.fromisoformat(payments[0].get("date_approved", "").replace("Z", "+00:00")) if payments and payments[0].get("date_approved") else None,
                                    payment_date_last_modified=datetime.fromisoformat(payments[0].get("date_last_modified", "").replace("Z", "+00:00")) if payments and payments[0].get("date_last_modified") else None,
                                    payment_collector_id=str(payments[0].get("collector", {}).get("id")) if payments and payments[0].get("collector", {}).get("id") else None,
                                    payment_card_id=str(payments[0].get("card_id")) if payments and payments[0].get("card_id") else None,
                                    payment_issuer_id=payments[0].get("issuer_id") if payments else None,
                                    
                                    # Feedback
                                    feedback_sale_rating=order_detail.get("feedback", {}).get("sale", {}).get("rating"),
                                    feedback_sale_fulfilled=order_detail.get("feedback", {}).get("sale", {}).get("fulfilled"),
                                    feedback_purchase_rating=order_detail.get("feedback", {}).get("purchase", {}).get("rating"),
                                    feedback_purchase_fulfilled=order_detail.get("feedback", {}).get("purchase", {}).get("fulfilled"),
                                    
                                    # Tags e itens
                                    tags=order_detail.get("tags", []),
                                    order_items=order_detail.get("order_items", []),
                                    
                                    ml_date_created=datetime.utcnow(),
                                    ml_last_updated=datetime.utcnow()
                                )
                                
                                db.add(order_record)
                                db.commit()
                                total_orders += 1
                                
                                sync_results.append({
                                    "order_id": order_id,
                                    "action": "created",
                                    "status": order_detail.get("status", ""),
                                    "total_amount": float(order_detail.get("total_amount", 0))
                                })
                                
                                logger.info(f"Pedido {order_id} criado com sucesso")
                            else:
                                logger.warning(f"Erro ao buscar detalhes do pedido {order_id}: {order_detail_response.status_code}")
                                continue
                                
                        except Exception as e:
                            logger.error(f"Erro ao buscar detalhes do pedido {order_id}: {e}")
                            continue
                        
                    except Exception as e:
                        logger.error(f"Erro ao processar pedido {order_data.get('id')}: {e}")
                        continue
                
                # Verificar se há mais páginas
                if paging.get("offset", 0) + paging.get("limit", 50) >= paging.get("total", 0):
                    break
                
                # Atualizar offset para próxima página
                params["offset"] = paging.get("offset", 0) + paging.get("limit", 50)
        
        logger.info(f"Sincronização concluída: {total_orders} pedidos processados")
        
        # Contar ações realizadas
        created_count = sum(1 for result in sync_results if result["action"] == "created")
        updated_count = sum(1 for result in sync_results if result["action"] == "updated")
        
        return {
            "success": True,
            "message": f"Sincronização concluída com sucesso",
            "total_processed": total_orders,
            "total_available": total_available,
            "created": created_count,
            "updated": updated_count,
            "sync_results": sync_results,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao sincronizar pedidos: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro interno ao sincronizar pedidos"
        )

@router.get("/orders/db")
async def get_orders_from_db(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
    status: Optional[str] = Query(None, description="Status do pedido"),
    date_from: Optional[str] = Query(None, description="Data de início (YYYY-MM-DD)"),
    date_to: Optional[str] = Query(None, description="Data de fim (YYYY-MM-DD)"),
    limit: int = Query(50, description="Número máximo de pedidos por página"),
    offset: int = Query(0, description="Número de pedidos para pular")
):
    """Busca pedidos salvos no banco de dados."""
    try:
        logger.info(f"=== BUSCANDO PEDIDOS NO BANCO PARA EMPRESA {current_user.company_id} ===")
        
        # Construir query
        query = db.query(MercadoLivreOrder).filter(
            MercadoLivreOrder.company_id == current_user.company_id
        )
        
        # Aplicar filtros se fornecidos
        if status:
            query = query.filter(MercadoLivreOrder.status == status)
        
        if date_from:
            try:
                date_from_obj = datetime.strptime(date_from, "%Y-%m-%d")
                query = query.filter(MercadoLivreOrder.date_created >= date_from_obj)
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Formato de data inválido. Use YYYY-MM-DD"
                )
        
        if date_to:
            try:
                date_to_obj = datetime.strptime(date_to, "%Y-%m-%d")
                query = query.filter(MercadoLivreOrder.date_created <= date_to_obj)
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Formato de data inválido. Use YYYY-MM-DD"
                )
        
        # Contar total de registros
        total_count = query.count()
        
        # Aplicar paginação
        orders = query.offset(offset).limit(limit).all()
        
        # Converter para dict
        orders_data = []
        for order in orders:
            orders_data.append({
                "id": order.id,
                "order_id": order.order_id,
                "status": order.status,
                "total_amount": order.total_amount,
                "paid_amount": order.paid_amount,
                "currency_id": order.currency_id,
                "date_created": order.date_created.isoformat() if order.date_created else None,
                "date_closed": order.date_closed.isoformat() if order.date_closed else None,
                "buyer": {
                    "id": order.buyer_id,
                    "nickname": order.buyer_nickname,
                    "email": order.buyer_email,
                    "first_name": order.buyer_first_name,
                    "last_name": order.buyer_last_name,
                    "phone": order.buyer_phone
                },
                "seller": {
                    "id": order.seller_id,
                    "nickname": order.seller_nickname,
                    "email": order.seller_email
                },
                "shipping": {
                    "id": order.shipping_id,
                    "status": order.shipping_status,
                    "cost": order.shipping_cost
                },
                "payment": {
                    "method_id": order.payment_method_id,
                    "type": order.payment_type,
                    "status": order.payment_status,
                    "installments": order.payment_installments
                },
                "feedback": {
                    "sale": {
                        "rating": order.feedback_sale_rating,
                        "fulfilled": order.feedback_sale_fulfilled
                    },
                    "purchase": {
                        "rating": order.feedback_purchase_rating,
                        "fulfilled": order.feedback_purchase_fulfilled
                    }
                },
                "ml_date_created": order.ml_date_created.isoformat() if order.ml_date_created else None,
                "ml_last_updated": order.ml_last_updated.isoformat() if order.ml_last_updated else None
            })
        
        return {
            "success": True,
            "orders": orders_data,
            "pagination": {
                "total": total_count,
                "limit": limit,
                "offset": offset,
                "has_more": offset + limit < total_count
            },
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao buscar pedidos do banco: {e}")
        raise HTTPException(
            status_code=500,
            detail="Erro interno ao buscar pedidos do banco"
        )

@router.get("/orders/{order_id}")
async def get_order_by_id(
    order_id: str,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Busca um pedido específico por ID."""
    try:
        logger.info(f"Buscando pedido {order_id} para empresa {current_user.company_id}")
        
        order = db.query(MercadoLivreOrder).filter(
            MercadoLivreOrder.company_id == current_user.company_id,
            MercadoLivreOrder.order_id == order_id
        ).first()
        
        if not order:
            raise HTTPException(
                status_code=404,
                detail="Pedido não encontrado"
            )
        
        order_data = {
            "id": order.id,
            "order_id": order.order_id,
            "status": order.status,
            "status_detail": order.status_detail,
            "date_created": order.date_created.isoformat() if order.date_created else None,
            "date_closed": order.date_closed.isoformat() if order.date_closed else None,
            "total_amount": float(order.total_amount) if order.total_amount else 0,
            "paid_amount": float(order.paid_amount) if order.paid_amount else None,
            "currency_id": order.currency_id,
            "buyer": {
                "id": order.buyer_id,
                "nickname": order.buyer_nickname,
                "email": order.buyer_email,
                "first_name": order.buyer_first_name,
                "last_name": order.buyer_last_name,
                "phone": order.buyer_phone
            },
            "seller": {
                "id": order.seller_id,
                "nickname": order.seller_nickname,
                "email": order.seller_email
            },
            "shipping": {
                "id": order.shipping_id,
                "status": order.shipping_status,
                "cost": order.shipping_cost
            },
            "ml_created_at": order.ml_created_at.isoformat() if order.ml_created_at else None,
            "ml_last_updated": order.ml_last_updated.isoformat() if order.ml_last_updated else None
        }
        
        return {
            "success": True,
            "order": order_data,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao buscar pedido {order_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail="Erro interno ao buscar pedido"
        )
