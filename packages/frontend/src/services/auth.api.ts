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
  mustChangePassword: boolean;
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

export function forgotPassword(email: string): Promise<SuccessResponse> {
  return post<SuccessResponse>('/auth/forgot-password', { email });
}

export function validateResetToken(token: string): Promise<DataResponse<{ valid: boolean }>> {
  return get<DataResponse<{ valid: boolean }>>(`/auth/validate-reset-token?token=${encodeURIComponent(token)}`);
}

export function resetPassword(token: string, newPassword: string): Promise<SuccessResponse> {
  return post<SuccessResponse>('/auth/reset-password', { token, newPassword });
}

export function changePassword(newPassword: string): Promise<SuccessResponse> {
  return post<SuccessResponse>('/auth/change-password', { newPassword });
}
