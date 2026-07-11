import { utils, write } from "xlsx";
import { WeatherData } from "../types/weather";

export function exportFullReportExcel(
  history: WeatherData["history"],
  events: WeatherData["events"],
  period: string,
  sensors: string[],
  conclusions: string[]
) {
  if (history.length === 0) return;

  // ─── HOJA 1: RESUMEN EJECUTIVO ───
  const summaryData = [
    ["CENTRO DE ANÁLISIS METEOROLÓGICO - REPORTE CONSOLIDADO"],
    [],
    ["Fecha de Generación:", new Date().toLocaleString()],
    ["Período Analizado:", period],
    ["Sensores Incluidos:", sensors.join(", ")],
    ["Registros Analizados:", history.length.toString()],
    ["Eventos Registrados:", events.length.toString()],
  ];
  const wsSummary = utils.aoa_to_sheet(summaryData);

  // Ajustar ancho de columnas para Resumen
  wsSummary["!cols"] = [
    { wch: 25 },
    { wch: 45 }
  ];

  // ─── HOJA 2: ANÁLISIS DERIVADO (Conclusiones) ───
  const analysisRows = [
    ["Índice", "Hallazgos y Correlaciones Detectadas"]
  ];
  if (conclusions.length === 0) {
    analysisRows.push(["1", "No se detectaron comportamientos fuera de rango o patrones significativos en el periodo."]);
  } else {
    conclusions.forEach((c, i) => {
      analysisRows.push([(i + 1).toString(), c]);
    });
  }
  const wsAnalysis = utils.aoa_to_sheet(analysisRows);
  wsAnalysis["!cols"] = [
    { wch: 10 },
    { wch: 90 }
  ];

  // ─── HOJA 3: HISTORIAL DE MEDICIONES ───
  const historyRows = [
    ["Fecha/Hora", "Temperatura (ºC)", "Humedad Relative (%)", "Presión Atmosférica (hPa)", "Lluvia (%)", "Calidad de Aire (ppm)", "Estado Lluvia"]
  ];
  history.forEach(row => {
    const rainLevel = row.rain * 10;
    const isRaining = rainLevel >= 20;
    const rainState = isRaining ? (rainLevel >= 70 ? "Intensa" : "Ligera") : "Seco";
    historyRows.push([
      row.time,
      row.temperature.toFixed(2),
      row.humidity.toFixed(2),
      row.pressure.toFixed(1),
      rainLevel.toFixed(1),
      row.airQuality.toFixed(0),
      rainState
    ]);
  });
  const wsHistory = utils.aoa_to_sheet(historyRows);
  wsHistory["!cols"] = [
    { wch: 25 },
    { wch: 18 },
    { wch: 22 },
    { wch: 25 },
    { wch: 15 },
    { wch: 20 },
    { wch: 15 }
  ];

  // ─── HOJA 4: BITÁCORA DE EVENTOS ───
  const eventRows = [
    ["ID Evento", "Hora/Minuto", "Tipo de Alerta", "Descripción del Suceso"]
  ];
  if (events.length === 0) {
    eventRows.push(["-", "-", "-", "No se registraron incidentes ni alertas en el período."]);
  } else {
    events.forEach(ev => {
      eventRows.push([
        ev.id,
        ev.time,
        ev.type.toUpperCase(),
        ev.message
      ]);
    });
  }
  const wsEvents = utils.aoa_to_sheet(eventRows);
  wsEvents["!cols"] = [
    { wch: 15 },
    { wch: 15 },
    { wch: 18 },
    { wch: 60 }
  ];

  // Crear Libro de Trabajo (Workbook)
  const wb = {
    SheetNames: ["Resumen", "Resultados Análisis", "Historial Sensores", "Bitácora Eventos"],
    Sheets: {
      "Resumen": wsSummary,
      "Resultados Análisis": wsAnalysis,
      "Historial Sensores": wsHistory,
      "Bitácora Eventos": wsEvents
    }
  };

  // Convertir a binario Excel y descargar
  const wbout = write(wb, { bookType: "xlsx", type: "binary" });

  function s2ab(s: string) {
    const buf = new ArrayBuffer(s.length);
    const view = new Uint8Array(buf);
    for (let i = 0; i < s.length; i++) view[i] = s.charCodeAt(i) & 0xff;
    return buf;
  }

  const blob = new Blob([s2ab(wbout)], { type: "application/octet-stream" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.setAttribute("hidden", "");
  a.setAttribute("href", url);
  a.setAttribute("download", `reporte_analisis_estacion_${period}.xlsx`);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

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
