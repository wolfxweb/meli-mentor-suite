import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-light">
      <div className="text-center">
        <h1 className="mb-4 text-6xl font-bold bg-gradient-primary bg-clip-text text-transparent">404</h1>
        <p className="mb-8 text-xl text-muted-foreground">Oops! Página não encontrada</p>
        <a 
          href="/" 
          className="inline-flex items-center px-6 py-3 text-white bg-gradient-primary rounded-lg hover:opacity-90 transition-smooth"
        >
          Voltar ao Início
        </a>
      </div>
    </div>
  );
};

export default NotFound;
