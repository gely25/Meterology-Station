import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const fromParam = searchParams.get('from')
    const toParam = searchParams.get('to')

    let readings;
    if (fromParam && toParam) {
      const from = parseInt(fromParam, 10)
      const to = parseInt(toParam, 10)

      readings = await prisma.reading.findMany({
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
      // Limit to last 10000 readings by default to prevent overloading the browser
      readings = await prisma.reading.findMany({
        orderBy: {
          timestamp: 'desc',
        },
        take: 10000,
      })
      // Re-sort ascending for client charting and consistency
      readings.reverse()
    }

    return NextResponse.json(readings)
  } catch (error) {
    console.error('Error fetching readings:', error)
    return NextResponse.json({ error: 'Failed to fetch readings' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json()

    // Map payload from HistoryPoint or ESP32 packet
    // ESP32 packet contains: temperatura, humedad, presion, nivelLluvia, calidadAire
    // HistoryPoint contains: time, timestamp, temperature, humidity, pressure, rain, airQuality
    const temperature = typeof payload.temperature === 'number' ? payload.temperature : (payload.temperatura ?? 0)
    const humidity = typeof payload.humidity === 'number' ? payload.humidity : (payload.humedad ?? 0)
    const pressure = typeof payload.pressure === 'number' ? payload.pressure : (payload.presion ?? 0)
    const rain = typeof payload.rain === 'number' ? payload.rain : ((payload.nivelLluvia ?? 0) / 10)
    const airQuality = typeof payload.airQuality === 'number' ? payload.airQuality : (payload.calidadAire ?? 0)
    
    const now = new Date()
    const timestamp = typeof payload.timestamp === 'number' ? payload.timestamp : Date.now()
    const time = payload.time || now.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })

    const newReading = await prisma.reading.create({
      data: {
        timestamp,
        time,
        temperature,
        humidity,
        pressure,
        rain,
        airQuality,
      },
    })

    return NextResponse.json(newReading)
  } catch (error) {
    console.error('Error creating reading:', error)
    return NextResponse.json({ error: 'Failed to save reading' }, { status: 500 })
  }
}
