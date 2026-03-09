# services/text_formatter.py

import re
import logging

logger = logging.getLogger(__name__)

class TextFormatter:
    @staticmethod
    def improve_readability(text: str) -> str:
        """
        Garante parágrafos bem espaçados e frases fluidas.
        """
        if not text or not text.strip():
            return ""

        # Remove múltiplos espaços
        text = re.sub(r'\s+', ' ', text).strip()

        # Divide em frases
        sentences = re.split(r'(?<=[.!?])\s+', text)
        sentences = [s.strip() for s in sentences if len(s.strip()) > 8]

        if not sentences:
            return text

        paragraphs = []
        current_para = []

        for sent in sentences:
            current_para.append(sent)
            if len(current_para) >= 2:  # 1–2 frases por parágrafo
                paragraphs.append(" ".join(current_para))
                current_para = []

        if current_para:
            paragraphs.append(" ".join(current_para))

        # Garante que cada parágrafo termine com pontuação
        clean_paragraphs = []
        for p in paragraphs:
            p = p.strip()
            if p and not p.endswith(('.', '!', '?')):
                p += '.'
            clean_paragraphs.append(p)

        # ✅ Junta com DUAS quebras de linha → essencial para o HTML
        return "\n\n".join(clean_paragraphs)