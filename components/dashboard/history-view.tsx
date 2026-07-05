"use client"

import { useState } from "react"
import { Area, AreaChart, ResponsiveContainer, YAxis, XAxis, Tooltip, CartesianGrid } from "recharts"
import { Download, Activity, Clock, Info } from "lucide-react"
import { Panel } from "./panel"
import type { WeatherData } from "@/types/weather"
import { weatherService } from "@/services/weatherService"
import { cn } from "@/lib/utils"

type MetricKey = "temperature" | "humidity" | "pressure" | "rain" | "airQuality"

const METRICS = {
  temperature: { label: "Temperatura", color: "var(--color-temp)", unit: "°C", sensor: "Sensor AHT10" },
  humidity:    { label: "Humedad",      color: "var(--color-humidity)", unit: "%",   sensor: "Sensor AHT10" },
  pressure:    { label: "Presión",      color: "var(--color-pressure)", unit: "hPa", sensor: "Sensor BMP280" },
  rain:        { label: "Lluvia",       color: "var(--color-rain)",     unit: "%",   sensor: "Sensor de lluvia" },
  airQuality:  { label: "Calidad del aire", color: "var(--color-altitude)", unit: "ppm", sensor: "Sensor MQ135" },
}

const PERIODS = ["30S", "1M", "5M", "15M", "1H", "6H", "12H", "24H", "7D"]

function getStatus(value: number, metric: MetricKey): { label: string; color: string } {
  if (metric === "temperature") {
    if (value < 18) return { label: "Bajo", color: "text-sky-400" }
    if (value > 27) return { label: "Alto", color: "text-red-400" }
    return { label: "Normal", color: "text-emerald-400" }
  }
  if (metric === "humidity") {
    if (value < 40) return { label: "Bajo", color: "text-sky-400" }
    if (value > 70) return { label: "Alto", color: "text-red-400" }
    return { label: "Normal", color: "text-emerald-400" }
  }
  if (metric === "pressure") {
    if (value < 1008) return { label: "Bajo", color: "text-sky-400" }
    if (value > 1020) return { label: "Alto", color: "text-red-400" }
    return { label: "Normal", color: "text-emerald-400" }
  }
  if (metric === "rain") {
    if (value >= 20) return { label: "Alto", color: "text-red-400" }
    return { label: "Normal", color: "text-emerald-400" }
  }
  if (metric === "airQuality") {
    if (value > 600) return { label: "Alto", color: "text-red-400" }
    return { label: "Normal", color: "text-emerald-400" }
  }
  return { label: "Normal", color: "text-emerald-400" }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label, metricKey }: any) {
  if (!active || !payload?.length) return null
  const val = payload[0]
  const rawValue = Number(val.value)
  const statusInfo = getStatus(rawValue, metricKey)
  const metricInfo = METRICS[metricKey]
  const todayStr = new Date().toLocaleDateString('es-EC', { day: 'numeric', month: 'short', year: 'numeric' })

  return (
    <div className="rounded-xl border border-border bg-card/95 backdrop-blur-sm px-4 py-3 shadow.lg text-left flex flex-col gap-1.5 min-w-[180px]">
      <div className="flex items-center justify-between border-b border-border/50 pb-1.5">
        <span className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground">
          <Clock className="size-3" /> {label}
        </span>
        <span className="text-[9px] font-semibold text-muted-foreground/60">{todayStr}</span>
      </div>
      
      <div className="flex flex-col gap-0.5">
        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">{metricInfo.label}</span>
        <span className="text-2xl font-bold tracking-wider font-digital leading-none" style={{ color: val.color }}>
          {rawValue.toFixed(2)} <span className="text-xs font-semibold">{metricInfo.unit}</span>
        </span>
      </div>

      <div className="flex items-center justify-between border-t border-border/30 pt-1.5 text-[9px] font-semibold">
        <span className="text-muted-foreground/75">Origen: <b className="text-foreground">{metricInfo.sensor}</b></span>
        <span className={cn("font-bold uppercase tracking-wider", statusInfo.color)}>{statusInfo.label}</span>
      </div>
    </div>
  )
}

