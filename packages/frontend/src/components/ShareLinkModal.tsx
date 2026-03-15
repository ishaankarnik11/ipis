import { useState } from 'react';
import { Modal, Input, Button, Space, message } from 'antd';
import { CopyOutlined, CheckOutlined } from '@ant-design/icons';

interface ShareLinkModalProps {
  open: boolean;
  shareUrl: string;
  expiresAt?: string;
  onClose: () => void;
}

export default function ShareLinkModal({ open, shareUrl, expiresAt, onClose }: ShareLinkModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      message.success('Link copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      message.info('Please copy the link manually');
    }
  };

  const handleClose = () => {
    setCopied(false);
    onClose();
  };

  const expiryText = expiresAt
    ? `Expires ${new Date(expiresAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}`
    : 'The link expires in 30 days';

  return (
    <Modal
      title="Share Link"
      open={open}
      onCancel={handleClose}
      footer={null}
      destroyOnHidden
    >
      <p style={{ marginBottom: 12, color: '#666' }}>
        Anyone with this link can view a read-only snapshot of this report. {expiryText}.
      </p>
      <Space.Compact style={{ width: '100%' }}>
        <Input
          value={shareUrl}
          readOnly
          style={{ flex: 1 }}
          onFocus={(e) => e.target.select()}
        />
        <Button
          type="primary"
          icon={copied ? <CheckOutlined /> : <CopyOutlined />}
          onClick={handleCopy}
        >
          {copied ? 'Copied!' : 'Copy Link'}
        </Button>
      </Space.Compact>
    </Modal>
  );
}
