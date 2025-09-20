from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth import get_current_user
from app.services.mercado_livre import mercado_livre_service
from typing import Optional, List, Dict, Any
import logging
import httpx

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/products")
async def get_products(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0)
):
    """Obtém lista de produtos do usuário no Mercado Livre."""
    try:
        # Obter token válido
        valid_token = mercado_livre_service.get_valid_token(db, current_user.company_id)
        
        if not valid_token:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Token inválido ou expirado. Reconecte sua conta do Mercado Livre."
            )
        
        # Obter user_id da integração
        from app.models import MercadoLivreIntegration
        integration = db.query(MercadoLivreIntegration).filter(
            MercadoLivreIntegration.company_id == current_user.company_id,
            MercadoLivreIntegration.is_active == True
        ).first()
        
        if not integration or not integration.user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Integração com Mercado Livre não encontrada"
            )
        
        # Buscar produtos do usuário
        async with httpx.AsyncClient() as client:
            headers = {"Authorization": f"Bearer {valid_token}"}
            
            # Buscar itens do usuário
            response = await client.get(
                f"https://api.mercadolibre.com/users/{integration.user_id}/items/search",
                headers=headers,
                params={"limit": limit, "offset": offset}
            )
            
            if response.status_code == 404:
                # Usuário não tem produtos
                return {"products": [], "total": 0}
            
            response.raise_for_status()
            search_data = response.json()
            
            if not search_data.get("results"):
                return {"products": [], "total": 0}
            
            # Buscar detalhes de cada produto
            products = []
            for item_id in search_data["results"]:
                try:
                    item_response = await client.get(
                        f"https://api.mercadolibre.com/items/{item_id}",
                        headers=headers
                    )
                    if item_response.status_code == 200:
                        item_data = item_response.json()
                        products.append(item_data)
                except Exception as e:
                    logger.warning(f"Erro ao buscar detalhes do item {item_id}: {e}")
                    continue
            
            return {
                "products": products,
                "total": search_data.get("paging", {}).get("total", len(products)),
                "limit": limit,
                "offset": offset
            }
            
    except httpx.HTTPStatusError as e:
        logger.error(f"Erro HTTP ao buscar produtos: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Erro ao buscar produtos no Mercado Livre"
        )
    except Exception as e:
        logger.error(f"Erro ao buscar produtos: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro interno ao buscar produtos"
        )

@router.get("/products/{product_id}")
async def get_product(
    product_id: str,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtém detalhes de um produto específico."""
    try:
        valid_token = mercado_livre_service.get_valid_token(db, current_user.company_id)
        
        if not valid_token:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Token inválido ou expirado"
            )
        
        async with httpx.AsyncClient() as client:
            headers = {"Authorization": f"Bearer {valid_token}"}
            response = await client.get(
                f"https://api.mercadolibre.com/items/{product_id}",
                headers=headers
            )
            
            response.raise_for_status()
            return response.json()
            
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 404:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Produto não encontrado"
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Erro ao buscar produto"
        )
    except Exception as e:
        logger.error(f"Erro ao buscar produto {product_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro interno ao buscar produto"
        )

@router.post("/products")
async def create_product(
    product_data: Dict[str, Any],
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Cria um novo produto no Mercado Livre."""
    try:
        valid_token = mercado_livre_service.get_valid_token(db, current_user.company_id)
        
        if not valid_token:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Token inválido ou expirado"
            )
        
        # Validar dados obrigatórios
        required_fields = ["title", "price", "available_quantity", "condition", "category_id"]
        for field in required_fields:
            if not product_data.get(field):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Campo obrigatório: {field}"
                )
        
        # Preparar dados para o Mercado Livre
        ml_product_data = {
            "title": product_data["title"],
            "price": float(product_data["price"]),
            "available_quantity": int(product_data["available_quantity"]),
            "condition": product_data["condition"],
            "category_id": product_data["category_id"],
            "listing_type_id": "gold_special",  # Tipo de anúncio padrão
            "pictures": [{"source": url} for url in product_data.get("pictures", [])],
            "attributes": product_data.get("attributes", [])
        }
        
        # Adicionar descrição se fornecida
        if product_data.get("description"):
            ml_product_data["description"] = {
                "plain_text": product_data["description"]
            }
        
        async with httpx.AsyncClient() as client:
            headers = {
                "Authorization": f"Bearer {valid_token}",
                "Content-Type": "application/json"
            }
            
            response = await client.post(
                "https://api.mercadolibre.com/items",
                headers=headers,
                json=ml_product_data
            )
            
            response.raise_for_status()
            created_product = response.json()
            
            return {
                "message": "Produto criado com sucesso",
                "product": created_product
            }
            
    except httpx.HTTPStatusError as e:
        error_detail = "Erro ao criar produto"
        try:
            error_data = e.response.json()
            error_detail = error_data.get("message", error_detail)
        except:
            pass
        
        logger.error(f"Erro HTTP ao criar produto: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_detail
        )
    except Exception as e:
        logger.error(f"Erro ao criar produto: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro interno ao criar produto"
        )

