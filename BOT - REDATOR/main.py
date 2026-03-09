import os
import time
import logging
from pathlib import Path
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv
import json

# Serviços personalizados
from services.rss_fetcher import RSSFetcher
from services.ollama_rewriter import OllamaSEOWriter
from services.blogger_publisher import BloggerPublisher
from services.image_fetcher import ImageFetcher
from services.text_formatter import TextFormatter
from services.google_indexer import GoogleIndexer

# === CONSTANTES === #
STATS_FILE = Path("storage/stats/daily_stats.json")
ORIGINAL_JSON = Path("storage/articles/original/articles.json")
REWRITTEN_JSON = Path("storage/articles/rewritten/articles.json")

MAX_POSTS_PER_DAY = 75
CHECK_INTERVAL = int(os.getenv("CHECK_INTERVAL_SECONDS", "3600"))

# === CONFIGURAÇÕES DE LOGGING === #
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)

# === FUNÇÕES AUXILIARES === #

def safe_load_json(path: Path, default=None):
    """Carrega JSON com fallback seguro."""
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists():
        try:
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
                return data if isinstance(data, list) else (default or [])
        except Exception as e:
            logging.warning(f"⚠️ Falha ao carregar {path}: {e}")
    return default or []

def safe_save_json(path: Path, data: list):
    """Salva dados em JSON com segurança."""
    try:
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        logging.info(f"💾 Salvou {len(data)} registros em {path}")
    except Exception as e:
        logging.error(f"❌ Falha ao salvar {path}: {e}")
        raise

