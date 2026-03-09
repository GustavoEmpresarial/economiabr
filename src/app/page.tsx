import { db } from '@/lib/db'
import Link from 'next/link'

export const revalidate = 60

type PostRow = {
  id: string
  title: string
  slug: string
  content: string
  excerpt: string | null
  imageUrl: string | null
  published: number
  createdAt: string
  updatedAt: string
}

export default async function Home() {
  const allPosts = db.prepare(`
    SELECT * FROM "Post" 
    WHERE published = 1 
    ORDER BY createdAt DESC
  `).all() as PostRow[]

  const featured = allPosts[0]
  const secondaries = allPosts.slice(1, 3)
  const feed = allPosts.slice(3)

  return (
    <div className="container">
      {/* G1 Hero Grid */}
      <section className="news-grid">
        {featured ? (
          <div className="main-featured">
            <Link href={`/blog/${featured.slug}`}>
              {featured.imageUrl && (
                <img src={featured.imageUrl} alt={featured.title} className="feed-image" style={{ marginBottom: '1.5rem', maxHeight: '500px' }} />
              )}
              <span className="category-tag">DESTAQUE</span>
              <h1 className="featured-title">{featured.title}</h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>
                {featured.excerpt || featured.content.substring(0, 180).replace(/<[^>]*>?/gm, '') + '...'}
              </p>
            </Link>
          </div>
        ) : (
          <div className="main-featured">
            <h1>Nenhuma notícia em destaque</h1>
          </div>
        )}

        <div className="secondary-column">
          {secondaries.map((post) => (
            <div key={post.id} className="secondary-news">
              <Link href={`/blog/${post.slug}`}>
                <span className="category-tag">GERAL</span>
                <h2 className="secondary-title">{post.title}</h2>
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Feed List */}
      <section className="feed-content">
        <h2 style={{ borderBottom: '2px solid #c4170c', display: 'inline-block', marginBottom: '2rem', paddingBottom: '0.2rem' }}>MAIS NOTÍCIAS</h2>
        {feed.map((post) => (
          <div key={post.id} className="feed-item">
            <div>
              <span className="category-tag">NOTÍCIA</span>
              <Link href={`/blog/${post.slug}`}>
                <h3>{post.title}</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '0.5rem' }}>
                  {post.excerpt || post.content.substring(0, 120).replace(/<[^>]*>?/gm, '') + '...'}
                </p>
              </Link>
              <div className="meta">
                Há {Math.floor((new Date().getTime() - new Date(post.createdAt).getTime()) / (1000 * 60 * 60))} horas
              </div>
            </div>
            {post.imageUrl ? (
              <img src={post.imageUrl} alt={post.title} className="feed-image" />
            ) : (
              <div className="feed-image" style={{ background: `linear-gradient(45deg, #1a1a1a, #2a2a2a)` }} />
            )}
          </div>
        ))}
      </section>
    </div>
  )
}
