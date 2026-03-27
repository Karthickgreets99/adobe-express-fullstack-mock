/**
 * ADOBE EXPRESS - Custom Hooks
 * Reusable hooks covering key patterns from the JD
 */
import { useState, useEffect, useCallback, useRef } from 'react';

// ─────────────────────────────────────────
// useFetch - data fetching with loading/error states
// ─────────────────────────────────────────
export function useFetch<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      try {
        setLoading(true);
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!cancelled) setData(json);
      } catch (err: any) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();

    // Cleanup - prevent state update on unmounted component
    return () => { cancelled = true; };
  }, [url]);

  return { data, loading, error };
}

// ─────────────────────────────────────────
// useDebounce - debounce search input
// Used in TemplateGallery search
// ─────────────────────────────────────────
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

// ─────────────────────────────────────────
// useWebSocket - managed WebSocket connection
// Used in CollaboratorPresence
// ─────────────────────────────────────────
export function useWebSocket(url: string) {
  const [lastMessage, setLastMessage] = useState<any>(null);
  const [readyState, setReadyState] = useState<number>(WebSocket.CONNECTING);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const socket = new WebSocket(url);
    socketRef.current = socket;

    socket.onopen = () => setReadyState(WebSocket.OPEN);
    socket.onclose = () => setReadyState(WebSocket.CLOSED);
    socket.onerror = () => setReadyState(WebSocket.CLOSED);
    socket.onmessage = (event) => {
      try {
        setLastMessage(JSON.parse(event.data));
      } catch {
        setLastMessage(event.data);
      }
    };

    // Cleanup on unmount
    return () => {
      socket.close();
    };
  }, [url]);

  const sendMessage = useCallback((message: any) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(message));
    }
  }, []);

  return { lastMessage, readyState, sendMessage };
}

// ─────────────────────────────────────────
// useLocalStorage - persistent state
// ─────────────────────────────────────────
export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback((value: T) => {
    try {
      setStoredValue(value);
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('localStorage error:', error);
    }
  }, [key]);

  return [storedValue, setValue] as const;
}
