/**
 * Busca imagens royalty-free para artigos
 * Estratégia:
 *   1. Unsplash (com Access Key se configurada)
 *   2. Pixabay (com API key se configurada)
 *   3. Placeholder genérico (imagem padrão confiável)
 */

async function fetchUnsplashImage(theme) {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  
  if (!accessKey) {
    return undefined;
  }

  try {
    const searchTerm = encodeURIComponent(theme.substring(0, 100));
    const url = `https://api.unsplash.com/search/photos?query=${searchTerm}&per_page=1&order_by=popular`;
    
    console.log(`[Unsplash] Buscando imagem...`);
    
    const response = await fetch(url, {
      headers: {
        "Authorization": `Client-ID ${accessKey}`,
        "Accept-Version": "v1"
      }
    });
    const data = await response.json();

    if (data.results && data.results.length > 0) {
      const image = data.results[0];
      const imageUrl = image.urls.full || image.urls.regular;
      console.log(`✅ Imagem encontrada no Unsplash`);
      return imageUrl;
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
    const searchTerm = encodeURIComponent(theme.substring(0, 100));
    const url = `https://pixabay.com/api/?key=${apiKey}&q=${searchTerm}&image_type=photo&order=popular&min_width=800`;
    
    console.log(`[Pixabay] Buscando imagem...`);
    
    const response = await fetch(url);
    const data = await response.json();

    if (data.hits && data.hits.length > 0) {
      const image = data.hits[0];
      const imageUrl = image.largeImageURL || image.webformatURL;
      console.log(`✅ Imagem encontrada no Pixabay`);
      return imageUrl;
    }

    return undefined;
  } catch (error) {
    console.error(`Erro ao buscar Pixabay: ${error.message}`);
    return undefined;
  }
}

function getPlaceholderImage(theme) {
  /**
   * Gera imagem placeholder profissional baseada no tema
   * Usa Unsplash sem auth (apenas placeholder genérico)
   */
  const placeholders = {
    tech: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&q=80",  
    business: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&q=80",
    finance: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&q=80",
    default: "https://images.unsplash.com/photo-1496747611176-843222e1e0c0?w=800&q=80",
  };

  // Detecta categoria pela palavr-chave no tema
  const themeLower = theme.toLowerCase();
  
  if (themeLower.includes("tecnolog") || themeLower.includes("ai") || themeLower.includes("code")) {
    return placeholders.tech;
  }
  if (themeLower.includes("negóc") || themeLower.includes("empresa") || themeLower.includes("mercad")) {
    return placeholders.business;
  }
  if (themeLower.includes("financ") || themeLower.includes("investiment") || themeLower.includes("ações")) {
    return placeholders.finance;
  }
  
  return placeholders.default;
}

async function fetchImageUrl(theme) {
  console.log(`\n🖼️  Buscando imagem para: "${theme.substring(0, 50)}..."\n`);
  
  // Estratégia 1: Unsplash (sem auth, URLs genéricas mas de qualidade)
  const unsplashUrl = await fetchUnsplashImage(theme);
  if (unsplashUrl) {
    return unsplashUrl;
  }

  // Estratégia 2: Pixabay (se configurado)
  if (process.env.PIXABAY_API_KEY) {
    const pixabayUrl = await fetchPixabayImage(theme);
    if (pixabayUrl) {
      return pixabayUrl;
    }
  }

  // Estratégia 3: Placeholder inteligente (sempre funciona)
  const placeholderUrl = getPlaceholderImage(theme);
  console.log(`📸 Usando imagem placeholder Unsplash`);
  
  return placeholderUrl;
}

module.exports = { fetchImageUrl };
