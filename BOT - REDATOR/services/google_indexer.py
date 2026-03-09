# services/google_indexer.py

import os
import logging
import json
from datetime import datetime
from google.auth.transport.requests import Request
from google.auth.exceptions import RefreshError
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from pathlib import Path

logger = logging.getLogger(__name__)

# Escopos para API do Blogger e Search Console
SCOPES = [
    'https://www.googleapis.com/auth/blogger',
    'https://www.googleapis.com/auth/webmasters'
]

class GoogleIndexer:
    def __init__(self, credentials_file: str, blog_id: str, site_url: str, token_file: str = "token.json"):
        """
        Inicializa o indexador do Google.
        
        Args:
            credentials_file: Caminho do arquivo credentials.json
            blog_id: ID do blog no Blogger
            site_url: URL do site (ex: https://seusite.com/)
            token_file: Arquivo de token OAuth
        """
        self.credentials_file = credentials_file
        self.token_file = token_file
        self.blog_id = blog_id
        self.site_url = site_url.rstrip('/') + '/'
        
        self.blogger_service = None
        self.searchconsole_service = None
        self.indexed_posts_file = Path("storage/stats/indexed_posts.json")
        
        self._build_services()
        self._ensure_indexed_file()

    def _build_services(self):
        """Constrói as credenciais e serviços da API."""
        creds = None
        
        # Carrega token existente
        if os.path.exists(self.token_file):
            try:
                creds = Credentials.from_authorized_user_file(self.token_file, SCOPES)
            except Exception as e:
                logger.warning(f"⚠️ Erro ao carregar token: {e}")
                creds = None
        
        # Renova ou cria novas credenciais
        if not creds or not creds.valid:
            if creds and creds.expired and creds.refresh_token:
                try:
                    creds.refresh(Request())
                except RefreshError as e:
                    logger.warning(f"⚠️ Token expirado/inválido ({e}). Reautenticando...")
                    try:
                        os.remove(self.token_file)
                    except OSError:
                        pass
                    flow = InstalledAppFlow.from_client_secrets_file(
                        self.credentials_file, SCOPES
                    )
                    creds = flow.run_local_server(port=0)
            else:
                flow = InstalledAppFlow.from_client_secrets_file(
                    self.credentials_file, SCOPES
                )
                creds = flow.run_local_server(port=0)
            
            # Salva o token
            with open(self.token_file, 'w') as token:
                token.write(creds.to_json())
                logger.info("💾 Token salvo com sucesso")
        
        # Constrói os serviços
        try:
            self.blogger_service = build('blogger', 'v3', credentials=creds)
            logger.info("✅ Serviço Blogger conectado")
        except Exception as e:
            logger.error(f"❌ Erro ao conectar Blogger: {e}")
        
        try:
            self.searchconsole_service = build('webmasters', 'v3', credentials=creds)
            logger.info("✅ Serviço Search Console conectado")
        except Exception as e:
            logger.error(f"❌ Erro ao conectar Search Console: {e}")

    def _ensure_indexed_file(self):
        """Garante que o arquivo de posts indexados existe."""
        self.indexed_posts_file.parent.mkdir(parents=True, exist_ok=True)
        if not self.indexed_posts_file.exists():
            with open(self.indexed_posts_file, 'w', encoding='utf-8') as f:
                json.dump([], f, ensure_ascii=False, indent=2)

    def _load_indexed_posts(self) -> list:
        """Carrega a lista de posts já indexados."""
        try:
            with open(self.indexed_posts_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            logger.warning(f"⚠️ Erro ao carregar posts indexados: {e}")
            return []

    def _save_indexed_posts(self, posts: list):
        """Salva a lista de posts indexados."""
        try:
            with open(self.indexed_posts_file, 'w', encoding='utf-8') as f:
                json.dump(posts, f, ensure_ascii=False, indent=2)
            logger.info(f"💾 {len(posts)} posts indexados salvos")
        except Exception as e:
            logger.error(f"❌ Erro ao salvar posts indexados: {e}")

    def fetch_published_posts(self, max_results: int = 50) -> list:
        """
        Busca posts publicados no Blogger.
        
        Args:
            max_results: Número máximo de posts a buscar
            
        Returns:
            Lista de posts com id, title, url e published date
        """
        if not self.blogger_service:
            logger.error("❌ Serviço Blogger não está disponível")
            return []
        
        try:
            response = self.blogger_service.posts().list(
                blogId=self.blog_id,
                maxResults=min(max_results, 500),
                fetchBodies=False,
                fields="items(id,title,url,published)"
            ).execute()
            
            posts = response.get("items", [])
            logger.info(f"📝 {len(posts)} posts encontrados no Blogger")
            return posts
            
        except Exception as e:
            logger.error(f"❌ Erro ao buscar posts do Blogger: {e}")
            return []

    def index_post_on_google(self, post_url: str) -> bool:
        """
        Indexa um único post no Google usando a Indexing API.
        
        Args:
            post_url: URL completa do post
            
        Returns:
            True se indexado com sucesso
        """
        if not self.searchconsole_service:
            logger.error("❌ Serviço Search Console não está disponível")
            return False
        
        try:
            # Tenta usar a URL Inspection API do Search Console
            request = self.searchconsole_service.urlInspection().index(
                body={
                    "inspectionUrl": post_url,
                    "languageCode": "pt-BR"
                }
            )
            
            response = request.execute()
            
            if response:
                logger.info(f"✅ Post indexado: {post_url}")
                return True
            else:
                logger.warning(f"⚠️ Resposta vazia ao indexar: {post_url}")
                return False
                
        except Exception as e:
            logger.warning(f"⚠️ Erro ao indexar {post_url}: {e}")
            # Continua mesmo com erro, pois o Google pode ter indexado
            return False

    def index_posts_batch(self, max_new_posts: int = 10) -> dict:
        """
        Indexa múltiplos posts do Blogger no Google.
        
        Args:
            max_new_posts: Número máximo de posts novos para indexar
            
        Returns:
            Dict com estatísticas da indexação
        """
        logger.info("🔍 Iniciando indexação de posts...")
        
        # Busca posts publicados
        published_posts = self.fetch_published_posts(max_results=100)
        
        if not published_posts:
            logger.warning("⚠️ Nenhum post encontrado para indexar")
            return {
                "total_posts": 0,
                "new_posts_indexed": 0,
                "timestamp": datetime.now().isoformat()
            }
        
        # Carrega posts já indexados
        indexed_posts = self._load_indexed_posts()
        indexed_urls = {post.get("url") for post in indexed_posts}
        
        # Identifica posts novos
        new_posts = [
            post for post in published_posts 
            if post.get("url") not in indexed_urls
        ]
        
        # Limita o número de posts a indexar
        new_posts = new_posts[:max_new_posts]
        
        logger.info(f"📊 Posts publicados: {len(published_posts)}")
        logger.info(f"📊 Posts já indexados: {len(indexed_posts)}")
        logger.info(f"📊 Posts novos para indexar: {len(new_posts)}")
        
        # Indexa posts novos
        indexed_count = 0
        for post in new_posts:
            post_url = post.get("url", "")
            if self.index_post_on_google(post_url):
                indexed_count += 1
                
                # Adiciona à lista de indexados
                indexed_posts.append({
                    "id": post.get("id"),
                    "title": post.get("title"),
                    "url": post_url,
                    "published": post.get("published"),
                    "indexed_at": datetime.now().isoformat()
                })
        
        # Salva a lista atualizada
        self._save_indexed_posts(indexed_posts)
        
        result = {
            "total_posts": len(published_posts),
            "already_indexed": len(indexed_posts) - indexed_count,
            "new_posts_indexed": indexed_count,
            "failed_to_index": len(new_posts) - indexed_count,
            "timestamp": datetime.now().isoformat()
        }
        
        logger.info(f"✅ Indexação concluída: {indexed_count}/{len(new_posts)} posts indexados")
        
        return result

    def get_indexation_status(self) -> dict:
        """Retorna o status atual da indexação."""
        indexed_posts = self._load_indexed_posts()
        
        return {
            "total_indexed": len(indexed_posts),
            "last_indexed": indexed_posts[-1].get("indexed_at") if indexed_posts else None,
            "indexed_posts": indexed_posts
        }
