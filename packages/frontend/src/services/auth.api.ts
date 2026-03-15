import type { UserRole } from '@ipis/shared';
import { get, post } from './api';
import type { DataResponse, SuccessResponse } from './types';

export const authKeys = {
  me: ['auth', 'me'] as const,
};

export interface AuthUser {
  id: string;
  name: string | null;
  role: UserRole;
  email: string;
  departmentId: string | null;
  status: string;
}

export interface LoginUser {
  id: string;
  name: string | null;
  role: UserRole;
  email: string;
}

export interface OtpErrorResponse {
  success: false;
  error: { code: string; message: string };
  retryAfterSeconds?: number;
  attemptsRemaining?: number;
}

export function getMe(): Promise<DataResponse<AuthUser>> {
  return get<DataResponse<AuthUser>>('/auth/me');
}

export function logout(): Promise<SuccessResponse> {
  return post<SuccessResponse>('/auth/logout');
}

export async function requestOtp(email: string): Promise<{ success: true } | OtpErrorResponse> {
  const res = await fetch('/api/v1/auth/request-otp', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });

  return res.json();
}

export async function verifyOtp(email: string, otp: string): Promise<DataResponse<LoginUser> | OtpErrorResponse> {
  const res = await fetch('/api/v1/auth/verify-otp', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, otp }),
  });

  return res.json();
}

export interface InvitationData {
  email: string;
  role: string;
  departments: { id: string; name: string }[];
}

export interface ValidateInvitationResult {
  valid: boolean;
  error?: string;
  message?: string;
  data?: InvitationData;
}

export async function validateInvitation(token: string): Promise<ValidateInvitationResult> {
  const res = await fetch(`/api/v1/auth/validate-invitation?token=${encodeURIComponent(token)}`, {
    credentials: 'include',
  });
  return res.json();
}

export async function completeProfile(data: { token: string; name: string; departmentId?: string | null }): Promise<DataResponse<LoginUser> | OtpErrorResponse> {
  const res = await fetch('/api/v1/auth/complete-profile', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}
