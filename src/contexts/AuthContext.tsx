import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface User {
  id: string;
  name: string;
  email: string;
  company: {
    id: string;
    name: string;
    cnpj: string;
  };
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (userData: RegisterData) => Promise<boolean>;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
  updateCompany: (companyData: { name: string; cnpj: string }) => void;
}

interface RegisterData {
  companyName: string;
  cnpj: string;
  responsibleName: string;
  email: string;
  password: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Check for saved user in localStorage on mount
    const savedUser = localStorage.getItem("saas-user");
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    // Mock authentication - in real app, this would be an API call
    if (email && password) {
      const mockUser: User = {
        id: "1",
        name: "João Silva",
        email: email,
        company: {
          id: "1",
          name: "Empresa Exemplo LTDA",
          cnpj: "12.345.678/0001-90"
        }
      };
      
      setUser(mockUser);
      localStorage.setItem("saas-user", JSON.stringify(mockUser));
      return true;
    }
    return false;
  };

  const register = async (userData: RegisterData): Promise<boolean> => {
    // Mock registration - in real app, this would be an API call
    const newUser: User = {
      id: Date.now().toString(),
      name: userData.responsibleName,
      email: userData.email,
      company: {
        id: Date.now().toString(),
        name: userData.companyName,
        cnpj: userData.cnpj
      }
    };
    
    setUser(newUser);
    localStorage.setItem("saas-user", JSON.stringify(newUser));
    return true;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("saas-user");
  };

  const updateUser = (userData: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...userData };
      setUser(updatedUser);
      localStorage.setItem("saas-user", JSON.stringify(updatedUser));
    }
  };

  const updateCompany = (companyData: { name: string; cnpj: string }) => {
    if (user) {
      const updatedUser = {
        ...user,
        company: { ...user.company, ...companyData }
      };
      setUser(updatedUser);
      localStorage.setItem("saas-user", JSON.stringify(updatedUser));
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    updateUser,
    updateCompany,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};