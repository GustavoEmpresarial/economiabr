import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { randomUUID } from 'crypto'

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { level, message, botName, secret } = body

        // Simple security check
        if (secret !== process.env.API_SECRET) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        if (!level || !message || !botName) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        const stmt = db.prepare(`
            INSERT INTO "Log" (id, level, message, botName)
            VALUES (?, ?, ?, ?)
        `)
        const id = randomUUID()
        stmt.run(id, level, message, botName)

        const log = db.prepare(`SELECT * FROM "Log" WHERE id = ?`).get(id)

        return NextResponse.json(log, { status: 201 })
    } catch (error) {
        console.error('Error creating log:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

export async function GET() {
    try {
        const logs = db.prepare(`
            SELECT * FROM "Log" 
            ORDER BY createdAt DESC 
            LIMIT 100
        `).all()
        return NextResponse.json(logs)
    } catch (error) {
        console.error('Error fetching logs:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
