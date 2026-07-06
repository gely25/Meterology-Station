"use client"

import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts"
import { TriangleAlert, TrendingUp, TrendingDown, Minus } from "lucide-react"
import { Panel } from "./panel"
import { cn } from "@/lib/utils"
import type { WeatherData, HistoryPoint } from "@/types/weather"

// ─── Shared icon sizes ────────────────────────────────────────────────────────
const ICON_SIZE = 96 // px — consistent across ALL cards

// CSS filter values to tint each SVG to match its card accent
const TINT = {
  temp: "brightness(0) saturate(100%) invert(55%) sepia(86%) saturate(600%) hue-rotate(10deg) brightness(110%)",
  humidity: "brightness(0) saturate(100%) invert(55%) sepia(60%) saturate(600%) hue-rotate(190deg) brightness(105%)",
  rain: "brightness(0) saturate(100%) invert(55%) sepia(40%) saturate(500%) hue-rotate(175deg) brightness(115%)",
  pressure: "brightness(0) saturate(100%) invert(60%) sepia(60%) saturate(500%) hue-rotate(95deg) brightness(115%)",
  altitude: "brightness(0) saturate(100%) invert(50%) sepia(60%) saturate(600%) hue-rotate(255deg) brightness(110%)",
}

// ─── Sparkline tooltip ───────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function SparkTooltip({ active, payload, label, color, unit }: any) {
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

// Suavizado mediante media móvil para eliminar ruido artificial
function smoothData(data: number[], windowSize: number = 3): number[] {
  if (data.length < windowSize) return data
  const smoothed: number[] = []
  for (let i = 0; i < data.length; i++) {
    const start = Math.max(0, i - Math.floor(windowSize / 2))
    const end = Math.min(data.length, i + Math.ceil(windowSize / 2))
    const window = data.slice(start, end)
    smoothed.push(window.reduce((sum, val) => sum + val, 0) / window.length)
  }
  return smoothed
}

function getChartDomain(data: HistoryPoint[], key: keyof HistoryPoint, minDelta: number): [number, number] {
  if (data.length === 0) return [0, 100];
  const values = data.map(d => Number(d[key]));
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const diff = maxVal - minVal;

  if (diff < minDelta) {
    const center = (minVal + maxVal) / 2;
    return [center - minDelta / 2, center + minDelta / 2];
  }

  const padding = diff * 0.05;
  return [minVal - padding, maxVal + padding];
}