export function HistoryView({ data }: { data: WeatherData }) {
  const [activeMetric, setActiveMetric] = useState<MetricKey>("temperature")
  const [activePeriod, setActivePeriod] = useState("1H")

  const { history, ultimaActualizacion } = data

  // ── Filter history by selected period ────────────────────────────────────
  let filteredHistory = history
  if (activePeriod === "30S")  filteredHistory = history.slice(-30)
  else if (activePeriod === "1M")  filteredHistory = history.slice(-60)
  else if (activePeriod === "5M")  filteredHistory = history.slice(-300)
  else if (activePeriod === "15M") filteredHistory = history.slice(-900)
  else if (activePeriod === "1H")  filteredHistory = history.slice(-3600)
  else if (activePeriod === "6H")  filteredHistory = history.slice(-21600)
  else if (activePeriod === "12H") filteredHistory = history.slice(-43200)
  else if (activePeriod === "24H") filteredHistory = history.slice(-86400)
  else if (activePeriod === "7D")  filteredHistory = history.slice(-604800)

  const vals = filteredHistory.map(h => h[activeMetric])
  const currentVal = vals[vals.length - 1] || 0
  const minVal = vals.length ? Math.min(...vals) : 0
  const maxVal = vals.length ? Math.max(...vals) : 0
  const avgVal = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0
  
  // Calculate variation from previous reading
  const prevVal = vals.length > 1 ? vals[vals.length - 2] : currentVal
  const variation = vals.length > 1 ? currentVal - prevVal : 0

  const metricInfo = METRICS[activeMetric]

  // ── CSV Export ────────────────────────────────────────────────────────────
  const handleExportCSV = () => {
    if (filteredHistory.length === 0) return
    const csvRows: string[] = []
    csvRows.push(["time", "temperature", "humidity", "pressure", "rain", "airQuality"].join(","))
    filteredHistory.forEach(row => {
      csvRows.push(`${row.time},${row.temperature},${row.humidity},${row.pressure},${row.rain},${row.airQuality}`)
    })
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.setAttribute("hidden", "")
    a.setAttribute("href", url)
    a.setAttribute("download", `historial_${activeMetric}_${activePeriod}.csv`)
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    weatherService.forceEvent(`Exportación CSV realizada (${activeMetric} - ${activePeriod})`, "info")
  }

  return (
    <div className="h-full flex flex-col min-h-0">
      <Panel className="flex-1 min-h-0 flex flex-col p-0 overflow-hidden relative">

        {/* ── TOP BAR ─────────────────────────────────────────────────────── */}
        <div className="px-5 py-4 border-b border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-background/50">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-10 rounded-xl bg-card border border-border shadow-sm">
              <Activity className="size-5 text-muted-foreground" />
            </div>
            <div>
              <h2 className="text-lg font-bold leading-tight tracking-wide text-foreground">Historial de mediciones</h2>
              <p className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">{metricInfo.sensor}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-auto">
            {/* Period selector */}
            <div className="flex p-0.5 rounded-lg bg-card/50 border border-border">
              {PERIODS.map(p => (
                <button
                  key={p}
                  onClick={() => setActivePeriod(p)}
                  className={cn(
                    "px-2.5 py-1 text-[9px] font-bold rounded-md transition-colors",
                    activePeriod === p
                      ? "bg-background shadow-sm text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >{p}</button>
              ))}
            </div>

            {/* Export button */}
            <button
              onClick={handleExportCSV}
              disabled={filteredHistory.length === 0}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors text-xs font-semibold text-foreground",
                filteredHistory.length === 0 && "opacity-50 cursor-not-allowed"
              )}
            >
              <Download className="size-3.5" />
              <span className="hidden sm:inline">Exportar CSV</span>
            </button>
          </div>
        </div>

        {/* ── METRICS SELECTOR & STAT BOXES ───────────────────────────────── */}
        <div className="px-5 py-3 border-b border-border/30 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(METRICS) as MetricKey[]).map(key => {
              const isActive = activeMetric === key
              return (
                <button
                  key={key}
                  onClick={() => setActiveMetric(key)}
                  className={cn(
                    "px-4 py-1.5 text-xs font-bold rounded-full transition-all duration-300 border",
                    isActive
                      ? "border-transparent shadow-sm"
                      : "border-border bg-card/40 text-muted-foreground hover:bg-card hover:text-foreground"
                  )}
                  style={isActive ? {
                    color: METRICS[key].color,
                    backgroundColor: `color-mix(in srgb, ${METRICS[key].color} 15%, transparent)`,
                  } : {}}
                >{METRICS[key].label}</button>
              )
            })}
          </div>

          <div className="flex items-center gap-6 overflow-x-auto scrollbar-hide pb-1 lg:pb-0">
            <StatBox label="Actual"    value={currentVal} unit={metricInfo.unit} color={metricInfo.color} />
            <StatBox label="Variación" value={variation} unit={metricInfo.unit} color={variation > 0 ? "text-red-400" : variation < 0 ? "text-emerald-400" : "text-muted-foreground"} showPlus={true} />
            <StatBox label="Mínimo"    value={minVal}     unit={metricInfo.unit} />
            <StatBox label="Máximo"    value={maxVal}     unit={metricInfo.unit} />
            <StatBox label="Promedio"  value={avgVal}     unit={metricInfo.unit} />
            <div className="flex flex-col pl-5 border-l border-border/50">
              <span className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider">Última act.</span>
              <span className="text-xs font-bold text-foreground mt-0.5">{ultimaActualizacion}</span>
            </div>
          </div>
        </div>

        {/* ── CHART / EMPTY STATE ─────────────────────────────────────────── */}
        <div className="flex-1 min-h-[300px] w-full pt-5 pr-6 pb-2 pl-0 flex flex-col justify-center">
          {filteredHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-10 text-center mx-auto max-w-md">
              <div className="flex items-center justify-center size-14 rounded-2xl bg-card border border-border shadow-md text-muted-foreground/30">
                <Info className="size-8" />
              </div>
              <div className="flex flex-col gap-1">
                <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">Sin lecturas históricas</h3>
                <p className="text-xs text-muted-foreground max-w-[85%] mx-auto leading-relaxed">
                  No hay datos registrados en el intervalo seleccionado ({activePeriod}). Los datos se generarán a medida que el sistema reciba telemetría.
                </p>
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={filteredHistory} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id={`gradient-hist-${activeMetric}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor={metricInfo.color} stopOpacity={0.6} />
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
                  tick={{ fontSize: 11, fill: "var(--color-muted-foreground)", fontWeight: 500 }}
                  tickMargin={10}
                  interval="preserveStartEnd"
                />
                <YAxis
                  domain={[
                    `dataMin - ${activeMetric === "airQuality" ? 50 : activeMetric === "pressure" ? 1 : 2}`,
                    `dataMax + ${activeMetric === "airQuality" ? 50 : activeMetric === "pressure" ? 1 : 2}`,
                  ]}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "var(--color-muted-foreground)", fontWeight: 500 }}
                  tickMargin={10}
                  tickFormatter={v => v.toFixed(1)}
                />
                <Tooltip content={<CustomTooltip metricKey={activeMetric} />} cursor={{ stroke: metricInfo.color, strokeWidth: 1, strokeDasharray: "4 4" }} />
                <Area
                  type="monotone"
                  dataKey={activeMetric}
                  stroke={metricInfo.color}
                  strokeWidth={2.5}
                  fill={`url(#gradient-hist-${activeMetric})`}
                  isAnimationActive={false}
                  filter={`url(#glow-hist-${activeMetric})`}
                  activeDot={{ r: 5, fill: metricInfo.color, stroke: "var(--color-background)", strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </Panel>
    </div>
  )
}

function StatBox({ label, value, unit, color, showPlus = false }: { label: string; value: number; unit: string; color?: string; showPlus?: boolean }) {
  const sign = showPlus && value > 0 ? "+" : ""
  return (
    <div className="flex flex-col">
      <span className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
      <div className="flex items-baseline gap-0.5 mt-0.5">
        <span
          className={cn("text-lg font-bold font-digital tracking-wide", color || "text-foreground")}
        >{sign}{value.toFixed(2)}</span>
        <span className="text-[9px] font-bold text-muted-foreground">{unit}</span>
      </div>
    </div>
  )
}
