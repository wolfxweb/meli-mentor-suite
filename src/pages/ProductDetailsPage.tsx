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
  HelpCircle
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
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basicas">Básicas</TabsTrigger>
              <TabsTrigger value="tecnicas">Técnicas</TabsTrigger>
              <TabsTrigger value="atributos">Atributos</TabsTrigger>
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
                  <div className="col-span-12 lg:col-span-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                    <h4 className="text-sm font-semibold text-blue-900 mb-3">📊 Distribuição de Custos</h4>
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
                          <div className="space-y-2">
                            <div className="text-center">
                              <p className="text-lg font-bold text-gray-800">
                                R$ {price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
