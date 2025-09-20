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
  ArrowDown
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
  const [fullFilter, setFullFilter] = useState<'all' | 'full' | 'no-full'>('all');
  const [catalogFilter, setCatalogFilter] = useState<'all' | 'catalog' | 'normal'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'paused' | 'closed'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const productsPerPage = 50;
  const [sortField, setSortField] = useState<string>('title');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

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
          const response = await fetch(`${API_BASE_URL}/api/mercado-livre/products?limit=100&offset=${currentOffset}`, {
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
        
        const response = await fetch(`${API_BASE_URL}/api/mercado-livre/products?limit=${productsPerPage}&offset=${offset}`, {
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

  const isCatalogProduct = (product: MercadoLivreProduct) => {
    // Verifica se é um produto de catálogo baseado em:
    // 1. catalog_listing = true
    // 2. catalog_product_id presente
    return product.catalog_listing === true || !!product.catalog_product_id;
  };

  const getCatalogBadge = (product: MercadoLivreProduct) => {
    if (isCatalogProduct(product)) {
      return (
        <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
          <Package className="h-3 w-3 mr-1" />
          Catálogo
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-gray-500">
        <Package className="h-3 w-3 mr-1" />
        Normal
      </Badge>
    );
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
            Produtos
          </h1>
          <p className="text-muted-foreground mt-2">
            Gerencie seus produtos no Mercado Livre
          </p>
        </div>
        <Button onClick={() => setShowCreateForm(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Produto
        </Button>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Buscar Produtos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Buscar por título do produto..."
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
              
                  {/* Estatísticas dos filtros */}
                  <div className="space-y-2">
                    <div className="flex gap-4 text-sm text-gray-600">
                      <span>Total: {totalProducts}</span>
                      <span>Filtrados: {filteredProducts.length}</span>
                      {(fullFilter !== 'all' || catalogFilter !== 'all' || statusFilter !== 'all') && (
                        <span className="text-blue-600 font-medium">
                          📊 Todos os produtos carregados para filtro
                        </span>
                      )}
                    </div>
                    {fullFilter === 'all' && catalogFilter === 'all' && statusFilter === 'all' && (
                      <div className="flex gap-4 text-sm text-gray-600">
                        <span>Com Full: {products.filter(p => hasFullSales(p)).length}</span>
                        <span>Sem Full: {products.filter(p => !hasFullSales(p)).length}</span>
                        <span>Catálogo: {products.filter(p => isCatalogProduct(p)).length}</span>
                        <span>Normal: {products.filter(p => !isCatalogProduct(p)).length}</span>
                        <span>Ativos: {products.filter(p => p.status === 'active').length}</span>
                        <span>Pausados: {products.filter(p => p.status === 'paused').length}</span>
                        <span>Fechados: {products.filter(p => p.status === 'closed').length}</span>
                      </div>
                    )}
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
            Meus Produtos ({filteredProducts.length} de {totalProducts})
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
              <h3 className="text-lg font-semibold mb-2">Nenhum produto encontrado</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm ? "Tente ajustar sua busca" : "Comece criando seu primeiro produto"}
              </p>
              {!searchTerm && (
                <Button onClick={() => setShowCreateForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Produto
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Imagem</TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort('title')}
                    >
                      <div className="flex items-center gap-2">
                        Produto
                        {getSortIcon('title')}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50 text-right"
                      onClick={() => handleSort('price')}
                    >
                      <div className="flex items-center justify-end gap-2">
                        Preço
                        {getSortIcon('price')}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50 text-center"
                      onClick={() => handleSort('available_quantity')}
                    >
                      <div className="flex items-center justify-center gap-2">
                        Estoque
                        {getSortIcon('available_quantity')}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50 text-center"
                      onClick={() => handleSort('sold_quantity')}
                    >
                      <div className="flex items-center justify-center gap-2">
                        Vendidos
                        {getSortIcon('sold_quantity')}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50 text-center"
                      onClick={() => handleSort('status')}
                    >
                      <div className="flex items-center justify-center gap-2">
                        Status
                        {getSortIcon('status')}
                      </div>
                    </TableHead>
                        <TableHead className="text-center">Full</TableHead>
                        <TableHead className="text-center">Catálogo</TableHead>
                        <TableHead className="text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <div className="w-12 h-12 bg-muted rounded-md overflow-hidden">
                          {product.thumbnail ? (
                            <img
                              src={product.thumbnail}
                              alt={product.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="h-6 w-6 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs">
                          <p className="font-medium line-clamp-2">{product.title}</p>
                          <p className="text-sm text-muted-foreground">ID: {product.id}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-bold text-green-600">
                          R$ {product.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-medium">{product.available_quantity}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-medium">{product.sold_quantity}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        {getStatusBadge(product.status)}
                      </TableCell>
                          <TableCell className="text-center">
                            {getFullSalesBadge(product)}
                          </TableCell>
                          <TableCell className="text-center">
                            {getCatalogBadge(product)}
                          </TableCell>
                          <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedProduct(product);
                              setShowDetailsModal(true);
                            }}
                            title="Ver detalhes completos"
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedProduct(product);
                              setProductForm({
                                title: product.title,
                                price: product.price,
                                available_quantity: product.available_quantity,
                                condition: product.condition,
                                description: "",
                                category_id: product.category_id,
                                pictures: product.pictures.map(p => p.url),
                                attributes: product.attributes.map(a => ({
                                  id: a.id,
                                  value_name: a.value_name
                                }))
                              });
                              setShowEditForm(true);
                            }}
                            title="Editar produto"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(product.permalink, '_blank')}
                            title="Ver no Mercado Livre"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteProduct(product.id)}
                            title="Excluir produto"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          
          {/* Results Summary */}
          {!isLoading && sortedProducts.length > 0 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                Mostrando {sortedProducts.length} produtos filtrados de {totalProducts} total
              </div>
              <div className="text-sm text-muted-foreground">
                {fullFilter === 'full' && `✅ ${sortedProducts.length} produtos com vendas no Full`}
                {fullFilter === 'no-full' && `⚠️ ${sortedProducts.length} produtos sem vendas no Full`}
                {fullFilter === 'all' && `📦 ${sortedProducts.length} produtos exibidos`}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Product Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Criar Novo Produto</CardTitle>
              <CardDescription>
                Preencha as informações do produto para publicar no Mercado Livre
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">Título do Produto</Label>
                <Input
                  id="title"
                  value={productForm.title}
                  onChange={(e) => setProductForm({ ...productForm, title: e.target.value })}
                  placeholder="Ex: Smartphone Samsung Galaxy S21"
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
                      Criar Produto
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
              <CardTitle>Editar Produto</CardTitle>
              <CardDescription>
                Atualize as informações do produto
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="edit-title">Título do Produto</Label>
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
                      Atualizar Produto
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
                Detalhes Completos do Produto
              </CardTitle>
              <CardDescription>
                Informações detalhadas do produto no Mercado Livre
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Informações Básicas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-500">ID do Produto</Label>
                    <p className="text-sm">{selectedProduct.id}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Título</Label>
                    <p className="text-sm font-medium">{selectedProduct.title}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Preço</Label>
                    <p className="text-lg font-bold text-green-600">
                      R$ {selectedProduct.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Status</Label>
                    <div className="mt-1">{getStatusBadge(selectedProduct.status)}</div>
                  </div>
                </div>
                
                <div className="space-y-4">
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
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Tipo de Produto</Label>
                        <div className="mt-1">{getCatalogBadge(selectedProduct)}</div>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Tipo de Listagem</Label>
                        <p className="text-sm">{selectedProduct.listing_type_id}</p>
                      </div>
                </div>
              </div>

              {/* Informações Técnicas */}
              <div className="space-y-4">
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
              </div>

              {/* Atributos do Produto */}
              {selectedProduct.attributes && selectedProduct.attributes.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Atributos do Produto</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedProduct.attributes.slice(0, 10).map((attr, index) => (
                      <div key={index} className="flex justify-between border-b pb-2">
                        <span className="text-sm font-medium text-gray-500">{attr.name}:</span>
                        <span className="text-sm">{attr.value_name}</span>
                      </div>
                    ))}
                    {selectedProduct.attributes.length > 10 && (
                      <div className="col-span-2 text-sm text-gray-500">
                        ... e mais {selectedProduct.attributes.length - 10} atributos
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tags */}
              {selectedProduct.tags && selectedProduct.tags.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedProduct.tags.map((tag, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Informações de Data */}
              <div className="space-y-4">
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
              </div>

              {/* Links */}
              <div className="space-y-4">
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
              </div>
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
    </div>
  );
};
