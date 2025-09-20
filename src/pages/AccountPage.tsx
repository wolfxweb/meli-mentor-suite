import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  User, 
  Building, 
  Shield, 
  Link as LinkIcon,
  CheckCircle,
  AlertTriangle,
  Save,
  Unlink,
  ExternalLink,
  RefreshCw,
  Loader2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { mercadoLivreApi, IntegrationStatus, MercadoLivreUserInfo } from "@/services/mercadoLivreApi";

export const AccountPage = () => {
  const { user, updateUser, updateCompany } = useAuth();
  const { toast } = useToast();

  const [userForm, setUserForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [companyForm, setCompanyForm] = useState({
    name: user?.company.name || "",
    cnpj: user?.company.cnpj || "",
  });

  const [isLoading, setIsLoading] = useState(false);

  // Estados para integração Mercado Livre
  const [mlIntegration, setMlIntegration] = useState<IntegrationStatus | null>(null);
  const [mlUserInfo, setMlUserInfo] = useState<MercadoLivreUserInfo | null>(null);
  const [isConnectingML, setIsConnectingML] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);

  // Carregar status da integração ao montar o componente
  useEffect(() => {
    loadIntegrationStatus();
    
    // Verificar se há callback do OAuth2
    if (mercadoLivreApi.hasCallbackInUrl()) {
      handleOAuthCallback();
    }
  }, []);

  const loadIntegrationStatus = async () => {
    try {
      const status = await mercadoLivreApi.getIntegrationStatus();
      setMlIntegration(status);
    } catch (error) {
      console.error('Erro ao carregar status da integração:', error);
    }
  };

  const handleOAuthCallback = async () => {
    setIsConnectingML(true);
    try {
      const result = await mercadoLivreApi.processCallback();
      setMlUserInfo(result.user_info);
      
      toast({
        title: "Sucesso!",
        description: "Conta do Mercado Livre conectada com sucesso!",
      });
      
      // Limpar parâmetros da URL
      mercadoLivreApi.clearUrlParams();
      
      // Recarregar status da integração
      await loadIntegrationStatus();
      
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao conectar com o Mercado Livre",
        variant: "destructive",
      });
    } finally {
      setIsConnectingML(false);
    }
  };

  const handleConnectMercadoLivre = async () => {
    setIsConnectingML(true);
    try {
      await mercadoLivreApi.initiateOAuthFlow();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao iniciar conexão com Mercado Livre",
        variant: "destructive",
      });
      setIsConnectingML(false);
    }
  };

  const handleDisconnectML = async () => {
    try {
      await mercadoLivreApi.disconnectIntegration();
      setMlIntegration({ connected: false });
      setMlUserInfo(null);
      
      toast({
        title: "Conta desconectada",
        description: "Sua conta do Mercado Livre foi desconectada com sucesso",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao desconectar conta do Mercado Livre",
        variant: "destructive",
      });
    }
  };

  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    try {
      const result = await mercadoLivreApi.testConnection();
      
      if (result.status === 'success') {
        setMlUserInfo(result.user_info || null);
        toast({
          title: "Conexão OK",
          description: "Conexão com Mercado Livre funcionando perfeitamente!",
        });
      } else {
        toast({
          title: "Problema na conexão",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Erro no teste",
        description: "Erro ao testar conexão com Mercado Livre",
        variant: "destructive",
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleRefreshToken = async () => {
    try {
      await mercadoLivreApi.refreshToken();
      await loadIntegrationStatus();
      
      toast({
        title: "Token renovado",
        description: "Token de acesso renovado com sucesso!",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao renovar token de acesso",
        variant: "destructive",
      });
    }
  };

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validate passwords if changing
      if (userForm.newPassword) {
        if (userForm.newPassword !== userForm.confirmPassword) {
          toast({
            title: "Erro",
            description: "As senhas não conferem",
            variant: "destructive",
          });
          return;
        }
      }

      updateUser({
        name: userForm.name,
        email: userForm.email,
      });

      toast({
        title: "Sucesso",
        description: "Dados do usuário atualizados com sucesso",
      });

      // Clear password fields
      setUserForm(prev => ({
        ...prev,
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      }));

    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao atualizar dados do usuário",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompanySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      updateCompany(companyForm);
      toast({
        title: "Sucesso",
        description: "Dados da empresa atualizados com sucesso",
      });
    } catch (error) {
      toast({
        title: "Erro", 
        description: "Erro ao atualizar dados da empresa",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          Minha Conta
        </h1>
        <p className="text-muted-foreground">
          Gerencie suas informações pessoais e configurações da empresa
        </p>
      </div>

      <Tabs defaultValue="user" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="user" className="flex items-center space-x-2">
            <User className="w-4 h-4" />
            <span>Usuário</span>
          </TabsTrigger>
          <TabsTrigger value="company" className="flex items-center space-x-2">
            <Building className="w-4 h-4" />
            <span>Empresa</span>
          </TabsTrigger>
          <TabsTrigger value="integrations" className="flex items-center space-x-2">
            <LinkIcon className="w-4 h-4" />
            <span>Integrações</span>
          </TabsTrigger>
        </TabsList>

        {/* User Tab */}
        <TabsContent value="user">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Personal Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="w-5 h-5" />
                  <span>Informações Pessoais</span>
                </CardTitle>
                <CardDescription>
                  Atualize seus dados pessoais
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleUserSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome Completo</Label>
                    <Input
                      id="name"
                      value={userForm.name}
                      onChange={(e) => setUserForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Seu nome completo"
                      disabled={isLoading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail</Label>
                    <Input
                      id="email"
                      type="email"
                      value={userForm.email}
                      onChange={(e) => setUserForm(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="seu@email.com"
                      disabled={isLoading}
                    />
                  </div>

                  <Button type="submit" disabled={isLoading} className="w-full">
                    <Save className="w-4 h-4 mr-2" />
                    Salvar Informações
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Password Change */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="w-5 h-5" />
                  <span>Alterar Senha</span>
                </CardTitle>
                <CardDescription>
                  Mantenha sua conta segura
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleUserSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Senha Atual</Label>
                    <Input
                      id="currentPassword"
                      type="password"
                      value={userForm.currentPassword}
                      onChange={(e) => setUserForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                      placeholder="Digite sua senha atual"
                      disabled={isLoading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="newPassword">Nova Senha</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={userForm.newPassword}
                      onChange={(e) => setUserForm(prev => ({ ...prev, newPassword: e.target.value }))}
                      placeholder="Digite a nova senha"
                      disabled={isLoading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={userForm.confirmPassword}
                      onChange={(e) => setUserForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      placeholder="Confirme a nova senha"
                      disabled={isLoading}
                    />
                  </div>

                  <Button type="submit" disabled={isLoading} className="w-full">
                    <Save className="w-4 h-4 mr-2" />
                    Alterar Senha
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Company Tab */}
        <TabsContent value="company">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Building className="w-5 h-5" />
                <span>Dados da Empresa</span>
              </CardTitle>
              <CardDescription>
                Informações da sua empresa registrada
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCompanySubmit} className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Nome da Empresa</Label>
                    <Input
                      id="companyName"
                      value={companyForm.name}
                      onChange={(e) => setCompanyForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Nome da empresa"
                      disabled={isLoading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="companyCnpj">CNPJ</Label>
                    <Input
                      id="companyCnpj"
                      value={companyForm.cnpj}
                      onChange={(e) => setCompanyForm(prev => ({ ...prev, cnpj: e.target.value }))}
                      placeholder="12.345.678/0001-90"
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <Button type="submit" disabled={isLoading}>
                  <Save className="w-4 h-4 mr-2" />
                  Salvar Dados da Empresa
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Integrations Tab */}
        <TabsContent value="integrations">
          <div className="space-y-6">
            {/* Mercado Livre Integration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <LinkIcon className="w-5 h-5" />
                  <span>Mercado Livre</span>
                  {mlIntegration?.connected ? (
                    <Badge className="bg-success text-success-foreground">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Conectado
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      Desconectado
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  Integração com sua conta do Mercado Livre para sincronização de produtos e pedidos
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isConnectingML ? (
                  <Alert>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <AlertDescription>
                      Conectando com o Mercado Livre...
                    </AlertDescription>
                  </Alert>
                ) : mlIntegration?.connected ? (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      {mlUserInfo ? (
                        <>
                          Conectado como: <strong>{mlUserInfo.nickname}</strong> ({mlUserInfo.email})
                          <br />
                          Token expira em: {mlIntegration.expires_at ? new Date(mlIntegration.expires_at).toLocaleString('pt-BR') : 'N/A'}
                        </>
                      ) : (
                        'Sua conta está conectada e sincronizando normalmente.'
                      )}
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Nenhuma integração ativa. Conecte sua conta do Mercado Livre para começar a sincronizar produtos e pedidos.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">Status da Conexão</p>
                    <p className="text-sm text-muted-foreground">
                      {mlIntegration?.connected 
                        ? "Produtos e pedidos sendo sincronizados automaticamente"
                        : "Conecte sua conta para começar a sincronização"
                      }
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    {mlIntegration?.connected ? (
                      <>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={handleTestConnection}
                          disabled={isTestingConnection}
                        >
                          {isTestingConnection ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <CheckCircle className="w-4 h-4 mr-2" />
                          )}
                          Testar
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={handleRefreshToken}
                        >
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Renovar Token
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={handleDisconnectML}
                        >
                          <Unlink className="w-4 h-4 mr-2" />
                          Desconectar
                        </Button>
                      </>
                    ) : (
                      <Button 
                        onClick={handleConnectMercadoLivre}
                        disabled={isConnectingML}
                        className="bg-primary hover:bg-primary-hover"
                      >
                        {isConnectingML ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <ExternalLink className="w-4 h-4 mr-2" />
                        )}
                        Conectar Mercado Livre
                      </Button>
                    )}
                  </div>
                </div>

                {mlIntegration?.connected && (
                  <>
                    <Separator />

                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="text-center p-4 border rounded-lg">
                        <p className="text-2xl font-bold text-primary">
                          {mlUserInfo?.id ? '✓' : '-'}
                        </p>
                        <p className="text-sm text-muted-foreground">Conta Verificada</p>
                      </div>
                      <div className="text-center p-4 border rounded-lg">
                        <p className="text-2xl font-bold text-secondary">
                          {mlIntegration.expires_at ? 
                            Math.ceil((new Date(mlIntegration.expires_at).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) + ' dias' : 
                            '-'
                          }
                        </p>
                        <p className="text-sm text-muted-foreground">Token Válido</p>
                      </div>
                      <div className="text-center p-4 border rounded-lg">
                        <p className="text-2xl font-bold text-success">
                          {mlIntegration.is_active ? '100%' : '0%'}
                        </p>
                        <p className="text-sm text-muted-foreground">Status Ativo</p>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Future Integrations */}
            <Card className="opacity-60">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <LinkIcon className="w-5 h-5" />
                  <span>Outras Integrações</span>
                  <Badge variant="secondary">Em Breve</Badge>
                </CardTitle>
                <CardDescription>
                  Novas integrações estarão disponíveis em breve
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <span className="font-medium">Shopee</span>
                    <Badge variant="secondary">Em Desenvolvimento</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <span className="font-medium">Amazon</span>
                    <Badge variant="secondary">Em Desenvolvimento</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <span className="font-medium">Magazine Luiza</span>
                    <Badge variant="secondary">Em Desenvolvimento</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};