import { WeatherData, HistoryPoint, SystemEvent, EventType } from '../types/weather';
import { THRESHOLDS } from '../lib/thresholds';

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
  useSimulation: boolean;
}

const DEFAULT_CONFIG: AppConfig = {
  ip: '10.190.197.198',
  port: '80',
  interval: 1000,
  autoReconnect: true,
  theme: 'system',
  useSimulation: false,
};

class WeatherService {
  private config: AppConfig;
  private currentData: WeatherData;
  private subscribers: Set<(data: WeatherData) => void> = new Set();
  private timer: ReturnType<typeof setInterval> | null = null;
  private tick: number = 0;
  private lastFetchTime: number = Date.now();
  private isFetching: boolean = false;
  private consecutiveFailures: number = 0;

  constructor() {
    this.config = this.loadConfig();
    this.currentData = this.getInitialData();
    // Solo arrancar el polling en el navegador. En el servidor (SSR de Next.js)
    // este singleton también se instancia al importar el módulo, y sin este guard
    // dispararía fetch()/setInterval() en el servidor innecesariamente.
    if (typeof window !== 'undefined') {
      this.start();
    }
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
    const oldConfig = { ...this.config };
    this.config = { ...this.config, ...newConfig };
    if (typeof window !== 'undefined') {
      localStorage.setItem('weatherConfig', JSON.stringify(this.config));
    }
    // Log config change event
    const changes: string[] = [];
    if (newConfig.interval !== undefined && newConfig.interval !== oldConfig.interval) changes.push(`intervalo: ${newConfig.interval}ms`);
    if (newConfig.useSimulation !== undefined && newConfig.useSimulation !== oldConfig.useSimulation) changes.push(newConfig.useSimulation ? 'simulación activada' : 'modo hardware activado');
    if (newConfig.ip !== undefined && newConfig.ip !== oldConfig.ip) changes.push(`IP: ${newConfig.ip}`);
    if (newConfig.theme !== undefined && newConfig.theme !== oldConfig.theme) changes.push(`tema: ${newConfig.theme}`);
    if (changes.length > 0) {
      this.addEvent(`Configuración actualizada: ${changes.join(', ')}`, 'info');
    }
    // Restart interval if changed or if simulation toggled
    if (newConfig.interval || newConfig.useSimulation !== undefined) {
      this.stop();
      this.start();
    }
  }


  public getConfig(): AppConfig {
    return { ...this.config };
  }

  // --- Event Handling ---
  public addEvent(message: string, type: EventType) {
    const time = new Date().toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' });
    const newEvent: SystemEvent = {
      id: generateId(),
      time,
      type,
      message,
      timestamp: Date.now(),
    };
    this.currentData.events = [newEvent, ...this.currentData.events].slice(0, 100); // Keep last 100 events
  }

