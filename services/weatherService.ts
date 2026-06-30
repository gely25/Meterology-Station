import { WeatherData, HistoryPoint } from '../types/weather';

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

function seedHistory(): HistoryPoint[] {
  const points: HistoryPoint[] = [];
  const start = 13 * 60 + 30; // 13:30
  for (let i = 0; i < 13; i++) {
    const mins = start + i * 5;
    const hh = Math.floor(mins / 60);
    const mm = mins % 60;
    points.push({
      time: `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`,
      temperature: 18 + Math.sin(i / 2) * 4 + Math.random() * 2,
      humidity: 55 + Math.cos(i / 3) * 8 + Math.random() * 4,
      pressure: 1012 + Math.sin(i / 4) * 3,
      rain: 2 + Math.random() * 3,
    });
  }
  return points;
}

// Initial mock data state
let currentData: WeatherData = {
  temperatura: 23.6,
  humedad: 65,
  presion: 1012.7,
  altitud: 23,
  lluvia: 97,
  estadoLluvia: 'LLUVIA INTENSA',
  hora: '14:38:26',
  fecha: '30 / JUN / 2026',
  conexionESP32: 'conectado',
  estadoAHT10: 'operativo',
  estadoBMP280: 'operativo',
  estadoSensorLluvia: 'operativo',
  estadoOLED: 'activa',
  alerta: 'LLUVIA INTENSA DETECTADA',
  history: seedHistory(),
};

let tick = 0;

export const weatherService = {
  async getWeatherData(): Promise<WeatherData> {
    // In the future, this will be replaced with:
    // const response = await fetch("http://192.168.1.xxx/weather");
    // return await response.json();

    // Mock implementation updating state to simulate real-time data
    tick += 1;
    const now = new Date();
    const hora = now.toLocaleTimeString('es-EC', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    const temperatura = clamp(currentData.temperatura + (Math.random() - 0.5) * 0.6, 18, 29);
    const humedad = clamp(currentData.humedad + (Math.random() - 0.5) * 2, 40, 95);
    const lluvia = clamp(currentData.lluvia + (Math.random() - 0.5) * 4, 0, 100);
    const presion = clamp(currentData.presion + (Math.random() - 0.5) * 0.8, 995, 1030);

    let history = currentData.history;
    if (tick % 5 === 0) {
      const last = currentData.history[currentData.history.length - 1];
      const [h, m] = last.time.split(':').map(Number);
      const total = h * 60 + m + 5;
      const nh = Math.floor(total / 60) % 24;
      const nm = total % 60;
      history = [
        ...currentData.history.slice(1),
        {
          time: `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`,
          temperature: temperatura,
          humidity: humedad,
          pressure: presion,
          rain: lluvia / 10,
        },
      ];
    }

    const intenso = lluvia >= 70;
    const estadoLluvia = intenso ? 'LLUVIA INTENSA' : lluvia >= 30 ? 'LLUVIA LIGERA' : 'SIN LLUVIA';
    const alerta = intenso ? 'LLUVIA INTENSA DETECTADA' : null;

    currentData = {
      ...currentData,
      temperatura,
      humedad,
      lluvia,
      presion,
      hora,
      history,
      estadoLluvia,
      alerta,
    };

    return currentData;
  },
};
