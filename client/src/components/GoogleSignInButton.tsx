import React, { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface GoogleSignInButtonProps {
  className?: string;
  text?: string;
}

interface GoogleCredentialResponse {
  credential: string;
}

interface GoogleUser {
  id: string;
  email: string;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: GoogleCredentialResponse) => void;
          }) => void;
          renderButton: (element: HTMLElement, config: any) => void;
          prompt: () => void;
        };
      };
    };
  }
}

const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({
  className = '',
  text = 'Continue with Google'
}) => {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { isLoading } = useAuth();
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isGoogleLoaded, setIsGoogleLoaded] = useState(false);

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (!googleClientId) {
      console.error('Google Client ID not configured');
      return;
    }

    // Load Google OAuth script
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      if (window.google) {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: handleGoogleSignIn,
        });
        setIsGoogleLoaded(true);
      }
    };

    document.head.appendChild(script);

    return () => {
      // Clean up script
      const existingScript = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
      if (existingScript) {
        document.head.removeChild(existingScript);
      }
    };
  }, [googleClientId]);

  const handleGoogleSignIn = async (credentialResponse: GoogleCredentialResponse) => {
    if (!credentialResponse.credential) {
      toast({
        variant: 'destructive',
        title: 'Sign In Failed',
        description: 'No credential received from Google',
      });
      return;
    }

    setIsGoogleLoading(true);

    try {
      // Decode the JWT to get user info
      const base64Url = credentialResponse.credential.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );

      const googleUser: GoogleUser = JSON.parse(jsonPayload);

      // Send to our backend
      const response = await fetch('/api/auth/google', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          googleUser: {
            id: googleUser.sub,
            email: googleUser.email,
            name: googleUser.name,
            given_name: googleUser.given_name,
            family_name: googleUser.family_name,
            picture: googleUser.picture,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Google sign-in failed');
      }

      // Store the JWT token
      localStorage.setItem('auth_token', data.token);

      // Show success message
      if (data.user.email === 'jnlanahan@gmail.com') {
        toast({
          title: 'Welcome Admin!',
          description: 'You have unlimited analysis access.',
        });
      } else {
        toast({
          title: 'Sign In Successful',
          description: 'Welcome to KanoLens!',
        });
      }

      // Redirect to dashboard
      setLocation('/dashboard');
    } catch (error: any) {
      console.error('Google sign-in error:', error);
      toast({
        variant: 'destructive',
        title: 'Sign In Failed',
        description: error.message || 'Network error occurred. Please try again.',
      });
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleButtonClick = () => {
    if (!window.google) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Google Sign-In is not loaded yet. Please try again.',
      });
      return;
    }

    window.google.accounts.id.prompt();
  };

  if (!googleClientId) {
    return (
      <Button disabled className={className}>
        Google Sign In not configured
      </Button>
    );
  }

  const isButtonLoading = isLoading || isGoogleLoading;

  return (
    <Button
      type="button"
      variant="outline"
      className={`w-full border-gray-300 bg-white hover:bg-gray-50 text-gray-700 ${className}`}
      onClick={handleButtonClick}
      disabled={isButtonLoading || !isGoogleLoaded}
    >
      <div className="flex items-center justify-center space-x-2">
        <svg
          className="w-5 h-5"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        <span>{isButtonLoading ? 'Signing in...' : text}</span>
      </div>
    </Button>
  );
};

export default GoogleSignInButton;