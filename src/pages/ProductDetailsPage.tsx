import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Package, 
  ExternalLink, 
  ArrowLeft, 
  DollarSign, 
  ShoppingCart, 
  Tag, 
  Calendar,
  TrendingUp,
  BarChart3,
  Info,
  AlertCircle,
  CheckCircle,
  Clock,
  Star,
  Eye,
  Heart,
  Share2,
  HelpCircle,
  Search,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { mercadoLivreApi } from '@/services/mercadoLivreApi';

interface MercadoLivreProduct {
  id: string;
  title: string;
  price: number;
  original_price?: number;
  base_price?: number;
  sale_price?: number;
  currency_id: string;
  available_quantity: number;
  sold_quantity: number;
  condition: string;
  status: string;
  permalink?: string;
  thumbnail?: string;
  listing_type_id?: string;
  listing_type_name?: string;
  listing_exposure?: string;
  category_id?: string;
  domain_id?: string;
  listing_fee_amount?: number;
  sale_fee_amount?: number;
  sale_fee_percentage?: number;
  sale_fee_fixed?: number;
  total_cost?: number;
  requires_picture?: boolean;
  product_cost?: number;
  taxes?: string;
  ads_cost?: string;
  shipping_cost?: number;
  additional_fees?: string;
  additional_notes?: string;
  catalog_listing?: boolean;
  catalog_product_id?: string;
  family_name?: string;
  family_id?: string;
  user_product_id?: string;
  inventory_id?: string;
  catalog_status?: string;
  catalog_visit_share?: string;
  catalog_competitors_sharing?: number;
  catalog_price_to_win?: number;
  full_data?: any;
  sale_price_info?: any;
  prices_info?: any;
  catalog_position_info?: any;
  attributes?: any;
  pictures?: any;
  tags?: any;
  ml_date_created?: string;
  ml_last_updated?: string;
}

const ProductDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<MercadoLivreProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEditCostsModal, setShowEditCostsModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [catalogCompetitors, setCatalogCompetitors] = useState<any[]>([]);
  const [loadingCompetitors, setLoadingCompetitors] = useState(false);
  
  // Estados para publicidade
  const [adsData, setAdsData] = useState<any>(null);
  const [loadingAds, setLoadingAds] = useState(false);
  const [syncingAds, setSyncingAds] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<number>(15);

  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        const response = await mercadoLivreApi.getProduct(id);
        setProduct(response);
      } catch (err: any) {
        console.error('Erro ao buscar produto:', err);
        setError(err.message || 'Erro ao carregar detalhes do produto');
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  // Carregar concorrentes do catálogo automaticamente quando o produto for carregado
  useEffect(() => {
    if (product?.catalog_product_id) {
      loadCatalogCompetitors(product.catalog_product_id);
    }
  }, [product?.catalog_product_id]);

  useEffect(() => {
    if (product?.id) {
      loadAdsData(product.id);
    }
  }, [product?.id]);

  const isOnSale = (product: MercadoLivreProduct) => {
    if (!product) return false;
    
    const salePriceInfo = (product as any).sale_price_info;
    if (salePriceInfo && salePriceInfo.regular_amount && salePriceInfo.amount) {
      return salePriceInfo.regular_amount > salePriceInfo.amount;
    }
    
    return (product.original_price && product.original_price > product.price) ||
           (product.base_price && product.base_price > product.price);
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      case 'closed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getConditionColor = (condition: string) => {
    switch (condition?.toLowerCase()) {
      case 'new': return 'bg-blue-100 text-blue-800';
      case 'used': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleSaveCosts = async () => {
    if (!product) return;
    
    setSaving(true);
    try {
      const formData = {
        product_cost: (() => {
          const value = parseFloat((document.getElementById('product_cost') as HTMLInputElement)?.value);
          return (!isNaN(value) && value > 0) ? value : null;
        })(),
        shipping_cost: (() => {
          const value = parseFloat((document.getElementById('shipping_cost') as HTMLInputElement)?.value);
          return (!isNaN(value) && value > 0) ? value : null;
        })(),
        taxes: (() => {
          const value = parseFloat((document.getElementById('taxes') as HTMLInputElement)?.value);
          return (!isNaN(value) && value > 0) ? value : null;
        })(),
        ads_cost: (() => {
          const value = parseFloat((document.getElementById('ads_cost') as HTMLInputElement)?.value);
          return (!isNaN(value) && value > 0) ? value : null;
        })(),
        additional_fees: (() => {
          const value = parseFloat((document.getElementById('additional_fees') as HTMLInputElement)?.value);
          return (!isNaN(value) && value > 0) ? value : null;
        })(),
        additional_notes: (document.getElementById('additional_notes') as HTMLTextAreaElement)?.value || null,
      };

      // Chamar a API para salvar os custos
      await mercadoLivreApi.updateProductCosts(product.id, formData);
      
      // Recarregar os dados do produto para ter os valores atualizados
      const updatedProduct = await mercadoLivreApi.getProduct(product.id);
      setProduct(updatedProduct);
      
      setShowEditCostsModal(false);
      
      // Aqui você poderia mostrar uma notificação de sucesso
      console.log('Custos salvos com sucesso!');
      
    } catch (error) {
      console.error('Erro ao salvar custos:', error);
      // Aqui você poderia mostrar uma notificação de erro
    } finally {
      setSaving(false);
    }
  };

  // Funções para análise do catálogo
  const loadCatalogCompetitors = async (catalogProductId: string) => {
    setLoadingCompetitors(true);
    try {
      console.log('=== INICIANDO CARREGAMENTO DE CONCORRENTES DO BANCO ===');
      console.log('Fazendo requisição para:', `http://localhost:8000/api/mercado-livre/catalog-competitors/db/${catalogProductId}`);
      
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const token = localStorage.getItem('auth_token');
      
      const response = await fetch(`${API_BASE_URL}/api/mercado-livre/catalog-competitors/db/${catalogProductId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const competitors = await response.json();
        console.log('Concorrentes carregados do banco:', competitors);
        setCatalogCompetitors(competitors);
      } else {
        const errorData = await response.json();
        console.error('Erro ao carregar concorrentes:', errorData);
        setCatalogCompetitors([]);
      }
    } catch (error: any) {
      console.error('=== ERRO AO CARREGAR CONCORRENTES ===');
      console.error('Erro:', error.message);
      setCatalogCompetitors([]);
    } finally {
      setLoadingCompetitors(false);
    }
  };

  const syncCatalogCompetitors = async (catalogProductId: string) => {
    setLoadingCompetitors(true);
    try {
      await mercadoLivreApi.syncCatalogCompetitors(catalogProductId);
      // Após sincronizar, carregar do banco de dados
      await loadCatalogCompetitors(catalogProductId);
    } catch (error: any) {
      console.error('Erro ao sincronizar concorrentes:', error);
    } finally {
      setLoadingCompetitors(false);
    }
  };

  // Funções para análise de publicidade
  const loadAdsData = async (itemId: string) => {
    setLoadingAds(true);
    try {
      console.log('=== CARREGANDO DADOS DE PUBLICIDADE DO BANCO ===');
      
      const data = await mercadoLivreApi.getProductAdsFromDb(itemId, selectedPeriod);
      console.log('Resposta da API:', data);

      if (data.success) {
        setAdsData(data.ads_data);
        // Definir o período baseado nos dados do banco
        if (data.ads_data.period_days) {
          setSelectedPeriod(data.ads_data.period_days);
        }
        console.log('Dados de publicidade carregados:', data.ads_data);
      } else {
        setAdsData(null);
        console.log('Nenhum dado de publicidade encontrado');
      }
    } catch (error: any) {
      console.error('Erro ao carregar dados de publicidade:', error);
      setAdsData(null);
    } finally {
      setLoadingAds(false);
    }
  };

  const syncAdsData = async (itemId: string) => {
    setSyncingAds(true);
    try {
      console.log('=== SINCRONIZANDO DADOS DE PUBLICIDADE ===');
      console.log('Baixando dados de todos os períodos (7, 15, 30, 60, 90 dias)');
      
      const data = await mercadoLivreApi.syncProductAdsData(itemId);
      console.log('Resposta da sincronização:', data);

      if (data.success) {
        // Após sincronizar, carregar do banco de dados
        await loadAdsData(itemId);
        console.log('Dados de publicidade sincronizados com sucesso');
      } else {
        console.log('Falha na sincronização:', data.message);
      }
    } catch (error: any) {
      console.error('Erro ao sincronizar dados de publicidade:', error);
    } finally {
      setSyncingAds(false);
    }
  };

  // Função para determinar posição no catálogo
  const getCatalogPosition = (product: MercadoLivreProduct) => {
    if (!product.catalog_status) {
      return { status: 'not_listed', description: 'Não listado no catálogo' };
    }
    
    if (product.catalog_status === 'winning') {
      return { status: 'winning', description: 'Ganhando no catálogo' };
    }
    
    if (product.catalog_competitors_sharing && product.catalog_competitors_sharing > 0) {
      return { status: 'sharing_first_place', description: 'Compartilhando o primeiro lugar' };
    }
    
    return { status: 'competing', description: 'Competindo no catálogo' };
  };

  // Função para verificar se tem vendas completas
  const hasFullSales = (product: MercadoLivreProduct) => {
    return product.tags && product.tags.includes('fulfillment');
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando detalhes do produto...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Erro ao carregar produto</h2>
          <p className="text-gray-600 mb-4">{error || 'Produto não encontrado'}</p>
          <Button onClick={() => navigate('/products')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para Produtos
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/products')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Detalhes do Anúncio</h1>
            <p className="text-gray-600">Informações completas do produto no Mercado Livre</p>
          </div>
        </div>
        
        {product.permalink && (
          <Button
            onClick={() => window.open(product.permalink, '_blank')}
            className="flex items-center gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            Ver no Mercado Livre
          </Button>
        )}
      </div>

      {/* Product Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {product.title}
          </CardTitle>
          <CardDescription>
            ID: {product.id} • Última atualização: {product.ml_last_updated ? new Date(product.ml_last_updated).toLocaleString('pt-BR') : 'N/A'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="basicas" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="basicas">Básicas</TabsTrigger>
              <TabsTrigger value="tecnicas">Técnicas</TabsTrigger>
              <TabsTrigger value="atributos">Atributos</TabsTrigger>
              <TabsTrigger value="catalogo">Catálogo</TabsTrigger>
              <TabsTrigger value="publicidade">Publicidade</TabsTrigger>
            </TabsList>
            
            <TabsContent value="basicas" className="space-y-6 mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Coluna Esquerda - Informações Principais */}
                <div className="space-y-6">
                  <div>
                    <Label className="text-sm font-medium text-gray-500">ID do Anúncio</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-sm font-mono bg-gray-100 px-2 py-1 rounded flex-1">{product.id}</p>
                      {product.permalink && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(product.permalink, '_blank')}
                          className="h-8 w-8 p-0"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Título</Label>
                    <p className="text-sm font-medium leading-relaxed">{product.title}</p>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Preço</Label>
                    <div className="mt-1">
                      {isOnSale(product) ? (
                        <div>
                          {(() => {
                            const salePriceInfo = (product as any).sale_price_info;
                            let currentPrice = product.price;
                            let originalPrice = product.original_price || product.base_price || product.price;
                            
                            if (salePriceInfo && salePriceInfo.regular_amount && salePriceInfo.amount) {
                              currentPrice = salePriceInfo.amount;
                              originalPrice = salePriceInfo.regular_amount;
                            } else {
                              if (!product.original_price && product.base_price && product.base_price !== product.price) {
                                originalPrice = product.base_price;
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
                        <p className="text-lg font-bold text-gray-900">
                          R$ {product.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Status</Label>
                      <div className="mt-1">
                        <Badge className={getStatusColor(product.status)}>
                          {product.status}
                        </Badge>
                      </div>
                    </div>
                    
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Condição</Label>
                      <div className="mt-1">
                        <Badge className={getConditionColor(product.condition)}>
                          {product.condition}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Disponível</Label>
                      <p className="text-sm font-medium">{product.available_quantity} unidades</p>
                    </div>
                    
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Vendido</Label>
                      <p className="text-sm font-medium">{product.sold_quantity} unidades</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Data de Criação</Label>
                      <p className="text-sm">
                        {product.ml_date_created ? new Date(product.ml_date_created).toLocaleString('pt-BR') : 'N/A'}
                      </p>
                    </div>
                    
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Última Atualização</Label>
                      <p className="text-sm">
                        {product.ml_last_updated ? new Date(product.ml_last_updated).toLocaleString('pt-BR') : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Coluna Direita - Imagem e Informações Adicionais */}
                <div className="space-y-6">
                  {product.thumbnail && (
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Imagem Principal</Label>
                      <div className="mt-2">
                        <img
                          src={product.thumbnail}
                          alt={product.title}
                          className="w-full h-48 object-cover rounded-lg border"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <Label className="text-sm font-medium text-gray-500">Tipo de Listagem</Label>
                    <p className="text-sm">{product.listing_type_name || product.listing_type_id || 'N/A'}</p>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-gray-500">Exposição</Label>
                    <div className="mt-1">
                      {(() => {
                        const exposure = product.listing_exposure;
                        if (!exposure) return <p className="text-sm text-gray-500">N/A</p>;
                        
                        const exposureMap: { [key: string]: { label: string; description: string; color: string } } = {
                          'highest': { 
                            label: 'Máxima', 
                            description: 'Maior visibilidade no site',
                            color: 'bg-green-100 text-green-800'
                          },
                          'high': { 
                            label: 'Alta', 
                            description: 'Boa visibilidade no site',
                            color: 'bg-blue-100 text-blue-800'
                          },
                          'mid': { 
                            label: 'Média', 
                            description: 'Visibilidade moderada',
                            color: 'bg-yellow-100 text-yellow-800'
                          },
                          'low': { 
                            label: 'Baixa', 
                            description: 'Visibilidade limitada',
                            color: 'bg-orange-100 text-orange-800'
                          },
                          'lowest': { 
                            label: 'Mínima', 
                            description: 'Menor visibilidade',
                            color: 'bg-red-100 text-red-800'
                          }
                        };
                        
                        const exposureInfo = exposureMap[exposure.toLowerCase()] || {
                          label: exposure,
                          description: 'Nível de exposição no site',
                          color: 'bg-gray-100 text-gray-800'
                        };
                        
                        return (
                          <div>
                            <Badge className={exposureInfo.color}>
                              {exposureInfo.label}
                            </Badge>
                            <p className="text-xs text-gray-500 mt-1">{exposureInfo.description}</p>
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-gray-500">Categoria</Label>
                    <p className="text-sm font-mono">{product.category_id || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Seção de Custos - Largura Total */}
              {((product.listing_fee_amount && product.listing_fee_amount > 0) || (product.sale_fee_amount && product.sale_fee_amount > 0) || (product.total_cost && product.total_cost > 0)) && (
                <div className="mt-8 grid grid-cols-12 gap-4">
                  {/* Card de Custos */}
                  <div className="col-span-12 lg:col-span-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                    <h4 className="text-sm font-semibold text-green-900 mb-3">💰 Custos do Anúncio</h4>
                  
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Tipo de Listagem:</span>
                        <span className="text-sm font-medium text-blue-600">
                          {product.listing_type_name || product.listing_type_id || 'N/A'}
                        </span>
                      </div>
                      
                      {product.sale_fee_percentage && (
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Percentual de Comissão:</span>
                          <span className="text-sm font-medium text-purple-600">
                            {product.sale_fee_percentage}%
                          </span>
                        </div>
                      )}
                      
                      {product.listing_fee_amount && product.listing_fee_amount > 0 && (
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Custo de Listagem:</span>
                          <span className="text-sm font-medium text-orange-600">
                            R$ {product.listing_fee_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      )}
                      
                      {product.sale_fee_percentage && product.price && (
                        <div className="space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Comissão Percentual:</span>
                            <span className="text-sm font-medium text-purple-600">
                              R$ {product.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} × {product.sale_fee_percentage}% = R$ {((product.price * product.sale_fee_percentage) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                          {product.sale_fee_fixed && product.sale_fee_fixed > 0 && (
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-600">Taxa Fixa:</span>
                              <span className="text-sm font-medium text-red-600">
                                R$ {product.sale_fee_fixed.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between items-center border-t border-green-200 pt-1">
                            <span className="text-sm font-semibold text-gray-700">Total Comissão:</span>
                            <span className="text-sm font-bold text-purple-600">
                              R$ {product.sale_fee_amount?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                            </span>
                          </div>
                        </div>
                      )}
                      
                    {/* Custos Adicionais */}
                    {((product.product_cost && !isNaN(product.product_cost) && product.product_cost > 0) || (product.shipping_cost && !isNaN(product.shipping_cost) && product.shipping_cost > 0) || (product.taxes && !isNaN(product.taxes) && product.taxes > 0) || (product.ads_cost && !isNaN(product.ads_cost) && product.ads_cost > 0) || (product.additional_fees && !isNaN(product.additional_fees) && product.additional_fees > 0)) && (
                        <div className="mt-3 pt-2 border-t border-green-200 space-y-1">
                          <p className="text-xs font-bold text-gray-600 mb-2">Custos Adicionais:</p>
                          {product.product_cost && !isNaN(product.product_cost) && product.product_cost > 0 && (
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-gray-600">Custo do Produto:</span>
                              <span className="font-medium text-orange-600">
                                R$ {product.product_cost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </div>
                          )}
                          {product.shipping_cost && !isNaN(product.shipping_cost) && product.shipping_cost > 0 && (
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-gray-600">Custo do Frete:</span>
                              <span className="font-medium text-orange-600">
                                R$ {product.shipping_cost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </div>
                          )}
                          {product.taxes && !isNaN(product.taxes) && product.taxes > 0 && (
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-gray-600">Impostos ({product.taxes}%):</span>
                              <span className="font-medium text-orange-600">
                                R$ {((product.price * product.taxes) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </div>
                          )}
                          {product.ads_cost && !isNaN(product.ads_cost) && product.ads_cost > 0 && (
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-gray-600">Custo Marketing ({product.ads_cost}%):</span>
                              <span className="font-medium text-orange-600">
                                R$ {((product.price * product.ads_cost) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </div>
                          )}
                          {product.additional_fees && !isNaN(product.additional_fees) && product.additional_fees > 0 && (
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-gray-600">Taxas Adicionais:</span>
                              <span className="font-medium text-orange-600">
                                R$ {product.additional_fees.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                      
                      <div className="border-t border-green-200 pt-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-semibold text-gray-700">Custo Total:</span>
                          <span className="text-sm font-bold text-red-600">
                            R$ {(() => {
                            const baseCost = Number(product.total_cost) || 0;
                            const productCost = (product.product_cost && !isNaN(product.product_cost)) ? Number(product.product_cost) : 0;
                            const shippingCost = (product.shipping_cost && !isNaN(product.shipping_cost)) ? Number(product.shipping_cost) : 0;
                            const taxesPercent = (product.taxes && !isNaN(product.taxes)) ? Number(product.taxes) : 0;
                            const taxesValue = taxesPercent > 0 ? (Number(product.price) * taxesPercent) / 100 : 0; // Impostos como % do preço
                            const adsCostPercent = (product.ads_cost && !isNaN(product.ads_cost)) ? Number(product.ads_cost) : 0;
                            const adsCost = adsCostPercent > 0 ? (Number(product.price) * adsCostPercent) / 100 : 0; // Marketing como % do preço
                            const additionalFees = (product.additional_fees && !isNaN(product.additional_fees)) ? Number(product.additional_fees) : 0;
                            const totalAdditionalCosts = productCost + shippingCost + taxesValue + adsCost + additionalFees;
                            const finalTotal = Number(baseCost) + Number(totalAdditionalCosts);
                              return finalTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                            })()}
                          </span>
                        </div>
                        
                        {/* Markup */}
                        {(() => {
                          const baseCost = Number(product.total_cost) || 0;
                          const productCost = (product.product_cost && !isNaN(product.product_cost)) ? Number(product.product_cost) : 0;
                          const shippingCost = (product.shipping_cost && !isNaN(product.shipping_cost)) ? Number(product.shipping_cost) : 0;
                          const taxesPercent = (product.taxes && !isNaN(product.taxes)) ? Number(product.taxes) : 0;
                          const taxesValue = taxesPercent > 0 ? (Number(product.price) * taxesPercent) / 100 : 0;
                          const adsCostPercent = (product.ads_cost && !isNaN(product.ads_cost)) ? Number(product.ads_cost) : 0;
                          const adsCost = adsCostPercent > 0 ? (Number(product.price) * adsCostPercent) / 100 : 0;
                          const additionalFees = (product.additional_fees && !isNaN(product.additional_fees)) ? Number(product.additional_fees) : 0;
                          const totalAdditionalCosts = productCost + shippingCost + taxesValue + adsCost + additionalFees;
                          const finalTotal = Number(baseCost) + Number(totalAdditionalCosts);
                          const markup = finalTotal > 0 ? ((Number(product.price) - finalTotal) / finalTotal) * 100 : 0;
                          
                          return (
                            <>
                              <div className="flex justify-between items-center mt-2">
                                <div className="flex items-center gap-1">
                                  <span className="text-sm font-semibold text-gray-700">Markup:</span>
                                  <div className="group relative">
                                    <HelpCircle className="h-3 w-3 text-gray-400 cursor-help" />
                                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                                      Percentual de margem sobre o custo<br/>(não é o lucro líquido)
                                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
                                    </div>
                                  </div>
                                </div>
                                <span className={`text-sm font-bold ${markup >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {markup.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
                                </span>
                              </div>
                              
                              {/* Lucro Líquido */}
                              <div className="flex justify-between items-center mt-1">
                                <div className="flex items-center gap-1">
                                  <span className="text-sm font-semibold text-gray-700">Lucro Líquido:</span>
                                  <div className="group relative">
                                    <HelpCircle className="h-3 w-3 text-gray-400 cursor-help" />
                                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                                      Valor absoluto do lucro<br/>(Preço - Custo Total)
                                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
                                    </div>
                                  </div>
                                </div>
                                <span className={`text-sm font-bold ${(Number(product.price) - finalTotal) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  R$ {(Number(product.price) - finalTotal).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                              </div>
                            </>
                          );
                        })()}
                      </div>

                      {/* Botão para editar custos */}
                      <div className="mt-4 pt-3 border-t border-green-200">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowEditCostsModal(true)}
                          className="w-full text-green-700 border-green-300 hover:bg-green-50"
                        >
                          <DollarSign className="h-4 w-4 mr-2" />
                          Editar Custos Adicionais
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Gráfico de Pizza - Distribuição de Custos */}
                  <div className="col-span-12 lg:col-span-6 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                    <h4 className="text-sm font-semibold text-blue-900 mb-2">📊 Distribuição de Custos</h4>
                    <div className="h-64">
                      {(() => {
                        const price = Number(product.price) || 0;
                        const baseCost = Number(product.total_cost) || 0;
                        const productCost = (product.product_cost && !isNaN(product.product_cost)) ? Number(product.product_cost) : 0;
                        const shippingCost = (product.shipping_cost && !isNaN(product.shipping_cost)) ? Number(product.shipping_cost) : 0;
                        const taxesPercent = (product.taxes && !isNaN(product.taxes)) ? Number(product.taxes) : 0;
                        const taxesValue = taxesPercent > 0 ? (price * taxesPercent) / 100 : 0; // Impostos como % do preço
                        const adsCostPercent = (product.ads_cost && !isNaN(product.ads_cost)) ? Number(product.ads_cost) : 0;
                        const adsCost = adsCostPercent > 0 ? (price * adsCostPercent) / 100 : 0; // Marketing como % do preço
                        const additionalFees = (product.additional_fees && !isNaN(product.additional_fees)) ? Number(product.additional_fees) : 0;
                        const totalCost = Number(baseCost) + Number(productCost) + Number(shippingCost) + Number(taxesValue) + Number(adsCost) + Number(additionalFees);
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
                          <div className="flex flex-col h-full">
                            {/* Gráfico dinâmico */}
                            <div className="flex-1 flex items-center justify-center">
                              <div className="relative" style={{ width: 'calc(95% - 2rem)', height: 'calc(95% - 2rem)', maxWidth: '266px', maxHeight: '266px' }}>
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
                                        strokeWidth="10"
                                        strokeDasharray={strokeDasharray}
                                        strokeDashoffset={strokeDashoffset}
                                        className="transition-all duration-300"
                                      />
                                    );
                                  })}
                                </svg>
                                
                                {/* Preço no centro */}
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <div className="text-center">
                                    <p className="text-sm font-bold text-gray-800">
                                      R$ {price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </p>
                                    <p className="text-xs text-gray-600">Preço</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            {/* Legenda compacta */}
                            <div className="space-y-1 mt-2">
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
                                      <span className="font-medium">R$ {item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
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

            <TabsContent value="tecnicas" className="space-y-6 mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div>
                    <Label className="text-sm font-medium text-gray-500">ID do Produto do Usuário</Label>
                    <p className="text-sm font-mono">{product.user_product_id || 'N/A'}</p>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-gray-500">ID do Catálogo</Label>
                    <p className="text-sm font-mono">{product.catalog_product_id || 'N/A'}</p>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-gray-500">Família do Produto</Label>
                    <p className="text-sm">{product.family_name || 'N/A'}</p>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-gray-500">ID da Família</Label>
                    <p className="text-sm font-mono">{product.family_id || 'N/A'}</p>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-gray-500">ID do Inventário</Label>
                    <p className="text-sm font-mono">{product.inventory_id || 'N/A'}</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Listagem no Catálogo</Label>
                    <div className="mt-1">
                      <Badge className={product.catalog_listing ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                        {product.catalog_listing ? 'Sim' : 'Não'}
                      </Badge>
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-gray-500">Requer Imagem</Label>
                    <div className="mt-1">
                      <Badge className={product.requires_picture ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}>
                        {product.requires_picture ? 'Sim' : 'Não'}
                      </Badge>
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-gray-500">Domínio</Label>
                    <p className="text-sm">{product.domain_id || 'N/A'}</p>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-gray-500">Moeda</Label>
                    <p className="text-sm">{product.currency_id}</p>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="atributos" className="space-y-6 mt-6">
              {product.attributes && Array.isArray(product.attributes) && product.attributes.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {product.attributes.map((attr: any, index: number) => (
                    <div key={index} className="border rounded-lg p-4">
                      <Label className="text-sm font-medium text-gray-500">{attr.name}</Label>
                      <p className="text-sm mt-1">
                        {attr.value_name || attr.value || 'N/A'}
                        {attr.attribute_group_name && (
                          <span className="text-xs text-gray-400 ml-2">({attr.attribute_group_name})</span>
                        )}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Info className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Nenhum atributo disponível para este produto</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="catalogo" className="space-y-6 mt-6">
              <div className="space-y-6">
                {/* Verificar se o produto é de catálogo */}
                {!product.catalog_product_id ? (
                  <div className="text-center py-12">
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8">
                      <div className="text-yellow-600 mb-4">
                        <Package className="h-16 w-16 mx-auto" />
                      </div>
                      <h3 className="text-lg font-semibold text-yellow-800 mb-2">
                        Produto não listado no catálogo
                      </h3>
                      <p className="text-yellow-700">
                        Este anúncio não está associado ao catálogo do Mercado Livre. 
                        Para acessar as análises de catálogo, o produto precisa estar listado no catálogo oficial.
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Informações Básicas do Produto */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">📦 Informações do Produto</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div>
                            <Label className="text-sm font-medium text-gray-500">Título</Label>
                            <p className="text-sm font-medium">{product.title}</p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-gray-500">ID do Anúncio</Label>
                            <p className="text-sm font-mono">{product.id}</p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-gray-500">ID do Produto de Catálogo</Label>
                            <p className="text-sm font-mono">{product.catalog_product_id}</p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-gray-500">Família do Produto</Label>
                            <p className="text-sm">{product.family_name || 'N/A'}</p>
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
                              R$ {product.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                          {product.original_price && product.original_price !== product.price && (
                            <div>
                              <Label className="text-sm font-medium text-gray-500">Preço Original</Label>
                              <p className="text-sm text-gray-500 line-through">
                                R$ {product.original_price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Preço para vencer */}
                      {product.catalog_price_to_win && (
                        <div className="bg-purple-50 p-4 rounded-lg">
                          <h4 className="font-semibold text-purple-800 mb-2">🎯 Preço para Vencer</h4>
                          <p className="text-lg font-bold text-purple-600">
                            R$ {product.catalog_price_to_win.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
                          if (product.catalog_product_id) {
                            syncCatalogCompetitors(product.catalog_product_id);
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
                                getCatalogPosition(product).status === 'winning' ? 'bg-green-100 text-green-800' :
                                getCatalogPosition(product).status === 'sharing_first_place' ? 'bg-blue-100 text-blue-800' :
                                getCatalogPosition(product).status === 'competing' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                              }>
                                {getCatalogPosition(product).status === 'winning' ? '🥇 Ganhando' :
                                 getCatalogPosition(product).status === 'sharing_first_place' ? '🥈 Compartilhando 1º' :
                                 getCatalogPosition(product).status === 'competing' ? '🥉 Competindo' : '📋 Listado'}
                              </Badge>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm">Visibilidade:</span>
                              <Badge className={
                                product.catalog_visit_share === 'maximum' ? 'bg-green-100 text-green-800' :
                                product.catalog_visit_share === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                product.catalog_visit_share === 'minimum' ? 'bg-red-100 text-red-800' :
                                'bg-gray-100 text-gray-800'
                              }>
                                {product.catalog_visit_share === 'maximum' ? '👁️ Máxima' :
                                 product.catalog_visit_share === 'medium' ? '👁️ Média' :
                                 product.catalog_visit_share === 'minimum' ? '👁️ Mínima' : '👁️ N/A'}
                              </Badge>
                            </div>
                            {product.catalog_price_to_win && (
                              <div className="flex items-center justify-between">
                                <span className="text-sm">Preço para Vencer:</span>
                                <span className="font-bold text-blue-600">
                                  R$ {product.catalog_price_to_win.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
                                {product.catalog_competitors_sharing === 0 && getCatalogPosition(product).status === 'winning' ? (
                                  <span className="text-green-600">Você está ganhando!</span>
                                ) : product.catalog_competitors_sharing === 1 ? (
                                  <span>
                                    {catalogCompetitors.find(c => c.price === Math.min(...catalogCompetitors.map(comp => comp.price || 0)))?.seller?.nickname || 'Vendedor'}
                                  </span>
                                ) : (
                                  `${product.catalog_competitors_sharing || 0} vendedores`
                                )}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm">Sua Posição:</span>
                              <span className="font-bold text-orange-600">
                                {catalogCompetitors.length > 0 ? 
                                  `${catalogCompetitors.filter(c => (c.price || 0) < product.price).length + 1}º` : 
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
                                R$ {product.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </div>
                              <div className="text-xs text-gray-600">Preço do Anúncio</div>
                              {product.original_price && product.original_price !== product.price && (
                                <div className="text-sm text-gray-500 line-through mt-1">
                                  R$ {product.original_price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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

                      {/* Análise de Envio dos Concorrentes */}
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

                      {/* Recomendações */}
                      {catalogCompetitors.length > 0 && (
                        <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-lg">
                          <h4 className="font-semibold text-green-800 mb-3">💡 Recomendações</h4>
                          <div className="space-y-3">
                            {/* Análise de Preço Competitivo */}
                            {(() => {
                              const minCompetitorPrice = Math.min(...catalogCompetitors.map(c => c.price || 0));
                              const maxCompetitorPrice = Math.max(...catalogCompetitors.map(c => c.price || 0));
                              const avgCompetitorPrice = catalogCompetitors.reduce((sum, c) => sum + (c.price || 0), 0) / catalogCompetitors.length;
                              const currentPrice = product.price;
                              
                              let recommendation = '';
                              let recommendationType = 'info';
                              
                              if (currentPrice < minCompetitorPrice) {
                                recommendation = `Preço competitivo: Seu preço (R$ ${currentPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}) está abaixo do menor preço dos concorrentes (R$ ${minCompetitorPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}).`;
                                recommendationType = 'success';
                              } else if (currentPrice > maxCompetitorPrice) {
                                recommendation = `Preço alto: Seu preço (R$ ${currentPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}) está acima do maior preço dos concorrentes (R$ ${maxCompetitorPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}).`;
                                recommendationType = 'warning';
                              } else if (currentPrice > avgCompetitorPrice) {
                                recommendation = `Preço acima da média: Seu preço (R$ ${currentPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}) está acima da média dos concorrentes (R$ ${avgCompetitorPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}).`;
                                recommendationType = 'warning';
                              } else {
                                recommendation = `Preço competitivo: Seu preço (R$ ${currentPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}) está dentro da faixa competitiva dos concorrentes.`;
                                recommendationType = 'success';
                              }
                              
                              return (
                                <div className={`p-3 rounded-lg ${
                                  recommendationType === 'success' ? 'bg-green-100 border border-green-200' :
                                  recommendationType === 'warning' ? 'bg-yellow-100 border border-yellow-200' :
                                  'bg-blue-100 border border-blue-200'
                                }`}>
                                  <p className={`text-sm ${
                                    recommendationType === 'success' ? 'text-green-800' :
                                    recommendationType === 'warning' ? 'text-yellow-800' :
                                    'text-blue-800'
                                  }`}>
                                    {recommendation}
                                  </p>
                                </div>
                              );
                            })()}
                            
                            {/* Recomendação de Frete */}
                            {(() => {
                              const freeShippingCount = catalogCompetitors.filter(c => c.shipping?.free_shipping === true).length;
                              const totalCompetitors = catalogCompetitors.length;
                              const freeShippingPercentage = (freeShippingCount / totalCompetitors) * 100;
                              
                              if (freeShippingPercentage > 50) {
                                return (
                                  <div className="p-3 rounded-lg bg-blue-100 border border-blue-200">
                                    <p className="text-sm text-blue-800">
                                      💡 Considere oferecer frete grátis: {freeShippingPercentage.toFixed(0)}% dos concorrentes oferecem frete grátis.
                                    </p>
                                  </div>
                                );
                              }
                              return null;
                            })()}
                            
                            {/* Recomendação de Medalhas */}
                            {(() => {
                              const goldSellers = catalogCompetitors.filter(c => c.seller?.power_seller_status === 'gold').length;
                              const silverSellers = catalogCompetitors.filter(c => c.seller?.power_seller_status === 'silver').length;
                              const totalMedalSellers = goldSellers + silverSellers;
                              
                              if (totalMedalSellers > catalogCompetitors.length / 2) {
                                return (
                                  <div className="p-3 rounded-lg bg-yellow-100 border border-yellow-200">
                                    <p className="text-sm text-yellow-800">
                                      🏆 Competição acirrada: {totalMedalSellers} vendedores com medalhas (Gold/Silver) competem neste catálogo.
                                    </p>
                                  </div>
                                );
                              }
                              return null;
                            })()}
                          </div>
                        </div>
                      )}

                      {/* Lista de Concorrentes */}
                      <div className="bg-white border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-semibold text-gray-800">🏪 Lista de Concorrentes no Catálogo</h4>
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
                                  <th className="text-left p-3 font-medium text-gray-700">URL</th>
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
                                        {competitor.shipping?.free_shipping ? '🚚 Frete Grátis' : '💰 Frete Pago'}
                                      </div>
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
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="text-center py-8 text-gray-500">
                            <Package className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                            <p>Nenhum concorrente encontrado</p>
                            <p className="text-sm">Clique em "Atualizar" para sincronizar e carregar concorrentes</p>
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
                              const productUrl = `https://www.mercadolivre.com.br/p/${product.catalog_product_id}`;
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
                  </>
                )}
              </div>
            </TabsContent>

            <TabsContent value="publicidade" className="space-y-6 mt-6">
              <div className="space-y-6">
                {/* Controles de Período e Atualização */}
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="period-select" className="text-sm font-medium text-gray-700">
                          Período de Análise:
                        </Label>
                        <Select value={selectedPeriod.toString()} onValueChange={async (value) => {
                          const newPeriod = parseInt(value);
                          setSelectedPeriod(newPeriod);
                          // Recarregar dados do novo período
                          if (product?.id) {
                            setLoadingAds(true);
                            try {
                              console.log(`=== CARREGANDO DADOS PARA PERÍODO ${newPeriod} DIAS ===`);
                              const data = await mercadoLivreApi.getProductAdsFromDb(product.id, newPeriod);
                              console.log('Resposta da API para novo período:', data);
                              
                              if (data.success) {
                                setAdsData(data.ads_data);
                                console.log('Dados de publicidade carregados para novo período:', data.ads_data);
                              } else {
                                setAdsData(null);
                                console.log('Nenhum dado de publicidade encontrado para o período selecionado');
                              }
                            } catch (error: any) {
                              console.error('Erro ao carregar dados de publicidade:', error);
                              setAdsData(null);
                            } finally {
                              setLoadingAds(false);
                            }
                          }
                        }}>
                          <SelectTrigger className="w-32">
                            <SelectValue placeholder="Período" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="7">7 dias</SelectItem>
                            <SelectItem value="15">15 dias</SelectItem>
                            <SelectItem value="30">30 dias</SelectItem>
                            <SelectItem value="60">60 dias</SelectItem>
                            <SelectItem value="90">90 dias</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {loadingAds && (
                        <div className="flex items-center gap-2 text-blue-600">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                          <span className="text-sm">Carregando...</span>
                        </div>
                      )}
                      {syncingAds && (
                        <div className="flex items-center gap-2 text-green-600">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
                          <span className="text-sm">Sincronizando...</span>
                        </div>
                      )}
                      <Button
                        onClick={() => {
                          if (product?.id) {
                            syncAdsData(product.id);
                          }
                        }}
                        disabled={syncingAds}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        {syncingAds ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Sincronizando...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Sincronizar
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Nota sobre limitação da API */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-start">
                    <div className="text-blue-600 mr-3">
                      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm text-blue-700">
                        Pode haver uma pequena divergência entre os dados mostrados aqui e os dados do site do Mercado Livre.
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Verificar se há dados de publicidade */}
                {!adsData ? (
                  <div className="text-center py-12">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-8">
                      <div className="text-blue-600 mb-4">
                        <TrendingUp className="h-16 w-16 mx-auto" />
                      </div>
                      <h3 className="text-lg font-semibold text-blue-800 mb-2">
                        Dados de publicidade não encontrados
                      </h3>
                      <p className="text-blue-700 mb-4">
                        Este anúncio não possui dados de publicidade (Product Ads) no banco de dados.
                        Clique em "Sincronizar" para baixar os dados de todos os períodos (7, 15, 30, 60, 90 dias) do Mercado Livre.
                      </p>
                      
                      <Button
                        onClick={() => {
                          if (product?.id) {
                            syncAdsData(product.id);
                          }
                        }}
                        disabled={syncingAds}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        {syncingAds ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Sincronizando...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Sincronizar
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Informações Básicas da Publicidade */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">📊 Informações da Publicidade</CardTitle>
                          <p className="text-sm text-gray-500">
                            Dados dos últimos {selectedPeriod} dias
                          </p>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div>
                            <Label className="text-sm font-medium text-gray-500">Status da Publicidade</Label>
                            <Badge className={
                              adsData.status === 'active' ? 'bg-green-100 text-green-800' :
                              adsData.status === 'paused' ? 'bg-yellow-100 text-yellow-800' :
                              adsData.status === 'hold' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }>
                              {adsData.status === 'active' ? '🟢 Ativo' :
                               adsData.status === 'paused' ? '🟡 Pausado' :
                               adsData.status === 'hold' ? '🔴 Suspenso (Produto pausado/sem estoque)' :
                               adsData.status === 'idle' ? '⚪ Inativo' :
                               adsData.status === 'delegated' ? '🔄 Delegado' :
                               adsData.status === 'revoked' ? '❌ Revogado' : adsData.status}
                            </Badge>
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-gray-500">ID da Campanha</Label>
                            <p className="text-sm font-mono">{adsData.campaign_id || 'N/A'}</p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-gray-500">ID do Anunciante</Label>
                            <p className="text-sm font-mono">{adsData.advertiser_id || 'N/A'}</p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-gray-500">Canal</Label>
                            <Badge className="bg-blue-100 text-blue-800">
                              {adsData.channel === 'marketplace' ? '🏪 Marketplace' :
                               adsData.channel === 'mshops' ? '🛍️ Mercado Shops' : adsData.channel || 'N/A'}
                            </Badge>
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-gray-500">Recomendado</Label>
                            <Badge className={adsData.recommended ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                              {adsData.recommended ? '✅ Sim' : '❌ Não'}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">💰 Análise de Investimento</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="bg-green-50 p-4 rounded-lg">
                            <h4 className="font-semibold text-green-800 mb-3">💵 Investimento Total</h4>
                            <div className="space-y-2">
                              <div>
                                <Label className="text-sm font-medium text-gray-500">Custo Total</Label>
                                <p className="text-lg font-bold text-green-600">
                                  R$ {adsData.cost?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                                </p>
                              </div>
                              <div>
                                <Label className="text-sm font-medium text-gray-500">Custo por Clique (CPC)</Label>
                                <p className="text-sm font-medium text-green-600">
                                  R$ {adsData.cpc?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || 'N/A'}
                                </p>
                              </div>
                              <div>
                                <Label className="text-sm font-medium text-gray-500">ACOS (Advertising Cost of Sales)</Label>
                                <p className="text-sm font-medium text-green-600">
                                  {adsData.acos ? `${adsData.acos.toFixed(2)}%` : 'N/A'}
                                </p>
                              </div>
                              <div>
                                <Label className="text-sm font-medium text-gray-500">TACOS (Total Advertising Cost of Sales)</Label>
                                <p className="text-sm font-medium text-green-600">
                                  {adsData.tacos ? `${adsData.tacos.toFixed(2)}%` : 'N/A'}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="bg-blue-50 p-4 rounded-lg">
                            <h4 className="font-semibold text-blue-800 mb-3">📈 Performance</h4>
                            <div className="space-y-2">
                              <div>
                                <Label className="text-sm font-medium text-gray-500">Taxa de Cliques (CTR)</Label>
                                <p className="text-sm font-medium text-blue-600">
                                  {adsData.ctr ? `${adsData.ctr.toFixed(2)}%` : 'N/A'}
                                </p>
                              </div>
                              <div>
                                <Label className="text-sm font-medium text-gray-500">Taxa de Conversão (CVR)</Label>
                                <p className="text-sm font-medium text-blue-600">
                                  {adsData.cvr ? `${adsData.cvr.toFixed(2)}%` : 'N/A'}
                                </p>
                              </div>
                              <div>
                                <Label className="text-sm font-medium text-gray-500">ROAS (Return on Ad Spend)</Label>
                                <p className="text-sm font-medium text-blue-600">
                                  {adsData.roas ? `${adsData.roas.toFixed(2)}x` : 'N/A'}
                                </p>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Análise de Publicidade */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">
                          📊 Análise de Publicidade
                        </CardTitle>
                        <CardDescription>
                          Análise detalhada da performance da publicidade (últimos {selectedPeriod} dias)
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-6">
                          {/* Métricas de Tráfego */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-4 rounded-lg">
                              <h4 className="font-semibold text-purple-800 mb-3">👁️ Métricas de Tráfego</h4>
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm">Impressões:</span>
                                  <span className="font-bold text-purple-600">
                                    {adsData.prints?.toLocaleString('pt-BR') || '0'}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-sm">Cliques:</span>
                                  <span className="font-bold text-purple-600">
                                    {adsData.clicks?.toLocaleString('pt-BR') || '0'}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-sm">Taxa de Cliques:</span>
                                  <span className="font-bold text-purple-600">
                                    {adsData.ctr ? `${adsData.ctr.toFixed(2)}%` : '0%'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-lg">
                              <h4 className="font-semibold text-green-800 mb-3">💰 Métricas de Vendas</h4>
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm">Vendas Orgânicas:</span>
                                  <span className="font-bold text-green-600">
                                    {adsData.organic_items_quantity?.toLocaleString('pt-BR') || '0'}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-sm">Vendas Diretas:</span>
                                  <span className="font-bold text-green-600">
                                    {adsData.direct_items_quantity?.toLocaleString('pt-BR') || '0'}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-sm">Vendas Indiretas:</span>
                                  <span className="font-bold text-green-600">
                                    {adsData.indirect_items_quantity?.toLocaleString('pt-BR') || '0'}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-sm">Total de Vendas:</span>
                                  <span className="font-bold text-green-600">
                                    {adsData.units_quantity?.toLocaleString('pt-BR') || '0'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Análise de Receita */}
                          <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg">
                            <h4 className="font-semibold text-blue-800 mb-3">💵 Análise de Receita</h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              <div className="text-center">
                                <div className="text-lg font-bold text-green-600">
                                  R$ {adsData.organic_units_amount?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                                </div>
                                <div className="text-xs text-gray-600">Receita Orgânica</div>
                              </div>
                              <div className="text-center">
                                <div className="text-lg font-bold text-blue-600">
                                  R$ {adsData.direct_amount?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                                </div>
                                <div className="text-xs text-gray-600">Receita Direta</div>
                              </div>
                              <div className="text-center">
                                <div className="text-lg font-bold text-purple-600">
                                  R$ {adsData.indirect_amount?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                                </div>
                                <div className="text-xs text-gray-600">Receita Indireta</div>
                              </div>
                              <div className="text-center">
                                <div className="text-lg font-bold text-orange-600">
                                  R$ {adsData.total_amount?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                                </div>
                                <div className="text-xs text-gray-600">Receita Total</div>
                              </div>
                            </div>
                          </div>

                          {/* Recomendações */}
                        {/* Análise de Custo Marketing */}
                        {product?.ads_cost && adsData?.cost && product?.price && (
                          <Card className="mb-6">
                            <CardHeader>
                              <CardTitle className="text-lg">💰 Análise de Custo Marketing</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                <div className="bg-blue-50 p-4 rounded-lg">
                                  <h5 className="font-medium text-blue-800 mb-2">Custo Máximo por Produto</h5>
                                  <p className="text-2xl font-bold text-blue-900">
                                    R$ {(parseFloat(product.price) * parseFloat(product.ads_cost) / 100).toFixed(2)}
                                  </p>
                                  <p className="text-sm text-blue-600">
                                    {product.ads_cost}% sobre R$ {parseFloat(product.price).toFixed(2)}
                                  </p>
                                </div>
                                <div className="bg-green-50 p-4 rounded-lg">
                                  <h5 className="font-medium text-green-800 mb-2">Gasto Real</h5>
                                  <p className="text-2xl font-bold text-green-900">
                                    R$ {adsData.cost.toFixed(2)}
                                  </p>
                                  <p className="text-sm text-green-600">Gasto real em publicidade ({selectedPeriod} dias)</p>
                                </div>
                                <div className="bg-purple-50 p-4 rounded-lg">
                                  <h5 className="font-medium text-purple-800 mb-2">Produtos Vendidos</h5>
                                  <p className="text-2xl font-bold text-purple-900">
                                    {adsData.units_quantity || 0}
                                  </p>
                                  <p className="text-sm text-purple-600">Unidades vendidas (15 dias)</p>
                                </div>
                              </div>
                              
                              {/* Análise de Desempenho */}
                              {(() => {
                                const productPrice = parseFloat(product.price);
                                const adsCostPercentage = parseFloat(product.ads_cost);
                                const maxCostPerProduct = productPrice * adsCostPercentage / 100;
                                const unitsSold = adsData.units_quantity || 0;
                                const maxTotalCost = maxCostPerProduct * unitsSold;
                                const actualCost = adsData.cost;
                                const difference = actualCost - maxTotalCost;
                                const percentage = maxTotalCost > 0 ? (difference / maxTotalCost) * 100 : 0;
                                
                                return (
                                  <div className={`p-4 rounded-lg ${
                                    Math.abs(percentage) <= 10 ? 'bg-green-100 border border-green-200' :
                                    Math.abs(percentage) <= 25 ? 'bg-yellow-100 border border-yellow-200' :
                                    'bg-red-100 border border-red-200'
                                  }`}>
                                    <h6 className="font-medium mb-2">
                                      {Math.abs(percentage) <= 10 ? '✅' : 
                                       Math.abs(percentage) <= 25 ? '⚠️' : '❌'} 
                                      Análise de Desempenho
                                    </h6>
                                    <div className="space-y-2">
                                      <p className="text-sm">
                                        <span className="font-medium">Custo máximo total:</span> 
                                        <span className="ml-2 text-blue-600">
                                          R$ {maxTotalCost.toFixed(2)}
                                        </span>
                                        <span className="text-xs text-gray-500 ml-1">
                                          ({unitsSold} produtos × R$ {maxCostPerProduct.toFixed(2)})
                                        </span>
                                      </p>
                                      <p className="text-sm">
                                        <span className="font-medium">Diferença:</span> 
                                        <span className={`ml-2 ${
                                          difference >= 0 ? 'text-red-600' : 'text-green-600'
                                        }`}>
                                          {difference >= 0 ? '+' : ''}R$ {difference.toFixed(2)}
                                        </span>
                                      </p>
                                      <p className="text-sm">
                                        <span className="font-medium">Percentual:</span> 
                                        <span className={`ml-2 ${
                                          Math.abs(percentage) <= 10 ? 'text-green-600' :
                                          Math.abs(percentage) <= 25 ? 'text-yellow-600' :
                                          'text-red-600'
                                        }`}>
                                          {percentage >= 0 ? '+' : ''}{percentage.toFixed(1)}%
                                        </span>
                                      </p>
                                      <p className={`text-sm ${
                                        Math.abs(percentage) <= 10 ? 'text-green-800' :
                                        Math.abs(percentage) <= 25 ? 'text-yellow-800' :
                                        'text-red-800'
                                      }`}>
                                        {Math.abs(percentage) <= 10 ? 
                                          '✅ Excelente controle de custos! O gasto está dentro do percentual planejado.' :
                                          Math.abs(percentage) <= 25 ? 
                                          '⚠️ Atenção: O gasto está um pouco acima do percentual planejado. Considere revisar o orçamento.' :
                                          '❌ Custo fora do controle: O gasto está significativamente acima do percentual planejado. Revise urgentemente o orçamento.'
                                        }
                                      </p>
                                    </div>
                                  </div>
                                );
                              })()}
                            </CardContent>
                          </Card>
                        )}

                        {/* Análise de Custo Marketing - Todos os Produtos Vendidos */}
                        {product?.ads_cost && adsData?.cost && product?.price && (
                          <Card className="mb-6">
                            <CardHeader>
                              <CardTitle className="text-lg">📊 Análise de Custo Marketing - Todos os Produtos</CardTitle>
                              <p className="text-sm text-gray-600">
                                Considerando todos os produtos vendidos (orgânicos + publicidade) para ratear o custo de marketing
                              </p>
                            </CardHeader>
                            <CardContent>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                <div className="bg-blue-50 p-4 rounded-lg">
                                  <h5 className="font-medium text-blue-800 mb-2">Custo Máximo por Produto</h5>
                                  <p className="text-2xl font-bold text-blue-900">
                                    R$ {(parseFloat(product.price) * parseFloat(product.ads_cost) / 100).toFixed(2)}
                                  </p>
                                  <p className="text-sm text-blue-600">
                                    {product.ads_cost}% sobre R$ {parseFloat(product.price).toFixed(2)}
                                  </p>
                                </div>
                                <div className="bg-green-50 p-4 rounded-lg">
                                  <h5 className="font-medium text-green-800 mb-2">Gasto Real</h5>
                                  <p className="text-2xl font-bold text-green-900">
                                    R$ {adsData.cost.toFixed(2)}
                                  </p>
                                  <p className="text-sm text-green-600">Gasto real em publicidade ({selectedPeriod} dias)</p>
                                </div>
                                <div className="bg-purple-50 p-4 rounded-lg">
                                  <h5 className="font-medium text-purple-800 mb-2">Total de Produtos Vendidos</h5>
                                  <p className="text-2xl font-bold text-purple-900">
                                    {(adsData.units_quantity || 0) + (adsData.organic_units_quantity || 0)}
                                  </p>
                                  <p className="text-sm text-purple-600">
                                    {adsData.units_quantity || 0} publicidade + {adsData.organic_units_quantity || 0} orgânicos ({selectedPeriod} dias)
                                  </p>
                                </div>
                              </div>
                              
                              {/* Análise de Desempenho - Todos os Produtos */}
                              {(() => {
                                const productPrice = parseFloat(product.price);
                                const adsCostPercentage = parseFloat(product.ads_cost);
                                const maxCostPerProduct = productPrice * adsCostPercentage / 100;
                                const totalUnitsSold = (adsData.units_quantity || 0) + (adsData.organic_units_quantity || 0);
                                const maxTotalCost = maxCostPerProduct * totalUnitsSold;
                                const actualCost = adsData.cost;
                                const difference = actualCost - maxTotalCost;
                                const percentage = maxTotalCost > 0 ? (difference / maxTotalCost) * 100 : 0;
                                
                                return (
                                  <div className={`p-4 rounded-lg ${
                                    Math.abs(percentage) <= 10 ? 'bg-green-100 border border-green-200' :
                                    Math.abs(percentage) <= 25 ? 
                                      (percentage >= 0 ? 'bg-yellow-100 border border-yellow-200' : 'bg-green-100 border border-green-200') :
                                      (percentage >= 0 ? 'bg-red-100 border border-red-200' : 'bg-green-100 border border-green-200')
                                  }`}>
                                    <h6 className="font-medium mb-2">
                                      {Math.abs(percentage) <= 10 ? '✅' : 
                                       Math.abs(percentage) <= 25 ? (percentage >= 0 ? '⚠️' : '✅') : 
                                       (percentage >= 0 ? '❌' : '✅')} 
                                      Análise de Desempenho - Rateio Total
                                    </h6>
                                    <div className="space-y-2">
                                      <p className="text-sm">
                                        <span className="font-medium">Custo máximo total:</span> 
                                        <span className="ml-2 text-blue-600">
                                          R$ {maxTotalCost.toFixed(2)}
                                        </span>
                                        <span className="text-xs text-gray-500 ml-1">
                                          ({totalUnitsSold} produtos × R$ {maxCostPerProduct.toFixed(2)})
                                        </span>
                                      </p>
                                      <p className="text-sm">
                                        <span className="font-medium">Custo por produto vendido:</span> 
                                        <span className="ml-2 text-blue-600">
                                          R$ {totalUnitsSold > 0 ? (actualCost / totalUnitsSold).toFixed(2) : '0.00'}
                                        </span>
                                        <span className="text-xs text-gray-500 ml-1">
                                          (R$ {actualCost.toFixed(2)} ÷ {totalUnitsSold} produtos)
                                        </span>
                                      </p>
                                      <p className="text-sm">
                                        <span className="font-medium">Diferença:</span> 
                                        <span className={`ml-2 ${
                                          difference >= 0 ? 'text-red-600' : 'text-green-600'
                                        }`}>
                                          {difference >= 0 ? '+' : ''}R$ {difference.toFixed(2)}
                                        </span>
                                      </p>
                                      <p className="text-sm">
                                        <span className="font-medium">Percentual:</span> 
                                        <span className={`ml-2 ${
                                          Math.abs(percentage) <= 10 ? 'text-green-600' :
                                          Math.abs(percentage) <= 25 ? 
                                            (percentage >= 0 ? 'text-yellow-600' : 'text-green-600') :
                                            (percentage >= 0 ? 'text-red-600' : 'text-green-600')
                                        }`}>
                                          {percentage >= 0 ? '+' : ''}{percentage.toFixed(1)}%
                                        </span>
                                      </p>
                                      <p className={`text-sm ${
                                        Math.abs(percentage) <= 10 ? 'text-green-800' :
                                        Math.abs(percentage) <= 25 ? 
                                          (percentage >= 0 ? 'text-yellow-800' : 'text-green-800') :
                                          (percentage >= 0 ? 'text-red-800' : 'text-green-800')
                                      }`}>
                                        {Math.abs(percentage) <= 10 ? 
                                          '✅ Excelente! O custo de marketing está dentro do percentual planejado considerando todos os produtos vendidos.' :
                                          Math.abs(percentage) <= 25 ? 
                                          (percentage >= 0 ? 
                                            '⚠️ Atenção: O custo de marketing está um pouco acima do percentual planejado. Considere revisar o orçamento.' :
                                            '✅ Muito bom! O custo de marketing está abaixo do percentual planejado.'):
                                          (percentage >= 0 ? 
                                            '❌ Custo fora do controle: O custo de marketing está significativamente acima do percentual planejado. Revise urgentemente o orçamento.' :
                                            '✅ Excelente! O custo de marketing está significativamente abaixo do percentual planejado. Você está economizando muito!')
                                        }
                                      </p>
                                    </div>
                                  </div>
                                );
                              })()}
                            </CardContent>
                          </Card>
                        )}

                        <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 p-4 rounded-lg">
                          <h4 className="font-semibold text-yellow-800 mb-3">💡 Recomendações</h4>
                          <div className="space-y-3">
                              {/* Análise de ACOS */}
                              {adsData.acos && (
                                <div className={`p-3 rounded-lg ${
                                  adsData.acos < 10 ? 'bg-green-100 border border-green-200' :
                                  adsData.acos < 20 ? 'bg-yellow-100 border border-yellow-200' :
                                  'bg-red-100 border border-red-200'
                                }`}>
                                  <p className={`text-sm ${
                                    adsData.acos < 10 ? 'text-green-800' :
                                    adsData.acos < 20 ? 'text-yellow-800' :
                                    'text-red-800'
                                  }`}>
                                    {adsData.acos < 10 ? '✅ ACOS excelente' :
                                     adsData.acos < 20 ? '⚠️ ACOS moderado' :
                                     '❌ ACOS alto'} - Seu ACOS de {adsData.acos.toFixed(2)}% está 
                                    {adsData.acos < 10 ? ' muito bom' :
                                     adsData.acos < 20 ? ' dentro do esperado' :
                                     ' acima do ideal'}. 
                                    {adsData.acos >= 20 && ' Considere otimizar suas campanhas para reduzir o custo por venda.'}
                                  </p>
                                </div>
                              )}

                              {/* Análise de CTR */}
                              {adsData.ctr && (
                                <div className={`p-3 rounded-lg ${
                                  adsData.ctr > 0.02 ? 'bg-green-100 border border-green-200' :
                                  adsData.ctr > 0.01 ? 'bg-yellow-100 border border-yellow-200' :
                                  'bg-red-100 border border-red-200'
                                }`}>
                                  <p className={`text-sm ${
                                    adsData.ctr > 0.02 ? 'text-green-800' :
                                    adsData.ctr > 0.01 ? 'text-yellow-800' :
                                    'text-red-800'
                                  }`}>
                                    {adsData.ctr > 0.02 ? '✅ CTR excelente' :
                                     adsData.ctr > 0.01 ? '⚠️ CTR moderado' :
                                     '❌ CTR baixo'} - Sua taxa de cliques de {adsData.ctr.toFixed(2)}% está 
                                    {adsData.ctr > 0.02 ? ' muito boa' :
                                     adsData.ctr > 0.01 ? ' dentro da média' :
                                     ' abaixo da média'}. 
                                    {adsData.ctr <= 0.01 && ' Considere melhorar o título e as imagens do anúncio para aumentar o engajamento.'}
                                  </p>
                                </div>
                              )}

                         {/* Análise de ROAS */}
                         {adsData.roas && (
                           <div className={`p-3 rounded-lg ${
                             adsData.roas > 4 ? 'bg-green-100 border border-green-200' :
                             adsData.roas > 2 ? 'bg-yellow-100 border border-yellow-200' :
                             'bg-red-100 border border-red-200'
                           }`}>
                             <p className={`text-sm ${
                               adsData.roas > 4 ? 'text-green-800' :
                               adsData.roas > 2 ? 'text-yellow-800' :
                               'text-red-800'
                             }`}>
                               {adsData.roas > 4 ? '✅ ROAS excelente' :
                                adsData.roas > 2 ? '⚠️ ROAS moderado' :
                                '❌ ROAS baixo'} - Seu retorno sobre investimento de {adsData.roas.toFixed(2)}x está 
                               {adsData.roas > 4 ? ' muito bom' :
                                adsData.roas > 2 ? ' dentro do esperado' :
                                ' abaixo do ideal'}. 
                               {adsData.roas <= 2 && ' Considere otimizar suas campanhas para melhorar o retorno.'}
                             </p>
                           </div>
                         )}

                         {/* Análise de TACOS */}
                         {adsData.tacos && (
                           <div className={`p-3 rounded-lg ${
                             adsData.tacos < 5 ? 'bg-green-100 border border-green-200' :
                             adsData.tacos < 10 ? 'bg-yellow-100 border border-yellow-200' :
                             'bg-red-100 border border-red-200'
                           }`}>
                             <p className={`text-sm ${
                               adsData.tacos < 5 ? 'text-green-800' :
                               adsData.tacos < 10 ? 'text-yellow-800' :
                               'text-red-800'
                             }`}>
                               {adsData.tacos < 5 ? '✅ TACOS excelente' :
                                adsData.tacos < 10 ? '⚠️ TACOS moderado' :
                                '❌ TACOS alto'} - Seu custo total de publicidade de {adsData.tacos.toFixed(2)}% está 
                               {adsData.tacos < 5 ? ' muito baixo' :
                                adsData.tacos < 10 ? ' dentro do esperado' :
                                ' acima do ideal'}. 
                               {adsData.tacos >= 10 && ' Considere otimizar suas campanhas para reduzir o custo total de publicidade.'}
                             </p>
                           </div>
                         )}

                         {/* Status da Publicidade */}
                         {adsData.status !== 'active' && (
                           <div className="p-3 rounded-lg bg-orange-100 border border-orange-200">
                             <p className="text-sm text-orange-800">
                               {adsData.status === 'hold' ? 
                                 '🔴 Publicidade suspensa: Seu produto está pausado ou sem estoque no Mercado Livre. A publicidade foi automaticamente suspensa. Para reativar, primeiro reative o produto e adicione estoque.' :
                                 adsData.status === 'paused' ?
                                 '⚠️ Publicidade pausada: Sua publicidade está pausada. Para maximizar as vendas, considere reativar a publicidade.' :
                                 '⚠️ Publicidade inativa: Sua publicidade está inativa. Para maximizar as vendas, considere reativar a publicidade.'
                               }
                             </p>
                           </div>
                         )}

                              {/* Recomendação de Ativação */}
                              {adsData.status === 'idle' && (
                                <div className="p-3 rounded-lg bg-blue-100 border border-blue-200">
                                  <p className="text-sm text-blue-800">
                                    🚀 Oportunidade de crescimento: Seu anúncio está disponível para publicidade mas não está ativo. 
                                    Considere ativar a publicidade para aumentar a visibilidade e as vendas.
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </>
                )}
              </div>
            </TabsContent>

          </Tabs>
        </CardContent>
      </Card>

      {/* Modal de Edição de Custos */}
      <Dialog open={showEditCostsModal} onOpenChange={setShowEditCostsModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Editar Custos Adicionais
            </DialogTitle>
            <DialogDescription>
              Atualize os custos adicionais do produto {product?.title}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="product_cost">Custo do Produto (R$)</Label>
                <Input
                  id="product_cost"
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  defaultValue={product?.product_cost || ''}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="shipping_cost">Custo do Frete (R$)</Label>
                <Input
                  id="shipping_cost"
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  defaultValue={product?.shipping_cost || ''}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="taxes">Impostos (%)</Label>
                <Input
                  id="taxes"
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  defaultValue={product?.taxes || ''}
                />
              </div>
              
                <div className="space-y-2">
                  <Label htmlFor="ads_cost">Custo Marketing (%)</Label>
                  <Input
                    id="ads_cost"
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    defaultValue={product?.ads_cost || ''}
                  />
                </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="additional_fees">Taxas Adicionais (R$)</Label>
              <Input
                id="additional_fees"
                type="number"
                step="0.01"
                placeholder="0,00"
                defaultValue={product?.additional_fees || ''}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="additional_notes">Observações</Label>
              <Textarea
                id="additional_notes"
                placeholder="Observações adicionais sobre os custos..."
                defaultValue={product?.additional_notes || ''}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowEditCostsModal(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveCosts}
              disabled={saving}
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Salvando...
                </>
              ) : (
                'Salvar Custos'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductDetailsPage;
