import { describe, it, expect, vi, beforeEach } from 'vitest';
import { userKeys, getUsers, createUser, updateUser, getDepartments } from './users.api';
import * as api from './api';

vi.mock('./api', () => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
}));

const mockGet = vi.mocked(api.get);
const mockPost = vi.mocked(api.post);
const mockPatch = vi.mocked(api.patch);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('userKeys', () => {
  it('defines query key constants', () => {
    expect(userKeys.all).toEqual(['users']);
    expect(userKeys.departments).toEqual(['departments']);
  });
});

describe('getUsers', () => {
  it('calls GET /users and returns data', async () => {
    const response = { data: [{ id: '1', name: 'Alice' }], meta: { total: 1 } };
    mockGet.mockResolvedValue(response);

    const result = await getUsers();

    expect(mockGet).toHaveBeenCalledWith('/users');
    expect(result).toEqual(response);
  });
});

describe('createUser', () => {
  it('calls POST /users with body and returns data', async () => {
    const input = { name: 'Bob', email: 'bob@test.com', role: 'ADMIN' as const };
    const response = { data: { id: '2', ...input, isActive: true, temporaryPassword: 'abc123' } };
    mockPost.mockResolvedValue(response);

    const result = await createUser(input);

    expect(mockPost).toHaveBeenCalledWith('/users', input);
    expect(result).toEqual(response);
  });
});

describe('updateUser', () => {
  it('calls PATCH /users/:id with body and returns data', async () => {
    const response = { data: { id: '1', name: 'Alice Updated' } };
    mockPatch.mockResolvedValue(response);

    const result = await updateUser('1', { name: 'Alice Updated' });

    expect(mockPatch).toHaveBeenCalledWith('/users/1', { name: 'Alice Updated' });
    expect(result).toEqual(response);
  });
});

describe('getDepartments', () => {
  it('calls GET /departments and returns data', async () => {
    const response = { data: [{ id: 'dept-1', name: 'Engineering' }] };
    mockGet.mockResolvedValue(response);

    const result = await getDepartments();

    expect(mockGet).toHaveBeenCalledWith('/departments');
    expect(result).toEqual(response);
  });
});
