const path = require("path");
const express = require("express");
const dotenv = require("dotenv");
const { marked } = require("marked");
const sanitizeHtml = require("sanitize-html");
const { requireSecret } = require("./auth");
const { nowIso, slugify, uid } = require("./utils");

dotenv.config();

const { db, initDb } = require("./db");

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(process.cwd(), "public")));

function sanitizePostHtml(rawHtml) {
  return sanitizeHtml(rawHtml, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat([
      "h1",
      "h2",
      "h3",
      "img",
      "figure",
      "figcaption",
      "iframe",
    ]),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      img: ["src", "alt", "title", "loading"],
      a: ["href", "name", "target", "rel"],
      iframe: ["src", "width", "height", "allow", "allowfullscreen", "frameborder"],
    },
    allowedSchemes: ["http", "https", "mailto", "data"],
  });
}

function parseTags(tagsInput) {
  if (!tagsInput) return [];
  if (Array.isArray(tagsInput)) {
    return tagsInput.map((t) => String(t).trim()).filter(Boolean);
  }
  return String(tagsInput)
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "autoblog", now: nowIso() });
});

app.get("/api/posts", async (req, res) => {
  const limit = Math.min(Number(req.query.limit || 20), 100);
  try {
    const result = await db.query(
      `SELECT slug, title, excerpt, image_url, tags, created_at, published_at
       FROM posts
       ORDER BY published_at DESC
       LIMIT $1`,
      [limit]
    );

    const posts = result.rows.map((row) => ({
      ...row,
      tags: row.tags ? JSON.parse(row.tags) : [],
    }));

    res.json({ posts });
  } catch (error) {
    console.error("Erro ao buscar posts:", error);
    res.status(500).json({ error: "Erro interno ao buscar posts" });
  }
});

app.get("/api/posts/:slug", async (req, res) => {
  const { slug } = req.params;
  try {
    const result = await db.query(
      `SELECT slug, title, excerpt, content_html, image_url, tags, created_at, updated_at, published_at
       FROM posts
       WHERE slug = $1`,
      [slug]
    );

    const row = result.rows[0];
    if (!row) {
      return res.status(404).json({ error: "Post nao encontrado" });
    }

    return res.json({
      post: {
        ...row,
        tags: row.tags ? JSON.parse(row.tags) : [],
      },
    });
  } catch (error) {
    console.error("Erro ao buscar post por slug:", error);
    return res.status(500).json({ error: "Erro interno ao buscar post" });
  }
});

app.post("/api/posts", requireSecret, async (req, res) => {
  const { title, excerpt, contentMarkdown, contentHtml, imageUrl, tags } = req.body;

  if (!title || (!contentMarkdown && !contentHtml)) {
    return res.status(400).json({
      error: "Campos obrigatorios: title e contentMarkdown (ou contentHtml)",
    });
  }

  const baseSlug = slugify(title);
  if (!baseSlug) {
    return res.status(400).json({ error: "Titulo invalido para gerar slug" });
  }

  let slug = baseSlug;
  let counter = 2;
  try {
    while (true) {
      const slugResult = await db.query("SELECT slug FROM posts WHERE slug = $1", [slug]);
      if (slugResult.rowCount === 0) {
        break;
      }
      slug = `${baseSlug}-${counter}`;
      counter += 1;
    }

    const htmlRaw = contentHtml || marked.parse(String(contentMarkdown));
    const safeHtml = sanitizePostHtml(String(htmlRaw));
    const now = nowIso();
    const tagList = parseTags(tags);

    await db.query(
      `INSERT INTO posts (
        id, slug, title, excerpt, content_html, content_markdown, image_url, tags,
        created_at, updated_at, published_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        uid(),
        slug,
        String(title).trim(),
        excerpt ? String(excerpt).trim() : null,
        safeHtml,
        contentMarkdown ? String(contentMarkdown) : null,
        imageUrl ? String(imageUrl).trim() : null,
        JSON.stringify(tagList),
        now,
        now,
        now,
      ]
    );

    return res.status(201).json({ slug, url: `/blog/${slug}` });
  } catch (error) {
    console.error("Erro ao criar post:", error);
    return res.status(500).json({ error: "Erro interno ao criar post" });
  }
});

app.put("/api/posts/:slug", requireSecret, async (req, res) => {
  const { slug } = req.params;
  const { title, excerpt, contentMarkdown, imageUrl } = req.body;

  if (!title || !contentMarkdown) {
    return res.status(400).json({
      error: "Campos obrigatorios: title e contentMarkdown",
    });
  }

  try {
    const htmlRaw = marked.parse(String(contentMarkdown));
    const safeHtml = sanitizePostHtml(String(htmlRaw));
    const now = nowIso();

    const result = await db.query(
      `UPDATE posts
       SET title = $1, excerpt = $2, content_html = $3, content_markdown = $4, image_url = $5, updated_at = $6
       WHERE slug = $7
       RETURNING slug`,
      [
        String(title).trim(),
        excerpt ? String(excerpt).trim() : null,
        safeHtml,
        String(contentMarkdown),
        imageUrl ? String(imageUrl).trim() : null,
        now,
        slug,
      ]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Post nao encontrado" });
    }

    return res.json({ slug: result.rows[0].slug, message: "Post atualizado" });
  } catch (error) {
    console.error("Erro ao atualizar post:", error);
    return res.status(500).json({ error: "Erro interno ao atualizar post" });
  }
});

app.delete("/api/posts/:slug", requireSecret, async (req, res) => {
  const { slug } = req.params;

  try {
    const result = await db.query(
      `DELETE FROM posts WHERE slug = $1`,
      [slug]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Post nao encontrado" });
    }

    return res.json({ message: "Post deletado" });
  } catch (error) {
    console.error("Erro ao deletar post:", error);
    return res.status(500).json({ error: "Erro interno ao deletar post" });
  }
});

app.delete("/api/posts/admin/delete-all", requireSecret, async (req, res) => {
  try {
    const result = await db.query(`DELETE FROM posts`);
    return res.json({ message: `${result.rowCount} posts deletados`, deletedCount: result.rowCount });
  } catch (error) {
    console.error("Erro ao deletar todos os posts:", error);
    return res.status(500).json({ error: "Erro interno" });
  }
});

app.get("/admin", (_req, res) => {
  res.sendFile(path.join(process.cwd(), "public", "admin.html"));
});

app.get("/blog/:slug", (_req, res) => {
  res.sendFile(path.join(process.cwd(), "public", "post.html"));
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(process.cwd(), "public", "index.html"));
});

async function startServer() {
  try {
    await initDb();
    app.listen(PORT, () => {
      console.log(`AutoBlog rodando em http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Falha ao inicializar banco:", error);
    process.exit(1);
  }
}

startServer();
