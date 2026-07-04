"use client"

import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis } from "recharts"
import { TriangleAlert } from "lucide-react"
import { Panel } from "./panel"
import { cn } from "@/lib/utils"
import type { WeatherData, HistoryPoint } from "@/types/weather"

// ─── Shared icon sizes ────────────────────────────────────────────────────────
const ICON_SIZE = 96 // px — consistent across ALL cards

// CSS filter values to tint each SVG to match its card accent
const TINT = {
  temp:     "brightness(0) saturate(100%) invert(55%) sepia(86%) saturate(600%) hue-rotate(10deg) brightness(110%)",
  humidity: "brightness(0) saturate(100%) invert(55%) sepia(60%) saturate(600%) hue-rotate(190deg) brightness(105%)",
  rain:     "brightness(0) saturate(100%) invert(55%) sepia(40%) saturate(500%) hue-rotate(175deg) brightness(115%)",
  pressure: "brightness(0) saturate(100%) invert(60%) sepia(60%) saturate(500%) hue-rotate(95deg) brightness(115%)",
  altitude: "brightness(0) saturate(100%) invert(50%) sepia(60%) saturate(600%) hue-rotate(255deg) brightness(110%)",
}

// ─── Sparkline ────────────────────────────────────────────────────────────────
function Sparkline({ data, dataKey, color }: { data: HistoryPoint[]; dataKey: keyof HistoryPoint; color: string }) {
  const id = `spark-${String(dataKey)}`
  const displayData = data.slice(-20)
  return (
    <ResponsiveContainer width="100%" height={32}>
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
        <YAxis hide domain={([dataMin, dataMax]) => {
          const minRange = dataKey === 'airQuality' ? 50 : dataKey === 'pressure' ? 1.0 : 0.5;
          const range = dataMax - dataMin;
          if (range < minRange) {
            const center = (dataMax + dataMin) / 2;
            return [center - minRange / 2, center + minRange / 2];
          }
          return [dataMin, dataMax];
        }} />
        <Area type="linear" dataKey={dataKey as string} stroke={color} strokeWidth={3}
          fill={`url(#${id})`} isAnimationActive={true} animationDuration={500} animationEasing="linear" dot={false} filter={`url(#glow-${id})`} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

// ─── Temperature ──────────────────────────────────────────────────────────────
export function TemperatureCard({ data, className }: { data: WeatherData; className?: string }) {
  const accent = "var(--color-temp)"
  const { temperatura: value, history } = data
  const min = Math.min(...history.map(h => h.temperature))
  const max = Math.max(...history.map(h => h.temperature))
  return (
    <Panel className={cn("flex flex-col justify-between overflow-hidden relative", className)}>
      <div className="flex items-center gap-2 z-10 relative">
        <div className="shrink-0 flex items-center justify-center -my-4" style={{ width: 60, height: 75 }}>
          <img
            src="/svg/temperatura.svg"
            alt="Temperatura"
            className="object-contain select-none h-full w-full"
          />
        </div>
        <div className="flex flex-col">
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Temperatura</h2>
          <p className="mb-1 text-[9px] font-semibold uppercase tracking-widest text-temp/70">AHT10</p>
          <div className="flex items-end mb-1">
            <span className="font-digital text-6xl leading-none text-foreground drop-shadow-[0_0_12px_rgba(255,255,255,0.4)] tracking-wider">{value.toFixed(2)}</span>
            <span className="mb-0.5 ml-1 text-xl font-bold text-temp drop-shadow-[0_0_8px_var(--color-temp)]">°C</span>
          </div>
          <div className="flex items-center gap-4 text-[10px] font-semibold">
            <span className="flex items-center gap-1 text-muted-foreground">
              <TriangleAlert className="size-3 text-warning" /> MIN <b className="text-foreground">{min.toFixed(2)}°C</b>
            </span>
            <span className="flex items-center gap-1 text-muted-foreground">
              <TriangleAlert className="size-3 text-warning" /> MAX <b className="text-foreground">{max.toFixed(2)}°C</b>
            </span>
          </div>
        </div>
      </div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.04] pointer-events-none">
        <img src="/svg/temperatura.svg" alt="" width={220} height={220} className="object-contain" />
      </div>
      <Sparkline data={data.estadoAHT10 === 'operativo' ? history : []} dataKey="temperature" color={accent} />
    </Panel>
  )
}

// ─── Humidity ─────────────────────────────────────────────────────────────────
export function HumidityCard({ data }: { data: WeatherData }) {
  const accent = "var(--color-humidity)"
  const { humedad: value, history } = data
  const angle = -90 + (value / 100) * 180
  return (
    <Panel className="flex flex-col justify-between overflow-hidden relative">
      {/* Icon — absolute, top-left, small */}
      <div className="absolute top-3 left-3 z-10 pointer-events-none" style={{ width: 44, height: 44 }}>
        <img
          src="/svg/humedad.svg"
          alt=""
          className="object-contain select-none w-full h-full"
          style={{ filter: TINT.humidity }}
        />
      </div>

      {/* Header text */}
      <div className="flex flex-col pl-14 pt-1 z-10 relative">
        <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Humedad</h2>
        <p className="text-[9px] font-semibold uppercase tracking-widest text-humidity/70">AHT10</p>
      </div>

      {/* Background watermark */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.04] pointer-events-none">
        <img src="/svg/humedad.svg" alt="" width={220} height={220} className="object-contain" />
      </div>

      {/* Gauge + value centered at arc pivot */}
      <div className="relative mx-auto h-24 w-full px-4 z-10">
        <svg viewBox="0 0 200 110" className="h-full w-full">
          <path d="M16 100 A84 84 0 0 1 184 100" fill="none" stroke="color-mix(in srgb, var(--color-foreground) 15%, transparent)" strokeWidth="16" strokeLinecap="round" />
          {Array.from({ length: 21 }).map((_, i) => {
            const tickAngle = 180 - (i / 20) * 180
            const isMajor = i % 5 === 0
            const r1 = isMajor ? 70 : 76, r2 = 84
            const x1 = 100 + r1 * Math.cos((tickAngle * Math.PI) / 180)
            const y1 = 100 - r1 * Math.sin((tickAngle * Math.PI) / 180)
            const x2 = 100 + r2 * Math.cos((tickAngle * Math.PI) / 180)
            const y2 = 100 - r2 * Math.sin((tickAngle * Math.PI) / 180)
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={isMajor ? "var(--color-muted-foreground)" : "color-mix(in srgb, var(--color-foreground) 15%, transparent)"} strokeWidth={isMajor ? 2 : 1.5} />
          })}
          <path d="M16 100 A84 84 0 0 1 184 100" fill="none" stroke={accent} strokeWidth="8"
            strokeLinecap="round" strokeDasharray={`${(value / 100) * 264} 264`}
            className="drop-shadow-[0_0_8px_var(--color-humidity)]" />
          <line x1="100" y1="100" x2={100 + 70 * Math.cos((angle * Math.PI) / 180)}
            y2={100 + 70 * Math.sin((angle * Math.PI) / 180)} stroke="oklch(0.97 0 0)" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="100" cy="100" r="5" fill="oklch(0.97 0 0)" />
        </svg>
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-center pb-1">
          <span className="font-digital text-5xl leading-none text-foreground drop-shadow-[0_0_12px_rgba(255,255,255,0.4)] tracking-wider">{Math.round(value)}</span>
          <span className="mb-1 ml-1 text-lg font-bold text-humidity drop-shadow-[0_0_8px_var(--color-humidity)]">%</span>
        </div>
      </div>

      <div className="mt-1 flex justify-between px-2 text-[11px] font-medium text-muted-foreground">
        <span>0</span><span>50</span><span>100</span>
      </div>
      <Sparkline data={data.estadoAHT10 === 'operativo' ? history : []} dataKey="humidity" color={accent} />
    </Panel>
  )
}

// ─── Rain ─────────────────────────────────────────────────────────────────────
export function RainCard({ data }: { data: WeatherData }) {
  const accent = "var(--color-rain)"
  const { lluvia: value, estadoLluvia } = data

  const rainSvg =
    value >= 70 ? '/svg/Lluvia intensa.svg'
    : value > 20 ? '/svg/Lluvia detectada.svg'
    : '/svg/intensidad de lluvia.svg'

  return (
    <Panel className="flex flex-col justify-between overflow-hidden relative">
      {/* Icon — absolute, top-left, small */}
      <div className="absolute top-3 left-3 z-10 pointer-events-none" style={{ width: 52, height: 52 }}>
        <img src={rainSvg} alt="" className="object-contain select-none w-full h-full" />
      </div>

      {/* Header text */}
      <div className="flex flex-col pl-16 pt-1 z-10 relative">
        <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Detección de Lluvia</h2>
        <p className="text-[9px] font-semibold uppercase tracking-widest text-rain/70">SENSOR DE LLUVIA</p>
      </div>

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.04] pointer-events-none">
        <img src={rainSvg} alt="" width={220} height={220} className="object-contain" />
      </div>
      <div className="flex items-center justify-center py-1 relative z-10">
        <span className="font-bold text-2xl tracking-widest text-foreground drop-shadow-[0_0_12px_rgba(255,255,255,0.4)] uppercase">
          {value >= 20 ? 'Lluvia detectada' : 'Sin lluvia'}
        </span>
      </div>
      <div className="relative">
        <div
          className="h-2.5 w-full rounded-full"
          style={{
            background:
              "linear-gradient(90deg, #A7F3D0 0%, #A7F3D0 25%, #FDE68A 45%, #FDBA74 65%, #FCA5A5 85%, #FCA5A5 100%)",
          }}
        />
        <span className="absolute top-1/2 size-4 -translate-y-1/2 rounded-full border-2 border-background bg-alert shadow"
          style={{ left: `calc(${value}% - 8px)` }} />
      </div>
      <div className="mt-2 flex justify-between text-[11px] font-semibold">
        <span style={{color:'#A7F3D0'}}>SIN LLUVIA</span>
        <span style={{color:'#FCA5A5'}}>LLUVIA DETECTADA</span>
      </div>
      <p className="mt-1 text-center text-[9px] text-muted-foreground/70 relative z-10">Estado detectado por el sensor de lluvia.</p>
    </Panel>
  )
}

