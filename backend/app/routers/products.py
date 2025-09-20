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
                    # Buscar informações básicas do item
                    item_response = await client.get(
                        f"https://api.mercadolibre.com/items/{item_id}",
                        headers=headers
                    )
                    if item_response.status_code == 200:
                        item_data = item_response.json()
                        
                        # Buscar informações de preços promocionais
                        try:
                            prices_response = await client.get(
                                f"https://api.mercadolibre.com/items/{item_id}/prices",
                                headers=headers
                            )
                            if prices_response.status_code == 200:
                                prices_data = prices_response.json()
                                
                                # Buscar preço de venda atual (com promoções ativas)
                                sale_price_response = await client.get(
                                    f"https://api.mercadolibre.com/items/{item_id}/sale_price?context=channel_marketplace",
                                    headers=headers
                                )
                                if sale_price_response.status_code == 200:
                                    sale_price_data = sale_price_response.json()
                                    
                                    # Adicionar informações de preços promocionais ao item
                                    item_data["sale_price_info"] = sale_price_data
                                    item_data["prices_info"] = prices_data
                                    
                                    # Adicionar campos para compatibilidade com frontend
                                    if sale_price_data.get("regular_amount") and sale_price_data.get("amount"):
                                        item_data["original_price"] = sale_price_data["regular_amount"]
                                        item_data["price"] = sale_price_data["amount"]
                                    
                        except Exception as price_error:
                            logger.warning(f"Erro ao buscar preços do item {item_id}: {price_error}")
                        
                        # Buscar informações de posição no catálogo
                        try:
                            catalog_position_response = await client.get(
                                f"https://api.mercadolibre.com/items/{item_id}/price_to_win?version=v2",
                                headers=headers
                            )
                            if catalog_position_response.status_code == 200:
                                catalog_position_data = catalog_position_response.json()
                                
                                # Adicionar informações de posição no catálogo ao item
                                item_data["catalog_position_info"] = catalog_position_data
                                
                                # Adicionar campos para compatibilidade com frontend
                                item_data["catalog_status"] = catalog_position_data.get("status", "unknown")
                                item_data["catalog_visit_share"] = catalog_position_data.get("visit_share", "unknown")
                                item_data["catalog_competitors_sharing"] = catalog_position_data.get("competitors_sharing_first_place", 0)
                                item_data["catalog_price_to_win"] = catalog_position_data.get("price_to_win")
                                
                        except Exception as catalog_error:
                            logger.warning(f"Erro ao buscar posição no catálogo do item {item_id}: {catalog_error}")
                        
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

@router.get("/announcements")
async def get_announcements(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0)
):
    """Obtém anúncios salvos no banco de dados local."""
    try:
        from app.models import MercadoLivreAnnouncement
        
        # Buscar anúncios do banco local
        announcements = db.query(MercadoLivreAnnouncement).filter(
            MercadoLivreAnnouncement.company_id == current_user.company_id
        ).offset(offset).limit(limit).all()
        
        total = db.query(MercadoLivreAnnouncement).filter(
            MercadoLivreAnnouncement.company_id == current_user.company_id
        ).count()
        
        # Converter para formato compatível com o frontend
        products = []
        for announcement in announcements:
            product_data = {
                "id": announcement.ml_item_id,
                "title": announcement.title,
                "price": float(announcement.price),
                "currency_id": announcement.currency_id,
                "available_quantity": announcement.available_quantity,
                "sold_quantity": announcement.sold_quantity,
                "condition": announcement.condition,
                "status": announcement.status,
                "permalink": announcement.permalink,
                "thumbnail": announcement.thumbnail,
                "listing_type_id": announcement.listing_type_id,
                "category_id": announcement.category_id,
                "domain_id": announcement.domain_id,
                "catalog_listing": announcement.catalog_listing,
                "catalog_product_id": announcement.catalog_product_id,
                "family_name": announcement.family_name,
                "family_id": announcement.family_id,
                "user_product_id": announcement.user_product_id,
                "inventory_id": announcement.inventory_id,
                "base_price": float(announcement.base_price) if announcement.base_price else None,
                "original_price": float(announcement.original_price) if announcement.original_price else None,
                "sale_price": float(announcement.sale_price) if announcement.sale_price else None,
                "catalog_status": announcement.catalog_status,
                "catalog_visit_share": announcement.catalog_visit_share,
                "catalog_competitors_sharing": announcement.catalog_competitors_sharing,
                "catalog_price_to_win": float(announcement.catalog_price_to_win) if announcement.catalog_price_to_win else None,
                "sale_price_info": announcement.sale_price_info,
                "prices_info": announcement.prices_info,
                "catalog_position_info": announcement.catalog_position_info,
                "attributes": announcement.attributes,
                "pictures": announcement.pictures,
                "tags": announcement.tags,
                "date_created": announcement.ml_date_created.isoformat() if announcement.ml_date_created else None,
                "last_updated": announcement.ml_last_updated.isoformat() if announcement.ml_last_updated else None,
            }
            products.append(product_data)
        
        return {
            "products": products,
            "total": total,
            "limit": limit,
            "offset": offset
        }
        
    except Exception as e:
        logger.error(f"Erro ao buscar anúncios do banco local: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro interno ao buscar anúncios"
        )

