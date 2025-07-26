import { useEffect, useRef } from 'react';

interface PerformanceMetrics {
  renderTime: number;
  componentName: string;
}

/**
 * Hook to measure component render performance
 * Only active in development mode to avoid production overhead
 */
export function usePerformance(componentName: string) {
  const startTime = useRef<number>();
  const renderCount = useRef<number>(0);

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      startTime.current = performance.now();
      renderCount.current++;
    }
  });

  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && startTime.current) {
      const endTime = performance.now();
      const renderTime = endTime - startTime.current;
      
      // Log slow renders (>16ms is noticeable)
      if (renderTime > 16) {
        console.warn(`[Performance] ${componentName} render took ${renderTime.toFixed(2)}ms (render #${renderCount.current})`);
      }
      
      // Log excessive re-renders
      if (renderCount.current > 10) {
        console.warn(`[Performance] ${componentName} has rendered ${renderCount.current} times - consider optimization`);
      }
    }
  });

  // Reset render count periodically to avoid false positives
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      const interval = setInterval(() => {
        renderCount.current = 0;
      }, 30000); // Reset every 30 seconds
      
      return () => clearInterval(interval);
    }
  }, []);
}

/**
 * Hook to measure and log async operation performance
 */
export function useAsyncPerformance() {
  const measureAsync = async <T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> => {
    const startTime = performance.now();
    
    try {
      const result = await operation();
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      if (process.env.NODE_ENV === 'development') {
        if (duration > 1000) {
          console.warn(`[Performance] ${operationName} took ${duration.toFixed(2)}ms - consider optimization`);
        } else {
          console.log(`[Performance] ${operationName} completed in ${duration.toFixed(2)}ms`);
        }
      }
      
      return result;
    } catch (error) {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      if (process.env.NODE_ENV === 'development') {
        console.error(`[Performance] ${operationName} failed after ${duration.toFixed(2)}ms:`, error);
      }
      
      throw error;
    }
  };

  return { measureAsync };
}

export default usePerformance;