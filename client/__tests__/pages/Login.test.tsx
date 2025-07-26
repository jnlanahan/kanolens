import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Login from '../../src/pages/Login';

// Mock the useAuth hook
const mockLogin = vi.fn();
const mockLogout = vi.fn();

vi.mock('../../src/hooks/useAuth', () => ({
  useAuth: () => ({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    login: mockLogin,
    logout: mockLogout
  })
}));

// Mock wouter router
const mockSetLocation = vi.fn();
vi.mock('wouter', () => ({
  useLocation: () => ['/login', mockSetLocation]
}));

// Mock toast notifications
const mockToast = vi.fn();
vi.mock('../../src/hooks/use-toast', () => ({
  useToast: () => ({
    toast: mockToast
  })
}));

// Mock UI components
vi.mock('../../src/components/ui/button', () => ({
  Button: ({ children, onClick, className, disabled, type }: any) => (
    <button 
      onClick={onClick} 
      className={className} 
      disabled={disabled} 
      type={type}
      data-testid="button"
    >
      {children}
    </button>
  ),
}));

vi.mock('../../src/components/ui/card', () => ({
  Card: ({ children, className }: any) => <div className={className} data-testid="card">{children}</div>,
  CardContent: ({ children, className }: any) => <div className={className} data-testid="card-content">{children}</div>,
  CardHeader: ({ children, className }: any) => <div className={className} data-testid="card-header">{children}</div>,
  CardTitle: ({ children, className }: any) => <h2 className={className} data-testid="card-title">{children}</h2>,
  CardDescription: ({ children, className }: any) => <p className={className} data-testid="card-description">{children}</p>,
}));

vi.mock('../../src/components/ui/input', () => ({
  Input: ({ placeholder, type, value, onChange, className, ...props }: any) => (
    <input 
      placeholder={placeholder}
      type={type}
      value={value}
      onChange={onChange}
      className={className}
      data-testid={`input-${type || 'text'}`}
      {...props}
    />
  ),
}));

vi.mock('../../src/components/ui/label', () => ({
  Label: ({ children, htmlFor, className }: any) => (
    <label htmlFor={htmlFor} className={className} data-testid="label">{children}</label>
  ),
}));

const renderWithQueryClient = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  
  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  );
};

describe('Login Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render login form with all required fields', () => {
    renderWithQueryClient(<Login />);
    
    expect(screen.getByTestId('card-title')).toHaveTextContent('Welcome Back');
    expect(screen.getByTestId('input-email')).toBeInTheDocument();
    expect(screen.getByTestId('input-password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByText(/don't have an account/i)).toBeInTheDocument();
  });

  it('should validate email format', async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<Login />);
    
    const emailInput = screen.getByTestId('input-email');
    const submitButton = screen.getByRole('button', { name: /sign in/i });
    
    // Enter invalid email
    await user.type(emailInput, 'invalid-email');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/please enter a valid email/i)).toBeInTheDocument();
    });
  });

  it('should validate password requirements', async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<Login />);
    
    const emailInput = screen.getByTestId('input-email');
    const passwordInput = screen.getByTestId('input-password');
    const submitButton = screen.getByRole('button', { name: /sign in/i });
    
    // Enter valid email but no password
    await user.type(emailInput, 'test@example.com');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    });
  });

  it('should handle login submission with valid credentials', async () => {
    const user = userEvent.setup();
    mockLogin.mockResolvedValue({ success: true });
    
    renderWithQueryClient(<Login />);
    
    const emailInput = screen.getByTestId('input-email');
    const passwordInput = screen.getByTestId('input-password');
    const submitButton = screen.getByRole('button', { name: /sign in/i });
    
    // Enter valid credentials
    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123'
      });
    });
  });

  it('should display error messages for failed login', async () => {
    const user = userEvent.setup();
    mockLogin.mockRejectedValue({ message: 'Invalid email or password' });
    
    renderWithQueryClient(<Login />);
    
    const emailInput = screen.getByTestId('input-email');
    const passwordInput = screen.getByTestId('input-password');
    const submitButton = screen.getByRole('button', { name: /sign in/i });
    
    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'wrongpassword');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        variant: 'destructive',
        title: 'Login Failed',
        description: 'Invalid email or password'
      });
    });
  });

  it('should redirect to dashboard on successful login', async () => {
    const user = userEvent.setup();
    mockLogin.mockResolvedValue({ success: true });
    
    renderWithQueryClient(<Login />);
    
    const emailInput = screen.getByTestId('input-email');
    const passwordInput = screen.getByTestId('input-password');
    const submitButton = screen.getByRole('button', { name: /sign in/i });
    
    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(mockSetLocation).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('should show loading state during login', async () => {
    const user = userEvent.setup();
    // Mock a pending promise
    let resolveLogin: any;
    mockLogin.mockReturnValue(new Promise(resolve => { resolveLogin = resolve; }));
    
    renderWithQueryClient(<Login />);
    
    const emailInput = screen.getByTestId('input-email');
    const passwordInput = screen.getByTestId('input-password');
    const submitButton = screen.getByRole('button', { name: /sign in/i });
    
    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(submitButton);
    
    // Should show loading state
    expect(screen.getByRole('button', { name: /signing in/i })).toBeInTheDocument();
    expect(submitButton).toBeDisabled();
    
    // Resolve the promise
    resolveLogin({ success: true });
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });
  });

  it('should have link to register page', () => {
    renderWithQueryClient(<Login />);
    
    const registerLink = screen.getByRole('link', { name: /sign up/i });
    expect(registerLink).toBeInTheDocument();
    expect(registerLink).toHaveAttribute('href', '/register');
  });
});