function Sparkline({ data, dataKey, color, unit = '', smoothing = true }: { data: HistoryPoint[]; dataKey: keyof HistoryPoint; color: string; unit?: string; smoothing?: boolean }) {
  const id = `spark-${String(dataKey)}`
  let displayData = data.slice(-20)

  // Aplicar suavizado según tipo de sensor
  if (smoothing && displayData.length > 2) {
    const values = displayData.map(d => Number(d[dataKey]))
    // Ventana de suavizado según tipo de sensor
    const windowSize = dataKey === 'humidity' ? 6 : dataKey === 'temperature' ? 3 : 2
    const smoothedValues = smoothData(values, windowSize)
    displayData = displayData.map((d, i) => ({ ...d, [dataKey]: smoothedValues[i] }))
  }

  // Estado inicial: sin datos suficientes
  if (displayData.length === 0) {
    return (
      <div className="h-[110px] w-full flex items-center justify-center border-t border-border/10 bg-background/30">
        <span className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground/50">Esperando primeras mediciones...</span>
      </div>
    )
  }

  // Determinar delta mínimo para cada métrica
  const minDelta = dataKey === 'temperature' ? 4.0 : dataKey === 'humidity' ? 25.0 : 10.0;
  const domain = dataKey === 'rain' ? [0, 10] as [number, number] : getChartDomain(displayData, dataKey, minDelta);

  return (
    <ResponsiveContainer width="100%" height={110}>
      <AreaChart data={displayData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.6} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="time" hide />
        <YAxis hide domain={domain} />
        <Tooltip content={<SparkTooltip color={color} unit={unit} />} cursor={{ stroke: color, strokeWidth: 1, strokeDasharray: '3 3' }} />
        <Area type="monotone" dataKey={dataKey as string} stroke={color} strokeWidth={2}
          fill={`url(#${id})`} isAnimationActive={false} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

// ─── Trend helpers ────────────────────────────────────────────────────────────
type TrendIntensity = 'none' | 'slight' | 'moderate' | 'strong'
type TrendDirection = 'up' | 'down' | 'stable'

interface TrendInfo {
  direction: TrendDirection
  intensity: TrendIntensity
  magnitude: number
}

function calcTrend(history: HistoryPoint[], key: keyof HistoryPoint, baseThreshold = 0.3): TrendInfo {
  if (history.length < 3) return { direction: 'stable', intensity: 'none', magnitude: 0 }

  const recent = history.slice(-3).map(h => Number(h[key]))
  const delta = recent[2] - recent[0]
  const magnitude = Math.abs(delta)

  // Calcular intensidad proporcional basada en el valor base
  // Umbral leve: 0.3x, moderado: 1x, fuerte: 3x
  const slightThreshold = baseThreshold
  const moderateThreshold = baseThreshold * 3
  const strongThreshold = baseThreshold * 10

  let intensity: TrendIntensity = 'none'
  if (magnitude >= strongThreshold) {
    intensity = 'strong'
  } else if (magnitude >= moderateThreshold) {
    intensity = 'moderate'
  } else if (magnitude >= slightThreshold) {
    intensity = 'slight'
  }

  // Dirección solo si hay magnitud suficiente
  let direction: TrendDirection = 'stable'
  if (magnitude >= slightThreshold) {
    direction = delta > 0 ? 'up' : 'down'
  }

  return { direction, intensity, magnitude }
}

function TrendBadge({ trend, color }: { trend: TrendInfo; color: string }) {
  const { direction, intensity } = trend

  // Iconos según dirección e intensidad
  const Icon = direction === 'up' ? TrendingUp : direction === 'down' ? TrendingDown : Minus
  const label = direction === 'up' ? 'Subiendo' : direction === 'down' ? 'Bajando' : 'Estable'

  // Estilos proporcionales según intensidad
  const intensityStyles = {
    none: {
      opacity: 0.5,
      iconSize: 'size-3',
      fontSize: 'text-[9px]',
      animation: ''
    },
    slight: {
      opacity: 0.6,
      iconSize: 'size-3',
      fontSize: 'text-[9px]',
      animation: 'animate-pulse-slow'
    },
    moderate: {
      opacity: 0.8,
      iconSize: 'size-3.5',
      fontSize: 'text-[9px]',
      animation: 'animate-pulse'
    },
    strong: {
      opacity: 1,
      iconSize: 'size-4',
      fontSize: 'text-[10px]',
      animation: 'animate-pulse'
    }
  }

  const style = intensityStyles[intensity]
  const colorStyle = intensity === 'none' ? 'text-muted-foreground' : ''

  return (
    <span className={cn(
      "inline-flex items-center gap-1 font-semibold uppercase tracking-wider",
      style.fontSize,
      colorStyle,
      style.animation
    )} style={{ opacity: style.opacity }}>
      <Icon className={style.iconSize} style={{ color: intensity === 'none' ? undefined : color }} />
      {label}
    </span>
  )
}

// ─── Temperature ──────────────────────────────────────────────────────────────
export function TemperatureCard({ data, className }: { data: WeatherData; className?: string }) {
  const accent = "var(--color-temp)"
  const { temperatura: value, history, estadoAHT10, conexionESP32 } = data
  const isConnected = conexionESP32 === 'conectado' && estadoAHT10 === 'operativo'

  if (!isConnected) {
    return (
      <Panel className={cn("flex flex-col justify-center items-center overflow-hidden relative min-h-[140px]", className)}>
        <div className="flex flex-col items-center justify-center z-10 relative px-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="shrink-0 flex items-center justify-center opacity-30 grayscale" style={{ width: 40, height: 50 }}>
              <img src="/svg/temperatura.svg" alt="Temperatura" className="object-contain select-none h-full w-full" />
            </div>
            <div className="flex flex-col">
              <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Temperatura</h2>
              <p className="text-[9px] font-semibold uppercase tracking-widest text-alert">AHT10 · Sin conexión</p>
            </div>
          </div>
          <div className="flex flex-col items-center justify-center p-2.5 text-center rounded-xl bg-alert/5 border border-alert/20">
            <span className="text-[10px] font-extrabold tracking-widest text-alert uppercase flex items-center gap-1.5">⚠️ ERROR DE SENSOR</span>
            <p className="text-[8.5px] text-muted-foreground mt-1 leading-tight">Verifique el cableado I2C (SDA/SCL)</p>
          </div>
        </div>
      </Panel>
    )
  }

  const min = Math.min(...history.map(h => h.temperature))
  const max = Math.max(...history.map(h => h.temperature))
  const trend = calcTrend(history, 'temperature', 0.05)
  return (
    <Panel className={cn("flex flex-col justify-between overflow-hidden relative", className)}>
      <div className="flex items-center gap-3 z-10 relative">
        <div className="shrink-0 flex items-center justify-center" style={{ width: 56, height: 70 }}>
          <img
            src="/svg/temperatura.svg"
            alt="Temperatura"
            className="object-contain select-none h-full w-full"
          />
        </div>
        <div className="flex flex-col">
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">Temperatura</h2>
          <p className="mb-2 text-[9px] font-semibold uppercase tracking-widest text-temp/70">AHT10</p>
          <div className="flex items-end mb-1">
            <span className="font-digital text-6xl leading-none text-foreground tracking-wider">{value.toFixed(2)}</span>
            <span className="mb-0.5 ml-1 text-xl font-bold text-temp">°C</span>
          </div>
          <p className="text-[9px] font-semibold text-muted-foreground/60 mb-2">Rango: 18.00 - 27.00 °C</p>
          <div className="flex items-center gap-3 text-[10px] font-semibold">
            <span className="flex items-center gap-1 text-muted-foreground">
              <TriangleAlert className="size-3 text-warning" /> MIN <b className="text-foreground">{min.toFixed(2)}°C</b>
            </span>
            <span className="flex items-center gap-1 text-muted-foreground">
              <TriangleAlert className="size-3 text-warning" /> MAX <b className="text-foreground">{max.toFixed(2)}°C</b>
            </span>
          </div>
          <div className="mt-1">
            <TrendBadge trend={trend} color={accent} />
          </div>
        </div>
      </div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03] pointer-events-none">
        <img src="/svg/temperatura.svg" alt="" width={200} height={200} className="object-contain" />
      </div>
      <Sparkline data={data.estadoAHT10 === 'operativo' ? history : []} dataKey="temperature" color={accent} unit="°C" />
    </Panel>
  )
}

// ─── Humidity ─────────────────────────────────────────────────────────────────
export function HumidityCard({ data }: { data: WeatherData }) {
  const accent = "var(--color-humidity)"
  const { humedad: value, history, estadoAHT10, conexionESP32 } = data
  const isConnected = conexionESP32 === 'conectado' && estadoAHT10 === 'operativo'

  if (!isConnected) {
    return (
      <Panel className="flex flex-col justify-center items-center overflow-hidden relative min-h-[140px]">
        <div className="flex flex-col items-center justify-center z-10 relative px-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="shrink-0 flex items-center justify-center opacity-30 grayscale" style={{ width: 36, height: 36 }}>
              <img src="/svg/humedad.svg" alt="" className="object-contain select-none w-full h-full" style={{ filter: TINT.humidity }} />
            </div>
            <div className="flex flex-col">
              <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Humedad</h2>
              <p className="text-[9px] font-semibold uppercase tracking-widest text-alert">AHT10 · Sin conexión</p>
            </div>
          </div>
          <div className="flex flex-col items-center justify-center p-2.5 text-center rounded-xl bg-alert/5 border border-alert/20">
            <span className="text-[10px] font-extrabold tracking-widest text-alert uppercase flex items-center gap-1.5">⚠️ ERROR DE SENSOR</span>
            <p className="text-[8.5px] text-muted-foreground mt-1 leading-tight">Verifique el cableado I2C (SDA/SCL)</p>
          </div>
        </div>
      </Panel>
    )
  }

  const angle = -90 + (value / 100) * 180
  const trend = calcTrend(history, 'humidity', 0.5)
  return (
    <Panel className="flex flex-col overflow-hidden relative">
      {/* Header row: icon + title in one row, no absolute positioning */}
      <div className="flex items-center gap-2 z-10 relative shrink-0">
        <div className="shrink-0" style={{ width: 32, height: 32 }}>
          <img
            src="/svg/humedad.svg"
            alt=""
            className="object-contain select-none w-full h-full"
            style={{ filter: TINT.humidity }}
          />
        </div>
        <div>
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground leading-none">Humedad</h2>
          <p className="text-[9px] font-semibold uppercase tracking-widest text-humidity/70 mt-0.5">AHT10</p>
        </div>
      </div>

      {/* Background watermark */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.02] pointer-events-none">
        <img src="/svg/humedad.svg" alt="" width={180} height={180} className="object-contain" />
      </div>

      {/* Gauge — value embedded inside SVG, no overflow */}
      <div className="relative flex-1 flex items-center justify-center z-10 min-h-0 px-4">
        <svg viewBox="0 0 200 130" className="w-full max-h-[130px]">
          {/* Track */}
          <path d="M20 110 A80 80 0 0 1 180 110" fill="none" stroke="color-mix(in srgb, var(--color-foreground) 10%, transparent)" strokeWidth="12" strokeLinecap="round" />
          {/* Ticks */}
          {Array.from({ length: 21 }).map((_, i) => {
            const tickAngle = 180 - (i / 20) * 180
            const isMajor = i % 5 === 0
            const r1 = isMajor ? 65 : 72, r2 = 80
            const x1 = 100 + r1 * Math.cos((tickAngle * Math.PI) / 180)
            const y1 = 110 - r1 * Math.sin((tickAngle * Math.PI) / 180)
            const x2 = 100 + r2 * Math.cos((tickAngle * Math.PI) / 180)
            const y2 = 110 - r2 * Math.sin((tickAngle * Math.PI) / 180)
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={isMajor ? "color-mix(in srgb, var(--color-foreground) 25%, transparent)" : "color-mix(in srgb, var(--color-foreground) 10%, transparent)"} strokeWidth={isMajor ? 2 : 1.2} />
          })}
          {/* Progress arc */}
          <path d="M20 110 A80 80 0 0 1 180 110" fill="none" stroke={accent} strokeWidth="7"
            strokeLinecap="round" strokeDasharray={`${(value / 100) * 251} 251`} opacity="0.85" />
          {/* Needle */}
          <line x1="100" y1="110"
            x2={100 + 66 * Math.cos((angle * Math.PI) / 180)}
            y2={110 + 66 * Math.sin((angle * Math.PI) / 180)}
            stroke="var(--color-humidity)" strokeWidth="2.5" strokeLinecap="round" opacity="0.9" />
          <circle cx="100" cy="110" r="5" fill="var(--color-humidity)" opacity="0.85" />
          {/* Value embedded inside SVG — no overflow */}
          <text x="100" y="96" textAnchor="middle" dominantBaseline="middle"
            style={{ fontFamily: 'DSEG7Classic, monospace', fontSize: '34px', fill: 'currentColor', letterSpacing: '2px' }}>
            {Math.round(value)}
          </text>
          <text x="136" y="84" textAnchor="start" dominantBaseline="middle"
            style={{ fontFamily: 'sans-serif', fontSize: '14px', fontWeight: 'bold', fill: 'var(--color-humidity)' }}>
            %
          </text>
          {/* Comfort range */}
          <text x="100" y="118" textAnchor="middle" dominantBaseline="middle"
            style={{ fontFamily: 'sans-serif', fontSize: '9px', fill: 'color-mix(in srgb, currentColor 50%, transparent)' }}>
            Rango confortable: 40 - 70%
          </text>
        </svg>
      </div>

      {/* Footer: scale + trend */}
      <div className="flex items-center justify-between px-3 pb-1 shrink-0 z-10 relative">
        <div className="flex text-[10px] font-medium text-muted-foreground gap-2">
          <span>0</span><span>50</span><span>100</span>
        </div>
        <TrendBadge trend={trend} color={accent} />
      </div>

      {/* Sparkline */}
      <div className="px-2 shrink-0">
        <Sparkline data={isConnected ? history : []} dataKey="humidity" color={accent} unit="%" />
      </div>
    </Panel>
  )
}

// ─── Rain ─────────────────────────────────────────────────────────────────────
export function RainCard({ data }: { data: WeatherData }) {
  const accent = "var(--color-rain)"
  const { nivelLluvia: value, estadoLluvia, estadoSensorLluvia, conexionESP32 } = data
  const isConnected = conexionESP32 === 'conectado' && estadoSensorLluvia === 'operativo'

  if (!isConnected) {
    return (
      <Panel className="flex flex-col justify-center items-center overflow-hidden relative min-h-[140px]">
        <div className="flex flex-col items-center justify-center z-10 relative px-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="shrink-0 flex items-center justify-center opacity-30 grayscale" style={{ width: 40, height: 40 }}>
              <img src="/svg/intensidad de lluvia.svg" alt="" className="object-contain select-none w-full h-full" />
            </div>
            <div className="flex flex-col">
              <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Detección de Lluvia</h2>
              <p className="text-[9px] font-semibold uppercase tracking-widest text-alert">SENSOR · Sin conexión</p>
            </div>
          </div>
          <div className="flex flex-col items-center justify-center p-2.5 text-center rounded-xl bg-alert/5 border border-alert/20">
            <span className="text-[10px] font-extrabold tracking-widest text-alert uppercase flex items-center gap-1.5">⚠️ ERROR DE SENSOR</span>
            <p className="text-[8.5px] text-muted-foreground mt-1 leading-tight">Verifique la conexión analógica/digital</p>
          </div>
        </div>
      </Panel>
    )
  }

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
      <div className="flex flex-col pl-16 pt-1.5 z-10 relative">
        <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">Detección de Lluvia</h2>
        <p className="text-[9px] font-semibold uppercase tracking-widest text-rain/70">SENSOR DE LLUVIA</p>
      </div>

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03] pointer-events-none">
        <img src={rainSvg} alt="" width={200} height={200} className="object-contain" />
      </div>
      <div className="flex flex-col items-center justify-center py-1.5 relative z-10">
        <span className="font-bold text-2xl tracking-widest text-foreground uppercase">
          {value >= 20 ? 'Lluvia detectada' : 'Sin lluvia'}
        </span>
        <p className="text-[9px] font-semibold text-muted-foreground/60 mt-0.5">Umbral seco: 0 - 20%</p>
      </div>
      <div className="relative">
        <div
          className="h-3 w-full rounded-full"
          style={{
            background:
              "linear-gradient(90deg, #A7F3D0 0%, #A7F3D0 25%, #FDE68A 45%, #FDBA74 65%, #FCA5A5 85%, #FCA5A5 100%)",
          }}
        />
        <span className="absolute top-1/2 size-4 -translate-y-1/2 rounded-full border-2 border-background bg-alert shadow"
          style={{ left: `calc(${value}% - 8px)` }} />
      </div>
      <div className="mt-2 flex justify-between text-[11px] font-semibold">
        <span style={{ color: '#A7F3D0' }}>SIN LLUVIA</span>
        <span style={{ color: '#FCA5A5' }}>LLUVIA DETECTADA</span>
      </div>
      <p className="mt-1 text-center text-[9px] text-muted-foreground/70 relative z-10">Estado detectado por el sensor de lluvia.</p>
    </Panel>
  )
}

