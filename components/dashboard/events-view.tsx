"use client"

import { useState, useMemo, useCallback, useRef, useEffect } from "react"
import {
  Info, Clock, Wifi, Settings, Thermometer, Wind,
  CloudRain, Gauge, Bell, Search, WifiOff, X, Filter, CalendarDays,
  TriangleAlert, BellRing, Activity, List, Download, ChevronDown, FileSpreadsheet, FileText
} from "lucide-react"
import { Panel } from "./panel"
import type { WeatherData, SystemEvent } from "@/types/weather"
import { weatherService } from "@/services/weatherService"
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
  { id: "alert",   label: "CRÍTICO",      inactiveColor: "text-rose-400/70 dark:text-rose-300/60",    activeClass: "bg-rose-50 dark:bg-rose-300/10 border-rose-200 dark:border-rose-300/30 text-rose-400 dark:text-rose-300" },
  { id: "warning", label: "ADVERTENCIA",  inactiveColor: "text-amber-400/70 dark:text-amber-200/60", activeClass: "bg-amber-50 dark:bg-amber-200/10 border-amber-200 dark:border-amber-200/30 text-amber-400 dark:text-amber-200" },
  { id: "success", label: "OPERATIVO",    inactiveColor: "text-emerald-400/70 dark:text-emerald-300/60", activeClass: "bg-emerald-50 dark:bg-emerald-300/10 border-emerald-200 dark:border-emerald-300/30 text-emerald-400 dark:text-emerald-300" },
  { id: "info",    label: "CONFIG/INFO",  inactiveColor: "text-sky-400/70 dark:text-sky-200/60",    activeClass: "bg-sky-50 dark:bg-sky-200/10 border-sky-200 dark:border-sky-200/30 text-sky-400 dark:text-sky-200" },
]

const DATE_FILTERS: { id: DateQuickFilter; label: string; description: string }[] = [
  { id: "todos",  label: "TODOS",    description: "Todo el historial" },
  { id: "hoy",    label: "RECIENTE", description: "Última hora" },
  { id: "24h",    label: "24 H",     description: "Últimas 24 horas" },
  { id: "7d",     label: "7 DÍAS",   description: "Últimos 7 días" },
  { id: "custom", label: "RANGO",    description: "Fechas personalizadas" },
]


