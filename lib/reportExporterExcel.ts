import { WeatherData } from "../types/weather";
import { THRESHOLDS } from "./thresholds";

// ─── Helpers de estado (mismo criterio que Historial) ───
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

// Mapa de etiqueta legible (como llega desde la UI) -> clave interna del sensor
const SENSOR_LABEL_TO_KEY: Record<string, "temperature" | "humidity" | "pressure" | "rain" | "airQuality"> = {
  "Temperatura": "temperature",
  "Humedad": "humidity",
  "Presión": "pressure",
  "Lluvia": "rain",
  "Calidad del Aire": "airQuality",
};

function drawTitleBlock(sheet: any, subtitle: string, colSpan: number) {
  sheet.mergeCells(1, 1, 1, colSpan);
  const t = sheet.getCell(1, 1);
  t.value = "CENTRO DE ANÁLISIS METEOROLÓGICO — REPORTE CONSOLIDADO";
  t.font = { bold: true, size: 14, color: { argb: "FFFFFFFF" } };
  t.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } };
  t.alignment = { vertical: "middle", horizontal: "center" };
  sheet.getRow(1).height = 26;

  sheet.mergeCells(2, 1, 2, colSpan);
  const s = sheet.getCell(2, 1);
  s.value = subtitle;
  s.font = { italic: true, size: 10, color: { argb: "FF475569" } };
  s.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
  s.alignment = { vertical: "middle", horizontal: "center" };
  sheet.getRow(2).height = 18;
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

  // ─── HOJA 1: RESUMEN EJECUTIVO ───
  const wsSummary = workbook.addWorksheet("Resumen");
  drawTitleBlock(wsSummary, `Generado: ${stampNow}`, 2);

  const summaryRows: [string, string][] = [
    ["Período Analizado", PERIOD_LABELS[period] ?? period],
    ["Sensores Incluidos", sensors.join(", ") || "Ninguno"],
    ["Registros Analizados", history.length.toString()],
    ["Eventos Registrados", events.length.toString()],
  ];
  summaryRows.forEach((row, i) => {
    const rowIdx = 4 + i;
    const label = wsSummary.getCell(rowIdx, 1);
    label.value = row[0];
    label.font = { bold: true, color: { argb: "FF334155" } };
    label.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
    label.border = { bottom: { style: "hair", color: { argb: "FFE2E8F0" } } };

    const val = wsSummary.getCell(rowIdx, 2);
    val.value = row[1];
    val.border = { bottom: { style: "hair", color: { argb: "FFE2E8F0" } } };
  });
  wsSummary.columns = [{ width: 26 }, { width: 55 }];

  // ─── HOJA 2: RESULTADOS DEL ANÁLISIS ───
  const wsAnalysis = workbook.addWorksheet("Resultados Análisis", { views: [{ state: "frozen", ySplit: 5 }] });
  drawTitleBlock(wsAnalysis, `Diagnóstico generado por el motor de análisis local  |  Generado: ${stampNow}`, 2);

  const analysisHeaders = ["#", "Hallazgos y Correlaciones Detectadas"];
  analysisHeaders.forEach((h, i) => {
    const cell = wsAnalysis.getCell(4, i + 1);
    cell.value = h;
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } };
    cell.alignment = { vertical: "middle", horizontal: "center" };
  });
  wsAnalysis.getRow(4).height = 20;

  const rows = conclusions.length > 0
    ? conclusions
    : ["No se detectaron comportamientos fuera de rango o patrones significativos en el periodo."];
  rows.forEach((c, i) => {
    const idxCell = wsAnalysis.getCell(5 + i, 1);
    idxCell.value = i + 1;
    idxCell.alignment = { vertical: "middle", horizontal: "center" };
    idxCell.border = { bottom: { style: "hair", color: { argb: "FFE2E8F0" } } };

    const textCell = wsAnalysis.getCell(5 + i, 2);
    textCell.value = c;
    textCell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
    textCell.border = { bottom: { style: "hair", color: { argb: "FFE2E8F0" } } };
  });
  wsAnalysis.columns = [{ width: 8 }, { width: 100 }];

  // ─── HOJA 3: HISTORIAL DE SENSORES (solo los seleccionados) ───
  const wsHistory = workbook.addWorksheet("Historial Sensores", { views: [{ state: "frozen", ySplit: 5 }] });
  const activeCols = selectedKeys.length > 0 ? selectedKeys : (Object.keys(SENSOR_COLUMNS) as (keyof typeof SENSOR_COLUMNS)[]);
  drawTitleBlock(wsHistory, `Registros: ${history.length}  |  Sensores: ${sensors.join(", ") || "todos"}  |  Generado: ${stampNow}`, 1 + activeCols.length * 2);

  const historyHeaders = ["Fecha/Hora"];
  activeCols.forEach(k => historyHeaders.push(SENSOR_COLUMNS[k].label, `Estado ${SENSOR_COLUMNS[k].short}`));
  historyHeaders.forEach((h, i) => {
    const cell = wsHistory.getCell(4, i + 1);
    cell.value = h;
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } };
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = { bottom: { style: "thin", color: { argb: "FF334155" } } };
  });
  wsHistory.getRow(4).height = 20;

  history.forEach((row, r) => {
    const rowIdx = 5 + r;
    const dateCell = wsHistory.getCell(rowIdx, 1);
    dateCell.value = row.time;
    dateCell.alignment = { vertical: "middle", horizontal: "left" };
    dateCell.border = { bottom: { style: "hair", color: { argb: "FFE2E8F0" } } };

    let col = 2;
    activeCols.forEach(k => {
      const rawValue = k === "rain" ? row.rain * 10 : row[k];
      const status = statusOf(rawValue, k);

      const valCell = wsHistory.getCell(rowIdx, col);
      valCell.value = Number(rawValue.toFixed(k === "airQuality" ? 0 : 2));
      valCell.alignment = { vertical: "middle", horizontal: "center" };
      valCell.border = { bottom: { style: "hair", color: { argb: "FFE2E8F0" } } };

      const statusCell = wsHistory.getCell(rowIdx, col + 1);
      statusCell.value = status;
      statusCell.alignment = { vertical: "middle", horizontal: "center" };
      statusCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: FILL_BY_STATUS[status] ?? "FFF1F5F9" } };
      statusCell.font = { bold: true, color: { argb: FONT_BY_STATUS[status] ?? "FF475569" } };
      statusCell.border = { bottom: { style: "hair", color: { argb: "FFE2E8F0" } } };

      col += 2;
    });
  });
  wsHistory.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4, column: historyHeaders.length } };
  wsHistory.columns = [{ width: 22 }, ...activeCols.flatMap(() => [{ width: 16 }, { width: 13 }])];

  // ─── HOJA 4: BITÁCORA DE EVENTOS ───
  const wsEvents = workbook.addWorksheet("Bitácora Eventos", { views: [{ state: "frozen", ySplit: 5 }] });
  drawTitleBlock(wsEvents, `Eventos: ${events.length}  |  Generado: ${stampNow}`, 4);

  const eventHeaders = ["ID Evento", "Hora", "Tipo", "Descripción del Suceso"];
  eventHeaders.forEach((h, i) => {
    const cell = wsEvents.getCell(4, i + 1);
    cell.value = h;
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } };
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = { bottom: { style: "thin", color: { argb: "FF334155" } } };
  });
  wsEvents.getRow(4).height = 20;

  if (events.length === 0) {
    wsEvents.mergeCells(5, 1, 5, 4);
    const cell = wsEvents.getCell(5, 1);
    cell.value = "No se registraron incidentes ni alertas en el período.";
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.font = { italic: true, color: { argb: "FF94A3B8" } };
  } else {
    events.forEach((ev, i) => {
      const rowIdx = 5 + i;
      const rowVals = [ev.id, ev.time, ev.type.toUpperCase(), ev.message];
      rowVals.forEach((v, c) => {
        const cell = wsEvents.getCell(rowIdx, c + 1);
        cell.value = v;
        cell.alignment = { vertical: "middle", horizontal: c === 2 ? "center" : "left" };
        cell.border = { bottom: { style: "hair", color: { argb: "FFE2E8F0" } } };
      });
      const typeCell = wsEvents.getCell(rowIdx, 3);
      typeCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: FILL_BY_TYPE[ev.type] ?? "FFF1F5F9" } };
      typeCell.font = { bold: true, color: { argb: FONT_BY_TYPE[ev.type] ?? "FF475569" } };
    });
  }
  wsEvents.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4, column: eventHeaders.length } };
  wsEvents.columns = [{ width: 15 }, { width: 15 }, { width: 16 }, { width: 60 }];

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

// ─── EXPORTADORES ADICIONALES REQUERIDOS: JSON, CSV y TXT (como representación simple de Reporte / PDF alternativo) ───

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