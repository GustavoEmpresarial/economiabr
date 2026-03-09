# services/blogger_publisher.py

import os
import logging
import re
from google.auth.transport.requests import Request
from google.auth.exceptions import RefreshError
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build

logger = logging.getLogger(__name__)

# Escopo da API do Blogger — corrigido (sem espaços extras)
SCOPES = ['https://www.googleapis.com/auth/blogger']

class BloggerPublisher:
    def __init__(self, credentials_file: str, blog_id: str, token_file: str = "token.json"):
        self.credentials_file = credentials_file
        self.token_file = token_file
        self.blog_id = blog_id
        self.service = self._build_service()

    def _build_service(self):
        creds = None
        if os.path.exists(self.token_file):
            creds = Credentials.from_authorized_user_file(self.token_file, SCOPES)
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
            with open(self.token_file, 'w') as token:
                token.write(creds.to_json())
        return build('blogger', 'v3', credentials=creds)

    def _post_exists(self, title: str) -> bool:
        """
        Verifica se já existe um post com o mesmo título no blog.
        """
        try:
            # Busca posts com título semelhante (pode haver variações)
            response = self.service.posts().list(
                blogId=self.blog_id,
                fields="items(title)",
                maxResults=100  # Verifica os últimos 100 posts
            ).execute()

            items = response.get("items", [])
            for item in items:
                if item.get("title").strip() == title.strip():
                    logger.info(f"⚠️ Post com título duplicado encontrado: {title}")
                    return True
            return False
        except Exception as e:
            logger.error(f"❌ Erro ao verificar duplicidade de post: {e}")
            return False

    def publish_post(self, title: str, content: str, image_info: dict = None, labels: list = None) -> bool:
        """
        Publica um novo post no Blogger com texto grande, claro e bem espaçado.
        - image_info (opcional): dict com chave 'url'
        - Retorna True se sucesso e não duplicado.
        """
        # ✅ Verifica se o post já existe
        if self._post_exists(title):
            logger.warning(f"⏭️ Ignorando post duplicado: {title}")
            return False

        try:
            # ✅ Aplica estilo aos parágrafos, títulos, tabelas e blockquotes
            content_html = self._style_content(content)
            logger.info(f"✅ Conteúdo formatado com estilos aplicados")

            # Adiciona imagem no topo com atribuição, se disponível
            if image_info and image_info.get("url"):
                photographer = image_info.get("photographer", "Desconhecido")
                source = image_info.get("source", "")
                
                # Cria HTML da imagem com crédito
                img_html = (
                    f'<img src="{image_info["url"]}" '
                    f'style="width:100%; height:auto; max-height:500px; '
                    f'object-fit:cover; margin-bottom:16px; border-radius:8px;">'
                )
                
                # Adiciona crédito da imagem
                credit_html = (
                    f'<p style="text-align:right; margin-top:0; margin-bottom:32px; '
                    f'font-size:13px; color:#888; line-height:1.5;">'
                    f'<em>Imagem: {photographer} • Fonte: {source}</em>'
                    f'</p>'
                )
                
                content_html = img_html + credit_html + content_html

            body = {
                "kind": "blogger#post",
                "title": title,
                "content": content_html,
                "labels": labels or ["automático", "notícia"]
            }

            request = self.service.posts().insert(blogId=self.blog_id, body=body, isDraft=False)
            response = request.execute()
            logger.info(f"✅ Post publicado no Blogger: {response['url']}")
            return True

        except Exception as e:
            logger.error(f"❌ Falha ao publicar no Blogger: {e}")
            return False

    def _style_content(self, content: str) -> str:
        """
        Adiciona estilos CSS aos elementos HTML (parágrafos, títulos, tabelas, blockquotes).
        """
        styled_content = content
        
        # Estilo para parágrafos
        styled_content = re.sub(
            r'<p>(.+?)</p>',
            r'<p style="margin-bottom: 20px; line-height: 1.7; font-size: 18px; color: #333;">\1</p>',
            styled_content,
            flags=re.DOTALL
        )
        
        # Estilo para h2 (adiciona margem superior para separar do parágrafo anterior)
        styled_content = re.sub(
            r'<h2>(.+?)</h2>',
            r'<h2 style="margin-top: 32px; margin-bottom: 16px; font-size: 28px; color: #1a1a1a; font-weight: bold; border-bottom: 2px solid #007BFF; padding-bottom: 8px;">\1</h2>',
            styled_content,
            flags=re.DOTALL
        )
        
        # Estilo para h3
        styled_content = re.sub(
            r'<h3>(.+?)</h3>',
            r'<h3 style="margin-top: 24px; margin-bottom: 12px; font-size: 22px; color: #333; font-weight: bold;">\1</h3>',
            styled_content,
            flags=re.DOTALL
        )
        
        # Estilo para blockquotes (citações destacadas)
        styled_content = re.sub(
            r'<blockquote[^>]*>(.+?)</blockquote>',
            r'<blockquote style="margin: 24px 0; padding: 16px 20px; border-left: 4px solid #007BFF; background-color: #f0f7ff; font-style: italic; color: #555; line-height: 1.6; font-size: 16px;">\1</blockquote>',
            styled_content,
            flags=re.DOTALL
        )
        
        # Estilo para tabelas
        styled_content = re.sub(
            r'<table[^>]*>',
            r'<table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 16px;">',
            styled_content
        )
        
        # Estilo para th (cabeçalho de tabela)
        styled_content = re.sub(
            r'<th>(.+?)</th>',
            r'<th style="background-color: #007BFF; color: white; padding: 12px; text-align: left; font-weight: bold; border: 1px solid #ddd;">\1</th>',
            styled_content,
            flags=re.DOTALL
        )
        
        # Estilo para td (célula de tabela)
        styled_content = re.sub(
            r'<td>(.+?)</td>',
            r'<td style="padding: 12px; border: 1px solid #ddd; color: #333;">\1</td>',
            styled_content,
            flags=re.DOTALL
        )
        
        # Estilo para ul (listas não ordenadas)
        styled_content = re.sub(
            r'<ul>',
            r'<ul style="margin: 16px 0; margin-left: 24px;">',
            styled_content
        )
        
        # Estilo para li (itens de lista)
        styled_content = re.sub(
            r'<li>(.+?)</li>',
            r'<li style="margin-bottom: 8px; line-height: 1.6; font-size: 16px; color: #333;">\1</li>',
            styled_content,
            flags=re.DOTALL
        )
        
        return styled_content