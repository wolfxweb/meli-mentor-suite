import { useState } from "react";
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
  Unlink
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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

  const handleDisconnectML = () => {
    toast({
      title: "Conta desconectada",
      description: "Sua conta do Mercado Livre foi desconectada com sucesso",
    });
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
                  <Badge className="bg-success text-success-foreground">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Conectado
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Integração com sua conta do Mercado Livre para sincronização de produtos e pedidos
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Sua conta está conectada e sincronizando normalmente. 
                    Última sincronização: há 5 minutos
                  </AlertDescription>
                </Alert>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">Status da Conexão</p>
                    <p className="text-sm text-muted-foreground">
                      Produtos e pedidos sendo sincronizados automaticamente
                    </p>
                  </div>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={handleDisconnectML}
                  >
                    <Unlink className="w-4 h-4 mr-2" />
                    Desconectar
                  </Button>
                </div>

                <Separator />

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="text-center p-4 border rounded-lg">
                    <p className="text-2xl font-bold text-primary">156</p>
                    <p className="text-sm text-muted-foreground">Produtos Sincronizados</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <p className="text-2xl font-bold text-secondary">89</p>
                    <p className="text-sm text-muted-foreground">Pedidos Este Mês</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <p className="text-2xl font-bold text-success">100%</p>
                    <p className="text-sm text-muted-foreground">Taxa de Sincronização</p>
                  </div>
                </div>
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