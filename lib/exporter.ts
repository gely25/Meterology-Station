// CSV/Excel unified exporter
export function exportToCSV(history: any[], events: any[], period: string) {
  if (history.length === 0) return
  
  const csvRows: string[] = []
  
  // ─── SECCIÓN 1: HISTORIAL CONSOLIDADO DE MEDICIONES ───
  csvRows.push("--- HISTORIAL DE MEDICIONES (" + period + ") ---")
  csvRows.push(["Fecha/Hora", "Temperatura (C)", "Humedad (%)", "Presion (hPa)", "Nivel Lluvia (%)", "Calidad Aire (ppm)", "Estado Lluvia"].join(","))
  
  history.forEach(row => {
    // row.rain representa nivelLluvia / 10 en base al guardado en page.tsx
    const rainLevel = (row.rain * 10).toFixed(1)
    const isRaining = row.rain * 10 >= 20
    const rainState = isRaining ? (row.rain * 10 >= 70 ? "Intensa" : "Ligera") : "Seco"
    csvRows.push([
      `"${row.time}"`,
      row.temperature.toFixed(2),
      row.humidity.toFixed(2),
      row.pressure.toFixed(1),
      rainLevel,
      row.airQuality.toFixed(0),
      `"${rainState}"`
    ].join(","))
  })
  
  csvRows.push("") // Line break
  csvRows.push("")
  
  // ─── SECCIÓN 2: BITÁCORA DE EVENTOS OCURRIDOS ───
  csvRows.push("--- EVENTOS DETECTADOS EN EL PERIODO ---")
  csvRows.push(["ID Evento", "Hora", "Severidad", "Mensaje"].join(","))
  
  if (events.length === 0) {
    csvRows.push("No se registraron eventos en este periodo.")
  } else {
    events.forEach(ev => {
      csvRows.push([
        `"${ev.id}"`,
        `"${ev.time}"`,
        `"${ev.type.toUpperCase()}"`,
        `"${ev.message.replace(/"/g, '""')}"`
      ].join(","))
    })
  }

  // Descarga del archivo consolidado
  const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" })
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.setAttribute("hidden", "")
  a.setAttribute("href", url)
  a.setAttribute("download", `estacion_meteorologica_reporte_${period}.csv`)
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}
