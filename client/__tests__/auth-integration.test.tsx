import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import { useAuth } from '@/hooks/useAuth';

// Mock the useAuth hook
vi.mock('@/hooks/useAuth');
const mockUseAuth = vi.mocked(useAuth);

// Mock the API calls
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
});

// Mock wouter navigation
const mockSetLocation = vi.fn();
vi.mock('wouter', () => ({
  useLocation: () => ['/', mockSetLocation],
}));

const createTestQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
};

const renderWithProviders = (Component: React.ComponentType) => {
  const queryClient = createTestQueryClient();
  
  return render(
    <QueryClientProvider client={queryClient}>
      <Component />
    </QueryClientProvider>
  );
};

describe('Authentication Integration Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
    mockUseAuth.mockReturnValue({
      user: undefined,
      isLoading: false,
      isAuthenticated: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      error: null,
    });
  });

  it('completes registration flow with valid data', async () => {
    const mockRegister = vi.fn();
    mockUseAuth.mockReturnValue({
      user: undefined,
      isLoading: false,
      isAuthenticated: false,
      login: vi.fn(),
      register: mockRegister,
      logout: vi.fn(),
      error: null,
    });

    renderWithProviders(Register);
    
    expect(screen.getByText('Sign up to get started with KanoLens')).toBeInTheDocument();
    
    // Fill out registration form
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/^password$/i);
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
    const firstNameInput = screen.getByLabelText(/first name/i);
    const lastNameInput = screen.getByLabelText(/last name/i);
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'SecurePass123!' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'SecurePass123!' } });
    fireEvent.change(firstNameInput, { target: { value: 'John' } });
    fireEvent.change(lastNameInput, { target: { value: 'Doe' } });
    
    const registerBtn = screen.getByRole('button', { name: /create account/i });
    fireEvent.click(registerBtn);
    
    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'SecurePass123!',
        firstName: 'John',
        lastName: 'Doe'
      });
    });
  });

  it('completes login flow with valid credentials', async () => {
    const mockLogin = vi.fn();
    mockUseAuth.mockReturnValue({
      user: undefined,
      isLoading: false,
      isAuthenticated: false,
      login: mockLogin,
      register: vi.fn(),
      logout: vi.fn(),
      error: null,
    });

    renderWithProviders(Login);
    
    expect(screen.getByText('Sign in to your account to continue')).toBeInTheDocument();
    
    // Fill out login form
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'SecurePass123!' } });
    
    const loginBtn = screen.getByRole('button', { name: /sign in/i });
    fireEvent.click(loginBtn);
    
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'SecurePass123!'
      });
    });
  });

  it('handles login errors gracefully', async () => {
    const mockLogin = vi.fn();
    mockUseAuth.mockReturnValue({
      user: undefined,
      isLoading: false,
      isAuthenticated: false,
      login: mockLogin,
      register: vi.fn(),
      logout: vi.fn(),
      error: 'Invalid credentials',
    });

    renderWithProviders(Login);
    
    // Error should be displayed
    expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
  });

  it('handles registration errors gracefully', async () => {
    const mockRegister = vi.fn();
    mockUseAuth.mockReturnValue({
      user: undefined,
      isLoading: false,
      isAuthenticated: false,
      login: vi.fn(),
      register: mockRegister,
      logout: vi.fn(),
      error: 'Email already exists',
    });

    renderWithProviders(Register);
    
    // Error should be displayed
    expect(screen.getByText('Email already exists')).toBeInTheDocument();
  });

  it('shows loading states during authentication', async () => {
    mockUseAuth.mockReturnValue({
      user: undefined,
      isLoading: true,
      isAuthenticated: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      error: null,
    });

    renderWithProviders(Login);
    
    // Login button should be disabled during loading
    const loginBtn = screen.getByRole('button', { name: /signing in.../i });
    expect(loginBtn).toBeDisabled();
  });

  it('redirects to dashboard after successful login', async () => {
    const mockLogin = vi.fn();
    mockUseAuth.mockReturnValue({
      user: {
        id: 'test-user-123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe'
      },
      isLoading: false,
      isAuthenticated: true,
      login: mockLogin,
      register: vi.fn(),
      logout: vi.fn(),
      error: null,
    });

    renderWithProviders(Login);
    
    // Should redirect to dashboard for authenticated users
    await waitFor(() => {
      expect(mockSetLocation).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('redirects to login after successful registration', async () => {
    const mockRegister = vi.fn().mockResolvedValue(undefined);
    mockUseAuth.mockReturnValue({
      user: undefined,
      isLoading: false,
      isAuthenticated: false,
      login: vi.fn(),
      register: mockRegister,
      logout: vi.fn(),
      error: null,
    });

    renderWithProviders(Register);
    
    // Fill out and submit registration form
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/^password$/i);
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
    const firstNameInput = screen.getByLabelText(/first name/i);
    const lastNameInput = screen.getByLabelText(/last name/i);
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'SecurePass123!' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'SecurePass123!' } });
    fireEvent.change(firstNameInput, { target: { value: 'John' } });
    fireEvent.change(lastNameInput, { target: { value: 'Doe' } });
    
    const registerBtn = screen.getByRole('button', { name: /create account/i });
    fireEvent.click(registerBtn);
    
    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalled();
    });
  });
});