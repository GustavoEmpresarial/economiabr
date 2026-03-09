import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { Metadata } from 'next'

interface PostPageProps {
    params: {
        slug: string
    }
}

export async function generateMetadata({ params }: PostPageProps): Promise<Metadata> {
    const { slug } = await params
    const post = await prisma.post.findUnique({
        where: { slug },
    })

    if (!post) return {}

    return {
        title: `${post.title} | Notícias`,
        description: post.excerpt || post.content.substring(0, 160).replace(/<[^>]*>?/gm, ''),
    }
}

export default async function PostPage({ params }: PostPageProps) {
    const { slug } = await params
    const post = await prisma.post.findUnique({
        where: { slug },
    })

    if (!post) {
        notFound()
    }

    return (
        <div className="container">
            <header className="article-header">
                {post.imageUrl && (
                    <img src={post.imageUrl} alt={post.title} style={{ width: '100%', borderRadius: '8px', marginBottom: '2rem' }} />
                )}
                <span className="category-tag" style={{ fontSize: '1rem' }}>NOTÍCIA</span>
                <h1>{post.title}</h1>
                {post.excerpt && <p style={{ fontSize: '1.5rem', color: 'var(--text-muted)', marginBottom: '2rem' }}>{post.excerpt}</p>}

                <div className="article-meta">
                    Por <strong>AutoBlog AI</strong> — Cidade
                    <br />
                    {new Date(post.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })} {new Date(post.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </div>
            </header>

            <article className="article-content" dangerouslySetInnerHTML={{ __html: post.content }} />
        </div>
    )
}
