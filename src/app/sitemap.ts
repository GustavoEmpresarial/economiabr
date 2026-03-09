import { MetadataRoute } from 'next'
import { db } from '@/lib/db'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const posts = db.prepare(`SELECT slug, updatedAt FROM "Post" WHERE published = 1`).all() as { slug: string, updatedAt: string }[]

    const baseUrl = 'https://your-domain.com'

    const postEntries: MetadataRoute.Sitemap = posts.map((post) => ({
        url: `${baseUrl}/blog/${post.slug}`,
        lastModified: post.updatedAt,
        changeFrequency: 'weekly',
        priority: 0.7,
    }))

    return [
        {
            url: baseUrl,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 1,
        },
        ...postEntries,
    ]
}
