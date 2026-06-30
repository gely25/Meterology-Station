export interface HistoryPoint {
  time: string;
  temperature: number;
  humidity: number;
  pressure: number;
  rain: number;
}

export interface WeatherData {
  temperatura: number;
  humedad: number;
  presion: number;
  altitud: number;
  lluvia: number;
  estadoLluvia: string;
  hora: string;
  fecha: string;
  conexionESP32: 'conectado' | 'desconectado';
  estadoAHT10: 'operativo' | 'error';
  estadoBMP280: 'operativo' | 'error';
  estadoSensorLluvia: 'operativo' | 'error';
  estadoOLED: 'activa' | 'inactiva';
  alerta: string | null;
  history: HistoryPoint[];
}
