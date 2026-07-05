"use client"

import { useState, useMemo, useCallback } from "react"
import {
  Info, Clock, Wifi, Settings, Thermometer, Wind,
  CloudRain, Gauge, Bell, Search, WifiOff, X, Filter, CalendarDays
} from "lucide-react"
import { Panel } from "./panel"
import type { WeatherData, SystemEvent } from "@/types/weather"
import { cn } from "@/lib/utils"

// ─── TYPES ────────────────────────────────────────────────────────────────────
type CategoryFilter  = "todos" | "sensores" | "conectividad" | "sistema" | "configuracion"
type SeverityFilter  = "todos" | "alert" | "warning" | "success" | "info"
type DateQuickFilter = "todos" | "hoy" | "24h" | "7d" | "custom"

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const CATEGORY_FILTERS: { id: CategoryFilter; label: string }[] = [
  { id: "todos",         label: "TODOS" },
  { id: "sensores",      label: "SENSORES" },
  { id: "conectividad",  label: "CONECTIVIDAD" },
  { id: "sistema",       label: "SISTEMA" },
  { id: "configuracion", label: "CONFIG" },
]

const SEVERITY_FILTERS: {
  id: SeverityFilter
  label: string
  inactiveColor: string
  activeClass: string
}[] = [
  { id: "todos",   label: "TODOS",        inactiveColor: "text-muted-foreground",               activeClass: "bg-muted border-border/60 text-foreground" },
  { id: "alert",   label: "CRÍTICO",      inactiveColor: "text-red-600/70 dark:text-red-400/70",    activeClass: "bg-red-500/10 border-red-500/40 text-red-600 dark:text-red-400" },
  { id: "warning", label: "ADVERTENCIA",  inactiveColor: "text-amber-600/70 dark:text-amber-400/70", activeClass: "bg-amber-500/10 border-amber-500/40 text-amber-600 dark:text-amber-400" },
  { id: "success", label: "OPERATIVO",    inactiveColor: "text-emerald-600/70 dark:text-emerald-400/70", activeClass: "bg-emerald-500/10 border-emerald-500/40 text-emerald-600 dark:text-emerald-400" },
  { id: "info",    label: "CONFIG/INFO",  inactiveColor: "text-sky-600/70 dark:text-sky-400/70",    activeClass: "bg-sky-500/10 border-sky-500/40 text-sky-600 dark:text-sky-400" },
]

const DATE_FILTERS: { id: DateQuickFilter; label: string; description: string }[] = [
  { id: "todos",  label: "TODOS",    description: "Todo el historial" },
  { id: "hoy",    label: "RECIENTE", description: "Última hora" },
  { id: "24h",    label: "24 H",     description: "Últimas 24 horas" },
  { id: "7d",     label: "7 DÍAS",   description: "Últimos 7 días" },
  { id: "custom", label: "RANGO",    description: "Fechas personalizadas" },
]


// Pastel palette — vivid in light, soft in dark
const TYPE_CFG = {
  alert: {
    badge:       "border-red-500/30 text-red-600 dark:text-red-300 bg-red-500/10",
    label:       "CRÍTICO",
    borderColor: "border-l-red-500",
    stateColor:  "text-red-600 dark:text-red-400",
    stateLabel:  "FALLO",
    iconClass:   "text-red-600 dark:text-red-300",
  },
  warning: {
    badge:       "border-amber-500/30 text-amber-600 dark:text-amber-300 bg-amber-500/10",
    label:       "ADVERTENCIA",
    borderColor: "border-l-amber-500",
    stateColor:  "text-amber-600 dark:text-amber-400",
    stateLabel:  "ALERTA",
    iconClass:   "text-amber-600 dark:text-amber-300",
  },
  success: {
    badge:       "border-emerald-500/30 text-emerald-600 dark:text-emerald-300 bg-emerald-500/10",
    label:       "OPERATIVO",
    borderColor: "border-l-emerald-500",
    stateColor:  "text-emerald-600 dark:text-emerald-400",
    stateLabel:  "OK",
    iconClass:   "text-emerald-600 dark:text-emerald-300",
  },
  info: {
    badge:       "border-sky-500/30 text-sky-600 dark:text-sky-300 bg-sky-500/10",
    label:       "CONFIG",
    borderColor: "border-l-sky-500",
    stateColor:  "text-sky-600 dark:text-sky-400",
    stateLabel:  "INFO",
    iconClass:   "text-sky-600 dark:text-sky-300",
  },
} as const

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function classifyCategory(msg: string): CategoryFilter {
  const m = msg.toLowerCase()

  // SENSORES: chips físicos de medición (aht10, bmp280, mq135, lluvia, umbrales físicos)
  if (
    m.includes("sensor aht10") || m.includes("sensor bmp280") ||
    m.includes("sensor mq135") || m.includes("sensor de lluvia") ||
    m.includes("calidad del aire") || m.includes("precipitación") ||
    m.includes("temperatura superó") || m.includes("temperatura bajo") ||
    m.includes("humedad superó") || m.includes("humedad bajo") ||
    m.includes("presión bajo") || m.includes("presión superó")
  ) return "sensores"

  // CONECTIVIDAD: red, WiFi, ESP32 como nodo de red
  if (
    m.includes("wifi") || m.includes("esp32") || m.includes("reconect") || m.includes("ip:")
  ) return "conectividad"

  // CONFIGURACIÓN: acciones del usuario
  if (
    m.includes("configuración") || m.includes("exportación") ||
    m.includes("csv") || m.includes("config") || m.includes("actualizada")
  ) return "configuracion"

  // SISTEMA: boot, alarmas, actuadores (led, buzzer), uptime — núcleo del firmware
  return "sistema"
}

