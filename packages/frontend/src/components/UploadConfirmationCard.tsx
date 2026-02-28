import { Card, Descriptions, Button, Upload, message, Typography } from 'antd';
import { DownloadOutlined, UploadOutlined, CheckCircleOutlined, WarningOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd';
import type { BulkUploadResult } from '../services/uploads.api';
import { downloadErrorReport } from '../services/uploads.api';

interface Props {
  filename: string;
  result: BulkUploadResult;
  uploadEventId?: string;
  onReUpload: (file: File) => void;
}

async function downloadFailedRows(failedRows: BulkUploadResult['failedRows']) {
  const XLSX = await import('xlsx');
  const ws = XLSX.utils.json_to_sheet(
    failedRows.map((r) => ({
      row_number: r.row,
      employee_code: r.employeeCode,
      error: r.error,
    })),
  );
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Failed Rows');
  XLSX.writeFile(wb, 'failed-rows-report.xlsx');
}

function getErrorSummary(failedRows: BulkUploadResult['failedRows']): string {
  const counts = new Map<string, number>();
  for (const row of failedRows) {
    const key = row.error;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([error, count]) => `${error} (${count})`)
    .join(', ');
}

export default function UploadConfirmationCard({ filename, result, uploadEventId, onReUpload }: Props) {
  const total = result.imported + result.failed;
  const hasFailures = result.failed > 0;

  const beforeUpload = (file: UploadFile) => {
    const isXlsx = file.name?.endsWith('.xlsx');
    if (!isXlsx) {
      message.error('Please upload an .xlsx file only');
      return false;
    }
    onReUpload(file as unknown as File);
    return false;
  };

  return (
    <Card
      title={
        <span>
          {hasFailures ? <WarningOutlined style={{ color: '#faad14', marginRight: 8 }} /> : <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 8 }} />}
          Upload Results
        </span>
      }
      data-testid="upload-confirmation-card"
    >
      <Descriptions column={1} size="small">
        <Descriptions.Item label="Filename">{filename}</Descriptions.Item>
        <Descriptions.Item label="Total Rows">{total}</Descriptions.Item>
        <Descriptions.Item label="Imported">{result.imported}</Descriptions.Item>
        <Descriptions.Item label="Failed">{result.failed}</Descriptions.Item>
        {hasFailures && (
          <Descriptions.Item label="Error Summary">
            <Typography.Text type="danger">{getErrorSummary(result.failedRows)}</Typography.Text>
          </Descriptions.Item>
        )}
      </Descriptions>

      <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
        {hasFailures && (
          <Button
            icon={<DownloadOutlined />}
            onClick={() =>
              uploadEventId
                ? downloadErrorReport(uploadEventId)
                : downloadFailedRows(result.failedRows)
            }
          >
            Download Error Report
          </Button>
        )}
        <Upload accept=".xlsx" beforeUpload={beforeUpload} showUploadList={false}>
          <Button icon={<UploadOutlined />}>Re-upload Corrected File</Button>
        </Upload>
      </div>
    </Card>
  );
}
