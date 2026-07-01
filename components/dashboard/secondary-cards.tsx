"use client"

import { Area, AreaChart, ResponsiveContainer } from "recharts"
import { TrendingUp, Clock, Wind } from "lucide-react"
import { Panel, PanelHeader } from "./panel"
import type { WeatherData, HistoryPoint } from "@/types/weather"

function MiniArea({ data, dataKey, color, height = 32 }: { data: HistoryPoint[]; dataKey: keyof HistoryPoint; color: string; height?: number }) {
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
                <stop offset="0%" stopColor="#c084fc" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
              </radialGradient>
            </defs>
            <circle cx="12" cy="12" r="10" fill="url(#gaugeGlow)" stroke="#a855f7" strokeWidth="1.5" opacity="0.4"/>
            <path d="M3.34 19a10 10 0 1 1 17.32 0" stroke="#c084fc" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M12 12 L17 7" stroke="#c084fc" strokeWidth="2" strokeLinecap="round"
              style={{filter:'drop-shadow(0 0 6px #c084fc)'}}/>
            <circle cx="12" cy="12" r="1.5" fill="#c084fc"
              style={{filter:'drop-shadow(0 0 4px #c084fc)'}}/>
            {[0,1,2,3,4,5,6,7,8,9,10,11,12].map(i => {
              const a = ((i / 12) * 240 - 210) * Math.PI / 180;
              const r1 = i % 3 === 0 ? 7 : 8, r2 = 9;
              return <line key={i}
                x1={12 + r1*Math.cos(a)} y1={12 + r1*Math.sin(a)}
                x2={12 + r2*Math.cos(a)} y2={12 + r2*Math.sin(a)}
                stroke={i % 3 === 0 ? '#c084fc' : '#6b21a8'} strokeWidth={i % 3 === 0 ? 1.5 : 1} />;
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
        <span className="font-digital text-5xl text-foreground drop-shadow-[0_0_12px_rgba(255,255,255,0.4)] tracking-wider">{value.toFixed(1)}</span>
        <span className="mb-1.5 ml-2 text-lg font-bold text-pressure drop-shadow-[0_0_8px_var(--color-pressure)]">hPa</span>
      </div>
      <div className="mt-1 flex items-center justify-between gap-3 relative z-10">
        <div className="relative h-20 w-24">
          <svg viewBox="0 0 120 110" className="h-full w-full">
            <path d="M18 92 A52 52 0 1 1 102 92" fill="none" stroke="color-mix(in srgb, var(--color-foreground) 15%, transparent)" strokeWidth="12" strokeLinecap="round" />
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
                <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={isMajor ? "var(--color-muted-foreground)" : "color-mix(in srgb, var(--color-foreground) 15%, transparent)"} strokeWidth={isMajor ? 1.5 : 1} />
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
          <span className="flex items-center gap-1 rounded-md border border-pressure/40 bg-pressure/15 px-2 py-1 text-xs font-bold text-pressure">
            <TrendingUp className="size-3.5" /> {trend > 0 ? "+" : ""}
            {trend.toFixed(1)} hPa
          </span>
          <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Tendencia</span>
        </div>
      </div>
    </Panel>
  )
}

export function AirQualityCard({ data }: { data: WeatherData }) {
  const accent = "var(--color-altitude)" // using altitude's color or we can use a new variable. For simplicity we can reuse the altitude styling or adjust it.
  const { calidadAire: value, history } = data
  
  const status = value < 100 ? "BUENA" : value < 200 ? "MODERADA" : "MALA"
  const statusColor = value < 100 ? "#2dd4bf" : value < 200 ? "#facc15" : "#f87171" // #2dd4bf is teal-400
  
  return (
    <Panel className="flex flex-col justify-between overflow-hidden relative">
      <div className="flex items-start mb-1 z-10 relative">
        <div className="absolute top-3 left-3 z-10 pointer-events-none" style={{ width: 44, height: 44 }}>
          <Wind className="w-full h-full text-teal-400 opacity-70" />
        </div>
        <div className="flex flex-col pl-16 pt-1">
          <h2 className="text-sm font-semibold leading-tight tracking-wide text-foreground">CALIDAD DEL AIRE</h2>
          <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">MQ135</p>
        </div>
      </div>

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03] pointer-events-none">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{width: 160, height: 160}} className="text-foreground">
          <path d="M12 2v20" />
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      </div>

      <div className="flex items-end justify-center py-0 relative z-10">
        <span className="font-digital text-6xl text-foreground drop-shadow-[0_0_12px_rgba(255,255,255,0.4)] tracking-wider">{Math.round(value)}</span>
        <span className="mb-2 ml-2 text-xl font-bold text-muted-foreground">ppm</span>
      </div>
      <p className="mb-2 text-center text-[12px] font-bold tracking-widest relative z-10" style={{color: statusColor}}>
        {status}
      </p>
      <MiniArea data={history} dataKey="airQuality" color={statusColor} />
    </Panel>
  )
}




