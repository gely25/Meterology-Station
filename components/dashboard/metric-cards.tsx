"use client"

import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts"
import { TriangleAlert } from "lucide-react"
import { Panel } from "./panel"
import { cn, calcTrend } from "@/lib/utils"
import type { TrendInfo } from "@/lib/utils"
import type { WeatherData, HistoryPoint } from "@/types/weather"
import { THRESHOLDS } from "@/lib/thresholds"

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

import { TrendingUp, TrendingDown, Minus } from "lucide-react"

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
          <p className={`text-[9px] font-semibold text-muted-foreground/60 mb-1`}>Rango: {THRESHOLDS.temperature.min.toFixed(2)} - {THRESHOLDS.temperature.max.toFixed(2)} °C</p>
          
          {/* Visual Range Position Bar */}
          <div className="w-full h-1.5 bg-muted/40 rounded-full overflow-hidden mb-2 relative">
            {(() => {
              const minT = THRESHOLDS.temperature.min
              const maxT = THRESHOLDS.temperature.max
              // Rango extendido para visualizar valores fuera de límites (-5°C a +5°C del rango)
              const extMin = minT - 5
              const extMax = maxT + 5
              const percentage = Math.max(0, Math.min(100, ((value - extMin) / (extMax - extMin)) * 100))
              const idealStart = ((minT - extMin) / (extMax - extMin)) * 100
              const idealEnd = ((maxT - extMin) / (extMax - extMin)) * 100
              return (
                <>
                  {/* Ideal zone highlight */}
                  <div 
                    className="absolute h-full bg-emerald-500/20" 
                    style={{ left: `${idealStart}%`, right: `${100 - idealEnd}%` }}
                  />
                  {/* Current value indicator dot */}
                  <div 
                    className={cn(
                      "absolute top-0 -translate-x-1/2 size-1.5 rounded-full border border-background shadow-sm transition-all duration-300",
                      (value < minT || value > maxT) ? "bg-red-500" : "bg-emerald-500"
                    )}
                    style={{ left: `${percentage}%` }}
                  />
                </>
              )
            })()}
          </div>

          <div className="flex items-center gap-3 text-[10px] font-semibold mb-2">
            <span className="flex items-center gap-1 text-muted-foreground">
              <TriangleAlert className="size-3 text-warning" /> MIN <b className="text-foreground">{min.toFixed(2)}°C</b>
            </span>
            <span className="flex items-center gap-1 text-muted-foreground">
              <TriangleAlert className="size-3 text-warning" /> MAX <b className="text-foreground">{max.toFixed(2)}°C</b>
            </span>
          </div>
          <div className="flex items-center gap-1.5 bg-temp/10 border border-temp/25 px-2.5 py-1 rounded-lg w-fit">
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

  // Interpretación de confort
  let comfortLabel = "Confort ideal"
  let comfortColor = "text-emerald-500"
  if (value < THRESHOLDS.humidity.min) {
    comfortLabel = "Ambiente seco"
    comfortColor = "text-amber-500"
  } else if (value > THRESHOLDS.humidity.comfortMax) {
    comfortLabel = "Humedad alta"
    comfortColor = "text-sky-500"
  }

  return (
    <Panel className="flex flex-col overflow-hidden relative">
      {/* Header row */}
      <div className="flex items-center justify-between z-10 relative shrink-0">
        <div className="flex items-center gap-2">
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
        <span className={cn("text-[9px] font-extrabold uppercase tracking-wider bg-background/50 border border-border px-2 py-0.5 rounded-md", comfortColor)}>
          {comfortLabel}
        </span>
      </div>

      {/* Background watermark */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.02] pointer-events-none">
        <img src="/svg/humedad.svg" alt="" width={180} height={180} className="object-contain" />
      </div>

      {/* Gauge */}
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
          {/* Value embedded inside SVG */}
          <text x="92" y="92" textAnchor="middle" dominantBaseline="middle"
            style={{ fontFamily: 'DSEG7Classic, monospace', fontSize: '24px', fill: 'currentColor', letterSpacing: '1px' }}>
            {value.toFixed(2)}
          </text>
          <text x="146" y="84" textAnchor="start" dominantBaseline="middle"
            style={{ fontFamily: 'sans-serif', fontSize: '12px', fontWeight: 'bold', fill: 'var(--color-humidity)' }}>
            %
          </text>
          {/* Comfort range */}
          <text x="100" y="118" textAnchor="middle" dominantBaseline="middle"
            style={{ fontFamily: 'sans-serif', fontSize: '9px', fill: 'color-mix(in srgb, currentColor 50%, transparent)' }}>
            Rango confortable: {THRESHOLDS.humidity.min} - {THRESHOLDS.humidity.comfortMax}%
          </text>
        </svg>
      </div>

      {/* Visual Range Position Bar */}
      <div className="px-5 mb-2 shrink-0">
        <div className="w-full h-1.5 bg-muted/40 rounded-full overflow-hidden relative">
          {(() => {
            const minH = THRESHOLDS.humidity.min
            const maxH = THRESHOLDS.humidity.comfortMax
            const percentage = Math.max(0, Math.min(100, value))
            return (
              <>
                {/* Comfort zone highlight */}
                <div 
                  className="absolute h-full bg-emerald-500/20" 
                  style={{ left: `${minH}%`, right: `${100 - maxH}%` }}
                />
                {/* Current value indicator dot */}
                <div 
                  className={cn(
                    "absolute top-0 -translate-x-1/2 size-1.5 rounded-full border border-background shadow-sm transition-all duration-300",
                    (value < minH || value > maxH) ? "bg-red-500" : "bg-emerald-500"
                  )}
                  style={{ left: `${percentage}%` }}
                />
              </>
            )
          })()}
        </div>
      </div>

      {/* Footer */}
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
import { useState, useEffect } from "react"

export function RainCard({ data }: { data: WeatherData }) {
  const { nivelLluvia: value, estadoSensorLluvia, conexionESP32 } = data
  const isConnected = conexionESP32 === 'conectado' && estadoSensorLluvia === 'operativo'

  const [lastState, setLastState] = useState<boolean | null>(null)
  const [lastChangeTime, setLastChangeTime] = useState<string | null>(null)

  const isRaining = value >= THRESHOLDS.rain.detected

  useEffect(() => {
    if (isConnected) {
      if (lastState !== isRaining) {
        setLastState(isRaining)
        setLastChangeTime(new Date().toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
      }
    }
  }, [value, isConnected, isRaining, lastState])

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

  const rainSvg = isRaining ? '/svg/Lluvia detectada.svg' : '/svg/intensidad de lluvia.svg'

  return (
    <Panel className={cn(
      "flex flex-col justify-between overflow-hidden relative transition-all duration-500",
      isRaining ? "border-sky-500/40 bg-sky-500/5 shadow-[0_0_15px_rgba(14,165,233,0.1)]" : ""
    )}>
      {/* Icon */}
      <div className="absolute top-3 left-3 z-10 pointer-events-none" style={{ width: 52, height: 52 }}>
        <img
          src={rainSvg}
          alt=""
          className={cn("object-contain select-none w-full h-full", isRaining ? "animate-pulse" : "opacity-60")}
        />
      </div>

      {/* Header text */}
      <div className="flex flex-col pl-16 pt-1.5 z-10 relative">
        <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">Detección de Lluvia</h2>
        <p className="text-[9px] font-semibold uppercase tracking-widest text-rain/70">SENSOR BINARIO</p>
      </div>

      {/* Watermark */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.02] pointer-events-none">
        <img src={rainSvg} alt="" width={200} height={200} className="object-contain" />
      </div>

      {/* Binary Status */}
      <div className="flex flex-col items-center justify-center py-4 relative z-10">
        <span className={cn(
          "font-extrabold text-3xl tracking-widest uppercase transition-all duration-300",
          isRaining ? "text-sky-400 animate-pulse" : "text-emerald-400"
        )}>
          {isRaining ? '🌧️ LLUVIA DETECTADA' : '🌤️ SIN LLUVIA'}
        </span>
        <span className="text-[10px] text-muted-foreground font-semibold mt-1">
          {isRaining ? 'Sensor húmedo' : 'Sensor seco'}
        </span>
      </div>

      {/* Info change log */}
      <div className="border-t border-border/10 pt-2 flex items-center justify-between text-[9.5px] font-semibold text-muted-foreground relative z-10 px-1">
        <span>ÚLTIMA EVALUACIÓN</span>
        <span className="text-foreground uppercase bg-background/40 px-2 py-0.5 rounded border border-border">
          {isRaining ? `Inicio: ${lastChangeTime || '--:--:--'}` : `Último cambio: ${lastChangeTime || '--:--:--'}`}
        </span>
      </div>
    </Panel>
  )
}

import { getRecommendations } from "@/lib/recommendations"

// ─── Condition Card (HERO — Resumen Ambiental) ─────────────────────────────────
export function ConditionCard({ data, className }: { data: WeatherData; className?: string }) {
  const isAHT10Connected = data.estadoAHT10 === 'operativo'
  const isRainConnected = data.estadoSensorLluvia === 'operativo'
  const isConnected = data.conexionESP32 === 'conectado'

  if (!isConnected || (!isAHT10Connected && !isRainConnected)) {
    return (
      <Panel variant="hero" className={cn(`flex flex-col justify-between overflow-hidden relative bg-gradient-to-b from-muted/5 via-transparent to-transparent p-4 pb-3`, className)}>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03] pointer-events-none grayscale">
          <img src="/svg/Ambiente despejado.svg" alt="" width={300} height={300} className="object-contain" />
        </div>

        <div className="w-full flex items-center justify-between z-10 relative">
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Resumen Ambiental</h2>
          <span className="text-[8px] font-bold tracking-wider text-muted-foreground/45">ACT: {data.hora}</span>
        </div>

        <div className="flex flex-col items-center my-auto z-10 relative">
          <div className="relative my-2 opacity-20 grayscale">
            <img src="/svg/Ambiente despejado.svg" alt="Desconectado" width={130} height={130} className="object-contain select-none" />
          </div>
          <div className="text-center mt-1">
            <p className="text-xl font-extrabold tracking-widest text-muted-foreground">SISTEMA OFFLINE</p>
            <p className="mt-0.5 text-xs font-semibold text-alert">Esperando conexión de sensores...</p>
          </div>
        </div>
      </Panel>
    )
  }

  // Lógica de Estado dinámico general
  const isRaining = data.nivelLluvia >= THRESHOLDS.rain.detected
  const isRainHeavy = data.nivelLluvia >= THRESHOLDS.rain.heavy
  const isAirBad = data.calidadAire >= THRESHOLDS.airQuality.regular
  const isAirDangerous = data.calidadAire >= THRESHOLDS.airQuality.bad
  const isTempExtreme = data.temperatura > THRESHOLDS.temperature.max || data.temperatura < THRESHOLDS.temperature.min
  const isHumExtreme = data.humedad > THRESHOLDS.humidity.comfortMax || data.humedad < THRESHOLDS.humidity.min

  let stateLabel = "SISTEMA ESTABLE"
  let stateSubtitle = "Condiciones normales de operación"
  let labelColor = "text-emerald-400"
  let bgGradient = "from-emerald-500/5 via-transparent to-transparent animate-pulse-slow"
  let svgSrc = "/svg/Ambiente despejado.svg"

  if (isRainHeavy || isAirDangerous) {
    stateLabel = "ALERTA ACTIVA"
    stateSubtitle = "Parámetros fuera de rango crítico"
    labelColor = "text-red-400"
    bgGradient = "from-red-500/10 via-transparent to-transparent animate-pulse"
    svgSrc = "/svg/Lluvia intensa.svg"
  } else if (isRaining) {
    stateLabel = "LLUVIA DETECTADA"
    stateSubtitle = "Precipitación activa sobre los sensores"
    labelColor = "text-sky-400"
    bgGradient = "from-sky-500/8 via-transparent to-transparent"
    svgSrc = "/svg/Lluvia detectada.svg"
  } else if (isAirBad) {
    stateLabel = "CALIDAD DE AIRE MALA"
    stateSubtitle = "Concentración de gas moderada/alta"
    labelColor = "text-amber-400"
    bgGradient = "from-amber-500/8 via-transparent to-transparent"
    svgSrc = "/svg/Ambiente húmedo.svg"
  }

  const recs = getRecommendations(data)

  return (
    <Panel variant="hero" className={cn(`flex flex-col justify-between overflow-hidden relative bg-gradient-to-b ${bgGradient} p-4 pb-3`, className)}>
      {/* Background watermark */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.02] pointer-events-none">
        <img src={svgSrc} alt="" width={280} height={280} className="object-contain" />
      </div>

      {/* Header */}
      <div className="w-full flex items-center justify-between z-10 relative">
        <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Resumen Ambiental</h2>
        <span className="text-[8px] font-bold tracking-wider text-muted-foreground/45">SINC: {data.hora}</span>
      </div>

      {/* Center Layout: split into dynamic illustration and checklist */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-auto z-10 relative items-center py-2">
        {/* Dynamic illustration */}
        <div className="flex flex-col items-center justify-center">
          <img
            src={svgSrc}
            alt={stateLabel}
            width={110}
            height={110}
            className="object-contain select-none drop-shadow-[0_4px_10px_rgba(255,255,255,0.05)] opacity-90 transition-all duration-500"
          />
          <div className="text-center mt-2">
            <p className={`text-base font-extrabold tracking-widest ${labelColor} transition-colors duration-500`}>{stateLabel}</p>
            <p className="text-[9.5px] font-semibold text-muted-foreground mt-0.5">{stateSubtitle}</p>
          </div>
        </div>

        {/* Dynamic Recommendations list instead of static checklist */}
        <div className="flex flex-col gap-2 border-l border-border/10 pl-4 h-full max-h-[170px] overflow-y-auto pr-1">
          <span className="text-[8.5px] font-extrabold tracking-widest uppercase text-muted-foreground/60 mb-0.5">Asistente Agronómico</span>
          {recs.map(rec => (
            <div key={rec.id} className="flex flex-col gap-0.5">
              <span className={cn(
                "text-[10px] font-bold uppercase tracking-wide flex items-center gap-1",
                rec.type === "warning" ? "text-amber-500" : rec.type === "success" ? "text-emerald-500" : "text-sky-500"
              )}>
                <span>●</span> {rec.title}
              </span>
              <p className="text-[9px] text-muted-foreground/80 leading-normal pl-2">{rec.message}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <p className="z-10 text-center text-[9px] text-muted-foreground/50 max-w-[85%] mx-auto mt-1 leading-normal">
        Monitoreo activo procesando datos en tiempo real desde el ESP32.
      </p>
    </Panel>
  )
}


