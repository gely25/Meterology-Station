import { WeatherData, HistoryPoint, SystemEvent, EventType } from '../types/weather';

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

// Config interface
export interface AppConfig {
  ip: string;
  port: string;
  interval: number;
  autoReconnect: boolean;
  theme: 'light' | 'dark' | 'system';
}

const DEFAULT_CONFIG: AppConfig = {
  ip: '192.168.1.100',
  port: '80',
  interval: 1000,
  autoReconnect: true,
  theme: 'system',
};

class WeatherService {
  private config: AppConfig;
  private currentData: WeatherData;
  private subscribers: Set<(data: WeatherData) => void> = new Set();
  private timer: ReturnType<typeof setInterval> | null = null;
  private tick: number = 0;
  private lastFetchTime: number = Date.now();
  
  constructor() {
    this.config = this.loadConfig();
    this.currentData = this.getInitialData();
    this.start();
  }

  // --- Configuration ---
  private loadConfig(): AppConfig {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('weatherConfig');
      if (saved) {
        try {
          return { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
        } catch (e) {
          console.error("Failed to parse config", e);
        }
      }
    }
    return DEFAULT_CONFIG;
  }

  public saveConfig(newConfig: Partial<AppConfig>) {
    this.config = { ...this.config, ...newConfig };
    if (typeof window !== 'undefined') {
      localStorage.setItem('weatherConfig', JSON.stringify(this.config));
    }
    // Restart interval if changed
    if (newConfig.interval) {
      this.stop();
      this.start();
    }
  }

  public getConfig(): AppConfig {
    return { ...this.config };
  }

  // --- Event Handling ---
  private addEvent(message: string, type: EventType) {
    const time = new Date().toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' });
    const newEvent: SystemEvent = {
      id: generateId(),
      time,
      type,
      message,
    };
    this.currentData.events = [newEvent, ...this.currentData.events].slice(0, 50); // Keep last 50 events
  }

  // --- Core Logic ---
  private getInitialData(): WeatherData {
    const time = new Date().toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    
    // Seed initial history
    const history: HistoryPoint[] = [];
    const start = 13 * 60 + 30; // 13:30
    for (let i = 0; i < 13; i++) {
      const mins = start + i * 5;
      const hh = Math.floor(mins / 60);
      const mm = mins % 60;
      history.push({
        time: `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`,
        temperature: 18 + Math.sin(i / 2) * 4 + Math.random() * 2,
        humidity: 55 + Math.cos(i / 3) * 8 + Math.random() * 4,
        pressure: 1012 + Math.sin(i / 4) * 3,
        rain: 2 + Math.random() * 3,
        airQuality: 60 + Math.random() * 20,
      });
    }

    return {
      temperatura: 23.6,
      humedad: 65,
      presion: 1012.7,
      calidadAire: 65,
      nivelLluvia: 0,
      estadoLluvia: 'Seco',
      estadoClima: 'Ambiente despejado',
      hora: time,
      fecha: new Date().toLocaleDateString('es-EC', { day: 'numeric', month: 'short', year: 'numeric' }),
      ultimaActualizacion: time,
      uptime: '0h 0m',
      conexionESP32: 'conectado',
      wifiRSSI: -45,
      wifiCalidad: 'Excelente',
      estadoAHT10: 'operativo',
      estadoBMP280: 'operativo',
      estadoMQ135: 'operativo',
      estadoSensorLluvia: 'operativo',
      estadoOLED: 'operativo',
      estadoLedVerde: 'operativo',
      estadoLedRojo: 'operativo',
      estadoBuzzer: 'operativo',
      alertaActiva: null,
      history,
      events: [
        { id: generateId(), time: new Date().toLocaleTimeString('es-EC', {hour:'2-digit', minute:'2-digit'}), type: 'success', message: 'Sistema iniciado' },
        { id: generateId(), time: new Date().toLocaleTimeString('es-EC', {hour:'2-digit', minute:'2-digit'}), type: 'info', message: 'ESP32 conectado' }
      ],
    };
  }

  private deriveWiFiQuality(rssi: number): 'Excelente' | 'Muy buena' | 'Buena' | 'Débil' | 'Sin conexión' {
    if (rssi > -50) return 'Excelente';
    if (rssi > -60) return 'Muy buena';
    if (rssi > -70) return 'Buena';
    if (rssi > -85) return 'Débil';
    return 'Sin conexión';
  }

  private deriveWeatherState(lluvia: number, humedad: number): string {
    if (lluvia >= 70) return 'Lluvia intensa';
    if (lluvia > 20) return 'Lluvia detectada';
    if (humedad > 70) return 'Ambiente húmedo';
    return 'Ambiente despejado';
  }

