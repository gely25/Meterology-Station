export const THRESHOLDS = {
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
    excellent: 600,
    acceptable: 1000,
    regular: 1400,
    bad: 1800,
  }
} as const;

export type Thresholds = typeof THRESHOLDS;
