import requests
import logging
import re
import time
import os
from typing import Optional, Tuple
try:
    from ddgs import DDGS
except ImportError:
    from duckduckgo_search import DDGS

logger = logging.getLogger(__name__)

class OllamaSEOWriter:
    def __init__(self, model_name: str = "qwen2.5:14b"): # Mantive o 14b que você baixou
        self.model_name = model_name
        base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434").strip().rstrip("/")
        # Accept either base URL (http://host:11434) or full generate path.
        self.api_url = base_url if base_url.endswith("/api/generate") else f"{base_url}/api/generate"
        self.ddgs = DDGS()

    def _get_web_context(self, query: str, max_results: int = 3) -> str:
        """Busca informações rápidas na web."""
        try:
            logger.info(f"🔍 Buscando na web por: '{query}'...")
            results = self.ddgs.text(query, max_results=max_results)
            if not results:
                return ""
            context_text = "DADOS ATUAIS DA WEB:\n"
            for i, res in enumerate(results, 1):
                context_text += f"{i}. {res['title']}: {res['body']}\n"
            return context_text
        except Exception as e:
            logger.error(f"Erro na busca web (ignorado): {e}")
            return ""

    def rewrite_seo(self, original_text: str, original_title: str) -> Optional[Tuple[str, str]]:
        if not original_text or not original_text.strip():
            return None

        web_context = self._get_web_context(original_title)

        # --- PROMPT FOCADO EM HTML PARA BLOGGER ---
        prompt_instruction = (
            "ATUE COMO: Desenvolvedor Web Sênior e Jornalista Especializado.\n"
            "TAREFA: Escrever um artigo EXTENSO e COMPLETO já formatado em CÓDIGO HTML para o Blogger.\n\n"
            
            "REQUISITOS DE TAMANHO:\n"
            "- O artigo deve ter entre 500 a 2000 PALAVRAS.\n"
            "- Desenvolva cada tópico com profundidade e detalhes.\n"
            "- Inclua múltiplas seções bem estruturadas.\n"
            "- Adicione exemplos práticos, estatísticas e dados relevantes.\n\n"
            
            "REGRAS DE FORMATAÇÃO (IMPORTANTE):\n"
            "1. NÃO use Markdown (não use ##, não use **). Use APENAS tags HTML.\n"
            "2. Use <h2> para Títulos de Seções Principais.\n"
            "3. Use <h3> para Subtítulos e Sub-seções.\n"
            "4. Use <p> para todos os parágrafos. CADA PARÁGRAFO DEVE TER 3-5 LINHAS.\n"
            "5. Use <b> para destacar palavras-chave importantes.\n"
            "6. Use <ul> e <li> se houver listas (mínimo 3 itens por lista).\n"
            "7. ADICIONE SEMPRE 2-3 LINHAS EM BRANCO (passe múltiplos </p> e quebras) ENTRE O ÚLTIMO PARÁGRAFO E O PRÓXIMO <h2> OU <h3>.\n"
            "8. Use <blockquote> para citações destacadas com a classe 'citation-style'.\n"
            "9. Crie TABELAS com <table>, <thead>, <tbody>, <tr>, <th>, <td> quando for relevante incluir dados.\n"
            "10. NÃO inclua tags de estrutura global como <html>, <head> ou <body>. Apenas o conteúdo do post.\n\n"
            
            "ESTRUTURA DO ARTIGO:\n"
            "- INTRODUÇÃO: Engajante e clara (2-3 parágrafos).\n"
            "- DESENVOLVIMENTO: Mínimo 4-6 SEÇÕES principais, cada uma com subtópicos.\n"
            "- Cada seção deve ter 2-4 parágrafos com informações detalhadas.\n"
            "- Inclua PELO MENOS UMA TABELA com dados relevantes.\n"
            "- Inclua PELO MENOS UM BLOCKQUOTE com citação ou ponto importante.\n"
            "- SEMPRE deixe espaço (adicione quebras) entre seções e títulos.\n"
            "- CONCLUSÃO: Resumo e chamada para ação (2-3 parágrafos).\n"
            "- DICAS FINAIS: Adicione sempre uma seção com 3-5 dicas práticas.\n\n"

            "SAÍDA OBRIGATÓRIA:\n"
            "TÍTULO: [Apenas o texto do título, sem tags]\n"
            "CONTEÚDO: [O código HTML completo do artigo com 500-2000 palavras]"
        )

        full_prompt = (
            f"{prompt_instruction}\n\n"
            f"--- FONTE ORIGINAL ---\n{original_text}\n\n"
            f"--- {web_context} ---"
        )

        # ✅ RETRY COM BACKOFF EXPONENCIAL
        max_retries = 3
        retry_delay = 5  # segundos entre tentativas
        
        for attempt in range(1, max_retries + 1):
            try:
                logger.info(f"✍️ Gerando HTML com Ollama ({self.model_name}) [Tentativa {attempt}/{max_retries}]...")
                
                response = requests.post(
                    self.api_url,
                    json={
                        "model": self.model_name,
                        "prompt": full_prompt,
                        "stream": False,
                        "options": {
                            "temperature": 0.4, 
                            "num_ctx": 16384,  # Aumentado de 8192 para mais contexto
                            "num_predict": 4096  # Aumentado de -1 para gerar até 4096 tokens (~2000 palavras)
                        }
                    },
                    timeout=1200  # 20 minutos para artigos maiores
                )
                response.raise_for_status()
                result = response.json()
                output = result.get("response", "").strip()
                
                logger.info(f"✅ Resposta recebida do Ollama com sucesso!")

                # Limpeza de blocos de código markdown se o bot insistir em colocar
                output = output.replace("```html", "").replace("```", "")

                # Regex para separar Título e Conteúdo
                pattern = r"TÍTULO:\s*(.*?)\s*CONTEÚDO:\s*(.*)"
                match = re.search(pattern, output, re.DOTALL | re.IGNORECASE)

                if match:
                    new_title = match.group(1).strip().strip('"')
                    new_content = match.group(2).strip()
                    logger.info(f"📝 Título extraído: {new_title[:50]}...")
                    return (new_title, new_content)
                
                # Fallback
                parts = output.split('\n', 1)
                t = parts[0].replace("TÍTULO:", "").strip()
                c = parts[1].replace("CONTEÚDO:", "").strip() if len(parts) > 1 else output
                logger.info(f"📝 Título extraído (fallback): {t[:50]}...")
                return (t, c)

            except requests.exceptions.Timeout:
                logger.warning(f"⏱️ Timeout na tentativa {attempt}/{max_retries}. Esperando {retry_delay}s antes de tentar novamente...")
                if attempt < max_retries:
                    time.sleep(retry_delay)
                    retry_delay *= 2  # Backoff exponencial: 5s, 10s, 20s
                else:
                    logger.error(f"❌ Falha após {max_retries} tentativas de timeout")
                    return None
                    
            except requests.exceptions.ConnectionError as e:
                logger.warning(f"🔗 Erro de conexão na tentativa {attempt}/{max_retries}: {e}. Aguardando {retry_delay}s...")
                if attempt < max_retries:
                    time.sleep(retry_delay)
                    retry_delay *= 2
                else:
                    logger.error(f"❌ Falha após {max_retries} tentativas de conexão")
                    return None
                    
            except Exception as e:
                logger.error(f"❌ Erro Ollama (tentativa {attempt}/{max_retries}): {e}")
                if attempt < max_retries:
                    time.sleep(retry_delay)
                    retry_delay *= 2
                else:
                    logger.error(f"❌ Falha após {max_retries} tentativas")
                    return None
        
        return None