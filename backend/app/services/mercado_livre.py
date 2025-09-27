import httpx
import os
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from app.models import MercadoLivreIntegration
from app.schemas import OAuth2TokenResponse, MercadoLivreIntegrationCreate
import logging

logger = logging.getLogger(__name__)

class MercadoLivreService:
    """Serviço para integração com a API do Mercado Livre."""
    
    # URLs da API do Mercado Livre
    AUTHORIZATION_URL = "https://auth.mercadolivre.com.br/authorization"
    TOKEN_URL = "https://api.mercadolibre.com/oauth/token"
    USER_INFO_URL = "https://api.mercadolibre.com/users/me"
    REFRESH_TOKEN_URL = "https://api.mercadolibre.com/oauth/token"
    
    def __init__(self):
        # Credenciais da aplicação (devem ser configuradas via variáveis de ambiente)
        self.client_id = os.getenv("MERCADO_LIVRE_CLIENT_ID")
        self.client_secret = os.getenv("MERCADO_LIVRE_CLIENT_SECRET")
        self.redirect_uri = os.getenv("MERCADO_LIVRE_REDIRECT_URI", "http://localhost:5173/account/integration/callback")
        
        if not self.client_id or not self.client_secret:
            logger.warning("Mercado Livre credentials not configured. Set MERCADO_LIVRE_CLIENT_ID and MERCADO_LIVRE_CLIENT_SECRET environment variables.")
    
    def get_authorization_url(self, state: str = None) -> str:
        """Gera a URL de autorização do Mercado Livre."""
        params = {
            "response_type": "code",
            "client_id": self.client_id,
            "redirect_uri": self.redirect_uri,
        }
        
        if state:
            params["state"] = state
            
        query_string = "&".join([f"{k}={v}" for k, v in params.items()])
        return f"{self.AUTHORIZATION_URL}?{query_string}"
    
    async def exchange_code_for_token(self, code: str) -> OAuth2TokenResponse:
        """Troca o código de autorização por um access token."""
        async with httpx.AsyncClient() as client:
            data = {
                "grant_type": "authorization_code",
                "client_id": self.client_id,
                "client_secret": self.client_secret,
                "code": code,
                "redirect_uri": self.redirect_uri,
            }
            
            response = await client.post(self.TOKEN_URL, data=data)
            response.raise_for_status()
            
            token_data = response.json()
            
            return OAuth2TokenResponse(
                access_token=token_data["access_token"],
                token_type=token_data.get("token_type", "Bearer"),
                expires_in=token_data["expires_in"],
                scope=token_data.get("scope", ""),
                user_id=token_data.get("user_id"),
                refresh_token=token_data.get("refresh_token")
            )
    
    async def refresh_access_token(self, refresh_token: str) -> OAuth2TokenResponse:
        """Renova o access token usando o refresh token."""
        async with httpx.AsyncClient() as client:
            data = {
                "grant_type": "refresh_token",
                "client_id": self.client_id,
                "client_secret": self.client_secret,
                "refresh_token": refresh_token,
            }
            
            response = await client.post(self.REFRESH_TOKEN_URL, data=data)
            response.raise_for_status()
            
            token_data = response.json()
            
            return OAuth2TokenResponse(
                access_token=token_data["access_token"],
                token_type=token_data.get("token_type", "Bearer"),
                expires_in=token_data["expires_in"],
                scope=token_data.get("scope", ""),
                user_id=token_data.get("user_id"),
                refresh_token=token_data.get("refresh_token", refresh_token)
            )
    
    async def get_user_info(self, access_token: str) -> Dict[str, Any]:
        """Obtém informações do usuário autenticado."""
        async with httpx.AsyncClient() as client:
            headers = {"Authorization": f"Bearer {access_token}"}
            response = await client.get(self.USER_INFO_URL, headers=headers)
            response.raise_for_status()
            
            return response.json()
    
    async def test_connection(self, access_token: str) -> bool:
        """Testa se a conexão com o Mercado Livre está funcionando."""
        try:
            user_info = await self.get_user_info(access_token)
            return bool(user_info.get("id"))
        except Exception as e:
            logger.error(f"Error testing Mercado Livre connection: {e}")
            return False
    
    def save_integration(self, db: Session, company_id: int, token_response: OAuth2TokenResponse) -> MercadoLivreIntegration:
        """Salva ou atualiza a integração do Mercado Livre."""
        # Calcula a data de expiração
        expires_at = datetime.utcnow() + timedelta(seconds=token_response.expires_in)
        
        # Verifica se já existe uma integração para esta empresa
        existing_integration = db.query(MercadoLivreIntegration).filter(
            MercadoLivreIntegration.company_id == company_id
        ).first()
        
        if existing_integration:
            # Atualiza a integração existente
            existing_integration.access_token = token_response.access_token
            existing_integration.refresh_token = token_response.refresh_token
            existing_integration.token_type = token_response.token_type
            existing_integration.expires_in = token_response.expires_in
            existing_integration.scope = token_response.scope
            existing_integration.user_id = str(token_response.user_id) if token_response.user_id else None
            existing_integration.expires_at = expires_at
            existing_integration.is_active = True
            existing_integration.updated_at = datetime.utcnow()
            
            db.commit()
            db.refresh(existing_integration)
            return existing_integration
        else:
            # Cria uma nova integração
            integration_data = MercadoLivreIntegrationCreate(
                access_token=token_response.access_token,
                refresh_token=token_response.refresh_token,
                token_type=token_response.token_type,
                expires_in=token_response.expires_in,
                scope=token_response.scope,
                user_id=str(token_response.user_id) if token_response.user_id else None,
            )
            
            new_integration = MercadoLivreIntegration(
                company_id=company_id,
                **integration_data.dict(),
                expires_at=expires_at
            )
            
            db.add(new_integration)
            db.commit()
            db.refresh(new_integration)
            return new_integration
    
    def get_valid_token(self, db: Session, company_id: int) -> Optional[str]:
        """Obtém um token válido, renovando se necessário."""
        integration = db.query(MercadoLivreIntegration).filter(
            MercadoLivreIntegration.company_id == company_id,
            MercadoLivreIntegration.is_active == True
        ).first()
        
        if not integration:
            return None
        
        # Verifica se o token ainda é válido (com margem de 5 minutos)
        if integration.expires_at > datetime.utcnow() + timedelta(minutes=5):
            return integration.access_token
        
        # Se tem refresh token, tenta renovar
        if integration.refresh_token:
            try:
                # Aqui você poderia implementar a renovação automática
                # Por simplicidade, retornamos None para forçar nova autenticação
                logger.info(f"Token expired for company {company_id}, refresh needed")
                return None
            except Exception as e:
                logger.error(f"Error refreshing token for company {company_id}: {e}")
                return None
        
        return None

# Instância global do serviço
mercado_livre_service = MercadoLivreService()








