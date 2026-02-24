import type { UserRole } from '@ipis/shared';
import type { CreateUserInput, UpdateUserInput } from '@ipis/shared';
import { get, post, patch } from './api';

export const userKeys = {
  all: ['users'] as const,
  departments: ['departments'] as const,
};

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  departmentId: string | null;
  departmentName: string | null;
  isActive: boolean;
}

export interface CreatedUser extends User {
  temporaryPassword: string;
}

export interface Department {
  id: string;
  name: string;
}

interface DataResponse<T> {
  data: T;
}

interface ListResponse<T> {
  data: T[];
  meta: { total: number };
}

export function getUsers(): Promise<ListResponse<User>> {
  return get<ListResponse<User>>('/users');
}

export function createUser(data: CreateUserInput): Promise<DataResponse<CreatedUser>> {
  return post<DataResponse<CreatedUser>>('/users', data);
}

export function updateUser(id: string, data: UpdateUserInput): Promise<DataResponse<User>> {
  return patch<DataResponse<User>>(`/users/${id}`, data);
}

export function getDepartments(): Promise<DataResponse<Department[]>> {
  return get<DataResponse<Department[]>>('/departments');
}
