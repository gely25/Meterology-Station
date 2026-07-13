import { WeatherData } from "../types/weather";
import { THRESHOLDS } from "./thresholds";
import pkg from "../package.json";

// ─── Helpers de estado (mismo criterio que Historial — SIN CAMBIOS) ───
function statusOf(value: number, metric: "temperature" | "humidity" | "pressure" | "rain" | "airQuality"): string {
  if (metric === "temperature") {
    if (value < THRESHOLDS.temperature.min) return "Bajo";
    if (value > THRESHOLDS.temperature.max) return "Alto";
    return "Normal";
  }
  if (metric === "humidity") {
    if (value < THRESHOLDS.humidity.min) return "Bajo";
    if (value > THRESHOLDS.humidity.comfortMax) return "Alto";
    return "Normal";
  }
  if (metric === "pressure") {
    if (value < THRESHOLDS.pressure.min) return "Bajo";
    if (value > THRESHOLDS.pressure.max) return "Alto";
    return "Normal";
  }
  if (metric === "rain") {
    return value >= THRESHOLDS.rain.detected ? "Alto" : "Normal";
  }
  // airQuality
  if (value >= THRESHOLDS.airQuality.bad) return "Alto";
  if (value < THRESHOLDS.airQuality.excellent) return "Normal";
  return "Normal";
}

const FILL_BY_STATUS: Record<string, string> = {
  Normal: "FFD1FAE5",
  Alto: "FFFEE2E2",
  Bajo: "FFE0F2FE",
};
const FONT_BY_STATUS: Record<string, string> = {
  Normal: "FF065F46",
  Alto: "FF991B1B",
  Bajo: "FF075985",
};
const FILL_BY_TYPE: Record<string, string> = {
  alert: "FFFEE2E2", warning: "FFFEF3C7", success: "FFD1FAE5", info: "FFE0F2FE",
};
const FONT_BY_TYPE: Record<string, string> = {
  alert: "FF991B1B", warning: "FF92400E", success: "FF065F46", info: "FF075985",
};
const LABEL_BY_TYPE: Record<string, string> = {
  alert: "Crítico", warning: "Advertencia", success: "Correcto", info: "Informativo",
};

// Mapa de etiqueta legible (como llega desde la UI) -> clave interna del sensor
const SENSOR_LABEL_TO_KEY: Record<string, "temperature" | "humidity" | "pressure" | "rain" | "airQuality"> = {
  "Temperatura": "temperature",
  "Humedad": "humidity",
  "Presión": "pressure",
  "Lluvia": "rain",
  "Calidad del Aire": "airQuality",
};

// ─── Identidad visual uniforme del informe ───
const BRAND = {
  dark: "FF0F172A",      // banner principal
  darkAlt: "FF1E293B",   // encabezados de tabla
  subtle: "FFF1F5F9",    // etiquetas / fondos suaves
  band: "FFF8FAFC",      // bandas alternadas
  border: "FFE2E8F0",    // bordes suaves
  fontName: "Calibri",
};

function applyDefaultFont(sheet: any) {
  sheet.eachRow((row: any) => {
    row.eachCell({ includeEmpty: false }, (cell: any) => {
      cell.font = { name: BRAND.fontName, ...(cell.font ?? {}) };
    });
  });
}

function autoWidth(sheet: any, colCount: number, minW = 10, maxW = 42) {
  for (let c = 1; c <= colCount; c++) {
    let max = minW;
    sheet.getColumn(c).eachCell({ includeEmpty: false }, (cell: any) => {
      const len = cell.value ? String(cell.value).length : 0;
      if (len + 2 > max) max = Math.min(len + 2, maxW);
    });
    sheet.getColumn(c).width = max;
  }
}

