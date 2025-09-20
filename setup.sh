#!/bin/bash

echo "🚀 Configurando Gestão Marketplace com Backend FastAPI..."

# Verificar se o Docker está instalado
if ! command -v docker &> /dev/null; then
    echo "❌ Docker não está instalado. Por favor, instale o Docker primeiro."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose não está instalado. Por favor, instale o Docker Compose primeiro."
    exit 1
fi

echo "✅ Docker e Docker Compose encontrados"

# Criar arquivos de configuração se não existirem
if [ ! -f backend/.env ]; then
    echo "📝 Criando arquivo de configuração do backend..."
    cp backend/env.example backend/.env
    echo "✅ Arquivo backend/.env criado"
fi

if [ ! -f .env ]; then
    echo "📝 Criando arquivo de configuração do frontend..."
    cp env.example .env
    echo "✅ Arquivo .env criado"
fi

# Construir e iniciar os containers
echo "🔨 Construindo containers..."
docker-compose up --build -d

echo "⏳ Aguardando serviços ficarem prontos..."
sleep 10

# Verificar se os serviços estão rodando
echo "🔍 Verificando status dos serviços..."

if docker-compose ps | grep -q "Up"; then
    echo "✅ Serviços iniciados com sucesso!"
    echo ""
    echo "🌐 Acesse as aplicações:"
    echo "   Frontend: http://localhost:5173"
    echo "   Backend API: http://localhost:8000"
    echo "   API Docs: http://localhost:8000/docs"
    echo ""
    echo "📊 Para ver os logs:"
    echo "   docker-compose logs -f"
    echo ""
    echo "🛑 Para parar os serviços:"
    echo "   docker-compose down"
else
    echo "❌ Erro ao iniciar os serviços. Verifique os logs:"
    echo "   docker-compose logs"
fi

