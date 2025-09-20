import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { apiService, User, LoginRequest, RegisterRequest } from "@/services/api";

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (userData: RegisterData) => Promise<boolean>;
  logout: () => void;
  updateUser: (userData: Partial<User>) => Promise<void>;
  updateCompany: (companyData: { name: string; cnpj: string }) => Promise<void>;
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for saved token and fetch user data
    const initializeAuth = async () => {
      if (apiService.isAuthenticated()) {
        try {
          const userData = await apiService.getCurrentUser();
          setUser(userData);
        } catch (error) {
          console.error('Failed to fetch user data:', error);
          apiService.logout();
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      await apiService.login({ email, password });
      const userData = await apiService.getCurrentUser();
      setUser(userData);
      return true;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    }
  };

  const register = async (userData: RegisterData): Promise<boolean> => {
    try {
      const newUser = await apiService.register({
        name: userData.responsibleName,
        email: userData.email,
        password: userData.password,
        company_name: userData.companyName,
        company_cnpj: userData.cnpj,
      });
      
      setUser(newUser);
      return true;
    } catch (error) {
      console.error('Registration failed:', error);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    apiService.logout();
  };

  const updateUser = async (userData: Partial<User>): Promise<void> => {
    if (!user) return;
    
    try {
      if (userData.name) {
        const updatedUser = await apiService.updateUser(userData.name);
        setUser(updatedUser);
      }
    } catch (error) {
      console.error('Failed to update user:', error);
      throw error;
    }
  };

  const updateCompany = async (companyData: { name: string; cnpj: string }): Promise<void> => {
    if (!user) return;
    
    try {
      const updatedCompany = await apiService.updateCompany({
        company_name: companyData.name,
        company_cnpj: companyData.cnpj,
      });
      
      setUser({
        ...user,
        company: updatedCompany,
      });
    } catch (error) {
      console.error('Failed to update company:', error);
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    loading,
    login,
    register,
    logout,
    updateUser,
    updateCompany,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};