  private async fetchRealData() {
    // In a real implementation:
    // const response = await fetch(`http://${this.config.ip}:${this.config.port}/api/data`);
    // const data = await response.json();
    // return data;
    
    // MOCK DATA GENERATION FOR NOW
    this.tick += 1;
    const now = new Date();
    this.lastFetchTime = Date.now();
    
    const hora = now.toLocaleTimeString('es-EC', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    const temperatura = clamp(this.currentData.temperatura + (Math.random() - 0.5) * 0.6, 18, 29);
    const humedad = clamp(this.currentData.humedad + (Math.random() - 0.5) * 2, 40, 95);
    const nivelLluvia = clamp(this.currentData.nivelLluvia + (Math.random() - 0.5) * 4, 0, 100);
    const presion = clamp(this.currentData.presion + (Math.random() - 0.5) * 0.8, 995, 1030);
    const calidadAire = clamp(this.currentData.calidadAire + (Math.random() - 0.5) * 5, 40, 300);
    const wifiRSSI = clamp(this.currentData.wifiRSSI + (Math.random() - 0.5) * 2, -90, -30);

    let history = this.currentData.history;
    if (this.tick % 5 === 0) {
      const last = this.currentData.history[this.currentData.history.length - 1];
      const [h, m] = last.time.split(':').map(Number);
      const total = h * 60 + m + 5;
      const nh = Math.floor(total / 60) % 24;
      const nm = total % 60;
      history = [
        ...this.currentData.history.slice(1),
        {
          time: `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`,
          temperature: temperatura,
          humidity: humedad,
          pressure: presion,
          rain: nivelLluvia / 10,
          airQuality: calidadAire,
        },
      ];
    }

    const intenso = nivelLluvia >= 70;
    const estadoLluvia = intenso ? 'Intensa' : nivelLluvia >= 20 ? 'Ligera' : 'Seco';
    const alertaActiva = intenso ? 'LLUVIA INTENSA DETECTADA' : null;
    const estadoClima = this.deriveWeatherState(nivelLluvia, humedad);
    
    // Event Triggers
    if (alertaActiva && !this.currentData.alertaActiva) {
      this.addEvent('Alarma activada: Lluvia intensa', 'alert');
      this.addEvent('Lluvia intensa detectada', 'warning');
    } else if (!alertaActiva && this.currentData.alertaActiva) {
      this.addEvent('Alarma desactivada', 'success');
    }
    
    if (this.currentData.conexionESP32 === 'desconectado') {
      this.addEvent('ESP32 reconectado', 'success');
    }

    const wifiCalidad = this.deriveWiFiQuality(wifiRSSI);
    const uptime = `0h ${Math.floor(this.tick / 60)}m`;

    this.currentData = {
      ...this.currentData,
      temperatura,
      humedad,
      nivelLluvia,
      presion,
      calidadAire,
      hora,
      history,
      estadoLluvia,
      estadoClima,
      alertaActiva,
      wifiRSSI,
      wifiCalidad,
      ultimaActualizacion: hora,
      uptime,
      conexionESP32: 'conectado',
      estadoAHT10: 'operativo',
      estadoBMP280: 'operativo',
      estadoMQ135: 'operativo',
      estadoSensorLluvia: 'operativo',
      estadoOLED: 'operativo',
      estadoLedVerde: 'operativo',
      estadoLedRojo: intenso ? 'operativo' : 'operativo', // Just indicating it works
      estadoBuzzer: intenso ? 'operativo' : 'operativo',
    };

    this.notify();
  }

  private handleDisconnection() {
    if (this.currentData.conexionESP32 !== 'desconectado') {
      this.addEvent('ESP32 desconectado (timeout)', 'alert');
      
      this.currentData = {
        ...this.currentData,
        conexionESP32: 'desconectado',
        wifiCalidad: 'Sin conexión',
        alertaActiva: null,
        estadoAHT10: 'desconectado',
        estadoBMP280: 'desconectado',
        estadoMQ135: 'desconectado',
        estadoSensorLluvia: 'desconectado',
        estadoOLED: 'desconectado',
        estadoLedVerde: 'desconectado',
        estadoLedRojo: 'desconectado',
        estadoBuzzer: 'desconectado',
      };
      this.notify();
    }
  }

  public start() {
    if (this.timer) clearInterval(this.timer);
    
    this.timer = setInterval(async () => {
      try {
        await this.fetchRealData();
      } catch (err) {
        console.error('Fetch error:', err);
        // Timeout logic: if it's been more than (interval * 3) since last fetch
        if (Date.now() - this.lastFetchTime > this.config.interval * 3) {
           this.handleDisconnection();
        }
      }
    }, this.config.interval);
  }

  public stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  // --- Subscriptions ---
  public subscribe(callback: (data: WeatherData) => void) {
    this.subscribers.add(callback);
    callback(this.currentData); // Send immediate current state
    return () => this.subscribers.delete(callback);
  }

  private notify() {
    this.subscribers.forEach(cb => cb(this.currentData));
  }
  
  public forceEvent(msg: string, type: EventType) {
      this.addEvent(msg, type);
      this.notify();
  }
}

// Export singleton instance
export const weatherService = new WeatherService();
