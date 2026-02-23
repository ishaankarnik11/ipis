import type { UserRole } from '@ipis/shared';
import { get, post } from './api';

export const authKeys = {
  me: ['auth', 'me'] as const,
};

export interface AuthUser {
  id: string;
  name: string;
  role: UserRole;
  email: string;
  departmentId: string | null;
}

interface DataResponse<T> {
  data: T;
}

interface SuccessResponse {
  success: boolean;
}

export interface LoginUser {
  id: string;
  name: string;
  role: UserRole;
  email: string;
}

export function getMe(): Promise<DataResponse<AuthUser>> {
  return get<DataResponse<AuthUser>>('/auth/me');
}

export function login(email: string, password: string): Promise<DataResponse<LoginUser>> {
  return post<DataResponse<LoginUser>>('/auth/login', { email, password });
}

export function logout(): Promise<SuccessResponse> {
  return post<SuccessResponse>('/auth/logout');
}
