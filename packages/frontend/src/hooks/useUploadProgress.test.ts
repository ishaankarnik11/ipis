import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { createElement } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useUploadProgress } from './useUploadProgress';

// Mock EventSource
class MockEventSource {
  static instances: MockEventSource[] = [];
  onmessage: ((event: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  url: string;
  close = vi.fn();

  constructor(url: string) {
    this.url = url;
    MockEventSource.instances.push(this);
  }

  simulateMessage(data: object) {
    this.onmessage?.({ data: JSON.stringify(data) });
  }

  simulateError() {
    this.onerror?.();
  }
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('useUploadProgress', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    MockEventSource.instances = [];
    vi.stubGlobal('EventSource', MockEventSource);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('should return initial state when uploadEventId is null', () => {
    const { result } = renderHook(() => useUploadProgress(null), { wrapper: createWrapper() });
    expect(result.current).toEqual({
      stage: '',
      percent: 0,
      isComplete: false,
      error: null,
      connectionLost: false,
    });
  });

  it('should create EventSource when uploadEventId is provided', () => {
    renderHook(() => useUploadProgress('test-id'), { wrapper: createWrapper() });
    expect(MockEventSource.instances).toHaveLength(1);
    expect(MockEventSource.instances[0].url).toBe('/api/v1/uploads/progress/test-id');
  });

  it('should update state on UPLOAD_PROGRESS event', () => {
    const { result } = renderHook(() => useUploadProgress('test-id'), { wrapper: createWrapper() });
    const es = MockEventSource.instances[0];

    act(() => {
      es.simulateMessage({ type: 'UPLOAD_PROGRESS', stage: 'Validating rows…', percent: 45 });
    });

    expect(result.current.stage).toBe('Validating rows…');
    expect(result.current.percent).toBe(45);
    expect(result.current.isComplete).toBe(false);
  });

  it('should set complete on RECALC_COMPLETE event', () => {
    const { result } = renderHook(() => useUploadProgress('test-id'), { wrapper: createWrapper() });
    const es = MockEventSource.instances[0];

    act(() => {
      es.simulateMessage({ type: 'RECALC_COMPLETE', runId: 'run-1', projectsProcessed: 5, snapshotsWritten: 15 });
    });

    expect(result.current.isComplete).toBe(true);
    expect(result.current.percent).toBe(100);
    expect(result.current.stage).toBe('Complete');
    expect(es.close).toHaveBeenCalled();
  });

  it('should set error on RECALC_FAILED event', () => {
    const { result } = renderHook(() => useUploadProgress('test-id'), { wrapper: createWrapper() });
    const es = MockEventSource.instances[0];

    act(() => {
      es.simulateMessage({ type: 'RECALC_FAILED', error: 'Engine error' });
    });

    expect(result.current.error).toBe('Engine error');
    expect(result.current.stage).toBe('Failed');
    expect(es.close).toHaveBeenCalled();
  });

  it('should retry once after 3s on error, then set connectionLost', async () => {
    const { result } = renderHook(() => useUploadProgress('test-id'), { wrapper: createWrapper() });
    const es1 = MockEventSource.instances[0];

    // First error — should retry
    act(() => {
      es1.simulateError();
    });
    expect(es1.close).toHaveBeenCalled();
    expect(result.current.connectionLost).toBe(false);

    // Advance timer for retry
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(MockEventSource.instances).toHaveLength(2);

    // Second error — should give up
    const es2 = MockEventSource.instances[1];
    act(() => {
      es2.simulateError();
    });

    expect(result.current.connectionLost).toBe(true);
  });

  it('should close EventSource on unmount', () => {
    const { unmount } = renderHook(() => useUploadProgress('test-id'), { wrapper: createWrapper() });
    const es = MockEventSource.instances[0];
    unmount();
    expect(es.close).toHaveBeenCalled();
  });

  it('should reset state when uploadEventId changes to null', () => {
    const { result, rerender } = renderHook(
      ({ id }: { id: string | null }) => useUploadProgress(id),
      { wrapper: createWrapper(), initialProps: { id: 'test-id' as string | null } },
    );
    const es = MockEventSource.instances[0];

    act(() => {
      es.simulateMessage({ type: 'UPLOAD_PROGRESS', stage: 'Working', percent: 50 });
    });
    expect(result.current.percent).toBe(50);

    rerender({ id: null });
    expect(result.current).toEqual({
      stage: '',
      percent: 0,
      isComplete: false,
      error: null,
      connectionLost: false,
    });
  });
});
