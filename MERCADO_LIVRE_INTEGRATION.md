# Integração com Mercado Livre

## Visão Geral

Este documento descreve a implementação completa da integração OAuth2 com a API do Mercado Livre, permitindo que usuários conectem suas contas do Mercado Livre ao sistema de gestão de marketplace.

## Funcionalidades Implementadas

### Backend (FastAPI)

#### 1. Modelos de Dados
- **MercadoLivreIntegration**: Tabela para armazenar tokens e informações de integração
- Campos: `access_token`, `refresh_token`, `expires_at`, `user_id`, `is_active`, etc.

#### 2. Endpoints da API
- `GET /api/mercado-livre/authorization-url`: Gera URL de autorização
- `POST /api/mercado-livre/callback`: Processa callback OAuth2
- `GET /api/mercado-livre/status`: Verifica status da integração
- `POST /api/mercado-livre/refresh`: Renova token de acesso
- `DELETE /api/mercado-livre/disconnect`: Desconecta integração
- `GET /api/mercado-livre/test-connection`: Testa conexão

#### 3. Serviço de Integração
- **MercadoLivreService**: Classe para gerenciar comunicação com API do ML
- Métodos para trocar código por token, renovar tokens, obter dados do usuário

### Frontend (React/TypeScript)

#### 1. Serviço de API
- **mercadoLivreApi**: Cliente para comunicação com endpoints do backend
- Métodos para iniciar fluxo OAuth2, processar callbacks, gerenciar integração

#### 2. Interface de Usuário
- **AccountPage**: Página de conta com aba "Integrações"
- Interface completa para conectar/desconectar conta do Mercado Livre
- Indicadores de status, informações do usuário, testes de conexão

## Fluxo de Autenticação OAuth2

### 1. Inicialização
```typescript
// Usuário clica em "Conectar Mercado Livre"
await mercadoLivreApi.initiateOAuthFlow();
```

### 2. Autorização
- Usuário é redirecionado para Mercado Livre
- Autoriza a aplicação
- Mercado Livre redireciona de volta com código

### 3. Troca de Código por Token
```typescript
// Backend processa callback
const tokenResponse = await mercado_livre_service.exchange_code_for_token(code);
```

### 4. Armazenamento
- Token é salvo no banco de dados
- Informações do usuário são armazenadas

## Configuração

### Variáveis de Ambiente (Backend)
```env
MERCADO_LIVRE_CLIENT_ID=seu-client-id
MERCADO_LIVRE_CLIENT_SECRET=seu-client-secret
MERCADO_LIVRE_REDIRECT_URI=http://localhost:5173/account/integration/callback
```

### Configuração no Mercado Livre
1. Acesse [Painel do Desenvolvedor](https://developers.mercadolivre.com.br/)
2. Crie uma nova aplicação
3. Configure a URL de callback: `http://localhost:5173/account/integration/callback`
4. Copie o Client ID e Client Secret

## Uso da Interface

### Conectar Conta
1. Acesse `/account` → aba "Integrações"
2. Clique em "Conectar Mercado Livre"
3. Autorize no Mercado Livre
4. Volte automaticamente para o sistema

### Gerenciar Integração
- **Status**: Visualize se está conectado
- **Testar**: Verifique se a conexão está funcionando
- **Renovar Token**: Atualize token de acesso
- **Desconectar**: Remova integração

## Recursos da Interface

### Indicadores Visuais
- Badge de status (Conectado/Desconectado)
- Informações do usuário conectado
- Data de expiração do token
- Alertas de status da conexão

### Ações Disponíveis
- Conectar/Desconectar
- Testar conexão
- Renovar token
- Visualizar informações da conta

## Segurança

### Proteções Implementadas
- Tokens armazenados com criptografia
- Validação de state no OAuth2
- Verificação de expiração de tokens
- Controle de acesso por empresa (multi-tenancy)

### Boas Práticas
- Nunca expor tokens no frontend
- Renovar tokens automaticamente
- Validar permissões antes de cada operação
- Log de todas as operações sensíveis

## Próximos Passos

### Funcionalidades Futuras
1. **Sincronização de Produtos**: Importar/exportar produtos
2. **Gestão de Pedidos**: Sincronizar pedidos do ML
3. **Relatórios**: Analytics de vendas
4. **Webhooks**: Notificações em tempo real

### Melhorias Técnicas
1. **Refresh Token Automático**: Renovar tokens em background
2. **Cache de Dados**: Otimizar consultas à API
3. **Retry Logic**: Tratamento de falhas de rede
4. **Rate Limiting**: Controle de requisições

## Troubleshooting

### Problemas Comuns
1. **Token Expirado**: Use botão "Renovar Token"
2. **Conexão Falhou**: Teste conexão e reconecte se necessário
3. **Erro de Callback**: Verifique URL de redirect configurada

### Logs
- Backend: Logs detalhados de todas as operações
- Frontend: Console logs para debugging

## Documentação da API

### Endpoints Principais
```
GET  /api/mercado-livre/authorization-url
POST /api/mercado-livre/callback
GET  /api/mercado-livre/status
POST /api/mercado-livre/refresh
DELETE /api/mercado-livre/disconnect
GET  /api/mercado-livre/test-connection
```

### Schemas
- `MercadoLivreIntegration`: Dados da integração
- `OAuth2TokenResponse`: Resposta do token
- `IntegrationStatus`: Status da conexão

## Suporte

Para dúvidas ou problemas:
1. Verifique logs do backend
2. Teste conexão manualmente
3. Valide configurações de ambiente
4. Consulte documentação oficial do Mercado Livre

