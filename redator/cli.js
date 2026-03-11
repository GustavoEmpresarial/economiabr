#!/usr/bin/env node
const dotenv = require("dotenv");
const { fetchImageUrl } = require("./image-fetcher");

dotenv.config();

function usage() {
  console.log(`
Uso:
  npm run redator -- --tema "Seu tema" [--modelo llama3.1:8b] [--imagem URL]
  npm run redator -- --g1-financas [--limite 3] [--modelo llama3.1:8b]

Variaveis esperadas no .env:
  OLLAMA_URL=http://127.0.0.1:11434
  OLLAMA_PATH=/api/generate
  OLLAMA_MODEL=llama3.1:8b
  OLLAMA_API_KEY=<opcional para cloud>
  BASE_URL=http://IP-DA-VPS:3000
  API_SECRET=token-do-servidor
  G1_FEED_URL=https://g1.globo.com/rss/g1/economia/
`);
}

function getArg(flag) {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return "";
  return process.argv[idx + 1] || "";
}

function hasFlag(flag) {
  return process.argv.includes(flag);
}

function decodeXml(text) {
  return String(text || "")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function stripHtml(text) {
  return decodeXml(text).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function extractTag(block, tagName) {
  const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "i");
  const match = block.match(regex);
  return match ? decodeXml(match[1]).trim() : "";
}

function extractImageUrl(block) {
  const patterns = [
    /<media:content[^>]*url=["']([^"']+)["'][^>]*>/i,
    /<media:thumbnail[^>]*url=["']([^"']+)["'][^>]*>/i,
    /<enclosure[^>]*url=["']([^"']+)["'][^>]*type=["']image\/[^"]+["'][^>]*>/i,
  ];

  for (const pattern of patterns) {
    const match = block.match(pattern);
    if (match && match[1]) {
      return decodeXml(match[1]).trim();
    }
  }

  const description = extractTag(block, "description");
  const imgFromDescription = description.match(/<img[^>]*src=["']([^"']+)["'][^>]*>/i);
  if (imgFromDescription && imgFromDescription[1]) {
    return decodeXml(imgFromDescription[1]).trim();
  }

  return "";
}

async function fetchG1Feed(feedUrl, limit) {
  let response;
  try {
    response = await fetch(feedUrl);
  } catch (error) {
    throw new Error(`Falha de rede ao ler feed G1 (${feedUrl}): ${error.message}`);
  }

  if (!response.ok) {
    throw new Error(`Erro ao baixar feed (${response.status})`);
  }

  const xml = await response.text();
  const items = xml.match(/<item>[\s\S]*?<\/item>/gi) || [];

  return items.slice(0, limit).map((itemBlock) => ({
    title: extractTag(itemBlock, "title"),
    link: extractTag(itemBlock, "link"),
    description: stripHtml(extractTag(itemBlock, "description")),
    pubDate: extractTag(itemBlock, "pubDate"),
    imageUrl: extractImageUrl(itemBlock),
  }));
}

async function generateWithOllama({ theme, model, ollamaUrl }) {
  const prompt = `
Voce e um redator profissional em portugues do Brasil.
Escreva um artigo original para blog sobre: "${theme}".
Requisitos:
- Tom claro e didatico
- SEO natural
- Use markdown
- Traga introducao, secoes com subtitulos e conclusao
- No maximo 1200 palavras
- Nao inclua cercas de codigo

No final, entregue exatamente no formato:
TITULO: <titulo>
RESUMO: <resumo curto>
CONTEUDO:
<markdown do artigo>
`;

  let response;
  try {
    response = await fetch(ollamaUrl, {
      method: "POST",
      headers: getOllamaHeaders(),
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
      }),
    });
  } catch (error) {
    throw new Error(`Falha de rede no Ollama (${ollamaUrl}): ${error.message}`);
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Erro no Ollama (${response.status}): ${text}`);
  }

  const data = await response.json();
  return data.response || "";
}

async function generateFromNewsWithOllama({ source, model, ollamaUrl }) {
  const prompt = `
Voce e um redator profissional em portugues do Brasil.

Use esta pauta jornalistica apenas como referencia de tema:
- Titulo original: ${source.title}
- Link da fonte: ${source.link}
- Contexto curto: ${source.description || "Sem descricao no feed"}

Escreva um artigo NOVO e ORIGINAL sobre o mesmo assunto, sem copiar frases da fonte.
Requisitos:
- Linguagem clara, objetiva e informativa
- SEO natural
- Markdown com subtitulos
- Introducao, desenvolvimento e conclusao
- Ate 900 palavras
- Cite a fonte ao final com: "Fonte: <link>"
- Nao inclua cercas de codigo

Entregue exatamente neste formato:
TITULO: <titulo>
RESUMO: <resumo curto>
CONTEUDO:
<markdown do artigo>
`;

  let response;
  try {
    response = await fetch(ollamaUrl, {
      method: "POST",
      headers: getOllamaHeaders(),
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
      }),
    });
  } catch (error) {
    throw new Error(`Falha de rede no Ollama (${ollamaUrl}): ${error.message}`);
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Erro no Ollama (${response.status}): ${text}`);
  }

  const data = await response.json();
  return data.response || "";
}

function getOllamaHeaders() {
  const headers = { "Content-Type": "application/json" };
  const apiKey = String(process.env.OLLAMA_API_KEY || "").trim();
  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }
  return headers;
}

