import { useEffect, useState } from 'react';
import { weatherService } from '../services/weatherService';
import { WeatherData } from '../types/weather';

export function useWeather() {
  const [data, setData] = useState<WeatherData | null>(null);

  useEffect(() => {
    let mounted = true;

    async function fetchData() {
      try {
        const newData = await weatherService.getWeatherData();
        if (mounted) {
          setData(newData);
        }
      } catch (error) {
        console.error('Error fetching weather data:', error);
      }
    }

    // Initial fetch
    fetchData();

    // Poll every second to simulate real-time updates
    const interval = setInterval(fetchData, 1000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return data;
}