  // --- Core Logic ---
  private getInitialData(): WeatherData {
    const time = new Date().toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const history: HistoryPoint[] = [];

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
      conexionESP32: 'desconectado',
      estadoCalidadAire: 'Calculando...',
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
        // ── Sistema (boot sequence) ────────────────────────────────────
        { id: generateId(), time: new Date().toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' }), type: 'success', message: 'Sistema iniciado — firmware v1.0', timestamp: Date.now() - 8000 },
        { id: generateId(), time: new Date().toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' }), type: 'success', message: 'LED verde activado — sistema en standby', timestamp: Date.now() - 7500 },
        { id: generateId(), time: new Date().toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' }), type: 'info', message: 'Modo operativo: monitoreo continuo habilitado', timestamp: Date.now() - 7000 },
        // ── Conectividad ───────────────────────────────────────────────
        { id: generateId(), time: new Date().toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' }), type: 'info', message: 'ESP32 conectado', timestamp: Date.now() - 6500 },
        { id: generateId(), time: new Date().toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' }), type: 'info', message: 'WiFi conectado', timestamp: Date.now() - 6000 },
        // ── Sensores ───────────────────────────────────────────────────
        { id: generateId(), time: new Date().toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' }), type: 'success', message: 'Sensor AHT10 inicializado correctamente', timestamp: Date.now() - 5500 },
        { id: generateId(), time: new Date().toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' }), type: 'success', message: 'Sensor BMP280 inicializado correctamente', timestamp: Date.now() - 5000 },
        { id: generateId(), time: new Date().toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' }), type: 'success', message: 'Sensor MQ135 inicializado correctamente', timestamp: Date.now() - 4500 },
        { id: generateId(), time: new Date().toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' }), type: 'success', message: 'Sensor de lluvia inicializado correctamente', timestamp: Date.now() - 4000 },
        { id: generateId(), time: new Date().toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' }), type: 'success', message: 'Calidad del aire: Buena — MQ135 en rango normal', timestamp: Date.now() - 3500 },
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
    if (lluvia >= THRESHOLDS.rain.heavy) return 'Lluvia intensa';
    if (lluvia >= THRESHOLDS.rain.detected) return 'Lluvia detectada';
    if (humedad > THRESHOLDS.humidity.comfortMax) return 'Ambiente húmedo';
    return 'Ambiente despejado';
  }

  private async fetchRealData() {
    if (this.isFetching) return; // Prevent concurrent fetch requests from overlapping

    if (!this.config.useSimulation) {
      this.isFetching = true;
      let response: Response;
      const startTime = Date.now();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      try {
        response = await fetch(`http://${this.config.ip}:${this.config.port}/api/data`, { signal: controller.signal });
        clearTimeout(timeoutId);
      } catch (err: any) {
        clearTimeout(timeoutId);
        this.isFetching = false;

        this.consecutiveFailures++;
        if (this.consecutiveFailures >= 3) {
          this.handleDisconnection();
        }
        return;
      }

      if (!response.ok) {
        this.isFetching = false;
        this.consecutiveFailures++;
        if (this.consecutiveFailures >= 3) {
          this.handleDisconnection();
        }
        return;
      }

      // Reset failures on successful fetch
      this.consecutiveFailures = 0;

      let espData;
      try {
        espData = await response.json();
      } catch (err) {
        this.isFetching = false;
        return;
      }
      this.isFetching = false;
      const latency = Date.now() - startTime;

      const now = new Date();
      this.lastFetchTime = Date.now();
      const hora = now.toLocaleTimeString('es-EC', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });

      const temperatura = typeof espData.temperatura === 'number' && !isNaN(espData.temperatura) ? espData.temperatura : 0.0;
      const humedad = typeof espData.humedad === 'number' && !isNaN(espData.humedad) ? espData.humedad : 0.0;
      const nivelLluvia = typeof espData.nivelLluvia === 'number' && !isNaN(espData.nivelLluvia) ? espData.nivelLluvia : 0.0;
      const presion = typeof espData.presion === 'number' && !isNaN(espData.presion) ? espData.presion : 0.0;
      const calidadAire = typeof espData.calidadAire === 'number' && !isNaN(espData.calidadAire) ? espData.calidadAire : 0.0;
      const wifiRSSI = typeof espData.wifiRSSI === 'number' && !isNaN(espData.wifiRSSI) ? espData.wifiRSSI : 0.0;

      this.tick += 1;
      let history = this.currentData.history;

      // Ventana deslizante: mantener solo los últimos 3600 elementos (buffer en memoria)
      const newPoint = {
        time: hora,
        timestamp: Date.now(),
        temperature: temperatura,
        humidity: humedad,
        pressure: presion,
        rain: nivelLluvia / 10,
        airQuality: calidadAire,
      };

      history = [...history.slice(history.length >= 3600 ? 1 : 0), newPoint];

      const intenso = nivelLluvia >= THRESHOLDS.rain.heavy;
      const estadoLluvia = intenso ? 'Intensa' : nivelLluvia >= THRESHOLDS.rain.detected ? 'Ligera' : 'Seco';
      const alertaActiva = intenso ? 'LLUVIA INTENSA DETECTADA' : null;
      const estadoClima = this.deriveWeatherState(nivelLluvia, humedad);

      // ── EVENT TRIGGERS ─────────────────────────────────────────────────────

      // Sistema: alarma + actuadores (buzzer, LED rojo)
      if (alertaActiva && !this.currentData.alertaActiva) {
        this.addEvent('Alarma activada: lluvia intensa detectada', 'alert');
        this.addEvent('Actuador buzzer: activado por alarma de lluvia', 'alert');
        this.addEvent('Actuador LED rojo: encendido — alerta activa', 'alert');
      } else if (!alertaActiva && this.currentData.alertaActiva) {
        this.addEvent('Alarma desactivada: sistema volvió a estado normal', 'success');
        this.addEvent('Actuador buzzer: desactivado', 'success');
        this.addEvent('Actuador LED rojo: apagado — sistema en standby', 'success');
      }

      // Sensores: transiciones de lluvia
      if (nivelLluvia >= THRESHOLDS.rain.detected && this.currentData.nivelLluvia < THRESHOLDS.rain.detected) {
        this.addEvent('Sensor de lluvia: precipitación detectada', 'warning');
      } else if (nivelLluvia < THRESHOLDS.rain.detected && this.currentData.nivelLluvia >= THRESHOLDS.rain.detected) {
        this.addEvent('Sensor de lluvia: precipitación finalizada', 'success');
      }

      if (this.currentData.conexionESP32 === 'desconectado') {
        this.addEvent('ESP32 conectado', 'success');
        this.addEvent('WiFi conectado', 'success');
      }

      const nextAHT10 = espData.estadoAHT10 || 'operativo';
      const nextBMP280 = espData.estadoBMP280 || 'operativo';
      const nextMQ135 = espData.estadoMQ135 || 'operativo';
      const nextLluvia = espData.estadoSensorLluvia || 'operativo';

      if (nextAHT10 === 'desconectado' && this.currentData.estadoAHT10 !== 'desconectado') {
        this.addEvent('Sensor AHT10 desconectado', 'alert');
      } else if (nextAHT10 === 'operativo' && this.currentData.estadoAHT10 === 'desconectado') {
        this.addEvent('Sensor AHT10 reconectado', 'success');
      }

      if (nextBMP280 === 'desconectado' && this.currentData.estadoBMP280 !== 'desconectado') {
        this.addEvent('Sensor BMP280 desconectado', 'alert');
      } else if (nextBMP280 === 'operativo' && this.currentData.estadoBMP280 === 'desconectado') {
        this.addEvent('Sensor BMP280 reconectado', 'success');
      }

      if (nextMQ135 === 'desconectado' && this.currentData.estadoMQ135 !== 'desconectado') {
        this.addEvent('Sensor MQ135 desconectado', 'alert');
      } else if (nextMQ135 === 'operativo' && this.currentData.estadoMQ135 === 'desconectado') {
        this.addEvent('Sensor MQ135 reconectado', 'success');
      }

      if (nextLluvia === 'desconectado' && this.currentData.estadoSensorLluvia !== 'desconectado') {
        this.addEvent('Sensor de lluvia desconectado', 'alert');
      } else if (nextLluvia === 'operativo' && this.currentData.estadoSensorLluvia === 'desconectado') {
        this.addEvent('Sensor de lluvia reconectado', 'success');
      }

      // Sensores: cambio de categoría de calidad del aire (MQ135)
      const newAQCat = calidadAire < THRESHOLDS.airQuality.excellent ? 'Excelente' : calidadAire < THRESHOLDS.airQuality.acceptable ? 'Buena' : calidadAire < THRESHOLDS.airQuality.regular ? 'Moderada' : calidadAire < THRESHOLDS.airQuality.bad ? 'Mala' : 'Muy mala';
      const oldAQCat = this.currentData.calidadAire < THRESHOLDS.airQuality.excellent ? 'Excelente' : this.currentData.calidadAire < THRESHOLDS.airQuality.acceptable ? 'Buena' : this.currentData.calidadAire < THRESHOLDS.airQuality.regular ? 'Moderada' : this.currentData.calidadAire < THRESHOLDS.airQuality.bad ? 'Mala' : 'Muy mala';
      if (newAQCat !== oldAQCat) {
        const aqType = (newAQCat === 'Mala' || newAQCat === 'Muy mala') ? 'warning' as EventType : 'success' as EventType;
        this.addEvent(`Sensor MQ135: calidad del aire cambió a ${newAQCat}`, aqType);
      }

      // Sistema: hito de uptime cada 30 minutos (1800 ticks a 1 seg)
      const wifiCalidad = this.deriveWiFiQuality(wifiRSSI);
      const uptimeMins = Math.floor(this.tick / 60);
      const uptime = `${Math.floor(uptimeMins / 60)}h ${uptimeMins % 60}m`;
      if (this.tick > 0 && this.tick % 1800 === 0) {
        this.addEvent(`Uptime: ${uptime} — sistema operando sin interrupciones`, 'success');
      }

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
        latency,
        conexionESP32: 'conectado',
        estadoCalidadAire: espData.estadoCalidadAire || (calidadAire < 100 ? "BUENA" : calidadAire < 200 ? "MODERADA" : "MALA"),
        estadoAHT10: espData.estadoAHT10 || 'operativo',
        estadoBMP280: espData.estadoBMP280 || 'operativo',
        estadoMQ135: espData.estadoMQ135 || 'operativo',
        estadoSensorLluvia: espData.estadoSensorLluvia || 'operativo',
        estadoOLED: espData.estadoOLED || 'operativo',
        estadoLedVerde: espData.estadoLedVerde || 'operativo',
        estadoLedRojo: espData.estadoLedRojo || 'operativo',
        estadoBuzzer: espData.estadoBuzzer || 'operativo',
      };

      this.notify();
      return;
    }

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

    // Ventana deslizante: mantener solo los últimos 3600 elementos (buffer en memoria)
    const newPoint = {
      time: hora,
      timestamp: Date.now(),
      temperature: temperatura,
      humidity: humedad,
      pressure: presion,
      rain: nivelLluvia / 10,
      airQuality: calidadAire,
    };

    history = [...history.slice(history.length >= 3600 ? 1 : 0), newPoint];

    const intenso = nivelLluvia >= THRESHOLDS.rain.heavy;
    const estadoLluvia = intenso ? 'Intensa' : nivelLluvia >= THRESHOLDS.rain.detected ? 'Ligera' : 'Seco';
    const alertaActiva = intenso ? 'LLUVIA INTENSA DETECTADA' : null;
    const estadoClima = this.deriveWeatherState(nivelLluvia, humedad);

    // ── EVENT TRIGGERS ────────────────────────────────────────────────────────

    // Sistema: alarma + actuadores (buzzer, LED rojo)
    if (alertaActiva && !this.currentData.alertaActiva) {
      this.addEvent('Alarma activada: lluvia intensa detectada', 'alert');
      this.addEvent('Actuador buzzer: activado por alarma de lluvia', 'alert');
      this.addEvent('Actuador LED rojo: encendido — alerta activa', 'alert');
    } else if (!alertaActiva && this.currentData.alertaActiva) {
      this.addEvent('Alarma desactivada: sistema volvió a estado normal', 'success');
      this.addEvent('Actuador buzzer: desactivado', 'success');
      this.addEvent('Actuador LED rojo: apagado — sistema en standby', 'success');
    }

    // Sensores: transiciones de lluvia
    if (nivelLluvia >= THRESHOLDS.rain.detected && this.currentData.nivelLluvia < THRESHOLDS.rain.detected) {
      this.addEvent('Sensor de lluvia: precipitación detectada', 'warning');
    } else if (nivelLluvia < THRESHOLDS.rain.detected && this.currentData.nivelLluvia >= THRESHOLDS.rain.detected) {
      this.addEvent('Sensor de lluvia: precipitación finalizada', 'success');
    }

    // Conectividad: reconexión
    if (this.currentData.conexionESP32 === 'desconectado') {
      this.addEvent('ESP32 conectado', 'success');
      this.addEvent('WiFi conectado', 'success');
    }

    // Sensores: calidad del aire (MQ135)
    const newAQCat = calidadAire < THRESHOLDS.airQuality.excellent ? 'Excelente' : calidadAire < THRESHOLDS.airQuality.acceptable ? 'Moderada' : 'Mala';
    const oldAQCat = this.currentData.calidadAire < THRESHOLDS.airQuality.excellent ? 'Excelente' : this.currentData.calidadAire < THRESHOLDS.airQuality.acceptable ? 'Moderada' : 'Mala';
    if (newAQCat !== oldAQCat) {
      const aqType: EventType = (newAQCat === 'Mala') ? 'warning' : 'success';
      this.addEvent(`Sensor MQ135: calidad del aire cambió a ${newAQCat}`, aqType);
    }

    // Sensores: umbrales de temperatura (AHT10)
    if (temperatura > THRESHOLDS.temperature.max && this.currentData.temperatura <= THRESHOLDS.temperature.max) {
      this.addEvent(`Sensor AHT10: temperatura superó ${THRESHOLDS.temperature.max} °C`, 'warning');
    } else if (temperatura < THRESHOLDS.temperature.min && this.currentData.temperatura >= THRESHOLDS.temperature.min) {
      this.addEvent(`Sensor AHT10: temperatura bajo ${THRESHOLDS.temperature.min} °C`, 'warning');
    }

    // Sensores: umbrales de humedad (AHT10)
    if (humedad > THRESHOLDS.humidity.max && this.currentData.humedad <= THRESHOLDS.humidity.max) {
      this.addEvent(`Sensor AHT10: humedad superó ${THRESHOLDS.humidity.max}%`, 'warning');
    } else if (humedad < THRESHOLDS.humidity.min && this.currentData.humedad >= THRESHOLDS.humidity.min) {
      this.addEvent(`Sensor AHT10: humedad bajo ${THRESHOLDS.humidity.min}%`, 'warning');
    }

    // Sensores: umbrales de presión (BMP280)
    if (presion < THRESHOLDS.pressure.min && this.currentData.presion >= THRESHOLDS.pressure.min) {
      this.addEvent(`Sensor BMP280: presión bajo ${THRESHOLDS.pressure.min} hPa`, 'warning');
    } else if (presion > THRESHOLDS.pressure.max && this.currentData.presion <= THRESHOLDS.pressure.max) {
      this.addEvent(`Sensor BMP280: presión superó ${THRESHOLDS.pressure.max} hPa`, 'info');
    }

    // Sistema: hito de uptime cada 30 minutos (1800 ticks a 1 seg)
    const wifiCalidad = this.deriveWiFiQuality(wifiRSSI);
    const uptimeMins = Math.floor(this.tick / 60);
    const uptime = `${Math.floor(uptimeMins / 60)}h ${uptimeMins % 60}m`;
    if (this.tick > 0 && this.tick % 1800 === 0) {
      this.addEvent(`Uptime: ${uptime} — sistema operando sin interrupciones`, 'success');
    }
    const latency = 12 + Math.floor(Math.random() * 8);

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
      estadoCalidadAire: calidadAire < THRESHOLDS.airQuality.excellent ? 'BUENA' : calidadAire < THRESHOLDS.airQuality.acceptable ? 'MODERADA' : 'MALA',
      alertaActiva,
      wifiRSSI,
      wifiCalidad,
      ultimaActualizacion: hora,
      uptime,
      latency,
      conexionESP32: 'conectado',
      estadoAHT10: 'operativo',
      estadoBMP280: 'operativo',
      estadoMQ135: 'operativo',
      estadoSensorLluvia: 'operativo',
      estadoOLED: 'operativo',
      estadoLedVerde: 'operativo',
      estadoLedRojo: 'operativo',
      estadoBuzzer: intenso ? 'operativo' : 'operativo',
    };

    this.notify();
  }

  private handleDisconnection() {
    if (this.currentData.conexionESP32 !== 'desconectado') {
      this.addEvent('ESP32 desconectado', 'alert');

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
    if (typeof window === 'undefined') return; // nunca ejecutar polling en el servidor

    if (this.timer) clearInterval(this.timer);

    // Ejecutar una petición inicial inmediata para evitar retraso al arrancar o guardar
    // fetchRealData ya maneja errores internamente — no lanza excepciones
    this.fetchRealData();

    this.timer = setInterval(() => {
      this.fetchRealData();
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