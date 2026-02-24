import { useState } from 'react';
import { Upload, Spin, Typography, message } from 'antd';
import { InboxOutlined, DownloadOutlined } from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { RcFile } from 'antd/es/upload';
import { employeeKeys } from '../../services/employees.api';
import { uploadKeys, uploadSalaryFile, downloadTemplate } from '../../services/uploads.api';
import type { BulkUploadResult } from '../../services/uploads.api';
import { useAuth } from '../../hooks/useAuth';
import UploadConfirmationCard from '../../components/UploadConfirmationCard';
import UploadHistoryLog from '../../components/UploadHistoryLog';

const { Dragger } = Upload;

export default function UploadCenter() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [uploadResult, setUploadResult] = useState<{ filename: string; result: BulkUploadResult } | null>(null);

  const uploadMutation = useMutation({
    mutationFn: uploadSalaryFile,
    onSuccess: (response, file) => {
      setUploadResult({ filename: file.name, result: response.data });
      queryClient.invalidateQueries({ queryKey: [...employeeKeys.all] });
      queryClient.invalidateQueries({ queryKey: [...uploadKeys.history] });
      message.success(`Import complete: ${response.data.imported} rows imported`);
    },
    onError: (error) => {
      message.error(error instanceof Error ? error.message : 'Upload failed');
    },
  });

  // antd's beforeUpload receives RcFile (extends native File) at runtime
  const beforeUpload = (file: RcFile) => {
    if (!file.name.endsWith('.xlsx')) {
      message.error('Please upload an .xlsx file only');
      return false;
    }
    uploadMutation.mutate(file);
    return false; // prevent antd's default upload; we handle it via mutation
  };

  const handleReUpload = (file: File) => {
    setUploadResult(null);
    uploadMutation.mutate(file);
  };

  return (
    <div>
      <h2 style={{ marginTop: 0, marginBottom: 24 }}>Upload Center</h2>

      <div style={{ maxWidth: 600 }}>
        <Spin spinning={uploadMutation.isPending} description="Uploading...">
          <Dragger
            accept=".xlsx"
            beforeUpload={beforeUpload}
            showUploadList={false}
            disabled={uploadMutation.isPending}
            multiple={false}
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">Upload Employee Salary Master (.xlsx)</p>
            <p className="ant-upload-hint">Click or drag an .xlsx file to this area to upload</p>
          </Dragger>
        </Spin>

        <Typography.Link
          onClick={downloadTemplate}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 8 }}
        >
          <DownloadOutlined /> Download Sample Template
        </Typography.Link>
      </div>

      {uploadResult && (
        <div style={{ marginTop: 24 }}>
          <UploadConfirmationCard
            filename={uploadResult.filename}
            result={uploadResult.result}
            onReUpload={handleReUpload}
          />
        </div>
      )}

      <div style={{ marginTop: 32 }}>
        <UploadHistoryLog
          recentUploads={uploadResult ? [{
            id: 'session-latest',
            fileType: 'Salary Master',
            uploadDate: new Date().toLocaleString(),
            uploadedBy: user?.name ?? '—',
            recordsImported: uploadResult.result.imported,
          }] : []}
        />
      </div>
    </div>
  );
}