@router.post("/sync-announcements")
async def sync_announcements(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Sincroniza anúncios do Mercado Livre com o banco de dados local."""
    try:
        from app.models import MercadoLivreAnnouncement
        from datetime import datetime
        
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
        
        # Buscar todos os produtos do usuário
        async with httpx.AsyncClient() as client:
            headers = {"Authorization": f"Bearer {valid_token}"}
            
            # Buscar todos os itens do usuário usando paginação
            all_item_ids = []
            offset = 0
            limit = 50  # Limite por página da API do ML
            
            while True:
                response = await client.get(
                    f"https://api.mercadolibre.com/users/{integration.user_id}/items/search",
                    headers=headers,
                    params={"limit": limit, "offset": offset}
                )
                
                if response.status_code == 404:
                    break
                
                response.raise_for_status()
                search_data = response.json()
                
                if not search_data.get("results"):
                    break
                
                all_item_ids.extend(search_data["results"])
                
                # Verificar se há mais páginas
                paging = search_data.get("paging", {})
                total = paging.get("total", 0)
                current_offset = paging.get("offset", 0)
                
                if current_offset + len(search_data["results"]) >= total:
                    break
                
                offset += limit
            
            if not all_item_ids:
                return {"message": "Nenhum anúncio encontrado", "synced": 0, "updated": 0}
            
            synced_count = 0
            updated_count = 0
            
            # Processar cada item
            for item_id in all_item_ids:
                try:
                    # Buscar informações básicas do item
                    item_response = await client.get(
                        f"https://api.mercadolibre.com/items/{item_id}",
                        headers=headers
                    )
                    if item_response.status_code != 200:
                        continue
                        
                    item_data = item_response.json()
                    
                    # Buscar informações de preços promocionais
                    try:
                        prices_response = await client.get(
                            f"https://api.mercadolibre.com/items/{item_id}/prices",
                            headers=headers
                        )
                        if prices_response.status_code == 200:
                            prices_data = prices_response.json()
                            
                            # Buscar preço de venda atual (com promoções ativas)
                            sale_price_response = await client.get(
                                f"https://api.mercadolibre.com/items/{item_id}/sale_price?context=channel_marketplace",
                                headers=headers
                            )
                            if sale_price_response.status_code == 200:
                                sale_price_data = sale_price_response.json()
                                
                                # Adicionar informações de preços promocionais ao item
                                item_data["sale_price_info"] = sale_price_data
                                item_data["prices_info"] = prices_data
                                
                                # Adicionar campos para compatibilidade
                                if sale_price_data.get("regular_amount") and sale_price_data.get("amount"):
                                    item_data["original_price"] = sale_price_data["regular_amount"]
                                    item_data["price"] = sale_price_data["amount"]
                                
                    except Exception as price_error:
                        logger.warning(f"Erro ao buscar preços do item {item_id}: {price_error}")
                    
                    # Buscar informações de posição no catálogo
                    try:
                        catalog_position_response = await client.get(
                            f"https://api.mercadolibre.com/items/{item_id}/price_to_win?version=v2",
                            headers=headers
                        )
                        if catalog_position_response.status_code == 200:
                            catalog_position_data = catalog_position_response.json()
                            item_data["catalog_position_info"] = catalog_position_data
                            
                            # Adicionar campos para compatibilidade
                            item_data["catalog_status"] = catalog_position_data.get("status", "unknown")
                            item_data["catalog_visit_share"] = catalog_position_data.get("visit_share", "unknown")
                            item_data["catalog_competitors_sharing"] = catalog_position_data.get("competitors_sharing_first_place", 0)
                            item_data["catalog_price_to_win"] = catalog_position_data.get("price_to_win")
                            
                    except Exception as catalog_error:
                        logger.warning(f"Erro ao buscar posição no catálogo do item {item_id}: {catalog_error}")
                    
                    # Verificar se o anúncio já existe
                    existing_announcement = db.query(MercadoLivreAnnouncement).filter(
                        MercadoLivreAnnouncement.ml_item_id == item_id,
                        MercadoLivreAnnouncement.company_id == current_user.company_id
                    ).first()
                    
                    # Preparar dados para inserção/atualização
                    announcement_data = {
                        "company_id": current_user.company_id,
                        "ml_item_id": item_id,
                        "title": item_data.get("title", ""),
                        "price": float(item_data.get("price", 0)),
                        "currency_id": item_data.get("currency_id", "BRL"),
                        "available_quantity": item_data.get("available_quantity", 0),
                        "sold_quantity": item_data.get("sold_quantity", 0),
                        "condition": item_data.get("condition", ""),
                        "status": item_data.get("status", ""),
                        "permalink": item_data.get("permalink"),
                        "thumbnail": item_data.get("thumbnail"),
                        "listing_type_id": item_data.get("listing_type_id"),
                        "category_id": item_data.get("category_id"),
                        "domain_id": item_data.get("domain_id"),
                        "catalog_listing": item_data.get("catalog_listing", False),
                        "catalog_product_id": item_data.get("catalog_product_id"),
                        "family_name": item_data.get("family_name"),
                        "family_id": item_data.get("family_id"),
                        "user_product_id": item_data.get("user_product_id"),
                        "inventory_id": item_data.get("inventory_id"),
                        "base_price": float(item_data.get("base_price", 0)) if item_data.get("base_price") else None,
                        "original_price": float(item_data.get("original_price", 0)) if item_data.get("original_price") else None,
                        "sale_price": float(item_data.get("sale_price", 0)) if item_data.get("sale_price") else None,
                        "catalog_status": item_data.get("catalog_status"),
                        "catalog_visit_share": item_data.get("catalog_visit_share"),
                        "catalog_competitors_sharing": item_data.get("catalog_competitors_sharing"),
                        "catalog_price_to_win": float(item_data.get("catalog_price_to_win", 0)) if item_data.get("catalog_price_to_win") else None,
                        "full_data": item_data,
                        "sale_price_info": item_data.get("sale_price_info"),
                        "prices_info": item_data.get("prices_info"),
                        "catalog_position_info": item_data.get("catalog_position_info"),
                        "attributes": item_data.get("attributes"),
                        "pictures": item_data.get("pictures"),
                        "tags": item_data.get("tags"),
                        "ml_date_created": datetime.fromisoformat(item_data.get("date_created", "").replace("Z", "+00:00")) if item_data.get("date_created") else None,
                        "ml_last_updated": datetime.fromisoformat(item_data.get("last_updated", "").replace("Z", "+00:00")) if item_data.get("last_updated") else None,
                        "updated_at": datetime.utcnow()
                    }
                    
                    if existing_announcement:
                        # Atualizar anúncio existente
                        for key, value in announcement_data.items():
                            if key != "company_id" and key != "ml_item_id":
                                setattr(existing_announcement, key, value)
                        updated_count += 1
                    else:
                        # Criar novo anúncio
                        announcement_data["created_at"] = datetime.utcnow()
                        new_announcement = MercadoLivreAnnouncement(**announcement_data)
                        db.add(new_announcement)
                        synced_count += 1
                        
                except Exception as e:
                    logger.warning(f"Erro ao processar item {item_id}: {e}")
                    continue
            
            # Salvar todas as mudanças
            db.commit()
            
            return {
                "message": f"Sincronização concluída com sucesso!",
                "synced": synced_count,
                "updated": updated_count,
                "total_processed": synced_count + updated_count,
                "total_found": len(all_item_ids)
            }
            
    except httpx.HTTPStatusError as e:
        logger.error(f"Erro HTTP ao sincronizar anúncios: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Erro ao sincronizar anúncios no Mercado Livre"
        )
    except Exception as e:
        logger.error(f"Erro ao sincronizar anúncios: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro interno ao sincronizar anúncios"
        )

@router.get("/catalog-competitors/{product_id}")
async def get_catalog_competitors(
    product_id: str,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtém lista de concorrentes no catálogo para um produto específico."""
    try:
        # Obter token válido
        valid_token = mercado_livre_service.get_valid_token(db, current_user.company_id)
        
        if not valid_token:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Token inválido ou expirado. Reconecte sua conta do Mercado Livre."
            )
        
        # Buscar concorrentes do catálogo usando a API do Mercado Livre
        async with httpx.AsyncClient() as client:
            headers = {"Authorization": f"Bearer {valid_token}"}
            
            # Usar o endpoint recomendado pela documentação para obter concorrentes do catálogo
            response = await client.get(
                f"https://api.mercadolibre.com/products/{product_id}/items",
                headers=headers
            )
            
            if response.status_code == 404:
                return []
            
            response.raise_for_status()
            data = response.json()
            
            logger.info(f"Dados recebidos da API: {data}")
            
            # Processar os resultados para extrair informações relevantes
            competitors = []
            for item in data.get("results", []):
                # Obter informações do vendedor
                seller_info = {}
                if item.get("seller_id"):
                    try:
                        seller_response = await client.get(
                            f"https://api.mercadolibre.com/users/{item.get('seller_id')}",
                            headers=headers
                        )
                        if seller_response.status_code == 200:
                            seller_data = seller_response.json()
                            seller_info = {
                                "nickname": seller_data.get("nickname"),
                                "reputation_level_id": seller_data.get("seller_reputation", {}).get("level_id"),
                                "power_seller_status": seller_data.get("seller_reputation", {}).get("power_seller_status"),
                                "transactions": seller_data.get("seller_reputation", {}).get("transactions", {})
                            }
                    except Exception as e:
                        logger.warning(f"Erro ao obter informações do vendedor {item.get('seller_id')}: {e}")
                
                # Usar os dados diretamente da resposta da API de concorrentes
                competitor = {
                    "item_id": item.get("item_id"),
                    "price": item.get("price"),
                    "original_price": item.get("original_price"),
                    "condition": item.get("condition"),
                    "available_quantity": item.get("available_quantity", 0),
                    "sold_quantity": item.get("sold_quantity", 0),
                    "shipping": {
                        "free_shipping": item.get("shipping", {}).get("free_shipping", False),
                        "mode": item.get("shipping", {}).get("mode"),
                        "logistic_type": item.get("shipping", {}).get("logistic_type"),
                        "tags": item.get("shipping", {}).get("tags", [])
                    },
                    "seller": {
                        "nickname": seller_info.get("nickname", "Vendedor"),
                        "reputation_level_id": seller_info.get("reputation_level_id"),
                        "seller_id": item.get("seller_id"),
                        "power_seller_status": seller_info.get("power_seller_status"),
                        "transactions": seller_info.get("transactions", {})
                    },
                    "listing_type_id": item.get("listing_type_id"),
                    "tags": item.get("tags", []),
                    "deal_ids": item.get("deal_ids", []),
                    "title": item.get("title", ""),
                    "permalink": item.get("permalink", "")
                }
                competitors.append(competitor)
            
            # Ordenar por preço (menor primeiro)
            competitors.sort(key=lambda x: x.get("price", 0))
            
            return competitors
            
    except httpx.HTTPStatusError as e:
        logger.error(f"Erro HTTP ao buscar concorrentes: {e}")
        if e.response.status_code == 404:
            return []
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Erro ao buscar concorrentes no Mercado Livre"
        )
    except Exception as e:
        logger.error(f"Erro ao buscar concorrentes: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro interno ao buscar concorrentes"
        )
