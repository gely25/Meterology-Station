import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const fromParam = searchParams.get('from')
    const toParam = searchParams.get('to')

    let events;
    if (fromParam && toParam) {
      const from = parseInt(fromParam, 10)
      const to = parseInt(toParam, 10)

      events = await prisma.event.findMany({
        where: {
          timestamp: {
            gte: from,
            lte: to,
          },
        },
        orderBy: {
          timestamp: 'asc',
        },
      })
    } else {
      // Return last 200 events by default
      events = await prisma.event.findMany({
        orderBy: {
          timestamp: 'desc',
        },
        take: 200,
      })
      // Re-sort ascending to match original order
      events.reverse()
    }

    const serializedEvents = events.map(e => ({
      ...e,
      timestamp: Number(e.timestamp),
    }))

    return NextResponse.json(serializedEvents)
  } catch (error) {
    console.error('Error fetching events:', error)
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json()

    const id = payload.id || Math.random().toString(36).substring(2, 9)
    const timestamp = typeof payload.timestamp === 'number' ? payload.timestamp : Date.now()
    const time = payload.time || new Date().toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })
    const type = payload.type || 'info'
    const message = payload.message || ''

    const newEvent = await prisma.event.create({
      data: {
        id,
        timestamp,
        time,
        type,
        message,
      },
    })

    return NextResponse.json({
      ...newEvent,
      timestamp: Number(newEvent.timestamp),
    })
  } catch (error) {
    console.error('Error creating event:', error)
    return NextResponse.json({ error: 'Failed to save event' }, { status: 500 })
  }
}
