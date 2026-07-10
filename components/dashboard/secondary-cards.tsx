"use client"

import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts"
import { TrendingUp, TrendingDown, Minus, Wind } from "lucide-react"
import { Panel } from "./panel"
import type { WeatherData, HistoryPoint } from "@/types/weather"
import { cn } from "@/lib/utils"

// ─── Smooth data helper ───────────────────────────────────────────────────────
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

// ─── Trend helper ─────────────────────────────────────────────────────────────
type TrendIntensity = 'none' | 'slight' | 'moderate' | 'strong'
type TrendDirection = 'up' | 'down' | 'stable'

interface TrendInfo {
  direction: TrendDirection
  intensity: TrendIntensity
  magnitude: number
}

function calcTrend(history: HistoryPoint[], key: keyof HistoryPoint, baseThreshold = 0.5): TrendInfo {
  if (history.length < 3) return { direction: 'stable', intensity: 'none', magnitude: 0 }

  const recent = history.slice(-3).map(h => Number(h[key]))
  const delta = recent[2] - recent[0]
  const magnitude = Math.abs(delta)

  // Calcular intensidad proporcional basada en el valor base
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

  let direction: TrendDirection = 'stable'
  if (magnitude >= slightThreshold) {
    direction = delta > 0 ? 'up' : 'down'
  }

  return { direction, intensity, magnitude }
}

