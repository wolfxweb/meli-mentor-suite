const API_BASE_URL = 'http://localhost:8000';

export interface User {
  id: number;
  name: string;
  email: string;
  company: {
    id: number;
    name: string;
    cnpj: string;
  };
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  company_name: string;
  company_cnpj: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
}

class ApiService {
  private baseURL: string;
  private token: string | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    this.token = localStorage.getItem('auth_token');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    
    this.token = response.access_token;
    localStorage.setItem('auth_token', this.token);
    
    return response;
  }

  async register(userData: RegisterRequest): Promise<User> {
    return this.request<User>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async getCurrentUser(): Promise<User> {
    return this.request<User>('/api/auth/me');
  }

  async updateUser(name: string): Promise<User> {
    return this.request<User>('/api/users/me', {
      method: 'PUT',
      body: JSON.stringify({ name }),
    });
  }

  async updateCompany(companyData: { company_name?: string; company_cnpj?: string }): Promise<User['company']> {
    return this.request<User['company']>('/api/users/company', {
      method: 'PUT',
      body: JSON.stringify(companyData),
    });
  }

  logout(): void {
    this.token = null;
    localStorage.removeItem('auth_token');
  }

  isAuthenticated(): boolean {
    return !!this.token;
  }
}

export const apiService = new ApiService(API_BASE_URL);

