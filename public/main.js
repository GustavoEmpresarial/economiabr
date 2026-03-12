function formatDate(dateInput) {
  return new Date(dateInput).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const FALLBACK_IMAGE = "https://picsum.photos/seed/autoblog-card/640/360";

function renderFeatured(post) {
  const image = post.image_url
    ? `<img class="main-image" src="${post.image_url}" alt="${post.title}" loading="lazy" onerror="this.onerror=null;this.src='${FALLBACK_IMAGE}';" />`
    : `<img class="main-image" src="${FALLBACK_IMAGE}" alt="Imagem de destaque" loading="lazy" />`;

  return `
    <article class="main-featured">
      <a href="/blog/${post.slug}">
        ${image}
        <span class="category-tag">DESTAQUE</span>
        <h1 class="featured-title">${post.title}</h1>
        <p class="featured-excerpt">${post.excerpt || "Leia a analise completa desta pauta no portal."}</p>
      </a>
    </article>
  `;
}

function renderSecondary(posts) {
  return posts
    .map(
      (post) => `
      <article class="secondary-news">
        <a href="/blog/${post.slug}">
          <span class="category-tag">NOTICIA</span>
          <h2 class="secondary-title">${post.title}</h2>
          <p class="secondary-meta">${formatDate(post.published_at)}</p>
        </a>
      </article>
    `
    )
    .join("");
}

function renderFeed(posts) {
  return posts
    .map(
      (post) => `
      <article class="feed-item">
        <div>
          <span class="category-tag">MERCADO</span>
          <h3 class="feed-item-title"><a href="/blog/${post.slug}">${post.title}</a></h3>
          <p class="feed-item-excerpt">${post.excerpt || "Clique para ler o conteudo completo."}</p>
          <p class="feed-meta">Atualizado em ${formatDate(post.published_at)}</p>
        </div>
        <img class="feed-image" src="${post.image_url || FALLBACK_IMAGE}" alt="${post.title}" loading="lazy" onerror="this.onerror=null;this.src='${FALLBACK_IMAGE}';" />
      </article>
    `
    )
    .join("");
}

async function loadPosts() {
  const featuredSlot = document.getElementById("featured-slot");
  const secondarySlot = document.getElementById("secondary-slot");
  const feedSlot = document.getElementById("feed-slot");

  featuredSlot.innerHTML = "<p>Carregando destaque...</p>";
  secondarySlot.innerHTML = "";
  feedSlot.innerHTML = "";

  try {
    const response = await fetch("/api/posts?limit=30");
    const data = await response.json();

    if (!response.ok) {
      featuredSlot.innerHTML = `<p>Erro ao carregar: ${data.error || "falha"}</p>`;
      return;
    }

    const posts = data.posts || [];
    if (!posts.length) {
      featuredSlot.innerHTML = "<p>Nenhuma noticia publicada ainda.</p>";
      return;
    }

    const featured = posts[0];
    const secondaries = posts.slice(1, 3);
    const feed = posts.slice(3);

    featuredSlot.innerHTML = renderFeatured(featured);
    secondarySlot.innerHTML = secondaries.length ? renderSecondary(secondaries) : "";
    feedSlot.innerHTML = feed.length ? renderFeed(feed) : "<p>Sem mais noticias por enquanto.</p>";
  } catch (_error) {
    featuredSlot.innerHTML = "<p>Erro de rede ao carregar o portal.</p>";
  }
}

loadPosts();
