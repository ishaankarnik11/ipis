import type { UserRole } from '@ipis/shared';
import type { CreateUserInput, UpdateUserInput } from '@ipis/shared';
import { get, post, patch } from './api';
import type { DataResponse, ListResponse, SuccessResponse } from './types';

export const userKeys = {
  all: ['users'] as const,
  departments: ['departments'] as const,
};

export interface User {
  id: string;
  name: string | null;
  email: string;
  role: UserRole;
  departmentId: string | null;
  departmentName: string | null;
  status: string;
}

export interface Department {
  id: string;
  name: string;
}

export function getUsers(): Promise<ListResponse<User>> {
  return get<ListResponse<User>>('/users');
}

export function createUser(data: CreateUserInput): Promise<DataResponse<User>> {
  return post<DataResponse<User>>('/users', data);
}

export function updateUser(id: string, data: UpdateUserInput): Promise<DataResponse<User>> {
  return patch<DataResponse<User>>(`/users/${id}`, data);
}

export function getDepartments(): Promise<DataResponse<Department[]>> {
  return get<DataResponse<Department[]>>('/departments');
}

export function resendInvitation(userId: string): Promise<SuccessResponse> {
  return post<SuccessResponse>(`/users/${userId}/resend-invitation`);
}
