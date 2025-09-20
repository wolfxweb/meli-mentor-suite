import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Package, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Eye,
  Upload,
  Download,
  RefreshCw,
  Loader2,
  ExternalLink,
  AlertTriangle,
  CheckCircle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { mercadoLivreApi } from "@/services/mercadoLivreApi";

interface MercadoLivreProduct {
  id: string;
  title: string;
  price: number;
  currency_id: string;
  available_quantity: number;
  sold_quantity: number;
  condition: string;
  permalink: string;
  thumbnail: string;
  pictures: Array<{
    id: string;
    url: string;
    secure_url: string;
  }>;
  attributes: Array<{
    id: string;
    name: string;
    value_name: string;
  }>;
  status: string;
  listing_type_id: string;
  category_id: string;
  date_created: string;
  last_updated: string;
  tags?: string[];
  health?: number;
  catalog_listing?: boolean;
  catalog_product_id?: string;
  domain_id?: string;
  initial_quantity?: number;
  base_price?: number;
  original_price?: number;
  sub_status?: string[];
  family_name?: string;
  user_product_id?: string;
  family_id?: string;
  inventory_id?: string; // Campo para identificar produtos Full
  // Campos para preço promocional
  sale_price?: number;
  deal_ids?: string[];
  // Campos para posição no catálogo
  catalog_position?: number;
  catalog_competitors?: Array<{
    id: string;
    price: number;
    position: number;
  }>;
  // Novos campos da API de posição no catálogo
  catalog_status?: string; // winning, competing, sharing_first_place, listed
  catalog_visit_share?: string; // maximum, medium, minimum
  catalog_competitors_sharing?: number;
  catalog_price_to_win?: number;
  catalog_position_info?: any; // Informações completas da API
}

interface ProductForm {
  title: string;
  price: number;
  available_quantity: number;
  condition: string;
  description: string;
  category_id: string;
  pictures: string[];
  attributes: Array<{
    id: string;
    value_name: string;
  }>;
}

