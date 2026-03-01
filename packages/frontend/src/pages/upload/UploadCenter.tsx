import { useState, useEffect } from 'react';
import { Upload, Spin, Typography, Modal, Progress, Alert, Button, Row, Col, message } from 'antd';
import { InboxOutlined, DownloadOutlined } from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { RcFile } from 'antd/es/upload';
import { ApiError } from '../../services/api';
import {
  uploadKeys,
  uploadTimesheetFile,
  uploadBillingFile,
  uploadSalaryFile,
  downloadErrorReport,
  downloadTemplate,
} from '../../services/uploads.api';
import type {
  TimesheetUploadResult,
  BillingUploadResult,
  SalaryUploadResult,
} from '../../services/uploads.api';
import { employeeKeys } from '../../services/employees.api';
import { useAuth } from '../../hooks/useAuth';
import { useUploadProgress } from '../../hooks/useUploadProgress';
import UploadConfirmationCard from '../../components/UploadConfirmationCard';
import UploadHistoryLog from '../../components/UploadHistoryLog';
import DataPeriodIndicator from '../../components/DataPeriodIndicator';

const { Dragger } = Upload;

type UploadType = 'timesheet' | 'billing' | 'salary';

interface ZoneConfig {
  key: UploadType;
  label: string;
  hint: string;
  roles: string[];
  testId: string;
}

const ZONES: ZoneConfig[] = [
  {
    key: 'timesheet',
    label: 'Upload Timesheet Data (.xlsx)',
    hint: 'Click or drag a timesheet .xlsx file to upload',
    roles: ['FINANCE', 'ADMIN'],
    testId: 'upload-zone-timesheet',
  },
  {
    key: 'billing',
    label: 'Upload Billing / Revenue Data (.xlsx)',
    hint: 'Click or drag a billing .xlsx file to upload',
    roles: ['FINANCE', 'ADMIN'],
    testId: 'upload-zone-billing',
  },
  {
    key: 'salary',
    label: 'Upload Employee Salary Master (.xlsx)',
    hint: 'Click or drag a salary .xlsx file to upload',
    roles: ['HR', 'ADMIN'],
    testId: 'upload-zone-salary',
  },
];

interface TimesheetState {
  result?: TimesheetUploadResult;
  error?: ApiError;
}

interface BillingState {
  result?: BillingUploadResult;
  sseTrackingId?: string;
  error?: ApiError;
}

interface SalaryState {
  filename?: string;
  result?: SalaryUploadResult;
  error?: ApiError;
}

