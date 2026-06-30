"use client"

import { useEffect, useRef, useState } from "react"

export type HistoryPoint = {
  time: string
  temperature: number
  humidity: number
  pressure: number
  rain: number
}

export type WeatherData = {
  temperature: number
  tempMin: number
  tempMax: number
  humidity: number
  rain: number
  pressure: number
  pressureTrend: number
  altitude: number
  wind: number
  visibility: number
  clock: string
  history: HistoryPoint[]
}

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v))
}

function seedHistory(): HistoryPoint[] {
  const points: HistoryPoint[] = []
  const start = 13 * 60 + 30 // 13:30
  for (let i = 0; i < 13; i++) {
    const mins = start + i * 5
    const hh = Math.floor(mins / 60)
    const mm = mins % 60
    points.push({
      time: `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`,
      temperature: 18 + Math.sin(i / 2) * 4 + Math.random() * 2,
      humidity: 55 + Math.cos(i / 3) * 8 + Math.random() * 4,
      pressure: 1012 + Math.sin(i / 4) * 3,
      rain: 2 + Math.random() * 3,
    })
  }
  return points
}

export function useWeatherData(): WeatherData {
  const [data, setData] = useState<WeatherData>(() => {
    const history = seedHistory()
    return {
      temperature: 23.6,
      tempMin: 18.4,
      tempMax: 28.7,
      humidity: 65,
      rain: 97,
      pressure: 1012.7,
      pressureTrend: 0.4,
      altitude: 23,
      wind: 8.6,
      visibility: 10,
      clock: "14:38:26",
      history,
    }
  })

  const tick = useRef(0)

  useEffect(() => {
    const id = setInterval(() => {
      tick.current += 1
      setData((prev) => {
        const now = new Date()
        const clock = now.toLocaleTimeString("es-EC", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        })

        const temperature = clamp(prev.temperature + (Math.random() - 0.5) * 0.6, 18, 29)
        const humidity = clamp(prev.humidity + (Math.random() - 0.5) * 2, 40, 95)
        const rain = clamp(prev.rain + (Math.random() - 0.5) * 4, 0, 100)
        const pressure = clamp(prev.pressure + (Math.random() - 0.5) * 0.8, 995, 1030)

        let history = prev.history
        if (tick.current % 5 === 0) {
          const last = prev.history[prev.history.length - 1]
          const [h, m] = last.time.split(":").map(Number)
          const total = h * 60 + m + 5
          const nh = Math.floor(total / 60) % 24
          const nm = total % 60
          history = [
            ...prev.history.slice(1),
            {
              time: `${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}`,
              temperature,
              humidity,
              pressure,
              rain: rain / 10,
            },
          ]
        }

        return {
          ...prev,
          temperature,
          humidity,
          rain,
          pressure,
          pressureTrend: Number((pressure - prev.pressure).toFixed(1)) || prev.pressureTrend,
          tempMin: Math.min(prev.tempMin, temperature),
          tempMax: Math.max(prev.tempMax, temperature),
          wind: clamp(prev.wind + (Math.random() - 0.5) * 0.4, 0, 30),
          clock,
          history,
        }
      })
    }, 1000)
    return () => clearInterval(id)
  }, [])

  return data
}