// Pastel palette — same tones as summary cards (rose / amber / emerald / sky, suaves)
const TYPE_CFG = {
  alert: {
    badge:       "border-rose-200 dark:border-rose-300/30 text-rose-400 dark:text-rose-300 bg-rose-50 dark:bg-rose-300/10",
    label:       "CRÍTICO",
    borderColor: "border-l-rose-300 dark:border-l-rose-300/70",
    stateColor:  "text-rose-400 dark:text-rose-300",
    stateLabel:  "FALLO",
    iconClass:   "text-rose-400 dark:text-rose-300",
  },
  warning: {
    badge:       "border-amber-200 dark:border-amber-200/30 text-amber-400 dark:text-amber-200 bg-amber-50 dark:bg-amber-200/10",
    label:       "ADVERTENCIA",
    borderColor: "border-l-amber-200 dark:border-l-amber-200/70",
    stateColor:  "text-amber-400 dark:text-amber-200",
    stateLabel:  "ALERTA",
    iconClass:   "text-amber-400 dark:text-amber-200",
  },
  success: {
    badge:       "border-emerald-200 dark:border-emerald-300/30 text-emerald-400 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-300/10",
    label:       "OPERATIVO",
    borderColor: "border-l-emerald-200 dark:border-l-emerald-300/70",
    stateColor:  "text-emerald-400 dark:text-emerald-300",
    stateLabel:  "OK",
    iconClass:   "text-emerald-400 dark:text-emerald-300",
  },
  info: {
    badge:       "border-sky-200 dark:border-sky-200/30 text-sky-400 dark:text-sky-200 bg-sky-50 dark:bg-sky-200/10",
    label:       "CONFIG",
    borderColor: "border-l-sky-200 dark:border-l-sky-200/70",
    stateColor:  "text-sky-400 dark:text-sky-200",
    stateLabel:  "INFO",
    iconClass:   "text-sky-400 dark:text-sky-200",
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

// Mini-tendencia de advertencias por hora, construida con los eventos reales
function WarningSparkline({ events }: { events: SystemEvent[] }) {
  const BUCKETS = 12
  const now = Date.now()
  const bucketMs = 3_600_000 // 1 hora

  const counts = Array.from({ length: BUCKETS }, (_, i) => {
    const bucketStart = now - (BUCKETS - i) * bucketMs
    const bucketEnd = bucketStart + bucketMs
    return events.filter(e => {
      if (e.type !== "warning") return false
      const ts = (e.timestamp != null && e.timestamp > 0) ? e.timestamp : now
      return ts >= bucketStart && ts < bucketEnd
    }).length
  })

  const max = Math.max(1, ...counts)
  const w = 64, h = 20
  const points = counts.map((c, i) => {
    const x = (i / (BUCKETS - 1)) * w
    const y = h - (c / max) * h
    return `${x},${y}`
  }).join(" ")

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="flex-shrink-0 overflow-visible">
      <polyline
        points={points}
        fill="none"
        className="stroke-amber-500 dark:stroke-amber-400"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
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
  const [exportMenuOpen, setExportMenuOpen] = useState(false)
  const [isExporting,    setIsExporting]    = useState(false)
  const exportMenuRef = useRef<HTMLDivElement>(null)

  // Cierra el menú de exportación al hacer clic fuera de él
  useEffect(() => {
    function onClickOutside(ev: MouseEvent) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(ev.target as Node)) {
        setExportMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", onClickOutside)
    return () => document.removeEventListener("mousedown", onClickOutside)
  }, [])

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

  const criticalCount = filteredEvents.filter(e => e.type === "alert").length
  const warningCount  = filteredEvents.filter(e => e.type === "warning").length

  // ── Filas compartidas para ambos formatos de exportación (respeta filtros activos) ──
  const buildExportRows = useCallback(() => {
    return filteredEvents.map(e => {
      const cfg     = TYPE_CFG[e.type] ?? TYPE_CFG.info
      const details = getEventDetails(e.message)
      const ts      = (e.timestamp != null && e.timestamp > 0) ? e.timestamp : Date.now()
      const d       = new Date(ts)
      return {
        fecha:    d.toLocaleDateString("es-EC", { day: "2-digit", month: "2-digit", year: "numeric" }),
        hora:     e.time ?? d.toLocaleTimeString("es-EC", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }),
        nivel:    cfg.label,
        tipo:     e.type,
        origen:   details.orig,
        categoria: classifyCategory(e.message),
        mensaje:  e.message,
      }
    })
  }, [filteredEvents])

  // ── CSV Export — datos crudos, ideal para importar a otro sistema ──────────────
  const handleExportCSV = () => {
    if (filteredEvents.length === 0) return
    const rows = buildExportRows()
    const csvRows: string[] = []
    csvRows.push(["fecha", "hora", "nivel", "origen", "categoria", "mensaje"].join(","))
    rows.forEach(r => {
      const safeMsg = `"${r.mensaje.replace(/"/g, '""')}"`
      csvRows.push([r.fecha, r.hora, r.nivel, r.origen, r.categoria, safeMsg].join(","))
    })
    // BOM al inicio: sin esto Excel interpreta el archivo como ANSI y rompe tildes/ñ/guiones (á, ñ, –)
    const blob = new Blob(["\uFEFF" + csvRows.join("\n")], { type: "text/csv;charset=utf-8;" })
    const url  = window.URL.createObjectURL(blob)
    const a    = document.createElement("a")
    a.setAttribute("hidden", "")
    a.setAttribute("href", url)
    a.setAttribute("download", `bitacora_eventos_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
    weatherService.forceEvent(`Exportación CSV de bitácora realizada (${filteredEvents.length} eventos)`, "info")
    setExportMenuOpen(false)
  }

  // ── Excel Export — archivo .xlsx real, con encabezado y color por nivel ────────
  const handleExportExcel = async () => {
    if (filteredEvents.length === 0) return
    setIsExporting(true)
    try {
      const ExcelJS = (await import("exceljs")).default
      const workbook = new ExcelJS.Workbook()
      workbook.creator = "Estación Meteorológica IoT"
      workbook.created = new Date()

      const sheet = workbook.addWorksheet("Bitácora", {
        views: [{ state: "frozen", ySplit: 1 }],
      })

      sheet.columns = [
        { header: "Fecha",     key: "fecha",     width: 13 },
        { header: "Hora",      key: "hora",      width: 12 },
        { header: "Nivel",     key: "nivel",     width: 14 },
        { header: "Origen",    key: "origen",    width: 12 },
        { header: "Categoría", key: "categoria", width: 14 },
        { header: "Mensaje",   key: "mensaje",   width: 55 },
      ]

      // Encabezado: negrita, fondo oscuro, texto blanco
      const headerRow = sheet.getRow(1)
      headerRow.eachCell(cell => {
        cell.font = { bold: true, color: { argb: "FFFFFFFF" } }
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } }
        cell.alignment = { vertical: "middle", horizontal: "left" }
        cell.border = { bottom: { style: "thin", color: { argb: "FF334155" } } }
      })
      headerRow.height = 20

      // Colores de relleno por nivel — mismos tonos semánticos que usa el dashboard
      const FILL_BY_TYPE: Record<string, string> = {
        alert:   "FFFEE2E2", // rojo muy claro
        warning: "FFFEF3C7", // ámbar muy claro
        success: "FFD1FAE5", // esmeralda muy claro
        info:    "FFE0F2FE", // celeste muy claro
      }
      const FONT_BY_TYPE: Record<string, string> = {
        alert:   "FF991B1B",
        warning: "FF92400E",
        success: "FF065F46",
        info:    "FF075985",
      }

      const rows = buildExportRows()
      rows.forEach(r => {
        const row = sheet.addRow({
          fecha: r.fecha, hora: r.hora, nivel: r.nivel,
          origen: r.origen, categoria: r.categoria, mensaje: r.mensaje,
        })
        const nivelCell = row.getCell("nivel")
        nivelCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: FILL_BY_TYPE[r.tipo] ?? "FFF1F5F9" } }
        nivelCell.font = { bold: true, color: { argb: FONT_BY_TYPE[r.tipo] ?? "FF475569" } }
        nivelCell.alignment = { vertical: "middle", horizontal: "center" }
        row.eachCell(cell => {
          cell.border = { bottom: { style: "hair", color: { argb: "FFE2E8F0" } } }
          if (cell !== nivelCell) cell.alignment = { vertical: "middle" }
        })
      })

      sheet.autoFilter = { from: "A1", to: "F1" }

      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
      const url  = window.URL.createObjectURL(blob)
      const a    = document.createElement("a")
      a.setAttribute("hidden", "")
      a.setAttribute("href", url)
      a.setAttribute("download", `bitacora_eventos_${new Date().toISOString().slice(0, 10)}.xlsx`)
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      weatherService.forceEvent(`Exportación Excel de bitácora realizada (${filteredEvents.length} eventos)`, "info")
    } finally {
      setIsExporting(false)
      setExportMenuOpen(false)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="h-full flex flex-col min-h-0">
      <Panel className="flex-1 min-h-0 flex flex-col p-0 overflow-hidden">

        {/* ── HEADER ─────────────────────────────────────────────────────── */}
        <div className="px-5 py-3 border-b border-border/50 grid grid-cols-[1fr_auto_1fr] items-center gap-3 bg-background/50 flex-shrink-0">
          <div />

          <div className="flex items-center gap-3 justify-center">
            <div className="flex items-center justify-center size-8 rounded-lg bg-card border border-border shadow-sm flex-shrink-0">
              <Bell className="size-3.5 text-muted-foreground" />
            </div>
            <div className="text-center">
              <h2 className="text-sm font-bold tracking-wide text-foreground">Bitácora de Eventos</h2>
              <p className="text-[9px] font-semibold tracking-widest text-muted-foreground uppercase">Registro operativo del sistema</p>
            </div>
          </div>

          <div className="relative flex justify-end flex-shrink-0" ref={exportMenuRef}>
            <button
              onClick={() => setExportMenuOpen(o => !o)}
              disabled={filteredEvents.length === 0 || isExporting}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors text-[10.5px] font-semibold text-foreground",
                (filteredEvents.length === 0 || isExporting) && "opacity-50 cursor-not-allowed"
              )}
            >
              <Download className="size-3.5" />
              <span className="hidden sm:inline">{isExporting ? "Generando…" : "Exportar"}</span>
              <ChevronDown className={cn("size-3 transition-transform", exportMenuOpen && "rotate-180")} />
            </button>

            {exportMenuOpen && (
              <div className="absolute right-0 top-[calc(100%+4px)] z-20 w-52 rounded-lg border border-border bg-card shadow-lg overflow-hidden py-1">
                <button
                  onClick={handleExportExcel}
                  className="w-full flex items-start gap-2 px-3 py-2 text-left hover:bg-muted/50 transition-colors"
                >
                  <FileSpreadsheet className="size-3.5 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
                  <span>
                    <span className="block text-[11px] font-semibold text-foreground">Excel (.xlsx)</span>
                    <span className="block text-[9px] text-muted-foreground">Con formato y color por nivel</span>
                  </span>
                </button>
                <button
                  onClick={handleExportCSV}
                  className="w-full flex items-start gap-2 px-3 py-2 text-left hover:bg-muted/50 transition-colors"
                >
                  <FileText className="size-3.5 text-sky-600 dark:text-sky-400 mt-0.5 flex-shrink-0" />
                  <span>
                    <span className="block text-[11px] font-semibold text-foreground">CSV</span>
                    <span className="block text-[9px] text-muted-foreground">Datos crudos, sin formato</span>
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── SUMMARY CARDS ──────────────────────────────────────────────── */}
        <div className="px-4 pt-3 flex flex-col gap-2 flex-shrink-0">
          {/* Contexto del resumen */}
          <div className="flex flex-col gap-0.5 px-1">
            <span className="text-[8px] font-extrabold tracking-[0.15em] uppercase text-muted-foreground/60">Resumen del filtro activo</span>
            <span className="text-[11px] font-bold text-foreground">
              {quickDate === "todos" && "Todos los registros"}
              {quickDate === "hoy" && "Última hora"}
              {quickDate === "24h" && "Últimas 24 horas"}
              {quickDate === "7d" && "Últimos 7 días"}
              {quickDate === "custom" && "Rango personalizado"}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Críticos — pastel rose */}
            <div className="relative overflow-hidden rounded-xl border border-l-4 border-l-rose-300 dark:border-l-rose-300/70 border-rose-200/60 dark:border-rose-300/25 bg-rose-50/60 dark:bg-rose-400/[0.06] pl-5 pr-4 py-3 flex flex-col justify-between min-h-[96px]">
              <div className="flex items-center justify-between">
                <span className="flex items-center justify-center size-9 rounded-lg bg-rose-100 dark:bg-rose-300/15 border border-rose-200 dark:border-rose-300/30">
                  <TriangleAlert className="size-4.5 text-rose-400 dark:text-rose-300" />
                </span>
                <span className="text-3xl font-extrabold font-mono text-rose-400 dark:text-rose-300 leading-none tabular-nums">{criticalCount}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-rose-400/80 dark:text-rose-300/60">Críticos</span>
                <p className="text-[9px] leading-tight text-rose-400/70 dark:text-rose-300/50">
                  {criticalCount === 0 
                    ? "No se registraron eventos críticos durante este período." 
                    : "Eventos críticos detectados que requieren atención."}
                </p>
              </div>
            </div>

            {/* Advertencias — pastel amber */}
            <div className="relative overflow-hidden rounded-xl border border-l-4 border-l-amber-200 dark:border-l-amber-200/70 border-amber-200/60 dark:border-amber-200/25 bg-amber-50/60 dark:bg-amber-200/[0.06] pl-5 pr-4 py-3 flex flex-col justify-between min-h-[96px]">
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center justify-center size-9 rounded-lg bg-amber-100 dark:bg-amber-200/15 border border-amber-200 dark:border-amber-200/30 flex-shrink-0">
                  <BellRing className="size-4.5 text-amber-400 dark:text-amber-200" />
                </span>
                <span className="text-3xl font-extrabold font-mono text-amber-400 dark:text-amber-200 leading-none tabular-nums">{warningCount}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-400/80 dark:text-amber-200/60">Advertencias</span>
                  <WarningSparkline events={filteredEvents} />
                </div>
                <p className="text-[9px] leading-tight text-amber-400/70 dark:text-amber-200/50">
                  Eventos que superaron algún umbral configurado.
                </p>
              </div>
            </div>

            {/* Total — pastel sky */}
            <div className="relative overflow-hidden rounded-xl border border-l-4 border-l-sky-200 dark:border-l-sky-200/70 border-sky-200/60 dark:border-sky-200/25 bg-sky-50/60 dark:bg-sky-200/[0.06] pl-5 pr-4 py-3 flex flex-col justify-between min-h-[96px]">
              <div className="flex items-center justify-between">
                <span className="flex items-center justify-center size-9 rounded-lg bg-sky-100 dark:bg-sky-200/15 border border-sky-200 dark:border-sky-200/30">
                  <Activity className="size-4.5 text-sky-400 dark:text-sky-200" />
                </span>
                <span className="text-3xl font-extrabold font-mono text-foreground leading-none tabular-nums">{filteredEvents.length}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-sky-400/80 dark:text-sky-200/60">Registros de bitácora</span>
                <p className="text-[9px] leading-tight text-sky-400/70 dark:text-sky-200/50">
                  Entradas almacenadas en el historial del sistema.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── FILTER TOOLBAR ─────────────────────────────────────────────── */}
        <div className="px-4 py-2.5 border-b border-border/20 bg-background/15 flex flex-col gap-2 flex-shrink-0">

          {/* Row 1: Search (dominant) + Date quick-filters + Clear link */}
          <div className="flex flex-wrap gap-2 items-center">
            {/* Search — takes most of the row's width */}
            <div className="relative min-w-[220px] flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground/40 pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar por mensaje, sensor u origen…"
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); resetPage() }}
                className="w-full pl-9 pr-3 py-1.5 text-[11px] rounded-lg border border-border/60 bg-background/80 text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-sky-500/30"
              />
            </div>

            {/* Date quick-filters — individual pill buttons */}
            <div className="flex items-center gap-1 flex-shrink-0">
              {DATE_FILTERS.map(f => (
                <button
                  key={f.id}
                  title={f.description}
                  onClick={() => { setQuickDate(f.id); resetPage() }}
                  className={cn(
                    "px-2.5 py-1.5 text-[9.5px] font-bold rounded-lg border transition-all duration-150 tracking-wider whitespace-nowrap",
                    quickDate === f.id
                      ? "bg-sky-50 dark:bg-sky-200/15 border-sky-200 dark:border-sky-200/40 text-sky-400 dark:text-sky-200 shadow-sm"
                      : "border-border/50 text-muted-foreground/70 hover:text-foreground hover:border-border"
                  )}
                >{f.label}</button>
              ))}
            </div>

            {/* Clear all — plain text link, only meaningful once a filter is active */}
            <button
              onClick={clearAllFilters}
              disabled={!hasActiveFilters}
              className={cn(
                "flex items-center gap-1 px-1.5 py-1 text-[10px] font-bold transition-colors duration-150 flex-shrink-0",
                hasActiveFilters
                  ? "text-muted-foreground hover:text-red-600 dark:hover:text-red-400"
                  : "text-muted-foreground/30 cursor-default"
              )}
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

          {/* Row 2: Category chips + Severity chips — merged into a single line */}
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 items-center">
            {/* Category group */}
            <div className="flex flex-wrap gap-1 items-center">
              <span className="text-[8.5px] font-extrabold uppercase tracking-widest text-muted-foreground/45 mr-0.5 flex-shrink-0 flex items-center gap-1">
                <List className="size-2.5" />Categoría
              </span>
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
              {categoryFilter !== "todos" && (
                <button
                  onClick={() => { setCategoryFilter("todos"); resetPage() }}
                  className="ml-0.5 flex items-center gap-0.5 px-1.5 py-0.5 text-[8px] font-bold rounded border border-border/40 text-muted-foreground/60 hover:text-foreground hover:border-border"
                >
                  <X className="size-2.5" />
                </button>
              )}
            </div>

            {/* Divider */}
            <div className="hidden sm:block h-4 w-px bg-border/25" />

            {/* Severity group */}
            <div className="flex flex-wrap gap-1 items-center">
              <span className="text-[8.5px] font-extrabold uppercase tracking-widest text-muted-foreground/45 mr-0.5 flex-shrink-0 flex items-center gap-1">
                <Filter className="size-2.5" />Nivel
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

                  {/* Day separator — solid bar, full width */}
                  <div className="select-none rounded-md bg-card/60 border border-border/30 px-3 py-1.5 mb-1">
                    <span className="text-[9px] font-extrabold uppercase tracking-widest text-muted-foreground/60">
                      {groupKey}
                    </span>
                  </div>

                  {/* Col headers */}
                  <div className="grid grid-cols-12 gap-2 px-3 py-1.5 mb-1 border-b border-border/20 text-[8px] font-extrabold uppercase tracking-widest text-muted-foreground/40">
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
                          <div className="col-span-3 min-w-0">
                            <p className="text-[11px] font-bold font-mono text-foreground leading-none">{timeStr}</p>
                            <p className="text-[9px] font-semibold text-muted-foreground/80 mt-0.5 truncate">{dateStr}</p>
                          </div>

                          {/* 2. Severity badge */}
                          <div className="col-span-2 flex justify-center">
                            <span className={cn("px-1.5 py-0.5 rounded text-[8px] font-bold tracking-wide border whitespace-nowrap", cfg.badge)}>
                              {cfg.label}
                            </span>
                          </div>

                          {/* 3. Origin */}
                          <div className="col-span-1 flex flex-col items-center gap-0.5">
                            <EventIcon msg={event.message} type={event.type} />
                            <span className="text-[8.5px] font-semibold text-foreground/65">
                              {details.orig.charAt(0) + details.orig.slice(1).toLowerCase()}
                            </span>
                          </div>

                          {/* 4. Message */}
                          <div className="col-span-4 pl-2 min-w-0">
                            <p className="text-[11px] font-semibold text-foreground truncate">{details.title}</p>
                            <p className="text-[9px] text-muted-foreground/65 truncate mt-0.5">{details.desc}</p>
                          </div>

                          {/* 5. Status + category */}
                          <div className="col-span-2 flex flex-col items-end gap-0.5 pr-1">
                            <span className={cn("text-[9px] font-extrabold uppercase", cfg.stateColor)}>{cfg.stateLabel}</span>
                            <span className="text-[8px] font-semibold uppercase tracking-wider text-muted-foreground/50">
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