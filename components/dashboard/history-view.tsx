"use client"

import { useState, useRef, useEffect } from "react"
import { Area, AreaChart, ResponsiveContainer, YAxis, XAxis, Tooltip, CartesianGrid } from "recharts"
import { Download, Activity, Clock, Info, ChevronDown, FileSpreadsheet, FileText, FileJson, Layers } from "lucide-react"
import { Panel } from "./panel"
import type { WeatherData } from "@/types/weather"
import { weatherService } from "@/services/weatherService"
import { cn } from "@/lib/utils"
import { THRESHOLDS } from "@/lib/thresholds"

type MetricKey = "temperature" | "humidity" | "pressure" | "rain" | "airQuality"

const METRICS = {
  temperature: { label: "Temperatura", color: "var(--color-temp)", unit: "°C", sensor: "Sensor AHT10" },
  humidity: { label: "Humedad", color: "var(--color-humidity)", unit: "%", sensor: "Sensor AHT10" },
  pressure: { label: "Presión", color: "var(--color-pressure)", unit: "hPa", sensor: "Sensor BMP280" },
  rain: { label: "Lluvia", color: "var(--color-rain)", unit: "%", sensor: "Sensor de lluvia" },
  airQuality: { label: "Calidad del aire", color: "var(--color-altitude)", unit: "ppm", sensor: "Sensor MQ135" },
}

const PERIODS = ["30S", "1M", "5M", "15M", "1H", "6H", "12H", "24H", "7D"]

function getStatus(value: number, metric: MetricKey): { label: string; color: string } {
  if (metric === "temperature") {
    if (value < THRESHOLDS.temperature.min) return { label: "Bajo", color: "text-sky-400" }
    if (value > THRESHOLDS.temperature.max) return { label: "Alto", color: "text-red-400" }
    return { label: "Normal", color: "text-emerald-400" }
  }
  if (metric === "humidity") {
    if (value < THRESHOLDS.humidity.min) return { label: "Bajo", color: "text-sky-400" }
    if (value > THRESHOLDS.humidity.comfortMax) return { label: "Alto", color: "text-red-400" }
    return { label: "Normal", color: "text-emerald-400" }
  }
  if (metric === "pressure") {
    if (value < THRESHOLDS.pressure.min) return { label: "Bajo", color: "text-sky-400" }
    if (value > THRESHOLDS.pressure.max) return { label: "Alto", color: "text-red-400" }
    return { label: "Normal", color: "text-emerald-400" }
  }
  if (metric === "rain") {
    if (value >= THRESHOLDS.rain.detected) return { label: "Alto", color: "text-red-400" }
    return { label: "Normal", color: "text-emerald-400" }
  }
  if (metric === "airQuality") {
    if (value >= THRESHOLDS.airQuality.acceptable) return { label: "Alto", color: "text-red-400" }
    return { label: "Normal", color: "text-emerald-400" }
  }
  return { label: "Normal", color: "text-emerald-400" }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label, metricKey }: any) {
  if (!active || !payload?.length) return null
  const val = payload[0]
  const rawValue = Number(val.value)
  const statusInfo = getStatus(rawValue, metricKey as MetricKey)
  const metricInfo = METRICS[metricKey as MetricKey]
  const todayStr = new Date().toLocaleDateString('es-EC', { day: 'numeric', month: 'short', year: 'numeric' })

  return (
    <div className="rounded-xl border border-border bg-card/95 backdrop-blur-sm px-4 py-3 shadow-lg text-left flex flex-col gap-1.5 min-w-[180px]">
      <div className="flex items-center justify-between border-b border-border/50 pb-1.5">
        <span className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground">
          <Clock className="size-3" /> {label}
        </span>
        <span className="text-[9px] font-semibold text-muted-foreground/60">{todayStr}</span>
      </div>

      <div className="flex flex-col gap-0.5">
        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">{metricInfo.label}</span>
        <span className="text-2xl font-bold tracking-wider font-digital leading-none" style={{ color: val.color }}>
          {rawValue.toFixed(2)} <span className="text-xs font-semibold">{metricInfo.unit}</span>
        </span>
      </div>

      <div className="flex items-center justify-between border-t border-border/30 pt-1.5 text-[9px] font-semibold">
        <span className="text-muted-foreground/75">Origen: <b className="text-foreground">{metricInfo.sensor}</b></span>
        <span className={cn("font-bold uppercase tracking-wider", statusInfo.color)}>{statusInfo.label}</span>
      </div>
    </div>
  )
}

import { calcTrend } from "@/lib/utils"
import type { TrendInfo } from "@/lib/utils"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"

