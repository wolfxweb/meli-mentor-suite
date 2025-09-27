#!/bin/bash

echo "🚀 Deploying Gestão Marketplace to Production (adm.wolfx.com.br)..."

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

# Parar serviços de desenvolvimento se estiverem rodando
echo "🛑 Parando serviços de desenvolvimento..."
docker-compose down 2>/dev/null || true

# Build do frontend para produção
echo "🔨 Building frontend for production..."
npm run build

# Verificar se o build foi bem-sucedido
if [ ! -d "dist" ]; then
    echo "❌ Erro: Build do frontend falhou. Diretório 'dist' não foi criado."
    exit 1
fi

echo "✅ Frontend buildado com sucesso"

# Construir e iniciar os containers de produção
echo "🔨 Construindo e iniciando containers de produção..."
docker-compose -f docker-compose.prod.yml up --build -d

echo "⏳ Aguardando serviços ficarem prontos..."
sleep 15

# Verificar se os serviços estão rodando
echo "🔍 Verificando status dos serviços..."

if docker-compose -f docker-compose.prod.yml ps | grep -q "Up"; then
    echo "✅ Serviços de produção iniciados com sucesso!"
    echo ""
    echo "🌐 Aplicação disponível em:"
    echo "   https://adm.wolfx.com.br"
    echo ""
    echo "📊 Para ver os logs:"
    echo "   docker-compose -f docker-compose.prod.yml logs -f"
    echo ""
    echo "🛑 Para parar os serviços:"
    echo "   docker-compose -f docker-compose.prod.yml down"
    echo ""
    echo "🔄 Para atualizar a aplicação:"
    echo "   ./deploy.sh"
else
    echo "❌ Erro ao iniciar os serviços de produção. Verifique os logs:"
    echo "   docker-compose -f docker-compose.prod.yml logs"
    exit 1
fi

echo ""
echo "🎉 Deploy concluído com sucesso!"
echo "📋 Próximos passos:"
echo "   1. Configure o DNS do domínio adm.wolfx.com.br para apontar para este servidor"
echo "   2. Configure SSL/HTTPS (recomendado usar Let's Encrypt)"
echo "   3. Configure backup automático do banco de dados"
echo "   4. Configure monitoramento e logs"
