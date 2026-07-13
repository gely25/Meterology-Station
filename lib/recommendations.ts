import { WeatherData } from "../types/weather";
import { THRESHOLDS } from "./thresholds";

export interface Recommendation {
  id: string;
  type: "warning" | "info" | "success";
  title: string;
  message: string;
}

export function getRecommendations(data: WeatherData): Recommendation[] {
  const recommendations: Recommendation[] = [];

  if (data.conexionESP32 === "desconectado") {
    return [
      {
        id: "offline",
        type: "warning",
        title: "Dispositivo sin conexión",
        message: "Verifica la alimentación eléctrica y la conexión de red del ESP32."
      }
    ];
  }

  // 1. Lluvia
  if (data.nivelLluvia >= THRESHOLDS.rain.detected) {
    recommendations.push({
      id: "rain_active",
      type: "warning",
      title: "Precipitación detectada",
      message: `Se detecta precipitación activa (${data.nivelLluvia.toFixed(0)}%). Se recomienda revisar las condiciones del entorno y los sistemas dependientes del clima.`
    });
  }

  // 2. Humedad
  if (data.humedad > THRESHOLDS.humidity.max) {
    recommendations.push({
      id: "humidity_very_high",
      type: "warning",
      title: "Humedad elevada",
      message: `La humedad ambiental se encuentra en ${data.humedad.toFixed(0)}%, superando el umbral configurado. Se recomienda revisar las condiciones del entorno y verificar la causa del incremento.`
    });
  } else if (data.humedad < THRESHOLDS.humidity.min) {
    recommendations.push({
      id: "humidity_low",
      type: "info",
      title: "Humedad por debajo del umbral",
      message: `La humedad relativa registrada es ${data.humedad.toFixed(0)}%, por debajo del mínimo configurado. Se recomienda revisar las condiciones ambientales del entorno monitoreado.`
    });
  }

  // 3. Calidad del aire
  if (data.calidadAire >= THRESHOLDS.airQuality.bad) {
    recommendations.push({
      id: "air_critical",
      type: "warning",
      title: "Calidad del aire crítica",
      message: `El sensor MQ135 registra ${data.calidadAire.toFixed(0)} ppm, superando el umbral crítico configurado. Se recomienda verificar el entorno y garantizar la ventilación adecuada.`
    });
  } else if (data.calidadAire >= THRESHOLDS.airQuality.regular) {
    recommendations.push({
      id: "air_regular",
      type: "info",
      title: "Calidad del aire regular",
      message: "La concentración de gases se encuentra por encima del rango esperado. Se recomienda aumentar la circulación de aire si el entorno lo permite."
    });
  }

  // 4. Temperatura extrema
  if (data.temperatura > THRESHOLDS.temperature.max) {
    recommendations.push({
      id: "temp_high",
      type: "warning",
      title: "Temperatura elevada",
      message: `La temperatura supera el rango recomendado (${data.temperatura.toFixed(1)}°C > ${THRESHOLDS.temperature.max}°C). Se recomienda verificar las condiciones del entorno y la ventilación disponible.`
    });
  } else if (data.temperatura < THRESHOLDS.temperature.min) {
    recommendations.push({
      id: "temp_low",
      type: "info",
      title: "Temperatura baja detectada",
      message: `La temperatura se encuentra por debajo del rango configurado (${data.temperatura.toFixed(1)}°C < ${THRESHOLDS.temperature.min}°C). Se recomienda revisar las condiciones del entorno monitoreado.`
    });
  }

  // 5. Todo dentro del rango
  if (recommendations.length === 0) {
    recommendations.push({
      id: "all_good",
      type: "success",
      title: "Condiciones normales",
      message: "Todos los parámetros monitoreados se encuentran dentro de los rangos configurados. El sistema opera con normalidad."
    });
  }

  return recommendations;
}
