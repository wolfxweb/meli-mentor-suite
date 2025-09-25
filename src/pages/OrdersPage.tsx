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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  ShoppingCart, 
  Search, 
  RefreshCw,
  Loader2,
  ExternalLink,
  AlertTriangle,
  CheckCircle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
  Download,
  Upload,
  Calendar,
  DollarSign,
  User,
  Truck,
  CreditCard,
  MessageSquare,
  Eye,
  Clock,
  XCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { mercadoLivreApi } from "@/services/mercadoLivreApi";

interface MercadoLivreOrder {
  id: number;
  order_id: string;
  status: string;
  status_detail?: string;
  date_created: string;
  date_closed?: string;
  date_last_updated?: string;
  expiration_date?: string;
  manufacturing_ending_date?: string;
  total_amount: number;
  paid_amount?: number;
  currency_id: string;
  comment?: string;
  pack_id?: string;
  pickup_id?: string;
  fulfilled?: boolean;
  
  // Informações do comprador
  buyer_id: string;
  buyer_nickname?: string;
  buyer_email?: string;
  buyer_first_name?: string;
  buyer_last_name?: string;
  buyer_phone?: string;
  buyer_alternative_phone?: string;
  buyer_registration_date?: string;
  buyer_user_type?: string;
  buyer_country_id?: string;
  buyer_site_id?: string;
  buyer_permalink?: string;
  buyer_address_state?: string;
  buyer_address_city?: string;
  buyer_address_address?: string;
  buyer_address_zip_code?: string;
  buyer_identification_type?: string;
  buyer_identification_number?: string;
  
  // Informações do vendedor
  seller_id: string;
  seller_nickname?: string;
  seller_email?: string;
  seller_first_name?: string;
  seller_last_name?: string;
  seller_phone?: string;
  seller_alternative_phone?: string;
  seller_registration_date?: string;
  seller_user_type?: string;
  seller_country_id?: string;
  seller_site_id?: string;
  seller_permalink?: string;
  seller_address_state?: string;
  seller_address_city?: string;
  seller_address_address?: string;
  seller_address_zip_code?: string;
  seller_identification_type?: string;
  seller_identification_number?: string;
  
  // Informações de envio
  shipping_id?: string;
  shipping_status?: string;
  shipping_substatus?: string;
  shipping_cost?: number;
  shipping_tracking_number?: string;
  shipping_tracking_method?: string;
  shipping_declared_value?: number;
  shipping_origin_state?: string;
  shipping_origin_city?: string;
  shipping_origin_address?: string;
  shipping_origin_zip_code?: string;
  shipping_destination_state?: string;
  shipping_destination_city?: string;
  shipping_destination_address?: string;
  shipping_destination_zip_code?: string;
  shipping_destination_receiver_name?: string;
  shipping_destination_receiver_phone?: string;
  shipping_dimensions_height?: number;
  shipping_dimensions_width?: number;
  shipping_dimensions_length?: number;
  shipping_dimensions_weight?: number;
  
  // Informações de pagamento
  payment_method_id?: string;
  payment_type?: string;
  payment_status?: string;
  payment_installments?: number;
  payment_operation_type?: string;
  payment_status_code?: string;
  payment_status_detail?: string;
  payment_transaction_amount?: number;
  payment_transaction_amount_refunded?: number;
  payment_taxes_amount?: number;
  payment_coupon_amount?: number;
  payment_overpaid_amount?: number;
  payment_installment_amount?: number;
  payment_authorization_code?: string;
  payment_transaction_order_id?: string;
  payment_date_approved?: string;
  payment_date_last_modified?: string;
  payment_collector_id?: string;
  payment_card_id?: string;
  payment_issuer_id?: string;
  
  // Feedback
  feedback_sale_id?: string;
  feedback_sale_rating?: string;
  feedback_sale_fulfilled?: boolean;
  feedback_purchase_id?: string;
  feedback_purchase_rating?: string;
  feedback_purchase_fulfilled?: boolean;
  
