"use client"

import { useState } from "react"
import { Area, AreaChart, ResponsiveContainer, YAxis, XAxis, Tooltip } from "recharts"
import { Activity } from "lucide-react"
import { Panel } from "./panel"
import type { WeatherData } from "@/types/weather"
import { cn } from "@/lib/utils"

type MetricKey = "temperature" | "humidity" | "pressure" | "rain"

const METRICS = {
  temperature: { label: "Temperatura", color: "var(--color-temp)", unit: "°C" },
  humidity: { label: "Humedad", color: "var(--color-humidity)", unit: "%" },
  pressure: { label: "Presión", color: "var(--color-pressure)", unit: "hPa" },
  rain: { label: "Lluvia", color: "var(--color-rain)", unit: "%" },
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const val = payload[0]
  return (
    <div className="rounded-xl border border-border bg-card/95 backdrop-blur-sm px-3 py-2 shadow-[0_8px_24px_-6px_rgba(0,0,0,0.2)]">
      <p className="text-[10px] text-muted-foreground mb-0.5">{label}</p>
      <p className="text-sm font-bold" style={{ color: val.color }}>
        {Number(val.value).toFixed(1)} {val.unit || ''}
      </p>
    </div>
  )
}

export function RealtimeChart({ data: weatherData }: { data: WeatherData }) {
  const [activeMetric, setActiveMetric] = useState<MetricKey>("temperature")
  const { history } = weatherData

  const currentVal = history[history.length - 1][activeMetric]
  const minVal = Math.min(...history.map(h => h[activeMetric]))
  const maxVal = Math.max(...history.map(h => h[activeMetric]))
  
  const metricInfo = METRICS[activeMetric]
  const domainPadding = activeMetric === "pressure" ? 2 : 5;

  return (
    <Panel className="h-full flex flex-col justify-between overflow-hidden relative p-5">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-2 z-10 relative">
        <div className="flex items-start gap-4">
          <div className="mt-1 flex items-center justify-center size-9 rounded-full bg-background border border-border">
            <Activity className="size-5 text-muted-foreground" />
          </div>
          <div>
            <h2 className="text-[15px] font-bold leading-tight tracking-wide text-foreground">Historial de mediciones</h2>
            <p className="text-[11px] font-medium tracking-wide text-muted-foreground mb-3">Últimas lecturas en tiempo real</p>
            <div className="flex items-center gap-4 text-[11px] font-semibold text-muted-foreground">
              <span>Actual: <span className="text-foreground">{currentVal.toFixed(1)}{metricInfo.unit}</span></span>
              <span>Mín: <span className="text-foreground">{minVal.toFixed(1)}{metricInfo.unit}</span></span>
              <span>Máx: <span className="text-foreground">{maxVal.toFixed(1)}{metricInfo.unit}</span></span>
            </div>
          </div>
        </div>

        <div className="flex p-1 rounded-full bg-background border border-border shrink-0 self-start">
          {(Object.keys(METRICS) as MetricKey[]).map((key) => {
            const isActive = activeMetric === key
            return (
              <button
                key={key}
                onClick={() => setActiveMetric(key)}
                className={cn(
                  "px-4 py-1.5 text-xs font-bold rounded-full transition-all duration-300",
                  isActive ? "shadow" : "text-muted-foreground hover:text-foreground"
                )}
                style={isActive ? { color: METRICS[key].color, backgroundColor: `color-mix(in srgb, ${METRICS[key].color} 15%, transparent)` } : {}}
              >
                {METRICS[key].label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex-1 mt-4 -mx-4 -mb-4 z-10 relative">
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={history} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
            <defs>
              <linearGradient id={`gradient-${activeMetric}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={metricInfo.color} stopOpacity={0.5} />
                <stop offset="100%" stopColor={metricInfo.color} stopOpacity={0.0} />
              </linearGradient>
              <filter id={`glow-${activeMetric}`} x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>
            <XAxis
              dataKey="time"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }}
              interval="preserveStartEnd"
            />
            <YAxis domain={[`dataMin - ${domainPadding}`, `dataMax + ${domainPadding}`]} hide />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ stroke: 'var(--color-border)', strokeWidth: 1, strokeDasharray: '4 4' }}
            />
            <Area
              type="monotone"
              dataKey={activeMetric}
              stroke={metricInfo.color}
              strokeWidth={3}
              fill={`url(#gradient-${activeMetric})`}
              isAnimationActive={false}
              filter={`url(#glow-${activeMetric})`}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Panel>
  )
}
