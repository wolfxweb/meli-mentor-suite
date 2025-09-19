import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, TrendingUp } from "lucide-react";

export const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || "/dashboard";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const success = await login(email, password);
      if (success) {
        navigate(from, { replace: true });
      } else {
        setError("Email ou senha incorretos");
      }
    } catch (err) {
      setError("Erro ao fazer login. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-light flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo and Header */}
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-gradient-primary p-3 rounded-2xl shadow-primary">
              <TrendingUp className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            FinanceML
          </h1>
          <p className="text-muted-foreground mt-2">
            Gestão financeira integrada ao Mercado Livre
          </p>
        </div>

        {/* Login Form */}
        <Card className="shadow-soft">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">Entrar</CardTitle>
            <CardDescription className="text-center">
              Digite suas credenciais para acessar sua conta
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Demo Credentials */}
            <div className="mb-6 p-4 bg-muted/50 rounded-lg border">
              <h3 className="font-medium text-sm mb-2 text-center">🧪 Credenciais para Teste</h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">admin@financeml.com</span>
                  <span className="font-mono">123456</span>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="h-6 px-2 text-xs"
                    onClick={() => {
                      setEmail("admin@financeml.com");
                      setPassword("123456");
                    }}
                    disabled={isLoading}
                  >
                    Usar
                  </Button>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">demo@empresa.com</span>
                  <span className="font-mono">demo123</span>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="h-6 px-2 text-xs"
                    onClick={() => {
                      setEmail("demo@empresa.com");
                      setPassword("demo123");
                    }}
                    disabled={isLoading}
                  >
                    Usar
                  </Button>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">teste@teste.com</span>
                  <span className="font-mono">teste</span>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="h-6 px-2 text-xs"
                    onClick={() => {
                      setEmail("teste@teste.com");
                      setPassword("teste");
                    }}
                    disabled={isLoading}
                  >
                    Usar
                  </Button>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Digite sua senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>

              <Button 
                type="submit" 
                className="w-full bg-gradient-primary hover:opacity-90 transition-smooth"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  "Entrar"
                )}
              </Button>

              {/* Quick Demo Login */}
              <Button 
                type="button"
                variant="secondary" 
                className="w-full"
                disabled={isLoading}
                onClick={async () => {
                  setEmail("admin@financeml.com");
                  setPassword("123456");
                  setIsLoading(true);
                  setError("");
                  
                  try {
                    const success = await login("admin@financeml.com", "123456");
                    if (success) {
                      navigate(from, { replace: true });
                    }
                  } catch (err) {
                    setError("Erro ao fazer login. Tente novamente.");
                  } finally {
                    setIsLoading(false);
                  }
                }}
              >
                🚀 Login Rápido (Demo)
              </Button>

              <div className="text-center">
                <Link 
                  to="/forgot-password" 
                  className="text-sm text-primary hover:underline"
                >
                  Esqueci minha senha
                </Link>
              </div>
            </form>

            <div className="mt-6 text-center text-sm">
              <span className="text-muted-foreground">Não tem uma conta? </span>
              <Link 
                to="/register" 
                className="text-primary hover:underline font-medium"
              >
                Criar conta
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};