// ─── Condition Card (HERO — Estado del Clima) ─────────────────────────────────
type WeatherState = 'clear' | 'humid' | 'rain' | 'heavy-rain'

export function deriveWeatherState(data: WeatherData): WeatherState {
  const { lluvia, humedad } = data
  if (lluvia >= 70) return 'heavy-rain'
  if (lluvia > 20) return 'rain'
  if (humedad > 70) return 'humid'
  return 'clear'
}

const STATE_CONFIG: Record<WeatherState, {
  svgSrc: string; label: string; subtitle: string; labelColor: string; bgGradient: string
}> = {
  clear: {
    svgSrc: '/svg/Ambiente despejado.svg', label: 'AMBIENTE DESPEJADO',
    subtitle: 'Sin lluvia · Humedad normal', labelColor: 'text-yellow-500 dark:text-yellow-400',
    bgGradient: 'from-yellow-500/5 via-transparent to-transparent',
  },
  humid: {
    svgSrc: '/svg/Ambiente húmedo.svg', label: 'AMBIENTE HÚMEDO',
    subtitle: 'Sin lluvia · Humedad alta', labelColor: 'text-sky-500 dark:text-sky-400',
    bgGradient: 'from-sky-500/5 via-transparent to-transparent',
  },
  rain: {
    svgSrc: '/svg/Lluvia detectada.svg', label: 'LLUVIA DETECTADA',
    subtitle: 'Lluvia leve o moderada', labelColor: 'text-blue-500 dark:text-blue-400',
    bgGradient: 'from-blue-500/8 via-transparent to-transparent',
  },
  'heavy-rain': {
    svgSrc: '/svg/Lluvia intensa.svg', label: 'LLUVIA INTENSA',
    subtitle: 'Alarma activa · Revisar entorno', labelColor: 'text-red-500 dark:text-red-400',
    bgGradient: 'from-red-500/8 via-transparent to-transparent',
  },
}