function TrendBadge({ trend, color }: { trend: TrendInfo; color: string }) {
  const { direction, intensity } = trend

  const Icon = direction === 'up' ? TrendingUp : direction === 'down' ? TrendingDown : Minus
  const label = direction === 'up' ? 'Subiendo' : direction === 'down' ? 'Bajando' : 'Estable'

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

function MiniArea({ data, dataKey, color, height = 80, unit = '', smoothing = true }: { data: HistoryPoint[]; dataKey: keyof HistoryPoint; color: string; height?: number; unit?: string; smoothing?: boolean }) {
  const id = `mini-${String(dataKey)}-${color.replace(/[^a-z0-9]/gi, "")}`
  let displayData = data.slice(-20)
  const count = displayData.length

  // Aplicar suavizado según tipo de sensor
  if (smoothing && displayData.length > 2) {
    const values = displayData.map(d => Number(d[dataKey]))
    // Ventana de suavizado según tipo de sensor
    const windowSize = dataKey === 'airQuality' ? 6 : dataKey === 'pressure' ? 4 : 3
    const smoothedValues = smoothData(values, windowSize)
    displayData = displayData.map((d, i) => ({ ...d, [dataKey]: smoothedValues[i] }))
  }

  // Estado inicial: sin datos suficientes
  if (count === 0) {
    return (
      <div className="h-[80px] w-full flex items-center justify-center border-t border-border/10 bg-background/30">
        <span className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground/50">Esperando primeras mediciones...</span>
      </div>
    )
  }

  // Determinar delta mínimo para cada métrica en MiniArea
  const minDelta = dataKey === 'pressure' ? 8.0 : dataKey === 'airQuality' ? 100.0 : 10.0;
  const domain = getChartDomain(displayData, dataKey, minDelta);

  return (
    <div className="relative w-full flex flex-col justify-end" style={{ height }}>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={displayData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.6} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="time" hide />
          <YAxis hide domain={domain} />
          <Tooltip content={<MiniTooltip color={color} unit={unit} />} cursor={{ stroke: color, strokeWidth: 1, strokeDasharray: '3 3' }} />
          <Area
            type="monotone"
            dataKey={dataKey as string}
            stroke={color}
            strokeWidth={2}
            fill={`url(#${id})`}
            isAnimationActive={false}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

// ─── Pressure Gauge SVG ───────────────────────────────────────────────────────
function PressureGauge({ value, active = true }: { value?: number; active?: boolean }) {
  // Map hPa value to needle angle. Range: 980–1040 hPa → -120° to +120°
  const MIN_HPA = 980, MAX_HPA = 1040
  const MIN_ANGLE = -120, MAX_ANGLE = 120
  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
  const hpa = value ?? ((MIN_HPA + MAX_HPA) / 2)
  const fraction = (clamp(hpa, MIN_HPA, MAX_HPA) - MIN_HPA) / (MAX_HPA - MIN_HPA)
  const needleAngle = MIN_ANGLE + fraction * (MAX_ANGLE - MIN_ANGLE) // degrees from top

  // Convert needle angle to SVG coords (0° = top, clockwise)
  const toRad = (deg: number) => (deg - 90) * Math.PI / 180
  const cx = 12, cy = 12, r = 8 // gauge center & radius
  const needleLen = 6.2
  const nx = cx + needleLen * Math.cos(toRad(needleAngle))
  const ny = cy + needleLen * Math.sin(toRad(needleAngle))

  const color = active ? '#c084fc' : '#4b5563'
  const strokeArc = active ? '#c084fc' : '#374151'
  const opacity = active ? 1 : 0.22

  // Arc path from -120° to +120° (240° sweep)
  const arcStart = toRad(-120)
  const arcEnd = toRad(+120)
  const sx = cx + r * Math.cos(arcStart)
  const sy = cy + r * Math.sin(arcStart)
  const ex = cx + r * Math.cos(arcEnd)
  const ey = cy + r * Math.sin(arcEnd)

  return (
    <svg width="80" height="80" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ opacity }}>
      {/* Outer ring */}
      <circle cx={cx} cy={cy} r="10" fill="none" stroke={color} strokeWidth="0.6" opacity="0.3" />

      {/* Background arc track (240° sweep) */}
      <path
        d={`M ${sx} ${sy} A ${r} ${r} 0 1 1 ${ex} ${ey}`}
        fill="none" stroke="#374151" strokeWidth="1.2" strokeLinecap="round"
      />

      {/* Active arc fill based on value */}
      {active && (() => {
        const fracAngle = MIN_ANGLE + fraction * (MAX_ANGLE - MIN_ANGLE)
        const activEnd = toRad(fracAngle)
        const aex = cx + r * Math.cos(activEnd)
        const aey = cy + r * Math.sin(activEnd)
        const largeArc = fracAngle - (-120) > 180 ? 1 : 0
        return (
          <path
            d={`M ${sx} ${sy} A ${r} ${r} 0 ${largeArc} 1 ${aex} ${aey}`}
            fill="none" stroke={strokeArc} strokeWidth="1.2" strokeLinecap="round"
          />
        )
      })()}

      {/* Scale ticks (13 ticks, 4 major) */}
      {Array.from({ length: 13 }).map((_, i) => {
        const tickDeg = -120 + (i / 12) * 240
        const isMajor = i % 3 === 0
        const r1 = isMajor ? 6.5 : 7.2
        const r2 = 8
        const ta = toRad(tickDeg)
        return <line key={i}
          x1={cx + r1 * Math.cos(ta)} y1={cy + r1 * Math.sin(ta)}
          x2={cx + r2 * Math.cos(ta)} y2={cy + r2 * Math.sin(ta)}
          stroke={isMajor ? color : '#4b5563'} strokeWidth={isMajor ? 0.9 : 0.55}
        />
      })}

      {/* Needle */}
      <line
        x1={cx} y1={cy}
        x2={nx} y2={ny}
        stroke={color} strokeWidth="0.9" strokeLinecap="round"
      />

      {/* Needle base pivot */}
      <circle cx={cx} cy={cy} r="0.9" fill={color} />
    </svg>
  )
}

// ─── Pressure ─────────────────────────────────────────────────────────────────
export function PressureCard({ data, className }: { data: WeatherData; className?: string }) {
  const accent = "var(--color-pressure)"
  const { presion: value, history, estadoBMP280, conexionESP32 } = data
  const isConnected = conexionESP32 === 'conectado' && estadoBMP280 === 'operativo'

  if (!isConnected) {
    return (
      <Panel className={cn("flex flex-col justify-between overflow-hidden relative", className)}>
        <div className="flex items-start gap-3 mb-1 z-10 relative">
          <div className="shrink-0 flex items-center justify-center" style={{ width: 96, height: 96 }}>
            <PressureGauge active={false} />
          </div>
          <div className="flex-1 flex flex-col mt-1">
            <div className="flex items-center justify-between">
              <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Presión Atmosférica</h2>
              <span className="text-[9px] font-bold text-alert tracking-wider">BMP280 · SIN CONEXIÓN</span>
            </div>

            <div className="flex items-end mb-2 mt-1">
              <span className="font-digital text-5xl text-foreground opacity-30 tracking-wider">---.-</span>
              <span className="mb-1 ml-2 text-lg font-bold text-muted-foreground/35">hPa</span>
            </div>

            {/* Error box */}
            <div className="flex flex-col p-2.5 rounded-lg bg-alert/5 border border-alert/25 mb-3">
              <span className="text-[9px] font-extrabold tracking-widest text-alert uppercase flex items-center gap-1">
                ⚠️ ERROR DE SENSOR
              </span>
              <p className="text-[8.5px] text-muted-foreground mt-0.5 leading-snug">
                Verifique la conexión I2C (SDA/SCL) de la placa BMP280.
              </p>
            </div>

            {/* Rangos / tabla */}
            <div className="grid grid-cols-3 gap-1 text-center border-t border-border/10 pt-2 mb-1">
              <div className="flex flex-col">
                <span className="text-[7.5px] font-extrabold uppercase text-muted-foreground/50 tracking-wider">Mínima</span>
                <span className="text-[9.5px] font-bold text-muted-foreground/75 mt-0.5">-- hPa</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[7.5px] font-extrabold uppercase text-muted-foreground/50 tracking-wider">Máxima</span>
                <span className="text-[9.5px] font-bold text-muted-foreground/75 mt-0.5">-- hPa</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[7.5px] font-extrabold uppercase text-muted-foreground/50 tracking-wider">Promedio</span>
                <span className="text-[9.5px] font-bold text-muted-foreground/75 mt-0.5">-- hPa</span>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-auto pt-2 border-t border-border/10">
          <p className="text-center text-[8px] font-semibold text-muted-foreground/40">Historial no disponible</p>
        </div>
      </Panel>
    )
  }

  const trend = history.length > 2 ? value - history[history.length - 3].pressure : 0
  const trendDir = calcTrend(history, 'pressure', 0.3)

  return (
    <Panel className={cn("flex flex-col justify-between overflow-hidden relative", className)}>
      <div className="flex items-start gap-2.5 mb-1 z-10 relative">
        <div className="shrink-0 flex items-center justify-center" style={{ width: 80, height: 80 }}>
          <PressureGauge value={value} active={true} />
        </div>
        <div className="flex flex-col mt-1">
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">Presión Atmosférica</h2>
          <p className="text-[9px] font-semibold uppercase tracking-widest text-pressure/70">BMP280</p>
        </div>
      </div>

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03] pointer-events-none">
        <img src="/svg/presión atmosferica.svg" alt="" width={180} height={180} className="object-contain" />
      </div>

      <div className="flex flex-col items-center justify-center relative z-10">
        <div className="flex items-end justify-center">
          <span className="font-digital text-5xl text-foreground tracking-wider">{value.toFixed(1)}</span>
          <span className="mb-1.5 ml-2 text-lg font-bold text-pressure">hPa</span>
        </div>
        <p className="text-center text-[9px] font-semibold text-muted-foreground/60 mt-0.5">Rango normal: 1008.0 - 1020.0 hPa</p>
      </div>

      <div className="mt-1 flex items-center justify-end gap-2 relative z-10">
        <TrendBadge trend={trendDir} color="var(--color-pressure)" />
        <span className="flex items-center gap-1 rounded-md border border-pressure/40 bg-pressure/15 px-1.5 py-0.5 text-xs font-bold text-pressure">
          {trendDir.direction === 'up' ? <TrendingUp className="size-3" /> : trendDir.direction === 'down' ? <TrendingDown className="size-3" /> : <Minus className="size-3" />}
          {trend > 0 ? "+" : ""}{trend.toFixed(1)} hPa
        </span>
        <span className="text-[9px] font-medium uppercase tracking-widest text-muted-foreground">TENDENCIA</span>
      </div>
      <MiniArea data={history} dataKey="pressure" color={accent} unit="hPa" />
    </Panel>
  )
}

