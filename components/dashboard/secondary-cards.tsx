"use client"

import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts"
import { TrendingUp, TrendingDown, Minus, Wind, WifiOff } from "lucide-react"
import { Panel } from "./panel"
import type { WeatherData, HistoryPoint } from "@/types/weather"

// ─── Trend helper ─────────────────────────────────────────────────────────────
function calcTrend(history: HistoryPoint[], key: keyof HistoryPoint, threshold = 0.5) {
  if (history.length < 3) return 'stable'
  const recent = history.slice(-3).map(h => Number(h[key]))
  const delta = recent[2] - recent[0]
  if (delta > threshold) return 'up'
  if (delta < -threshold) return 'down'
  return 'stable'
}

function TrendBadge({ trend, color }: { trend: 'up' | 'down' | 'stable'; color: string }) {
  const Icon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus
  const label = trend === 'up' ? 'Subiendo' : trend === 'down' ? 'Bajando' : 'Estable'
  return (
    <span className="inline-flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
      <Icon className="size-3" style={{ color }} />
      {label}
    </span>
  )
}

// ─── Mini tooltip ─────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function MiniTooltip({ active, payload, label, color, unit }: any) {
  if (!active || !payload?.length) return null
  const raw = Number(payload[0].value).toFixed(2)
  const [int, dec] = raw.split('.')
  return (
    <div className="rounded-md border border-border bg-card/95 backdrop-blur-sm px-2 py-1 shadow-lg text-left">
      <p className="text-[8px] text-muted-foreground mb-0.5 leading-none">{label}</p>
      <p className="text-[11px] font-bold font-digital leading-none">
        <span style={{ color }}>{int}</span>
        <span className="text-foreground">.</span>
        <span style={{ color }}>{dec}</span>
        <span className="text-[8px] ml-0.5 font-normal text-muted-foreground">{unit}</span>
      </p>
    </div>
  )
}