def load_daily_stats():
    """Carrega ou cria estrutura padrão de stats."""
    STATS_FILE.parent.mkdir(parents=True, exist_ok=True)
    if STATS_FILE.exists():
        try:
            with open(STATS_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                # Garante campos obrigatórios
                defaults = {"date": "", "start_time": "", "count": 0}
                for k, v in defaults.items():
                    if k not in data:
                        data[k] = v
                return data
        except Exception as e:
            logging.warning(f"⚠️ Erro ao ler stats: {e}. Usando valores padrão.")
    return {"date": "", "start_time": "", "count": 0}

def save_daily_stats(date_str: str, start_time: str, count: int):
    """Grava estatísticas diárias no disco."""
    data = {"date": date_str, "start_time": start_time, "count": count}
    try:
        with open(STATS_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
    except Exception as e:
        logging.error(f"❌ Erro ao salvar stats: {e}")

def wait_until_reset_window(start_time_iso: str):
    """Espera até completar 24h desde início do ciclo atual."""
    try:
        start_time = datetime.fromisoformat(start_time_iso.replace('Z', '+00:00'))
    except ValueError:
        logging.warning("⚠️ Hora inválida detectada. Reiniciando ciclo.")
        return

    end_time = start_time + timedelta(hours=24)
    now = datetime.now(timezone.utc)

    while now < end_time:
        remaining = end_time - now
        hours, remainder = divmod(int(remaining.total_seconds()), 3600)
        mins, secs = divmod(remainder, 60)
        print(f"\r⏳ Aguardando reset das 24h... Restam {hours:02}:{mins:02}:{secs:02}", end="", flush=True)
        time.sleep(1)
        now = datetime.now(timezone.utc)
    print("\n🟢 Reset das 24h concluído. Retomando publicações.")

# === FUNÇÃO PRINCIPAL === #

def main():
    load_dotenv()

    # Carrega variáveis do ambiente
    unsplash_access_key = os.getenv("UNSPLASH_ACCESS_KEY")
    feed_urls_str = os.getenv("RSS_FEEDS", "")
    blogger_blog_id = os.getenv("BLOGGER_BLOG_ID")
    ollama_model = os.getenv("OLLAMA_MODEL", "qwen3-vl:235b-cloud")
    site_url = os.getenv("SITE_URL", "")
    enable_indexing = os.getenv("ENABLE_GOOGLE_INDEXING", "true").lower() == "true"
    indexing_interval = int(os.getenv("INDEXING_INTERVAL_SECONDS", "14400"))  # 4 horas

    feed_urls = [url.strip() for url in feed_urls_str.split(",") if url.strip()]

    if not blogger_blog_id:
        logging.error("❌ BLOGGER_BLOG_ID não encontrado no .env")
        return

    if not feed_urls:
        logging.error("❌ Nenhum feed RSS configurado no .env")
        return

    logging.info(f"🚀 Iniciando serviço de processamento com {len(feed_urls)} feed(s)...")
    logging.info(f"🧠 Modelo de redação: {ollama_model}")

    # Inicializa serviços
    fetcher = RSSFetcher(feed_urls)
    rewriter = OllamaSEOWriter(model_name=ollama_model)
    publisher = BloggerPublisher(
        credentials_file="credentials.json",
        blog_id=blogger_blog_id,
        token_file="token.json"
    )
    image_fetcher = ImageFetcher(unsplash_access_key) if unsplash_access_key else None
    
    # Inicializa indexador do Google (se habilitado)
    indexer = None
    if enable_indexing and site_url:
        indexer = GoogleIndexer(
            credentials_file="credentials.json",
            blog_id=blogger_blog_id,
            site_url=site_url,
            token_file="token.json"
        )
        logging.info("📌 Indexador Google ativado")
    elif enable_indexing and not site_url:
        logging.warning("⚠️ SITE_URL não configurado. Indexação desativada.")

    # Carrega artigos já processados
    original_articles = safe_load_json(ORIGINAL_JSON, [])
    rewritten_articles = safe_load_json(REWRITTEN_JSON, [])
    processed_links = {article.get("link") for article in original_articles if article.get("link")}

    # Estado diário
    stats = load_daily_stats()
    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    last_indexing_time = datetime.now(timezone.utc)

    if stats["date"] != today_str:
        stats = {"date": today_str, "start_time": "", "count": 0}
        save_daily_stats(today_str, "", 0)
        logging.info("🔄 Novo dia iniciado. Contador zerado.")
    elif stats["count"] >= MAX_POSTS_PER_DAY:
        logging.info("📊 Limite diário atingido anteriormente.")
        if stats["start_time"]:
            wait_until_reset_window(stats["start_time"])
        stats = {"date": today_str, "start_time": "", "count": 0}
        save_daily_stats(today_str, "", 0)

    daily_count = stats["count"]

    try:
        while True:
            today = datetime.now(timezone.utc).date()
            today_str = today.strftime("%Y-%m-%d")

            if daily_count >= MAX_POSTS_PER_DAY:
                logging.info("📊 Limite diário atingido.")
                start_time_iso = stats["start_time"] or datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
                if not stats["start_time"]:
                    stats["start_time"] = start_time_iso
                    save_daily_stats(today_str, start_time_iso, daily_count)
                wait_until_reset_window(start_time_iso)
                daily_count = 0
                stats["count"] = 0
                stats["start_time"] = ""
                save_daily_stats(today_str, "", 0)

            logging.info("🔍 Verificando próximo artigo não processado...")

            raw_articles = fetcher.fetch_all()
            next_article = None

            for article in raw_articles:
                link = article.get("link", "").strip()
                if not link or link in processed_links:
                    continue
                next_article = article
                break

            if not next_article:
                logging.info(f"📭 Sem artigos novos. Aguardando {CHECK_INTERVAL}s.")
                time.sleep(CHECK_INTERVAL)
                continue

            title_orig = next_article["title"]
            link = next_article["link"]
            logging.info(f"✍️ Processando: {title_orig}")

            rewrite_result = rewriter.rewrite_seo(next_article["content"], title_orig)

            if not rewrite_result:
                logging.warning("⚠️ Falha na reescrita. Pulando artigo.")
                processed_links.add(link)
                time.sleep(10)
                continue

            new_title, new_content = rewrite_result
            new_content = TextFormatter.improve_readability(new_content)

            image_info = None
            if image_fetcher:
                image_info = image_fetcher.get_image_for_title(new_title)
                status = "selecionada" if image_info else "não encontrada"
                logging.info(f"🖼️ Imagem {status} para: '{new_title[:30]}...'")

            logging.info(f"📤 Publicando: {new_title}")
            success = publisher.publish_post(
                title=new_title,
                content=new_content,
                image_info=image_info
            )

            now_utc = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

            original_entry = {
                "title": title_orig,
                "link": link,
                "published": next_article.get("published", ""),
                "content": next_article["content"],
                "fetched_at": now_utc
            }
            original_articles.append(original_entry)

            rewritten_entry = {
                "original_title": title_orig,
                "title": new_title,
                "link": link,
                "rewritten_content": new_content,
                "rewritten_at": now_utc,
                "published_to_blogger": success
            }
            rewritten_articles.append(rewritten_entry)

            processed_links.add(link)

            safe_save_json(ORIGINAL_JSON, original_articles)
            safe_save_json(REWRITTEN_JSON, rewritten_articles)

            if success:
                daily_count += 1
                stats["count"] = daily_count
                if not stats["start_time"]:
                    stats["start_time"] = now_utc
                save_daily_stats(today_str, stats["start_time"], daily_count)
                logging.info(f"✅ Artigo publicado com sucesso! ({daily_count}/{MAX_POSTS_PER_DAY})")
            else:
                logging.error("❌ Falha ao publicar. Marcado como processado.")
# Verifica se deve indexar novos posts
            now = datetime.now(timezone.utc)
            if indexer and (now - last_indexing_time).total_seconds() >= indexing_interval:
                logging.info("🔍 Iniciando indexação de novos posts no Google...")
                try:
                    result = indexer.index_posts_batch(max_new_posts=10)
                    logging.info(f"📊 Indexação concluída: {result['new_posts_indexed']} posts novos indexados")
                    last_indexing_time = now
                except Exception as e:
                    logging.error(f"❌ Erro na indexação: {e}")

            
            logging.info("⏳ Aguardando 120s antes do próximo artigo (segurança de quota)...")
            time.sleep(120)

    except KeyboardInterrupt:
        logging.info("🛑 Serviço interrompido pelo usuário.")
    except Exception as e:
        logging.exception("💥 Erro inesperado no loop principal")

if __name__ == "__main__":
    main()
