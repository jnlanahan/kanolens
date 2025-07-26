import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useAuth } from '../../src/hooks/useAuth';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  
  return ({ children }: { children: React.ReactNode }) => (
    React.createElement(QueryClientProvider, { client: queryClient }, children)
  );
};

describe('useAuth Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Authentication State', () => {
    it('should return unauthenticated state when no token exists', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ message: 'Unauthorized' })
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBe(undefined);
    });

    it('should return authenticated state when valid token exists', async () => {
      const mockToken = 'valid-jwt-token';
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User'
      };

      mockLocalStorage.getItem.mockReturnValue(mockToken);
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockUser
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
        expect(result.current.user).toEqual(mockUser);
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/auth/user', {
        headers: {
          'Authorization': `Bearer ${mockToken}`,
          'Content-Type': 'application/json',
        },
      });
    });

    it('should handle loading state correctly', async () => {
      mockLocalStorage.getItem.mockReturnValue('token');
      
      let resolveResponse: any;
      mockFetch.mockReturnValue(new Promise(resolve => {
        resolveResponse = resolve;
      }));

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);

      resolveResponse({
        ok: true,
        json: async () => ({ id: 'user-123', email: 'test@example.com' })
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe('Login Function', () => {
    it('should successfully login with valid credentials', async () => {
      const mockToken = 'new-jwt-token';
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User'
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          user: mockUser,
          token: mockToken
        })
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      const loginData = {
        email: 'test@example.com',
        password: 'password123'
      };

      await result.current.login(loginData);

      expect(mockFetch).toHaveBeenCalledWith('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(loginData),
      });

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('auth-token', mockToken);
    });

    it('should handle login failure with invalid credentials', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ message: 'Invalid email or password' })
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      const loginData = {
        email: 'test@example.com',
        password: 'wrongpassword'
      };

      await expect(result.current.login(loginData)).rejects.toThrow('Invalid email or password');
      expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
    });

    it('should handle network errors during login', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      const loginData = {
        email: 'test@example.com',
        password: 'password123'
      };

      await expect(result.current.login(loginData)).rejects.toThrow('Network error');
    });
  });

  describe('Register Function', () => {
    it('should successfully register with valid data', async () => {
      const mockToken = 'new-jwt-token';
      const mockUser = {
        id: 'user-123',
        email: 'john@example.com',
        firstName: 'John',
        lastName: 'Doe'
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          user: mockUser,
          token: mockToken
        })
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      const registerData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'ValidPassword123!'
      };

      await result.current.register(registerData);

      expect(mockFetch).toHaveBeenCalledWith('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(registerData),
      });

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('auth-token', mockToken);
    });

    it('should handle registration failure with existing email', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 409,
        json: async () => ({ message: 'Email already registered' })
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      const registerData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'existing@example.com',
        password: 'ValidPassword123!'
      };

      await expect(result.current.register(registerData)).rejects.toThrow('Email already registered');
      expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
    });

    it('should handle validation errors during registration', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ 
          message: 'Password does not meet requirements',
          errors: ['Password must be at least 8 characters long']
        })
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      const registerData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'weak'
      };

      await expect(result.current.register(registerData)).rejects.toThrow('Password does not meet requirements');
    });
  });

  describe('Logout Function', () => {
    it('should successfully logout and clear token', async () => {
      mockLocalStorage.getItem.mockReturnValue('existing-token');
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ message: 'Logged out successfully' })
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await result.current.logout();

      expect(mockFetch).toHaveBeenCalledWith('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer existing-token',
          'Content-Type': 'application/json',
        },
      });

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('auth-token');
    });

    it('should clear token even if logout request fails', async () => {
      mockLocalStorage.getItem.mockReturnValue('existing-token');
      mockFetch.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await result.current.logout();

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('auth-token');
    });

    it('should handle logout when no token exists', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await result.current.logout();

      expect(mockFetch).not.toHaveBeenCalled();
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('auth-token');
    });
  });

  describe('Token Management', () => {
    it('should automatically clear token when API returns 401', async () => {
      const invalidToken = 'invalid-token';
      mockLocalStorage.getItem.mockReturnValue(invalidToken);
      
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ message: 'Token expired' })
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(false);
      });

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('auth-token');
    });

    it('should include token in subsequent API calls', async () => {
      const mockToken = 'valid-token';
      mockLocalStorage.getItem.mockReturnValue(mockToken);
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'user-123', email: 'test@example.com' })
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/auth/user', {
        headers: {
          'Authorization': `Bearer ${mockToken}`,
          'Content-Type': 'application/json',
        },
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON responses', async () => {
      mockLocalStorage.getItem.mockReturnValue('token');
      
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => { throw new Error('Invalid JSON'); },
        text: async () => 'Internal Server Error'
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(false);
      });
    });

    it('should handle missing error messages gracefully', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({}) // No message field
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await expect(result.current.login({
        email: 'test@example.com',
        password: 'password'
      })).rejects.toThrow('An error occurred');
    });
  });
});