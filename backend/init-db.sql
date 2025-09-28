-- Script de inicialização do banco de dados
-- Este script será executado automaticamente quando o PostgreSQL iniciar

-- Criar usuário 'user' se não existir
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'user') THEN
        CREATE USER "user" WITH PASSWORD 'password';
    END IF;
END
$$;

-- Dar permissões de superuser ao usuário 'user'
ALTER USER "user" WITH SUPERUSER CREATEDB CREATEROLE REPLICATION BYPASSRLS;

-- Garantir que o usuário 'user' tenha acesso ao banco 'marketplace_db'
GRANT ALL PRIVILEGES ON DATABASE marketplace_db TO "user";

-- Conectar ao banco marketplace_db e dar permissões no schema public
\c marketplace_db;

-- Dar todas as permissões no schema public para o usuário 'user'
GRANT ALL ON SCHEMA public TO "user";
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO "user";
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO "user";
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO "user";

-- Configurar permissões padrão para futuras tabelas
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO "user";
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO "user";
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO "user";