function MiniArea({ data, dataKey, color, height = 32, unit = '' }: { data: HistoryPoint[]; dataKey: keyof HistoryPoint; color: string; height?: number; unit?: string }) {
  const id = `mini-${String(dataKey)}-${color.replace(/[^a-z0-9]/gi, "")}`
  const displayData = data.slice(-20)
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={displayData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.6} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
          <filter id={`glow-${id}`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
        <XAxis dataKey="time" hide />
        <YAxis hide domain={[`dataMin - ${dataKey === 'airQuality' ? 50 : dataKey === 'pressure' ? 1 : 2}`, `dataMax + ${dataKey === 'airQuality' ? 50 : dataKey === 'pressure' ? 1 : 2}`]} />
        <Tooltip content={<MiniTooltip color={color} unit={unit} />} cursor={{ stroke: color, strokeWidth: 1, strokeDasharray: '3 3' }} />
        <Area type="linear" dataKey={dataKey as string} stroke={color} strokeWidth={3} fill={`url(#${id})`} isAnimationActive={true} animationDuration={500} animationEasing="linear" dot={false} filter={`url(#glow-${id})`} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

// ─── Pressure ─────────────────────────────────────────────────────────────────
export function PressureCard({ data }: { data: WeatherData }) {
  const accent = "var(--color-pressure)"
  const { presion: value, history, estadoBMP280, conexionESP32 } = data
  const isConnected = conexionESP32 === 'conectado' && estadoBMP280 === 'operativo'

  if (!isConnected) {
    return (
      <Panel className="flex flex-col justify-between overflow-hidden relative min-h-[160px]">
        <div className="flex items-start gap-3 mb-1 z-10 relative">
          <div className="shrink-0 flex items-center justify-center" style={{ width: 96, height: 96 }}>
            <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="none" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" fill="none" stroke="#6b7280" strokeWidth="1.5" opacity="0.4" />
              <path d="M3.34 19a10 10 0 1 1 17.32 0" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round" />
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(i => {
                const a = ((i / 12) * 240 - 210) * Math.PI / 180;
                const r1 = i % 3 === 0 ? 7 : 8, r2 = 9;
                return <line key={i}
                  x1={12 + r1 * Math.cos(a)} y1={12 + r1 * Math.sin(a)}
                  x2={12 + r2 * Math.cos(a)} y2={12 + r2 * Math.sin(a)}
                  stroke="#4b5563" strokeWidth={i % 3 === 0 ? 1.5 : 1} />;
              })}
            </svg>
          </div>
          <div className="flex flex-col mt-1">
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Presión Atmosférica</h2>
            <p className="text-[9px] font-semibold uppercase tracking-widest text-alert">BMP280 · Sin conexión</p>
            <div className="flex flex-col items-center justify-center p-3 text-center rounded-xl bg-alert/5 border border-alert/20 mt-1">
              <span className="text-[9px] font-extrabold tracking-widest text-alert uppercase flex items-center gap-1">⚠️ ERROR DE SENSOR</span>
              <p className="text-[8px] text-muted-foreground mt-0.5 leading-tight">Verifique la conexión I2C (SDA/SCL) de la placa BMP280.</p>
            </div>
          </div>
        </div>
        <MiniArea data={[]} dataKey="pressure" color={accent} unit="hPa" />
      </Panel>
    )
  }

  const trend = history.length > 2 ? value - history[history.length - 3].pressure : 0
  const trendDir = calcTrend(history, 'pressure', 0.3)

  return (
    <Panel className="flex flex-col justify-between overflow-hidden relative">
      <div className="flex items-start gap-3 mb-1 z-10 relative">
        <div className="shrink-0 flex items-center justify-center" style={{ width: 96, height: 96 }}>
          <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="none" strokeLinecap="round" strokeLinejoin="round">
            <defs>
              <radialGradient id="gaugeGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#c084fc" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
              </radialGradient>
            </defs>
            <circle cx="12" cy="12" r="10" fill="url(#gaugeGlow)" stroke="#a855f7" strokeWidth="1.5" opacity="0.4" />
            <path d="M3.34 19a10 10 0 1 1 17.32 0" stroke="#c084fc" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M12 12 L17 7" stroke="#c084fc" strokeWidth="2" strokeLinecap="round"
              style={{ filter: 'drop-shadow(0 0 6px #c084fc)' }} />
            <circle cx="12" cy="12" r="1.5" fill="#c084fc"
              style={{ filter: 'drop-shadow(0 0 4px #c084fc)' }} />
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(i => {
              const a = ((i / 12) * 240 - 210) * Math.PI / 180;
              const r1 = i % 3 === 0 ? 7 : 8, r2 = 9;
              return <line key={i}
                x1={12 + r1 * Math.cos(a)} y1={12 + r1 * Math.sin(a)}
                x2={12 + r2 * Math.cos(a)} y2={12 + r2 * Math.sin(a)}
                stroke={i % 3 === 0 ? '#c084fc' : '#6b21a8'} strokeWidth={i % 3 === 0 ? 1.5 : 1} />;
            })}
          </svg>
        </div>
        <div className="flex flex-col mt-1">
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Presión Atmosférica</h2>
          <p className="text-[9px] font-semibold uppercase tracking-widest text-pressure/70">BMP280</p>
        </div>
      </div>

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.04] pointer-events-none">
        <img src="/svg/presión atmosferica.svg" alt="" width={200} height={200} className="object-contain" />
      </div>

      <div className="flex flex-col items-center justify-center relative z-10">
        <div className="flex items-end justify-center">
          <span className="font-digital text-5xl text-foreground drop-shadow-[0_0_12px_rgba(255,255,255,0.4)] tracking-wider">{value.toFixed(1)}</span>
          <span className="mb-1.5 ml-2 text-lg font-bold text-pressure drop-shadow-[0_0_8px_var(--color-pressure)]">hPa</span>
        </div>
        <p className="text-center text-[9px] font-semibold text-muted-foreground/60 mt-0.5">Rango normal: 1008.0 - 1020.0 hPa</p>
      </div>

      <div className="mt-1 flex items-center justify-end gap-2 relative z-10">
        <TrendBadge trend={trendDir} color="var(--color-pressure)" />
        <span className="flex items-center gap-1 rounded-md border border-pressure/40 bg-pressure/15 px-2 py-1 text-xs font-bold text-pressure">
          {trendDir === 'up' ? <TrendingUp className="size-3.5" /> : trendDir === 'down' ? <TrendingDown className="size-3.5" /> : <Minus className="size-3.5" />}
          {trend > 0 ? "+" : ""}{trend.toFixed(1)} hPa
        </span>
        <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">TENDENCIA</span>
      </div>
      <MiniArea data={history} dataKey="pressure" color={accent} unit="hPa" />
    </Panel>
  )
}

// ─── Air Quality ──────────────────────────────────────────────────────────────
type AQLevel = { label: string; desc: string; color: string; bg: string; border: string }

