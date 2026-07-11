import { WeatherData, SystemEvent } from "../types/weather";
import { THRESHOLDS } from "./thresholds";

export interface AnalysisConfig {
  period: string; // "1H" | "6H" | "12H" | "24H" | "7D"
  sensors: {
    temp: boolean;
    humidity: boolean;
    pressure: boolean;
    rain: boolean;
    airQuality: boolean;
  };
  additional: {
    events: boolean;
    correlations: boolean;
    stats: boolean;
  };
}

export interface AnalysisResult {
  conclusions: string[];
  summaryText: string;
}

export function runEnvironmentalAnalysis(
  history: WeatherData["history"],
  events: WeatherData["events"],
  config: AnalysisConfig
): AnalysisResult {
  const conclusions: string[] = [];
  
  // Filtrar histórico basado en el período seleccionado
  let filteredHistory = history;
  if (config.period === "1H") filteredHistory = history.slice(-3600);
  else if (config.period === "6H") filteredHistory = history.slice(-21600);
  else if (config.period === "12H") filteredHistory = history.slice(-43200);
  else if (config.period === "24H") filteredHistory = history.slice(-86400);
  else if (config.period === "7D") filteredHistory = history.slice(-604800);

  if (filteredHistory.length === 0) {
    return {
      conclusions: ["No hay suficientes datos registrados en el período seleccionado para realizar el análisis."],
      summaryText: "Faltan lecturas de telemetría."
    };
  }

  // Extraer vectores de sensores
  const temps = filteredHistory.map(h => h.temperature);
  const humidities = filteredHistory.map(h => h.humidity);
  const pressures = filteredHistory.map(h => h.pressure);
  const rains = filteredHistory.map(h => h.rain * 10); // Escalar a porcentaje real
  const airQualities = filteredHistory.map(h => h.airQuality);

  // 1. Análisis de LLUVIA
  const rainThreshold = THRESHOLDS.rain.detected;
  const rainEpisodes = rains.filter(r => r >= rainThreshold).length;
  if (config.sensors.rain) {
    if (rainEpisodes > 0) {
      conclusions.push(`Se detectaron ${rainEpisodes} lecturas con precipitación activa en el período.`);
    } else {
      conclusions.push("No se registraron episodios de lluvia activa sobre la placa de medición.");
    }
  }

  // 2. Análisis de TEMPERATURA
  if (config.sensors.temp) {
    const tempInBounds = temps.filter(t => t >= THRESHOLDS.temperature.min && t <= THRESHOLDS.temperature.max).length;
    const tempStabilityPct = (tempInBounds / temps.length) * 100;
    conclusions.push(`La temperatura permaneció dentro del rango recomendado durante el ${tempStabilityPct.toFixed(0)}% del período analizado.`);
  }

  // 3. Análisis de HUMEDAD
  if (config.sensors.humidity) {
    const humInBounds = humidities.filter(h => h >= THRESHOLDS.humidity.min && h <= THRESHOLDS.humidity.comfortMax).length;
    const humStabilityPct = (humInBounds / humidities.length) * 100;
    if (humStabilityPct > 80) {
      conclusions.push("La humedad relativa se mantuvo estable y en rango confortable durante la mayor parte del tiempo.");
    } else {
      conclusions.push(`La humedad fluctuó fuera del rango de confort agronómico el ${(100 - humStabilityPct).toFixed(0)}% del periodo.`);
    }
  }

  // 4. Análisis de CALIDAD DEL AIRE
  if (config.sensors.airQuality) {
    const maxAQ = Math.max(...airQualities);
    const excellentAQ = airQualities.filter(q => q < THRESHOLDS.airQuality.excellent).length;
    const excellentAQPct = (excellentAQ / airQualities.length) * 100;
    if (excellentAQPct === 100) {
      conclusions.push("La calidad del aire permaneció en nivel Excelente durante todo el análisis.");
    } else {
      conclusions.push(`La calidad del aire se mantuvo en nivel Excelente/Puro el ${excellentAQPct.toFixed(0)}% del tiempo, registrando máximas de ${maxAQ.toFixed(0)} ppm.`);
    }
  }

  // 5. Análisis de EVENTOS
  if (config.additional.events) {
    const criticalEvents = events.filter(e => e.type === "alert");
    if (criticalEvents.length === 0) {
      conclusions.push("No se registraron alertas críticas de sistema o actuadores en la bitácora.");
    } else {
      conclusions.push(`Se detectaron ${criticalEvents.length} eventos de alerta o alarmas críticas del sistema.`);
    }
  }

  // 6. CORRELACIONES
  if (config.additional.correlations) {
    // Buscar si la humedad subió previo a eventos de lluvia
    let rainPrecedentHumIncrease = false;
    for (let i = 2; i < filteredHistory.length; i++) {
      if (rains[i] >= rainThreshold && rains[i-2] < rainThreshold) {
        if (humidities[i] > humidities[i-2]) {
          rainPrecedentHumIncrease = true;
          break;
        }
      }
    }
    if (rainPrecedentHumIncrease) {
      conclusions.push("La humedad relativa aumentó gradualmente antes de los eventos de precipitación detectados.");
    }

    // Buscar si la presión bajó previo a lluvia
    let pressureDropPrecedent = false;
    for (let i = 2; i < filteredHistory.length; i++) {
      if (rains[i] >= rainThreshold && rains[i-2] < rainThreshold) {
        if (pressures[i] < pressures[i-2]) {
          pressureDropPrecedent = true;
          break;
        }
      }
    }
    if (pressureDropPrecedent) {
      conclusions.push("La presión atmosférica mostró una tendencia descendente previa a las precipitaciones.");
    }
  }

  return {
    conclusions,
    summaryText: `Análisis consolidado sobre ${filteredHistory.length} lecturas.`
  };
}