  // Informações adicionais
  tags?: string[];
  order_items?: any[];
  payments?: any[];
  context_channel?: string;
  context_site?: string;
  context_flows?: string[];
  coupon_id?: string;
  coupon_amount?: number;
  taxes_amount?: number;
  taxes_currency_id?: string;
  taxes_id?: string;
  cancel_detail_group?: string;
  cancel_detail_code?: string;
  cancel_detail_description?: string;
  cancel_detail_requested_by?: string;
  cancel_detail_date?: string;
  cancel_detail_application_id?: string;
  mediations?: any[];
  order_request_return?: any;
  order_request_change?: any;
  full_data?: any;
  ml_date_created?: string;
  ml_last_updated?: string;
  created_at: string;
  updated_at: string;
}

export default function OrdersPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Estados principais
  const [orders, setOrders] = useState<MercadoLivreOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState("database");
  
  // Estados de filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  
  // Modal de detalhes
  const [selectedOrder, setSelectedOrder] = useState<MercadoLivreOrder | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Estados de paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const [ordersPerPage] = useState(20);
  
  // Estados de ordenação
  const [sortField, setSortField] = useState("date_created");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Carregar pedidos do banco de dados
  const loadOrdersFromDb = async () => {
    setLoading(true);
    try {
      const params: any = {
        limit: ordersPerPage,
        offset: (currentPage - 1) * ordersPerPage
      };
      
      if (statusFilter && statusFilter !== "all") params.status = statusFilter;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      
      console.log("=== CARREGANDO PEDIDOS DO BANCO ===");
      const response = await mercadoLivreApi.getOrdersFromDb(params);
      console.log("Resposta da API:", response);
      
      if (response.success) {
        setOrders(response.orders || []);
        setTotalOrders(response.total || 0);
        console.log("Pedidos carregados:", response.orders?.length || 0);
      } else {
        setOrders([]);
        setTotalOrders(0);
        console.log("Nenhum pedido encontrado");
      }
    } catch (error: any) {
      console.error("Erro ao carregar pedidos:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar pedidos do banco de dados",
        variant: "destructive",
      });
      setOrders([]);
      setTotalOrders(0);
    } finally {
      setLoading(false);
    }
  };

  // Sincronizar pedidos do Mercado Livre
  const syncOrders = async () => {
    setSyncing(true);
    try {
      console.log("=== SINCRONIZANDO PEDIDOS ===");
      const response = await mercadoLivreApi.syncOrders(30); // Últimos 30 dias
      console.log("Resposta da sincronização:", response);
      
      if (response.success) {
        const createdCount = response.created_count || 0;
        const updatedCount = response.updated_count || 0;
        const totalProcessed = response.total_orders || 0;
        
        toast({
          title: "Sincronização Concluída",
          description: `${totalProcessed} pedidos processados (${createdCount} novos, ${updatedCount} atualizados)`,
        });
        
        // Recarregar pedidos após sincronização
        await loadOrdersFromDb();
      } else {
        toast({
          title: "Erro na Sincronização",
          description: "Erro ao sincronizar pedidos",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Erro ao sincronizar pedidos:", error);
      toast({
        title: "Erro",
        description: "Erro ao sincronizar pedidos",
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  // Carregar pedidos quando a página carrega
  useEffect(() => {
    if (activeTab === "database") {
      loadOrdersFromDb();
    }
  }, [activeTab, currentPage, statusFilter, dateFrom, dateTo]);

  // Função para obter cor do status
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "paid":
        return "bg-green-100 text-green-800";
      case "confirmed":
        return "bg-blue-100 text-blue-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      case "payment_required":
        return "bg-yellow-100 text-yellow-800";
      case "payment_in_process":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Função para obter cor do feedback
  const getFeedbackColor = (rating?: string) => {
    switch (rating?.toLowerCase()) {
      case "positive":
        return "text-green-600";
      case "negative":
        return "text-red-600";
      case "neutral":
        return "text-yellow-600";
      default:
        return "text-gray-400";
    }
  };

  // Função para obter ícone do feedback
  const getFeedbackIcon = (rating?: string) => {
    switch (rating?.toLowerCase()) {
      case "positive":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "negative":
        return <XCircle className="h-4 w-4 text-red-600" />;
      case "neutral":
        return <Clock className="h-4 w-4 text-yellow-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  // Função para formatar data
  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Função para formatar valor monetário
  const formatCurrency = (value: number, currency: string = "BRL") => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: currency,
    }).format(value);
  };

  // Função para abrir modal de detalhes
  const openOrderDetails = (order: MercadoLivreOrder) => {
    setSelectedOrder(order);
    setIsModalOpen(true);
  };

  // Função para fechar modal
  const closeOrderDetails = () => {
    setSelectedOrder(null);
    setIsModalOpen(false);
  };

  // Função para obter ícone do status de envio
  const getShippingIcon = (status?: string) => {
    switch (status?.toLowerCase()) {
      case "delivered":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "shipped":
        return <Truck className="h-4 w-4 text-blue-600" />;
      case "ready_to_ship":
        return <Truck className="h-4 w-4 text-orange-600" />;
      case "cancelled":
        return <X className="h-4 w-4 text-red-600" />;
      default:
        return <Truck className="h-4 w-4 text-gray-400" />;
    }
  };

  // Função para obter ícone do método de pagamento
  const getPaymentIcon = (type?: string) => {
    switch (type?.toLowerCase()) {
      case "credit_card":
        return <CreditCard className="h-4 w-4 text-blue-600" />;
      case "debit_card":
        return <CreditCard className="h-4 w-4 text-green-600" />;
      case "account_money":
        return <DollarSign className="h-4 w-4 text-purple-600" />;
      default:
        return <CreditCard className="h-4 w-4 text-gray-400" />;
    }
  };

  // Calcular total de páginas
  const totalPages = Math.ceil(totalOrders / ordersPerPage);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Pedidos</h1>
          <p className="text-gray-600 mt-1">
            Gerencie e acompanhe seus pedidos do Mercado Livre
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={syncOrders}
            disabled={syncing}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {syncing ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            {syncing ? "Sincronizando..." : "Sincronizar"}
          </Button>
        </div>
      </div>

      {/* Abas */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="database">Banco de Dados</TabsTrigger>
          <TabsTrigger value="api">API Mercado Livre</TabsTrigger>
        </TabsList>

        {/* Aba Banco de Dados */}
        <TabsContent value="database" className="space-y-6 mt-6">
          {/* Filtros */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Filtros</CardTitle>
              <CardDescription>
                Filtre os pedidos por status, data e outros critérios
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="status-filter">Status</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos os status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os status</SelectItem>
                      <SelectItem value="paid">Pago</SelectItem>
                      <SelectItem value="confirmed">Confirmado</SelectItem>
                      <SelectItem value="cancelled">Cancelado</SelectItem>
                      <SelectItem value="payment_required">Pagamento Necessário</SelectItem>
                      <SelectItem value="payment_in_process">Pagamento em Processo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="date-from">Data Início</Label>
                  <Input
                    id="date-from"
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="date-to">Data Fim</Label>
                  <Input
                    id="date-to"
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="search">Buscar</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="search"
                      placeholder="ID do pedido, comprador..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Lista de Pedidos */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Pedidos ({totalOrders})</CardTitle>
              <CardDescription>
                Lista de pedidos sincronizados do Mercado Livre
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                  <span className="ml-2 text-gray-600">Carregando pedidos...</span>
                </div>
              ) : orders.length === 0 ? (
                <div className="text-center py-8">
                  <ShoppingCart className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-600 mb-2">
                    Nenhum pedido encontrado
                  </h3>
                  <p className="text-gray-500 mb-4">
                    {(statusFilter && statusFilter !== "all") || dateFrom || dateTo
                      ? "Nenhum pedido corresponde aos filtros aplicados."
                      : "Nenhum pedido foi sincronizado ainda. Clique em 'Sincronizar' para baixar os pedidos do Mercado Livre."}
                  </p>
                  {(!statusFilter || statusFilter === "all") && !dateFrom && !dateTo && (
                    <Button onClick={syncOrders} disabled={syncing}>
                      {syncing ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <RefreshCw className="h-4 w-4 mr-2" />
                      )}
                      Sincronizar Pedidos
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Tabela de Pedidos */}
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Comprador</TableHead>
                          <TableHead>Valor</TableHead>
                          <TableHead>Data</TableHead>
                          <TableHead>Envio</TableHead>
                          <TableHead>Pagamento</TableHead>
                          <TableHead>Feedback</TableHead>
                          <TableHead>Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {orders.map((order) => (
                          <TableRow key={order.id}>
                            <TableCell className="font-mono text-sm">
                              {order.order_id}
                            </TableCell>
                            <TableCell>
                              <Badge className={getStatusColor(order.status)}>
                                {order.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium">
                                  {order.buyer?.nickname || `${order.buyer?.first_name || ''} ${order.buyer?.last_name || ''}`.trim() || 'N/A'}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {order.buyer?.email || 'N/A'}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="font-medium">
                                {formatCurrency(order.total_amount, order.currency_id)}
                              </div>
                              {order.paid_amount && order.paid_amount !== order.total_amount && (
                                <div className="text-sm text-gray-500">
                                  Pago: {formatCurrency(order.paid_amount, order.currency_id)}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                <div>Criado: {formatDate(order.date_created)}</div>
                                {order.date_closed && (
                                  <div className="text-gray-500">
                                    Fechado: {formatDate(order.date_closed)}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {getShippingIcon(order.shipping.status)}
                                <div className="text-sm">
                                  <div>{order.shipping.status || "N/A"}</div>
                                  {order.shipping.cost && (
                                    <div className="text-gray-500">
                                      {formatCurrency(order.shipping.cost, order.currency_id)}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {getPaymentIcon(order.payment?.type)}
                                <div className="text-sm">
                                  <div>{order.payment?.type || "N/A"}</div>
                                  {order.payment?.installments && order.payment.installments > 1 && (
                                    <div className="text-gray-500">
                                      {order.payment.installments}x
                                    </div>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {order.feedback?.sale?.rating && (
                                  <div className="flex items-center gap-1">
                                    <MessageSquare className="h-4 w-4" />
                                    <span className={`text-sm ${getFeedbackColor(order.feedback.sale.rating)}`}>
                                      {order.feedback.sale.rating}
                                    </span>
                                  </div>
                                )}
                                {order.feedback?.purchase?.rating && (
                                  <div className="flex items-center gap-1">
                                    <User className="h-4 w-4" />
                                    <span className={`text-sm ${getFeedbackColor(order.feedback.purchase.rating)}`}>
                                      {order.feedback.purchase.rating}
                                    </span>
                                  </div>
                                )}
                                {!order.feedback.sale.rating && !order.feedback.purchase.rating && (
                                  <span className="text-gray-400 text-sm">N/A</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openOrderDetails(order)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Paginação */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-500">
                        Mostrando {((currentPage - 1) * ordersPerPage) + 1} a {Math.min(currentPage * ordersPerPage, totalOrders)} de {totalOrders} pedidos
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          disabled={currentPage === 1}
                        >
                          Anterior
                        </Button>
                        <span className="text-sm">
                          Página {currentPage} de {totalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                          disabled={currentPage === totalPages}
                        >
                          Próxima
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba API Mercado Livre */}
        <TabsContent value="api" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">API Mercado Livre</CardTitle>
              <CardDescription>
                Busca direta na API do Mercado Livre (sem salvar no banco)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <AlertTriangle className="h-16 w-16 text-yellow-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-600 mb-2">
                  Funcionalidade em Desenvolvimento
                </h3>
                <p className="text-gray-500">
                  A busca direta na API do Mercado Livre será implementada em breve.
                  Por enquanto, use a aba "Banco de Dados" para visualizar os pedidos sincronizados.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal de Detalhes do Pedido */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Pedido</DialogTitle>
            <DialogDescription>
              Informações completas do pedido {selectedOrder?.order_id}
            </DialogDescription>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="space-y-6">
              {/* Informações Básicas */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Informações Básicas</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-500">ID do Pedido</Label>
                    <p className="text-sm">{selectedOrder.order_id}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Status</Label>
                    <Badge className={getStatusColor(selectedOrder.status)}>
                      {selectedOrder.status}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Data de Criação</Label>
                    <p className="text-sm">{formatDate(selectedOrder.date_created)}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Data de Fechamento</Label>
                    <p className="text-sm">{selectedOrder.date_closed ? formatDate(selectedOrder.date_closed) : "N/A"}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Valor Total</Label>
                    <p className="text-sm font-semibold">{formatCurrency(selectedOrder.total_amount, selectedOrder.currency_id)}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Valor Pago</Label>
                    <p className="text-sm">{selectedOrder.paid_amount ? formatCurrency(selectedOrder.paid_amount, selectedOrder.currency_id) : "N/A"}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Informações do Comprador */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Comprador</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Informações básicas */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Nickname</Label>
                      <p className="text-sm">{selectedOrder.buyer_nickname || "N/A"}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Email</Label>
                      <p className="text-sm">{selectedOrder.buyer_email || "N/A"}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Nome</Label>
                      <p className="text-sm">{selectedOrder.buyer_first_name && selectedOrder.buyer_last_name 
                        ? `${selectedOrder.buyer_first_name} ${selectedOrder.buyer_last_name}` 
                        : "N/A"}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Telefone</Label>
                      <p className="text-sm">{selectedOrder.buyer_phone || "N/A"}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Telefone Alternativo</Label>
                      <p className="text-sm">{selectedOrder.buyer_alternative_phone || "N/A"}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Tipo de Usuário</Label>
                      <p className="text-sm">{selectedOrder.buyer_user_type || "N/A"}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">País</Label>
                      <p className="text-sm">{selectedOrder.buyer_country_id || "N/A"}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Site</Label>
                      <p className="text-sm">{selectedOrder.buyer_site_id || "N/A"}</p>
                    </div>
                  </div>
                  
                  {/* Endereço */}
                  {(selectedOrder.buyer_address_state || selectedOrder.buyer_address_city || selectedOrder.buyer_address_address) && (
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Endereço</Label>
                      <div className="text-sm">
                        {selectedOrder.buyer_address_address && <p>{selectedOrder.buyer_address_address}</p>}
                        {selectedOrder.buyer_address_city && selectedOrder.buyer_address_state && (
                          <p>{selectedOrder.buyer_address_city}, {selectedOrder.buyer_address_state}</p>
                        )}
                        {selectedOrder.buyer_address_zip_code && <p>CEP: {selectedOrder.buyer_address_zip_code}</p>}
                      </div>
                    </div>
                  )}
                  
                  {/* Identificação */}
                  {(selectedOrder.buyer_identification_type || selectedOrder.buyer_identification_number) && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Tipo de Documento</Label>
                        <p className="text-sm">{selectedOrder.buyer_identification_type || "N/A"}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Número do Documento</Label>
                        <p className="text-sm">{selectedOrder.buyer_identification_number || "N/A"}</p>
                      </div>
                    </div>
                  )}
                  
                  {/* Perfil */}
                  {selectedOrder.buyer_permalink && (
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Perfil</Label>
                      <a 
                        href={selectedOrder.buyer_permalink} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline"
                      >
                        Ver perfil no Mercado Livre
                      </a>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Informações de Envio */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Envio</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Status e informações básicas */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Status</Label>
                      <div className="flex items-center gap-2">
                        {getShippingIcon(selectedOrder.shipping_status)}
                        <span className="text-sm">{selectedOrder.shipping_status || "N/A"}</span>
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Substatus</Label>
                      <p className="text-sm">{selectedOrder.shipping_substatus || "N/A"}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">ID do Envio</Label>
                      <p className="text-sm">{selectedOrder.shipping_id || "N/A"}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Custo do Envio</Label>
                      <p className="text-sm">{selectedOrder.shipping_cost ? formatCurrency(selectedOrder.shipping_cost, selectedOrder.currency_id) : "N/A"}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Número de Rastreamento</Label>
                      <p className="text-sm">{selectedOrder.shipping_tracking_number || "N/A"}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Método de Rastreamento</Label>
                      <p className="text-sm">{selectedOrder.shipping_tracking_method || "N/A"}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Valor Declarado</Label>
                      <p className="text-sm">{selectedOrder.shipping_declared_value ? formatCurrency(selectedOrder.shipping_declared_value, selectedOrder.currency_id) : "N/A"}</p>
                    </div>
                  </div>
                  
                  {/* Endereço de origem */}
                  {(selectedOrder.shipping_origin_state || selectedOrder.shipping_origin_city || selectedOrder.shipping_origin_address) && (
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Endereço de Origem</Label>
                      <div className="text-sm">
                        {selectedOrder.shipping_origin_address && <p>{selectedOrder.shipping_origin_address}</p>}
                        {selectedOrder.shipping_origin_city && selectedOrder.shipping_origin_state && (
                          <p>{selectedOrder.shipping_origin_city}, {selectedOrder.shipping_origin_state}</p>
                        )}
                        {selectedOrder.shipping_origin_zip_code && <p>CEP: {selectedOrder.shipping_origin_zip_code}</p>}
                      </div>
                    </div>
                  )}
                  
                  {/* Endereço de destino */}
                  {(selectedOrder.shipping_destination_state || selectedOrder.shipping_destination_city || selectedOrder.shipping_destination_address) && (
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Endereço de Destino</Label>
                      <div className="text-sm">
                        {selectedOrder.shipping_destination_receiver_name && (
                          <p className="font-medium">Destinatário: {selectedOrder.shipping_destination_receiver_name}</p>
                        )}
                        {selectedOrder.shipping_destination_address && <p>{selectedOrder.shipping_destination_address}</p>}
                        {selectedOrder.shipping_destination_city && selectedOrder.shipping_destination_state && (
                          <p>{selectedOrder.shipping_destination_city}, {selectedOrder.shipping_destination_state}</p>
                        )}
                        {selectedOrder.shipping_destination_zip_code && <p>CEP: {selectedOrder.shipping_destination_zip_code}</p>}
                        {selectedOrder.shipping_destination_receiver_phone && (
                          <p>Telefone: {selectedOrder.shipping_destination_receiver_phone}</p>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Dimensões */}
                  {(selectedOrder.shipping_dimensions_height || selectedOrder.shipping_dimensions_width || selectedOrder.shipping_dimensions_length || selectedOrder.shipping_dimensions_weight) && (
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Dimensões do Pacote</Label>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        {selectedOrder.shipping_dimensions_height && (
                          <div>
                            <span className="font-medium">Altura:</span> {selectedOrder.shipping_dimensions_height} cm
                          </div>
                        )}
                        {selectedOrder.shipping_dimensions_width && (
                          <div>
                            <span className="font-medium">Largura:</span> {selectedOrder.shipping_dimensions_width} cm
                          </div>
                        )}
                        {selectedOrder.shipping_dimensions_length && (
                          <div>
                            <span className="font-medium">Comprimento:</span> {selectedOrder.shipping_dimensions_length} cm
                          </div>
                        )}
                        {selectedOrder.shipping_dimensions_weight && (
                          <div>
                            <span className="font-medium">Peso:</span> {selectedOrder.shipping_dimensions_weight} kg
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Informações de Pagamento */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Pagamento</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Informações básicas */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Método</Label>
                      <p className="text-sm">{selectedOrder.payment_method_id || "N/A"}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Tipo</Label>
                      <p className="text-sm">{selectedOrder.payment_type || "N/A"}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Status</Label>
                      <p className="text-sm">{selectedOrder.payment_status || "N/A"}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Parcelas</Label>
                      <p className="text-sm">{selectedOrder.payment_installments || "N/A"}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Tipo de Operação</Label>
                      <p className="text-sm">{selectedOrder.payment_operation_type || "N/A"}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Código de Status</Label>
                      <p className="text-sm">{selectedOrder.payment_status_code || "N/A"}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Detalhe do Status</Label>
                      <p className="text-sm">{selectedOrder.payment_status_detail || "N/A"}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Código de Autorização</Label>
                      <p className="text-sm">{selectedOrder.payment_authorization_code || "N/A"}</p>
                    </div>
                  </div>
                  
                  {/* Valores financeiros */}
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Valores Financeiros</Label>
                    <div className="grid grid-cols-2 gap-4 text-sm mt-2">
                      {selectedOrder.payment_transaction_amount && (
                        <div>
                          <span className="font-medium">Valor da Transação:</span> {formatCurrency(selectedOrder.payment_transaction_amount, selectedOrder.currency_id)}
                        </div>
                      )}
                      {selectedOrder.payment_transaction_amount_refunded && (
                        <div>
                          <span className="font-medium">Valor Reembolsado:</span> {formatCurrency(selectedOrder.payment_transaction_amount_refunded, selectedOrder.currency_id)}
                        </div>
                      )}
                      {selectedOrder.payment_taxes_amount && (
                        <div>
                          <span className="font-medium">Impostos:</span> {formatCurrency(selectedOrder.payment_taxes_amount, selectedOrder.currency_id)}
                        </div>
                      )}
                      {selectedOrder.payment_coupon_amount && (
                        <div>
                          <span className="font-medium">Cupom:</span> {formatCurrency(selectedOrder.payment_coupon_amount, selectedOrder.currency_id)}
                        </div>
                      )}
                      {selectedOrder.payment_overpaid_amount && (
                        <div>
                          <span className="font-medium">Valor Pago em Excesso:</span> {formatCurrency(selectedOrder.payment_overpaid_amount, selectedOrder.currency_id)}
                        </div>
                      )}
                      {selectedOrder.payment_installment_amount && (
                        <div>
                          <span className="font-medium">Valor da Parcela:</span> {formatCurrency(selectedOrder.payment_installment_amount, selectedOrder.currency_id)}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Informações adicionais */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-500">ID do Coletor</Label>
                      <p className="text-sm">{selectedOrder.payment_collector_id || "N/A"}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">ID do Cartão</Label>
                      <p className="text-sm">{selectedOrder.payment_card_id || "N/A"}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">ID do Emissor</Label>
                      <p className="text-sm">{selectedOrder.payment_issuer_id || "N/A"}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">ID da Transação</Label>
                      <p className="text-sm">{selectedOrder.payment_transaction_order_id || "N/A"}</p>
                    </div>
                  </div>
                  
                  {/* Datas */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Data de Aprovação</Label>
                      <p className="text-sm">{selectedOrder.payment_date_approved ? formatDate(selectedOrder.payment_date_approved) : "N/A"}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Última Modificação</Label>
                      <p className="text-sm">{selectedOrder.payment_date_last_modified ? formatDate(selectedOrder.payment_date_last_modified) : "N/A"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Itens do Pedido */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Itens do Pedido</CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedOrder.order_items && selectedOrder.order_items.length > 0 ? (
                    <div className="space-y-4">
                      {selectedOrder.order_items.map((item: any, index: number) => (
                        <div key={index} className="border rounded-lg p-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label className="text-sm font-medium text-gray-500">Produto</Label>
                              <p className="text-sm font-semibold">{item.item?.title || "N/A"}</p>
                              <p className="text-xs text-gray-500">ID: {item.item?.id || "N/A"}</p>
                            </div>
                            <div>
                              <Label className="text-sm font-medium text-gray-500">Quantidade</Label>
                              <p className="text-sm">{item.quantity || "N/A"}</p>
                            </div>
                            <div>
                              <Label className="text-sm font-medium text-gray-500">Preço Unitário</Label>
                              <p className="text-sm">{item.unit_price ? formatCurrency(item.unit_price, item.currency_id) : "N/A"}</p>
                            </div>
                            <div>
                              <Label className="text-sm font-medium text-gray-500">Preço Total</Label>
                              <p className="text-sm font-semibold">
                                {item.unit_price && item.quantity 
                                  ? formatCurrency(item.unit_price * item.quantity, item.currency_id) 
                                  : "N/A"}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">Nenhum item encontrado</p>
                  )}
                </CardContent>
              </Card>

              {/* Feedback */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Feedback</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Avaliação da Venda</Label>
                    <div className="flex items-center gap-2">
                      {getFeedbackIcon(selectedOrder.feedback_sale_rating)}
                      <span className="text-sm">{selectedOrder.feedback_sale_rating || "N/A"}</span>
                    </div>
                    {selectedOrder.feedback_sale_fulfilled !== undefined && (
                      <p className="text-xs text-gray-500 mt-1">
                        Cumprido: {selectedOrder.feedback_sale_fulfilled ? "Sim" : "Não"}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Avaliação da Compra</Label>
                    <div className="flex items-center gap-2">
                      {getFeedbackIcon(selectedOrder.feedback_purchase_rating)}
                      <span className="text-sm">{selectedOrder.feedback_purchase_rating || "N/A"}</span>
                    </div>
                    {selectedOrder.feedback_purchase_fulfilled !== undefined && (
                      <p className="text-xs text-gray-500 mt-1">
                        Cumprido: {selectedOrder.feedback_purchase_fulfilled ? "Sim" : "Não"}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Informações Adicionais */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Informações Adicionais</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Contexto */}
                  {(selectedOrder.context_channel || selectedOrder.context_site || selectedOrder.context_flows) && (
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Contexto da Compra</Label>
                      <div className="grid grid-cols-2 gap-4 text-sm mt-2">
                        {selectedOrder.context_channel && (
                          <div>
                            <span className="font-medium">Canal:</span> {selectedOrder.context_channel}
                          </div>
                        )}
                        {selectedOrder.context_site && (
                          <div>
                            <span className="font-medium">Site:</span> {selectedOrder.context_site}
                          </div>
                        )}
                        {selectedOrder.context_flows && selectedOrder.context_flows.length > 0 && (
                          <div className="col-span-2">
                            <span className="font-medium">Fluxos:</span> {selectedOrder.context_flows.join(", ")}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Cupom */}
                  {(selectedOrder.coupon_id || selectedOrder.coupon_amount) && (
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Cupom Aplicado</Label>
                      <div className="grid grid-cols-2 gap-4 text-sm mt-2">
                        {selectedOrder.coupon_id && (
                          <div>
                            <span className="font-medium">ID do Cupom:</span> {selectedOrder.coupon_id}
                          </div>
                        )}
                        {selectedOrder.coupon_amount && (
                          <div>
                            <span className="font-medium">Valor do Cupom:</span> {formatCurrency(selectedOrder.coupon_amount, selectedOrder.currency_id)}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Impostos */}
                  {(selectedOrder.taxes_amount || selectedOrder.taxes_currency_id || selectedOrder.taxes_id) && (
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Impostos</Label>
                      <div className="grid grid-cols-2 gap-4 text-sm mt-2">
                        {selectedOrder.taxes_amount && (
                          <div>
                            <span className="font-medium">Valor:</span> {formatCurrency(selectedOrder.taxes_amount, selectedOrder.taxes_currency_id || selectedOrder.currency_id)}
                          </div>
                        )}
                        {selectedOrder.taxes_currency_id && (
                          <div>
                            <span className="font-medium">Moeda:</span> {selectedOrder.taxes_currency_id}
                          </div>
                        )}
                        {selectedOrder.taxes_id && (
                          <div>
                            <span className="font-medium">ID:</span> {selectedOrder.taxes_id}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Cancelamento */}
                  {(selectedOrder.cancel_detail_group || selectedOrder.cancel_detail_code || selectedOrder.cancel_detail_description) && (
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Detalhes do Cancelamento</Label>
                      <div className="text-sm mt-2 space-y-1">
                        {selectedOrder.cancel_detail_group && (
                          <div>
                            <span className="font-medium">Grupo:</span> {selectedOrder.cancel_detail_group}
                          </div>
                        )}
                        {selectedOrder.cancel_detail_code && (
                          <div>
                            <span className="font-medium">Código:</span> {selectedOrder.cancel_detail_code}
                          </div>
                        )}
                        {selectedOrder.cancel_detail_description && (
                          <div>
                            <span className="font-medium">Descrição:</span> {selectedOrder.cancel_detail_description}
                          </div>
                        )}
                        {selectedOrder.cancel_detail_requested_by && (
                          <div>
                            <span className="font-medium">Solicitado por:</span> {selectedOrder.cancel_detail_requested_by}
                          </div>
                        )}
                        {selectedOrder.cancel_detail_date && (
                          <div>
                            <span className="font-medium">Data:</span> {formatDate(selectedOrder.cancel_detail_date)}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Informações do pedido */}
                  <div className="grid grid-cols-2 gap-4">
                    {selectedOrder.comment && (
                      <div className="col-span-2">
                        <Label className="text-sm font-medium text-gray-500">Comentário</Label>
                        <p className="text-sm mt-1">{selectedOrder.comment}</p>
                      </div>
                    )}
                    {selectedOrder.pack_id && (
                      <div>
                        <Label className="text-sm font-medium text-gray-500">ID do Pacote</Label>
                        <p className="text-sm">{selectedOrder.pack_id}</p>
                      </div>
                    )}
                    {selectedOrder.pickup_id && (
                      <div>
                        <Label className="text-sm font-medium text-gray-500">ID de Retirada</Label>
                        <p className="text-sm">{selectedOrder.pickup_id}</p>
                      </div>
                    )}
                    {selectedOrder.fulfilled !== undefined && (
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Cumprido</Label>
                        <p className="text-sm">{selectedOrder.fulfilled ? "Sim" : "Não"}</p>
                      </div>
                    )}
                    {selectedOrder.manufacturing_ending_date && (
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Data de Fim de Fabricação</Label>
                        <p className="text-sm">{formatDate(selectedOrder.manufacturing_ending_date)}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Tags */}
              {selectedOrder.tags && selectedOrder.tags.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Tags</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {selectedOrder.tags.map((tag: string, index: number) => (
                        <Badge key={index} variant="secondary">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