export default function UploadCenter() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const role = user?.role ?? '';

  // Tablet detection
  const [isTablet, setIsTablet] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia('(min-width: 768px) and (max-width: 1023px)');
    setIsTablet(mql.matches);
    const handler = (e: MediaQueryListEvent) => setIsTablet(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  // Per-zone state
  const [tsState, setTsState] = useState<TimesheetState>({});
  const [billState, setBillState] = useState<BillingState>({});
  const [salState, setSalState] = useState<SalaryState>({});
  const [isDownloading, setIsDownloading] = useState(false);

  // SSE progress for billing uploads
  const billingProgress = useUploadProgress(billState.sseTrackingId ?? null);

  // Mutations
  const timesheetMutation = useMutation({
    mutationFn: uploadTimesheetFile,
    onSuccess: (response) => {
      setTsState({ result: response.data });
      queryClient.invalidateQueries({ queryKey: [...uploadKeys.history] });
      queryClient.invalidateQueries({ queryKey: [...uploadKeys.latestByType] });
      message.success(`Timesheet import complete: ${response.data.rowCount} rows`);
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        setTsState({ error });
      } else {
        message.error(error instanceof Error ? error.message : 'Upload failed');
      }
    },
  });

  const billingMutation = useMutation({
    mutationFn: uploadBillingFile,
    onSuccess: (response) => {
      setBillState({ result: response.data, sseTrackingId: response.data.uploadEventId });
      queryClient.invalidateQueries({ queryKey: [...uploadKeys.history] });
      queryClient.invalidateQueries({ queryKey: [...uploadKeys.latestByType] });
      message.success(`Billing import complete: ${response.data.rowCount} rows`);
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        setBillState({ error });
      } else {
        message.error(error instanceof Error ? error.message : 'Upload failed');
      }
    },
  });

  const salaryMutation = useMutation({
    mutationFn: (file: File) => uploadSalaryFile(file),
    onSuccess: (response, file) => {
      setSalState({ filename: file.name, result: response.data });
      queryClient.invalidateQueries({ queryKey: [...employeeKeys.all] });
      queryClient.invalidateQueries({ queryKey: [...uploadKeys.history] });
      queryClient.invalidateQueries({ queryKey: [...uploadKeys.latestByType] });
      message.success(`Salary import complete: ${response.data.imported} rows imported`);
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        setSalState({ error });
      } else {
        message.error(error instanceof Error ? error.message : 'Upload failed');
      }
    },
  });

  const getMutation = (type: UploadType) => {
    if (type === 'timesheet') return timesheetMutation;
    if (type === 'billing') return billingMutation;
    return salaryMutation;
  };

  const handleBeforeUpload = (type: UploadType, file: RcFile) => {
    if (!file.name.endsWith('.xlsx')) {
      message.error('Please upload an .xlsx file only');
      return false;
    }

    if (type === 'timesheet' || type === 'billing') {
      // Show confirmation for replacement uploads
      Modal.confirm({
        title: 'Replace Existing Data?',
        content: `Uploading this file will replace all existing ${type} data for the detected period. This action cannot be undone.`,
        okText: 'Upload & Replace',
        cancelText: 'Cancel',
        onOk: () => {
          if (type === 'timesheet') {
            setTsState({});
            timesheetMutation.mutate(file);
          } else {
            setBillState({});
            billingMutation.mutate(file);
          }
        },
      });
    } else {
      // Salary — direct upload (partial import, no replacement)
      setSalState({});
      salaryMutation.mutate(file);
    }

    return false; // prevent antd default upload
  };

  const handleSalaryReUpload = (file: File) => {
    setSalState({});
    salaryMutation.mutate(file);
  };

  const visibleZones = ZONES.filter((z) => z.roles.includes(role));

  return (
    <div>
      <h2 style={{ marginTop: 0, marginBottom: 8 }}>Upload Center</h2>
      <div style={{ marginBottom: 24 }}>
        <DataPeriodIndicator />
      </div>

      {isTablet && (
        <Alert
          type="info"
          message="Upload not available on tablet — please use a desktop browser"
          style={{ marginBottom: 24 }}
          data-testid="tablet-warning"
        />
      )}

      <Row gutter={[24, 24]}>
        {visibleZones.map((zone) => {
          const mutation = getMutation(zone.key);
          return (
            <Col key={zone.key} xs={24} lg={8} data-testid={zone.testId}>
              <Spin spinning={mutation.isPending} description="Uploading...">
                <Dragger
                  accept=".xlsx"
                  beforeUpload={(file) => handleBeforeUpload(zone.key, file)}
                  showUploadList={false}
                  disabled={isTablet || mutation.isPending}
                  multiple={false}
                >
                  <p className="ant-upload-drag-icon">
                    <InboxOutlined />
                  </p>
                  <p className="ant-upload-text">{zone.label}</p>
                  <p className="ant-upload-hint">{zone.hint}</p>
                </Dragger>
              </Spin>

              <Typography.Link
                onClick={downloadTemplate}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 8 }}
              >
                <DownloadOutlined /> Download Template
              </Typography.Link>
            </Col>
          );
        })}
      </Row>

      {/* Timesheet result / error */}
      {tsState.error && tsState.error.status === 422 && (
        <Alert
          type="error"
          message="Timesheet Upload Rejected"
          description={
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              {tsState.error.error.details?.map((d, i) => (
                <li key={i}>{d.message}</li>
              ))}
            </ul>
          }
          style={{ marginTop: 16 }}
          data-testid="validation-error-panel-timesheet"
          closable
          onClose={() => setTsState({})}
        />
      )}
      {tsState.error && tsState.error.status !== 422 && (
        <Alert
          type="error"
          message="Timesheet Upload Failed"
          description={tsState.error.error.message || `Server error (${tsState.error.status})`}
          style={{ marginTop: 16 }}
          closable
          onClose={() => setTsState({})}
        />
      )}
      {tsState.result && (
        <Alert
          type="success"
          message={`Timesheet upload successful — ${tsState.result.rowCount} rows imported${tsState.result.replacedRowsCount ? ` (replaced ${tsState.result.replacedRowsCount} existing rows)` : ''}`}
          style={{ marginTop: 16 }}
          closable
          onClose={() => setTsState({})}
        />
      )}

      {/* Billing result / error / progress */}
      {billState.error && billState.error.status === 422 && (
        <Alert
          type="error"
          message="Billing Upload Rejected"
          description={
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              {billState.error.error.details?.map((d, i) => (
                <li key={i}>{d.message}</li>
              ))}
            </ul>
          }
          style={{ marginTop: 16 }}
          data-testid="validation-error-panel-billing"
          closable
          onClose={() => setBillState({})}
        />
      )}
      {billState.error && billState.error.status !== 422 && (
        <Alert
          type="error"
          message="Billing Upload Failed"
          description={billState.error.error.message || `Server error (${billState.error.status})`}
          style={{ marginTop: 16 }}
          closable
          onClose={() => setBillState({})}
        />
      )}
      {billState.sseTrackingId && !billingProgress.isComplete && !billingProgress.error && (
        <div style={{ marginTop: 16 }} data-testid="billing-progress">
          <Typography.Text>Recalculating profitability...</Typography.Text>
          <Progress
            percent={billingProgress.percent}
            status={billingProgress.connectionLost ? 'exception' : 'active'}
            format={() => billingProgress.stage || 'Processing...'}
          />
          {billingProgress.connectionLost && (
            <Alert
              type="warning"
              message="Connection lost — refresh to check status"
              style={{ marginTop: 8 }}
              data-testid="connection-lost-warning"
            />
          )}
        </div>
      )}
      {billingProgress.isComplete && billState.result && (
        <Alert
          type="success"
          message={`Billing upload successful — ${billState.result.rowCount} rows imported. Recalculation complete.`}
          style={{ marginTop: 16 }}
          closable
          onClose={() => setBillState({})}
        />
      )}
      {billingProgress.error && (
        <Alert
          type="warning"
          message={`Billing data imported successfully, but recalculation failed: ${billingProgress.error}`}
          style={{ marginTop: 16 }}
          closable
        />
      )}

      {/* Salary result / error */}
      {salState.error && salState.error.status === 422 && (
        <Alert
          type="error"
          message="Salary Upload Rejected"
          description={
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              {salState.error.error.details?.map((d, i) => (
                <li key={i}>{d.message}</li>
              ))}
            </ul>
          }
          style={{ marginTop: 16 }}
          data-testid="validation-error-panel-salary"
          closable
          onClose={() => setSalState({})}
        />
      )}
      {salState.error && salState.error.status !== 422 && (
        <Alert
          type="error"
          message="Salary Upload Failed"
          description={salState.error.error.message || `Server error (${salState.error.status})`}
          style={{ marginTop: 16 }}
          closable
          onClose={() => setSalState({})}
        />
      )}
      {salState.result && salState.filename && (
        <div style={{ marginTop: 24 }}>
          <UploadConfirmationCard
            filename={salState.filename}
            result={salState.result}
            uploadEventId={salState.result.uploadEventId}
            onReUpload={handleSalaryReUpload}
          />
          {salState.result.failed > 0 && (
            <Button
              icon={<DownloadOutlined />}
              loading={isDownloading}
              onClick={async () => {
                try {
                  setIsDownloading(true);
                  await downloadErrorReport(salState.result!.uploadEventId);
                } catch {
                  message.error('Failed to download error report');
                } finally {
                  setIsDownloading(false);
                }
              }}
              style={{ marginTop: 8 }}
              data-testid="download-error-report-btn"
            >
              Download Error Report
            </Button>
          )}
        </div>
      )}

      <div style={{ marginTop: 32 }}>
        <UploadHistoryLog />
      </div>
    </div>
  );
}