function buildOllamaGenerateUrl() {
  const base = String(process.env.OLLAMA_URL || "http://127.0.0.1:11434").trim().replace(/\/$/, "");
  const path = String(process.env.OLLAMA_PATH || "/api/generate").trim();
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

function parseGeneratedText(text) {
  const titleMatch = text.match(/TITULO:\s*(.+)/i);
  const resumoMatch = text.match(/RESUMO:\s*(.+)/i);
  const contentMatch = text.match(/CONTEUDO:\s*([\s\S]*)/i);

  const title = titleMatch ? titleMatch[1].trim() : "Artigo sem titulo";
  const excerpt = resumoMatch ? resumoMatch[1].trim() : "";
  const contentMarkdown = contentMatch ? contentMatch[1].trim() : text.trim();

  return { title, excerpt, contentMarkdown };
}

async function publishToServer({ baseUrl, apiSecret, payload }) {
  let response;
  const publishUrl = `${baseUrl}/api/posts`;
  try {
    response = await fetch(publishUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-secret": apiSecret,
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    throw new Error(`Falha de rede ao publicar no blog (${publishUrl}): ${error.message}`);
  }

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || `Erro ao publicar (${response.status})`);
  }

  return data;
}

async function ensureBlogReachable(baseUrl) {
  const healthUrl = `${baseUrl}/api/health`;
  let response;
  try {
    response = await fetch(healthUrl);
  } catch (error) {
    throw new Error(
      `Servidor do blog indisponivel em ${healthUrl}. Inicie o servidor ou ajuste BASE_URL. Detalhe: ${error.message}`
    );
  }

  if (!response.ok) {
    throw new Error(`Servidor do blog respondeu ${response.status} em ${healthUrl}`);
  }
}

async function run() {
  const theme = getArg("--tema");
  const modelOverride = getArg("--modelo");
  const imageUrl = getArg("--imagem");
  const isG1Mode = hasFlag("--g1-financas");
  const limitRaw = Number(getArg("--limite") || 3);
  const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(limitRaw, 10)) : 3;

  if (process.argv.includes("--help") || (!theme && !isG1Mode)) {
    usage();
    process.exit(process.argv.includes("--help") ? 0 : 1);
  }

  const ollamaUrl = buildOllamaGenerateUrl();
  const model = modelOverride || process.env.OLLAMA_MODEL || "llama3.1:8b";
  const baseUrl = process.env.BASE_URL || "http://localhost:3000";
  const apiSecret = process.env.API_SECRET || "";
  const g1FeedUrl = process.env.G1_FEED_URL || "https://g1.globo.com/rss/g1/economia/";

  if (!apiSecret) {
    throw new Error("API_SECRET nao definido no .env");
  }

  await ensureBlogReachable(baseUrl);

  if (!isG1Mode) {
    console.log(`Gerando artigo com modelo ${model}...`);
    const raw = await generateWithOllama({ theme, model, ollamaUrl });
    const parsed = parseGeneratedText(raw);

    console.log(`Publicando artigo: ${parsed.title}`);
    // Busca imagem automaticamente se não foi fornecida
    let finalImageUrl = imageUrl;
    if (!finalImageUrl) {
      console.log("Buscando imagem royalty-free...");
      finalImageUrl = await fetchImageUrl(parsed.title);
    }

    const result = await publishToServer({
      baseUrl,
      apiSecret,
      payload: {
        title: parsed.title,
        excerpt: parsed.excerpt,
        contentMarkdown: parsed.contentMarkdown,
        imageUrl: finalImageUrl || undefined,
        tags: ["IA", "AutoBlog"],
      },
    });

    console.log("Publicado com sucesso!");
    console.log(`Slug: ${result.slug}`);
    console.log(`URL: ${baseUrl}${result.url}`);
    return;
  }

  console.log(`Lendo feed do G1: ${g1FeedUrl}`);
  const entries = await fetchG1Feed(g1FeedUrl, limit);
  if (!entries.length) {
    throw new Error("Nenhuma pauta encontrada no feed");
  }

  for (const [index, entry] of entries.entries()) {
    console.log(`\n[${index + 1}/${entries.length}] Gerando baseado em: ${entry.title}`);
    const raw = await generateFromNewsWithOllama({
      source: entry,
    // Busca imagem automaticamente se não foi fornecida
    let finalImageUrl = imageUrl || entry.imageUrl;
    if (!finalImageUrl) {
      console.log("Buscando imagem royalty-free...");
      finalImageUrl = await fetchImageUrl(parsed.title);
    }

    const result = await publishToServer({
      baseUrl,
      apiSecret,
      payload: {
        title: parsed.title,
        excerpt: parsed.excerpt,
        contentMarkdown: withSource,
        imageUrl: finalIver({
      baseUrl,
      apiSecret,
      payload: {
        title: parsed.title,
        excerpt: parsed.excerpt,
        contentMarkdown: withSource,
        imageUrl: imageUrl || entry.imageUrl || undefined,
        tags: ["IA", "AutoBlog", "G1", "Economia"],
      },
    });

    console.log(`Publicado: ${baseUrl}${result.url}`);
  }

  console.log("\nFluxo G1 -> Ollama -> AutoBlog finalizado.");
}

run().catch((err) => {
  console.error("Falha no redator:", err.message);
  process.exit(1);
});
