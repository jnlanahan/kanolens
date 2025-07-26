import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  analysisCount?: number;
  maxAnalyses?: number;
  createdAt?: string;
  updatedAt?: string;
}

interface LoginData {
  email: string;
  password: string;
}

interface RegisterData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

interface AuthResponse {
  user: User;
  token: string;
}

const TOKEN_KEY = 'auth-token';

// Helper function to get token from localStorage
const getToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
};

// Helper function to set token in localStorage
const setToken = (token: string): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, token);
};

// Helper function to remove token from localStorage
const removeToken = (): void => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
};

// Helper function to make authenticated API calls
const fetchWithAuth = async (url: string, options: RequestInit = {}): Promise<Response> => {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...options.headers,
  };

  return fetch(url, {
    ...options,
    headers,
  });
};

// Helper function to handle API errors
const handleApiError = async (response: Response): Promise<never> => {
  let errorMessage = 'An error occurred';
  
  try {
    const errorData = await response.json();
    errorMessage = errorData.message || errorMessage;
  } catch {
    // If JSON parsing fails, use status text or default message
    errorMessage = response.statusText || errorMessage;
  }
  
  throw new Error(errorMessage);
};

export function useAuth() {
  const queryClient = useQueryClient();

  // Query to fetch current user info
  const { data: user, isLoading, error } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    queryFn: async (): Promise<User | null> => {
      const token = getToken();
      if (!token) return null;

      try {
        const response = await fetchWithAuth('/api/auth/user');
        
        if (!response.ok) {
          if (response.status === 401) {
            // Token is invalid, remove it
            removeToken();
            return null;
          }
          await handleApiError(response);
        }

        return await response.json();
      } catch (error) {
        // If there's any error, clear the token and return null
        removeToken();
        return null;
      }
    },
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Development auto-login function
  const devLogin = useCallback(async (): Promise<void> => {
    try {
      const response = await fetch('/api/auth/dev', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Development login failed');
      }

      const data: AuthResponse = await response.json();
      setToken(data.token);
      
      // Invalidate and refetch user data
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    } catch (error) {
      console.warn('Development login failed:', error);
      throw error;
    }
  }, [queryClient]);

  // Login function
  const login = useCallback(async (loginData: LoginData): Promise<void> => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(loginData),
      });

      if (!response.ok) {
        await handleApiError(response);
      }

      const data: AuthResponse = await response.json();
      setToken(data.token);
      
      // Invalidate and refetch user data
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    } catch (error) {
      throw error;
    }
  }, [queryClient]);

  // Register function
  const register = useCallback(async (registerData: RegisterData): Promise<void> => {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(registerData),
      });

      if (!response.ok) {
        await handleApiError(response);
      }

      const data: AuthResponse = await response.json();
      setToken(data.token);
      
      // Invalidate and refetch user data
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    } catch (error) {
      throw error;
    }
  }, [queryClient]);

  // Logout function
  const logout = useCallback(async (): Promise<void> => {
    try {
      const token = getToken();
      
      // Always remove token from localStorage, even if API call fails
      removeToken();
      
      // Invalidate user data immediately
      queryClient.setQueryData(["/api/auth/user"], null);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      
      // Try to call logout endpoint if token exists
      if (token) {
        try {
          await fetch('/api/auth/logout', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });
        } catch (error) {
          // Ignore logout API errors since we've already cleared the token locally
          console.warn('Logout API call failed:', error);
        }
      }
    } catch (error) {
      // Even if logout fails, ensure local state is cleared
      removeToken();
      queryClient.setQueryData(["/api/auth/user"], null);
      throw error;
    }
  }, [queryClient]);

  return {
    user: user || undefined,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    devLogin,
    error,
  };
}
