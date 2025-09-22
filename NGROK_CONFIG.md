# 🔗 Configuração do Ngrok - Gestão Marketplace

## 📍 **O que é o Ngrok**
O ngrok expõe seu servidor local (localhost:8000) para a internet, permitindo que o Mercado Livre acesse suas URLs de callback.

## 🔄 **Quando o endereço muda**
Sempre que você reiniciar o ngrok, o endereço público muda. Exemplo:
- **Antes**: `https://9e22d3eedf0c.ngrok-free.app`
- **Depois**: `https://a7123785c466.ngrok-free.app`

## 📝 **Onde alterar o endereço**

### 1. **`backend/app/main.py`** (linhas 22-23)
```python
allow_origins=[
    "http://localhost:3000", 
    "http://localhost:5173",
    "https://NOVO_ENDERECO.ngrok-free.app",  # ← ALTERAR AQUI
    "https://ENDERECO_ANTERIOR.ngrok-free.app"  # ← E AQUI (se houver)
],
```

### 2. **`docker-compose.yml`** (linha 34)
```yaml
environment:
  - MERCADO_LIVRE_REDIRECT_URI=https://NOVO_ENDERECO.ngrok-free.app/api/mercado-livre/auth/callback
```

### 3. **`vite.config.ts`** (linhas 14-15)
```typescript
allowedHosts: [
  "localhost",
  "NOVO_ENDERECO.ngrok-free.app",  // ← ALTERAR AQUI
  ".ngrok-free.app"  // ← Este pode ficar (aceita qualquer subdomínio)
],
```

## 🚀 **Processo completo**

### 1. **Pegar o novo endereço**
Quando o ngrok reiniciar, você verá algo como:
```
Forwarding    https://abc123def456.ngrok-free.app -> http://localhost:8000
```

### 2. **Alterar nos 3 arquivos**
Substitua `NOVO_ENDERECO` pelo endereço que apareceu no ngrok.

### 3. **Reiniciar o backend**
```bash
docker-compose restart backend
```

### 4. **Reiniciar o frontend** (se necessário)
```bash
npm run dev
```

## 🔍 **Como encontrar rapidamente**

### Buscar todos os locais onde o ngrok está configurado:
```bash
grep -r "ngrok" .
```

### Buscar endereço específico:
```bash
grep -r "a7123785c466.ngrok-free.app" .
```

## ⚠️ **Importante**

- **Sempre alterar nos 3 locais** antes de reiniciar
- **Reiniciar o backend** após alterar
- **Testar a integração** com o Mercado Livre após mudanças
- **Salvar o novo endereço** para referência futura

## 🧪 **Como testar se está funcionando**

### 1. **Verificar se o backend está rodando**
```bash
curl http://localhost:8000/health
```

### 2. **Verificar se o ngrok está funcionando**
```bash
curl https://SEU_ENDERECO.ngrok-free.app/health
```

### 3. **Testar callback do Mercado Livre**
Acesse: `https://SEU_ENDERECO.ngrok-free.app/api/mercado-livre/auth/callback`

## 📋 **Checklist rápido**

- [ ] Ngrok rodando e endereço anotado
- [ ] `backend/app/main.py` atualizado
- [ ] `docker-compose.yml` atualizado  
- [ ] `vite.config.ts` atualizado
- [ ] Backend reiniciado
- [ ] Teste de conectividade realizado

---
**Última atualização**: $(date)
**Endereço atual**: https://a7123785c466.ngrok-free.app
