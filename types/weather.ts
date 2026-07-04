export interface HistoryPoint {
  time: string;
  temperature: number;
  humidity: number;
  pressure: number;
  rain: number;
  airQuality: number;
}

export type EventType = 'info' | 'alert' | 'success' | 'warning';

export interface SystemEvent {
  id: string;
  time: string;
  type: EventType;
  message: string;
  icon?: string;
}

export interface WeatherData {
  temperatura: number;
  humedad: number;
  presion: number;
  calidadAire: number;
  nivelLluvia: number;
  estadoLluvia: string;
  estadoCalidadAire: string;
  estadoClima: string;
  
  hora: string;
  fecha: string;
  ultimaActualizacion: string;
  uptime: string;
  
  conexionESP32: 'conectado' | 'desconectado';
  wifiRSSI: number;
  wifiCalidad: 'Excelente' | 'Muy buena' | 'Buena' | 'Débil' | 'Sin conexión';
  
  estadoAHT10: 'operativo' | 'error' | 'desconectado';
  estadoBMP280: 'operativo' | 'error' | 'desconectado';
  estadoMQ135: 'operativo' | 'error' | 'desconectado';
  estadoSensorLluvia: 'operativo' | 'error' | 'desconectado';
  estadoOLED: 'operativo' | 'error' | 'desconectado';
  estadoLedVerde: 'operativo' | 'error' | 'desconectado';
  estadoLedRojo: 'operativo' | 'error' | 'desconectado';
  estadoBuzzer: 'operativo' | 'error' | 'desconectado';
  
  alertaActiva: string | null;
  history: HistoryPoint[];
  events: SystemEvent[];
}
