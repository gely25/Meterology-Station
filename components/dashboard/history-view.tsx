"use client"

import { useState } from "react"
import { Area, AreaChart, ResponsiveContainer, YAxis, XAxis, Tooltip, CartesianGrid } from "recharts"
import { Download, Info, Activity, Clock, AlertTriangle, CheckCircle2 } from "lucide-react"
import { Panel } from "./panel"
import type { WeatherData, SystemEvent } from "@/types/weather"
import { cn } from "@/lib/utils"

type MetricKey = "temperature" | "humidity" | "pressure" | "rain" | "airQuality"

const METRICS = {
  temperature: { label: "Temperatura", color: "var(--color-temp)", unit: "°C", sensor: "Sensor AHT10" },
  humidity: { label: "Humedad", color: "var(--color-humidity)", unit: "%", sensor: "Sensor AHT10" },
  pressure: { label: "Presión", color: "var(--color-pressure)", unit: "hPa", sensor: "Sensor BMP280" },
  rain: { label: "Lluvia", color: "var(--color-rain)", unit: "%", sensor: "Sensor de lluvia" },
  airQuality: { label: "Calidad del aire", color: "var(--color-altitude)", unit: "ppm", sensor: "Sensor MQ135" },
}

const PERIODS = ["1H", "6H", "12H", "24H", "7D"]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const val = payload[0]
  return (
    <div className="rounded-xl border border-border bg-card/95 backdrop-blur-sm px-4 py-3 shadow-[0_8px_32px_-6px_rgba(0,0,0,0.3)]">
      <div className="flex items-center gap-2 mb-1.5">
        <Clock className="size-3 text-muted-foreground" />
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
      </div>
      <p className="text-2xl font-bold tracking-wider font-digital" style={{ color: val.color, textShadow: `0 0 12px ${val.color}40` }}>
        {Number(val.value).toFixed(1)} {val.unit || ''}
      </p>
    </div>
  )
}

function EventIcon({ type }: { type: SystemEvent['type'] }) {
  switch (type) {
    case 'alert': return <AlertTriangle className="size-4 text-alert" />
    case 'warning': return <AlertTriangle className="size-4 text-warning" />
    case 'success': return <CheckCircle2 className="size-4 text-success" />
    case 'info':
    default: return <Info className="size-4 text-sky-400" />
  }
}

