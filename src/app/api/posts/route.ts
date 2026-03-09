import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { randomUUID } from 'crypto'

function normalizeSecret(value: unknown): string {
    const text = String(value ?? '').trim()
    return text.replace(/^['\"]+|['\"]+$/g, '')
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

        try {
            const stmt = db.prepare(`
                INSERT INTO "Post" (id, title, content, excerpt, slug, imageUrl)
                VALUES (?, ?, ?, ?, ?, ?)
            `)

            const id = randomUUID()
            stmt.run(id, title, content, excerpt || null, slug, imageUrl || null)

            // Fetch the created post just to return it
            const post = db.prepare(`SELECT * FROM "Post" WHERE id = ?`).get(id)

            return NextResponse.json(post, { status: 201 })
        } catch (error: any) {
            // SQLite unique constraint error code for better-sqlite3 is SQLITE_CONSTRAINT_UNIQUE
            if (error.code === 'SQLITE_CONSTRAINT_UNIQUE' || String(error).includes('UNIQUE constraint failed')) {
                return NextResponse.json({ error: 'Slug already exists' }, { status: 409 })
            }
            throw error
        }

    } catch (error: any) {
        console.error('Error creating post:', error)
        return NextResponse.json({ error: 'Internal Server Error', details: error?.message || String(error) }, { status: 500 })
    }
}
