# Redator Automático - 10 Artigos/Dia

Configure seu PC para publicar automaticamente 10 artigos por dia no blog.

## Pré-requisitos
- Node.js 20+
- Ollama rodando localmente (http://127.0.0.1:11434)
- Um modelo Ollama baixado (ex: `ollama pull llama3.1:8b`)
- Blog rodando na VPS ou localhost

## Passo 1: Configurar .env local

```bash
cp .env.example .env
```

Edite com seus valores locais:

```env
PORT=3000
API_SECRET=mesmo-token-do-servidor-vps
BASE_URL=http://89.167.114.67:3000
OLLAMA_URL=http://127.0.0.1:11434
OLLAMA_PATH=/api/generate
OLLAMA_MODEL=llama3.1:8b
OLLAMA_API_KEY=
G1_FEED_URL=https://g1.globo.com/rss/g1/economia/
DATABASE_URL=postgres://autoblog:senha@db:5432/autoblog
```

## Passo 2: Instalar dependências

```bash
npm install
```

## Passo 3: Testar redator manual

Teste um artigo único:

```bash
npm run redator -- --tema "Como usar IA para automatizar conteúdo"
```

Ou baseado em feed G1:

```bash
npm run redator -- --g1-financas --limite 1
```

## Passo 4: Automatizar com Windows Task Scheduler

### Opção A: Script em PowerShell

Crie `C:\Users\conta\redator-automatico.ps1`:

```powershell
# Configurações
$project_dir = "C:\Users\conta\OneDrive\Documentos\Antigravity\AutoBlog"
$log_file = "$project_dir\redator_logs.txt"

# Timestamp para log
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

# Rodar redator (G1 Feed - 2 artigos por execução)
cd $project_dir
$output = npm run redator -- --g1-financas --limite 2 2>&1
"[$timestamp] Redator executado:`n$output`n" | Add-Content $log_file
```

### Opção B: Script em Batch

Crie `C:\Users\conta\redator-automatico.bat`:

```batch
@echo off
setlocal

cd C:\Users\conta\OneDrive\Documentos\Antigravity\AutoBlog

REM Roda 2 vezes por dia (5 artigos cada = 10 total)
echo [%date% %time%] Iniciando redator >> redator_logs.txt
npm run redator -- --g1-financas --limite 2 >> redator_logs.txt 2>&1
echo [%date% %time%] Conclusão >> redator_logs.txt
```

### Configurar Task Scheduler

1. Abra `Task Scheduler` (Windows)
2. Clique em **Create Basic Task**
3. Nome: `AutoBlog Redator`
4. Trigger: **Diário**
   - Primeira execução: 08:00 (5 artigos)
   - Segunda execução: 15:00 (5 artigos)
5. Action: **Start a program**
   - Program: `powershell.exe`
   - Args: `-ExecutionPolicy Bypass -File C:\Users\conta\redator-automatico.ps1`
6. Clique **OK**

## Passo 5: Validar rotina

Verifique os logs:

```bash
# Ver últimas publicações
cat redator_logs.txt | tail -20

# Testar agora
npm run redator -- --g1-financas --limite 1
```

## Passo 6: Monitorar

Acesse o blog na VPS:
- http://89.167.114.67:3000

Verifique os artigos publicados.

## Troubleshooting

### Error: "Blog indisponível"
- Verifique se a VPS está rodando: `curl http://89.167.114.67:3000/api/health`
- Confirme que `BASE_URL` está correto no `.env`

### Error: "Ollama não responde"
- Verifique se Ollama está rodando: `ollama serve`
- Confirme que `OLLAMA_URL` está correto

### Error: "API_SECRET inválido"
- Confirme que `API_SECRET` local é o mesmo do servidor VPS

## Escalabilidade

Para 10 artigos/dia:
- 2 execuções/dia × 5 artigos por execução
- Ou 5 execuções/dia × 2 artigos por execução

Ajuste o `--limite` conforme necessário.

### Exemplos:

**2 vezes/dia (recomendado para não sobrecarregar Ollama):**
```bash
# 08:00 - 5 artigos
npm run redator -- --g1-financas --limite 5

# 15:00 - 5 artigos  
npm run redator -- --g1-financas --limite 5
```

**5 vezes/dia (mais distribuído):**
```bash
# Horas: 06:00, 09:00, 12:00, 15:00, 18:00
# 2 artigos cada
npm run redator -- --g1-financas --limite 2
```

## Interface Web (opcional)

Crie um painel simples pra monitorar:
- Logs em tempo real
- Próxima execução
- Status do Ollama

Futuramente via `/admin` no blog.