type AQLevel = { label: string; desc: string; action: string; color: string; bg: string; border: string; glow: string }

function getAQLevel(value: number): AQLevel {
  if (value < 600) {
    return {
      label: 'EXCELENTE',
      desc: 'Aire limpio',
      action: 'Respirar es seguro',
      color: '#2dd4bf',
      bg: 'rgba(45,212,191,0.06)',
      border: 'rgba(45,212,191,0.25)',
      glow: 'shadow-[0_0_15px_rgba(45,212,191,0.15)] border-[#2dd4bf]/40'
    }
  }
  if (value < 1200) {
    return {
      label: 'MODERADA',
      desc: 'Calidad aceptable',
      action: 'Normal para personas sanas',
      color: '#facc15',
      bg: 'rgba(250,204,21,0.06)',
      border: 'rgba(250,204,21,0.25)',
      glow: 'shadow-[0_0_15px_rgba(250,204,21,0.12)] border-[#facc15]/30'
    }
  }
  if (value < 1800) {
    return {
      label: 'MALA',
      desc: 'Poco recomendable',
      action: 'Evite exposición prolongada',
      color: '#fb923c',
      bg: 'rgba(251,146,60,0.06)',
      border: 'rgba(251,146,60,0.25)',
      glow: 'shadow-[0_0_15px_rgba(251,146,60,0.15)] border-[#fb923c]/40'
    }
  }
  return {
    label: 'PELIGROSA',
    desc: 'Aire contaminado',
    action: 'Utilice protección respiratoria',
    color: '#f87171',
    bg: 'rgba(248,113,113,0.1)',
    border: 'rgba(248,113,113,0.4)',
    glow: 'shadow-[0_0_20px_rgba(248,113,113,0.35)] border-[#f87171]/60 animate-pulse'
  }
}

