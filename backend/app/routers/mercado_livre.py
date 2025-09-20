from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import MercadoLivreIntegration
from app.schemas import MercadoLivreIntegration as MercadoLivreIntegrationSchema, OAuth2AuthorizationRequest
from app.auth import get_current_user
from app.services.mercado_livre import mercado_livre_service
from typing import Optional
import logging

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

