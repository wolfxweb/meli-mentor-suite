from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth import get_current_user
from app.services.mercado_livre import mercado_livre_service
from app.models import MercadoLivreAnnouncement, CatalogCompetitor, User
from typing import Optional, List, Dict, Any
import logging
import httpx
from datetime import datetime

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

@router.get("/announcements/{announcement_id}")
async def get_announcement(
    announcement_id: str,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtém detalhes de um anúncio específico do banco local."""
    try:
        from app.models import MercadoLivreAnnouncement
        
        # Buscar anúncio no banco local
        announcement = db.query(MercadoLivreAnnouncement).filter(
            MercadoLivreAnnouncement.ml_item_id == announcement_id,
            MercadoLivreAnnouncement.company_id == current_user.company_id
        ).first()
        
        if not announcement:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Anúncio não encontrado"
            )
        
        # Converter para formato compatível com o frontend
        product_data = {
            "id": announcement.ml_item_id,
            "title": announcement.title,
            "price": float(announcement.price),
            "original_price": float(announcement.original_price) if announcement.original_price else None,
            "base_price": float(announcement.base_price) if announcement.base_price else None,
            "sale_price": float(announcement.sale_price) if announcement.sale_price else None,
            "currency_id": announcement.currency_id,
            "available_quantity": announcement.available_quantity,
            "sold_quantity": announcement.sold_quantity,
            "condition": announcement.condition,
            "status": announcement.status,
            "permalink": announcement.permalink,
            "thumbnail": announcement.thumbnail,
            "listing_type_id": announcement.listing_type_id,
            "listing_type_name": announcement.listing_type_name,
            "listing_exposure": announcement.listing_exposure,
            "category_id": announcement.category_id,
            "domain_id": announcement.domain_id,
            "listing_fee_amount": float(announcement.listing_fee_amount) if announcement.listing_fee_amount else None,
            "sale_fee_amount": float(announcement.sale_fee_amount) if announcement.sale_fee_amount else None,
            "sale_fee_percentage": float(announcement.sale_fee_percentage) if announcement.sale_fee_percentage else None,
            "sale_fee_fixed": float(announcement.sale_fee_fixed) if announcement.sale_fee_fixed else None,
            "total_cost": float(announcement.total_cost) if announcement.total_cost else None,
            "requires_picture": announcement.requires_picture,
            "product_cost": float(announcement.product_cost) if announcement.product_cost else None,
            "taxes": announcement.taxes,
            "ads_cost": announcement.ads_cost,
            "shipping_cost": float(announcement.shipping_cost) if announcement.shipping_cost else None,
            "additional_fees": announcement.additional_fees,
            "additional_notes": announcement.additional_notes,
            "catalog_listing": announcement.catalog_listing,
            "catalog_product_id": announcement.catalog_product_id,
            "family_name": announcement.family_name,
            "family_id": announcement.family_id,
            "user_product_id": announcement.user_product_id,
            "inventory_id": announcement.inventory_id,
            "catalog_status": announcement.catalog_status,
            "catalog_visit_share": announcement.catalog_visit_share,
            "catalog_competitors_sharing": announcement.catalog_competitors_sharing,
            "catalog_price_to_win": float(announcement.catalog_price_to_win) if announcement.catalog_price_to_win else None,
            "full_data": announcement.full_data,
            "sale_price_info": announcement.sale_price_info,
            "prices_info": announcement.prices_info,
            "catalog_position_info": announcement.catalog_position_info,
            "attributes": announcement.attributes,
            "pictures": announcement.pictures,
            "tags": announcement.tags,
            "ml_date_created": announcement.ml_date_created.isoformat() if announcement.ml_date_created else None,
            "ml_last_updated": announcement.ml_last_updated.isoformat() if announcement.ml_last_updated else None,
        }
        
        return product_data
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao buscar anúncio {announcement_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro interno ao buscar anúncio"
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
                "listing_type_name": announcement.listing_type_name,
                "listing_exposure": announcement.listing_exposure,
                "category_id": announcement.category_id,
                "domain_id": announcement.domain_id,
                
                # Campos de custos
                "listing_fee_amount": float(announcement.listing_fee_amount) if announcement.listing_fee_amount else None,
                "sale_fee_amount": float(announcement.sale_fee_amount) if announcement.sale_fee_amount else None,
                "sale_fee_percentage": float(announcement.sale_fee_percentage) if announcement.sale_fee_percentage else None,
                "sale_fee_fixed": float(announcement.sale_fee_fixed) if announcement.sale_fee_fixed else None,
                "total_cost": float(announcement.total_cost) if announcement.total_cost else None,
                "requires_picture": announcement.requires_picture,
                "free_relist": announcement.free_relist,
                
                # Campos de informações adicionais de custos
                "product_cost": float(announcement.product_cost) if announcement.product_cost else None,
                "taxes": announcement.taxes,
                "ads_cost": announcement.ads_cost,
                "shipping_cost": float(announcement.shipping_cost) if announcement.shipping_cost else None,
                "additional_fees": announcement.additional_fees,
                "additional_notes": announcement.additional_notes,
                
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
                    
                    # Buscar informações de custos usando a API oficial listing_prices
                    try:
                        price = item_data.get("price", 0)
                        category_id = item_data.get("category_id")
                        listing_type_id = item_data.get("listing_type_id")
                        currency_id = item_data.get("currency_id", "BRL")
                        site_id = item_data.get("site_id", "MLB")
                        
                        if price and category_id:
                            listing_prices_url = f"https://api.mercadolibre.com/sites/{site_id}/listing_prices"
                            params = {
                                "price": price,
                                "category_id": category_id,
                                "currency_id": currency_id
                            }
                            
                            if listing_type_id:
                                params["listing_type_id"] = listing_type_id
                            
                            listing_prices_response = await client.get(
                                listing_prices_url,
                                params=params,
                                headers=headers
                            )
                            
                            if listing_prices_response.status_code == 200:
                                listing_prices_data = listing_prices_response.json()
                                
                                # Processar dados de custos
                                if isinstance(listing_prices_data, list):
                                    if listing_type_id:
                                        current_listing_data = next(
                                            (item for item in listing_prices_data if item.get("listing_type_id") == listing_type_id),
                                            listing_prices_data[0] if listing_prices_data else None
                                        )
                                    else:
                                        current_listing_data = listing_prices_data[0] if listing_prices_data else None
                                else:
                                    current_listing_data = listing_prices_data
                                
                                if current_listing_data:
                                    # Adicionar dados de custos ao item
                                    item_data["listing_type_name"] = current_listing_data.get("listing_type_name")
                                    item_data["listing_exposure"] = current_listing_data.get("listing_exposure")
                                    item_data["listing_fee_amount"] = current_listing_data.get("listing_fee_amount", 0)
                                    item_data["sale_fee_amount"] = current_listing_data.get("sale_fee_amount", 0)
                                    item_data["requires_picture"] = current_listing_data.get("requires_picture", True)
                                    item_data["free_relist"] = current_listing_data.get("free_relist", False)
                                    
                                    # Extrair detalhes da taxa de venda
                                    sale_fee_details = current_listing_data.get("sale_fee_details", {})
                                    item_data["sale_fee_percentage"] = sale_fee_details.get("percentage_fee")
                                    item_data["sale_fee_fixed"] = sale_fee_details.get("fixed_fee")
                                    
                                    # Calcular custo total
                                    listing_fee = current_listing_data.get("listing_fee_amount", 0)
                                    sale_fee = current_listing_data.get("sale_fee_amount", 0)
                                    item_data["total_cost"] = listing_fee + sale_fee
                                    
                    except Exception as costs_error:
                        logger.warning(f"Erro ao buscar custos do item {item_id}: {costs_error}")
                    
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
                        "listing_type_name": item_data.get("listing_type_name"),
                        "listing_exposure": item_data.get("listing_exposure"),
                        "category_id": item_data.get("category_id"),
                        "domain_id": item_data.get("domain_id"),
                        
                        # Campos de custos
                        "listing_fee_amount": float(item_data.get("listing_fee_amount", 0)) if item_data.get("listing_fee_amount") is not None else None,
                        "sale_fee_amount": float(item_data.get("sale_fee_amount", 0)) if item_data.get("sale_fee_amount") is not None else None,
                        "sale_fee_percentage": float(item_data.get("sale_fee_percentage", 0)) if item_data.get("sale_fee_percentage") is not None else None,
                        "sale_fee_fixed": float(item_data.get("sale_fee_fixed", 0)) if item_data.get("sale_fee_fixed") is not None else None,
                        "total_cost": float(item_data.get("total_cost", 0)) if item_data.get("total_cost") is not None else None,
                        "requires_picture": item_data.get("requires_picture"),
                        "free_relist": item_data.get("free_relist"),
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

@router.post("/catalog-competitors/sync/{catalog_product_id}")
async def sync_catalog_competitors(
    catalog_product_id: str,
    db: Session = Depends(get_db)
):
    """Sincroniza concorrentes do catálogo salvando no banco de dados."""
    try:
        # Buscar qualquer integração ativa (dados públicos)
        from app.models import MercadoLivreIntegration
        integration = db.query(MercadoLivreIntegration).filter(
            MercadoLivreIntegration.is_active == True
        ).first()
        
        if not integration:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Nenhuma integração ativa encontrada."
            )
        
        valid_token = integration.access_token
        
        # Buscar concorrentes do catálogo usando a API do Mercado Livre
        async with httpx.AsyncClient() as client:
            headers = {"Authorization": f"Bearer {valid_token}"}
            
            response = await client.get(
                f"https://api.mercadolibre.com/products/{catalog_product_id}/items",
                headers=headers
            )
            
            if response.status_code == 404:
                return {"message": "Produto do catálogo não encontrado", "synced": 0, "removed": 0}
            
            response.raise_for_status()
            data = response.json()
            
            # Obter lista atual de concorrentes no banco para este produto
            existing_competitors = db.query(CatalogCompetitor).filter(
                CatalogCompetitor.catalog_product_id == catalog_product_id
            ).all()
            
            existing_item_ids = {comp.item_id for comp in existing_competitors}
            current_item_ids = set()
            
            # Processar os resultados da API
            synced_count = 0
            for item in data.get("results", []):
                item_id = item.get("item_id")
                if not item_id:
                    continue
                    
                current_item_ids.add(item_id)
                
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
                                "reputation_level": seller_data.get("seller_reputation", {}).get("level_id"),
                                "power_status": seller_data.get("seller_reputation", {}).get("power_seller_status"),
                                "transactions_total": seller_data.get("seller_reputation", {}).get("transactions", {}).get("total", 0)
                            }
                    except Exception as e:
                        logger.warning(f"Erro ao obter informações do vendedor {item.get('seller_id')}: {e}")
                
                # Obter informações de preços (original_price se houver desconto)
                original_price = None
                if item.get("original_price") and item.get("original_price") != item.get("price"):
                    original_price = item.get("original_price")
                
                # Criar URL do anúncio
                product_title = item.get("title", "")
                import re
                clean_title = re.sub(r'[^a-z0-9\s-]', '', product_title.lower())
                clean_title = re.sub(r'\s+', '-', clean_title)
                clean_title = re.sub(r'-+', '-', clean_title)
                clean_title = clean_title.strip('-')
                item_url = f"https://produto.mercadolivre.com.br/{item_id}-{clean_title}"
                
                # Verificar se já existe no banco
                existing_competitor = db.query(CatalogCompetitor).filter(
                    CatalogCompetitor.item_id == item_id
                ).first()
                
                if existing_competitor:
                    # Atualizar dados existentes
                    existing_competitor.title = item.get("title", "")
                    existing_competitor.price = item.get("price", 0)
                    existing_competitor.original_price = item.get("original_price")
                    existing_competitor.condition = item.get("condition", "")
                    existing_competitor.available_quantity = item.get("available_quantity", 0)
                    existing_competitor.sold_quantity = item.get("sold_quantity", 0)
                    existing_competitor.permalink = item.get("permalink", "")
                    existing_competitor.url = item_url
                    existing_competitor.seller_nickname = seller_info.get("nickname")
                    existing_competitor.seller_reputation_level = seller_info.get("reputation_level")
                    existing_competitor.seller_power_status = seller_info.get("power_status")
                    existing_competitor.seller_transactions_total = seller_info.get("transactions_total", 0)
                    existing_competitor.shipping_mode = item.get("shipping", {}).get("mode")
                    existing_competitor.shipping_logistic_type = item.get("shipping", {}).get("logistic_type")
                    existing_competitor.shipping_free = item.get("shipping", {}).get("free_shipping", False)
                    existing_competitor.shipping_tags = item.get("shipping", {}).get("tags", [])
                    existing_competitor.listing_type_id = item.get("listing_type_id")
                    existing_competitor.tags = item.get("tags", [])
                    existing_competitor.deal_ids = item.get("deal_ids", [])
                    existing_competitor.ml_date_created = datetime.fromisoformat(item.get("date_created", "").replace("Z", "+00:00")) if item.get("date_created") else None
                    existing_competitor.ml_last_updated = datetime.fromisoformat(item.get("last_updated", "").replace("Z", "+00:00")) if item.get("last_updated") else None
                    existing_competitor.updated_at = datetime.utcnow()
                else:
                    # Criar novo registro
                    new_competitor = CatalogCompetitor(
                        company_id=integration.company_id,
                        catalog_product_id=catalog_product_id,
                        item_id=item_id,
                        title=item.get("title", ""),
                        price=item.get("price", 0),
                        original_price=item.get("original_price"),
                        condition=item.get("condition", ""),
                        available_quantity=item.get("available_quantity", 0),
                        sold_quantity=item.get("sold_quantity", 0),
                        permalink=item.get("permalink", ""),
                        url=item_url,
                        seller_id=str(item.get("seller_id", "")),
                        seller_nickname=seller_info.get("nickname"),
                        seller_reputation_level=seller_info.get("reputation_level"),
                        seller_power_status=seller_info.get("power_status"),
                        seller_transactions_total=seller_info.get("transactions_total", 0),
                        shipping_mode=item.get("shipping", {}).get("mode"),
                        shipping_logistic_type=item.get("shipping", {}).get("logistic_type"),
                        shipping_free=item.get("shipping", {}).get("free_shipping", False),
                        shipping_tags=item.get("shipping", {}).get("tags", []),
                        listing_type_id=item.get("listing_type_id"),
                        tags=item.get("tags", []),
                        deal_ids=item.get("deal_ids", []),
                        ml_date_created=datetime.fromisoformat(item.get("date_created", "").replace("Z", "+00:00")) if item.get("date_created") else None,
                        ml_last_updated=datetime.fromisoformat(item.get("last_updated", "").replace("Z", "+00:00")) if item.get("last_updated") else None
                    )
                    db.add(new_competitor)
                
                synced_count += 1
            
            # Remover concorrentes que não estão mais na API
            removed_count = 0
            for competitor in existing_competitors:
                if competitor.item_id not in current_item_ids:
                    db.delete(competitor)
                    removed_count += 1
            
            db.commit()
            
            return {
                "message": f"Sincronização concluída para o produto {catalog_product_id}",
                "synced": synced_count,
                "removed": removed_count,
                "total_current": len(current_item_ids)
            }
            
    except httpx.HTTPStatusError as e:
        logger.error(f"Erro HTTP ao sincronizar concorrentes: {e}")
        if e.response.status_code == 404:
            return {"message": "Produto do catálogo não encontrado", "synced": 0, "removed": 0}
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Erro ao sincronizar concorrentes no Mercado Livre"
        )
    except Exception as e:
        logger.error(f"Erro ao sincronizar concorrentes: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro interno ao sincronizar concorrentes"
        )

@router.get("/catalog-competitors/db/{catalog_product_id}")
async def get_catalog_competitors_from_db(
    catalog_product_id: str,
    db: Session = Depends(get_db)
):
    """Obtém concorrentes do catálogo salvos no banco de dados."""
    try:
        competitors = db.query(CatalogCompetitor).filter(
            CatalogCompetitor.catalog_product_id == catalog_product_id
        ).order_by(CatalogCompetitor.price.asc()).all()
        
        # Converter para formato compatível com o frontend
        result = []
        for comp in competitors:
            competitor_data = {
                "item_id": comp.item_id,
                "title": comp.title,
                "price": float(comp.price),
                "original_price": float(comp.original_price) if comp.original_price else None,
                "condition": comp.condition,
                "available_quantity": comp.available_quantity,
                "sold_quantity": comp.sold_quantity,
                "url": comp.url,
                "manual_url": comp.manual_url,
                "seller": {
                    "seller_id": comp.seller_id,
                    "nickname": comp.seller_nickname,
                    "reputation_level_id": comp.seller_reputation_level,
                    "power_seller_status": comp.seller_power_status,
                    "transactions": {
                        "total": comp.seller_transactions_total
                    }
                },
                "shipping": {
                    "mode": comp.shipping_mode,
                    "logistic_type": comp.shipping_logistic_type,
                    "free_shipping": comp.shipping_free,
                    "tags": comp.shipping_tags or []
                },
                "listing_type_id": comp.listing_type_id,
                "tags": comp.tags or [],
                "deal_ids": comp.deal_ids or []
            }
            result.append(competitor_data)
        
        return result
        
    except Exception as e:
        logger.error(f"Erro ao buscar concorrentes do banco: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro interno ao buscar concorrentes"
        )

@router.put("/catalog-competitors/{item_id}/manual-url")
async def update_manual_url(
    item_id: str,
    request_data: dict,
    db: Session = Depends(get_db)
):
    """Atualiza a URL manual de um concorrente do catálogo."""
    try:
        manual_url = request_data.get("manual_url", "")
        
        competitor = db.query(CatalogCompetitor).filter(
            CatalogCompetitor.item_id == item_id
        ).first()
        
        if not competitor:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Concorrente não encontrado"
            )
        
        competitor.manual_url = manual_url
        competitor.updated_at = datetime.utcnow()
        db.commit()
        
        return {"message": "URL manual atualizada com sucesso", "item_id": item_id, "manual_url": manual_url}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao atualizar URL manual: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro interno ao atualizar URL manual"
        )

@router.put("/announcements/{item_id}/additional-info")
async def update_announcement_additional_info(
    item_id: str,
    additional_info: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Atualizar informações adicionais de um anúncio"""
    try:
        # Buscar o anúncio
        announcement = db.query(MercadoLivreAnnouncement).filter(
            MercadoLivreAnnouncement.ml_item_id == item_id,
            MercadoLivreAnnouncement.company_id == current_user.company_id
        ).first()
        
        if not announcement:
            raise HTTPException(status_code=404, detail="Anúncio não encontrado")
        
        # Atualizar os campos
        if "product_cost" in additional_info:
            announcement.product_cost = additional_info["product_cost"]
        if "taxes" in additional_info:
            announcement.taxes = additional_info["taxes"]
        if "ads_cost" in additional_info:
            announcement.ads_cost = additional_info["ads_cost"]
        if "shipping_cost" in additional_info:
            announcement.shipping_cost = additional_info["shipping_cost"]
        if "additional_fees" in additional_info:
            announcement.additional_fees = additional_info["additional_fees"]
        if "additional_notes" in additional_info:
            announcement.additional_notes = additional_info["additional_notes"]
        
        # Salvar no banco
        db.commit()
        db.refresh(announcement)
        
        return {"message": "Informações adicionais atualizadas com sucesso"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao atualizar informações adicionais: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao atualizar informações adicionais: {str(e)}")
