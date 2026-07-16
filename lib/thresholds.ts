export const DEFAULT_THRESHOLDS = {
  temperature: {
    min: 19,
    max: 28,
  },
  humidity: {
    min: 40,
    comfortMax: 70,
    max: 85,
  },
  pressure: {
    min: 1008,
    max: 1020,
  },
  rain: {
    detected: 20,
    heavy: 70,
  },
  airQuality: {
    excellent: 200,     // Margen Moderado (Aire limpio si delta < 200)
    acceptable: 500,    // Margen Malo (Calidad moderada si delta < 500)
    regular: 900,       // Margen Peligroso (Calidad mala si delta < 900)
    bad: 900,           // Peligroso si delta >= 900
  }
} as const;

export type Thresholds = typeof DEFAULT_THRESHOLDS;

// Objeto mutable interno inicializado con los valores por defecto
let currentThresholds = JSON.parse(JSON.stringify(DEFAULT_THRESHOLDS)) as {
  temperature: { min: number; max: number };
  humidity: { min: number; comfortMax: number; max: number };
  pressure: { min: number; max: number };
  rain: { detected: number; heavy: number };
  airQuality: { excellent: number; acceptable: number; regular: number; bad: number };
};

// Cargar desde localStorage si estamos en el cliente
if (typeof window !== "undefined") {
  try {
    const saved = localStorage.getItem("meteorological_thresholds");
    if (saved) {
      const parsed = JSON.parse(saved);
      // Validamos estructura básica para evitar corrupciones
      if (parsed.temperature && parsed.humidity && parsed.pressure && parsed.rain && parsed.airQuality) {
        currentThresholds = parsed;
      }
    }
  } catch (e) {
    console.error("Error loading thresholds from localStorage:", e);
  }
}

export function saveThresholds(newThresholds: typeof currentThresholds) {
  currentThresholds = JSON.parse(JSON.stringify(newThresholds));
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem("meteorological_thresholds", JSON.stringify(newThresholds));
      // Despachar evento para sincronizar componentes
      window.dispatchEvent(new Event("thresholds-updated"));
    } catch (e) {
      console.error("Error saving thresholds to localStorage:", e);
    }
  }
}

export function resetThresholds() {
  saveThresholds(JSON.parse(JSON.stringify(DEFAULT_THRESHOLDS)));
}

export const THRESHOLDS = {
  get temperature() { return currentThresholds.temperature; },
  get humidity() { return currentThresholds.humidity; },
  get pressure() { return currentThresholds.pressure; },
  get rain() { return currentThresholds.rain; },
  get airQuality() { return currentThresholds.airQuality; }
};
