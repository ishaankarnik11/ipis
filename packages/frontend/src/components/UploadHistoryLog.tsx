import { Table, Empty } from 'antd';
import type { ColumnsType } from 'antd/es/table';

export interface UploadHistoryEntry {
  id: string;
  fileType: string;
  uploadDate: string;
  uploadedBy: string;
  recordsImported: number;
}

interface Props {
  recentUploads?: UploadHistoryEntry[];
}

const columns: ColumnsType<UploadHistoryEntry> = [
  { title: 'File Type', dataIndex: 'fileType', key: 'fileType' },
  { title: 'Upload Date', dataIndex: 'uploadDate', key: 'uploadDate' },
  { title: 'Uploaded By', dataIndex: 'uploadedBy', key: 'uploadedBy' },
  {
    title: 'Records Imported',
    dataIndex: 'recordsImported',
    key: 'recordsImported',
    align: 'right',
  },
];

export default function UploadHistoryLog({ recentUploads = [] }: Props) {
  // Upload history API will be built in Epic 5 (Story 5.1).
  // For now, show recent session uploads; full history comes from the API later.
  const data: UploadHistoryEntry[] = recentUploads;

  return (
    <div>
      <h3 style={{ marginTop: 0 }}>Upload History</h3>
      <Table<UploadHistoryEntry>
        size="small"
        columns={columns}
        dataSource={data}
        rowKey="id"
        locale={{ emptyText: <Empty description="No upload history yet" /> }}
        pagination={false}
      />
    </div>
  );
}
