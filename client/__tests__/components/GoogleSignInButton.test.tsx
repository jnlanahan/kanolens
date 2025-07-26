import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import GoogleSignInButton from '@/components/GoogleSignInButton';

// Mock Google OAuth library
const mockGoogleSignIn = vi.fn();
const mockGoogleSignOut = vi.fn();

const mockGoogleAccounts = {
  id: {
    initialize: vi.fn(),
    renderButton: vi.fn(),
    prompt: vi.fn(),
  },
};

// Mock window.google
Object.defineProperty(window, 'google', {
  value: {
    accounts: mockGoogleAccounts,
  },
  writable: true,
});

// Mock the useAuth hook
const mockLogin = vi.fn();
const mockUseAuth = {
  login: mockLogin,
  isLoading: false,
  error: null,
};

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth,
}));

// Mock wouter navigation
const mockSetLocation = vi.fn();
vi.mock('wouter', () => ({
  useLocation: () => ['/', mockSetLocation],
}));

// Mock toast
const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
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

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  
  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  );
};

describe('GoogleSignInButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Google Sign In button', () => {
    renderWithProviders(<GoogleSignInButton />);
    
    expect(screen.getByText('Continue with Google')).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('initializes Google OAuth on mount', () => {
    renderWithProviders(<GoogleSignInButton />);
    
    expect(mockGoogleAccounts.id.initialize).toHaveBeenCalledWith({
      client_id: expect.any(String),
      callback: expect.any(Function),
    });
  });

  it('handles successful Google sign-in', async () => {
    const mockCredentialResponse = {
      credential: 'mock-jwt-credential',
    };

    // Mock successful backend response
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        token: 'mock-auth-token',
        user: {
          id: 'user-123',
          email: 'test@gmail.com',
          firstName: 'John',
          lastName: 'Doe',
        },
      }),
    });

    renderWithProviders(<GoogleSignInButton />);
    
    // Get the callback function passed to Google OAuth
    const initializeCall = mockGoogleAccounts.id.initialize.mock.calls[0];
    const callback = initializeCall[0].callback;
    
    // Simulate successful Google sign-in
    await callback(mockCredentialResponse);
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/auth/google', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          credentialResponse: mockCredentialResponse,
        }),
      });
    });

    expect(mockToast).toHaveBeenCalledWith({
      title: 'Sign In Successful',
      description: 'Welcome to KanoLens!',
    });
    
    expect(mockSetLocation).toHaveBeenCalledWith('/dashboard');
  });

  it('handles Google sign-in failure', async () => {
    const mockCredentialResponse = {
      credential: 'invalid-credential',
    };

    // Mock failed backend response
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({
        message: 'Invalid Google credential',
      }),
    });

    renderWithProviders(<GoogleSignInButton />);
    
    // Get the callback function
    const initializeCall = mockGoogleAccounts.id.initialize.mock.calls[0];
    const callback = initializeCall[0].callback;
    
    // Simulate failed Google sign-in
    await callback(mockCredentialResponse);
    
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        variant: 'destructive',
        title: 'Sign In Failed',
        description: 'Invalid Google credential',
      });
    });
    
    expect(mockSetLocation).not.toHaveBeenCalled();
  });

  it('handles network errors during sign-in', async () => {
    const mockCredentialResponse = {
      credential: 'mock-credential',
    };

    // Mock network error
    global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'));

    renderWithProviders(<GoogleSignInButton />);
    
    // Get the callback function
    const initializeCall = mockGoogleAccounts.id.initialize.mock.calls[0];
    const callback = initializeCall[0].callback;
    
    // Simulate network error during sign-in
    await callback(mockCredentialResponse);
    
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        variant: 'destructive',
        title: 'Sign In Failed',
        description: 'Network error occurred. Please try again.',
      });
    });
  });

  it('shows loading state during sign-in', async () => {
    mockUseAuth.isLoading = true;
    
    renderWithProviders(<GoogleSignInButton />);
    
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(screen.getByText('Signing in...')).toBeInTheDocument();
  });

  it('uses correct Google Client ID from environment', () => {
    // Mock environment variable
    const originalEnv = process.env;
    process.env = { ...originalEnv, VITE_GOOGLE_CLIENT_ID: 'test-client-id' };
    
    renderWithProviders(<GoogleSignInButton />);
    
    expect(mockGoogleAccounts.id.initialize).toHaveBeenCalledWith({
      client_id: 'test-client-id',
      callback: expect.any(Function),
    });
    
    // Restore original environment
    process.env = originalEnv;
  });

  it('handles missing Google Client ID gracefully', () => {
    // Mock missing environment variable
    const originalEnv = process.env;
    process.env = { ...originalEnv };
    delete process.env.VITE_GOOGLE_CLIENT_ID;
    
    renderWithProviders(<GoogleSignInButton />);
    
    expect(screen.getByText('Google Sign In not configured')).toBeInTheDocument();
    
    // Restore original environment
    process.env = originalEnv;
  });

  it('handles admin user sign-in (jnlanahan@gmail.com)', async () => {
    const mockCredentialResponse = {
      credential: 'admin-jwt-credential',
    };

    // Mock successful admin sign-in response
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        token: 'admin-auth-token',
        user: {
          id: 'admin-123',
          email: 'jnlanahan@gmail.com',
          firstName: 'Admin',
          lastName: 'User',
          maxAnalyses: -1, // Unlimited
        },
      }),
    });

    renderWithProviders(<GoogleSignInButton />);
    
    // Get the callback function
    const initializeCall = mockGoogleAccounts.id.initialize.mock.calls[0];
    const callback = initializeCall[0].callback;
    
    // Simulate admin sign-in
    await callback(mockCredentialResponse);
    
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Welcome Admin!',
        description: 'You have unlimited analysis access.',
      });
    });
    
    expect(mockSetLocation).toHaveBeenCalledWith('/dashboard');
  });

  it('renders with custom className', () => {
    renderWithProviders(<GoogleSignInButton className="custom-class" />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('custom-class');
  });

  it('renders with custom text', () => {
    renderWithProviders(<GoogleSignInButton text="Sign up with Google" />);
    
    expect(screen.getByText('Sign up with Google')).toBeInTheDocument();
  });
});