function getAQLevel(value: number): AQLevel {
  if (value < 600) return { label: 'Excelente', desc: 'Aire limpio', color: '#2dd4bf', bg: 'rgba(45,212,191,0.12)', border: 'rgba(45,212,191,0.4)' }
  if (value < 1000) return { label: 'Buena', desc: 'Calidad aceptable', color: '#86efac', bg: 'rgba(134,239,172,0.12)', border: 'rgba(134,239,172,0.4)' }
  if (value < 1400) return { label: 'Moderada', desc: 'Ligera contaminación', color: '#facc15', bg: 'rgba(250,204,21,0.12)', border: 'rgba(250,204,21,0.4)' }
  if (value < 1800) return { label: 'Mala', desc: 'Poco recomendable', color: '#fb923c', bg: 'rgba(251,146,60,0.12)', border: 'rgba(251,146,60,0.4)' }
  return { label: 'Muy mala', desc: 'Evitar exposición', color: '#f87171', bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.4)' }
}

export function AirQualityCard({ data }: { data: WeatherData }) {
  const { calidadAire: value, history, estadoMQ135, conexionESP32 } = data
  const isConnected = conexionESP32 === 'conectado' && estadoMQ135 === 'operativo'

  if (!isConnected) {
    return (
      <Panel className="flex flex-col justify-between overflow-hidden relative min-h-[160px]">
        <div className="flex items-start mb-1 z-10 relative">
          <div className="absolute top-3 left-3 z-10 pointer-events-none" style={{ width: 44, height: 44 }}>
            <Wind className="w-full h-full text-alert opacity-30 grayscale" />
          </div>
          <div className="flex flex-col pl-16 pt-1">
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Calidad del Aire</h2>
            <p className="text-[9px] font-semibold uppercase tracking-widest text-alert">MQ135 · Sin conexión</p>
            <div className="flex flex-col items-center justify-center p-3 text-center rounded-xl bg-alert/5 border border-alert/20 mt-1">
              <span className="text-[9px] font-extrabold tracking-widest text-alert uppercase flex items-center gap-1">⚠️ ERROR DE SENSOR</span>
              <p className="text-[8px] text-muted-foreground mt-0.5 leading-tight">Verifique el cableado analógico/VCC del sensor MQ135.</p>
            </div>
          </div>
        </div>
        <MiniArea data={[]} dataKey="airQuality" color="#2dd4bf" unit="" />
      </Panel>
    )
  }

  const level = getAQLevel(value)
  const trendDir = calcTrend(history, 'airQuality', 20)
  const isBad = value >= 1800

  return (
    <Panel className="flex flex-col justify-between overflow-hidden relative">
      <div className="flex items-start mb-1 z-10 relative">
        <div className="absolute top-3 left-3 z-10 pointer-events-none" style={{ width: 44, height: 44 }}>
          <Wind className="w-full h-full text-teal-400 opacity-70" />
        </div>
        <div className="flex flex-col pl-16 pt-1">
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Calidad del Aire</h2>
          <p className="text-[9px] font-semibold uppercase tracking-widest text-teal-400/70">MQ135 · Índice relativo</p>
        </div>
      </div>

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03] pointer-events-none">
        <Wind style={{ width: 160, height: 160 }} className="text-foreground" />
      </div>

      <div className="flex flex-col items-center justify-center py-0 relative z-10">
        <span className="font-digital text-6xl text-foreground drop-shadow-[0_0_12px_rgba(255,255,255,0.4)] tracking-wider">{Math.round(value)}</span>
        <p className="text-center text-[9px] uppercase font-bold tracking-widest text-muted-foreground mt-0.5 mb-0.5">Valor relativo</p>
        <p className="text-center text-[9px] font-semibold text-muted-foreground/60 mb-2">Rango saludable: 0 - 600</p>
      </div>

      {/* Level badge + description */}
      <div className="mb-1 flex flex-col items-center gap-0.5 relative z-10">
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-widest transition-all duration-300"
          style={{
            color: level.color,
            backgroundColor: level.bg,
            border: `1px solid ${level.border}`,
            boxShadow: isBad ? `0 0 12px ${level.color}33` : 'none',
            animation: isBad ? 'pulse 2s ease-in-out infinite' : 'none',
          }}
        >
          {isBad && <span className="text-sm">⚠️</span>}
          {level.label}
        </span>
        <span className="text-[8px] text-muted-foreground font-medium italic">{level.desc}</span>
      </div>

      {/* Trend */}
      <div className="flex justify-center mb-1 z-10 relative">
        <TrendBadge trend={trendDir} color={level.color} />
      </div>

      <MiniArea data={isConnected ? history : []} dataKey="airQuality" color="#2dd4bf" unit="" />
    </Panel>
  )
}
