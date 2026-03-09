'use client'

import { useMemo, useState } from 'react'

type UploadResponse = {
  url?: string
  error?: string
}

type PostResponse = {
  id?: string
  slug?: string
  error?: string
}

function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

export default function AdminPage() {
  const [apiSecret, setApiSecret] = useState('')
  const [title, setTitle] = useState('')
  const [excerpt, setExcerpt] = useState('')
  const [content, setContent] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [feedback, setFeedback] = useState('')

  const slug = useMemo(() => slugify(title), [title])

  async function handleUpload(file: File) {
    if (!apiSecret.trim()) {
      setFeedback('Preencha o API_SECRET antes de enviar imagem.')
      return
    }

    const formData = new FormData()
    formData.append('file', file)
    formData.append('secret', apiSecret.trim())

    setUploading(true)
    setFeedback('Enviando imagem...')

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      const data = (await res.json()) as UploadResponse

      if (!res.ok || !data.url) {
        setFeedback(data.error || 'Falha ao enviar imagem.')
        return
      }

      setImageUrl(data.url)
      setFeedback('Imagem enviada com sucesso.')
    } catch {
      setFeedback('Erro inesperado no upload de imagem.')
    } finally {
      setUploading(false)
    }
  }

  async function handlePublish() {
    if (!apiSecret.trim()) {
      setFeedback('Preencha o API_SECRET.')
      return
    }

    if (!title.trim() || !content.trim()) {
      setFeedback('Título e conteúdo são obrigatórios.')
      return
    }

    if (!slug) {
      setFeedback('Não foi possível gerar um slug válido para o título.')
      return
    }

    setPublishing(true)
    setFeedback('Publicando post...')

    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-secret': apiSecret.trim(),
        },
        body: JSON.stringify({
          title: title.trim(),
          slug,
          excerpt: excerpt.trim() || undefined,
          content,
          imageUrl: imageUrl.trim() || undefined,
        }),
      })

      const data = (await res.json()) as PostResponse

      if (!res.ok || !data.id) {
        setFeedback(data.error || 'Falha ao publicar post.')
        return
      }

      setFeedback(`Post publicado com sucesso. Slug: ${slug}`)
      setTitle('')
      setExcerpt('')
      setContent('')
      setImageUrl('')
    } catch {
      setFeedback('Erro inesperado ao publicar post.')
    } finally {
      setPublishing(false)
    }
  }

  return (
    <div className="container" style={{ maxWidth: 900, paddingTop: '2rem', paddingBottom: '2rem' }}>
      <h1 style={{ marginBottom: '1rem' }}>Painel Admin</h1>
      <p style={{ marginBottom: '1.5rem', color: 'var(--text-muted)' }}>
        Publique posts manualmente e envie imagens para <code>/public/uploads</code>.
      </p>

      <div style={{ display: 'grid', gap: '1rem' }}>
        <label>
          API Secret
          <input
            type="password"
            value={apiSecret}
            onChange={(e) => setApiSecret(e.target.value)}
            placeholder="autoblog_secret_2026"
            style={{ width: '100%', marginTop: 6, padding: 10 }}
          />
        </label>

        <label>
          Titulo
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Digite o titulo do post"
            style={{ width: '100%', marginTop: 6, padding: 10 }}
          />
        </label>

        <label>
          Slug (automatico)
          <input
            type="text"
            value={slug}
            readOnly
            style={{ width: '100%', marginTop: 6, padding: 10, opacity: 0.9 }}
          />
        </label>

        <label>
          Excerpt
          <input
            type="text"
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            placeholder="Resumo opcional"
            style={{ width: '100%', marginTop: 6, padding: 10 }}
          />
        </label>

        <label>
          Conteudo (HTML permitido)
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={12}
            placeholder="Cole aqui o conteudo completo"
            style={{ width: '100%', marginTop: 6, padding: 10 }}
          />
        </label>

        <label>
          Upload de imagem
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) {
                void handleUpload(file)
              }
            }}
            disabled={uploading}
            style={{ width: '100%', marginTop: 6 }}
          />
        </label>

        <label>
          URL da imagem
          <input
            type="text"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="/uploads/sua-imagem.jpg"
            style={{ width: '100%', marginTop: 6, padding: 10 }}
          />
        </label>

        <button
          onClick={() => void handlePublish()}
          disabled={publishing}
          style={{
            background: '#c4170c',
            border: 'none',
            color: '#fff',
            padding: '0.8rem 1rem',
            fontWeight: 700,
            cursor: 'pointer',
            borderRadius: 4,
          }}
        >
          {publishing ? 'Publicando...' : 'Publicar Post'}
        </button>

        {feedback ? <p style={{ marginTop: 6 }}>{feedback}</p> : null}
      </div>
    </div>
  )
}
