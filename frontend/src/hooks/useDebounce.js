import { useState, useEffect } from 'react';

/**
 * Custom hook that delays updating a value until after `delay` ms
 * have elapsed since the last change (prevents firing an API call on every keystroke).
 */
export function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

