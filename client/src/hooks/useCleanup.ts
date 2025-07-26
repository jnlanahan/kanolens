import { useEffect, useRef } from 'react';

/**
 * Hook to ensure cleanup functions are called on unmount
 * Prevents memory leaks from unfinished async operations
 */
export function useCleanup() {
  const cleanupFunctions = useRef<Array<() => void>>([]);
  const isMountedRef = useRef(true);

  const addCleanup = (cleanup: () => void) => {
    cleanupFunctions.current.push(cleanup);
  };

  const isMounted = () => isMountedRef.current;

  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      isMountedRef.current = false;
      // Execute all cleanup functions
      cleanupFunctions.current.forEach(cleanup => {
        try {
          cleanup();
        } catch (error) {
          console.warn('Cleanup function failed:', error);
        }
      });
      cleanupFunctions.current = [];
    };
  }, []);

  return { addCleanup, isMounted };
}

/**
 * Hook for safe async operations that checks if component is still mounted
 * before setting state
 */
export function useSafeAsync() {
  const { isMounted, addCleanup } = useCleanup();

  const safeAsync = async <T>(
    asyncOperation: () => Promise<T>,
    onSuccess?: (result: T) => void,
    onError?: (error: Error) => void
  ) => {
    try {
      const result = await asyncOperation();
      if (isMounted() && onSuccess) {
        onSuccess(result);
      }
      return result;
    } catch (error) {
      if (isMounted() && onError) {
        onError(error as Error);
      }
      throw error;
    }
  };

  return { safeAsync, addCleanup, isMounted };
}

export default useCleanup;