@router.put("/products/{product_id}")
async def update_product(
    product_id: str,
    product_data: Dict[str, Any],
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Atualiza um produto existente no Mercado Livre."""
    try:
        valid_token = mercado_livre_service.get_valid_token(db, current_user.company_id)
        
        if not valid_token:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Token inválido ou expirado"
            )
        
        # Preparar dados para atualização
        update_data = {}
        
        if "title" in product_data:
            update_data["title"] = product_data["title"]
        if "price" in product_data:
            update_data["price"] = float(product_data["price"])
        if "available_quantity" in product_data:
            update_data["available_quantity"] = int(product_data["available_quantity"])
        if "condition" in product_data:
            update_data["condition"] = product_data["condition"]
        if "pictures" in product_data:
            update_data["pictures"] = [{"source": url} for url in product_data["pictures"]]
        if "attributes" in product_data:
            update_data["attributes"] = product_data["attributes"]
        
        if not update_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Nenhum campo para atualizar"
            )
        
        async with httpx.AsyncClient() as client:
            headers = {
                "Authorization": f"Bearer {valid_token}",
                "Content-Type": "application/json"
            }
            
            response = await client.put(
                f"https://api.mercadolibre.com/items/{product_id}",
                headers=headers,
                json=update_data
            )
            
            response.raise_for_status()
            updated_product = response.json()
            
            return {
                "message": "Produto atualizado com sucesso",
                "product": updated_product
            }
            
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 404:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Produto não encontrado"
            )
        
        error_detail = "Erro ao atualizar produto"
        try:
            error_data = e.response.json()
            error_detail = error_data.get("message", error_detail)
        except:
            pass
        
        logger.error(f"Erro HTTP ao atualizar produto: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_detail
        )
    except Exception as e:
        logger.error(f"Erro ao atualizar produto {product_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro interno ao atualizar produto"
        )

@router.delete("/products/{product_id}")
async def delete_product(
    product_id: str,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Exclui um produto do Mercado Livre."""
    try:
        valid_token = mercado_livre_service.get_valid_token(db, current_user.company_id)
        
        if not valid_token:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Token inválido ou expirado"
            )
        
        async with httpx.AsyncClient() as client:
            headers = {"Authorization": f"Bearer {valid_token}"}
            
            # Primeiro, pausar o produto
            pause_response = await client.put(
                f"https://api.mercadolibre.com/items/{product_id}",
                headers=headers,
                json={"status": "paused"}
            )
            
            if pause_response.status_code == 200:
                return {
                    "message": "Produto pausado com sucesso",
                    "product_id": product_id
                }
            else:
                # Se não conseguir pausar, tenta excluir diretamente
                delete_response = await client.delete(
                    f"https://api.mercadolibre.com/items/{product_id}",
                    headers=headers
                )
                
                if delete_response.status_code == 200:
                    return {
                        "message": "Produto excluído com sucesso",
                        "product_id": product_id
                    }
                else:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Não foi possível excluir o produto"
                    )
            
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 404:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Produto não encontrado"
            )
        
        logger.error(f"Erro HTTP ao excluir produto: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Erro ao excluir produto"
        )
    except Exception as e:
        logger.error(f"Erro ao excluir produto {product_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro interno ao excluir produto"
        )

@router.get("/categories")
async def get_categories(
    site_id: str = Query("MLB", description="ID do site (MLB para Brasil)")
):
    """Obtém lista de categorias do Mercado Livre."""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"https://api.mercadolibre.com/sites/{site_id}/categories")
            response.raise_for_status()
            return response.json()
            
    except Exception as e:
        logger.error(f"Erro ao buscar categorias: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao buscar categorias"
        )

@router.get("/categories/{category_id}")
async def get_category_attributes(
    category_id: str
):
    """Obtém atributos de uma categoria específica."""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"https://api.mercadolibre.com/categories/{category_id}/attributes")
            response.raise_for_status()
            return response.json()
            
    except Exception as e:
        logger.error(f"Erro ao buscar atributos da categoria: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao buscar atributos da categoria"
        )