// Estilos proporcionales según intensidad (reutilizado de metric-cards)
function TrendBadge({ trend, color }: { trend: TrendInfo; color: string }) {
  const { direction, intensity } = trend
  const Icon = direction === 'up' ? TrendingUp : direction === 'down' ? TrendingDown : Minus
  const label = direction === 'up' ? 'Subiendo' : direction === 'down' ? 'Bajando' : 'Estable'

  const intensityStyles = {
    none: { opacity: 0.5, iconSize: 'size-3', fontSize: 'text-[9px]', animation: '' },
    slight: { opacity: 0.6, iconSize: 'size-3', fontSize: 'text-[9px]', animation: 'animate-pulse-slow' },
    moderate: { opacity: 0.8, iconSize: 'size-3.5', fontSize: 'text-[9px]', animation: 'animate-pulse' },
    strong: { opacity: 1, iconSize: 'size-4', fontSize: 'text-[10px]', animation: 'animate-pulse' }
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

type RangePreset = "1h" | "today" | "7d" | "30d" | "all" | "custom"

function resolveRange(preset: RangePreset, from: string, to: string): { start: number; end: number } | null {
  const now = Date.now()
  const DAY = 24 * 60 * 60 * 1000
  if (preset === "1h") return { start: now - 60 * 60 * 1000, end: now }
  if (preset === "today") {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return { start: d.getTime(), end: now }
  }
  if (preset === "7d") return { start: now - 7 * DAY, end: now }
  if (preset === "30d") return { start: now - 30 * DAY, end: now }
  if (preset === "all") return { start: 0, end: now }
  // custom
  if (!from || !to) return null
  const start = new Date(from).getTime()
  const end = new Date(to).getTime()
  if (Number.isNaN(start) || Number.isNaN(end) || start > end) return null
  return { start, end }
}

export function HistoryView({ data }: { data: WeatherData }) {
  const [activeMetric, setActiveMetric] = useState<MetricKey>("temperature")
  const [activePeriod, setActivePeriod] = useState("1H")
  const [exportMenuOpen, setExportMenuOpen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const exportMenuRef = useRef<HTMLDivElement>(null)

  // ── Selector de rango obligatorio para el reporte avanzado (evita exportar años de datos de golpe) ──
  const [rangeModalOpen, setRangeModalOpen] = useState(false)
  const [rangePreset, setRangePreset] = useState<RangePreset>("today")
  const [customFrom, setCustomFrom] = useState("")
  const [customTo, setCustomTo] = useState("")

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

  // Carga valores iniciales por defecto para el rango personalizado al seleccionarlo
  useEffect(() => {
    if (rangePreset === "custom" && (!customFrom || !customTo)) {
      const now = new Date()
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      
      const getLocalISOString = (date: Date) => {
        const tzOffset = date.getTimezoneOffset() * 60000
        return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16)
      }
      
      if (!customFrom) setCustomFrom(getLocalISOString(yesterday))
      if (!customTo) setCustomTo(getLocalISOString(now))
    }
  }, [rangePreset, customFrom, customTo])

  const { history, events, ultimaActualizacion } = data

  // Rango resuelto + previsualización de cuántos registros incluiría (para advertir antes de generar)
  const resolvedRange = resolveRange(rangePreset, customFrom, customTo)
  const rangePreviewCount = resolvedRange
    ? history.filter(h => h.timestamp >= resolvedRange.start && h.timestamp <= resolvedRange.end).length
    : 0
  const RANGE_WARNING_THRESHOLD = 20000

  // ── Filter history by selected period ────────────────────────────────────
  let filteredHistory = history
  if (activePeriod === "30S") filteredHistory = history.slice(-30)
  else if (activePeriod === "1M") filteredHistory = history.slice(-60)
  else if (activePeriod === "5M") filteredHistory = history.slice(-300)
  else if (activePeriod === "15M") filteredHistory = history.slice(-900)
  else if (activePeriod === "1H") filteredHistory = history.slice(-3600)
  else if (activePeriod === "6H") filteredHistory = history.slice(-21600)
  else if (activePeriod === "12H") filteredHistory = history.slice(-43200)
  else if (activePeriod === "24H") filteredHistory = history.slice(-86400)
  else if (activePeriod === "7D") filteredHistory = history.slice(-604800)

  const vals = filteredHistory.map(h => h[activeMetric])
  const currentVal = vals[vals.length - 1] || 0
  const minVal = vals.length ? Math.min(...vals) : 0
  const maxVal = vals.length ? Math.max(...vals) : 0
  const avgVal = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0

  // Calculate variation from previous reading
  const prevVal = vals.length > 1 ? vals[vals.length - 2] : currentVal
  const variation = vals.length > 1 ? currentVal - prevVal : 0

  const metricInfo = METRICS[activeMetric]
  const trendDir = calcTrend(filteredHistory, activeMetric, activeMetric === "pressure" ? 0.3 : activeMetric === "airQuality" ? 20 : 0.05)

  // ── Utilidad compartida: nombre de archivo base ─────────────────────────────
  const exportBaseName = `historial_${activeMetric}_${activePeriod}_${new Date().toISOString().slice(0, 10)}`

  // ── CSV Export ────────────────────────────────────────────────────────────
  const handleExportCSV = () => {
    if (filteredHistory.length === 0) return
    const csvRows: string[] = []
    csvRows.push([
      "Fecha/Hora", "Temperatura (°C)", "Humedad (%)", "Presión (hPa)", "Lluvia (%)", "Calidad de Aire (ppm)", `Estado (${metricInfo.label})`,
    ].join(","))
    filteredHistory.forEach(row => {
      const status = getStatus(row[activeMetric], activeMetric)
      csvRows.push([
        `"${row.time}"`,
        row.temperature.toFixed(2),
        row.humidity.toFixed(2),
        row.pressure.toFixed(1),
        row.rain.toFixed(2),
        row.airQuality.toFixed(0),
        `"${status.label}"`,
      ].join(","))
    })
    // BOM al inicio: sin esto Excel interpreta el archivo como ANSI y rompe tildes/ñ
    const blob = new Blob(["\uFEFF" + csvRows.join("\n")], { type: "text/csv;charset=utf-8;" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.setAttribute("hidden", "")
    a.setAttribute("href", url)
    a.setAttribute("download", `${exportBaseName}.csv`)
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
    weatherService.forceEvent(`Exportación CSV realizada (${metricInfo.label} - ${activePeriod})`, "info")
    setExportMenuOpen(false)
  }

  // ── JSON Export ───────────────────────────────────────────────────────────
  const handleExportJSON = () => {
    if (filteredHistory.length === 0) return
    const payload = {
      metrica: metricInfo.label,
      sensor: metricInfo.sensor,
      periodo: activePeriod,
      generadoEl: new Date().toISOString(),
      registros: filteredHistory.length,
      resumen: { actual: currentVal, minimo: minVal, maximo: maxVal, promedio: Number(avgVal.toFixed(2)) },
      datos: filteredHistory.map(row => ({
        time: row.time,
        temperature: row.temperature,
        humidity: row.humidity,
        pressure: row.pressure,
        rain: row.rain,
        airQuality: row.airQuality,
        estado: getStatus(row[activeMetric], activeMetric).label,
      })),
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.setAttribute("hidden", "")
    a.setAttribute("href", url)
    a.setAttribute("download", `${exportBaseName}.json`)
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
    weatherService.forceEvent(`Exportación JSON realizada (${metricInfo.label} - ${activePeriod})`, "info")
    setExportMenuOpen(false)
  }

  // ── Excel Export — archivo .xlsx real, con encabezado, título y color por estado ──
  const handleExportExcel = async () => {
    if (filteredHistory.length === 0) return
    setIsExporting(true)
    try {
      const ExcelJS = (await import("exceljs")).default
      const workbook = new ExcelJS.Workbook()
      workbook.creator = "Estación Meteorológica IoT"
      workbook.created = new Date()

      const headers = [
        "Fecha/Hora", "Temperatura (°C)", "Humedad (%)", "Presión (hPa)", "Lluvia (%)", "Calidad de Aire (ppm)", `Estado (${metricInfo.label})`,
      ]
      const HEADER_ROW = 4

      const sheet = workbook.addWorksheet("Historial", {
        views: [{ state: "frozen", ySplit: HEADER_ROW }],
      })

      // Título principal (fila 1, combinada)
      sheet.mergeCells(1, 1, 1, headers.length)
      const titleCell = sheet.getCell(1, 1)
      titleCell.value = "ESTACIÓN METEOROLÓGICA IoT — HISTORIAL DE MEDICIONES"
      titleCell.font = { bold: true, size: 14, color: { argb: "FFFFFFFF" } }
      titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } }
      titleCell.alignment = { vertical: "middle", horizontal: "center" }
      sheet.getRow(1).height = 26

      // Subtítulo con metadatos (fila 2, combinada)
      sheet.mergeCells(2, 1, 2, headers.length)
      const subCell = sheet.getCell(2, 1)
      subCell.value = `Métrica: ${metricInfo.label}  |  Sensor: ${metricInfo.sensor}  |  Periodo: ${activePeriod}  |  Registros: ${filteredHistory.length}  |  Generado: ${new Date().toLocaleString("es-EC")}`
      subCell.font = { italic: true, size: 10, color: { argb: "FF475569" } }
      subCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } }
      subCell.alignment = { vertical: "middle", horizontal: "center" }
      sheet.getRow(2).height = 18

      // Encabezado de columnas (fila 4): negrita, fondo oscuro, texto blanco
      headers.forEach((h, i) => {
        const cell = sheet.getCell(HEADER_ROW, i + 1)
        cell.value = h
        cell.font = { bold: true, color: { argb: "FFFFFFFF" } }
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } }
        cell.alignment = { vertical: "middle", horizontal: "center" }
        cell.border = { bottom: { style: "thin", color: { argb: "FF334155" } } }
      })
      sheet.getRow(HEADER_ROW).height = 20

      // Colores de relleno/fuente por estado — mismos tonos semánticos del dashboard
      const FILL_BY_STATUS: Record<string, string> = {
        Normal: "FFD1FAE5", // esmeralda muy claro
        Alto:   "FFFEE2E2", // rojo muy claro
        Bajo:   "FFE0F2FE", // celeste muy claro
      }
      const FONT_BY_STATUS: Record<string, string> = {
        Normal: "FF065F46",
        Alto:   "FF991B1B",
        Bajo:   "FF075985",
      }

      // Filas de datos
      let rowIdx = HEADER_ROW + 1
      filteredHistory.forEach(row => {
        const status = getStatus(row[activeMetric], activeMetric)
        const values = [
          row.time,
          Number(row.temperature.toFixed(2)),
          Number(row.humidity.toFixed(2)),
          Number(row.pressure.toFixed(1)),
          Number(row.rain.toFixed(2)),
          Number(row.airQuality.toFixed(0)),
          status.label,
        ]
        values.forEach((v, i) => {
          const cell = sheet.getCell(rowIdx, i + 1)
          cell.value = v
          cell.alignment = { vertical: "middle", horizontal: i === 0 ? "left" : "center" }
          cell.border = { bottom: { style: "hair", color: { argb: "FFE2E8F0" } } }
        })
        const statusCell = sheet.getCell(rowIdx, headers.length)
        statusCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: FILL_BY_STATUS[status.label] ?? "FFF1F5F9" } }
        statusCell.font = { bold: true, color: { argb: FONT_BY_STATUS[status.label] ?? "FF475569" } }
        rowIdx++
      })

      sheet.autoFilter = {
        from: { row: HEADER_ROW, column: 1 },
        to: { row: HEADER_ROW, column: headers.length },
      }

      // Anchos de columna
      const widths = [22, 16, 14, 16, 12, 18, 18]
      widths.forEach((w, i) => { sheet.getColumn(i + 1).width = w })

      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.setAttribute("hidden", "")
      a.setAttribute("href", url)
      a.setAttribute("download", `${exportBaseName}.xlsx`)
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      weatherService.forceEvent(`Exportación Excel realizada (${metricInfo.label} - ${activePeriod})`, "info")
    } finally {
      setIsExporting(false)
      setExportMenuOpen(false)
    }
  }

  // ── Excel Avanzado — reporte completo dentro de un RANGO obligatorio ────────
  // Trae TODAS las métricas del periodo elegido (no depende del filtro de arriba),
  // pero SIEMPRE acotado a un rango de tiempo para no intentar volcar años de datos de una sola vez.
  const handleExportFullExcel = async (range: { start: number; end: number }) => {
    const scopedHistory = history.filter(h => h.timestamp >= range.start && h.timestamp <= range.end)
    const scopedEvents = events.filter(ev => ev.timestamp === undefined || (ev.timestamp >= range.start && ev.timestamp <= range.end))
    if (scopedHistory.length === 0) return
    setIsExporting(true)
    try {
      const ExcelJS = (await import("exceljs")).default
      const workbook = new ExcelJS.Workbook()
      workbook.creator = "Estación Meteorológica IoT"
      workbook.created = new Date()

      const FILL_BY_STATUS: Record<string, string> = {
        Normal: "FFD1FAE5",
        Alto:   "FFFEE2E2",
        Bajo:   "FFE0F2FE",
      }
      const FONT_BY_STATUS: Record<string, string> = {
        Normal: "FF065F46",
        Alto:   "FF991B1B",
        Bajo:   "FF075985",
      }
      const FILL_BY_TYPE: Record<string, string> = {
        alert: "FFFEE2E2", warning: "FFFEF3C7", success: "FFD1FAE5", info: "FFE0F2FE",
      }
      const FONT_BY_TYPE: Record<string, string> = {
        alert: "FF991B1B", warning: "FF92400E", success: "FF065F46", info: "FF075985",
      }

      const stampNow = new Date().toLocaleString("es-EC")
      const rangeLabel = `${new Date(range.start).toLocaleString("es-EC")} — ${new Date(range.end).toLocaleString("es-EC")}`
      const metricKeys = Object.keys(METRICS) as MetricKey[]

      // Encabezado de título reutilizable para cada hoja
      function drawTitleBlock(sheet: any, subtitle: string, colSpan: number) {
        sheet.mergeCells(1, 1, 1, colSpan)
        const t = sheet.getCell(1, 1)
        t.value = "ESTACIÓN METEOROLÓGICA IoT — REPORTE COMPLETO"
        t.font = { bold: true, size: 14, color: { argb: "FFFFFFFF" } }
        t.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } }
        t.alignment = { vertical: "middle", horizontal: "center" }
        sheet.getRow(1).height = 26

        sheet.mergeCells(2, 1, 2, colSpan)
        const s = sheet.getCell(2, 1)
        s.value = subtitle
        s.font = { italic: true, size: 10, color: { argb: "FF475569" } }
        s.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } }
        s.alignment = { vertical: "middle", horizontal: "center" }
        sheet.getRow(2).height = 18

        sheet.mergeCells(3, 1, 3, colSpan)
        const r = sheet.getCell(3, 1)
        r.value = `Rango exportado: ${rangeLabel}`
        r.font = { bold: true, size: 9, color: { argb: "FF334155" } }
        r.alignment = { vertical: "middle", horizontal: "center" }
        sheet.getRow(3).height = 16
      }

      // ─── HOJA 1: RESUMEN GENERAL (todas las métricas, dentro del rango) ───
      const wsSummary = workbook.addWorksheet("Resumen General")
      drawTitleBlock(wsSummary, `Registros en el rango: ${scopedHistory.length}  |  Eventos en el rango: ${scopedEvents.length}  |  Última actualización: ${ultimaActualizacion}  |  Generado: ${stampNow}`, 6)

      const summaryHeaders = ["Métrica", "Sensor", "Actual", "Mínimo", "Máximo", "Promedio"]
      summaryHeaders.forEach((h, i) => {
        const cell = wsSummary.getCell(5, i + 1)
        cell.value = h
        cell.font = { bold: true, color: { argb: "FFFFFFFF" } }
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } }
        cell.alignment = { vertical: "middle", horizontal: "center" }
      })
      wsSummary.getRow(5).height = 20

      metricKeys.forEach((key, i) => {
        const info = METRICS[key]
        const vals = scopedHistory.map(h => h[key])
        const current = vals[vals.length - 1] ?? 0
        const min = vals.length ? Math.min(...vals) : 0
        const max = vals.length ? Math.max(...vals) : 0
        const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0
        const rowIdx = 6 + i
        const rowValues = [info.label, info.sensor, `${current.toFixed(2)} ${info.unit}`, `${min.toFixed(2)} ${info.unit}`, `${max.toFixed(2)} ${info.unit}`, `${avg.toFixed(2)} ${info.unit}`]
        rowValues.forEach((v, c) => {
          const cell = wsSummary.getCell(rowIdx, c + 1)
          cell.value = v
          cell.alignment = { vertical: "middle", horizontal: c < 2 ? "left" : "center" }
          cell.border = { bottom: { style: "hair", color: { argb: "FFE2E8F0" } } }
        })
      })
      wsSummary.columns = [{ width: 22 }, { width: 20 }, { width: 16 }, { width: 16 }, { width: 16 }, { width: 16 }]

      // ─── HOJA 2: HISTORIAL DEL RANGO (todas las métricas + estado de cada una) ───
      const wsHistory = workbook.addWorksheet("Historial", { views: [{ state: "frozen", ySplit: 5 }] })
      drawTitleBlock(wsHistory, `Registros del rango seleccionado  |  Total: ${scopedHistory.length}  |  Generado: ${stampNow}`, 11)

      const fullHeaders = [
        "Fecha/Hora",
        "Temperatura (°C)", "Estado Temp.",
        "Humedad (%)", "Estado Hum.",
        "Presión (hPa)", "Estado Presión",
        "Lluvia (%)", "Estado Lluvia",
        "Calidad de Aire (ppm)", "Estado Aire",
      ]
      fullHeaders.forEach((h, i) => {
        const cell = wsHistory.getCell(5, i + 1)
        cell.value = h
        cell.font = { bold: true, color: { argb: "FFFFFFFF" } }
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } }
        cell.alignment = { vertical: "middle", horizontal: "center" }
        cell.border = { bottom: { style: "thin", color: { argb: "FF334155" } } }
      })
      wsHistory.getRow(5).height = 20

      let hRow = 6
      scopedHistory.forEach(row => {
        const cells = [
          row.time,
          Number(row.temperature.toFixed(2)), getStatus(row.temperature, "temperature").label,
          Number(row.humidity.toFixed(2)), getStatus(row.humidity, "humidity").label,
          Number(row.pressure.toFixed(1)), getStatus(row.pressure, "pressure").label,
          Number(row.rain.toFixed(2)), getStatus(row.rain, "rain").label,
          Number(row.airQuality.toFixed(0)), getStatus(row.airQuality, "airQuality").label,
        ]
        cells.forEach((v, i) => {
          const cell = wsHistory.getCell(hRow, i + 1)
          cell.value = v
          cell.alignment = { vertical: "middle", horizontal: i === 0 ? "left" : "center" }
          cell.border = { bottom: { style: "hair", color: { argb: "FFE2E8F0" } } }
          // Columnas de estado: 3, 5, 7, 9, 11 (1-based)
          if ([3, 5, 7, 9, 11].includes(i + 1)) {
            const label = String(v)
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: FILL_BY_STATUS[label] ?? "FFF1F5F9" } }
            cell.font = { bold: true, color: { argb: FONT_BY_STATUS[label] ?? "FF475569" } }
          }
        })
        hRow++
      })
      wsHistory.autoFilter = { from: { row: 5, column: 1 }, to: { row: 5, column: fullHeaders.length } }
      wsHistory.columns = [
        { width: 22 }, { width: 15 }, { width: 13 }, { width: 12 }, { width: 12 },
        { width: 13 }, { width: 14 }, { width: 11 }, { width: 13 }, { width: 18 }, { width: 12 },
      ]

      // ─── HOJA 3: BITÁCORA DE EVENTOS DEL RANGO ───
      const wsEvents = workbook.addWorksheet("Bitácora Eventos", { views: [{ state: "frozen", ySplit: 5 }] })
      drawTitleBlock(wsEvents, `Eventos en el rango: ${scopedEvents.length}  |  Generado: ${stampNow}`, 4)

      const eventHeaders = ["ID", "Hora", "Tipo", "Mensaje"]
      eventHeaders.forEach((h, i) => {
        const cell = wsEvents.getCell(5, i + 1)
        cell.value = h
        cell.font = { bold: true, color: { argb: "FFFFFFFF" } }
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } }
        cell.alignment = { vertical: "middle", horizontal: "center" }
        cell.border = { bottom: { style: "thin", color: { argb: "FF334155" } } }
      })
      wsEvents.getRow(5).height = 20

      if (scopedEvents.length === 0) {
        wsEvents.mergeCells(6, 1, 6, 4)
        const cell = wsEvents.getCell(6, 1)
        cell.value = "No se registraron eventos en este rango."
        cell.alignment = { vertical: "middle", horizontal: "center" }
        cell.font = { italic: true, color: { argb: "FF94A3B8" } }
      } else {
        let eRow = 6
        scopedEvents.forEach(ev => {
          const rowVals = [ev.id, ev.time, ev.type.toUpperCase(), ev.message]
          rowVals.forEach((v, i) => {
            const cell = wsEvents.getCell(eRow, i + 1)
            cell.value = v
            cell.alignment = { vertical: "middle", horizontal: i === 2 ? "center" : "left" }
            cell.border = { bottom: { style: "hair", color: { argb: "FFE2E8F0" } } }
          })
          const typeCell = wsEvents.getCell(eRow, 3)
          typeCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: FILL_BY_TYPE[ev.type] ?? "FFF1F5F9" } }
          typeCell.font = { bold: true, color: { argb: FONT_BY_TYPE[ev.type] ?? "FF475569" } }
          eRow++
        })
      }
      wsEvents.autoFilter = { from: { row: 5, column: 1 }, to: { row: 5, column: eventHeaders.length } }
      wsEvents.columns = [{ width: 12 }, { width: 14 }, { width: 14 }, { width: 60 }]

      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.setAttribute("hidden", "")
      a.setAttribute("href", url)
      const fromStr = new Date(range.start).toISOString().slice(0, 10)
      const toStr = new Date(range.end).toISOString().slice(0, 10)
      a.setAttribute("download", `reporte_completo_estacion_${fromStr}_a_${toStr}.xlsx`)
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      weatherService.forceEvent(`Exportación Excel completa realizada (${scopedHistory.length} registros, ${scopedEvents.length} eventos, rango: ${rangeLabel})`, "info")
    } finally {
      setIsExporting(false)
      setExportMenuOpen(false)
      setRangeModalOpen(false)
    }
  }

  return (
    <div className="h-full flex flex-col min-h-0">
      <Panel className="flex-1 min-h-0 flex flex-col p-0 overflow-hidden relative">

        {/* ── TOP BAR ─────────────────────────────────────────────────────── */}
        <div className="px-5 py-4 border-b border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-background/50">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-10 rounded-xl bg-card border border-border shadow-sm">
              <Activity className="size-5 text-muted-foreground" />
            </div>
            <div>
              <h2 className="text-lg font-bold leading-tight tracking-wide text-foreground">Historial de mediciones</h2>
              <p className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">{metricInfo.sensor}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-auto">
            {/* Period selector */}
            <div className="flex p-0.5 rounded-lg bg-card/50 border border-border">
              {PERIODS.map(p => (
                <button
                  key={p}
                  onClick={() => setActivePeriod(p)}
                  className={cn(
                    "px-2.5 py-1 text-[9px] font-bold rounded-md transition-colors",
                    activePeriod === p
                      ? "bg-background shadow-sm text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >{p}</button>
              ))}
            </div>

            {/* Export dropdown */}
            <div className="relative flex-shrink-0" ref={exportMenuRef}>
              <button
                onClick={() => setExportMenuOpen(o => !o)}
                disabled={(filteredHistory.length === 0 && history.length === 0) || isExporting}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors text-xs font-semibold text-foreground",
                  ((filteredHistory.length === 0 && history.length === 0) || isExporting) && "opacity-50 cursor-not-allowed"
                )}
              >
                <Download className="size-3.5" />
                <span className="hidden sm:inline">{isExporting ? "Generando…" : "Exportar"}</span>
                <ChevronDown className={cn("size-3 transition-transform", exportMenuOpen && "rotate-180")} />
              </button>

              {exportMenuOpen && (
                <div className="absolute right-0 top-[calc(100%+4px)] z-20 w-64 rounded-lg border border-border bg-card shadow-lg overflow-hidden py-1">
                  <div className="px-3 pt-2 pb-1 text-[8px] font-extrabold uppercase tracking-widest text-muted-foreground/50">
                    Vista actual ({metricInfo.label} · {activePeriod})
                  </div>
                  <button
                    onClick={handleExportExcel}
                    disabled={filteredHistory.length === 0}
                    className={cn(
                      "w-full flex items-start gap-2 px-3 py-2 text-left hover:bg-muted/50 transition-colors",
                      filteredHistory.length === 0 && "opacity-40 cursor-not-allowed pointer-events-none"
                    )}
                  >
                    <FileSpreadsheet className="size-3.5 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
                    <span>
                      <span className="block text-[11px] font-semibold text-foreground">Excel (.xlsx)</span>
                      <span className="block text-[9px] text-muted-foreground">Con formato y color por estado</span>
                    </span>
                  </button>
                  <button
                    onClick={handleExportCSV}
                    disabled={filteredHistory.length === 0}
                    className={cn(
                      "w-full flex items-start gap-2 px-3 py-2 text-left hover:bg-muted/50 transition-colors",
                      filteredHistory.length === 0 && "opacity-40 cursor-not-allowed pointer-events-none"
                    )}
                  >
                    <FileText className="size-3.5 text-sky-600 dark:text-sky-400 mt-0.5 flex-shrink-0" />
                    <span>
                      <span className="block text-[11px] font-semibold text-foreground">CSV</span>
                      <span className="block text-[9px] text-muted-foreground">Datos crudos, sin formato</span>
                    </span>
                  </button>
                  <button
                    onClick={handleExportJSON}
                    disabled={filteredHistory.length === 0}
                    className={cn(
                      "w-full flex items-start gap-2 px-3 py-2 text-left hover:bg-muted/50 transition-colors",
                      filteredHistory.length === 0 && "opacity-40 cursor-not-allowed pointer-events-none"
                    )}
                  >
                    <FileJson className="size-3.5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                    <span>
                      <span className="block text-[11px] font-semibold text-foreground">JSON</span>
                      <span className="block text-[9px] text-muted-foreground">Para integraciones o scripts</span>
                    </span>
                  </button>

                  <div className="mt-1 border-t border-border/60" />
                  <div className="px-3 pt-2 pb-1 text-[8px] font-extrabold uppercase tracking-widest text-muted-foreground/50">
                    Reporte completo (sin filtros)
                  </div>
                  <button
                    onClick={() => { setExportMenuOpen(false); setRangeModalOpen(true) }}
                    disabled={history.length === 0}
                    className={cn(
                      "w-full flex items-start gap-2 px-3 py-2 text-left hover:bg-muted/50 transition-colors",
                      history.length === 0 && "opacity-40 cursor-not-allowed pointer-events-none"
                    )}
                  >
                    <Layers className="size-3.5 text-violet-600 dark:text-violet-400 mt-0.5 flex-shrink-0" />
                    <span>
                      <span className="block text-[11px] font-semibold text-foreground">Excel avanzado — Todo</span>
                      <span className="block text-[9px] text-muted-foreground">Todas las métricas y eventos · elegís el rango</span>
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── METRICS SELECTOR & STAT BOXES ───────────────────────────────── */}
        <div className="px-5 py-3 border-b border-border/30 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5 items-center">
            {(Object.keys(METRICS) as MetricKey[]).map(key => {
              const isActive = activeMetric === key
              return (
                <button
                  key={key}
                  onClick={() => setActiveMetric(key)}
                  className={cn(
                    "px-4 py-1.5 text-xs font-bold rounded-full transition-all duration-300 border",
                    isActive
                      ? "border-transparent shadow-sm"
                      : "border-border bg-card/40 text-muted-foreground hover:bg-card hover:text-foreground"
                  )}
                  style={isActive ? {
                    color: METRICS[key].color,
                    backgroundColor: `color-mix(in srgb, ${METRICS[key].color} 15%, transparent)`,
                  } : {}}
                >{METRICS[key].label}</button>
              )
            })}
          </div>

          <div className="flex items-center gap-6 overflow-x-auto scrollbar-hide pb-1 lg:pb-0">
            <div className="flex flex-col">
              <span className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider">Tendencia</span>
              <div className="mt-1 flex items-center gap-1 bg-muted/20 px-2 py-0.5 rounded border border-border/10">
                <TrendBadge trend={trendDir} color={metricInfo.color} />
              </div>
            </div>
            <StatBox label="Actual" value={currentVal} unit={metricInfo.unit} color={metricInfo.color} />
            <StatBox label="Variación" value={variation} unit={metricInfo.unit} color={variation > 0 ? "text-red-400" : variation < 0 ? "text-emerald-400" : "text-muted-foreground"} showPlus={true} />
            <StatBox label="Mínimo" value={minVal} unit={metricInfo.unit} />
            <StatBox label="Máximo" value={maxVal} unit={metricInfo.unit} />
            <StatBox label="Promedio" value={avgVal} unit={metricInfo.unit} />
            <div className="flex flex-col pl-5 border-l border-border/50">
              <span className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider">Última act.</span>
              <span className="text-xs font-bold text-foreground mt-0.5">{ultimaActualizacion}</span>
            </div>
          </div>
        </div>

        {/* ── CHART / EMPTY STATE ─────────────────────────────────────────── */}
        <div className="flex-1 min-h-[300px] w-full pt-5 pr-6 pb-2 pl-0 flex flex-col justify-center">
          {filteredHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-10 text-center mx-auto max-w-md">
              <div className="flex items-center justify-center size-14 rounded-2xl bg-card border border-border shadow-md text-muted-foreground/30">
                <Info className="size-8" />
              </div>
              <div className="flex flex-col gap-1">
                <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">Sin lecturas históricas</h3>
                <p className="text-xs text-muted-foreground max-w-[85%] mx-auto leading-relaxed">
                  No hay datos registrados en el intervalo seleccionado ({activePeriod}). Los datos se generarán a medida que el sistema reciba telemetría.
                </p>
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={filteredHistory} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id={`gradient-hist-${activeMetric}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={metricInfo.color} stopOpacity={0.6} />
                    <stop offset="100%" stopColor={metricInfo.color} stopOpacity={0.0} />
                  </linearGradient>
                  <filter id={`glow-hist-${activeMetric}`} x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="4" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" strokeOpacity={0.4} />
                <XAxis
                  dataKey="time"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "var(--color-muted-foreground)", fontWeight: 500 }}
                  tickMargin={10}
                  interval="preserveStartEnd"
                />
                <YAxis
                  domain={[
                    `dataMin - ${activeMetric === "airQuality" ? 50 : activeMetric === "pressure" ? 1 : 2}`,
                    `dataMax + ${activeMetric === "airQuality" ? 50 : activeMetric === "pressure" ? 1 : 2}`,
                  ]}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "var(--color-muted-foreground)", fontWeight: 500 }}
                  tickMargin={10}
                  tickFormatter={v => v.toFixed(1)}
                />
                <Tooltip content={<CustomTooltip metricKey={activeMetric} />} cursor={{ stroke: metricInfo.color, strokeWidth: 1, strokeDasharray: "4 4" }} />
                <Area
                  type="monotone"
                  dataKey={activeMetric}
                  stroke={metricInfo.color}
                  strokeWidth={2.5}
                  fill={`url(#gradient-hist-${activeMetric})`}
                  isAnimationActive={false}
                  filter={`url(#glow-hist-${activeMetric})`}
                  activeDot={{ r: 5, fill: metricInfo.color, stroke: "var(--color-background)", strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </Panel>

      {/* ── MODAL: Selección de rango obligatoria para el reporte avanzado ─────── */}
      {rangeModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          onClick={() => setRangeModalOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-xl border border-border bg-card shadow-2xl p-5"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 mb-1">
              <Layers className="size-4 text-violet-600 dark:text-violet-400" />
              <h3 className="text-sm font-bold text-foreground">Selecciona un rango de tiempo</h3>
            </div>
            <p className="text-[10.5px] text-muted-foreground mb-4 leading-relaxed">
              El reporte avanzado exporta todas las métricas y eventos. Elegir un rango es obligatorio
              para evitar generar archivos enormes si la estación lleva mucho tiempo operando.
            </p>

            {/* Presets */}
            <div className="grid grid-cols-2 gap-1.5 mb-3">
              {([
                { id: "1h",     label: "Última hora" },
                { id: "today",  label: "Hoy" },
                { id: "7d",     label: "Últimos 7 días" },
                { id: "30d",    label: "Últimos 30 días" },
                { id: "all",    label: "Todo lo disponible" },
                { id: "custom", label: "Personalizado" },
              ] as { id: RangePreset; label: string }[]).map(p => (
                <button
                  key={p.id}
                  onClick={() => setRangePreset(p.id)}
                  className={cn(
                    "px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold transition-colors text-left",
                    rangePreset === p.id
                      ? "border-violet-500/50 bg-violet-500/10 text-violet-700 dark:text-violet-300"
                      : "border-border bg-background/50 text-muted-foreground hover:text-foreground hover:border-border/80"
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {rangePreset === "all" && (
              <div className="mb-3 flex items-start gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-2 text-[10px] text-amber-700 dark:text-amber-400">
                <Info className="size-3.5 flex-shrink-0 mt-0.5" />
                <span>Puede generar un archivo muy grande si la estación lleva mucho tiempo operando.</span>
              </div>
            )}

            {rangePreset === "custom" && (
              <>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <label className="flex flex-col gap-1">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Desde</span>
                    <input
                      type="datetime-local"
                      value={customFrom}
                      onChange={e => setCustomFrom(e.target.value)}
                      className="rounded-lg border border-border bg-background px-2 py-1.5 text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-violet-500/40"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Hasta</span>
                    <input
                      type="datetime-local"
                      value={customTo}
                      onChange={e => setCustomTo(e.target.value)}
                      className="rounded-lg border border-border bg-background px-2 py-1.5 text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-violet-500/40"
                    />
                  </label>
                </div>
                {history.length > 0 && (
                  <div className="text-[9.5px] text-muted-foreground/80 mb-3 bg-muted/20 px-2 py-1 rounded border border-border/30">
                    <strong>Registros disponibles:</strong> de {new Date(history[0].timestamp).toLocaleString("es-EC")} a {new Date(history[history.length - 1].timestamp).toLocaleString("es-EC")}
                  </div>
                )}
              </>
            )}

            {/* Previsualización de cantidad de registros y mensajes explicativos */}
            {(() => {
              let validationMessage = ""
              let isError = false
              
              if (rangePreset === "custom") {
                if (!customFrom && !customTo) {
                  validationMessage = "Por favor, selecciona las fechas y horas de inicio y fin."
                  isError = true
                } else if (!customFrom) {
                  validationMessage = "Falta ingresar la fecha de inicio ('Desde')."
                  isError = true
                } else if (!customTo) {
                  validationMessage = "Falta ingresar la fecha de fin ('Hasta')."
                  isError = true
                } else {
                  const start = new Date(customFrom).getTime()
                  const end = new Date(customTo).getTime()
                  if (Number.isNaN(start) || Number.isNaN(end)) {
                    validationMessage = "Alguna de las fechas ingresadas no es válida."
                    isError = true
                  } else if (start > end) {
                    validationMessage = "La fecha de inicio ('Desde') no puede ser posterior a la fecha de fin ('Hasta')."
                    isError = true
                  }
                }
              }

              const hasError = isError || resolvedRange === null || rangePreviewCount === 0

              return (
                <div className={cn(
                  "mb-4 rounded-lg border px-2.5 py-2 text-[10.5px] font-semibold flex items-start gap-1.5 leading-relaxed",
                  hasError
                    ? "border-red-500/30 bg-red-500/5 text-red-600 dark:text-red-400"
                    : rangePreviewCount > RANGE_WARNING_THRESHOLD
                    ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                    : "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                )}>
                  <Info className="size-3.5 flex-shrink-0 mt-0.5" />
                  <div>
                    {hasError ? (
                      <span>
                        <strong>Generación bloqueada:</strong> {validationMessage || (rangePreviewCount === 0 ? "No hay registros en el rango seleccionado. Intenta ampliando las fechas." : "Completá las fechas para ver cuántos registros incluye.")}
                      </span>
                    ) : rangePreviewCount > RANGE_WARNING_THRESHOLD ? (
                      <span>
                        <strong>¡Atención!</strong> Se generarán {rangePreviewCount.toLocaleString("es-EC")} registros. Al ser un volumen alto, la descarga podría demorar unos segundos.
                      </span>
                    ) : (
                      <span>
                        Listo para generar: <strong>{rangePreviewCount.toLocaleString("es-EC")} registros</strong> disponibles en este rango.
                      </span>
                    )}
                  </div>
                </div>
              )
            })()}

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setRangeModalOpen(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => resolvedRange && handleExportFullExcel(resolvedRange)}
                disabled={!resolvedRange || rangePreviewCount === 0 || isExporting}
                className={cn(
                  "flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-violet-600 hover:bg-violet-700 transition-colors",
                  (!resolvedRange || rangePreviewCount === 0 || isExporting) && "opacity-40 cursor-not-allowed"
                )}
              >
                <FileSpreadsheet className="size-3.5" />
                {isExporting ? "Generando…" : "Generar Excel"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StatBox({ label, value, unit, color, showPlus = false }: { label: string; value: number; unit: string; color?: string; showPlus?: boolean }) {
  const sign = showPlus && value > 0 ? "+" : ""
  return (
    <div className="flex flex-col">
      <span className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
      <div className="flex items-baseline gap-0.5 mt-0.5">
        <span
          className={cn("text-lg font-bold font-digital tracking-wide", color || "text-foreground")}
        >{sign}{value.toFixed(2)}</span>
        <span className="text-[9px] font-bold text-muted-foreground">{unit}</span>
      </div>
    </div>
  )
}