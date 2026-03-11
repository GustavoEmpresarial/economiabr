# Deploy AutoBlog na VPS (89.167.114.67)

## Pré-requisitos
- SSH acesso à VPS
- Docker e Docker Compose instalados
- Git instalado

## Passo 1: Conectar na VPS

```bash
ssh root@89.167.114.67
```

## Passo 2: Clonar repositório

```bash
cd /srv
git clone https://github.com/GustavoEmpresarial/economiabr.git
cd economiabr
```

## Passo 3: Configurar .env para produção

```bash
cp .env.example .env
```

Edite o `.env` com valores de produção:

```bash
nano .env
```

Ajuste essas variáveis:

```env
PORT=3000
API_SECRET=troque-por-uma-senha-forte-e-aleatória
BASE_URL=http://89.167.114.67:3000
DATABASE_URL=postgres://autoblog:senha-postgresql-forte@db:5432/autoblog
POSTGRES_DB=autoblog
POSTGRES_USER=autoblog
POSTGRES_PASSWORD=senha-postgresql-forte
OLLAMA_URL=http://127.0.0.1:11434
OLLAMA_PATH=/api/generate
OLLAMA_MODEL=llama3.1:8b
G1_FEED_URL=https://g1.globo.com/rss/g1/economia/
```

**Importante**: Substitua as senhas por algo seguro e único.

## Passo 4: Iniciar com Docker Compose

```bash
docker compose up -d --build
```

Valide que os dois containers estão em execução:

```bash
docker compose ps
```

Esperado:
```
autoblog      Up
autoblog-db   Up (healthy)
```

## Passo 5: Testar a aplicação

```bash
curl http://89.167.114.67:3000/api/health
```

Resultado esperado:
```json
{"ok":true,"service":"autoblog","now":"2026-03-11T14:28:21.491Z"}
```

## Passo 6: Configurar reverse proxy (Nginx/Apache) - Opcional

Se quiser que o blog rode em domínio sem porta:

```bash
apt-get install nginx
```

Crie `/etc/nginx/sites-available/economiabr`:

```nginx
server {
    listen 80;
    server_name seu-dominio.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Ative e reinicie:

```bash
ln -s /etc/nginx/sites-available/economiabr /etc/nginx/sites-enabled/
nginx -s reload
```

## Monitorar logs

```bash
docker compose logs -f autoblog
docker compose logs -f autoblog-db
```

## Parar os serviços

```bash
docker compose down
```

## Atualizar código (pull de novas versões)

```bash
git pull origin master
docker compose up -d --build
```

---

## Padrão de múltiplos sites na mesma VPS

Se tiver mais de um blog, use:

```bash
docker compose -p economiabr up -d --build
docker compose -p outroblog up -d --build
```

Cada um fica com seu próprio container de app e DB.
