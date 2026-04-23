import { QueryClient, QueryFunction } from "@tanstack/react-query";

// Helper function to get JWT token from localStorage
function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  
  let token = localStorage.getItem('auth-token');
  
  // In development, provide a default token if none exists
  if (!token && process.env.NODE_ENV === 'development') {
    token = 'dev-token';
    localStorage.setItem('auth-token', token);
  }
  
  return token;
}

// Helper function to clear token on 401 errors
function clearAuthToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('auth-token');
}

// Helper function to create authenticated headers
function getAuthHeaders(includeContentType = false): Record<string, string> {
  const headers: Record<string, string> = {};
  
  if (includeContentType) {
    headers['Content-Type'] = 'application/json';
  }
  
  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    // If we get a 401, clear the stored token as it's likely expired/invalid
    if (res.status === 401) {
      clearAuthToken();
      // For development, create a more informative error message
      const text = (await res.text()) || res.statusText;
      throw new Error(`Authentication required: ${text}. Please use the development login.`);
    }
    
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: getAuthHeaders(!!data),
    body: data ? JSON.stringify(data) : undefined,
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      headers: getAuthHeaders(),
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      clearAuthToken();
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
