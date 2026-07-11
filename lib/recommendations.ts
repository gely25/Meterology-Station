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

  // 1. Lluvia y Riego
  if (data.nivelLluvia >= THRESHOLDS.rain.detected) {
    recommendations.push({
      id: "rain_active",
      type: "warning",
      title: "Suspender riego automático",
      message: `Precipitación detectada (${data.nivelLluvia.toFixed(0)}%). Se recomienda apagar sistemas de riego para evitar saturación.`
    });
  }

  // 2. Humedad y Hongos
  if (data.humedad > THRESHOLDS.humidity.max) {
    recommendations.push({
      id: "humidity_very_high",
      type: "warning",
      title: "Riesgo de proliferación fúngica",
      message: `Humedad relativa en ${data.humedad.toFixed(0)}%. Favorece la propagación de plagas/hongos. Ventilar o deshumidificar.`
    });
  } else if (data.humedad < THRESHOLDS.humidity.min) {
    recommendations.push({
      id: "humidity_low",
      type: "info",
      title: "Ambiente excesivamente seco",
      message: `Humedad baja (${data.humedad.toFixed(0)}%). Considera aplicar riego ligero para regular la humedad ambiente.`
    });
  }

  // 3. Calidad del aire y Ventilación
  if (data.calidadAire >= THRESHOLDS.airQuality.bad) {
    recommendations.push({
      id: "air_critical",
      type: "warning",
      title: "Calidad de aire crítica",
      message: `Nivel de gases MQ135: ${data.calidadAire.toFixed(0)} ppm. Evita la exposición física y activa extractores de aire.`
    });
  } else if (data.calidadAire >= THRESHOLDS.airQuality.regular) {
    recommendations.push({
      id: "air_regular",
      type: "info",
      title: "Calidad de aire regular",
      message: "Gases ligeramente elevados. Aumenta la circulación de aire si estás en interiores."
    });
  }

  // 4. Temperatura extrema
  if (data.temperatura > THRESHOLDS.temperature.max) {
    recommendations.push({
      id: "temp_high",
      type: "warning",
      title: "Estrés térmico por calor",
      message: `Temperatura superior a ${THRESHOLDS.temperature.max}°C. Monitorea hidratación del cultivo y ventilación.`
    });
  } else if (data.temperatura < THRESHOLDS.temperature.min) {
    recommendations.push({
      id: "temp_low",
      type: "info",
      title: "Temperatura baja detectada",
      message: `Nivel térmico inferior a ${THRESHOLDS.temperature.min}°C. Considera protección pasiva contra frío/heladas.`
    });
  }

  // 5. Caso todo normal
  if (recommendations.length === 0) {
    recommendations.push({
      id: "all_good",
      type: "success",
      title: "Condiciones ideales",
      message: "Todos los parámetros se encuentran dentro del rango de confort agronómico estable."
    });
  }

  return recommendations;
}
