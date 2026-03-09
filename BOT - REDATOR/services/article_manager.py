# services/article_manager.py

import json
import hashlib
import logging
import time
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Any

from services.rss_fetcher import RSSFetcher
from services.gemini_rewriter import GeminiRewriter

logger = logging.getLogger(__name__)

class ArticleManager:
    def __init__(
        self,
        feed_urls: List[str],
        gemini_api_key: str,
        original_json: str = "storage/articles/original/articles.json",
        rewritten_json: str = "storage/articles/rewritten/articles.json"
    ):
        self.fetcher = RSSFetcher(feed_urls)
        self.rewriter = GeminiRewriter(gemini_api_key)
        
        self.original_path = Path(original_json)
        self.rewritten_path = Path(rewritten_json)
        
        # Garante que as pastas existam
        self.original_path.parent.mkdir(parents=True, exist_ok=True)
        self.rewritten_path.parent.mkdir(parents=True, exist_ok=True)

        # Carrega dados existentes
        self.original_articles = self._load_json(self.original_path)
        self.rewritten_articles = self._load_json(self.rewritten_path)

        # Conjunto de hashes já processados
        self.existing_hashes = set(
            article.get("hash") for article in self.original_articles
            if article.get("hash")
        )

        # Expor caminhos para o main.py
        self.original_articles_path = self.original_path
        self.rewritten_articles_path = self.rewritten_path

    def process_new_articles(self) -> List[Dict]:
        """
        Processa até 5 artigos novos do RSS (para evitar quota limit).
        Retorna lista de artigos reescritos (para publicação).
        """
        raw_articles = self.fetcher.fetch_all()
        new_candidates = []

        # Filtra artigos não processados
        for article in raw_articles:
            article_hash = self._hash_article(article)
            if article_hash not in self.existing_hashes:
                new_candidates.append((article_hash, article))

        if not new_candidates:
            logger.info("📭 No new articles found.")
            return []

        # ⚠️ Limite para evitar 429 (quota excedida)
        MAX_PER_CYCLE = 5
        if len(new_candidates) > MAX_PER_CYCLE:
            logger.info(f"📬 Found {len(new_candidates)} new articles. Processing only {MAX_PER_CYCLE} (limit per cycle).")
            new_candidates = new_candidates[:MAX_PER_CYCLE]
        else:
            logger.info(f"🆕 Found {len(new_candidates)} new articles. Processing...")

        new_rewritten = []

        for i, (article_hash, article) in enumerate(new_candidates):
            # --- Salva versão original ---
            original_entry = {
                "hash": article_hash,
                "title": article["title"],
                "link": article["link"],
                "published": article.get("published", ""),
                "content": article["content"],
                "fetched_at": datetime.utcnow().isoformat() + "Z"
            }
            self.original_articles.append(original_entry)
            self.existing_hashes.add(article_hash)

            # --- Reescreve TÍTULO e CONTEÚDO ---
            rewrite_result = self.rewriter.rewrite(article["content"], article["title"])
            if rewrite_result is not None:
                new_title, new_content = rewrite_result
                rewritten_entry = {
                    "hash": article_hash,
                    "original_title": article["title"],
                    "title": new_title,
                    "rewritten_content": new_content,
                    "rewritten_at": datetime.utcnow().isoformat() + "Z"
                }
                self.rewritten_articles.append(rewritten_entry)
                new_rewritten.append(rewritten_entry)
            else:
                logger.warning(f"⚠️ Skipping rewrite for: {article['title']}")

            # ⏳ Delay para respeitar quota (10 RPM = 1 a cada 6s)
            if i < len(new_candidates) - 1:  # não espera após o último
                logger.info("⏳ Respeitando limite de quota... aguardando 6.1s")
                time.sleep(6.1)

        # --- Salva ambos os arquivos ---
        self._save_json(self.original_path, self.original_articles)
        self._save_json(self.rewritten_path, self.rewritten_articles)

        logger.info(f"✅ Successfully processed {len(new_rewritten)} new articles.")
        return new_rewritten

    def _hash_article(self, article: Dict[str, Any]) -> str:
        key = f"{article['title']}|{article['link']}".encode("utf-8")
        return hashlib.sha256(key).hexdigest()

    def _load_json(self, path: Path) -> List[Dict]:
        if path.exists():
            try:
                with open(path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    return data if isinstance(data, list) else []
            except Exception as e:
                logger.error(f"Failed to load {path}: {e}")
        return []

    def _save_json(self, path: Path, data: List[Dict]) -> None:
        try:
            with open(path, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            logger.info(f"💾 Saved {len(data)} records to {path}")
        except Exception as e:
            logger.error(f"❌ Failed to save {path}: {e}")
            raise