const API_BASE_URL = 'http://localhost:8000';

export interface MercadoLivreIntegration {
  id: number;
  company_id: number;
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in: number;
  scope?: string;
  user_id?: string;
  expires_at: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MercadoLivreUserInfo {
  id: string;
  nickname: string;
  email: string;
  first_name: string;
  last_name: string;
}

export interface IntegrationStatus {
  connected: boolean;
  integration?: MercadoLivreIntegration;
  expires_at?: string;
  user_id?: string;
  message?: string;
}

export interface AuthorizationResponse {
  authorization_url: string;
  state: string;
}

class MercadoLivreApiService {
  private baseURL: string;
  private token: string | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    this.token = localStorage.getItem('auth_token');
  }

  // Método para atualizar o token
  updateToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
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

  async getAuthorizationUrl(redirectUri?: string): Promise<AuthorizationResponse> {
    const params = new URLSearchParams();
    if (redirectUri) {
      params.append('redirect_uri', redirectUri);
    }

    const queryString = params.toString();
    const endpoint = `/api/mercado-livre/authorization-url${queryString ? `?${queryString}` : ''}`;
    
    return this.request<AuthorizationResponse>(endpoint);
  }

  async handleCallback(code: string, state?: string): Promise<{
    message: string;
    integration_id: number;
    user_info: MercadoLivreUserInfo;
    expires_at: string;
  }> {
    const params = new URLSearchParams({ code });
    if (state) {
      params.append('state', state);
    }

    return this.request(`/api/mercado-livre/callback?${params.toString()}`);
  }

  async getIntegrationStatus(): Promise<IntegrationStatus> {
    return this.request<IntegrationStatus>('/api/mercado-livre/status');
  }

  async refreshToken(): Promise<{
    message: string;
    expires_at: string;
  }> {
    return this.request('/api/mercado-livre/refresh', {
      method: 'POST',
    });
  }

  async disconnectIntegration(): Promise<{
    message: string;
  }> {
    return this.request('/api/mercado-livre/disconnect', {
      method: 'DELETE',
    });
  }

  async testConnection(): Promise<{
    status: string;
    message: string;
    user_info?: MercadoLivreUserInfo;
  }> {
    return this.request('/api/mercado-livre/test-connection');
  }

  // Método para iniciar o fluxo OAuth2
  async initiateOAuthFlow(redirectUri?: string): Promise<void> {
    try {
      const { authorization_url } = await this.getAuthorizationUrl(redirectUri);
      
      // Redireciona para a página de autorização do Mercado Livre
      window.location.href = authorization_url;
    } catch (error) {
      console.error('Erro ao iniciar fluxo OAuth:', error);
      throw error;
    }
  }

  // Método para processar o callback do OAuth2
  async processCallback(): Promise<{
    message: string;
    integration_id: number;
    user_info: MercadoLivreUserInfo;
    expires_at: string;
  }> {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');

    if (!code) {
      throw new Error('Código de autorização não encontrado na URL');
    }

    return this.handleCallback(code, state || undefined);
  }

  // Método para verificar se há um callback pendente
  hasCallbackInUrl(): boolean {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.has('code');
  }

  // Método para limpar parâmetros da URL após processar callback
  clearUrlParams(): void {
    const url = new URL(window.location.href);
    url.search = '';
    window.history.replaceState({}, '', url.toString());
  }

  // Método para buscar produtos
  async getProducts(limit: number = 50, offset: number = 0): Promise<any> {
    return this.request(`/api/mercado-livre/products?limit=${limit}&offset=${offset}`);
  }

  // Método para buscar um produto específico por ID
  async getProduct(productId: string): Promise<any> {
    return this.request(`/api/mercado-livre/announcements/${productId}`);
  }

  // Método para atualizar custos de um produto
  async updateProductCosts(productId: string, costsData: any): Promise<any> {
    return this.request(`/api/mercado-livre/announcements/${productId}/costs`, {
      method: 'PUT',
      body: JSON.stringify(costsData),
    });
  }

  // Método para buscar concorrentes do catálogo
  async getCatalogCompetitors(catalogProductId: string): Promise<any[]> {
    return this.request(`/api/mercado-livre/catalog-competitors/${catalogProductId}`);
  }

  // Método para sincronizar concorrentes do catálogo
  async syncCatalogCompetitors(catalogProductId: string): Promise<any> {
    return this.request(`/api/mercado-livre/catalog-competitors/${catalogProductId}/sync`, {
      method: 'POST',
    });
  }
}

export const mercadoLivreApi = new MercadoLivreApiService(API_BASE_URL);