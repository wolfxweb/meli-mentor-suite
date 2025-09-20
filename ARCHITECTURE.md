# Arquitetura do Sistema - Gestão Marketplace

## Visão Geral

O sistema agora é uma aplicação full-stack com backend FastAPI e frontend React, containerizada com Docker.

## Arquitetura de Containers

```
┌─────────────────────────────────────────────────────────────┐
│                    Docker Compose                           │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │  Frontend   │  │   Backend   │  │ PostgreSQL  │        │
│  │   React     │  │   FastAPI   │  │  Database   │        │
│  │  Port 5173  │  │  Port 8000  │  │  Port 5432  │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

## Stack Tecnológica

### Frontend
- **React 18** com TypeScript
- **Vite** para build e dev server
- **Tailwind CSS** para estilização
- **shadcn/ui** para componentes
- **React Router** para navegação
- **TanStack Query** para cache de dados

### Backend
- **FastAPI** (Python 3.11)
- **SQLAlchemy** para ORM
- **PostgreSQL** como banco de dados
- **JWT** para autenticação
- **Pydantic** para validação de dados
- **Alembic** para migrações (preparado)

### Infraestrutura
- **Docker** e **Docker Compose**
- **Nginx** para proxy reverso (produção)
- **PostgreSQL** containerizado

## Fluxo de Dados

### Autenticação
```
1. User faz login → Frontend
2. Frontend → POST /api/auth/login → Backend
3. Backend valida credenciais → PostgreSQL
4. Backend retorna JWT token → Frontend
5. Frontend armazena token e atualiza estado
```

### Requisições Autenticadas
```
1. Frontend adiciona Bearer token no header
2. Backend valida JWT
3. Backend consulta/atualiza PostgreSQL
4. Backend retorna dados → Frontend
```

## Estrutura de Arquivos

```
gestaomarketplace/
├── backend/                    # Backend FastAPI
│   ├── app/
│   │   ├── main.py            # Aplicação principal
│   │   ├── database.py        # Configuração DB
│   │   ├── models.py          # Modelos SQLAlchemy
│   │   ├── schemas.py         # Schemas Pydantic
│   │   ├── auth.py            # Autenticação JWT
│   │   └── routers/           # Endpoints da API
│   ├── Dockerfile
│   └── requirements.txt
├── src/                       # Frontend React
│   ├── components/            # Componentes UI
│   ├── contexts/              # Context API
│   ├── services/              # Serviços de API
│   └── pages/                 # Páginas da aplicação
├── docker-compose.yml         # Desenvolvimento
├── docker-compose.prod.yml    # Produção
├── nginx.conf                 # Proxy reverso
└── setup.sh                   # Script de setup
```

## Modelos de Dados

### User
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    company_id INTEGER REFERENCES companies(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### Company
```sql
CREATE TABLE companies (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    cnpj VARCHAR(18) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

## APIs Disponíveis

### Autenticação (`/api/auth`)
- `POST /register` - Registrar usuário e empresa
- `POST /login` - Fazer login
- `GET /me` - Dados do usuário atual

### Usuários (`/api/users`)
- `GET /me` - Dados do usuário
- `PUT /me` - Atualizar usuário
- `PUT /company` - Atualizar empresa

## Segurança

### JWT Authentication
- Tokens com expiração de 30 minutos
- Chave secreta configurável via ambiente
- Validação em todas as rotas protegidas

### CORS
- Configurado para aceitar requests do frontend
- URLs permitidas: localhost:3000, localhost:5173

### Validação de Dados
- Pydantic schemas para validação
- Sanitização de inputs
- Validação de email e CNPJ

## Deployment

### Desenvolvimento
```bash
docker-compose up --build
```

### Produção
```bash
docker-compose -f docker-compose.prod.yml up --build -d
```

### Nginx (Produção)
- Proxy reverso para frontend e backend
- SSL termination (configurar certificados)
- Load balancing (para múltiplas instâncias)

## Monitoramento

### Health Checks
- Backend: `GET /health`
- Database: `pg_isready`
- Containers: Docker health checks

### Logs
```bash
# Ver logs de todos os serviços
docker-compose logs -f

# Logs específicos
docker-compose logs -f backend
docker-compose logs -f db
```

## Escalabilidade

### Horizontal Scaling
- Múltiplas instâncias do backend
- Load balancer (Nginx)
- Database connection pooling

### Vertical Scaling
- Aumentar recursos dos containers
- Otimização de queries
- Cache (Redis - futuro)

## Próximas Melhorias

1. **Cache Redis** para sessões e dados frequentes
2. **Message Queue** (RabbitMQ/Celery) para tarefas assíncronas
3. **File Storage** (S3/MinIO) para uploads
4. **Monitoring** (Prometheus/Grafana)
5. **CI/CD Pipeline** com GitHub Actions
6. **SSL/TLS** com Let's Encrypt
7. **Backup automatizado** do banco de dados