function drawTitleBlock(sheet: any, title: string, subtitle: string, colSpan: number, big = false) {
  sheet.mergeCells(1, 1, 1, colSpan);
  const t = sheet.getCell(1, 1);
  t.value = title;
  t.font = { name: BRAND.fontName, bold: true, size: big ? 18 : 14, color: { argb: "FFFFFFFF" } };
  t.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND.dark } };
  t.alignment = { vertical: "middle", horizontal: "center" };
  sheet.getRow(1).height = big ? 34 : 26;

  sheet.mergeCells(2, 1, 2, colSpan);
  const s = sheet.getCell(2, 1);
  s.value = subtitle;
  s.font = { name: BRAND.fontName, italic: true, size: 10, color: { argb: "FF475569" } };
  s.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND.subtle } };
  s.alignment = { vertical: "middle", horizontal: "center" };
  sheet.getRow(2).height = 18;
}

// ─── Clasificación de las conclusiones ya generadas por el motor de análisis ───
// (No recalcula ni reinterpreta datos: solo agrupa el mismo texto que ya produce runEnvironmentalAnalysis)
function classifyConclusions(conclusions: string[]) {
  const hallazgos: string[] = [];
  const correlaciones: string[] = [];
  const estadisticas: string[] = [];

  conclusions.forEach(c => {
    const l = c.toLowerCase();
    if (l.includes("antes de") || l.includes("previa a") || l.includes("previo a")) {
      correlaciones.push(c);
    } else if (l.includes("%") || l.includes("permaneció") || l.includes("fluctuó") || l.includes("mantuvo") || l.includes("nivel excelente")) {
      estadisticas.push(c);
    } else {
      hallazgos.push(c);
    }
  });

  return { hallazgos, correlaciones, estadisticas };
}

// ─── Tabla de indicadores: agrega (min/prom/máx) los mismos valores ya usados en Historial ───
const INDICATOR_META: Record<string, { label: string; unit: string; decimals: number }> = {
  temperature: { label: "Temperatura", unit: "°C", decimals: 2 },
  humidity: { label: "Humedad", unit: "%", decimals: 2 },
  pressure: { label: "Presión", unit: "hPa", decimals: 2 },
  rain: { label: "Lluvia", unit: "%", decimals: 1 },
  airQuality: { label: "Calidad del aire", unit: "ppm", decimals: 0 },
};

function computeIndicators(history: WeatherData["history"], activeCols: (keyof typeof SENSOR_COLUMNS)[]) {
  return activeCols.map(k => {
    const values = history.map(h => (k === "rain" ? h.rain * 10 : (h as any)[k] as number));
    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const meta = INDICATOR_META[k];
    return { key: k, ...meta, min, avg, max, status: statusOf(avg, k) };
  });
}

// ─── Estado general del período: agregación directa de los estados ya calculados por fila (Historial) + eventos críticos ───
// También arma el "motivo de la clasificación" a partir de los mismos conteos, sin introducir datos nuevos.
function computeOverallStatus(
  history: WeatherData["history"],
  activeCols: (keyof typeof SENSOR_COLUMNS)[],
  events: WeatherData["events"],
  indicators: ReturnType<typeof computeIndicators>
) {
  let anomalous = 0;
  let total = 0;
  history.forEach(row => {
    activeCols.forEach(k => {
      const raw = k === "rain" ? row.rain * 10 : (row as any)[k];
      total++;
      if (statusOf(raw, k) !== "Normal") anomalous++;
    });
  });
  const ratio = total > 0 ? anomalous / total : 0;
  const anomalousPct = Math.round(ratio * 100);
  const criticalEvents = events.filter(e => e.type === "alert").length;
  const warningEvents = events.filter(e => e.type === "warning").length;

  let classification: { label: string; fill: string; font: string };
  if (ratio > 0.20 || criticalEvents >= 3) {
    classification = { label: "Crítico", fill: "FFFEE2E2", font: "FF991B1B" };
  } else if (ratio > 0.05 || criticalEvents >= 1) {
    classification = { label: "Advertencia", fill: "FFFEF3C7", font: "FF92400E" };
  } else {
    classification = { label: "Estable", fill: "FFD1FAE5", font: "FF065F46" };
  }

  // Motivo de la clasificación: siempre se explica, usando solo lo ya contado arriba y en la tabla de indicadores.
  const reasons: string[] = [];
  reasons.push(
    criticalEvents > 0
      ? `Se registraron ${criticalEvents} evento${criticalEvents === 1 ? "" : "s"} crítico${criticalEvents === 1 ? "" : "s"} en la bitácora.`
      : "No se detectaron eventos críticos en la bitácora."
  );
  reasons.push(
    warningEvents > 0
      ? `Se registraron ${warningEvents} evento${warningEvents === 1 ? "" : "s"} de advertencia.`
      : "No se registraron eventos de advertencia."
  );
  reasons.push(
    anomalous > 0
      ? `El ${anomalousPct}% de las lecturas registradas se mantuvo fuera de los rangos configurados.`
      : "Todas las lecturas registradas se mantuvieron dentro de los rangos configurados."
  );

  const rainInd = indicators.find(i => i.key === "rain");
  if (rainInd) {
    reasons.push(
      rainInd.status === "Alto"
        ? "Se detectó lluvia por encima del umbral configurado durante el período."
        : "No se registró lluvia sobre el umbral configurado durante el período."
    );
  }

  const airInd = indicators.find(i => i.key === "airQuality");
  if (airInd) {
    reasons.push(
      airInd.status === "Alto"
        ? "La calidad del aire superó el rango configurado durante parte del período."
        : "La calidad del aire permaneció dentro del rango configurado."
    );
  }

  return { ...classification, reasons };
}

