import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const log = await (prisma as any).log.create({
            data: {
                level,
                message,
                botName,
            },
        })

        return NextResponse.json(log, { status: 201 })
    } catch (error) {
        console.error('Error creating log:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

export async function GET() {
    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const logs = await (prisma as any).log.findMany({
            orderBy: { createdAt: 'desc' },
            take: 100,
        })
        return NextResponse.json(logs)
    } catch (error) {
        console.error('Error fetching logs:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
