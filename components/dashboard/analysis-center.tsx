"use client"

import { useState, useMemo } from "react"
import {
  BarChart3, Settings, Play, ShieldCheck, CheckSquare,
  Square, ChevronRight, FileSpreadsheet, Calendar, Loader2,
  FileJson, FileText, Download
} from "lucide-react"
import { Panel } from "./panel"
import type { WeatherData } from "@/types/weather"
import { runEnvironmentalAnalysis } from "@/lib/analysisEngine"
import { exportFullReportExcel, exportFullReportJSON, exportFullReportCSV } from "@/lib/reportExporterExcel"
import { cn } from "@/lib/utils"

export function AnalysisCenterView({ data }: { data: WeatherData }) {
  const { history, events } = data

  const [step, setStep] = useState<number>(1)
  const [period, setPeriod] = useState<string>("1H")
  const [customRange, setCustomRange] = useState({ start: "", end: "" })
  const [showCustomPicker, setShowCustomPicker] = useState(false)
  const [sensors, setSensors] = useState({
    temp: true, humidity: true, pressure: true, rain: true, airQuality: true,
  })
  const [additional, setAdditional] = useState({
    events: true, correlations: true, stats: true,
  })
  const [results, setResults] = useState<string[]>([])

  const selectedSensorsList = useMemo(() => {
    const list: string[] = []
    if (sensors.temp) list.push("Temperatura")
    if (sensors.humidity) list.push("Humedad")
    if (sensors.pressure) list.push("Presión")
    if (sensors.rain) list.push("Lluvia")
    if (sensors.airQuality) list.push("Calidad del Aire")
    return list
  }, [sensors])

  const handleGenerate = () => {
    setStep(2)
    setTimeout(() => {
      setStep(3)
      setTimeout(() => {
        const res = runEnvironmentalAnalysis(history, events, {
          period: showCustomPicker ? "24H" : period,
          sensors,
          additional,
        })
        setResults(res.conclusions)
        setStep(4)
      }, 1200)
    }, 1500)
  }

  const handleReset = () => { setStep(1); setResults([]) }

  const structuredResults = useMemo(() => {
    const hallazgos: string[] = [], correlaciones: string[] = [],
      tendencias: string[] = [], bitacora: string[] = []
    results.forEach(r => {
      const l = r.toLowerCase()
      if (l.includes("antes de") || l.includes("previa a")) correlaciones.push(r)
      else if (l.includes("permaneció") || l.includes("fluctuó") || l.includes("mantuvo")) tendencias.push(r)
      else if (l.includes("episodios") || l.includes("lluvia activa") || l.includes("precipitación")) hallazgos.push(r)
      else bitacora.push(r)
    })
    return { hallazgos, correlaciones, tendencias, bitacora }
  }, [results])

  const STEPS = [
    { s: 1, label: "Configurar" },
    { s: 2, label: "Procesar" },
    { s: 3, label: "Validar" },
    { s: 4, label: "Resultados" },
  ]

  return (
    <div className="h-full flex flex-col min-h-0 select-none animate-fade-in">

      {/* ── HEADER CENTRADO ─────────────────────────────── */}
      <div className="flex flex-col items-center justify-center gap-1 py-5">
        <div className="flex items-center justify-center size-11 rounded-2xl bg-accent/10 border border-accent/20 mb-1">
          <BarChart3 className="size-5 text-accent" />
        </div>
        <h2 className="text-xl font-bold tracking-tight text-foreground">Centro de Análisis</h2>
        <p className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground">
          Herramienta de exploración e investigación de datos
        </p>
      </div>

      {/* ── CARD PRINCIPAL UNIFICADA ─────────────────────── */}
      <Panel className="flex-1 min-h-0 mx-auto w-full max-w-3xl flex flex-col overflow-hidden p-0">

        {/* Stepper */}
        <div className="relative flex items-center px-8 py-5 border-b border-border/40">
          <div className="absolute left-8 right-8 top-1/2 -translate-y-5 h-0.5 bg-border/40 z-0" />
          {STEPS.map(item => {
            const done = step > item.s
            const active = step === item.s
            return (
              <div key={item.s} className="flex flex-col items-center flex-1 z-10">
                <div className={cn(
                  "size-8 rounded-full border-2 flex items-center justify-center text-xs font-extrabold transition-all duration-300",
                  done ? "bg-accent border-accent text-accent-foreground shadow-md" :
                    active ? "bg-card border-accent text-accent ring-4 ring-accent/20 scale-110 shadow-lg" :
                      "bg-card border-border/60 text-muted-foreground/50"
                )}>
                  {item.s}
                </div>
                <span className={cn(
                  "text-[10px] font-bold mt-1.5 tracking-widest uppercase transition-colors",
                  active ? "text-accent" : "text-muted-foreground/45"
                )}>
                  {item.label}
                </span>
              </div>
            )
          })}
        </div>

        {/* Body dinámico */}
        <div className="flex-1 min-h-0 overflow-y-auto px-8 py-6">

          {/* ── PASO 1: CONFIGURAR ── */}
          {step === 1 && (
            <div className="space-y-7 animate-fade-in">
              <div>
                <h3 className="text-sm font-bold text-foreground">Parámetros del análisis</h3>
                <p className="text-[10px] text-muted-foreground mt-0.5">Defina el período y los sensores que quiere estudiar.</p>
              </div>

              {/* Periodo */}
              <div>
                <span className="text-[9px] font-extrabold uppercase tracking-widest text-muted-foreground/70 block mb-2">Periodo</span>
                <div className="flex flex-wrap gap-2">
                  {["1H","6H","12H","24H","7D"].map(p => (
                    <button key={p}
                      onClick={() => { setPeriod(p); setShowCustomPicker(false) }}
                      className={cn(
                        "px-4 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer",
                        period === p && !showCustomPicker
                          ? "border-accent bg-accent text-accent-foreground shadow-md scale-[1.03]"
                          : "border-border/60 bg-card text-muted-foreground hover:border-accent/50 hover:text-foreground"
                      )}>
                      {p === "1H" ? "1 hora" : p === "6H" ? "6 horas" : p === "12H" ? "12 horas" : p === "24H" ? "24 horas" : "7 días"}
                    </button>
                  ))}
                  <button
                    onClick={() => setShowCustomPicker(true)}
                    className={cn(
                      "px-4 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5",
                      showCustomPicker
                        ? "border-accent bg-accent text-accent-foreground shadow-md scale-[1.03]"
                        : "border-border/60 bg-card text-muted-foreground hover:border-accent/50 hover:text-foreground"
                    )}>
                    <Calendar className="size-3.5" />
                    <span>Personalizado</span>
                  </button>
                </div>
                {showCustomPicker && (
                  <div className="grid grid-cols-2 gap-3 mt-3 p-4 bg-muted/10 rounded-xl border border-border/40">
                    {[["start","Inicio"],["end","Fin"]].map(([k,label]) => (
                      <div key={k}>
                        <label className="text-[9px] font-bold text-muted-foreground block mb-1">{label}</label>
                        <input type="date"
                          value={customRange[k as "start"|"end"]}
                          onChange={e => setCustomRange(prev => ({ ...prev, [k]: e.target.value }))}
                          className="w-full bg-card border border-border/60 text-xs px-3 py-1.5 rounded-lg text-foreground outline-none focus:border-accent"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Sensores */}
              <div>
                <span className="text-[9px] font-extrabold uppercase tracking-widest text-muted-foreground/70 block mb-2">Sensores a analizar</span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    { key:"temp", label:"Temperatura" },
                    { key:"humidity", label:"Humedad" },
                    { key:"pressure", label:"Presión" },
                    { key:"rain", label:"Sensor de lluvia" },
                    { key:"airQuality", label:"Calidad del aire" },
                  ].map(s => {
                    const checked = sensors[s.key as keyof typeof sensors]
                    return (
                      <button key={s.key}
                        onClick={() => setSensors(prev => ({ ...prev, [s.key]: !checked }))}
                        className={cn(
                          "flex items-center gap-2 text-xs font-semibold transition-colors cursor-pointer text-left",
                          checked ? "text-foreground" : "text-muted-foreground/60"
                        )}>
                        {checked
                          ? <CheckSquare className="size-4 text-accent shrink-0" />
                          : <Square className="size-4 text-muted-foreground/40 shrink-0" />}
                        <span>{s.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Info adicional */}
              <div>
                <span className="text-[9px] font-extrabold uppercase tracking-widest text-muted-foreground/70 block mb-2">Información adicional</span>
                <div className="space-y-3">
                  {[
                    { key:"events", label:"Incluir eventos de bitácora", desc:"Cruza los hallazgos con el registro operativo del sistema." },
                    { key:"correlations", label:"Detectar correlaciones cruzadas", desc:"Identifica relaciones entre variables de distintos sensores." },
                    { key:"stats", label:"Calcular estadísticas del período", desc:"Promedios, máximos, mínimos y desviación estándar." },
                  ].map(a => {
                    const checked = additional[a.key as keyof typeof additional]
                    return (
                      <button key={a.key}
                        onClick={() => setAdditional(prev => ({ ...prev, [a.key]: !checked }))}
                        className="flex items-start gap-2.5 text-left cursor-pointer group w-full">
                        {checked
                          ? <CheckSquare className="size-4 text-accent shrink-0 mt-0.5" />
                          : <Square className="size-4 text-muted-foreground/40 shrink-0 mt-0.5" />}
                        <div>
                          <p className="text-xs font-bold text-foreground group-hover:text-accent transition-colors">{a.label}</p>
                          <p className="text-[9.5px] text-muted-foreground/60 mt-0.5 leading-snug">{a.desc}</p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ── PASO 2: PROCESANDO ── */}
          {step === 2 && (
            <div className="flex flex-col items-center justify-center text-center h-full py-16 animate-fade-in">
              <Loader2 className="size-12 text-accent animate-spin mb-5" />
              <h3 className="text-sm font-bold text-foreground">Procesando Histórico de Lecturas</h3>
              <p className="text-[10px] text-muted-foreground mt-1.5 max-w-xs">
                Leyendo registros en caché temporal y aplicando técnicas de interpolación de datos.
              </p>
            </div>
          )}

          {/* ── PASO 3: VALIDANDO ── */}
          {step === 3 && (
            <div className="flex flex-col items-center justify-center text-center h-full py-16 animate-fade-in">
              <Loader2 className="size-12 text-emerald-500 animate-spin mb-5" />
              <h3 className="text-sm font-bold text-foreground">Validando Umbrales Físicos</h3>
              <p className="text-[10px] text-muted-foreground mt-1.5 max-w-xs">
                Confirmando límites operacionales en la bitácora contra registros del microcontrolador.
              </p>
            </div>
          )}

          {/* ── PASO 4: RESULTADOS ── */}
          {step === 4 && (
            <div className="space-y-5 animate-fade-in">
              <div>
                <h3 className="text-sm font-bold text-foreground">Informe de Resultados</h3>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Diagnóstico generado a partir del motor de análisis local.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {structuredResults.hallazgos.length > 0 && (
                  <div className="p-4 rounded-xl border border-sky-500/20 bg-sky-500/5">
                    <span className="text-[9px] font-extrabold uppercase tracking-widest text-sky-400 block mb-1">Precipitaciones y Eventos</span>
                    {structuredResults.hallazgos.map((h, i) => <p key={i} className="text-xs text-foreground leading-relaxed mt-1">{h}</p>)}
                  </div>
                )}
                {structuredResults.correlaciones.length > 0 && (
                  <div className="p-4 rounded-xl border border-accent/20 bg-accent/5">
                    <span className="text-[9px] font-extrabold uppercase tracking-widest text-accent block mb-1">Correlaciones Cruzadas</span>
                    {structuredResults.correlaciones.map((c, i) => <p key={i} className="text-xs text-foreground leading-relaxed mt-1">{c}</p>)}
                  </div>
                )}
                {structuredResults.tendencias.length > 0 && (
                  <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
                    <span className="text-[9px] font-extrabold uppercase tracking-widest text-emerald-400 block mb-1">Estabilidad de Sensores</span>
                    {structuredResults.tendencias.map((t, i) => <p key={i} className="text-xs text-foreground leading-relaxed mt-1">{t}</p>)}
                  </div>
                )}
                {structuredResults.bitacora.length > 0 && (
                  <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5">
                    <span className="text-[9px] font-extrabold uppercase tracking-widest text-amber-400 block mb-1">Bitácora Adicional</span>
                    {structuredResults.bitacora.map((b, i) => <p key={i} className="text-xs text-foreground leading-relaxed mt-1">{b}</p>)}
                  </div>
                )}
                {results.length === 0 && (
                  <div className="col-span-2 py-10 text-center opacity-50">
                    <p className="text-xs font-semibold">No se detectaron patrones en este período.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── FOOTER ─────────────────────────────────────── */}
        <div className="border-t border-border/40 px-8 py-4 flex items-center justify-between shrink-0">

          {/* Izquierda: volver */}
          <div>
            {step === 4 && (
              <button onClick={handleReset}
                className="px-4 py-2 rounded-xl text-xs font-bold text-muted-foreground border border-border/50 hover:bg-muted/30 cursor-pointer transition-colors">
                Volver al inicio
              </button>
            )}
          </div>

          {/* Derecha: acción principal */}
          <div className="flex items-center gap-2">
            {step === 1 && (
              <button onClick={handleGenerate}
                className="flex items-center gap-2 px-7 py-2.5 rounded-xl bg-card border border-accent/40 text-accent hover:bg-accent/8 font-bold text-sm tracking-wide cursor-pointer shadow-sm transition-all duration-200">
                <Play className="size-4 fill-current" />
                <span>Generar análisis</span>
              </button>
            )}
            {step === 4 && (
              <>
                <button onClick={() => exportFullReportJSON(history, events, period, selectedSensorsList, results)}
                  title="Exportar JSON"
                  className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-border/50 bg-card hover:bg-muted/30 text-xs font-bold text-foreground cursor-pointer transition-colors shadow-sm">
                  <FileJson className="size-4 text-amber-400" />
                  JSON
                </button>
                <button onClick={() => exportFullReportCSV(history, events, period, selectedSensorsList)}
                  title="Exportar CSV"
                  className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-border/50 bg-card hover:bg-muted/30 text-xs font-bold text-foreground cursor-pointer transition-colors shadow-sm">
                  <FileText className="size-4 text-sky-400" />
                  CSV
                </button>
                <button onClick={() => exportFullReportExcel(history, events, period, selectedSensorsList, results)}
                  title="Generar reporte Excel profesional"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-card border border-accent/40 text-accent hover:bg-accent/8 font-bold text-xs tracking-wide cursor-pointer shadow-sm transition-all duration-200">
                  <FileSpreadsheet className="size-4" />
                  Generar reporte (.xlsx)
                </button>
              </>
            )}
          </div>
        </div>
      </Panel>
    </div>
  )
}