export async function exportFullReportExcel(
  history: WeatherData["history"],
  events: WeatherData["events"],
  period: string,
  sensors: string[],
  conclusions: string[]
) {
  if (history.length === 0) return;

  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Estación Meteorológica IoT";
  workbook.created = new Date();

  const stampNow = new Date().toLocaleString("es-EC");
  const selectedKeys = sensors
    .map(label => SENSOR_LABEL_TO_KEY[label])
    .filter((k): k is keyof typeof SENSOR_COLUMNS => Boolean(k));
  const activeCols = selectedKeys.length > 0 ? selectedKeys : (Object.keys(SENSOR_COLUMNS) as (keyof typeof SENSOR_COLUMNS)[]);

  const indicators = computeIndicators(history, activeCols);
  const overallStatus = computeOverallStatus(history, activeCols, events, indicators);
  const { hallazgos, correlaciones, estadisticas } = classifyConclusions(conclusions);

  // ══════════════════════════════════════════════════════════
  // HOJA 1: RESUMEN — portada del informe (sin tablas grandes)
  // ══════════════════════════════════════════════════════════
  const wsSummary = workbook.addWorksheet("Resumen", { views: [{ showGridLines: false }] });
  drawTitleBlock(wsSummary, "CENTRO DE ANÁLISIS METEOROLÓGICO", "Informe técnico generado automáticamente por la Estación Meteorológica IoT", 2, true);

  const coverRows: Array<[string, string]> = [
    ["Fecha y hora de generación", stampNow],
    ["Período analizado", PERIOD_LABELS[period] ?? period],
    ["Sensores incluidos", sensors.join(", ") || "Ninguno"],
    ["Registros analizados", history.length.toLocaleString("es-EC")],
    ["Eventos considerados", events.length.toLocaleString("es-EC")],
  ];

  let r = 4;
  coverRows.forEach(([label, value]) => {
    const labelCell = wsSummary.getCell(r, 1);
    labelCell.value = label;
    labelCell.font = { name: BRAND.fontName, bold: true, color: { argb: "FF334155" } };
    labelCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND.subtle } };
    labelCell.border = { bottom: { style: "hair", color: { argb: BRAND.border } } };

    const valueCell = wsSummary.getCell(r, 2);
    valueCell.value = value;
    valueCell.border = { bottom: { style: "hair", color: { argb: BRAND.border } } };
    wsSummary.getRow(r).height = 20;
    r++;
  });

  // Estado general del período — destacado con color
  const stateLabelCell = wsSummary.getCell(r, 1);
  stateLabelCell.value = "Estado general del período";
  stateLabelCell.font = { name: BRAND.fontName, bold: true, color: { argb: "FF334155" } };
  stateLabelCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND.subtle } };
  stateLabelCell.border = { bottom: { style: "hair", color: { argb: BRAND.border } } };

  const stateValueCell = wsSummary.getCell(r, 2);
  stateValueCell.value = overallStatus.label;
  stateValueCell.font = { name: BRAND.fontName, bold: true, color: { argb: overallStatus.font } };
  stateValueCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: overallStatus.fill } };
  stateValueCell.alignment = { horizontal: "center" };
  stateValueCell.border = { bottom: { style: "hair", color: { argb: BRAND.border } } };
  wsSummary.getRow(r).height = 20;
  r++;

  // Motivo de la clasificación — siempre visible, explica en lenguaje llano por qué se llegó a ese estado
  r++;
  wsSummary.mergeCells(r, 1, r, 2);
  const reasonTitleCell = wsSummary.getCell(r, 1);
  reasonTitleCell.value = "Motivo de la clasificación";
  reasonTitleCell.font = { name: BRAND.fontName, bold: true, size: 11, color: { argb: "FFFFFFFF" } };
  reasonTitleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND.darkAlt } };
  reasonTitleCell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
  wsSummary.getRow(r).height = 20;
  r++;

  overallStatus.reasons.forEach(reason => {
    wsSummary.mergeCells(r, 1, r, 2);
    const cell = wsSummary.getCell(r, 1);
    cell.value = `•  ${reason}`;
    cell.font = { name: BRAND.fontName, color: { argb: "FF334155" } };
    cell.alignment = { vertical: "middle", horizontal: "left", indent: 1, wrapText: true };
    cell.border = { bottom: { style: "hair", color: { argb: BRAND.border } } };
    wsSummary.getRow(r).height = 18;
    r++;
  });
  r++;

  // Versión del sistema
  const verLabelCell = wsSummary.getCell(r, 1);
  verLabelCell.value = "Versión del sistema";
  verLabelCell.font = { name: BRAND.fontName, bold: true, color: { argb: "FF334155" } };
  verLabelCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND.subtle } };
  verLabelCell.border = { bottom: { style: "hair", color: { argb: BRAND.border } } };

  const verValueCell = wsSummary.getCell(r, 2);
  verValueCell.value = (pkg as any).version ? `v${(pkg as any).version}` : "N/D";
  verValueCell.border = { bottom: { style: "hair", color: { argb: BRAND.border } } };
  wsSummary.getRow(r).height = 20;

  wsSummary.columns = [{ width: 30 }, { width: 55 }];
  applyDefaultFont(wsSummary);

  // ══════════════════════════════════════════════════════════
  // HOJA 2: RESULTADOS — hallazgos / correlaciones / estadísticas + tabla de indicadores
  // ══════════════════════════════════════════════════════════
  const wsResults = workbook.addWorksheet("Resultados", { views: [{ state: "frozen", ySplit: 2 }] });
  drawTitleBlock(wsResults, "RESULTADOS DEL ANÁLISIS", `Diagnóstico generado por el motor de análisis local  |  Generado: ${stampNow}`, 2);

  let rr = 4;

  function drawBlockHeader(text: string, fill: string, font: string) {
    wsResults.mergeCells(rr, 1, rr, 2);
    const cell = wsResults.getCell(rr, 1);
    cell.value = text;
    cell.font = { name: BRAND.fontName, bold: true, size: 11, color: { argb: font } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fill } };
    cell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
    wsResults.getRow(rr).height = 22;
    rr++;
  }

  function drawNote(text: string) {
    wsResults.mergeCells(rr, 1, rr, 2);
    const cell = wsResults.getCell(rr, 1);
    cell.value = text;
    cell.font = { name: BRAND.fontName, italic: true, size: 9, color: { argb: "FF64748B" } };
    cell.alignment = { vertical: "middle", horizontal: "left", indent: 1, wrapText: true };
    wsResults.getRow(rr).height = 26;
    rr++;
  }

  function drawBlockRows(items: string[], emptyMessage = "No se registraron elementos para este bloque en el período analizado.") {
    if (items.length === 0) {
      wsResults.mergeCells(rr, 1, rr, 2);
      const cell = wsResults.getCell(rr, 1);
      cell.value = emptyMessage;
      cell.font = { name: BRAND.fontName, italic: true, color: { argb: "FF94A3B8" } };
      cell.alignment = { vertical: "middle", horizontal: "left", indent: 1, wrapText: true };
      rr++;
      return;
    }
    items.forEach((text, i) => {
      const idxCell = wsResults.getCell(rr, 1);
      idxCell.value = i + 1;
      idxCell.alignment = { vertical: "middle", horizontal: "center" };
      idxCell.border = { bottom: { style: "hair", color: { argb: BRAND.border } } };

      const textCell = wsResults.getCell(rr, 2);
      textCell.value = text;
      textCell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
      textCell.border = { bottom: { style: "hair", color: { argb: BRAND.border } } };
      rr++;
    });
  }

  drawBlockHeader("HALLAZGOS DETECTADOS", "FFDCFCE7", "FF166534");
  drawBlockRows(hallazgos, "No se registraron hallazgos relevantes en el período analizado.");
  rr++; // espaciado

  drawBlockHeader("CORRELACIONES ENCONTRADAS", "FFDCEAFE", "FF1E40AF");
  drawNote("Las correlaciones representan relaciones observadas entre las variables durante el período analizado. Estas asociaciones permiten identificar comportamientos similares o secuenciales entre los sensores y no implican necesariamente una relación de causa y efecto.");
  drawBlockRows(correlaciones, "No se identificaron relaciones significativas entre las variables analizadas durante el período seleccionado.");
  rr++;

  drawBlockHeader("ESTADÍSTICAS GENERALES", "FFFEF3C7", "FF92400E");
  drawBlockRows(estadisticas, "No se generaron estadísticas adicionales para los sensores seleccionados.");
  rr += 2;

  // Tabla de indicadores — justo antes del historial, con los mismos valores ya usados en la hoja Historial
  wsResults.mergeCells(rr, 1, rr, 2);
  const indTitle = wsResults.getCell(rr, 1);
  indTitle.value = "INDICADORES CLAVE DEL PERÍODO";
  indTitle.font = { name: BRAND.fontName, bold: true, size: 11, color: { argb: "FFFFFFFF" } };
  indTitle.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND.darkAlt } };
  indTitle.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
  wsResults.getRow(rr).height = 22;
  rr++;

  const indHeaderRow = rr;
  const indHeaders = ["Variable", "Mínimo", "Promedio", "Máximo", "Estado"];
  indHeaders.forEach((h, i) => {
    const cell = wsResults.getCell(indHeaderRow, i + 1);
    cell.value = h;
    cell.font = { name: BRAND.fontName, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND.darkAlt } };
    cell.alignment = { vertical: "middle", horizontal: "center" };
  });
  wsResults.getRow(indHeaderRow).height = 20;
  rr++;

  indicators.forEach((ind, i) => {
    const band = i % 2 === 1;
    const rowVals: (string | number)[] = [
      `${ind.label} (${ind.unit})`,
      Number(ind.min.toFixed(ind.decimals)),
      Number(ind.avg.toFixed(ind.decimals)),
      Number(ind.max.toFixed(ind.decimals)),
      ind.status,
    ];
    rowVals.forEach((v, c) => {
      const cell = wsResults.getCell(rr, c + 1);
      cell.value = v;
      cell.alignment = { vertical: "middle", horizontal: c === 0 ? "left" : "center" };
      cell.border = { bottom: { style: "hair", color: { argb: BRAND.border } } };
      if (band) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND.band } };
    });
    const statusCell = wsResults.getCell(rr, 5);
    statusCell.font = { name: BRAND.fontName, bold: true, color: { argb: FONT_BY_STATUS[ind.status] ?? "FF475569" } };
    statusCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: FILL_BY_STATUS[ind.status] ?? BRAND.subtle } };
    rr++;
  });

  wsResults.columns = [{ width: 22 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 14 }];
  applyDefaultFont(wsResults);

  // ══════════════════════════════════════════════════════════
  // HOJA 3: HISTORIAL — mismos datos, formato mejorado
  // ══════════════════════════════════════════════════════════
  const wsHistory = workbook.addWorksheet("Historial", { views: [{ state: "frozen", ySplit: 4 }] });
  drawTitleBlock(wsHistory, "HISTORIAL DE SENSORES", `Registros: ${history.length}  |  Sensores: ${sensors.join(", ") || "todos"}  |  Generado: ${stampNow}`, 1 + activeCols.length * 2);

  const historyHeaders = ["Fecha/Hora"];
  activeCols.forEach(k => historyHeaders.push(SENSOR_COLUMNS[k].label, `Estado ${SENSOR_COLUMNS[k].short}`));
  historyHeaders.forEach((h, i) => {
    const cell = wsHistory.getCell(4, i + 1);
    cell.value = h;
    cell.font = { name: BRAND.fontName, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND.darkAlt } };
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = { bottom: { style: "thin", color: { argb: "FF334155" } } };
  });
  wsHistory.getRow(4).height = 20;

  history.forEach((row, idx) => {
    const rowIdx = 5 + idx;
    const band = idx % 2 === 1;

    const dateCell = wsHistory.getCell(rowIdx, 1);
    dateCell.value = row.time;
    dateCell.alignment = { vertical: "middle", horizontal: "left" };
    dateCell.border = { bottom: { style: "hair", color: { argb: BRAND.border } } };
    if (band) dateCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND.band } };

    let col = 2;
    activeCols.forEach(k => {
      const rawValue = k === "rain" ? row.rain * 10 : (row as any)[k];
      const status = statusOf(rawValue, k);
      const decimals = k === "airQuality" ? 0 : (k === "rain" ? 1 : 2);

      const valCell = wsHistory.getCell(rowIdx, col);
      valCell.value = Number(rawValue.toFixed(decimals));
      valCell.numFmt = decimals === 0 ? "0" : (decimals === 1 ? "0.0" : "0.00");
      valCell.alignment = { vertical: "middle", horizontal: "center" };
      valCell.border = { bottom: { style: "hair", color: { argb: BRAND.border } } };
      if (band) valCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND.band } };

      const statusCell = wsHistory.getCell(rowIdx, col + 1);
      statusCell.value = status;
      statusCell.alignment = { vertical: "middle", horizontal: "center" };
      statusCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: FILL_BY_STATUS[status] ?? BRAND.subtle } };
      statusCell.font = { name: BRAND.fontName, bold: true, color: { argb: FONT_BY_STATUS[status] ?? "FF475569" } };
      statusCell.border = { bottom: { style: "hair", color: { argb: BRAND.border } } };

      col += 2;
    });
  });
  wsHistory.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4, column: historyHeaders.length } };
  autoWidth(wsHistory, historyHeaders.length, 13, 26);
  applyDefaultFont(wsHistory);

  // ══════════════════════════════════════════════════════════
  // HOJA 4: EVENTOS — mismos eventos, presentación mejorada
  // ══════════════════════════════════════════════════════════
  const wsEvents = workbook.addWorksheet("Eventos", { views: [{ state: "frozen", ySplit: 4 }] });
  drawTitleBlock(wsEvents, "BITÁCORA DE EVENTOS", `Eventos: ${events.length}  |  Generado: ${stampNow}`, 3);

  // Nota: el modelo de datos actual no distingue "Origen" ni "Categoría" como campos propios;
  // se presentan únicamente las columnas que el sistema realmente registra (Hora, Nivel, Descripción).
  const eventHeaders = ["Hora", "Nivel", "Descripción del Suceso"];
  eventHeaders.forEach((h, i) => {
    const cell = wsEvents.getCell(4, i + 1);
    cell.value = h;
    cell.font = { name: BRAND.fontName, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND.darkAlt } };
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = { bottom: { style: "thin", color: { argb: "FF334155" } } };
  });
  wsEvents.getRow(4).height = 20;

  if (events.length === 0) {
    wsEvents.mergeCells(5, 1, 5, 3);
    const cell = wsEvents.getCell(5, 1);
    cell.value = "No se registraron incidentes ni alertas en el período.";
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.font = { name: BRAND.fontName, italic: true, color: { argb: "FF94A3B8" } };
  } else {
    events.forEach((ev, i) => {
      const rowIdx = 5 + i;
      const rowVals = [ev.time, LABEL_BY_TYPE[ev.type] ?? ev.type.toUpperCase(), ev.message];
      rowVals.forEach((v, c) => {
        const cell = wsEvents.getCell(rowIdx, c + 1);
        cell.value = v;
        cell.alignment = { vertical: "middle", horizontal: c === 1 ? "center" : "left", wrapText: c === 2 };
        cell.border = { bottom: { style: "hair", color: { argb: BRAND.border } } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: FILL_BY_TYPE[ev.type] ?? "FFFFFFFF" } };
        if (c === 1) {
          cell.font = { name: BRAND.fontName, bold: true, color: { argb: FONT_BY_TYPE[ev.type] ?? "FF475569" } };
        } else {
          cell.font = { name: BRAND.fontName, color: { argb: "FF334155" } };
        }
      });
    });
  }
  wsEvents.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4, column: eventHeaders.length } };
  wsEvents.getColumn(1).width = 14;
  wsEvents.getColumn(2).width = 16;
  wsEvents.getColumn(3).width = 70;
  applyDefaultFont(wsEvents);

  // ─── Descarga ───
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.setAttribute("hidden", "");
  a.setAttribute("href", url);
  a.setAttribute("download", `reporte_analisis_estacion_${period}.xlsx`);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