export const ProductsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [products, setProducts] = useState<MercadoLivreProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<MercadoLivreProduct | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showCatalogAnalysisModal, setShowCatalogAnalysisModal] = useState(false);
  const [catalogCompetitors, setCatalogCompetitors] = useState<any[]>([]);
  const [loadingCompetitors, setLoadingCompetitors] = useState(false);
  const [showItemDetailsModal, setShowItemDetailsModal] = useState(false);
  const [selectedItemDetails, setSelectedItemDetails] = useState<any>(null);
  const [loadingItemDetails, setLoadingItemDetails] = useState(false);
  const [manualUrl, setManualUrl] = useState('');
  const [savingUrl, setSavingUrl] = useState(false);
  const [fullFilter, setFullFilter] = useState<'all' | 'full' | 'no-full'>('all');
  const [catalogFilter, setCatalogFilter] = useState<'all' | 'catalog' | 'normal'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'paused' | 'closed'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const productsPerPage = 50;
  const [sortField, setSortField] = useState<string>('title');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [activeTab, setActiveTab] = useState('anuncios');

  const [productForm, setProductForm] = useState<ProductForm>({
    title: "",
    price: 0,
    available_quantity: 1,
    condition: "new",
    description: "",
    category_id: "",
    pictures: [],
    attributes: []
  });

  // Carregar produtos ao montar o componente
  useEffect(() => {
    loadProducts();
  }, []);

  // Carregar todos os produtos quando qualquer filtro é aplicado
  useEffect(() => {
    if (fullFilter !== 'all' || catalogFilter !== 'all' || statusFilter !== 'all') {
      loadProducts(1, true); // Carregar todos os produtos para filtros
    }
  }, [fullFilter, catalogFilter, statusFilter]);

  const loadProducts = async (page: number = 1, loadAll: boolean = false) => {
    setIsLoading(true);
    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const token = localStorage.getItem('auth_token');
      
      if (loadAll) {
        // Carregar todos os produtos para filtros
        const allProducts = [];
        let currentOffset = 0;
        let hasMore = true;
        
        while (hasMore) {
          const response = await fetch(`${API_BASE_URL}/api/mercado-livre/announcements?limit=100&offset=${currentOffset}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            allProducts.push(...(data.products || []));
            
            if (data.products && data.products.length < 100) {
              hasMore = false;
            } else {
              currentOffset += 100;
            }
          } else {
            hasMore = false;
          }
        }
        
        setProducts(allProducts);
        setTotalProducts(allProducts.length);
        setTotalPages(1);
        setCurrentPage(1);
      } else {
        // Carregamento normal com paginação
        const offset = (page - 1) * productsPerPage;
        
        const response = await fetch(`${API_BASE_URL}/api/mercado-livre/announcements?limit=${productsPerPage}&offset=${offset}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setProducts(data.products || []);
          setTotalProducts(data.total || 0);
          setTotalPages(Math.ceil((data.total || 0) / productsPerPage));
          setCurrentPage(page);
        } else {
          toast({
            title: "Erro",
            description: "Erro ao carregar produtos",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar produtos",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      loadProducts(page);
    }
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const hasFullSales = (product: MercadoLivreProduct) => {
    // Verifica se tem vendas no Full baseado na documentação do Mercado Livre:
    // 1. inventory_id presente = produto está no Full
    // 2. sold_quantity > 0 = tem vendas
    // 3. tags contém "full" ou "fulfillment" (backup)
    // 4. listing_type_id indica Full (backup)
    
    // Método principal: inventory_id presente indica produto no Full
    const hasInventoryId = !!(product as any).inventory_id;
    
    // Métodos de backup para produtos com vendas
    const hasSales = product.sold_quantity > 0;
    const hasFullTags = product.tags?.some(tag => 
      tag.toLowerCase().includes('full') || 
      tag.toLowerCase().includes('fulfillment')
    ) || false;
    const isFullListing = product.listing_type_id?.includes('full') || false;
    
    // Produto está no Full se tem inventory_id OU (tem vendas E indicadores de Full)
    return hasInventoryId || (hasSales && (hasFullTags || isFullListing));
  };

  const isCatalogProduct = (product: MercadoLivreProduct) => {
    // Verifica se é um produto de catálogo baseado em:
    // 1. catalog_listing = true
    // 2. catalog_product_id presente
    return product.catalog_listing === true || !!product.catalog_product_id;
  };

  const isOnSale = (product: MercadoLivreProduct) => {
    // Verifica se o produto está em promoção baseado na nova API de preços do Mercado Livre:
    // 1. sale_price_info.regular_amount > sale_price_info.amount (preço promocional ativo)
    // 2. original_price presente e maior que price (compatibilidade com API antiga)
    // 3. deal_ids presente (indica promoções ativas como DEAL, LIGHTNING, DOD, etc.)
    // 4. base_price diferente do price (pode indicar preço promocional)
    
    // Verificar usando a nova API de preços
    const salePriceInfo = (product as any).sale_price_info;
    if (salePriceInfo && salePriceInfo.regular_amount && salePriceInfo.amount) {
      return salePriceInfo.regular_amount > salePriceInfo.amount;
    }
    
    // Fallback para API antiga
    const hasOriginalPriceDiscount = product.original_price && product.original_price > product.price;
    const hasActiveDeals = product.deal_ids && product.deal_ids.length > 0;
    const hasSalePrice = product.sale_price && product.sale_price !== product.price;
    const hasBasePriceDifference = product.base_price && product.base_price !== product.price;
    
    return hasOriginalPriceDiscount || hasActiveDeals || hasSalePrice || hasBasePriceDifference;
  };

  const getCatalogPosition = (product: MercadoLivreProduct) => {
    // Usa os novos dados da API de posição no catálogo
    if (!product.catalog_status) {
      return { position: 'N/A', status: 'unknown' };
    }

    const status = product.catalog_status;
    const visitShare = product.catalog_visit_share;
    const competitorsSharing = product.catalog_competitors_sharing || 0;

    switch (status) {
      case 'winning':
        return { 
          position: '1º', 
          status: 'winning',
          description: 'Ganhando - No momento, você oferece melhores condições'
        };
      case 'sharing_first_place':
        return { 
          position: '1º', 
          status: 'sharing_first_place',
          description: `Compartilhando o primeiro lugar com ${competitorsSharing} vendedor(es)`
        };
      case 'competing':
        return { 
          position: 'Competindo', 
          status: 'competing',
          description: 'Outros vendedores oferecem condições melhores'
        };
      case 'listed':
        return { 
          position: 'Listado', 
          status: 'listed',
          description: 'Aparece na lista mas não pode ganhar'
        };
      default:
        return { 
          position: 'N/A', 
          status: 'unknown',
          description: 'Status desconhecido'
        };
    }
  };

  const getPriceDisplay = (product: MercadoLivreProduct) => {
    if (!isOnSale(product)) {
      // Sem desconto - mostra apenas o preço normal
      return (
        <span className="font-bold text-green-600">
          R$ {product.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </span>
      );
    }

    // Com desconto - usa a nova API de preços ou fallback para API antiga
    const salePriceInfo = (product as any).sale_price_info;
    let currentPrice = product.price;
    let originalPrice = product.original_price || product.base_price || product.price;
    
    // Usar informações da nova API de preços se disponível
    if (salePriceInfo && salePriceInfo.regular_amount && salePriceInfo.amount) {
      currentPrice = salePriceInfo.amount;
      originalPrice = salePriceInfo.regular_amount;
    } else {
      // Fallback para API antiga
      if (!product.original_price && product.base_price && product.base_price !== product.price) {
        originalPrice = product.base_price;
      }
    }
    
    // Calcula o desconto
    const discount = originalPrice > currentPrice ? 
      Math.round(((originalPrice - currentPrice) / originalPrice) * 100) : 0;

    return (
      <div className="text-right">
        <div className="font-bold text-red-600">
          R$ {currentPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </div>
        {originalPrice > currentPrice && (
          <div className="text-xs text-gray-500 line-through">
            R$ {originalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
        )}
        {discount > 0 && (
          <div className="text-xs text-red-600 font-medium">
            -{discount}%
          </div>
        )}
      </div>
    );
  };

  const getCatalogPositionBadge = (product: MercadoLivreProduct) => {
    const { position, status, description } = getCatalogPosition(product);

    switch (status) {
      case 'winning':
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-200" title={description}>
            <CheckCircle className="h-3 w-3 mr-1" />
            {position} - Ganhando
          </Badge>
        );
      case 'sharing_first_place':
        return (
          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200" title={description}>
            <CheckCircle className="h-3 w-3 mr-1" />
            {position} - Compartilhando
          </Badge>
        );
      case 'competing':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200" title={description}>
            <AlertTriangle className="h-3 w-3 mr-1" />
            {position}
          </Badge>
        );
      case 'listed':
        return (
          <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-200" title={description}>
            <AlertTriangle className="h-3 w-3 mr-1" />
            {position}
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-gray-500">
            {position}
          </Badge>
        );
    }
  };

  const filteredProducts = products.filter(product => {
    // Filtro por termo de busca
    const matchesSearch = product.title.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Filtro por Full
    let matchesFullFilter = true;
    if (fullFilter === 'full') {
      matchesFullFilter = hasFullSales(product);
    } else if (fullFilter === 'no-full') {
      matchesFullFilter = !hasFullSales(product);
    }
    
    // Filtro por Catálogo
    let matchesCatalogFilter = true;
    if (catalogFilter === 'catalog') {
      matchesCatalogFilter = isCatalogProduct(product);
    } else if (catalogFilter === 'normal') {
      matchesCatalogFilter = !isCatalogProduct(product);
    }
    
    // Filtro por Status
    let matchesStatusFilter = true;
    if (statusFilter === 'active') {
      matchesStatusFilter = product.status === 'active';
    } else if (statusFilter === 'paused') {
      matchesStatusFilter = product.status === 'paused';
    } else if (statusFilter === 'closed') {
      matchesStatusFilter = product.status === 'closed';
    }
    
    return matchesSearch && matchesFullFilter && matchesCatalogFilter && matchesStatusFilter;
  });

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    let aValue: any;
    let bValue: any;

    switch (sortField) {
      case 'title':
        aValue = a.title.toLowerCase();
        bValue = b.title.toLowerCase();
        break;
      case 'price':
        aValue = a.price;
        bValue = b.price;
        break;
      case 'available_quantity':
        aValue = a.available_quantity;
        bValue = b.available_quantity;
        break;
      case 'sold_quantity':
        aValue = a.sold_quantity;
        bValue = b.sold_quantity;
        break;
      case 'status':
        aValue = a.status;
        bValue = b.status;
        break;
      default:
        aValue = a.title.toLowerCase();
        bValue = b.title.toLowerCase();
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const getSortIcon = (field: string) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4" />;
    }
    return sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />;
  };

  const getFullSalesBadge = (product: MercadoLivreProduct) => {
    if (hasFullSales(product)) {
      return (
        <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">
          <CheckCircle className="h-3 w-3 mr-1" />
          Full
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-gray-500">
        <AlertTriangle className="h-3 w-3 mr-1" />
        Sem Full
      </Badge>
    );
  };


  const getCatalogBadge = (product: MercadoLivreProduct) => {
    if (isCatalogProduct(product)) {
      const { status, description } = getCatalogPosition(product);
      
      return (
        <div className="space-y-1">
          <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
            <Package className="h-3 w-3 mr-1" />
            Catálogo
          </Badge>
          {status !== 'unknown' && (
            <div className="text-xs space-y-1">
              {getCatalogPositionBadge(product)}
              
              {/* Preço para ganhar */}
              {product.catalog_price_to_win && (
                <div className="text-xs text-blue-600 font-medium">
                  💰 Preço vencedor R$ {product.catalog_price_to_win.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
              )}
              
              {/* Visibilidade */}
              {product.catalog_visit_share && (
                <div className={`text-xs font-medium ${
                  product.catalog_visit_share === 'maximum' ? 'text-green-600' :
                  product.catalog_visit_share === 'medium' ? 'text-yellow-600' :
                  product.catalog_visit_share === 'minimum' ? 'text-red-600' :
                  'text-purple-600'
                }`}>
                  👁️ {
                    product.catalog_visit_share === 'maximum' ? 'Máxima' :
                    product.catalog_visit_share === 'medium' ? 'Média' :
                    product.catalog_visit_share === 'minimum' ? 'Mínima' :
                    product.catalog_visit_share
                  } visibilidade
                </div>
              )}
            </div>
          )}
        </div>
      );
    }
    return (
      <Badge variant="outline" className="text-gray-500">
        <Package className="h-3 w-3 mr-1" />
        Normal
      </Badge>
    );
  };

  const handleSyncAnnouncements = async () => {
    setIsLoading(true);
    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const token = localStorage.getItem('auth_token');
      
      const response = await fetch(`${API_BASE_URL}/api/mercado-livre/sync-announcements`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Erro ao sincronizar anúncios');
      }

      const result = await response.json();
      
      toast({
        title: "Sincronização Concluída!",
        description: `${result.message} ${result.synced} novos anúncios sincronizados, ${result.updated} anúncios atualizados. Total encontrado: ${result.total_found}`,
      });

      // Recarregar a lista de produtos após sincronização
      await loadProducts(1, true);
      
    } catch (error) {
      console.error('Erro ao sincronizar anúncios:', error);
      toast({
        title: "Erro na Sincronização",
        description: error instanceof Error ? error.message : "Erro ao sincronizar anúncios",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadCatalogCompetitors = async (productId: string, fromDb: boolean = false) => {
    console.log('loadCatalogCompetitors chamada com:', { productId, fromDb });
    setLoadingCompetitors(true);
    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const token = localStorage.getItem('auth_token');
      
      const endpoint = fromDb 
        ? `${API_BASE_URL}/api/mercado-livre/catalog-competitors/db/${productId}`
        : `${API_BASE_URL}/api/mercado-livre/catalog-competitors/${productId}`;
      
      console.log('Fazendo requisição para:', endpoint);
      
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const competitors = await response.json();
        console.log('=== CONCORRENTES CARREGADOS ===');
        console.log('Quantidade:', competitors.length);
        console.log('Dados:', competitors);
        setCatalogCompetitors(competitors);
      } else {
        const errorData = await response.json();
        console.error('=== ERRO AO CARREGAR CONCORRENTES ===');
        console.error('Status:', response.status);
        console.error('Erro:', errorData);
        setCatalogCompetitors([]);
      }
    } catch (error) {
      console.error('=== ERRO AO CARREGAR CONCORRENTES ===');
      console.error('Erro:', error);
      setCatalogCompetitors([]);
    } finally {
      console.log('=== FINALIZANDO CARREGAMENTO ===');
      setLoadingCompetitors(false);
    }
  };

  const syncCatalogCompetitors = async (productId: string) => {
    console.log('Iniciando sincronização para produto:', productId);
    setLoadingCompetitors(true);
    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const token = localStorage.getItem('auth_token');
      
      console.log('Fazendo requisição para:', `${API_BASE_URL}/api/mercado-livre/catalog-competitors/sync/${productId}`);
      
      const response = await fetch(`${API_BASE_URL}/api/mercado-livre/catalog-competitors/sync/${productId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        console.log('=== SINCRONIZAÇÃO CONCLUÍDA ===');
        console.log('Resultado:', result);
        
        toast({
          title: "Sincronização Concluída",
          description: `Sincronizados: ${result.synced}, Removidos: ${result.removed}, Total atual: ${result.total_current}`,
        });
        
                        // Recarregar concorrentes do banco
                        console.log('=== RECARREGANDO CONCORRENTES DO BANCO ===');
                        console.log('Produto ID:', productId);
                        console.log('Chamando loadCatalogCompetitors com fromDb=true');
                        await loadCatalogCompetitors(productId, true);
      } else {
        const errorData = await response.json();
        console.error('=== ERRO AO SINCRONIZAR ===');
        console.error('Status:', response.status);
        console.error('Erro:', errorData);
        toast({
          title: "Erro",
          description: "Erro ao sincronizar concorrentes",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('=== ERRO CATCH ===');
      console.error('Erro ao sincronizar concorrentes:', error);
      toast({
        title: "Erro",
        description: "Erro ao sincronizar concorrentes",
        variant: "destructive",
      });
    } finally {
      console.log('=== FINALIZANDO SINCRONIZAÇÃO ===');
      setLoadingCompetitors(false);
    }
  };

  const saveManualUrl = async (itemId: string, url: string) => {
    setSavingUrl(true);
    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const token = localStorage.getItem('auth_token');
      
      const response = await fetch(`${API_BASE_URL}/api/mercado-livre/catalog-competitors/${itemId}/manual-url`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ manual_url: url })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('URL manual salva:', result);
        
        toast({
          title: "URL Salva",
          description: "URL manual do anúncio foi salva com sucesso!",
        });
        
        // Atualizar os dados locais
        if (selectedItemDetails) {
          setSelectedItemDetails({
            ...selectedItemDetails,
            manual_url: url
          });
        }
      } else {
        const errorData = await response.json();
        console.error('Erro ao salvar URL manual:', errorData);
        toast({
          title: "Erro",
          description: "Erro ao salvar URL manual",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Erro ao salvar URL manual:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar URL manual",
        variant: "destructive",
      });
    } finally {
      setSavingUrl(false);
    }
  };


  const loadItemDetails = async (itemId: string, competitorData?: any) => {
    setLoadingItemDetails(true);
    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const token = localStorage.getItem('auth_token');
      
      const response = await fetch(`${API_BASE_URL}/api/mercado-livre/item-details/${itemId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const itemDetails = await response.json();
        setSelectedItemDetails(itemDetails);
        setManualUrl(itemDetails.manual_url || '');
        setShowItemDetailsModal(true);
      } else {
        // Se não conseguir acessar os detalhes completos, mostrar informações básicas disponíveis
        if (competitorData) {
          const basicInfo = {
            id: itemId,
            title: `Anúncio ${itemId}`,
            price: competitorData.price,
            condition: competitorData.condition || 'Não disponível',
            status: 'Informações limitadas',
            available_quantity: 'Não disponível',
            sold_quantity: competitorData.sold_quantity || 0,
            seller_id: competitorData.seller?.seller_id,
            seller_reputation: competitorData.seller?.reputation_level_id ? {
              level_id: competitorData.seller.reputation_level_id,
              power_seller_status: competitorData.seller.power_seller_status,
              transactions: competitorData.seller.transactions
            } : null,
            shipping: competitorData.shipping ? {
              mode: competitorData.shipping.mode,
              logistic_type: competitorData.shipping.logistic_type,
              free_shipping: competitorData.shipping.free_shipping,
              tags: competitorData.shipping.tags
            } : null,
            date_created: 'Não disponível',
            last_updated: 'Não disponível',
            limited_access: true
          };
          
          setSelectedItemDetails(basicInfo);
          setManualUrl(competitorData.manual_url || '');
          setShowItemDetailsModal(true);
        } else {
          const errorData = await response.json();
          console.error('Erro ao carregar detalhes do item:', errorData);
          
          let errorMessage = "Não foi possível carregar os detalhes do anúncio";
          
          if (response.status === 403) {
            errorMessage = "Este anúncio não está disponível publicamente ou você não tem permissão para acessá-lo";
          } else if (response.status === 404) {
            errorMessage = "Anúncio não encontrado no Mercado Livre";
          } else if (errorData.detail) {
            errorMessage = errorData.detail;
          }
          
          toast({
            title: "Anúncio Não Disponível",
            description: errorMessage,
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error('Erro ao carregar detalhes do item:', error);
      toast({
        title: "Erro",
        description: "Erro ao buscar detalhes do anúncio",
        variant: "destructive",
      });
    } finally {
      setLoadingItemDetails(false);
    }
  };

  const handleCreateProduct = async () => {
    setIsCreating(true);
    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${API_BASE_URL}/api/mercado-livre/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(productForm)
      });

      if (response.ok) {
        toast({
          title: "Sucesso!",
          description: "Produto criado com sucesso!",
        });
        setShowCreateForm(false);
        setProductForm({
          title: "",
          price: 0,
          available_quantity: 1,
          condition: "new",
          description: "",
          category_id: "",
          pictures: [],
          attributes: []
        });
        loadProducts(currentPage);
      } else {
        const error = await response.json();
        toast({
          title: "Erro",
          description: error.detail || "Erro ao criar produto",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Erro ao criar produto:', error);
      toast({
        title: "Erro",
        description: "Erro ao criar produto",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateProduct = async (productId: string) => {
    setIsCreating(true);
    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${API_BASE_URL}/api/mercado-livre/products/${productId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(productForm)
      });

      if (response.ok) {
        toast({
          title: "Sucesso!",
          description: "Produto atualizado com sucesso!",
        });
        setShowEditForm(false);
        setSelectedProduct(null);
        loadProducts(currentPage);
      } else {
        const error = await response.json();
        toast({
          title: "Erro",
          description: error.detail || "Erro ao atualizar produto",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Erro ao atualizar produto:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar produto",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${API_BASE_URL}/api/mercado-livre/products/${productId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (response.ok) {
        toast({
          title: "Sucesso!",
          description: "Produto excluído com sucesso!",
        });
        loadProducts(currentPage);
      } else {
        const error = await response.json();
        toast({
          title: "Erro",
          description: error.detail || "Erro ao excluir produto",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Erro ao excluir produto:', error);
      toast({
        title: "Erro",
        description: "Erro ao excluir produto",
        variant: "destructive",
      });
    }
  };


  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">Ativo</Badge>;
      case 'paused':
        return <Badge className="bg-yellow-100 text-yellow-800">Pausado</Badge>;
      case 'closed':
        return <Badge className="bg-red-100 text-red-800">Fechado</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Anúncios
          </h1>
          <p className="text-muted-foreground mt-2">
            Gerencie seus anúncios cadastrados no Mercado Livre
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowCreateForm(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Novo Anúncio
          </Button>
          <Button 
            onClick={handleSyncAnnouncements} 
            disabled={isLoading}
            variant="outline" 
            className="gap-2"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Sincronizar Anúncios
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="anuncios" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Lista de Anúncios
          </TabsTrigger>
          <TabsTrigger value="visao-geral" className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            Visão Geral
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Lista de Anúncios */}
        <TabsContent value="anuncios" className="space-y-6">

      {/* Search and Filters */}
      <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Buscar Anúncios
            </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Buscar por título do anúncio..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={() => loadProducts(1, fullFilter !== 'all' || catalogFilter !== 'all' || statusFilter !== 'all')} variant="outline" className="gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Atualizar
                </Button>
                <Button 
                  onClick={() => {
                    setFullFilter('all');
                    setCatalogFilter('all');
                    setStatusFilter('all');
                    setSearchTerm('');
                    loadProducts(1, false);
                  }} 
                  variant="outline" 
                  className="gap-2"
                >
                  <Search className="h-4 w-4" />
                  Limpar Filtros
                </Button>
              </div>
            </div>
            
            {/* Filtros */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Filtro Full */}
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium">Full:</Label>
                <Select value={fullFilter} onValueChange={(value: 'all' | 'full' | 'no-full') => setFullFilter(value)}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Selecionar filtro" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        Todos
                      </div>
                    </SelectItem>
                    <SelectItem value="full">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-blue-600" />
                        Com Full
                      </div>
                    </SelectItem>
                    <SelectItem value="no-full">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-gray-500" />
                        Sem Full
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Filtro Catálogo */}
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium">Catálogo:</Label>
                <Select value={catalogFilter} onValueChange={(value: 'all' | 'catalog' | 'normal') => setCatalogFilter(value)}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Selecionar filtro" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        Todos
                      </div>
                    </SelectItem>
                    <SelectItem value="catalog">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-green-600" />
                        Catálogo
                      </div>
                    </SelectItem>
                    <SelectItem value="normal">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-gray-500" />
                        Normal
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Filtro Status */}
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium">Status:</Label>
                <Select value={statusFilter} onValueChange={(value: 'all' | 'active' | 'paused' | 'closed') => setStatusFilter(value)}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Selecionar filtro" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        Todos
                      </div>
                    </SelectItem>
                    <SelectItem value="active">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        Ativo
                      </div>
                    </SelectItem>
                    <SelectItem value="paused">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-yellow-600" />
                        Pausado
                      </div>
                    </SelectItem>
                    <SelectItem value="closed">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                        Fechado
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
              
            </div>
        </CardContent>
      </Card>

          {/* Products List */}
          <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Meus Anúncios ({filteredProducts.length} de {totalProducts})
                </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : filteredProducts.length === 0 ? (
                    <div className="text-center py-8">
                      <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2">Nenhum anúncio encontrado</h3>
                      <p className="text-muted-foreground mb-4">
                        {searchTerm ? "Tente ajustar sua busca" : "Comece criando seu primeiro anúncio"}
                      </p>
                      {!searchTerm && (
                        <Button onClick={() => setShowCreateForm(true)}>
                          <Plus className="h-4 w-4 mr-2" />
                          Criar Anúncio
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Results Summary */}
                      <div className="text-sm text-muted-foreground">
                        Mostrando {filteredProducts.length} anúncios filtrados
                      </div>

                      {/* Table */}
                      <div className="border rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead 
                                className="cursor-pointer hover:bg-gray-50"
                                onClick={() => handleSort('thumbnail')}
                              >
                                <div className="flex items-center gap-2">
                                  Imagem
                                  {getSortIcon('thumbnail')}
                                </div>
                              </TableHead>
                              <TableHead 
                                className="cursor-pointer hover:bg-gray-50"
                                onClick={() => handleSort('title')}
                              >
                                <div className="flex items-center gap-2">
                                  Anúncio
                                  {getSortIcon('title')}
                                </div>
                              </TableHead>
                              <TableHead 
                                className="cursor-pointer hover:bg-gray-50"
                                onClick={() => handleSort('price')}
                              >
                                <div className="flex items-center gap-2">
                                  Preço
                                  {getSortIcon('price')}
                                </div>
                              </TableHead>
                              <TableHead 
                                className="cursor-pointer hover:bg-gray-50"
                                onClick={() => handleSort('available_quantity')}
                              >
                                <div className="flex items-center gap-2">
                                  Estoque
                                  {getSortIcon('available_quantity')}
                                </div>
                              </TableHead>
                              <TableHead 
                                className="cursor-pointer hover:bg-gray-50"
                                onClick={() => handleSort('sold_quantity')}
                              >
                                <div className="flex items-center gap-2">
                                  Vendidos
                                  {getSortIcon('sold_quantity')}
                                </div>
                              </TableHead>
                              <TableHead 
                                className="cursor-pointer hover:bg-gray-50"
                                onClick={() => handleSort('status')}
                              >
                                <div className="flex items-center gap-2">
                                  Status
                                  {getSortIcon('status')}
                                </div>
                              </TableHead>
                              <TableHead 
                                className="cursor-pointer hover:bg-gray-50"
                                onClick={() => handleSort('catalog_listing')}
                              >
                                <div className="flex items-center gap-2">
                                  Catálogo
                                  {getSortIcon('catalog_listing')}
                                </div>
                              </TableHead>
                              <TableHead>Ações</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredProducts.map((product) => (
                              <TableRow key={product.id}>
                                <TableCell>
                                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100">
                                    {product.thumbnail ? (
                                      <img
                                        src={product.thumbnail}
                                        alt={product.title}
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center">
                                        <Package className="h-6 w-6 text-gray-400" />
                                      </div>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="max-w-xs">
                                    <p className="font-medium text-sm line-clamp-2">{product.title}</p>
                                    <p className="text-xs text-muted-foreground mt-1">ID: {product.id}</p>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {getPriceDisplay(product)}
                                </TableCell>
                                <TableCell>
                                  <div className="text-center">
                                    <div className="font-medium">{product.available_quantity}</div>
                                    <div className="text-xs text-muted-foreground">disponível</div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="text-center">
                                    <div className="font-medium text-green-600">{product.sold_quantity}</div>
                                    <div className="text-xs text-muted-foreground">vendidos</div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {getStatusBadge(product.status)}
                                </TableCell>
                                <TableCell>
                                  {getCatalogBadge(product)}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        setSelectedProduct(product);
                                        setShowDetailsModal(true);
                                      }}
                                      title="Ver detalhes do anúncio"
                                    >
                                      <Eye className="h-3 w-3" />
                                    </Button>
                                    {isCatalogProduct(product) && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                          setSelectedProduct(product);
                                          setShowCatalogAnalysisModal(true);
                                          if (product.catalog_product_id) {
                                            loadCatalogCompetitors(product.catalog_product_id);
                                          }
                                        }}
                                        title="Análise completa do catálogo"
                                        className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
                                      >
                                        <Search className="h-3 w-3" />
                                      </Button>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Visão Geral */}
        <TabsContent value="visao-geral" className="space-y-6">
          {/* Estatísticas em Cards Agrupadas */}
          <div className="space-y-6">
            {/* Grupo 1: Visão Geral */}
            <div>
              <h3 className="text-lg font-semibold mb-3 text-gray-700">📊 Visão Geral</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{totalProducts}</div>
                      <div className="text-sm text-gray-600">Total de Anúncios</div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{products.filter(p => p.status === 'active').length}</div>
                      <div className="text-sm text-gray-600">Anúncios Ativos</div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">{products.filter(p => p.status === 'paused').length}</div>
                      <div className="text-sm text-gray-600">Anúncios Pausados</div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">{products.filter(p => p.status === 'closed').length}</div>
                      <div className="text-sm text-gray-600">Anúncios Fechados</div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">{products.filter(p => isCatalogProduct(p)).length}</div>
                      <div className="text-sm text-gray-600">Produtos de Catálogo</div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-600">{products.filter(p => !isCatalogProduct(p)).length}</div>
                      <div className="text-sm text-gray-600">Produtos Normais</div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-indigo-600">{products.filter(p => isOnSale(p)).length}</div>
                      <div className="text-sm text-gray-600">Em Promoção</div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Grupo 2: Mercado Livre Full */}
            <div>
              <h3 className="text-lg font-semibold mb-3 text-gray-700">🚚 Mercado Livre Full</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{products.filter(p => hasFullSales(p)).length}</div>
                      <div className="text-sm text-gray-600">Com Full</div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">{products.filter(p => !hasFullSales(p)).length}</div>
                      <div className="text-sm text-gray-600">Sem Full</div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-400">-</div>
                      <div className="text-sm text-gray-600">Taxa Full</div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-400">-</div>
                      <div className="text-sm text-gray-600">Vendas Full</div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-400">-</div>
                      <div className="text-sm text-gray-600">Receita Full</div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-400">-</div>
                      <div className="text-sm text-gray-600">Performance</div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-400">-</div>
                      <div className="text-sm text-gray-600">Ranking</div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Grupo 3: Competição no Catálogo */}
            <div>
              <h3 className="text-lg font-semibold mb-3 text-gray-700">🏆 Competição no Catálogo</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{products.filter(p => getCatalogPosition(p).status === 'winning').length}</div>
                      <div className="text-sm text-gray-600">Ganhando</div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{products.filter(p => getCatalogPosition(p).status === 'sharing_first_place').length}</div>
                      <div className="text-sm text-gray-600">Compartilhando 1º</div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-600">{products.filter(p => getCatalogPosition(p).status === 'competing').length}</div>
                      <div className="text-sm text-gray-600">Competindo</div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-600">{products.filter(p => getCatalogPosition(p).status === 'listed').length}</div>
                      <div className="text-sm text-gray-600">Listado</div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-400">-</div>
                      <div className="text-sm text-gray-600">Preço para Vencer</div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-400">-</div>
                      <div className="text-sm text-gray-600">Concorrentes</div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-400">-</div>
                      <div className="text-sm text-gray-600">Participação</div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Create Product Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <CardHeader>
                  <CardTitle>Criar Novo Anúncio</CardTitle>
                  <CardDescription>
                    Preencha as informações do anúncio para publicar no Mercado Livre
                  </CardDescription>
                </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">Título do Anúncio</Label>
                <Input
                  id="title"
                  value={productForm.title}
                  onChange={(e) => setProductForm({ ...productForm, title: e.target.value })}
                  placeholder="Ex: Smartphone Samsung Galaxy S21 - Novo"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="price">Preço (R$)</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    value={productForm.price}
                    onChange={(e) => setProductForm({ ...productForm, price: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="quantity">Quantidade</Label>
                  <Input
                    id="quantity"
                    type="number"
                    value={productForm.available_quantity}
                    onChange={(e) => setProductForm({ ...productForm, available_quantity: parseInt(e.target.value) || 1 })}
                    placeholder="1"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="condition">Condição</Label>
                <select
                  id="condition"
                  className="w-full p-2 border rounded-md"
                  value={productForm.condition}
                  onChange={(e) => setProductForm({ ...productForm, condition: e.target.value })}
                >
                  <option value="new">Novo</option>
                  <option value="used">Usado</option>
                </select>
              </div>

              <div>
                <Label htmlFor="description">Descrição</Label>
                <textarea
                  id="description"
                  className="w-full p-2 border rounded-md h-24"
                  value={productForm.description}
                  onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                  placeholder="Descreva o produto..."
                />
              </div>

              <div>
                <Label htmlFor="category">Categoria</Label>
                <Input
                  id="category"
                  value={productForm.category_id}
                  onChange={(e) => setProductForm({ ...productForm, category_id: e.target.value })}
                  placeholder="Ex: MLB1055 (Celulares e Telefones)"
                />
              </div>

              <div className="flex gap-2 pt-4">
                    <Button onClick={handleCreateProduct} disabled={isCreating} className="flex-1">
                      {isCreating ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Criando...
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-2" />
                          Criar Anúncio
                        </>
                      )}
                    </Button>
                <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Edit Product Modal */}
      {showEditForm && selectedProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <CardHeader>
                  <CardTitle>Editar Anúncio</CardTitle>
                  <CardDescription>
                    Atualize as informações do anúncio
                  </CardDescription>
                </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="edit-title">Título do Anúncio</Label>
                <Input
                  id="edit-title"
                  value={productForm.title}
                  onChange={(e) => setProductForm({ ...productForm, title: e.target.value })}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-price">Preço (R$)</Label>
                  <Input
                    id="edit-price"
                    type="number"
                    step="0.01"
                    value={productForm.price}
                    onChange={(e) => setProductForm({ ...productForm, price: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-quantity">Quantidade</Label>
                  <Input
                    id="edit-quantity"
                    type="number"
                    value={productForm.available_quantity}
                    onChange={(e) => setProductForm({ ...productForm, available_quantity: parseInt(e.target.value) || 1 })}
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                    <Button onClick={() => handleUpdateProduct(selectedProduct.id)} disabled={isCreating} className="flex-1">
                      {isCreating ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Atualizando...
                        </>
                      ) : (
                        <>
                          <Edit className="h-4 w-4 mr-2" />
                          Atualizar Anúncio
                        </>
                      )}
                    </Button>
                <Button variant="outline" onClick={() => {
                  setShowEditForm(false);
                  setSelectedProduct(null);
                }}>
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Product Details Modal */}
      {showDetailsModal && selectedProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Detalhes Completos do Anúncio
                  </CardTitle>
                  <CardDescription>
                    Informações detalhadas do anúncio no Mercado Livre
                  </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="basicas" className="w-full">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="basicas">Básicas</TabsTrigger>
                  <TabsTrigger value="tecnicas">Técnicas</TabsTrigger>
                  <TabsTrigger value="atributos">Atributos</TabsTrigger>
                  <TabsTrigger value="datas">Datas</TabsTrigger>
                  <TabsTrigger value="links">Links</TabsTrigger>
                </TabsList>
                
                <TabsContent value="basicas" className="space-y-6 mt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Coluna Esquerda - Informações Principais */}
                    <div className="space-y-6">
                      <div>
                        <Label className="text-sm font-medium text-gray-500">ID do Anúncio</Label>
                        <p className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">{selectedProduct.id}</p>
                      </div>
                      
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Título</Label>
                        <p className="text-sm font-medium leading-relaxed">{selectedProduct.title}</p>
                      </div>
                      
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Preço</Label>
                        <div className="mt-1">
                          {isOnSale(selectedProduct) ? (
                            <div>
                              {(() => {
                                const salePriceInfo = (selectedProduct as any).sale_price_info;
                                let currentPrice = selectedProduct.price;
                                let originalPrice = selectedProduct.original_price || selectedProduct.base_price || selectedProduct.price;
                                
                                // Usar informações da nova API de preços se disponível
                                if (salePriceInfo && salePriceInfo.regular_amount && salePriceInfo.amount) {
                                  currentPrice = salePriceInfo.amount;
                                  originalPrice = salePriceInfo.regular_amount;
                                } else {
                                  // Fallback para API antiga
                                  if (!selectedProduct.original_price && selectedProduct.base_price && selectedProduct.base_price !== selectedProduct.price) {
                                    originalPrice = selectedProduct.base_price;
                                  }
                                }
                                
                                const discount = originalPrice > currentPrice ? 
                                  Math.round(((originalPrice - currentPrice) / originalPrice) * 100) : 0;
                                
                                return (
                                  <>
                                    <p className="text-lg font-bold text-red-600">
                                      R$ {currentPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </p>
                                    {originalPrice > currentPrice && (
                                      <p className="text-sm text-gray-500 line-through">
                                        R$ {originalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                      </p>
                                    )}
                                    {discount > 0 && (
                                      <p className="text-sm text-red-600 font-medium">
                                        -{discount}%
                                      </p>
                                    )}
                                  </>
                                );
                              })()}
                            </div>
                          ) : (
                            <p className="text-lg font-bold text-green-600">
                              R$ {selectedProduct.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                          )}
                        </div>
                      </div>
                      
          <div>
            <Label className="text-sm font-medium text-gray-500">Status</Label>
            <div className="mt-1">{getStatusBadge(selectedProduct.status)}</div>
          </div>
          
        </div>
                    
                    {/* Coluna Direita - Estatísticas e Posicionamento */}
                    <div className="space-y-6">
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Estoque</Label>
                        <p className="text-sm">{selectedProduct.available_quantity} unidades</p>
                      </div>
                      
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Vendidos</Label>
                        <p className="text-sm">{selectedProduct.sold_quantity} unidades</p>
                      </div>
                      
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Vendas no Full</Label>
                        <div className="mt-1">{getFullSalesBadge(selectedProduct)}</div>
                      </div>
                      
                      
                    </div>
                  </div>
                  
                  {/* Seção de Posição no Catálogo - Largura Total */}
                  {selectedProduct.catalog_listing && selectedProduct.catalog_position_info && (
                    <div className="mt-8 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                      <h4 className="text-lg font-semibold text-blue-900 mb-4">🏆 Posição no Catálogo</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600 mb-1">
                            {getCatalogPositionBadge(selectedProduct)}
                          </div>
                          <p className="text-sm text-gray-600">Posição Atual</p>
                        </div>
                        
                        <div className="text-center">
                          <div className="text-lg font-semibold text-green-600 mb-1">
                            👁️ {selectedProduct.catalog_visit_share || 'N/A'}
                          </div>
                          <p className="text-sm text-gray-600">Visibilidade</p>
                        </div>
                        
                        <div className="text-center">
                          <div className="text-lg font-semibold text-purple-600 mb-1">
                            💰 R$ {selectedProduct.catalog_price_to_win?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || 'N/A'}
                          </div>
                          <p className="text-sm text-gray-600">Preço para Ganhar</p>
                        </div>
                      </div>
                      
                      {selectedProduct.catalog_competitors_sharing > 0 && (
                        <div className="mt-4 text-center">
                          <p className="text-sm text-gray-600">
                            Compartilhando com: <span className="font-semibold">{selectedProduct.catalog_competitors_sharing} vendedor(es)</span>
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Seção de Custos - Largura Total da Modal */}
                  {((selectedProduct.listing_fee_amount && selectedProduct.listing_fee_amount > 0) || (selectedProduct.sale_fee_amount && selectedProduct.sale_fee_amount > 0) || (selectedProduct.total_cost && selectedProduct.total_cost > 0)) && (
                    <div className="mt-8 grid grid-cols-12 gap-4">
                      {/* Card de Custos */}
                      <div className="col-span-12 lg:col-span-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                        <h4 className="text-sm font-semibold text-green-900 mb-3">💰 Custos do Anúncio</h4>
                      
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Tipo de Listagem:</span>
                            <span className="text-sm font-medium text-blue-600">
                              {selectedProduct.listing_type_name || selectedProduct.listing_type_id || 'N/A'}
                            </span>
                          </div>
                          
                          {selectedProduct.listing_fee_amount && selectedProduct.listing_fee_amount > 0 && (
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-600">Custo de Listagem:</span>
                              <span className="text-sm font-medium text-orange-600">
                                R$ {selectedProduct.listing_fee_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                          )}
                          
                          {selectedProduct.sale_fee_percentage && selectedProduct.price && (
                            <div className="space-y-1">
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">Comissão Percentual:</span>
                                <span className="text-sm font-medium text-purple-600">
                                  R$ {selectedProduct.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} × {selectedProduct.sale_fee_percentage}% = R$ {((selectedProduct.price * selectedProduct.sale_fee_percentage) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                              {selectedProduct.sale_fee_fixed && selectedProduct.sale_fee_fixed > 0 && (
                                <div className="flex justify-between items-center">
                                  <span className="text-sm text-gray-600">Taxa Fixa:</span>
                                  <span className="text-sm font-medium text-red-600">
                                    R$ {selectedProduct.sale_fee_fixed.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                  </span>
                                </div>
                              )}
                              <div className="flex justify-between items-center border-t border-green-200 pt-1">
                                <span className="text-sm font-semibold text-gray-700">Total Comissão:</span>
                                <span className="text-sm font-bold text-purple-600">
                                  R$ {selectedProduct.sale_fee_amount?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                                </span>
                              </div>
                            </div>
                          )}
                          
                          {selectedProduct.sale_fee_percentage && (
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-600">Percentual de Comissão:</span>
                              <span className="text-sm font-medium text-purple-600">
                                {selectedProduct.sale_fee_percentage}%
                              </span>
                            </div>
                          )}
                          
                          <div className="border-t border-green-200 pt-2">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-semibold text-gray-700">Custo Total:</span>
                              <span className="text-sm font-bold text-red-600">
                                R$ {selectedProduct.total_cost?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                              </span>
                            </div>
                          </div>
                          
                          {/* Informações Adicionais */}
                          {selectedProduct.free_relist && (
                            <div className="mt-3 pt-2 border-t border-green-200">
                              <div className="flex justify-between items-center text-xs text-green-600">
                                <span>Relistagem Grátis:</span>
                                <span>Sim</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Gráfico de Pizza - Distribuição de Custos */}
                      <div className="col-span-12 lg:col-span-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                        <h4 className="text-sm font-semibold text-blue-900 mb-3">📊 Distribuição de Custos</h4>
                        <div className="h-64">
                          {(() => {
                            const price = selectedProduct.price || 0;
                            const totalCost = selectedProduct.total_cost || 0;
                            const profit = price - totalCost;
                            
                            const data = [
                              { name: "Lucro", value: profit, color: "#10b981" },
                              { name: "Custos", value: totalCost, color: "#ef4444" }
                            ].filter(item => item.value > 0);
                            
                            if (data.length === 0) return (
                              <div className="flex items-center justify-center h-full text-gray-500">
                                <p className="text-sm">Sem dados de custos</p>
                              </div>
                            );
                            
                            return (
                              <div className="space-y-2">
                                <div className="text-center">
                                  <p className="text-lg font-bold text-gray-800">
                                    R$ {price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                  </p>
                                  <p className="text-xs text-gray-600">Preço de Venda</p>
                                </div>
                                
                                <div className="flex justify-center">
                                  <div className="w-40 h-40 relative">
                                    <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                                      {data.map((item, index) => {
                                        const percentage = (item.value / price) * 100;
                                        const circumference = 2 * Math.PI * 40;
                                        const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;
                                        const strokeDashoffset = index === 0 ? 0 : -((data[0].value / price) * circumference);
                                        
                                        return (
                                          <circle
                                            key={item.name}
                                            cx="50"
                                            cy="50"
                                            r="40"
                                            fill="none"
                                            stroke={item.color}
                                            strokeWidth="8"
                                            strokeDasharray={strokeDasharray}
                                            strokeDashoffset={strokeDashoffset}
                                            className="transition-all duration-300"
                                          />
                                        );
                                      })}
                                    </svg>
                                  </div>
                                </div>
                                
                                <div className="space-y-1">
                                  {data.map((item) => {
                                    const percentage = ((item.value / price) * 100).toFixed(1);
                                    return (
                                      <div key={item.name} className="flex justify-between items-center text-xs">
                                        <div className="flex items-center gap-2">
                                          <div 
                                            className="w-3 h-3 rounded-full" 
                                            style={{ backgroundColor: item.color }}
                                          />
                                          <span className="text-gray-600">{item.name}</span>
                                        </div>
                                        <div className="text-right">
                                          <span className="font-medium">R$ {item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                          <span className="text-gray-500 ml-1">({percentage}%)</span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="tecnicas" className="space-y-4 mt-6">
                  <h3 className="text-lg font-semibold">Informações Técnicas</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Categoria</Label>
                      <p className="text-sm">{selectedProduct.category_id}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Condição</Label>
                      <p className="text-sm capitalize">{selectedProduct.condition}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Moeda</Label>
                      <p className="text-sm">{selectedProduct.currency_id}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Domínio</Label>
                      <p className="text-sm">{selectedProduct.domain_id || 'N/A'}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">ID do Catálogo</Label>
                      <p className="text-sm">{selectedProduct.catalog_product_id || 'N/A'}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Listagem de Catálogo</Label>
                      <p className="text-sm">{selectedProduct.catalog_listing ? 'Sim' : 'Não'}</p>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="atributos" className="space-y-4 mt-6">
                  {selectedProduct.attributes && selectedProduct.attributes.length > 0 ? (
                    <>
                      <h3 className="text-lg font-semibold">Atributos do Produto</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {selectedProduct.attributes.map((attr, index) => (
                          <div key={index} className="flex justify-between border-b pb-2">
                            <span className="text-sm font-medium text-gray-500">{attr.name}:</span>
                            <span className="text-sm">{attr.value_name}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="text-gray-500">Nenhum atributo disponível</p>
                  )}
                  
                  {selectedProduct.tags && selectedProduct.tags.length > 0 && (
                    <>
                      <h3 className="text-lg font-semibold mt-6">Tags</h3>
                      <div className="flex flex-wrap gap-2">
                        {selectedProduct.tags.map((tag, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </>
                  )}
                </TabsContent>
                
                <TabsContent value="datas" className="space-y-4 mt-6">
                  <h3 className="text-lg font-semibold">Informações de Data</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Data de Criação</Label>
                      <p className="text-sm">
                        {new Date(selectedProduct.date_created).toLocaleString('pt-BR')}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Última Atualização</Label>
                      <p className="text-sm">
                        {new Date(selectedProduct.last_updated).toLocaleString('pt-BR')}
                      </p>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="links" className="space-y-4 mt-6">
                  <h3 className="text-lg font-semibold">Links</h3>
                  <div className="space-y-2">
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Link do Produto</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-sm text-blue-600 truncate flex-1">{selectedProduct.permalink}</p>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(selectedProduct.permalink, '_blank')}
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
            <div className="flex justify-end p-6 pt-0">
              <Button variant="outline" onClick={() => {
                setShowDetailsModal(false);
                setSelectedProduct(null);
              }}>
                Fechar
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Modal de Análise do Catálogo */}
      {showCatalogAnalysisModal && selectedProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Análise Completa do Catálogo
              </CardTitle>
              <CardDescription>
                Análise detalhada do produto no catálogo do Mercado Livre
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Informações Básicas do Produto */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">📦 Informações do Produto</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Título</Label>
                      <p className="text-sm font-medium">{selectedProduct.title}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">ID do Anúncio</Label>
                      <p className="text-sm font-mono">{selectedProduct.id}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">ID do Produto de Catálogo</Label>
                      <p className="text-sm font-mono">{selectedProduct.catalog_product_id || 'N/A'}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Família do Produto</Label>
                      <p className="text-sm">{selectedProduct.family_name || 'N/A'}</p>
                    </div>
                  </CardContent>
                </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">💰 Análise de Preços</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Seu Anúncio */}
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <h4 className="font-semibold text-blue-800 mb-3">📊 Seu Anúncio</h4>
                        <div className="space-y-2">
                          <div>
                            <Label className="text-sm font-medium text-gray-500">Preço Atual</Label>
                            <p className="text-lg font-bold text-green-600">
                              R$ {selectedProduct.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                          {selectedProduct.original_price && selectedProduct.original_price !== selectedProduct.price && (
                            <div>
                              <Label className="text-sm font-medium text-gray-500">Preço Original</Label>
                              <p className="text-sm text-gray-500 line-through">
                                R$ {selectedProduct.original_price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>


                      {/* Preço para vencer */}
                      {selectedProduct.catalog_price_to_win && (
                        <div className="bg-purple-50 p-4 rounded-lg">
                          <h4 className="font-semibold text-purple-800 mb-2">🎯 Preço para Vencer</h4>
                          <p className="text-lg font-bold text-purple-600">
                            R$ {selectedProduct.catalog_price_to_win.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                          <p className="text-sm text-purple-600 mt-1">
                            Preço sugerido pelo Mercado Livre para vencer a competição
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
              </div>



              {/* Análise de Concorrentes no Catálogo */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center justify-between">
                    <span>🏪 Análise de Concorrentes no Catálogo</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        console.log('=== BOTÃO ATUALIZAR CLICADO ===');
                        console.log('selectedProduct:', selectedProduct);
                        console.log('catalog_product_id:', selectedProduct.catalog_product_id);
                        if (selectedProduct.catalog_product_id) {
                          console.log('Chamando syncCatalogCompetitors com:', selectedProduct.catalog_product_id);
                          syncCatalogCompetitors(selectedProduct.catalog_product_id);
                        } else {
                          console.log('ERRO: Produto não possui catalog_product_id');
                          toast({
                            title: "Erro",
                            description: "Produto não possui ID do catálogo",
                            variant: "destructive",
                          });
                        }
                      }}
                      disabled={loadingCompetitors}
                    >
                      {loadingCompetitors ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Atualizando...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Atualizar
                        </>
                      )}
                    </Button>
                  </CardTitle>
                  <CardDescription>
                    Análise detalhada da competição e posicionamento no catálogo
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* Status e Posicionamento */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg">
                        <h4 className="font-semibold text-blue-800 mb-3">🎯 Seu Status no Catálogo</h4>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm">Status:</span>
                            <Badge className={
                              getCatalogPosition(selectedProduct).status === 'winning' ? 'bg-green-100 text-green-800' :
                              getCatalogPosition(selectedProduct).status === 'sharing_first_place' ? 'bg-blue-100 text-blue-800' :
                              getCatalogPosition(selectedProduct).status === 'competing' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }>
                              {getCatalogPosition(selectedProduct).status === 'winning' ? '🥇 Ganhando' :
                               getCatalogPosition(selectedProduct).status === 'sharing_first_place' ? '🥈 Compartilhando 1º' :
                               getCatalogPosition(selectedProduct).status === 'competing' ? '🥉 Competindo' : '📋 Listado'}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm">Visibilidade:</span>
                            <Badge className={
                              selectedProduct.catalog_visit_share === 'maximum' ? 'bg-green-100 text-green-800' :
                              selectedProduct.catalog_visit_share === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                              selectedProduct.catalog_visit_share === 'minimum' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }>
                              {selectedProduct.catalog_visit_share === 'maximum' ? '👁️ Máxima' :
                               selectedProduct.catalog_visit_share === 'medium' ? '👁️ Média' :
                               selectedProduct.catalog_visit_share === 'minimum' ? '👁️ Mínima' : '👁️ N/A'}
                            </Badge>
                          </div>
                          {selectedProduct.catalog_price_to_win && (
                            <div className="flex items-center justify-between">
                              <span className="text-sm">Preço para Vencer:</span>
                              <span className="font-bold text-blue-600">
                                R$ {selectedProduct.catalog_price_to_win.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-4 rounded-lg">
                        <h4 className="font-semibold text-purple-800 mb-3">📊 Estatísticas de Competição</h4>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm">Total de Concorrentes:</span>
                            <span className="font-bold text-purple-600">
                              {catalogCompetitors.length} vendedores
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm">Compartilhando 1º Lugar:</span>
                            <span className="font-bold text-red-600">
                              {selectedProduct.catalog_competitors_sharing === 0 && getCatalogPosition(selectedProduct).status === 'winning' ? (
                                <span className="text-green-600">Você está ganhando!</span>
                              ) : selectedProduct.catalog_competitors_sharing === 1 ? (
                                <span>
                                  {catalogCompetitors.find(c => c.price === Math.min(...catalogCompetitors.map(comp => comp.price || 0)))?.seller?.nickname || 'Vendedor'}
                                </span>
                              ) : (
                                `${selectedProduct.catalog_competitors_sharing || 0} vendedores`
                              )}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm">Sua Posição:</span>
                            <span className="font-bold text-orange-600">
                              {catalogCompetitors.length > 0 ? 
                                `${catalogCompetitors.filter(c => (c.price || 0) < selectedProduct.price).length + 1}º` : 
                                '1º'
                              }
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Análise de Preços dos Concorrentes */}
                    {catalogCompetitors.length > 0 && (
                      <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-lg">
                        <h4 className="font-semibold text-green-800 mb-3">💰 Análise de Preços dos Concorrentes</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="text-center">
                            <div className="text-lg font-bold text-red-600">
                              R$ {Math.min(...catalogCompetitors.map(c => c.price || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </div>
                            <div className="text-xs text-gray-600">Menor Preço</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold text-green-600">
                              R$ {Math.max(...catalogCompetitors.map(c => c.price || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </div>
                            <div className="text-xs text-gray-600">Maior Preço</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold text-yellow-600">
                              R$ {(catalogCompetitors.reduce((sum, c) => sum + (c.price || 0), 0) / catalogCompetitors.length).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </div>
                            <div className="text-xs text-gray-600">Preço Médio</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold text-blue-600">
                              R$ {selectedProduct.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </div>
                            <div className="text-xs text-gray-600">Preço do Anúncio</div>
                            {selectedProduct.original_price && selectedProduct.original_price !== selectedProduct.price && (
                              <div className="text-sm text-gray-500 line-through mt-1">
                                R$ {selectedProduct.original_price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Análise de Medalhas dos Vendedores */}
                    {catalogCompetitors.length > 0 && (
                      <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 p-4 rounded-lg">
                        <h4 className="font-semibold text-yellow-800 mb-3">🏆 Análise de Medalhas dos Vendedores</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="text-center">
                            <div className="text-lg font-bold text-yellow-600">
                              {catalogCompetitors.filter(c => c.seller?.power_seller_status === 'gold').length}
                            </div>
                            <div className="text-xs text-gray-600">Gold</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold text-gray-400">
                              {catalogCompetitors.filter(c => c.seller?.power_seller_status === 'silver').length}
                            </div>
                            <div className="text-xs text-gray-600">Silver</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold text-orange-600">
                              {catalogCompetitors.filter(c => c.seller?.power_seller_status === 'bronze').length}
                            </div>
                            <div className="text-xs text-gray-600">Bronze</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold text-gray-600">
                              {catalogCompetitors.filter(c => !c.seller?.power_seller_status).length}
                            </div>
                            <div className="text-xs text-gray-600">Sem Medalha</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Análise de Envio */}
                    {catalogCompetitors.length > 0 && (
                      <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg">
                        <h4 className="font-semibold text-blue-800 mb-3">📦 Análise de Envio dos Concorrentes</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="text-center">
                            <div className="text-lg font-bold text-green-600">
                              {catalogCompetitors.filter(c => c.shipping?.free_shipping === true).length}
                            </div>
                            <div className="text-xs text-gray-600">Frete Grátis</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold text-blue-600">
                              {catalogCompetitors.filter(c => c.shipping?.mode === 'me2').length}
                            </div>
                            <div className="text-xs text-gray-600">Mercado Envios 2</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold text-purple-600">
                              {catalogCompetitors.filter(c => c.shipping?.logistic_type === 'fulfillment').length}
                            </div>
                            <div className="text-xs text-gray-600">Mercado Envios Full</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold text-orange-600">
                              {catalogCompetitors.filter(c => c.shipping?.logistic_type === 'drop_off').length}
                            </div>
                            <div className="text-xs text-gray-600">Correio Flex</div>
                          </div>
                        </div>
                        <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="text-center">
                            <div className="text-lg font-bold text-red-600">
                              {catalogCompetitors.filter(c => c.shipping?.logistic_type === 'xd_drop_off').length}
                            </div>
                            <div className="text-xs text-gray-600">Coletas e Places</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold text-indigo-600">
                              {catalogCompetitors.filter(c => c.shipping?.logistic_type === 'self_service').length}
                            </div>
                            <div className="text-xs text-gray-600">Mercado Envios Flex</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold text-yellow-600">
                              {catalogCompetitors.filter(c => c.shipping?.logistic_type === 'cross_docking').length}
                            </div>
                            <div className="text-xs text-gray-600">Cross Docking</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold text-gray-600">
                              {catalogCompetitors.filter(c => c.shipping?.mode === 'not_specified' || c.shipping?.mode === 'custom').length}
                            </div>
                            <div className="text-xs text-gray-600">Outros/Personalizado</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Lista de Concorrentes */}
                    <div className="bg-white border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-semibold text-gray-800">🏪 Lista de Concorrentes no Catálogo</h4>
                        <Button
                          onClick={() => {
                            if (selectedProduct.catalog_product_id) {
                              loadCatalogCompetitors(selectedProduct.catalog_product_id);
                            }
                          }}
                          disabled={loadingCompetitors}
                          size="sm"
                          variant="outline"
                        >
                          {loadingCompetitors ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <RefreshCw className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      
                      {loadingCompetitors ? (
                        <div className="flex justify-center py-8">
                          <Loader2 className="h-8 w-8 animate-spin" />
                          <span className="ml-2">Carregando concorrentes...</span>
                        </div>
                      ) : catalogCompetitors.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b bg-gray-50">
                                <th className="text-left p-3 font-medium text-gray-700">Preço</th>
                                <th className="text-left p-3 font-medium text-gray-700">Vendedor</th>
                                <th className="text-left p-3 font-medium text-gray-700">Reputação</th>
                                <th className="text-left p-3 font-medium text-gray-700">Vendas</th>
                                <th className="text-left p-3 font-medium text-gray-700">Frete</th>
                                <th className="text-left p-3 font-medium text-gray-700">Tipo de Envio</th>
                                <th className="text-left p-3 font-medium text-gray-700">URL</th>
                                <th className="text-left p-3 font-medium text-gray-700">Ações</th>
                              </tr>
                            </thead>
                            <tbody>
                              {catalogCompetitors.map((competitor, index) => (
                                <tr key={competitor.item_id || index} className="border-b hover:bg-gray-50">
                                  
                                  {/* Preço */}
                                  <td className="p-3">
                                    <div className="font-bold text-green-600">
                                      R$ {competitor.price?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || 'N/A'}
                                    </div>
                                    {competitor.original_price && competitor.original_price !== competitor.price && (
                                      <div className="text-xs text-gray-500 line-through">
                                        R$ {competitor.original_price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                      </div>
                                    )}
                                  </td>
                                  
                                  {/* Vendedor */}
                                  <td className="p-3">
                                    <div className="font-medium text-gray-800">
                                      {competitor.seller?.nickname || 'Vendedor'}
                                    </div>
                                    {competitor.seller?.power_seller_status && (
                                      <div className="text-xs text-blue-600">
                                        {competitor.seller.power_seller_status}
                                      </div>
                                    )}
                                  </td>
                                  
                                  {/* Reputação */}
                                  <td className="p-3">
                                    <div className="flex items-center space-x-2">
                                      <div className={`w-3 h-3 rounded-full ${
                                        competitor.seller?.reputation_level_id === '5_green' ? 'bg-green-500' :
                                        competitor.seller?.reputation_level_id === '4_green' ? 'bg-green-400' :
                                        competitor.seller?.reputation_level_id === '3_yellow' ? 'bg-yellow-400' :
                                        competitor.seller?.reputation_level_id === '2_yellow' ? 'bg-yellow-500' :
                                        competitor.seller?.reputation_level_id === '1_red' ? 'bg-red-500' :
                                        'bg-gray-400'
                                      }`}></div>
                                      <span className="text-sm font-medium text-gray-700">
                                        {competitor.seller?.reputation_level_id?.split('_')[0] || '0'}
                                      </span>
                                    </div>
                                  </td>
                                  
                                  {/* Vendas */}
                                  <td className="p-3">
                                    {competitor.sold_quantity ? (
                                      <div className="text-xs text-green-600 font-medium">
                                        +{competitor.sold_quantity} vendas
                                      </div>
                                    ) : (
                                      <div className="text-xs text-gray-500">
                                        Sem vendas
                                      </div>
                                    )}
                                    {competitor.seller?.transactions?.total > 0 && (
                                      <div className="text-xs text-gray-500">
                                        {competitor.seller.transactions.total.toLocaleString('pt-BR')} transações
                                      </div>
                                    )}
                                  </td>
                                  
                                  
                                  {/* Frete */}
                                  <td className="p-3">
                                    <div className="text-xs">
                                      {competitor.shipping?.free_shipping ? '🚚 Frete Grátis (Vendedor paga)' : '💰 Frete Pago (Comprador paga)'}
                                    </div>
                                  </td>
                                  
                                  {/* Tipo de Envio */}
                                  <td className="p-3">
                                    <div className="text-xs text-gray-600">
                                      {competitor.shipping?.mode === 'me2' ? '📦 Mercado Envios 2' : '📮 Envio Normal'}
                                    </div>
                                    {competitor.shipping?.logistic_type && (
                                      <div className="text-xs text-blue-600">
                                        {competitor.shipping.logistic_type === 'fulfillment' ? '🏪 Mercado Envios Full' :
                                         competitor.shipping.logistic_type === 'drop_off' ? '📮 Correio Flex' :
                                         competitor.shipping.logistic_type === 'xd_drop_off' ? '🏢 Coletas e Places' :
                                         competitor.shipping.logistic_type === 'self_service' ? '⚡ Mercado Envios Flex' :
                                         competitor.shipping.logistic_type === 'cross_docking' ? '🔄 Cross Docking' :
                                         competitor.shipping.logistic_type}
                                      </div>
                                    )}
                                    {competitor.shipping?.tags && competitor.shipping.tags.length > 0 && (
                                      <div className="text-xs text-green-600">
                                        {competitor.shipping.tags.includes('fulfillment') ? '✅ Full' : ''}
                                      </div>
                                    )}
                                  </td>
                                  
                                  {/* URL */}
                                  <td className="p-3">
                                    {(competitor.manual_url || competitor.url) && (
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="text-xs p-1 h-auto"
                                        onClick={() => {
                                          const urlToOpen = competitor.manual_url || competitor.url;
                                          window.open(urlToOpen, '_blank');
                                        }}
                                      >
                                        🔗 Abrir
                                      </Button>
                                    )}
                                  </td>
                                  
                                  {/* Ações */}
                                  <td className="p-3">
                                    <div className="flex flex-col gap-1">
                                      {competitor.item_id && (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="text-xs p-1 h-auto"
                                          onClick={() => {
                                            loadItemDetails(competitor.item_id, competitor);
                                          }}
                                        >
                                          🔍 Ver Detalhes
                                        </Button>
                                      )}
                                      {competitor.seller?.seller_id && (
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="text-xs p-1 h-auto"
                                          onClick={() => {
                                            // URL para a página de produtos do vendedor no Mercado Livre
                                            const sellerUrl = `https://lista.mercadolivre.com.br/_CustId_${competitor.seller.seller_id}`;
                                            console.log('Abrindo página do vendedor:', sellerUrl);
                                            window.open(sellerUrl, '_blank');
                                          }}
                                        >
                                          🏪 Ver Loja
                                        </Button>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <Package className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                          <p>Nenhum concorrente encontrado</p>
                          <p className="text-sm">Clique em "Atualizar" para buscar concorrentes</p>
                        </div>
                      )}
                    </div>

                    {/* Link para Ver no Mercado Livre */}
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold text-blue-800">🔍 Ver Página do Produto no Mercado Livre</h4>
                          <p className="text-sm text-blue-600 mt-1">
                            Acesse a página oficial do produto para ver todos os concorrentes
                          </p>
                        </div>
                        <Button
                          onClick={() => {
                            const productUrl = `https://www.mercadolivre.com.br/p/${selectedProduct.catalog_product_id}`;
                            window.open(productUrl, '_blank');
                          }}
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Ver no ML
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>


              {/* Recomendações */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">💡 Recomendações</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {getCatalogPosition(selectedProduct).status === 'competing' && (
                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          <strong>Melhore seu preço:</strong> Considere reduzir o preço para R$ {selectedProduct.catalog_price_to_win?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} para vencer a competição.
                        </AlertDescription>
                      </Alert>
                    )}
                    {catalogCompetitors.length > 0 && (
                      <>
                        {selectedProduct.price > Math.min(...catalogCompetitors.map(c => c.price || 0)) && (
                          <Alert>
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>
                              <strong>Preço acima da concorrência:</strong> Seu preço (R$ {selectedProduct.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}) está acima do menor preço dos concorrentes (R$ {Math.min(...catalogCompetitors.map(c => c.price || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}).
                            </AlertDescription>
                          </Alert>
                        )}
                        {selectedProduct.price < Math.min(...catalogCompetitors.map(c => c.price || 0)) && (
                          <Alert>
                            <CheckCircle className="h-4 w-4" />
                            <AlertDescription>
                              <strong>Preço competitivo:</strong> Seu preço (R$ {selectedProduct.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}) está abaixo do menor preço dos concorrentes (R$ {Math.min(...catalogCompetitors.map(c => c.price || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}).
                            </AlertDescription>
                          </Alert>
                        )}
                        {selectedProduct.price > (catalogCompetitors.reduce((sum, c) => sum + (c.price || 0), 0) / catalogCompetitors.length) && (
                          <Alert>
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>
                              <strong>Preço acima da média:</strong> Seu preço está acima da média dos concorrentes (R$ {(catalogCompetitors.reduce((sum, c) => sum + (c.price || 0), 0) / catalogCompetitors.length).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}).
                            </AlertDescription>
                          </Alert>
                        )}
                      </>
                    )}
                    {!hasFullSales(selectedProduct) && (
                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          <strong>Ative o Mercado Livre Full:</strong> Produtos com Full têm maior visibilidade e chances de venda.
                        </AlertDescription>
                      </Alert>
                    )}
                    {selectedProduct.catalog_visit_share === 'minimum' && (
                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          <strong>Baixa visibilidade:</strong> Melhore suas condições de venda para aumentar a visibilidade no catálogo.
                        </AlertDescription>
                      </Alert>
                    )}
                    {getCatalogPosition(selectedProduct).status === 'winning' && (
                      <Alert>
                        <CheckCircle className="h-4 w-4" />
                        <AlertDescription>
                          <strong>Parabéns!</strong> Seu produto está ganhando no catálogo. Continue mantendo as condições competitivas.
                        </AlertDescription>
                      </Alert>
                    )}
                    {selectedProduct.catalog_competitors_sharing && selectedProduct.catalog_competitors_sharing > 0 && (
                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          <strong>Competição acirrada:</strong> Há {selectedProduct.catalog_competitors_sharing} concorrente(s) compartilhando o primeiro lugar. 
                          Monitore preços e condições para manter sua posição.
                        </AlertDescription>
                      </Alert>
                    )}
                    {getCatalogPosition(selectedProduct).status === 'sharing_first_place' && (
                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          <strong>Compartilhando o primeiro lugar:</strong> Você está dividindo a liderança com outros vendedores. 
                          Considere melhorar preço ou condições para ser o único ganhador.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </CardContent>
              </Card>
            </CardContent>
            <div className="flex justify-end p-6 pt-0">
              <Button variant="outline" onClick={() => {
                setShowCatalogAnalysisModal(false);
                setSelectedProduct(null);
              }}>
                Fechar
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Modal de Detalhes do Item */}
      {showItemDetailsModal && selectedItemDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                <span>📋 Detalhes do Anúncio</span>
                <Button variant="ghost" size="sm" onClick={() => setShowItemDetailsModal(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingItemDetails ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <span className="ml-2">Carregando detalhes...</span>
                </div>
              ) : (
                <>
                  {/* Aviso de Acesso Limitado */}
                  {selectedItemDetails.limited_access && (
                    <Alert className="mb-6">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Acesso Limitado:</strong> Este anúncio não está disponível publicamente. 
                        Mostrando apenas as informações básicas disponíveis na análise de concorrentes.
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  <Tabs defaultValue="basicas" className="w-full">
                    <TabsList className="grid w-full grid-cols-6">
                      <TabsTrigger value="basicas">Básicas</TabsTrigger>
                      <TabsTrigger value="vendedor">Vendedor</TabsTrigger>
                      <TabsTrigger value="envio">Envio</TabsTrigger>
                      <TabsTrigger value="atributos">Atributos</TabsTrigger>
                      <TabsTrigger value="imagens">Imagens</TabsTrigger>
                      <TabsTrigger value="url">URL</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="basicas" className="space-y-4 mt-6">
                      <h4 className="font-semibold text-gray-800">📝 Informações Básicas</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <div><strong>ID:</strong> {selectedItemDetails.id}</div>
                          <div><strong>Título:</strong> {selectedItemDetails.title}</div>
                          <div><strong>Preço:</strong> R$ {selectedItemDetails.price?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                          {selectedItemDetails.original_price && (
                            <div><strong>Preço Original:</strong> R$ {selectedItemDetails.original_price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                          )}
                        </div>
                        <div className="space-y-2">
                          <div><strong>Quantidade Disponível:</strong> {selectedItemDetails.available_quantity || 'Não disponível'}</div>
                          <div><strong>Quantidade Vendida:</strong> {selectedItemDetails.sold_quantity || 0}</div>
                          <div><strong>Status:</strong> {selectedItemDetails.status}</div>
                          <div><strong>Condição:</strong> {selectedItemDetails.condition}</div>
                        </div>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="vendedor" className="space-y-4 mt-6">
                      <h4 className="font-semibold text-gray-800">🏪 Informações do Vendedor</h4>
                      <div className="space-y-2">
                        <div><strong>ID do Vendedor:</strong> {selectedItemDetails.seller_id}</div>
                        {selectedItemDetails.seller_reputation && (
                          <>
                            <div><strong>Nível de Reputação:</strong> {selectedItemDetails.seller_reputation.level_id}</div>
                            <div><strong>Power Seller:</strong> {selectedItemDetails.seller_reputation.power_seller_status || 'Não'}</div>
                            <div><strong>Total de Transações:</strong> {selectedItemDetails.seller_reputation.transactions?.total || 0}</div>
                          </>
                        )}
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="envio" className="space-y-4 mt-6">
                      {selectedItemDetails.shipping ? (
                        <>
                          <h4 className="font-semibold text-gray-800">🚚 Informações de Envio</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <div><strong>Modo de Envio:</strong> {selectedItemDetails.shipping.mode}</div>
                              <div><strong>Tipo Logístico:</strong> {selectedItemDetails.shipping.logistic_type}</div>
                              <div><strong>Frete Grátis:</strong> {selectedItemDetails.shipping.free_shipping ? 'Sim' : 'Não'}</div>
                            </div>
                            {selectedItemDetails.shipping.tags && selectedItemDetails.shipping.tags.length > 0 && (
                              <div>
                                <strong>Tags de Envio:</strong>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {selectedItemDetails.shipping.tags.map((tag: string, index: number) => (
                                    <Badge key={index} variant="outline" className="text-xs">
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </>
                      ) : (
                        <p className="text-gray-500">Nenhuma informação de envio disponível</p>
                      )}
                    </TabsContent>
                    
                    <TabsContent value="atributos" className="space-y-4 mt-6">
                      {selectedItemDetails.attributes && selectedItemDetails.attributes.length > 0 ? (
                        <>
                          <h4 className="font-semibold text-gray-800">🏷️ Atributos do Produto</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {selectedItemDetails.attributes.map((attr: any, index: number) => (
                              <div key={index} className="flex justify-between p-2 bg-gray-50 rounded">
                                <span className="font-medium">{attr.name}:</span>
                                <span>{attr.value_name || attr.value}</span>
                              </div>
                            ))}
                          </div>
                        </>
                      ) : (
                        <p className="text-gray-500">Nenhum atributo disponível</p>
                      )}
                    </TabsContent>
                    
                    <TabsContent value="imagens" className="space-y-4 mt-6">
                      {selectedItemDetails.pictures && selectedItemDetails.pictures.length > 0 ? (
                        <>
                          <h4 className="font-semibold text-gray-800">🖼️ Imagens do Produto</h4>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {selectedItemDetails.pictures.map((pic: any, index: number) => (
                              <img
                                key={index}
                                src={pic.url}
                                alt={`Imagem ${index + 1}`}
                                className="w-full h-24 object-cover rounded border"
                              />
                            ))}
                          </div>
                        </>
                      ) : (
                        <p className="text-gray-500">Nenhuma imagem disponível</p>
                      )}
                    </TabsContent>
                    
                    <TabsContent value="url" className="space-y-4 mt-6">
                      <h4 className="font-semibold text-gray-800">🔗 URL do Anúncio</h4>
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={manualUrl}
                            onChange={(e) => setManualUrl(e.target.value)}
                            placeholder="Digite a URL do anúncio..."
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <Button
                            onClick={() => saveManualUrl(selectedItemDetails.id, manualUrl)}
                            disabled={savingUrl || !manualUrl.trim()}
                            size="sm"
                          >
                            {savingUrl ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                Salvando...
                              </>
                            ) : (
                              '💾 Salvar'
                            )}
                          </Button>
                        </div>
                        {selectedItemDetails.url && (
                          <div className="text-sm text-gray-600">
                            <strong>URL Automática:</strong> {selectedItemDetails.url}
                          </div>
                        )}
                      </div>
                      
                      <div className="space-y-3 mt-6">
                        <h4 className="font-semibold text-gray-800">📅 Datas</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div><strong>Data de Criação:</strong> {
                            selectedItemDetails.date_created === 'Não disponível' 
                              ? 'Não disponível' 
                              : new Date(selectedItemDetails.date_created).toLocaleString('pt-BR')
                          }</div>
                          <div><strong>Última Atualização:</strong> {
                            selectedItemDetails.last_updated === 'Não disponível' 
                              ? 'Não disponível' 
                              : new Date(selectedItemDetails.last_updated).toLocaleString('pt-BR')
                          }</div>
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </>
              )}
            </CardContent>
            <div className="flex justify-end p-6 pt-0">
              <Button variant="outline" onClick={() => setShowItemDetailsModal(false)}>
                Fechar
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

