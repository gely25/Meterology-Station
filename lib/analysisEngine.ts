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
  // En vez de un booleano que se satisface con una sola coincidencia en todo
  // el histórico, contamos CADA episodio de lluvia (transición de "sin lluvia"
  // a "lluvia detectada") y qué proporción de esos episodios estuvo precedida
  // por el patrón esperado. Así el hallazgo queda respaldado por una cifra
  // (N de M episodios) en vez de una frase genérica de sí/no.
  if (config.additional.correlations) {
    let rainEvents = 0;
    let humIncreaseBefore = 0;
    let pressureDropBefore = 0;

    for (let i = 2; i < filteredHistory.length; i++) {
      const isRainOnset = rains[i] >= rainThreshold && rains[i - 2] < rainThreshold;
      if (!isRainOnset) continue;

      rainEvents++;
      if (humidities[i] > humidities[i - 2]) humIncreaseBefore++;
      if (pressures[i] < pressures[i - 2]) pressureDropBefore++;
    }

    // Umbral mínimo de evidencia: exigimos al menos 3 episodios de lluvia en
    // el período para poder hablar de "patrón" en vez de coincidencia aislada.
    const MIN_EVENTS_FOR_PATTERN = 3;
    const CONSISTENCY_THRESHOLD = 60; // % de episodios que deben mostrar el patrón

    if (rainEvents >= MIN_EVENTS_FOR_PATTERN) {
      const humPct = (humIncreaseBefore / rainEvents) * 100;
      const pressPct = (pressureDropBefore / rainEvents) * 100;

      if (humPct >= CONSISTENCY_THRESHOLD) {
        conclusions.push(
          `En el ${humPct.toFixed(0)}% de los ${rainEvents} episodios de lluvia detectados (${humIncreaseBefore}/${rainEvents}), la humedad relativa venía en aumento en las lecturas previas.`
        );
      } else {
        conclusions.push(
          `Solo el ${humPct.toFixed(0)}% de los ${rainEvents} episodios de lluvia estuvieron precedidos por un aumento de humedad; no se observa un patrón consistente.`
        );
      }

      if (pressPct >= CONSISTENCY_THRESHOLD) {
        conclusions.push(
          `En el ${pressPct.toFixed(0)}% de los ${rainEvents} episodios de lluvia (${pressureDropBefore}/${rainEvents}), la presión atmosférica venía descendiendo en las lecturas previas.`
        );
      } else {
        conclusions.push(
          `Solo el ${pressPct.toFixed(0)}% de los ${rainEvents} episodios de lluvia estuvieron precedidos por una caída de presión; no se observa un patrón consistente.`
        );
      }
    } else if (rainEvents > 0) {
      conclusions.push(
        `Se detectaron ${rainEvents} episodio(s) de lluvia en el período, insuficientes para establecer un patrón de correlación confiable (mínimo ${MIN_EVENTS_FOR_PATTERN}).`
      );
    }
  }

  return {
    conclusions,
    summaryText: `Análisis consolidado sobre ${filteredHistory.length} lecturas.`
  };
}