#!/bin/bash

echo "🚀 Criando usuários específicos solicitados..."

API_URL="http://localhost:8000"

# Função para criar usuário
create_user() {
    local name="$1"
    local email="$2"
    local password="$3"
    local company_name="$4"
    local cnpj="$5"
    
    echo "📝 Criando usuário: $name ($email)"
    
    response=$(curl -s -X POST "$API_URL/api/auth/register" \
        -H "Content-Type: application/json" \
        -d "{
            \"name\": \"$name\",
            \"email\": \"$email\",
            \"password\": \"$password\",
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

# Usuários específicos solicitados
create_user "Admin FinanceML" "admin@financeml.com" "123456" "FinanceML LTDA" "12.345.678/0001-90"
create_user "Demo Empresa" "demo@empresa.com" "demo123" "Demo Empresa ME" "98.765.432/0001-10"
create_user "Teste Sistema" "teste@teste.com" "teste" "Teste Sistemas EIRELI" "11.222.333/0001-44"

echo "🎉 Usuários específicos criados!"
echo ""
echo "👥 Usuários disponíveis para login:"
echo "   • admin@financeml.com (senha: 123456) - FinanceML LTDA"
echo "   • demo@empresa.com (senha: demo123) - Demo Empresa ME"
echo "   • teste@teste.com (senha: teste) - Teste Sistemas EIRELI"
echo ""
echo "🌐 Acesse o sistema em: http://localhost:5173"









