import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import type { ReactNode } from 'react';

// Mock react-router
vi.mock('react-router', () => ({
  useNavigate: () => vi.fn(),
}));

// Mock auth API
vi.mock('../services/auth.api', () => ({
  authKeys: { me: ['auth', 'me'] },
  getMe: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
}));

import { getMe } from '../services/auth.api';
import { useAuth, getRoleLandingPage } from './useAuth';

const mockGetMe = getMe as ReturnType<typeof vi.fn>;

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return user data when authenticated', async () => {
    mockGetMe.mockResolvedValue({
      data: { id: '1', name: 'Admin', role: 'ADMIN', email: 'admin@test.com', departmentId: null },
    });

    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.user).toEqual({
      id: '1', name: 'Admin', role: 'ADMIN', email: 'admin@test.com', departmentId: null,
    });
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('should return null user when not authenticated', async () => {
    mockGetMe.mockRejectedValue(new Error('Unauthorized'));

    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.isError).toBe(true);
  });

  it('should show loading state initially', () => {
    mockGetMe.mockReturnValue(new Promise(() => {})); // Never resolves

    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.user).toBeNull();
  });
});

describe('getRoleLandingPage', () => {
  it('should return correct landing pages for each role', () => {
    expect(getRoleLandingPage('ADMIN')).toBe('/admin');
    expect(getRoleLandingPage('FINANCE')).toBe('/dashboards/executive');
    expect(getRoleLandingPage('HR')).toBe('/employees');
    expect(getRoleLandingPage('DELIVERY_MANAGER')).toBe('/projects');
    expect(getRoleLandingPage('DEPT_HEAD')).toBe('/dashboards/department');
  });
});
