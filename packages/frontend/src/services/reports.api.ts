import { message } from 'antd';

export interface PdfExportParams {
  reportType: string;
  entityId?: string;
  period: string;
}

export async function exportPdf(params: PdfExportParams): Promise<void> {
  const hide = message.loading('Generating PDF\u2026', 0);

  try {
    const res = await fetch('/api/v1/reports/export/pdf', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: { message: 'Export failed' } }));
      throw new Error(error.error?.message ?? 'Export failed');
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;

    // Extract filename from Content-Disposition header (sanitized)
    const disposition = res.headers.get('Content-Disposition');
    const filenameMatch = disposition?.match(/filename="?([^";\n]+)"?/);
    const rawFilename = filenameMatch?.[1]?.trim() ?? 'report.pdf';
    a.download = /^[\w\-.]+$/.test(rawFilename) ? rawFilename : 'report.pdf';

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    message.success('PDF downloaded');
  } catch (err) {
    message.error(err instanceof Error ? err.message : 'PDF export failed');
    throw err;
  } finally {
    hide();
  }
}
