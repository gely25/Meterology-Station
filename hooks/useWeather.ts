import { useEffect, useState } from 'react';
import { weatherService } from '../services/weatherService';
import { WeatherData } from '../types/weather';

export function useWeather() {
  const [data, setData] = useState<WeatherData | null>(null);

  useEffect(() => {
    // Subscribe to real-time updates from the weather service
    const unsubscribe = weatherService.subscribe((newData) => {
      setData({ ...newData });
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return data;
}