// ─── Condition Card (HERO — Estado del Clima) ─────────────────────────────────
type WeatherState = 'clear' | 'humid' | 'rain' | 'heavy-rain'

export function deriveWeatherState(data: WeatherData): WeatherState {
  const { nivelLluvia, humedad } = data
  if (nivelLluvia >= 70) return 'heavy-rain'
  if (nivelLluvia > 20) return 'rain'
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

export function ConditionCard({ data, className }: { data: WeatherData; className?: string }) {
  const isAHT10Connected = data.estadoAHT10 === 'operativo'
  const isRainConnected = data.estadoSensorLluvia === 'operativo'
  const isConnected = data.conexionESP32 === 'conectado'

  if (!isConnected || (!isAHT10Connected && !isRainConnected)) {
    return (
      <Panel variant="hero" className={cn(`flex flex-col justify-between overflow-hidden relative bg-gradient-to-b from-muted/5 via-transparent to-transparent p-4 pb-3`, className)}>
        {/* Background watermark */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03] pointer-events-none grayscale">
          <img src="/svg/Ambiente despejado.svg" alt="" width={300} height={300} className="object-contain" />
        </div>

        {/* Header */}
        <div className="w-full flex items-center justify-between z-10 relative">
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Estado del Clima</h2>
          <span className="text-[8px] font-bold tracking-wider text-muted-foreground/45">ACT: {data.hora}</span>
        </div>

        {/* Center Group */}
        <div className="flex flex-col items-center my-auto z-10 relative">
          <div className="relative my-2 opacity-20 grayscale">
            <img src="/svg/Ambiente despejado.svg" alt="Desconectado" width={130} height={130} className="object-contain select-none transition-all duration-500" />
          </div>

          <div className="text-center mt-1">
            <p className="text-xl font-extrabold tracking-widest text-muted-foreground transition-colors duration-500">SISTEMA OFFLINE</p>
            <p className="mt-0.5 text-xs font-semibold text-alert">Esperando conexión de sensores...</p>
          </div>

          <div className="mt-2.5 flex items-center gap-3.5 text-[10px] font-bold text-muted-foreground/50 bg-background/35 px-3 py-1 rounded-full border border-border/10">
            <span>🌡 --.--°C</span>
            <span>💧 --%</span>
            <span>🌧 N/D</span>
          </div>
        </div>

        <p className="z-10 text-center text-[9px] text-muted-foreground/40 max-w-[85%] mx-auto mt-1 leading-normal">
          Historial y métricas no disponibles.
        </p>
      </Panel>
    )
  }

  const state = deriveWeatherState(data)
  const cfg = STATE_CONFIG[state]
  return (
    <Panel variant="hero" className={cn(`flex flex-col justify-between overflow-hidden relative bg-gradient-to-b ${cfg.bgGradient} p-4 pb-3`, className)}>
      {/* Background watermark */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.025] pointer-events-none">
        <img src={cfg.svgSrc} alt="" width={280} height={280} className="object-contain" />
      </div>

      {/* Header */}
      <div className="w-full flex items-center justify-between z-10 relative">
        <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Estado del Clima</h2>
        <span className="text-[8px] font-bold tracking-wider text-muted-foreground/45">ACT: {data.hora}</span>
      </div>

      {/* Center Group (Illustration + State Label + Summary) */}
      <div className="flex flex-col items-center my-auto z-10 relative">
        {/* Large illustration */}
        <div className="relative my-2">
          <img
            src={cfg.svgSrc}
            alt={cfg.label}
            width={130}
            height={130}
            className="object-contain select-none drop-shadow-md opacity-90 transition-all duration-500"
          />
        </div>

        {/* State label */}
        <div className="text-center mt-1">
          <p className={`text-xl font-extrabold tracking-widest ${cfg.labelColor} transition-colors duration-500`}>{cfg.label}</p>
          <p className="mt-0.5 text-xs font-semibold text-muted-foreground">{cfg.subtitle}</p>
        </div>

        {/* Current conditions summary */}
        <div className="mt-2.5 flex items-center gap-3.5 text-[10px] font-bold text-muted-foreground bg-background/35 px-3 py-1 rounded-full border border-border/10">
          <span>🌡 {data.temperatura.toFixed(1)}°C</span>
          <span>💧 {Math.round(data.humedad)}%</span>
          <span>🌧 {data.nivelLluvia >= 20 ? 'Lluvia' : 'Sin lluvia'}</span>
        </div>
      </div>

      {/* Footer info restored */}
      <p className="z-10 text-center text-[9px] text-muted-foreground/50 max-w-[85%] mx-auto mt-1 leading-normal">
        Humedad del aire medida por el sensor AHT10.
      </p>
    </Panel>
  )
}
