import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import type { UserRole } from '@ipis/shared';
import { authKeys, getMe, logout as logoutApi } from '../services/auth.api';

export function useAuth() {
  const { data, isLoading, isError } = useQuery({
    queryKey: authKeys.me,
    queryFn: getMe,
    retry: false,
    staleTime: Infinity,
  });

  return {
    user: data?.data ?? null,
    isLoading,
    isError,
    isAuthenticated: !!data?.data,
  };
}

export function useLogout() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: logoutApi,
    onSuccess: () => {
      queryClient.clear();
      navigate('/login');
    },
  });
}

export function getRoleLandingPage(role: UserRole): string {
  const landingPages: Record<UserRole, string> = {
    ADMIN: '/admin',
    FINANCE: '/dashboards/executive',
    HR: '/dashboards/employees',
    DELIVERY_MANAGER: '/dashboards/projects',
    DEPT_HEAD: '/dashboards/department',
  };
  return landingPages[role];
}
