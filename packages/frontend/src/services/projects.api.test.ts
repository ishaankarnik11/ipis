import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { CreateProjectInput, UpdateProjectInput, AddTeamMemberInput } from '@ipis/shared';
import {
  projectKeys,
  getProjects,
  getProject,
  createProject,
  updateProject,
  resubmitProject,
  approveProject,
  rejectProject,
  getTeamMembers,
  addTeamMember,
  removeTeamMember,
  engagementModelLabels,
} from './projects.api';
import * as api from './api';

vi.mock('./api', () => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  del: vi.fn(),
}));

const mockGet = vi.mocked(api.get);
const mockPost = vi.mocked(api.post);
const mockPatch = vi.mocked(api.patch);
const mockDel = vi.mocked(api.del);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('projectKeys', () => {
  it('defines query key constants', () => {
    expect(projectKeys.all).toEqual(['projects']);
    expect(projectKeys.detail('p1')).toEqual(['projects', 'p1']);
    expect(projectKeys.teamMembers('p1')).toEqual(['projects', 'p1', 'team-members']);
  });
});

describe('getProjects', () => {
  it('calls GET /projects', async () => {
    const response = { data: [], meta: { total: 0 } };
    mockGet.mockResolvedValue(response);

    const result = await getProjects();

    expect(mockGet).toHaveBeenCalledWith('/projects');
    expect(result).toEqual(response);
  });
});

describe('getProject', () => {
  it('calls GET /projects/:id', async () => {
    const response = { data: { id: 'p1', name: 'Test' } };
    mockGet.mockResolvedValue(response);

    const result = await getProject('p1');

    expect(mockGet).toHaveBeenCalledWith('/projects/p1');
    expect(result).toEqual(response);
  });
});

describe('createProject', () => {
  it('calls POST /projects with body', async () => {
    const input = { name: 'New', client: 'C', vertical: 'IT' } as CreateProjectInput;
    const response = { data: { id: 'p2', ...input } };
    mockPost.mockResolvedValue(response);

    const result = await createProject(input);

    expect(mockPost).toHaveBeenCalledWith('/projects', input);
    expect(result).toEqual(response);
  });
});

describe('updateProject', () => {
  it('calls PATCH /projects/:id with body', async () => {
    const response = { data: { id: 'p1', name: 'Updated' } };
    mockPatch.mockResolvedValue(response);

    const result = await updateProject('p1', { name: 'Updated' } as UpdateProjectInput);

    expect(mockPatch).toHaveBeenCalledWith('/projects/p1', { name: 'Updated' });
    expect(result).toEqual(response);
  });
});

describe('resubmitProject', () => {
  it('calls POST /projects/:id/resubmit', async () => {
    const response = { success: true };
    mockPost.mockResolvedValue(response);

    const result = await resubmitProject('p1');

    expect(mockPost).toHaveBeenCalledWith('/projects/p1/resubmit');
    expect(result).toEqual(response);
  });
});

describe('approveProject', () => {
  it('calls POST /projects/:id/approve', async () => {
    const response = { success: true };
    mockPost.mockResolvedValue(response);

    const result = await approveProject('p1');

    expect(mockPost).toHaveBeenCalledWith('/projects/p1/approve');
    expect(result).toEqual(response);
  });
});

describe('rejectProject', () => {
  it('calls POST /projects/:id/reject with comment', async () => {
    const response = { success: true };
    mockPost.mockResolvedValue(response);

    const result = await rejectProject('p1', 'Not ready');

    expect(mockPost).toHaveBeenCalledWith('/projects/p1/reject', { rejectionComment: 'Not ready' });
    expect(result).toEqual(response);
  });
});

describe('getTeamMembers', () => {
  it('calls GET /projects/:id/team-members', async () => {
    const response = { data: [{ employeeId: 'e1' }], meta: { total: 1 } };
    mockGet.mockResolvedValue(response);

    const result = await getTeamMembers('p1');

    expect(mockGet).toHaveBeenCalledWith('/projects/p1/team-members');
    expect(result).toEqual(response);
  });
});

describe('addTeamMember', () => {
  it('calls POST /projects/:id/team-members with body', async () => {
    const input = { employeeId: 'e1', role: 'Developer' };
    const response = { data: { employeeId: 'e1', name: 'Alice', role: 'Developer' } };
    mockPost.mockResolvedValue(response);

    const result = await addTeamMember('p1', input as AddTeamMemberInput);

    expect(mockPost).toHaveBeenCalledWith('/projects/p1/team-members', input);
    expect(result).toEqual(response);
  });
});

describe('removeTeamMember', () => {
  it('calls DELETE /projects/:id/team-members/:employeeId', async () => {
    const response = { success: true };
    mockDel.mockResolvedValue(response);

    const result = await removeTeamMember('p1', 'e1');

    expect(mockDel).toHaveBeenCalledWith('/projects/p1/team-members/e1');
    expect(result).toEqual(response);
  });
});

describe('engagementModelLabels', () => {
  it('maps all engagement models to display labels', () => {
    expect(engagementModelLabels.TIME_AND_MATERIALS).toBe('Time & Materials');
    expect(engagementModelLabels.FIXED_COST).toBe('Fixed Cost');
    expect(engagementModelLabels.AMC).toBe('AMC');
    expect(engagementModelLabels.INFRASTRUCTURE).toBe('Infrastructure');
  });
});
