#!/bin/bash

echo "🚀 Criando usuários de teste..."

API_URL="http://localhost:8000"

# Função para criar usuário
create_user() {
    local name="$1"
    local email="$2"
    local company_name="$3"
    local cnpj="$4"
    
    echo "📝 Criando usuário: $name ($email)"
    
    response=$(curl -s -X POST "$API_URL/api/auth/register" \
        -H "Content-Type: application/json" \
        -d "{
            \"name\": \"$name\",
            \"email\": \"$email\",
            \"password\": \"123456\",
            \"company_name\": \"$company_name\",
            \"company_cnpj\": \"$cnpj\"
        }")
    
    if echo "$response" | grep -q "id"; then
        echo "✅ Usuário criado com sucesso!"
    else
        echo "❌ Erro ao criar usuário: $response"
    fi
    echo ""
}

# Usuários de diferentes níveis/empresas
create_user "João Silva" "joao@techcorp.com" "TechCorp LTDA" "11.111.111/0001-11"
create_user "Maria Santos" "maria@inovacao.com" "Inovação Digital ME" "22.222.222/0001-22"
create_user "Pedro Oliveira" "pedro@startup.com" "StartupTech EIRELI" "33.333.333/0001-33"
create_user "Ana Costa" "ana@consultoria.com" "Consultoria Empresarial LTDA" "44.444.444/0001-44"
create_user "Carlos Ferreira" "carlos@marketplace.com" "Marketplace Solutions S.A." "55.555.555/0001-55"

echo "🎉 Usuários criados! Agora você pode fazer login com qualquer um deles usando a senha: 123456"
echo ""
echo "👥 Usuários disponíveis:"
echo "   • joao@techcorp.com (TechCorp LTDA)"
echo "   • maria@inovacao.com (Inovação Digital ME)"
echo "   • pedro@startup.com (StartupTech EIRELI)"
echo "   • ana@consultoria.com (Consultoria Empresarial LTDA)"
echo "   • carlos@marketplace.com (Marketplace Solutions S.A.)"
echo ""
echo "🌐 Acesse o sistema em: http://localhost:5173"

