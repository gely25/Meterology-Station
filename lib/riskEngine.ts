import { WeatherData } from "../types/weather";
import { THRESHOLDS } from "./thresholds";

export type RiskLevel = "low" | "moderate" | "high" | "critical";

export interface RiskEvaluation {
  level: RiskLevel;
  score: number; // 0 to 100
  label: string;
  color: string;
  description: string;
}

export function calcRiskIndex(data: WeatherData): RiskEvaluation {
  if (data.conexionESP32 === "desconectado") {
    return {
      level: "critical",
      score: 100,
      label: "SIN LECTURA",
      color: "text-red-500 border-red-500/30 bg-red-500/5",
      description: "Estación desconectada. No es posible evaluar el riesgo."
    };
  }

  let score = 0;

  // 1. Lluvia (Hasta 30 puntos)
  if (data.nivelLluvia >= THRESHOLDS.rain.heavy) {
    score += 30;
  } else if (data.nivelLluvia >= THRESHOLDS.rain.detected) {
    score += 15;
  }

  // 2. Calidad del Aire MQ135 (Hasta 30 puntos)
  if (data.calidadAire >= THRESHOLDS.airQuality.bad) {
    score += 30;
  } else if (data.calidadAire >= THRESHOLDS.airQuality.regular) {
    score += 20;
  } else if (data.calidadAire >= THRESHOLDS.airQuality.acceptable) {
    score += 10;
  }

  // 3. Temperatura Extrema (Hasta 20 puntos)
  if (data.temperatura < THRESHOLDS.temperature.min || data.temperatura > THRESHOLDS.temperature.max) {
    score += 20;
  }

  // 4. Humedad Extrema (Hasta 20 puntos)
  if (data.humedad < THRESHOLDS.humidity.min || data.humedad > THRESHOLDS.humidity.max) {
    score += 20;
  } else if (data.humedad > THRESHOLDS.humidity.comfortMax) {
    score += 10;
  }

  // Definición de niveles de riesgo
  if (score >= 70) {
    return {
      level: "critical",
      score,
      label: "RIESGO CRÍTICO",
      color: "text-red-500 border-red-500/30 bg-red-500/5",
      description: "Condiciones críticas detectadas. Se aconseja intervención o resguardo."
    };
  }
  if (score >= 40) {
    return {
      level: "high",
      score,
      label: "RIESGO ALTO",
      color: "text-amber-500 border-amber-500/30 bg-amber-500/5",
      description: "Parámetros fuera de rango normal. Monitorear de cerca."
    };
  }
  if (score >= 15) {
    return {
      level: "moderate",
      score,
      label: "RIESGO MODERADO",
      color: "text-sky-500 border-sky-500/30 bg-sky-500/5",
      description: "Condiciones ligeramente alteradas. Operación estable."
    };
  }

  return {
    level: "low",
    score,
    label: "RIESGO BAJO",
    color: "text-emerald-500 border-emerald-500/30 bg-emerald-500/5",
    description: "Condiciones ambientales óptimas y seguras."
  };
}
