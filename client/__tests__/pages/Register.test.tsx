import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Register from '../../src/pages/Register';

// Mock the useAuth hook
const mockRegister = vi.fn();
const mockLogin = vi.fn();

vi.mock('../../src/hooks/useAuth', () => ({
  useAuth: () => ({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    register: mockRegister,
    login: mockLogin
  })
}));

// Mock wouter router
const mockSetLocation = vi.fn();
vi.mock('wouter', () => ({
  useLocation: () => ['/register', mockSetLocation]
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

describe('Register Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render registration form with all required fields', () => {
    renderWithQueryClient(<Register />);
    
    expect(screen.getByTestId('card-title')).toHaveTextContent('Create Account');
    expect(screen.getByTestId('input-text')).toBeInTheDocument(); // First name
    expect(screen.getByTestId('input-text')).toBeInTheDocument(); // Last name
    expect(screen.getByTestId('input-email')).toBeInTheDocument();
    expect(screen.getByTestId('input-password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
    expect(screen.getByText(/already have an account/i)).toBeInTheDocument();
  });

  it('should validate email format', async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<Register />);
    
    const emailInput = screen.getByTestId('input-email');
    const submitButton = screen.getByRole('button', { name: /create account/i });
    
    // Fill other required fields
    const firstNameInput = screen.getAllByTestId('input-text')[0];
    const lastNameInput = screen.getAllByTestId('input-text')[1];
    const passwordInput = screen.getByTestId('input-password');
    
    await user.type(firstNameInput, 'John');
    await user.type(lastNameInput, 'Doe');
    await user.type(emailInput, 'invalid-email');
    await user.type(passwordInput, 'ValidPassword123!');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/please enter a valid email/i)).toBeInTheDocument();
    });
  });

  it('should validate password strength requirements', async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<Register />);
    
    const firstNameInput = screen.getAllByTestId('input-text')[0];
    const lastNameInput = screen.getAllByTestId('input-text')[1];
    const emailInput = screen.getByTestId('input-email');
    const passwordInput = screen.getByTestId('input-password');
    const submitButton = screen.getByRole('button', { name: /create account/i });
    
    await user.type(firstNameInput, 'John');
    await user.type(lastNameInput, 'Doe');
    await user.type(emailInput, 'john@example.com');
    await user.type(passwordInput, 'weak'); // Weak password
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument();
    });
  });

  it('should validate password confirmation match', async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<Register />);
    
    const firstNameInput = screen.getAllByTestId('input-text')[0];
    const lastNameInput = screen.getAllByTestId('input-text')[1];
    const emailInput = screen.getByTestId('input-email');
    const passwordInput = screen.getByTestId('input-password');
    const confirmPasswordInput = screen.getAllByTestId('input-password')[1]; // Second password input
    const submitButton = screen.getByRole('button', { name: /create account/i });
    
    await user.type(firstNameInput, 'John');
    await user.type(lastNameInput, 'Doe');
    await user.type(emailInput, 'john@example.com');
    await user.type(passwordInput, 'ValidPassword123!');
    await user.type(confirmPasswordInput, 'DifferentPassword123!');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    });
  });

  it('should validate required fields', async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<Register />);
    
    const submitButton = screen.getByRole('button', { name: /create account/i });
    
    // Submit empty form
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/first name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/last name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    });
  });

  it('should handle successful registration', async () => {
    const user = userEvent.setup();
    mockRegister.mockResolvedValue({ success: true });
    
    renderWithQueryClient(<Register />);
    
    const firstNameInput = screen.getAllByTestId('input-text')[0];
    const lastNameInput = screen.getAllByTestId('input-text')[1];
    const emailInput = screen.getByTestId('input-email');
    const passwordInput = screen.getByTestId('input-password');
    const confirmPasswordInput = screen.getAllByTestId('input-password')[1];
    const submitButton = screen.getByRole('button', { name: /create account/i });
    
    // Fill valid form data
    await user.type(firstNameInput, 'John');
    await user.type(lastNameInput, 'Doe');
    await user.type(emailInput, 'john@example.com');
    await user.type(passwordInput, 'ValidPassword123!');
    await user.type(confirmPasswordInput, 'ValidPassword123!');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'ValidPassword123!'
      });
    });
  });

  it('should display error for existing email', async () => {
    const user = userEvent.setup();
    mockRegister.mockRejectedValue({ message: 'Email already registered' });
    
    renderWithQueryClient(<Register />);
    
    const firstNameInput = screen.getAllByTestId('input-text')[0];
    const lastNameInput = screen.getAllByTestId('input-text')[1];
    const emailInput = screen.getByTestId('input-email');
    const passwordInput = screen.getByTestId('input-password');
    const confirmPasswordInput = screen.getAllByTestId('input-password')[1];
    const submitButton = screen.getByRole('button', { name: /create account/i });
    
    await user.type(firstNameInput, 'John');
    await user.type(lastNameInput, 'Doe');
    await user.type(emailInput, 'existing@example.com');
    await user.type(passwordInput, 'ValidPassword123!');
    await user.type(confirmPasswordInput, 'ValidPassword123!');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        variant: 'destructive',
        title: 'Registration Failed',
        description: 'Email already registered'
      });
    });
  });

  it('should redirect to dashboard on successful registration', async () => {
    const user = userEvent.setup();
    mockRegister.mockResolvedValue({ success: true });
    
    renderWithQueryClient(<Register />);
    
    const firstNameInput = screen.getAllByTestId('input-text')[0];
    const lastNameInput = screen.getAllByTestId('input-text')[1];
    const emailInput = screen.getByTestId('input-email');
    const passwordInput = screen.getByTestId('input-password');
    const confirmPasswordInput = screen.getAllByTestId('input-password')[1];
    const submitButton = screen.getByRole('button', { name: /create account/i });
    
    await user.type(firstNameInput, 'John');
    await user.type(lastNameInput, 'Doe');
    await user.type(emailInput, 'john@example.com');
    await user.type(passwordInput, 'ValidPassword123!');
    await user.type(confirmPasswordInput, 'ValidPassword123!');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(mockSetLocation).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('should show loading state during registration', async () => {
    const user = userEvent.setup();
    // Mock a pending promise
    let resolveRegister: any;
    mockRegister.mockReturnValue(new Promise(resolve => { resolveRegister = resolve; }));
    
    renderWithQueryClient(<Register />);
    
    const firstNameInput = screen.getAllByTestId('input-text')[0];
    const lastNameInput = screen.getAllByTestId('input-text')[1];
    const emailInput = screen.getByTestId('input-email');
    const passwordInput = screen.getByTestId('input-password');
    const confirmPasswordInput = screen.getAllByTestId('input-password')[1];
    const submitButton = screen.getByRole('button', { name: /create account/i });
    
    await user.type(firstNameInput, 'John');
    await user.type(lastNameInput, 'Doe');
    await user.type(emailInput, 'john@example.com');
    await user.type(passwordInput, 'ValidPassword123!');
    await user.type(confirmPasswordInput, 'ValidPassword123!');
    await user.click(submitButton);
    
    // Should show loading state
    expect(screen.getByRole('button', { name: /creating account/i })).toBeInTheDocument();
    expect(submitButton).toBeDisabled();
    
    // Resolve the promise
    resolveRegister({ success: true });
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
    });
  });

  it('should have link to login page', () => {
    renderWithQueryClient(<Register />);
    
    const loginLink = screen.getByRole('link', { name: /sign in/i });
    expect(loginLink).toBeInTheDocument();
    expect(loginLink).toHaveAttribute('href', '/login');
  });

  it('should display password strength requirements', () => {
    renderWithQueryClient(<Register />);
    
    expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument();
    expect(screen.getByText(/uppercase letter/i)).toBeInTheDocument();
    expect(screen.getByText(/lowercase letter/i)).toBeInTheDocument();
    expect(screen.getByText(/number/i)).toBeInTheDocument();
    expect(screen.getByText(/special character/i)).toBeInTheDocument();
  });
});