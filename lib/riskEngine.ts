import { WeatherData } from "../types/weather";
import { THRESHOLDS } from "./thresholds";

export type RiskLevel = "low" | "moderate" | "high" | "critical";

export interface RiskBreakdown {
  rain: number;
  airQuality: number;
  temperature: number;
  humidity: number;
}

export interface RiskEvaluation {
  level: RiskLevel;
  score: number; // 0 to 100
  label: string;
  color: string;
  description: string;
  breakdown: RiskBreakdown;
  // Factor con mayor aporte al puntaje, listo para mostrar en UI compacta
  topFactor: { key: keyof RiskBreakdown; label: string; points: number } | null;
}

export function calcRiskIndex(data: WeatherData): RiskEvaluation {
  if (data.conexionESP32 === "desconectado") {
    return {
      level: "critical",
      score: 100,
      label: "SIN LECTURA",
      color: "text-red-500 border-red-500/30 bg-red-500/5",
      description: "Estación desconectada. No es posible evaluar el riesgo.",
      breakdown: { rain: 0, airQuality: 0, temperature: 0, humidity: 0 },
      topFactor: null,
    };
  }

  const breakdown: RiskBreakdown = { rain: 0, airQuality: 0, temperature: 0, humidity: 0 };

  // 1. Lluvia (Hasta 30 puntos)
  if (data.nivelLluvia >= THRESHOLDS.rain.heavy) {
    breakdown.rain = 30;
  } else if (data.nivelLluvia >= THRESHOLDS.rain.detected) {
    breakdown.rain = 15;
  }

  // 2. Calidad del Aire MQ135 (Hasta 30 puntos)
  if (data.calidadAire >= THRESHOLDS.airQuality.bad) {
    breakdown.airQuality = 30;
  } else if (data.calidadAire >= THRESHOLDS.airQuality.regular) {
    breakdown.airQuality = 20;
  } else if (data.calidadAire >= THRESHOLDS.airQuality.acceptable) {
    breakdown.airQuality = 10;
  }

  // 3. Temperatura Extrema (Hasta 20 puntos)
  if (data.temperatura < THRESHOLDS.temperature.min || data.temperatura > THRESHOLDS.temperature.max) {
    breakdown.temperature = 20;
  }

  // 4. Humedad Extrema (Hasta 20 puntos)
  if (data.humedad < THRESHOLDS.humidity.min || data.humedad > THRESHOLDS.humidity.max) {
    breakdown.humidity = 20;
  } else if (data.humedad > THRESHOLDS.humidity.comfortMax) {
    breakdown.humidity = 10;
  }

  const score = breakdown.rain + breakdown.airQuality + breakdown.temperature + breakdown.humidity;

  const FACTOR_LABELS: Record<keyof RiskBreakdown, string> = {
    rain: "Precipitación",
    airQuality: "Calidad del aire",
    temperature: "Temperatura",
    humidity: "Humedad",
  };

  const topFactorKey = (Object.keys(breakdown) as (keyof RiskBreakdown)[])
    .filter(k => breakdown[k] > 0)
    .sort((a, b) => breakdown[b] - breakdown[a])[0] ?? null;

  const topFactor = topFactorKey
    ? { key: topFactorKey, label: FACTOR_LABELS[topFactorKey], points: breakdown[topFactorKey] }
    : null;

  // Descripción base por nivel, con el factor dominante anexado cuando existe
  // (p. ej. "Parámetros fuera de rango normal. Principal factor: Precipitación (+15pts)")
  const withFactor = (base: string) =>
    topFactor ? `${base} Principal factor: ${topFactor.label} (+${topFactor.points}pts).` : base;

  // Definición de niveles de riesgo
  if (score >= 70) {
    return {
      level: "critical",
      score,
      label: "RIESGO CRÍTICO",
      color: "text-red-500 border-red-500/30 bg-red-500/5",
      description: withFactor("Condiciones críticas detectadas. Se aconseja intervención o resguardo."),
      breakdown,
      topFactor,
    };
  }
  if (score >= 40) {
    return {
      level: "high",
      score,
      label: "RIESGO ALTO",
      color: "text-amber-500 border-amber-500/30 bg-amber-500/5",
      description: withFactor("Parámetros fuera de rango normal. Monitorear de cerca."),
      breakdown,
      topFactor,
    };
  }
  if (score >= 15) {
    return {
      level: "moderate",
      score,
      label: "RIESGO MODERADO",
      color: "text-sky-500 border-sky-500/30 bg-sky-500/5",
      description: withFactor("Condiciones ligeramente alteradas. Operación estable."),
      breakdown,
      topFactor,
    };
  }

  return {
    level: "low",
    score,
    label: "RIESGO BAJO",
    color: "text-emerald-500 border-emerald-500/30 bg-emerald-500/5",
    description: "Condiciones ambientales óptimas y seguras.",
    breakdown,
    topFactor,
  };
}