function EventIcon({ msg, type }: { msg: string; type: SystemEvent["type"] }) {
  const cfg = TYPE_CFG[type] ?? TYPE_CFG.info
  const cls = cn("size-3.5 flex-shrink-0", cfg.iconClass)
  const m = msg.toLowerCase()
  if (m.includes("bmp280") || m.includes("presión"))   return <Gauge className={cls} />
  if (m.includes("aht10") || m.includes("temperatura") || m.includes("humedad")) return <Thermometer className={cls} />
  if (m.includes("mq135") || m.includes("calidad"))    return <Wind className={cls} />
  if (m.includes("lluvia") || m.includes("precipitación")) return <CloudRain className={cls} />
  if (m.includes("desconectado") || m.includes("desconexión")) return <WifiOff className={cls} />
  if (m.includes("wifi") || m.includes("esp32 conectado")) return <Wifi className={cls} />
  if (m.includes("configuración") || m.includes("config") || m.includes("csv")) return <Settings className={cls} />
  return <Clock className={cls} />
}

function getEventDetails(message: string): { title: string; desc: string; orig: string } {
  const m = message.toLowerCase()
  let orig = "SISTEMA"
  if (m.includes("esp32"))    orig = "ESP32"
  else if (m.includes("aht10"))   orig = "AHT10"
  else if (m.includes("bmp280"))  orig = "BMP280"
  else if (m.includes("mq135"))   orig = "MQ135"
  else if (m.includes("wifi"))    orig = "WIFI"
  else if (m.includes("lluvia") || m.includes("precipitación")) orig = "LLUVIA"
  else if (m.includes("buzzer"))  orig = "BUZZER"
  else if (m.includes("led"))     orig = "LED"

  let title = message
  let desc  = "Acción operativa ejecutada por el firmware."
  if (m.includes("esp32 desconectado"))      { title = "ESP32 desconectado";          desc = "Se perdió la conexión con el dispositivo." }
  else if (m.includes("bmp280 desconectado")){ title = "Sensor BMP280 desconectado";  desc = "No se detecta respuesta del sensor de presión." }
  else if (m.includes("aht10 desconectado")) { title = "Sensor AHT10 desconectado";   desc = "No se detecta respuesta de temperatura/humedad." }
  else if (m.includes("wifi conectado"))     { title = "WiFi conectado";              desc = "Conexión de red establecida correctamente." }
  else if (m.includes("esp32 conectado"))    { title = "ESP32 conectado";             desc = "El dispositivo está en línea y operativo." }
  else if (m.includes("sistema iniciado"))   { title = "Sistema iniciado";            desc = "Todos los módulos se cargaron correctamente." }
  else if (m.includes("exportación csv"))    { title = "Exportación CSV";             desc = "Reporte de datos históricos descargado." }
  else if (m.includes("alarma activada"))    { title = "Alarma activada";             desc = "Se detectó una condición de alerta crítica." }
  else if (m.includes("alarma desactivada")) { title = "Alarma desactivada";          desc = "El sistema volvió a estado operativo normal." }
  else if (m.includes("actuador buzzer: activado"))  { title = "Buzzer activado";     desc = "Señal acústica de alerta emitida." }
  else if (m.includes("actuador buzzer: desactivado")){ title = "Buzzer desactivado"; desc = "Señal acústica detenida." }
  else if (m.includes("actuador led rojo: encendido")){ title = "LED rojo encendido"; desc = "Indicador visual de alerta activado." }
  else if (m.includes("actuador led rojo: apagado"))  { title = "LED rojo apagado";   desc = "Indicador visual de alerta desactivado." }
  else if (m.includes("uptime"))             { title = "Hito de uptime";             desc = "El sistema opera sin interrupciones." }
  return { title, desc, orig }
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export function EventsView({ data }: { data: WeatherData }) {
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("todos")
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>("todos")
  const [searchQuery,    setSearchQuery]    = useState("")
  const [quickDate,      setQuickDate]      = useState<DateQuickFilter>("todos")
  const [dateFrom,       setDateFrom]       = useState("")
  const [dateTo,         setDateTo]         = useState("")
  const [currentPage,    setCurrentPage]    = useState(1)
  const [pageSize,       setPageSize]       = useState(15)

  const { events } = data

  // ── Derived state: is any filter active? ──────────────────────────────────────
  const hasActiveFilters = categoryFilter !== "todos" || severityFilter !== "todos" ||
    searchQuery.trim() !== "" || quickDate !== "todos" || dateFrom !== "" || dateTo !== ""

  // ── Clear all filters ─────────────────────────────────────────────────────────
  const clearAllFilters = useCallback(() => {
    setCategoryFilter("todos")
    setSeverityFilter("todos")
    setSearchQuery("")
    setQuickDate("todos")
    setDateFrom("")
    setDateTo("")
    setCurrentPage(1)
  }, [])

  const resetPage = useCallback(() => setCurrentPage(1), [])

  // ── Filtering ─────────────────────────────────────────────────────────────────
  const filteredEvents = useMemo(() => {
    return events.filter(e => {
      // 1. Text search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const hit =
          e.message.toLowerCase().includes(q) ||
          (TYPE_CFG[e.type]?.label ?? "").toLowerCase().includes(q) ||
          classifyCategory(e.message).toLowerCase().includes(q)
        if (!hit) return false
      }

      // 2. Severity level
      if (severityFilter !== "todos" && e.type !== severityFilter) return false

      // 3. Category
      if (categoryFilter !== "todos" && classifyCategory(e.message) !== categoryFilter) return false

      // 4. Date range
      if (quickDate !== "todos") {
        const ts  = (e.timestamp != null && e.timestamp > 0) ? e.timestamp : Date.now()
        const now = Date.now()
        if (quickDate === "hoy") {
          // "RECIENTE" = última hora
          if (ts < now - 3_600_000) return false
        } else if (quickDate === "24h") {
          if (ts < now - 86_400_000) return false
        } else if (quickDate === "7d") {
          if (ts < now - 7 * 86_400_000) return false
        } else if (quickDate === "custom") {
          if (dateFrom && ts < new Date(dateFrom + "T00:00:00").getTime()) return false
          if (dateTo   && ts > new Date(dateTo   + "T23:59:59").getTime()) return false
        }
      }

      return true
    })
  }, [events, searchQuery, severityFilter, categoryFilter, quickDate, dateFrom, dateTo])

  // ── Pagination ────────────────────────────────────────────────────────────────
  const pagedSlice = useMemo(
    () => filteredEvents.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [filteredEvents, currentPage, pageSize]
  )

  // ── Group by day ──────────────────────────────────────────────────────────────
  const groupedEvents = useMemo(() => {
    const today     = new Date()
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)
    const groups: Record<string, SystemEvent[]> = {}
    pagedSlice.forEach(e => {
      const d = new Date((e.timestamp != null && e.timestamp > 0) ? e.timestamp : Date.now())
      let key: string
      if (d.toDateString() === today.toDateString())
        key = `HOY · ${d.toLocaleDateString("es-EC", { day: "numeric", month: "long", year: "numeric" })}`
      else if (d.toDateString() === yesterday.toDateString())
        key = `AYER · ${d.toLocaleDateString("es-EC", { day: "numeric", month: "long", year: "numeric" })}`
      else
        key = d.toLocaleDateString("es-EC", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).toUpperCase()
      ;(groups[key] ??= []).push(e)
    })
    return groups
  }, [pagedSlice])

  const totalItems = filteredEvents.length
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const startIndex = (currentPage - 1) * pageSize

  const criticalCount = events.filter(e => e.type === "alert").length
  const warningCount  = events.filter(e => e.type === "warning").length

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="h-full flex flex-col min-h-0">
      <Panel className="flex-1 min-h-0 flex flex-col p-0 overflow-hidden">

        {/* ── HEADER ─────────────────────────────────────────────────────── */}
        <div className="px-5 py-3 border-b border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-background/50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-8 rounded-lg bg-card border border-border shadow-sm">
              <Bell className="size-3.5 text-muted-foreground" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-wide text-foreground">Bitácora de Eventos</h2>
              <p className="text-[9px] font-semibold tracking-widest text-muted-foreground uppercase">Registro operativo del sistema</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className="px-2 py-0.5 rounded border border-red-500/30 bg-red-500/8 text-[9px] font-extrabold text-red-600 dark:text-red-400 whitespace-nowrap">
              {criticalCount} CRÍTICOS
            </span>
            <span className="px-2 py-0.5 rounded border border-amber-500/30 bg-amber-500/8 text-[9px] font-extrabold text-amber-600 dark:text-amber-400 whitespace-nowrap">
              {warningCount} ADVERTENCIAS
            </span>
            <span className="px-2 py-0.5 rounded border border-border/40 bg-card/50 text-[9px] font-extrabold text-muted-foreground whitespace-nowrap">
              {events.length} TOTAL
            </span>
          </div>
        </div>

        {/* ── FILTER TOOLBAR ─────────────────────────────────────────────── */}
        <div className="px-4 py-2.5 border-b border-border/20 bg-background/15 flex flex-col gap-2 flex-shrink-0">

          {/* Row 1: Search + Date filters + Clear button */}
          <div className="flex flex-wrap gap-2 items-center">
            {/* Search */}
            <div className="relative min-w-[180px] flex-1 max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3 text-muted-foreground/40 pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar…"
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); resetPage() }}
                className="w-full pl-7 pr-3 py-1 text-[11px] rounded border border-border/60 bg-background/80 text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-sky-500/30"
              />
            </div>

            {/* Date quick-filters */}
            <div className="flex items-center gap-0.5 bg-card/30 border border-border/40 rounded p-0.5">
              <CalendarDays className="size-3 text-muted-foreground/40 ml-1.5 mr-1" />
              {DATE_FILTERS.map(f => (
                <button
                  key={f.id}
                  title={f.description}
                  onClick={() => { setQuickDate(f.id); resetPage() }}
                  className={cn(
                    "px-2.5 py-0.5 text-[9px] font-bold rounded transition-all duration-150 tracking-wider",
                    quickDate === f.id
                      ? "bg-sky-500/20 text-sky-600 dark:text-sky-400 shadow-sm"
                      : "text-muted-foreground/60 hover:text-foreground hover:bg-card/60"
                  )}
                >{f.label}</button>
              ))}
            </div>

            {/* Clear all button — visible only when filters active */}
            <button
              onClick={clearAllFilters}
              className={cn(
                "flex items-center gap-1 px-2.5 py-1 text-[9px] font-bold rounded border transition-all duration-150",
                hasActiveFilters
                  ? "border-red-500/30 bg-red-500/8 text-red-600 dark:text-red-400 hover:bg-red-500/15"
                  : "border-border/30 bg-card/20 text-muted-foreground/40 cursor-default"
              )}
              disabled={!hasActiveFilters}
            >
              <X className="size-3" />
              Limpiar
            </button>
          </div>

          {/* Custom date range (only when RANGO selected) */}
          {quickDate === "custom" && (
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground pl-1">
              <span className="font-semibold">Desde</span>
              <input
                type="date" value={dateFrom}
                onChange={e => { setDateFrom(e.target.value); resetPage() }}
                className="rounded border border-border/60 bg-background px-2 py-0.5 text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-sky-500/30"
              />
              <span className="font-semibold">hasta</span>
              <input
                type="date" value={dateTo}
                onChange={e => { setDateTo(e.target.value); resetPage() }}
                className="rounded border border-border/60 bg-background px-2 py-0.5 text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-sky-500/30"
              />
            </div>
          )}

          {/* Row 2: Category chips + Clear */}
          <div className="flex flex-wrap gap-1 items-center">
            <span className="text-[8.5px] font-extrabold uppercase tracking-widest text-muted-foreground/45 mr-0.5 flex-shrink-0">Categoría:</span>
            {CATEGORY_FILTERS.map(f => (
              <button
                key={f.id}
                onClick={() => { setCategoryFilter(f.id); resetPage() }}
                className={cn(
                  "px-2 py-0.5 text-[9px] font-bold rounded border transition-all duration-150",
                  categoryFilter === f.id
                    ? "bg-foreground/10 border-foreground/30 text-foreground"
                    : "border-border/40 bg-transparent text-muted-foreground/60 hover:text-foreground hover:border-border/70"
                )}
              >{f.label}</button>
            ))}
            {/* Inline clear for category */}
            {categoryFilter !== "todos" && (
              <button
                onClick={() => { setCategoryFilter("todos"); resetPage() }}
                className="ml-0.5 flex items-center gap-0.5 px-1.5 py-0.5 text-[8px] font-bold rounded border border-border/40 text-muted-foreground/60 hover:text-foreground hover:border-border"
              >
                <X className="size-2.5" />
              </button>
            )}
          </div>

          {/* Row 3: Severity chips + Clear */}
          <div className="flex flex-wrap gap-1 items-center border-t border-border/10 pt-2">
            <span className="text-[8.5px] font-extrabold uppercase tracking-widest text-muted-foreground/45 mr-0.5 flex-shrink-0 flex items-center gap-1">
              <Filter className="size-2.5" />Nivel:
            </span>
            {SEVERITY_FILTERS.map(f => (
              <button
                key={f.id}
                onClick={() => { setSeverityFilter(f.id); resetPage() }}
                className={cn(
                  "px-2 py-0.5 text-[9px] font-bold rounded border transition-all duration-150",
                  severityFilter === f.id
                    ? f.activeClass
                    : cn("border-border/40 bg-transparent hover:border-border/70 hover:bg-card/30", f.inactiveColor)
                )}
              >{f.label}</button>
            ))}
            {/* Inline clear for severity */}
            {severityFilter !== "todos" && (
              <button
                onClick={() => { setSeverityFilter("todos"); resetPage() }}
                className="ml-0.5 flex items-center gap-0.5 px-1.5 py-0.5 text-[8px] font-bold rounded border border-border/40 text-muted-foreground/60 hover:text-foreground hover:border-border"
              >
                <X className="size-2.5" />
              </button>
            )}
          </div>
        </div>

        {/* ── TABLE ──────────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-4 py-3 min-h-0">
          {totalItems === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
              <Info className="size-8 opacity-25" />
              <div className="text-center">
                <p className="text-xs font-bold uppercase tracking-widest opacity-50">Sin registros para este filtro</p>
                {quickDate === "hoy" && (
                  <p className="text-[10px] text-muted-foreground/50 mt-1">
                    <strong>RECIENTE</strong> muestra eventos de la última hora.<br/>
                    Prueba con <strong>24 H</strong> o <strong>TODOS</strong> para ver más.
                  </p>
                )}
              </div>
              {hasActiveFilters && (
                <button
                  onClick={clearAllFilters}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold rounded border border-sky-500/30 bg-sky-500/8 text-sky-600 dark:text-sky-400 hover:bg-sky-500/15 transition-colors"
                >
                  <X className="size-3" />
                  Limpiar todos los filtros
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {Object.keys(groupedEvents).map(groupKey => (
                <div key={groupKey} className="space-y-1">

                  {/* Day separator */}
                  <div className="flex items-center gap-2 py-1 select-none">
                    <div className="h-px flex-1 bg-border/15" />
                    <span className="text-[8.5px] font-extrabold uppercase tracking-widest text-muted-foreground/45 bg-background border border-border/25 px-2.5 py-0.5 rounded-full whitespace-nowrap">
                      {groupKey}
                    </span>
                    <div className="h-px flex-1 bg-border/15" />
                  </div>

                  {/* Col headers */}
                  <div className="grid grid-cols-12 gap-2 px-3 py-1 text-[8px] font-extrabold uppercase tracking-widest text-muted-foreground/40">
                    <div className="col-span-3">Hora / Fecha</div>
                    <div className="col-span-2 text-center">Nivel</div>
                    <div className="col-span-1 text-center">Origen</div>
                    <div className="col-span-4 pl-2">Mensaje</div>
                    <div className="col-span-2 text-right pr-2">Estado / Cat.</div>
                  </div>

                  {/* Rows */}
                  <div className="space-y-1">
                    {groupedEvents[groupKey].map(event => {
                      const cfg      = TYPE_CFG[event.type] ?? TYPE_CFG.info
                      const category = classifyCategory(event.message)
                      const details  = getEventDetails(event.message)
                      const ts       = (event.timestamp != null && event.timestamp > 0) ? event.timestamp : Date.now()
                      const d        = new Date(ts)
                      const timeStr  = event.time ?? d.toLocaleTimeString("es-EC", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })
                      const dateStr  = d.toLocaleDateString("es-EC", { day: "2-digit", month: "short", year: "numeric" })

                      return (
                        <div
                          key={event.id}
                          className={cn(
                            "grid grid-cols-12 gap-2 items-center px-3 py-2 rounded-lg border border-border/50 bg-card/25 hover:bg-card/50 transition-colors duration-150 border-l-[3px]",
                            cfg.borderColor
                          )}
                        >
                          {/* 1. Time + Date */}
                          <div className="col-span-3 flex items-center gap-2 min-w-0">
                            <span className="flex items-center justify-center size-6 rounded bg-background/80 border border-border/40 flex-shrink-0">
                              <EventIcon msg={event.message} type={event.type} />
                            </span>
                            <div className="min-w-0">
                              <p className="text-[11px] font-bold font-mono text-foreground leading-none">{timeStr}</p>
                              <p className="text-[9px] font-semibold text-muted-foreground/80 mt-0.5 truncate">{dateStr}</p>
                            </div>
                          </div>

                          {/* 2. Severity badge */}
                          <div className="col-span-2 flex justify-center">
                            <span className={cn("px-1.5 py-0.5 rounded text-[8px] font-bold tracking-wide border whitespace-nowrap", cfg.badge)}>
                              {cfg.label}
                            </span>
                          </div>

                          {/* 3. Origin */}
                          <div className="col-span-1 text-center">
                            <span className="text-[9px] font-bold text-foreground/65 tracking-wider">{details.orig}</span>
                          </div>

                          {/* 4. Message */}
                          <div className="col-span-4 pl-2 min-w-0">
                            <p className="text-[11px] font-semibold text-foreground truncate">{details.title}</p>
                            <p className="text-[9px] text-muted-foreground/65 truncate mt-0.5">{details.desc}</p>
                          </div>

                          {/* 5. Status + category */}
                          <div className="col-span-2 flex flex-col items-end gap-0.5 pr-1">
                            <div className="flex items-center gap-1">
                              <span className={cn("size-1.5 rounded-full flex-shrink-0",
                                cfg.stateColor.replace("text-", "bg-").replace(/\s+dark:\S+/, "")
                              )} />
                              <span className={cn("text-[8px] font-bold uppercase", cfg.stateColor)}>{cfg.stateLabel}</span>
                            </div>
                            <span className="text-[7px] font-bold uppercase tracking-wider text-muted-foreground/45 border border-border/30 px-1 py-px rounded">
                              {category}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── FOOTER / PAGINATION ────────────────────────────────────────── */}
        <div className="px-4 py-2 border-t border-border/25 bg-background/20 flex items-center justify-between flex-wrap gap-2 flex-shrink-0">
          <div className="flex items-center gap-2">
            <select
              value={pageSize}
              onChange={e => { setPageSize(Number(e.target.value)); setCurrentPage(1) }}
              className="text-[9px] font-bold bg-card border border-border/50 rounded px-1.5 py-0.5 text-foreground focus:outline-none"
            >
              {[10, 15, 25, 50].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            <p className="text-[9px] text-muted-foreground">
              <span className="font-bold text-foreground">{Math.min(startIndex + 1, Math.max(1, totalItems))}</span>–
              <span className="font-bold text-foreground">{Math.min(startIndex + pageSize, totalItems)}</span>
              {" "}de{" "}
              <span className="font-bold text-foreground">{totalItems}</span>
              {hasActiveFilters && <span className="text-muted-foreground/50"> (filtrado)</span>}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="px-2 py-0.5 text-[9px] font-bold rounded border border-border/50 bg-card/40 text-muted-foreground hover:text-foreground disabled:opacity-25 transition-colors"
            >‹ Anterior</button>
            <span className="px-2.5 py-0.5 text-[9px] font-extrabold rounded bg-sky-500/10 border border-sky-500/25 text-sky-600 dark:text-sky-400">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="px-2 py-0.5 text-[9px] font-bold rounded border border-border/50 bg-card/40 text-muted-foreground hover:text-foreground disabled:opacity-25 transition-colors"
            >Siguiente ›</button>
          </div>
        </div>

      </Panel>
    </div>
  )
}
