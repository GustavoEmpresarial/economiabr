/**
 * Busca imagens royalty-free para artigos
 * Estrategia:
 *   1. Unsplash (Access Key)
 *   2. Pixabay (API key)
 *   3. Fallback estavel (picsum)
 */

function normalizeTheme(theme) {
  return String(theme || "")
    .replace(/[`*_#>\[\]{}()]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 90);
}

async function fetchUnsplashImage(theme) {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey) {
    return undefined;
  }

  try {
    const query = encodeURIComponent(normalizeTheme(theme));
    const url = `https://api.unsplash.com/search/photos?query=${query}&per_page=1&orientation=landscape&order_by=relevant`;

    console.log("[Unsplash] Buscando imagem...");

    const response = await fetch(url, {
      headers: {
        Authorization: `Client-ID ${accessKey}`,
        "Accept-Version": "v1",
      },
    });

    if (!response.ok) {
      return undefined;
    }

    const data = await response.json();
    if (data.results && data.results.length > 0) {
      const image = data.results[0];
      const imageUrl = image.urls.regular || image.urls.small || image.urls.full;
      if (imageUrl) {
        console.log("Imagem encontrada no Unsplash");
        return imageUrl;
      }
    }

    return undefined;
  } catch (error) {
    console.error(`Erro ao buscar Unsplash: ${error.message}`);
    return undefined;
  }
}

async function fetchPixabayImage(theme) {
  const apiKey = process.env.PIXABAY_API_KEY;
  if (!apiKey) {
    return undefined;
  }

  try {
    const searchTerm = encodeURIComponent(normalizeTheme(theme));
    const url = `https://pixabay.com/api/?key=${apiKey}&q=${searchTerm}&image_type=photo&order=popular&min_width=800`;

    console.log("[Pixabay] Buscando imagem...");

    const response = await fetch(url);
    if (!response.ok) {
      return undefined;
    }

    const data = await response.json();
    if (data.hits && data.hits.length > 0) {
      const image = data.hits[0];
      const imageUrl = image.largeImageURL || image.webformatURL;
      if (imageUrl) {
        console.log("Imagem encontrada no Pixabay");
        return imageUrl;
      }
    }

    return undefined;
  } catch (error) {
    console.error(`Erro ao buscar Pixabay: ${error.message}`);
    return undefined;
  }
}

function getFallbackImage(theme) {
  const t = normalizeTheme(theme).toLowerCase();

  if (t.includes("dolar") || t.includes("juros") || t.includes("inflacao") || t.includes("econom")) {
    return "https://picsum.photos/seed/economia-br/1280/720";
  }
  if (t.includes("tecnolog") || t.includes("ia") || t.includes("startup")) {
    return "https://picsum.photos/seed/tecnologia-br/1280/720";
  }
  return "https://picsum.photos/seed/autoblog-br/1280/720";
}

async function fetchImageUrl(theme) {
  console.log(`\nBuscando imagem para: \"${normalizeTheme(theme)}\"\n`);

  const unsplashUrl = await fetchUnsplashImage(theme);
  if (unsplashUrl) {
    return unsplashUrl;
  }

  const pixabayUrl = await fetchPixabayImage(theme);
  if (pixabayUrl) {
    return pixabayUrl;
  }

  const fallback = getFallbackImage(theme);
  console.log("Usando fallback de imagem estavel");
  return fallback;
}

module.exports = { fetchImageUrl };
