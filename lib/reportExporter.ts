import { WeatherData } from "../types/weather";

export function exportFullReport(
  history: WeatherData["history"],
  events: WeatherData["events"],
  period: string,
  sensors: string[],
  conclusions: string[]
) {
  if (history.length === 0) return;

  const csvRows: string[] = [];

  // Metadata de Generación
  csvRows.push("--- CENTRO DE ANALISIS METEOROLOGICO ---");
  csvRows.push(`Fecha de Generacion,${new Date().toLocaleString()}`);
  csvRows.push(`Periodo Analizado,${period}`);
  csvRows.push(`Sensores Incluidos,"${sensors.join(", ")}"`);
  csvRows.push("");

  // Resultados del Análisis Derivado
  csvRows.push("--- RESULTADOS DEL ANALISIS DERIVADO ---");
  if (conclusions.length === 0) {
    csvRows.push("No se generaron conclusiones para el set seleccionado.");
  } else {
    conclusions.forEach((concl, idx) => {
      csvRows.push(`${idx + 1},"${concl.replace(/"/g, '""')}"`);
    });
  }
  csvRows.push("");

  // Datos Históricos de Sensores
  csvRows.push("--- REGISTRO HISTORICO ---");
  csvRows.push(["Fecha/Hora", "Temperatura (C)", "Humedad (%)", "Presion (hPa)", "Nivel Lluvia (%)", "Calidad Aire (ppm)"].join(","));
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
  csvRows.push("");

  // Eventos de la Bitácora
  csvRows.push("--- EVENTOS DEL PERIODO ---");
  csvRows.push(["ID Evento", "Hora", "Severidad", "Mensaje"].join(","));
  if (events.length === 0) {
    csvRows.push("No se registraron eventos en este periodo.");
  } else {
    events.forEach(ev => {
      csvRows.push([
        `"${ev.id}"`,
        `"${ev.time}"`,
        `"${ev.type.toUpperCase()}"`,
        `"${ev.message.replace(/"/g, '""')}"`
      ].join(","));
    });
  }

  // Descarga del Archivo Consolidado
  const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.setAttribute("hidden", "");
  a.setAttribute("href", url);
  a.setAttribute("download", `reporte_analisis_meteorologico_${period}.csv`);
  document.body.appendChild(a)
  a.click();
  document.body.removeChild(a);
}
