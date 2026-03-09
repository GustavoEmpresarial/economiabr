import time
import requests
import feedparser
import logging
from typing import List, Dict

logger = logging.getLogger(__name__)

class RSSFetcher:
    def __init__(self, feed_urls: List[str]):
        self.feed_urls = feed_urls

    def fetch_all(self) -> List[Dict]:
        all_articles = []
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }

        for url in self.feed_urls:
            logger.info(f"Fetching RSS feed: {url}")
            success = False
            for attempt in range(3):  # até 3 tentativas
                try:
                    response = requests.get(url, timeout=30, headers=headers)
                    response.raise_for_status()
                    feed = feedparser.parse(response.content)
                    
                    for entry in feed.entries:
                        link = entry.get("link", "").strip()
                        if not link:
                            continue
                        article = {
                            "title": entry.get("title", "").strip(),
                            "link": link,
                            "published": entry.get("published", ""),
                            "content": self._extract_content(entry)
                        }
                        if article["title"] and article["content"]:
                            all_articles.append(article)
                    success = True
                    break
                except Exception as e:
                    logger.warning(f"Attempt {attempt + 1} failed for {url}: {e}")
                    if attempt < 2:
                        time.sleep(5)
                    else:
                        logger.error(f"Failed to fetch {url} after 3 attempts")

            if not success:
                continue

        logger.info(f"Fetched {len(all_articles)} articles from {len(self.feed_urls)} feeds.")
        return all_articles

    def _extract_content(self, entry) -> str:
        if hasattr(entry, 'content') and entry.content:
            return entry.content[0].value
        elif hasattr(entry, 'summary'):
            return entry.summary
        return ""