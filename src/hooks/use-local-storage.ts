"use client";
import { useState, useEffect, useCallback } from 'react';

function getStoredValue<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') {
    return defaultValue;
  }
  const storedValue = localStorage.getItem(key);
  if (storedValue === null) {
    return defaultValue;
  }
  try {
    return JSON.parse(storedValue) as T;
  } catch (error) {
    console.error(`Error parsing localStorage key “${key}”:`, error);
    return defaultValue;
  }
}

export function useLocalStorage<T>(key: string, defaultValue: T): [T, (value: T | ((val: T) => T)) => void] {
  const [value, setValue] = useState<T>(defaultValue);

  useEffect(() => {
    // This effect runs only on the client after mount
    setValue(getStoredValue(key, defaultValue));
  }, [key, defaultValue]);


  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === key && event.newValue) {
        try {
          setValue(JSON.parse(event.newValue) as T);
        } catch (error) {
          console.error(`Error parsing new storage value for key “${key}”:`, error);
        }
      } else if (event.key === key && !event.newValue) {
        // Value was removed or set to null
        setValue(defaultValue);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [key, defaultValue]);

  const setStoredValue = useCallback((newValue: T | ((val: T) => T)) => {
    setValue(prevValue => {
      const valueToStore = newValue instanceof Function ? newValue(prevValue) : newValue;
      if (typeof window !== 'undefined') {
        localStorage.setItem(key, JSON.stringify(valueToStore));
      }
      return valueToStore;
    });
  }, [key]);

  return [value, setStoredValue];
}
