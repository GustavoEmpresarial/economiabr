# AutoBlog

Projeto com duas partes:

1. **Blog no servidor (VPS)** em container Docker
2. **Redator no PC** usando Ollama para gerar artigo e enviar para o servidor

## Stack

- Node.js + Express
- PostgreSQL (container dedicado `db`)
- Frontend estatico
- Redator CLI com Ollama

## Rodar local

```bash
npm install
copy .env.example .env
npm run dev
```

Acesse: `http://localhost:3000`

## API principal

- `GET /api/health`
- `GET /api/posts`
- `GET /api/posts/:slug`
- `POST /api/posts` (protegido com `x-api-secret`)

Exemplo de `POST /api/posts`:

```json
{
  "title": "Titulo do artigo",
  "excerpt": "Resumo curto",
  "contentMarkdown": "# Conteudo em markdown",
  "imageUrl": "https://site.com/imagem.jpg",
  "tags": ["IA", "Blog"]
}
```

## Deploy na VPS com Docker

1. Suba os arquivos para a VPS.
2. Crie `.env` baseado em `.env.example`.
3. Defina um `API_SECRET` forte.
4. Defina uma senha forte em `POSTGRES_PASSWORD`.
5. Rode:

```bash
docker compose up -d --build
```

6. Teste:

```bash
curl http://IP_DA_VPS:3000/api/health
```

## Padrao recomendado para VPS com varios sites

Cada site deve ter seu proprio container de app e seu proprio container de banco. Neste projeto isso ja acontece via `services.autoblog` + `services.db` no `docker-compose.yml`.

Boas praticas:

- Use nomes de projeto diferentes por site ao subir (`-p site1`, `-p site2`).
- Nao exponha a porta do banco para internet publica (sem `ports` no service `db`).
- Use uma senha diferente de banco para cada site.
- Mantenha um volume dedicado por site para persistencia (`autoblog-db-data`).

Exemplo para subir com nome isolado:

```bash
docker compose -p autoblog-prod up -d --build
```

## Redator no PC com Ollama

No PC local (onde o Ollama roda):

1. Instale Ollama e puxe um modelo, por exemplo:

```bash
ollama pull llama3.1:8b
```

2. No `.env` local, configure:

- `OLLAMA_URL=http://127.0.0.1:11434`
- `OLLAMA_PATH=/api/generate`
- `OLLAMA_MODEL=llama3.1:8b`
- `OLLAMA_API_KEY=` (preencha quando usar provedor cloud)
- `BASE_URL=http://IP_DA_VPS:3000`
- `API_SECRET=mesmo_token_do_servidor`

Para usar Ollama em cloud, troque `OLLAMA_URL` para o endpoint do provedor e configure `OLLAMA_API_KEY`.

3. Gere e publique:

```bash
npm run redator -- --tema "Seu tema aqui"
```

Modo feed G1 Economia (gera artigos originais a partir das pautas do feed):

```bash
npm run redator -- --g1-financas --limite 3
```

Opcional:

```bash
npm run redator -- --tema "Tema" --imagem "https://..." --modelo "llama3.1:8b"
```

## Estrutura

- `src/server.js`: API + servidor web
- `src/db.js`: conexao e inicializacao do PostgreSQL
- `public/`: site do blog
- `redator/cli.js`: script de geracao/publicacao