export function ConditionCard({ data }: { data: WeatherData }) {
  const state = deriveWeatherState(data)
  const cfg = STATE_CONFIG[state]
  return (
    <Panel variant="hero" className={`flex flex-col items-center justify-center overflow-hidden relative bg-gradient-to-b ${cfg.bgGradient}`}>
      {/* Background watermark */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03] pointer-events-none">
        <img src={cfg.svgSrc} alt="" width={300} height={300} className="object-contain" />
      </div>

      {/* Header */}
      <div className="w-full mb-2 z-10 relative">
        <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Estado del Clima</h2>
      </div>

      {/* Large illustration */}
      <div className="relative z-10 my-2">
        <img
          src={cfg.svgSrc} alt={cfg.label}
          width={140} height={140}
          className="object-contain select-none drop-shadow-lg transition-all duration-500"
        />
      </div>

      {/* State label */}
      <div className="z-10 text-center">
        <p className={`text-xl font-extrabold tracking-widest ${cfg.labelColor} transition-colors duration-500`}>{cfg.label}</p>
        <p className="mt-1 text-xs font-medium text-muted-foreground">{cfg.subtitle}</p>
      </div>

      {/* Current conditions summary */}
      <div className="z-10 mt-2 flex items-center gap-4 text-[11px] font-semibold text-muted-foreground">
        <span>🌡 {data.temperatura.toFixed(1)}°C</span>
        <span>💧 {Math.round(data.humedad)}%</span>
        <span>🌧 {data.lluvia >= 20 ? 'Lluvia' : 'Sin lluvia'}</span>
      </div>
      <p className="z-10 mt-2 text-center text-[9px] text-muted-foreground/70 max-w-[80%]">Humedad del aire medida por el sensor AHT10.</p>
    </Panel>
  )
}
