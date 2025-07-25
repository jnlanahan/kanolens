import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Cleanup after each test case (required for react-testing-library)
afterEach(() => {
  cleanup();
});

// Mock useToast hook that's commonly used in components
const mockToast = {
  toast: vi.fn(),
  dismiss: vi.fn(),
  toasts: []
};

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => mockToast
}));

// Mock React Router's useNavigate
const mockNavigate = vi.fn();
vi.mock('wouter', () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => ['/'],
  Link: ({ children, href, ...props }: any) => {
    const React = require('react');
    return React.createElement('a', { href, ...props }, children);
  },
  Route: ({ children }: any) => children
}));

// Mock window.matchMedia for components that use media queries
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // Deprecated
    removeListener: vi.fn(), // Deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock WebSocket for real-time features
global.WebSocket = vi.fn().mockImplementation(() => ({
  send: vi.fn(),
  close: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  readyState: 1, // OPEN
}));

// Extend global vi for TypeScript
declare global {
  var vi: typeof import('vitest').vi;
}