import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

function normalizeSecret(value: unknown): string {
    const text = String(value ?? '').trim()
    return text.replace(/^['\"]+|['\"]+$/g, '')
}

async function ensurePostTableExists() {
    // Auto-heal for empty SQLite volumes where Prisma schema was not pushed yet.
    await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "Post" (
            "id" TEXT NOT NULL PRIMARY KEY,
            "title" TEXT NOT NULL,
            "slug" TEXT NOT NULL,
            "content" TEXT NOT NULL,
            "excerpt" TEXT,
            "imageUrl" TEXT,
            "published" BOOLEAN NOT NULL DEFAULT true,
            "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" DATETIME NOT NULL
        )
    `)

    await prisma.$executeRawUnsafe(`
        CREATE UNIQUE INDEX IF NOT EXISTS "Post_slug_key" ON "Post"("slug")
    `)
}

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { title, content, excerpt, slug, imageUrl, secret } = body
        const providedSecret = normalizeSecret(secret ?? request.headers.get('x-api-secret'))
        const expectedSecret = normalizeSecret(process.env.API_SECRET || 'autoblog_secret_2026')

        // Simple security check
        if (providedSecret !== expectedSecret) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        if (!title || !content || !slug) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        let post
        try {
            post = await prisma.post.create({
                data: {
                    title,
                    content,
                    excerpt,
                    slug,
                    imageUrl,
                },
            })
        } catch (error: any) {
            if (error?.code === 'P2021') {
                await ensurePostTableExists()
                post = await prisma.post.create({
                    data: {
                        title,
                        content,
                        excerpt,
                        slug,
                        imageUrl,
                    },
                })
            } else {
                // Se for um problema de coluna ausente (ex: imageUrl recém adicionado)
                const isColumnError = error?.code === 'P2022' || String(error).includes('imageUrl') || String(error).includes('column')
                if (isColumnError) {
                    try {
                        await prisma.$executeRawUnsafe(`ALTER TABLE "Post" ADD COLUMN "imageUrl" TEXT`)
                    } catch (e) {
                        // Ignorar se já existir
                    }
                    post = await prisma.post.create({
                        data: {
                            title,
                            content,
                            excerpt,
                            slug,
                            imageUrl,
                        },
                    })
                } else {
                    throw error
                }
            }
        }

        return NextResponse.json(post, { status: 201 })
    } catch (error: any) {
        if (error?.code === 'P2002') {
            return NextResponse.json({ error: 'Slug already exists' }, { status: 409 })
        }

        console.error('Error creating post:', error)
        return NextResponse.json({ error: 'Internal Server Error', details: error?.message || String(error) }, { status: 500 })
    }
}
