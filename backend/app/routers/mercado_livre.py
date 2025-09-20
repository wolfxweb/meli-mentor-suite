from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import MercadoLivreIntegration
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

