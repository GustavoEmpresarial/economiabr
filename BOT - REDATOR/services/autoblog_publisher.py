import logging
import re
from datetime import datetime, timezone

import requests

logger = logging.getLogger(__name__)


class AutoBlogPublisher:
    """Publica artigos no endpoint do AutoBlog hospedado na VPS."""

    def __init__(self, api_url: str, api_secret: str, timeout: int = 30):
        self.api_url = api_url.rstrip("/")
        self.api_secret = api_secret
        self.timeout = timeout
        self.posts_endpoint = f"{self.api_url}/api/posts"
        self.last_status_code = None

    def _slugify(self, text: str) -> str:
        text = (text or "").lower().strip()

        # Remove acentos mais comuns pt-BR sem dependencia externa.
        replacements = {
            "a": "[aàáâãäå]",
            "e": "[eèéêë]",
            "i": "[iìíîï]",
            "o": "[oòóôõö]",
            "u": "[uùúûü]",
            "c": "[cç]",
            "n": "[nñ]",
        }
        for ascii_char, pattern in replacements.items():
            text = re.sub(pattern, ascii_char, text)

        text = re.sub(r"[^a-z0-9\s-]", "", text)
        text = re.sub(r"[\s_-]+", "-", text)
        text = re.sub(r"^-+|-+$", "", text)

        if not text:
            text = f"post-{int(datetime.now(timezone.utc).timestamp())}"

        return text[:120]

    def _excerpt_from_content(self, content: str, limit: int = 180) -> str:
        plain = re.sub(r"<[^>]*>?", "", content or "")
        plain = re.sub(r"\s+", " ", plain).strip()
        if len(plain) <= limit:
            return plain
        return plain[:limit].rstrip() + "..."

    def publish_post(self, title: str, content: str, image_info: dict = None, labels: list = None) -> bool:
        del labels  # Mantido para compatibilidade de assinatura.

        slug_base = self._slugify(title)
        excerpt = self._excerpt_from_content(content)
        image_url = image_info.get("url") if image_info else None
        normalized_secret = self.api_secret.strip('"').strip("'")

        # Alguns ambientes injetam segredo com aspas. Tenta variações para evitar mismatch.
        secret_candidates = [
            self.api_secret,
            normalized_secret,
            f'"{normalized_secret}"',
        ]
        secret_candidates = list(dict.fromkeys([s for s in secret_candidates if s]))

        for attempt in range(8):
            if attempt == 0:
                slug = slug_base
            elif attempt <= 4:
                slug = f"{slug_base}-{attempt + 1}"
            else:
                slug = f"{slug_base}-{int(datetime.now(timezone.utc).timestamp())}-{attempt}"
            response = None
            for candidate_secret in secret_candidates:
                payload = {
                    "title": title,
                    "content": content,
                    "excerpt": excerpt,
                    "slug": slug,
                    "imageUrl": image_url,
                    "secret": candidate_secret,
                }

                try:
                    response = requests.post(
                        self.posts_endpoint,
                        json=payload,
                        headers={"x-api-secret": candidate_secret},
                        timeout=self.timeout,
                    )
                    self.last_status_code = response.status_code
                except requests.RequestException as e:
                    logger.error(f"❌ Erro de rede ao publicar no AutoBlog: {e}")
                    return False

                if response.status_code != 401:
                    break

            if response.status_code == 201:
                logger.info(f"✅ Post publicado no AutoBlog: {self.posts_endpoint} ({slug})")
                return True

            if response.status_code == 409:
                logger.warning(f"⚠️ Conflito ao publicar (slug: {slug}). Tentando novo slug...")
                continue

            # Compatibilidade com backend antigo que devolve 500 para conflito de slug.
            if response.status_code == 500 and "slug" in (response.text or "").lower():
                logger.warning(f"⚠️ Possivel conflito de slug (slug: {slug}). Tentando novo slug...")
                continue

            logger.error(
                "❌ Falha ao publicar no AutoBlog: status=%s body=%s",
                response.status_code,
                response.text,
            )
            return False

        logger.error("❌ Falha ao publicar no AutoBlog após múltiplas tentativas de slug.")
        return False