export function AirQualityCard({ data, className }: { data: WeatherData; className?: string }) {
  const { calidadAire: value, history, estadoMQ135, conexionESP32 } = data
  const isConnected = conexionESP32 === 'conectado' && estadoMQ135 === 'operativo'

  if (!isConnected) {
    return (
      <Panel className={cn("flex flex-col justify-between overflow-hidden relative", className)}>
        <div className="flex items-start gap-3 mb-1 z-10 relative">
          <div className="shrink-0 flex items-center justify-center opacity-20" style={{ width: 96, height: 96 }}>
            <Wind className="w-16 h-16 text-alert grayscale" />
          </div>
          <div className="flex-1 flex flex-col mt-1">
            <div className="flex items-center justify-between">
              <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Calidad del Aire</h2>
              <span className="text-[9px] font-bold text-alert tracking-wider">MQ135 · SIN CONEXIÓN</span>
            </div>

            <div className="flex items-end mb-2 mt-1">
              <span className="font-digital text-6xl leading-none text-foreground opacity-30 tracking-wider">— —</span>
            </div>

            {/* Error box */}
            <div className="flex flex-col p-2.5 rounded-lg bg-alert/5 border border-alert/25 mb-3">
              <span className="text-[9px] font-extrabold tracking-widest text-alert uppercase flex items-center gap-1">
                ⚠️ ERROR DE SENSOR
              </span>
              <p className="text-[8.5px] text-muted-foreground mt-0.5 leading-snug">
                No se reciben mediciones del MQ135. Revise alimentación, conexión VCC y salida analógica.
              </p>
            </div>
          </div>
        </div>
        <div className="mt-auto pt-2 border-t border-border/10">
          <p className="text-center text-[8px] font-semibold text-muted-foreground/40">Historial no disponible</p>
        </div>
      </Panel>
    )
  }

  const level = getAQLevel(value)
  const trendDir = calcTrend(history, 'airQuality', 20)

  return (
    <Panel className={cn(
      "flex flex-col justify-between overflow-hidden relative transition-all duration-300",
      level.glow,
      className
    )}>
      {/* Header and State */}
      <div className="flex items-start justify-between z-10 relative px-2 pt-2">
        <div className="flex flex-col">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">Calidad del Aire</span>
          <span className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/60">MQ135 · Módulo</span>
        </div>
        <Wind className="size-5 opacity-70" style={{ color: level.color }} />
      </div>

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.02] pointer-events-none">
        <Wind style={{ width: 140, height: 140 }} className="text-foreground" />
      </div>

      {/* Main State display (State & Desc) */}
      <div className="flex flex-col items-center justify-center py-2 relative z-10 text-center">
        <h3 className="text-3xl font-extrabold tracking-widest uppercase transition-colors duration-300 leading-none mb-1" style={{ color: level.color }}>
          {level.label}
        </h3>
        <p className="text-sm font-bold text-foreground leading-tight">{level.desc}</p>
        <p className="text-[10px] text-muted-foreground/80 font-medium mt-0.5">{level.action}</p>
      </div>

      {/* Value secondary display */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-background/30 rounded-lg border border-border/10 z-10 relative mb-1 mx-2">
        <div className="flex flex-col">
          <span className="text-[8px] font-extrabold tracking-widest uppercase text-muted-foreground">Valor del Sensor</span>
          <span className="font-digital text-xl text-foreground tracking-wider leading-none mt-0.5">{Math.round(value)}</span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[8px] font-extrabold tracking-widest uppercase text-muted-foreground">Tendencia</span>
          <div className="mt-0.5">
            <TrendBadge trend={trendDir} color={level.color} />
          </div>
        </div>
      </div>

      <MiniArea data={history} dataKey="airQuality" color={level.color} unit="" height={85} />
    </Panel>
  )
}