export function HistoryView({ data }: { data: WeatherData }) {
  const [activeMetric, setActiveMetric] = useState<MetricKey>("temperature")
  const [activePeriod, setActivePeriod] = useState("1H")
  
  const { history, events, ultimaActualizacion } = data

  let filteredHistory = history
  if (activePeriod === "1H") {
    filteredHistory = history.slice(-12)
  } else if (activePeriod === "6H") {
    filteredHistory = history.slice(-72)
  } else if (activePeriod === "12H") {
    filteredHistory = history.slice(-144)
  } else if (activePeriod === "24H") {
    filteredHistory = history.slice(-288)
  } else if (activePeriod === "7D") {
    filteredHistory = history.slice(-2016)
  }

  const vals = filteredHistory.map(h => h[activeMetric])
  const currentVal = vals[vals.length - 1] || 0
  const minVal = Math.min(...vals)
  const maxVal = Math.max(...vals)
  const avgVal = vals.reduce((a, b) => a + b, 0) / (vals.length || 1)
  
  const metricInfo = METRICS[activeMetric]
  
  // Dynamic padding based on metric to show variations clearly
  const domainPadding = activeMetric === "pressure" ? 2 : 
                        activeMetric === "temperature" ? 3 : 10;

  const handleExportCSV = () => {
    const csvRows = []
    const headers = ['time', 'temperature', 'humidity', 'pressure', 'rain', 'airQuality']
    csvRows.push(headers.join(','))
    
    filteredHistory.forEach(row => {
      csvRows.push(`${row.time},${row.temperature},${row.humidity},${row.pressure},${row.rain},${row.airQuality}`)
    })

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.setAttribute('hidden', '')
    a.setAttribute('href', url)
    a.setAttribute('download', `historial_${activeMetric}_${activePeriod}.csv`)
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  return (
    <div className="h-full flex flex-col gap-2">
      <Panel className="flex flex-col flex-1 p-0 overflow-hidden relative">
        
        {/* TOP BAR / HEADER */}
        <div className="px-4 py-4 sm:px-6 sm:py-5 border-b border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 z-10 relative bg-background/50">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-10 rounded-xl bg-card border border-border shadow-sm">
              <Activity className="size-5 text-muted-foreground" />
            </div>
            <div>
              <h2 className="text-lg font-bold leading-tight tracking-wide text-foreground">Historial de mediciones</h2>
              <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">{metricInfo.sensor}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-auto">
            {/* Period Selector */}
            <div className="flex p-1 rounded-lg bg-card/50 border border-border">
              {PERIODS.map(p => (
                <button
                  key={p}
                  onClick={() => setActivePeriod(p)}
                  className={cn(
                    "px-3 py-1 text-[10px] font-bold rounded-md transition-colors",
                    activePeriod === p ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {p}
                </button>
              ))}
            </div>

            {/* Export Button */}
            <button 
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors text-xs font-semibold text-foreground"
            >
              <Download className="size-3.5" />
              <span className="hidden sm:inline">Exportar CSV</span>
            </button>
          </div>
        </div>

        {/* METRICS SELECTOR & STATS SUMMARY */}
        <div className="px-4 py-3 sm:px-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-border/30 z-10 relative">
          
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(METRICS) as MetricKey[]).map((key) => {
              const isActive = activeMetric === key
              return (
                <button
                  key={key}
                  onClick={() => setActiveMetric(key)}
                  className={cn(
                    "px-4 py-1.5 text-xs font-bold rounded-full transition-all duration-300 border",
                    isActive ? "border-transparent shadow-sm" : "border-border bg-card/40 text-muted-foreground hover:bg-card hover:text-foreground"
                  )}
                  style={isActive ? { color: METRICS[key].color, backgroundColor: `color-mix(in srgb, ${METRICS[key].color} 15%, transparent)` } : {}}
                >
                  {METRICS[key].label}
                </button>
              )
            })}
          </div>

          <div className="flex items-center gap-6 overflow-x-auto scrollbar-hide pb-1 lg:pb-0">
            <StatBox label="Actual" value={currentVal} unit={metricInfo.unit} color={metricInfo.color} />
            <StatBox label="Mínimo" value={minVal} unit={metricInfo.unit} />
            <StatBox label="Máximo" value={maxVal} unit={metricInfo.unit} />
            <StatBox label="Promedio" value={avgVal} unit={metricInfo.unit} />
            <div className="flex flex-col pl-4 border-l border-border/50">
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Última act.</span>
              <span className="text-xs font-bold text-foreground mt-0.5">{ultimaActualizacion}</span>
            </div>
          </div>
        </div>

        {/* CHART AREA */}
        <div className="flex-1 min-h-[300px] w-full pt-6 pr-6 pb-2 pl-0 z-10 relative">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={filteredHistory} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <defs>
                <linearGradient id={`gradient-hist-${activeMetric}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={metricInfo.color} stopOpacity={0.6} />
                  <stop offset="100%" stopColor={metricInfo.color} stopOpacity={0.0} />
                </linearGradient>
                <filter id={`glow-hist-${activeMetric}`} x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" strokeOpacity={0.4} />
              <XAxis
                dataKey="time"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)', fontWeight: 500 }}
                tickMargin={12}
                interval="preserveStartEnd"
              />
              <YAxis 
                domain={[`dataMin - ${domainPadding}`, `dataMax + ${domainPadding}`]} 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)', fontWeight: 500 }}
                tickMargin={12}
                tickFormatter={(val) => val.toFixed(0)}
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ stroke: metricInfo.color, strokeWidth: 1, strokeDasharray: '4 4' }}
              />
              <Area
                type="monotone"
                dataKey={activeMetric}
                stroke={metricInfo.color}
                strokeWidth={3}
                fill={`url(#gradient-hist-${activeMetric})`}
                isAnimationActive={false}
                filter={`url(#glow-hist-${activeMetric})`}
                activeDot={{ r: 6, fill: metricInfo.color, stroke: 'var(--color-background)', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      {/* EVENTS SECTION */}
      <Panel className="flex-shrink-0 p-4">
        <h3 className="text-xs font-semibold tracking-widest text-muted-foreground uppercase mb-3">Eventos relacionados</h3>
        <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-1">
          {events.slice(0, 6).map((event) => (
            <div key={event.id} className="flex items-start gap-2.5 min-w-[200px] p-2.5 rounded-lg border border-border/50 bg-card/30">
              <div className="mt-0.5"><EventIcon type={event.type} /></div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-muted-foreground">{event.time}</span>
                <span className="text-xs font-semibold text-foreground line-clamp-2 leading-snug">{event.message}</span>
              </div>
            </div>
          ))}
          {events.length === 0 && (
            <p className="text-xs text-muted-foreground italic">No hay eventos registrados en este período.</p>
          )}
        </div>
      </Panel>
    </div>
  )
}

function StatBox({ label, value, unit, color }: { label: string, value: number, unit: string, color?: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
      <div className="flex items-baseline gap-0.5 mt-0.5">
        <span className="text-lg font-bold font-digital tracking-wide" style={{ color: color || 'var(--color-foreground)' }}>
          {value.toFixed(1)}
        </span>
        <span className="text-[10px] font-bold text-muted-foreground">{unit}</span>
      </div>
    </div>
  )
}
