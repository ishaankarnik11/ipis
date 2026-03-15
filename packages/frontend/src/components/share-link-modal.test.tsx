import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfigProvider } from 'antd';
import ShareLinkModal from './ShareLinkModal';

// Mock antd message
const mockMessageSuccess = vi.fn();
vi.mock('antd', async () => {
  const actual = await vi.importActual('antd');
  return {
    ...actual,
    message: {
      success: (...args: unknown[]) => mockMessageSuccess(...args),
      info: vi.fn(),
    },
  };
});

function renderModal(props: { open: boolean; shareUrl: string; onClose: () => void }) {
  return render(
    <ConfigProvider theme={{ hashed: false }} wave={{ disabled: true }}>
      <ShareLinkModal {...props} />
    </ConfigProvider>,
  );
}

describe('ShareLinkModal', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('should render modal with share URL in a read-only input', () => {
    renderModal({ open: true, shareUrl: 'http://localhost/reports/shared/abc123', onClose: vi.fn() });

    const input = screen.getByDisplayValue('http://localhost/reports/shared/abc123');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('readonly');
  });

  it('should render Copy Link button', () => {
    renderModal({ open: true, shareUrl: 'http://localhost/reports/shared/abc123', onClose: vi.fn() });

    expect(screen.getByRole('button', { name: /copy link/i })).toBeInTheDocument();
  });

  it('should have a clickable Copy Link button', async () => {
    renderModal({ open: true, shareUrl: 'http://localhost/reports/shared/abc123', onClose: vi.fn() });
    const user = userEvent.setup({ delay: null });

    const copyButton = screen.getByRole('button', { name: /copy link/i });
    expect(copyButton).toBeInTheDocument();
    expect(copyButton).not.toBeDisabled();

    // Click should not throw
    await user.click(copyButton);
  });

  it('should stay open until explicitly closed', () => {
    const onClose = vi.fn();
    renderModal({ open: true, shareUrl: 'http://localhost/reports/shared/abc123', onClose });

    // Modal should be visible
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    // onClose not called until user action
    expect(onClose).not.toHaveBeenCalled();
  });

  it('should not render when closed', () => {
    renderModal({ open: false, shareUrl: '', onClose: vi.fn() });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should show expiry info text', () => {
    renderModal({ open: true, shareUrl: 'http://localhost/reports/shared/abc123', onClose: vi.fn() });

    expect(screen.getByText(/expires in 30 days/i)).toBeInTheDocument();
  });
});
