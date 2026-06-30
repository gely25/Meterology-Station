"use client"

import { Area, AreaChart, ResponsiveContainer } from "recharts"
import { TriangleAlert, TrendingUp, Clock } from "lucide-react"
import { Panel, PanelHeader } from "./panel"
import type { WeatherData, HistoryPoint } from "@/types/weather"

function MiniArea({ data, dataKey, color, height = 56 }: { data: HistoryPoint[]; dataKey: keyof HistoryPoint; color: string; height?: number }) {
  const id = `mini-${String(dataKey)}-${color.replace(/[^a-z0-9]/gi, "")}`
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
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
        <Area type="monotone" dataKey={dataKey as string} stroke={color} strokeWidth={3} fill={`url(#${id})`} isAnimationActive={false} dot={false} filter={`url(#glow-${id})`} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export function PressureCard({ data }: { data: WeatherData }) {
  const accent = "var(--color-pressure)"
  const { presion: value, history } = data
  const trend = history.length > 1 ? value - history[history.length - 2].pressure : 0
  const pct = Math.min(1, Math.max(0, (value - 980) / 60))
  const angle = -120 + pct * 240
  return (
    <Panel className="flex flex-col justify-between overflow-hidden relative">
      <div className="flex items-start gap-3 mb-1 z-10 relative">
        <div className="shrink-0 flex items-center justify-center" style={{width: 96, height: 96}}>
          <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="none" strokeLinecap="round" strokeLinejoin="round">
            <defs>
              <radialGradient id="gaugeGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#4ade80" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
              </radialGradient>
            </defs>
            <circle cx="12" cy="12" r="10" fill="url(#gaugeGlow)" stroke="#22c55e" strokeWidth="1.5" opacity="0.4"/>
            <path d="M3.34 19a10 10 0 1 1 17.32 0" stroke="#4ade80" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M12 12 L17 7" stroke="#4ade80" strokeWidth="2" strokeLinecap="round"
              style={{filter:'drop-shadow(0 0 6px #4ade80)'}}/>
            <circle cx="12" cy="12" r="1.5" fill="#4ade80"
              style={{filter:'drop-shadow(0 0 4px #4ade80)'}}/>
            {[0,1,2,3,4,5,6,7,8,9,10,11,12].map(i => {
              const a = ((i / 12) * 240 - 210) * Math.PI / 180;
              const r1 = i % 3 === 0 ? 7 : 8, r2 = 9;
              return <line key={i}
                x1={12 + r1*Math.cos(a)} y1={12 + r1*Math.sin(a)}
                x2={12 + r2*Math.cos(a)} y2={12 + r2*Math.sin(a)}
                stroke={i % 3 === 0 ? '#4ade80' : '#166534'} strokeWidth={i % 3 === 0 ? 1.5 : 1} />;
            })}
          </svg>
        </div>
        <div className="flex flex-col mt-1">
          <h2 className="text-sm font-semibold leading-tight tracking-wide text-foreground">PRESIÓN ATMOSFÉRICA</h2>
          <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">BMP280</p>
        </div>
      </div>

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.04] pointer-events-none">
        <img src="/svg/presión atmosferica.svg" alt="" width={200} height={200} className="object-contain" />
      </div>

      <div className="flex items-end justify-center relative z-10">
        <span className="font-digital text-6xl text-foreground drop-shadow-[0_0_12px_rgba(255,255,255,0.4)] tracking-wider">{value.toFixed(1)}</span>
        <span className="mb-1.5 ml-2 text-xl font-bold text-pressure drop-shadow-[0_0_8px_var(--color-pressure)]">hPa</span>
      </div>
      <div className="mt-1 flex items-center justify-between gap-3 relative z-10">
        <div className="relative h-24 w-28">
          <svg viewBox="0 0 120 110" className="h-full w-full">
            <path d="M18 92 A52 52 0 1 1 102 92" fill="none" stroke="oklch(0.15 0.02 260)" strokeWidth="12" strokeLinecap="round" />
            {Array.from({ length: 13 }).map((_, i) => {
              const tickAngle = 240 - (i / 12) * 240;
              const angleRad = ((-tickAngle - 30) * Math.PI) / 180;
              const isMajor = i % 3 === 0;
              const r1 = isMajor ? 40 : 44;
              const r2 = 52;
              const x1 = 60 + r1 * Math.cos(angleRad);
              const y1 = 70 + r1 * Math.sin(angleRad);
              const x2 = 60 + r2 * Math.cos(angleRad);
              const y2 = 70 + r2 * Math.sin(angleRad);
              return (
                <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={isMajor ? "oklch(0.5 0.05 260)" : "oklch(0.3 0.02 260)"} strokeWidth={isMajor ? 1.5 : 1} />
              )
            })}
            <path
              d="M18 92 A52 52 0 1 1 102 92"
              fill="none"
              stroke={accent}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${pct * 245} 400`}
              className="drop-shadow-[0_0_6px_var(--color-pressure)]"
            />
            <line
              x1="60"
              y1="70"
              x2={60 + 40 * Math.cos((angle * Math.PI) / 180)}
              y2={70 + 40 * Math.sin((angle * Math.PI) / 180)}
              stroke="oklch(0.97 0 0)"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <circle cx="60" cy="70" r="4" fill={accent} />
          </svg>
          <div className="absolute inset-x-0 bottom-0 flex justify-between px-1 text-[9px] text-muted-foreground">
            <span>980</span>
            <span>1040</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="flex items-center gap-1 rounded-md border border-success/40 bg-success/15 px-2 py-1 text-xs font-bold text-success">
            <TrendingUp className="size-3.5" /> {trend > 0 ? "+" : ""}
            {trend.toFixed(1)} hPa
          </span>
          <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Tendencia</span>
        </div>
      </div>
    </Panel>
  )
}

export function AltitudeCard({ data }: { data: WeatherData }) {
  const accent = "var(--color-altitude)"
  const { altitud: value, history } = data
  return (
    <Panel className="flex flex-col justify-between overflow-hidden relative">
      <div className="flex items-start gap-3 mb-1 z-10 relative">
        <div className="shrink-0 flex items-center justify-center -ml-4 -mt-4" style={{width: 110, height: 150}}>
          <div 
            className="w-full h-full"
            style={{
              WebkitMaskImage: 'url(/svg/altitud.svg)',
              WebkitMaskSize: 'contain',
              WebkitMaskRepeat: 'no-repeat',
              WebkitMaskPosition: 'center',
              backgroundColor: 'var(--color-altitude)'
            }}
          />
        </div>
        <div className="flex flex-col mt-1">
          <h2 className="text-sm font-semibold leading-tight tracking-wide text-foreground">ALTITUD</h2>
          <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">BMP280</p>
        </div>
      </div>

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.04] pointer-events-none">
        <img src="/svg/altitud.svg" alt="" width={200} height={200} className="object-contain" />
      </div>

      <div className="flex items-end justify-center py-1 relative z-10">
        <span className="font-digital text-7xl text-foreground drop-shadow-[0_0_12px_rgba(255,255,255,0.4)] tracking-wider">{Math.round(value)}</span>
        <span className="mb-2 ml-2 text-2xl font-bold text-altitude drop-shadow-[0_0_8px_var(--color-altitude)]">m</span>
      </div>
      <p className="mb-2 text-center text-[11px] font-medium uppercase tracking-widest text-muted-foreground relative z-10">
        Sobre el nivel del mar
      </p>
      <MiniArea data={history} dataKey="pressure" color={accent} />
    </Panel>
  )
}

export function AlertCard({ data }: { data: WeatherData }) {
  const accent = "var(--color-alert)"
  const { alerta } = data
  
  return (
    <Panel glow={alerta ? accent : undefined} className={`flex-1 flex flex-col justify-center relative overflow-hidden ${alerta ? 'border-alert/40 bg-alert/5' : ''}`}>
      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03] pointer-events-none ${alerta ? 'text-alert' : 'text-muted-foreground'}`}>
        <TriangleAlert strokeWidth={1} style={{ width: 140, height: 140 }} />
      </div>
      <div className="relative z-10 flex flex-col h-full">
        <PanelHeader icon={<TriangleAlert className="size-4" />} title="ALERTAS" accent={alerta ? accent : 'var(--color-muted-foreground)'} />
        <div className="flex flex-col py-1 mt-1">
          {alerta ? (
            <>
              <h3 className="text-lg font-bold text-alert mb-1">Alarma Activa</h3>
              <p className="text-xs font-medium text-muted-foreground leading-relaxed">
                {alerta} — revise el entorno.
              </p>
            </>
          ) : (
            <div className="flex items-center justify-center h-full pt-4">
              <p className="text-sm font-medium text-muted-foreground">Sin alertas activas</p>
            </div>
          )}
        </div>
      </div>
    </Panel>
  )
}

import { useState, useEffect } from 'react'

export function LocalTimeCard() {
  const [time, setTime] = useState<Date | null>(null)
  
  useEffect(() => {
    setTime(new Date())
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  if (!time) return <Panel className="flex-1" />

  const timeString = time.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const dateString = time.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <Panel className="flex-1 flex flex-col justify-center">
      <PanelHeader icon={<Clock className="size-4 text-sky-400" />} title="Hora local" subtitle="Tiempo real" accent="var(--color-foreground)" />
      <div className="flex flex-col items-center justify-center mt-3">
        <div className="font-digital text-[2.75rem] tracking-widest text-foreground drop-shadow-[0_0_12px_rgba(255,255,255,0.4)] leading-none">
          {timeString}
        </div>
        <p className="mt-2 text-[10px] font-medium uppercase tracking-widest text-muted-foreground capitalize">
          {dateString}
        </p>
      </div>
    </Panel>
  )
}

