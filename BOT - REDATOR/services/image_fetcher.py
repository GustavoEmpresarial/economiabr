# services/image_fetcher.py

import logging
import requests
from urllib.parse import quote_plus
import random

logger = logging.getLogger(__name__)

class ImageFetcher:
    def __init__(self, unsplash_access_key: str):
        self.unsplash_key = unsplash_access_key
        self.unsplash_url = "https://api.unsplash.com/search/photos"
        self.sources = []  # Rastreia fontes já usadas para evitar repetições

    def get_image_for_title(self, title: str, size: str = "medium") -> dict | None:
        """
        Busca uma imagem em múltiplas fontes (Unsplash, Google Images).
        Retorna dict com 'url', 'photographer', 'source' ou None.
        """
        queries = self._generate_search_queries(title)
        
        for query in queries:
            logger.info(f"🔍 Buscando imagem para: '{query}'")
            
            # Tenta múltiplas fontes em ordem aleatória
            sources = self._get_sources_order()
            for source_func in sources:
                try:
                    image = source_func(query, size)
                    if image:
                        logger.info(f"✅ Imagem encontrada em {image.get('source')}")
                        return image
                except Exception as e:
                    logger.warning(f"Erro ao buscar em {source_func.__name__}: {e}")
                    continue

        logger.warning(f"Nenhuma imagem encontrada para: '{title[:50]}...'")
        return self._get_fallback_image()
    
    def _get_sources_order(self) -> list:
        """Retorna as funções de busca em ordem aleatória para variedade."""
        sources = [self._search_unsplash, self._search_google_images]
        
        # Embaralha para evitar sempre usar a mesma ordem
        random.shuffle(sources)
        return sources

    def _generate_search_queries(self, title: str) -> list:
        """Gera múltiplas queries para busca mais robusta."""
        keywords = self._extract_keywords(title)
        queries = []

        # Query original (até 3 palavras)
        if len(keywords) >= 1:
            queries.append(" ".join(keywords[:3]))

        # Palavras-chave mais genéricas
        generic_terms = ["news", "business", "economy", "finance", "technology", "world"]
        for term in generic_terms:
            if term in title.lower():
                queries.append(term)
                break

        # Se não encontrou termos específicos, tenta genérico
        if not queries:
            queries = ["news", "article", "generic"]

        return queries

    def _search_unsplash(self, query: str, size: str) -> dict | None:
        """Busca imagem no Unsplash para uma query."""
        if not self.unsplash_key:
            return None
            
        params = {
            "query": query,
            "client_id": self.unsplash_key,
            "per_page": 10,  # Busca mais resultados
            "orientation": "landscape"
        }

        try:
            response = requests.get(self.unsplash_url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()

            if data.get("results"):
                # Pega um resultado aleatório para mais variedade
                photo = random.choice(data["results"])
                urls = photo["urls"]
                user = photo["user"]

                # Escolhe tamanho
                image_url = urls.get(size, urls.get("regular", urls["small"]))

                return {
                    "url": image_url,
                    "photographer": user["name"],
                    "profile": user["links"]["html"],
                    "source": "Unsplash"
                }
        except Exception as e:
            logger.warning(f"Erro ao buscar imagem no Unsplash: {e}")

        return None
    
    def _search_google_images(self, query: str, size: str) -> dict | None:
        """Busca imagem no Google Images (via Web Scraping)."""
        try:
            # Construir URL do Google Images
            search_url = f"https://www.google.com/search?q={quote_plus(query)}&tbm=isch"
            
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
            
            response = requests.get(search_url, headers=headers, timeout=10)
            response.raise_for_status()
            
            # Extrai URLs de imagens da página
            import re
            img_urls = re.findall(r'imgurl=([^&]+)', response.text)
            
            if img_urls:
                # Pega uma URL aleatória
                image_url = img_urls[random.randint(0, len(img_urls)-1)]
                image_url = requests.utils.unquote(image_url)
                
                # Valida se é uma URL válida
                if image_url.startswith('http'):
                    return {
                        "url": image_url,
                        "photographer": "Google Images",
                        "profile": "https://google.com",
                        "source": "Google Images"
                    }
        except Exception as e:
            logger.warning(f"Erro ao buscar imagem no Google Images: {e}")
        
        return None

    def _get_fallback_image(self) -> dict:
        """Retorna uma imagem genérica como fallback."""
        return {
            "url": "https://images.unsplash.com/photo-1504711434969-e33886168f5c?q=80&w=1200&h=600&fit=crop",
            "photographer": "Unsplash",
            "profile": "https://unsplash.com",
            "source": "Fallback"
        }

    def _extract_keywords(self, text: str) -> list:
        """Remove palavras vazias e retorna termos relevantes."""
        stop_words = {
            "o", "a", "os", "as", "um", "uma", "uns", "umas", "de", "do", "da", "dos", "das",
            "em", "no", "na", "nos", "nas", "para", "com", "por", "e", "ou", "mas", "se", "não",
            "foi", "será", "diz", "afirma", "anuncia", "lança", "plano", "projeto", "governo",
            "tem", "está", "vai", "pode", "deve", "partir", "segundo", "sobre", "entre", "após"
        }
        words = text.lower().split()
        keywords = [w.strip(".,!?;:") for w in words if w.lower() not in stop_words and len(w) > 2]
        return keywords[:5]