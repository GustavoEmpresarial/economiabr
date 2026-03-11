function slugFromPath() {
  const parts = window.location.pathname.split("/").filter(Boolean);
  return parts[parts.length - 1] || "";
}

async function loadPost() {
  const slug = slugFromPath();
  const titleEl = document.getElementById("post-title");
  const metaEl = document.getElementById("post-meta");
  const contentEl = document.getElementById("post-content");
  const imageEl = document.getElementById("post-image");

  if (!slug) {
    titleEl.textContent = "Post nao encontrado";
    return;
  }

  try {
    const response = await fetch(`/api/posts/${slug}`);
    const data = await response.json();

    if (!response.ok || !data.post) {
      titleEl.textContent = data.error || "Post nao encontrado";
      metaEl.textContent = "";
      return;
    }

    const post = data.post;
    const date = new Date(post.published_at).toLocaleString("pt-BR");

    document.title = `${post.title} | AutoBlog`;
    titleEl.textContent = post.title;
    metaEl.textContent = `Publicado em ${date}`;
    contentEl.innerHTML = post.content_html;

    if (post.image_url) {
      imageEl.src = post.image_url;
      imageEl.classList.remove("hidden");
    }
  } catch (_error) {
    titleEl.textContent = "Erro ao carregar post";
    metaEl.textContent = "Verifique sua conexao e tente novamente.";
  }
}

loadPost();
