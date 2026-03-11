/**
 * Busca imagens royalty-free baseadas em tema
 * Suporta: Pixabay, Unsplash (fallback)
 */

async function fetchPixabayImage(theme) {
  const apiKey = process.env.PIXABAY_API_KEY;
  
  if (!apiKey) {
    console.warn("⚠️  PIXABAY_API_KEY não configurado - retornando undefined");
    return undefined;
  }

  try {
    const searchTerm = encodeURIComponent(theme.substring(0, 50));
    const url = `https://pixabay.com/api/?key=${apiKey}&q=${searchTerm}&image_type=photo&order=popular&min_width=800&min_height=600&pretty=true`;
    
    const response = await fetch(url);
    const data = await response.json();

    if (data.hits && data.hits.length > 0) {
      const image = data.hits[0];
      return image.largeImageURL || image.webformatURL;
    }

    console.warn(`⚠️  Nenhuma imagem encontrada no Pixabay para: "${theme}"`);
    return undefined;
  } catch (error) {
    console.error(`❌ Erro ao buscar imagem no Pixabay: ${error.message}`);
    return undefined;
  }
}

async function fetchUnsplashImage(theme) {
  try {
    const searchTerm = encodeURIComponent(theme.substring(0, 50));
    // Unsplash permite até 50 requests/hora sem autenticação
    const url = `https://api.unsplash.com/search/photos?query=${searchTerm}&per_page=1&orientation=landscape`;
    
    const response = await fetch(url, {
      headers: {
        "Accept-Version": "v1",
      },
    });
    
    const data = await response.json();

    if (data.results && data.results.length > 0) {
      const photo = data.results[0];
      // Retorna URL com tamanho otimizado (1200x800)
      return `${photo.urls.regular}?w=1200&h=800&fit=crop`;
    }

    console.warn(`⚠️  Nenhuma imagem encontrada no Unsplash para: "${theme}"`);
    return undefined;
  } catch (error) {
    console.error(`❌ Erro ao buscar imagem no Unsplash: ${error.message}`);
    return undefined;
  }
  }

async function fetchImageUrl(theme) {
  // Tenta Pixabay primeiro (mais confiável com API key)
  if (process.env.PIXABAY_API_KEY) {
    const pixabayUrl = await fetchPixabayImage(theme);
    if (pixabayUrl) {
      console.log(`✅ Imagem encontrada no Pixabay: ${pixabayUrl}`);
      return pixabayUrl;
    }
  }

  // Fallback: Unsplash (sem API key, mas com limite)
  const unsplashUrl = await fetchUnsplashImage(theme);
  if (unsplashUrl) {
    console.log(`✅ Imagem encontrada no Unsplash: ${unsplashUrl}`);
    return unsplashUrl;
  }

  console.warn("⚠️  Nenhuma imagem disponível - publicando sem imagem");
  return undefined;
}

module.exports = { fetchImageUrl };
