import { WeatherData, SystemEvent } from "../types/weather";
import { THRESHOLDS } from "./thresholds";

export type DecisionStatus = "Estable" | "Atención" | "Riesgo Moderado" | "Riesgo Alto";

export interface DecisionReport {
  status: DecisionStatus;
  statusReason: string;
  statusColor: string;
  findings: string[];
  recommendations: string[];
}

export function evaluateDecisions(
  history: WeatherData["history"],
  events: WeatherData["events"]
): DecisionReport {
  // Inicialización de resultados
  const findings: string[] = [];
  const recommendations: string[] = [];
  let status: DecisionStatus = "Estable";
  let statusReason = "Todos los parámetros monitorizados se encuentran dentro del rango agronómico normal.";
  let statusColor = "text-emerald-500 border-emerald-500/20 bg-emerald-500/5";

  if (history.length === 0) {
    return {
      status: "Atención",
      statusReason: "No se registran datos suficientes en el período seleccionado para emitir un diagnóstico.",
      statusColor: "text-amber-500 border-amber-500/20 bg-amber-500/5",
      findings: ["Sin datos históricos en el búfer."],
      recommendations: ["Espere a recibir lecturas telemétricas activas del ESP32."]
    };
  }

  // Cómputo de valores sobre el histórico
  const temps = history.map(h => h.temperature);
  const humidities = history.map(h => h.humidity);
  const pressures = history.map(h => h.pressure);
  const rains = history.map(h => h.rain);
  const airQualities = history.map(h => h.airQuality);

  const avgTemp = temps.reduce((a, b) => a + b, 0) / temps.length;
  const avgHum = humidities.reduce((a, b) => a + b, 0) / humidities.length;
  const maxAirQuality = Math.max(...airQualities);
  const totalRainEvents = rains.filter(r => r >= (THRESHOLDS.rain.detected / 10)).length;

  // Conteo de alertas en el período desde los eventos
  const criticalEvents = events.filter(e => e.type === "alert");
  const warningEvents = events.filter(e => e.type === "warning");

  // 1. ANÁLISIS DE HALLAZGOS (Reglas deterministas)
  if (totalRainEvents > 0) {
    findings.push(`Se registraron episodios de lluvia activa sobre la placa de medición (${totalRainEvents} lecturas de precipitación).`);
  } else {
    findings.push("No se registraron precipitaciones en los sensores durante el período.");
  }

  if (avgHum > THRESHOLDS.humidity.comfortMax) {
    findings.push(`La humedad promedio permaneció elevada (${avgHum.toFixed(1)}%), fuera del rango de confort.`);
  } else if (avgHum < THRESHOLDS.humidity.min) {
    findings.push(`El ambiente estuvo predominantemente seco con un promedio de humedad de ${avgHum.toFixed(1)}%.`);
  } else {
    findings.push("La humedad ambiental promedio permaneció dentro del rango de confort recomendado.");
  }

  if (avgTemp > THRESHOLDS.temperature.max) {
    findings.push(`Predominaron temperaturas elevadas por encima del límite óptimo agronómico (Promedio: ${avgTemp.toFixed(1)}°C).`);
  } else if (avgTemp < THRESHOLDS.temperature.min) {
    findings.push(`Se registraron condiciones térmicas frías por debajo del umbral de recomendación (Promedio: ${avgTemp.toFixed(1)}°C).`);
  } else {
    findings.push("La temperatura general del período permaneció estable dentro del rango aconsejado.");
  }

  if (maxAirQuality >= THRESHOLDS.airQuality.bad) {
    findings.push(`Se detectaron momentos con calidad del aire crítica, alcanzando picos perjudiciales de ${maxAirQuality.toFixed(0)} ppm.`);
  } else if (maxAirQuality < THRESHOLDS.airQuality.excellent) {
    findings.push("La calidad del aire fue excelente, manteniéndose constantemente en niveles puros.");
  } else {
    findings.push("La calidad del aire osciló en rangos tolerables sin picos de contaminación elevados.");
  }

  if (criticalEvents.length > 0) {
    findings.push(`Se registraron ${criticalEvents.length} alarmas críticas en la bitácora de eventos del dispositivo.`);
  } else if (warningEvents.length > 0) {
    findings.push(`Se detectaron ${warningEvents.length} advertencias operativas en el sistema.`);
  } else {
    findings.push("No se registraron incidentes críticos ni alertas de seguridad en el período.");
  }

  // 2. DIAGNÓSTICO DEL ESTADO GENERAL
  if (criticalEvents.length >= 3 || maxAirQuality >= THRESHOLDS.airQuality.bad) {
    status = "Riesgo Alto";
    statusReason = "Niveles altos de contaminación gaseosa o fallos críticos repetidos en el ESP32 sugieren riesgos graves.";
    statusColor = "text-red-500 border-red-500/30 bg-red-500/5";
  } else if (criticalEvents.length > 0 || warningEvents.length >= 4 || avgHum > THRESHOLDS.humidity.max) {
    status = "Riesgo Moderado";
    statusReason = "Presencia de alertas activas de sensores o desviaciones persistentes del rango de humedad.";
    statusColor = "text-orange-500 border-orange-500/30 bg-orange-500/5";
  } else if (warningEvents.length > 0 || avgTemp > THRESHOLDS.temperature.max || avgTemp < THRESHOLDS.temperature.min) {
    status = "Atención";
    statusReason = "Desviación leve en los umbrales térmicos o advertencias esporádicas de conexión.";
    statusColor = "text-yellow-500 border-yellow-500/30 bg-yellow-500/5";
  }

  // 3. ACCIONES SUGERIDAS (Reglas basadas en umbrales)
  if (totalRainEvents > 0) {
    recommendations.push("Suspender inmediatamente el riego automático programado.");
    recommendations.push("Revisar drenajes de cultivo para prevenir inundaciones.");
  } else {
    recommendations.push("Continuar con el calendario de irrigación planificado.");
  }

  if (avgHum > THRESHOLDS.humidity.comfortMax) {
    recommendations.push("Activar ventilación para forzar la circulación y reducir humedad.");
  }

  if (maxAirQuality >= THRESHOLDS.airQuality.regular) {
    recommendations.push("Supervisar la bitácora de calidad del aire y habilitar extractores.");
  }

  if (criticalEvents.length > 0) {
    recommendations.push("Revisar el cableado de sensores reportados en fallo.");
  }

  if (recommendations.length === 0) {
    recommendations.push("Continuar operación normal. Mantener monitoreo pasivo.");
  }

  return {
    status,
    statusReason,
    statusColor,
    findings,
    recommendations
  };
}
