# Configurar Imagens Royalty-Free

O redator agora busca automaticamente imagens sem direitos autorais para cada artigo.

## Opções

### 1. Pixabay (Recomendado)

Pixabay oferece 50 requests/hora gratuitamente.

1. Crie conta em https://pixabay.com/api/
2. Copie sua chave API
3. Adicione ao `.env`:

```env
PIXABAY_API_KEY=sua_chave_aqui
```

4. Pronto! O redator vai priorizar Pixabay.

**Exemplo:**
```bash
npm run redator -- --g1-financas --limite 5
```

Cada artigo buscará imagem automaticamente.

### 2. Unsplash (Fallback Automático)

Se não tiver `PIXABAY_API_KEY`, o redator tenta Unsplash automaticamente.

- ✅ Sem API key necessária
- ⚠️ Limite: 50 requests/hora (limite bem baixo)
- Melhor para testes locais

### Como Funciona

```
2. Se não tem imagem:
   ├─ Tenta Pixabay (se PIXABAY_API_KEY configurado)
   ├─ Fallback: Unsplash
   ├─ Fallback: Publica sem imagem
   │
3. Artigo publicado com imagem
```

### Termos de Uso

**Pixabay**: 
- Licença Pixabay (livre uso, sem atribuição obrigatória)
- Perfeito para blogueiros e sites comerciais

**Unsplash**:
- Licença Unsplash (livre não-exclusivo)
- Recomenda atribuição (não obrigatório)

### Troubleshooting


**Error: "PIXABAY_API_KEY inválido"**
- Verifique a chave no `.env`
- Regenere em https://pixabay.com/api/

### Exemplo com Automação

```bash
# Redator vai buscar 2 imagens por artigo (5 artigos = até 10 buscas)
node redator/scheduler.js --times 2 --articles 5

# Se Pixabay estiver configurado:
# - 2 exec × 5 artigos = 10 buscas de imagem
# - Limite Pixabay: 50/hora (OK)
```

### Dica: Configurar em Produção

Na VPS (`89.167.114.67`), configure `.env` com sua chave Pixabay:

```bash
ssh root@89.167.114.67
cd /srv/economiabr
nano .env
```

Adicione:
```env
PIXABAY_API_KEY=sua_chave
```

Salve e redeploy:
```bash
docker compose up -d --build
```

Pronto! Agora a VPS também vai buscar imagens automaticamente.
