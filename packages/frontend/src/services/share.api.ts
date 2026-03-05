import { message } from 'antd';

export interface ShareLinkParams {
  reportType: string;
  entityId: string;
  period: string;
}

export interface ShareLinkResponse {
  token: string;
  shareUrl: string;
  expiresAt: string;
}

export async function createShareLink(params: ShareLinkParams): Promise<ShareLinkResponse> {
  const res = await fetch('/api/v1/reports/share', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: { message: 'Failed to create share link' } }));
    throw new Error(error.error?.message ?? 'Failed to create share link');
  }

  const body = await res.json();
  return body.data;
}

export async function shareReport(params: ShareLinkParams): Promise<void> {
  try {
    const result = await createShareLink(params);
    const fullUrl = `${window.location.origin}${result.shareUrl}`;
    try {
      await navigator.clipboard.writeText(fullUrl);
      message.success('Share link copied to clipboard');
    } catch {
      message.info(`Share link created: ${fullUrl}`, 8);
    }
  } catch (err) {
    message.error(err instanceof Error ? err.message : 'Failed to create share link');
    throw err;
  }
}
