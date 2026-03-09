import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { title, content, excerpt, slug, imageUrl, secret } = body

        // Simple security check
        if (secret !== process.env.API_SECRET) {
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
    } catch (error) {
        console.error('Error creating post:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
