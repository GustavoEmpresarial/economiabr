import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

function normalizeSecret(value: unknown): string {
    const text = String(value ?? '').trim()
    return text.replace(/^['\"]+|['\"]+$/g, '')
}

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { title, content, excerpt, slug, imageUrl, secret } = body
        const providedSecret = normalizeSecret(secret ?? request.headers.get('x-api-secret'))
        const expectedSecret = normalizeSecret(process.env.API_SECRET)

        // Simple security check
        if (!expectedSecret) {
            return NextResponse.json({ error: 'Server misconfiguration: API_SECRET is missing' }, { status: 500 })
        }

        if (providedSecret !== expectedSecret) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        if (!title || !content || !slug) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        const post = await prisma.post.create({
            data: {
                title,
                content,
                excerpt,
                slug,
                imageUrl,
            },
        })

        return NextResponse.json(post, { status: 201 })
    } catch (error: any) {
        if (error?.code === 'P2002') {
            return NextResponse.json({ error: 'Slug already exists' }, { status: 409 })
        }

        console.error('Error creating post:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
