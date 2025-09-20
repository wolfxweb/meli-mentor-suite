# Gestão Marketplace - Backend FastAPI

Este projeto agora inclui um backend FastAPI completo com autenticação real e banco de dados PostgreSQL.

## Estrutura do Projeto

```
├── backend/                 # Backend FastAPI
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py         # Aplicação principal
│   │   ├── database.py     # Configuração do banco
│   │   ├── models.py       # Modelos SQLAlchemy
│   │   ├── schemas.py      # Schemas Pydantic
│   │   ├── auth.py         # Autenticação JWT
│   │   └── routers/        # Endpoints da API
│   │       ├── __init__.py
│   │       ├── auth.py     # Login/Register
│   │       └── users.py    # Gestão de usuários
│   ├── Dockerfile
│   ├── requirements.txt
│   └── env.example
├── docker-compose.yml      # Desenvolvimento
├── docker-compose.prod.yml # Produção
└── nginx.conf             # Proxy reverso
```

## Funcionalidades Implementadas

### Autenticação
- ✅ Login com email/senha
- ✅ Registro de usuários e empresas
- ✅ Autenticação JWT
- ✅ Proteção de rotas

### API Endpoints

#### Autenticação (`/api/auth`)
- `POST /register` - Registrar novo usuário e empresa
- `POST /login` - Fazer login
- `GET /me` - Obter dados do usuário atual

#### Usuários (`/api/users`)
- `GET /me` - Obter dados do usuário
- `PUT /me` - Atualizar dados do usuário
- `PUT /company` - Atualizar dados da empresa

## Como Executar

### Desenvolvimento

1. **Clone o repositório e navegue para o diretório:**
   ```bash
   cd gestaomarketplace
   ```

2. **Execute com Docker Compose:**
   ```bash
   docker-compose up --build
   ```

3. **Acesse as aplicações:**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8000
   - API Docs: http://localhost:8000/docs

### Produção

```bash
docker-compose -f docker-compose.prod.yml up --build -d
```

## Configuração do Banco de Dados

O sistema usa PostgreSQL com as seguintes configurações:

- **Host:** localhost (ou `db` no Docker)
- **Porta:** 5432
- **Database:** marketplace_db
- **Usuário:** user
- **Senha:** password

### Variáveis de Ambiente

Copie o arquivo de exemplo e configure as variáveis:

```bash
cp backend/env.example backend/.env
```

Principais variáveis:
- `DATABASE_URL` - URL de conexão com o PostgreSQL
- `SECRET_KEY` - Chave secreta para JWT (mude em produção)
- `ACCESS_TOKEN_EXPIRE_MINUTES` - Tempo de expiração do token

## Testando a API

### Registro de Usuário
```bash
curl -X POST "http://localhost:8000/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "João Silva",
    "email": "joao@empresa.com",
    "password": "senha123",
    "company_name": "Empresa Exemplo LTDA",
    "company_cnpj": "12.345.678/0001-90"
  }'
```

### Login
```bash
curl -X POST "http://localhost:8000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "joao@empresa.com",
    "password": "senha123"
  }'
```

### Acessar Dados do Usuário (com token)
```bash
curl -X GET "http://localhost:8000/api/auth/me" \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

## Frontend Atualizado

O frontend foi atualizado para usar as APIs reais:

- ✅ Serviço de API (`src/services/api.ts`)
- ✅ Contexto de autenticação atualizado
- ✅ Integração com JWT
- ✅ Loading states
- ✅ Tratamento de erros

### Variáveis de Ambiente do Frontend

Crie um arquivo `.env` na raiz do projeto:

```bash
cp env.example .env
```

Configure:
- `VITE_API_URL=http://localhost:8000` (desenvolvimento)
- `VITE_API_URL=http://localhost` (produção com nginx)

## Próximos Passos

Para expandir o sistema, considere implementar:

1. **Produtos e Marketplace:**
   - CRUD de produtos
   - Categorias
   - Upload de imagens

2. **Financeiro:**
   - Transações
   - Relatórios financeiros
   - Integração com gateways de pagamento

3. **Notificações:**
   - Sistema de notificações em tempo real
   - Email notifications

4. **Segurança:**
   - Rate limiting
   - Validação de dados mais robusta
   - Logs de auditoria

## Troubleshooting

### Erro de Conexão com Banco
- Verifique se o PostgreSQL está rodando
- Confirme as credenciais no arquivo `.env`

### Erro de CORS
- Verifique se as URLs do frontend estão configuradas no `main.py`
- Em produção, configure o nginx corretamente

### Token Expirado
- O token expira em 30 minutos por padrão
- Implemente refresh token para melhor UX