const PERIOD_LABELS: Record<string, string> = {
  "1H": "1 hora", "6H": "6 horas", "12H": "12 horas", "24H": "24 horas", "7D": "7 días",
};

const SENSOR_COLUMNS = {
  temperature: { label: "Temperatura (°C)", short: "Temp." },
  humidity: { label: "Humedad (%)", short: "Hum." },
  pressure: { label: "Presión (hPa)", short: "Presión" },
  rain: { label: "Lluvia (%)", short: "Lluvia" },
  airQuality: { label: "Calidad de Aire (ppm)", short: "Aire" },
} as const;

// ─── EXPORTADORES ADICIONALES (SIN CAMBIOS): JSON y CSV ───

export function exportFullReportJSON(
  history: WeatherData["history"],
  events: WeatherData["events"],
  period: string,
  sensors: string[],
  conclusions: string[]
) {
  const payload = {
    reportHeader: {
      title: "Centro de Análisis Meteorológico",
      timestamp: new Date().toLocaleString(),
      periodSelected: period,
      sensorsIncluded: sensors
    },
    conclusions,
    history: history.map(h => ({
      time: h.time,
      temperature: h.temperature,
      humidity: h.humidity,
      pressure: h.pressure,
      rain: h.rain * 10,
      airQuality: h.airQuality
    })),
    events
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.setAttribute("hidden", "");
  a.setAttribute("href", url);
  a.setAttribute("download", `reporte_analisis_estacion_${period}.json`);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export function exportFullReportCSV(
  history: WeatherData["history"],
  events: WeatherData["events"],
  period: string,
  sensors: string[]
) {
  const csvRows: string[] = [];
  csvRows.push(["Fecha/Hora", "Temperatura (C)", "Humedad (%)", "Presion (hPa)", "Lluvia (%)", "Calidad Aire (ppm)"].join(","));
  history.forEach(row => {
    csvRows.push([
      `"${row.time}"`,
      row.temperature.toFixed(2),
      row.humidity.toFixed(2),
      row.pressure.toFixed(1),
      (row.rain * 10).toFixed(1),
      row.airQuality.toFixed(0)
    ].join(","));
  });

  const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.setAttribute("hidden", "");
  a.setAttribute("href", url);
  a.setAttribute("download", `reporte_historico_consolidado_${period}.csv`);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}