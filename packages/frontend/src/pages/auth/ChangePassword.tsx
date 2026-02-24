import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Form, Input, Button, Alert, Typography, Card } from 'antd';
import { useAuth, getRoleLandingPage } from '../../hooks/useAuth';
import { changePassword } from '../../services/auth.api';
import { useQueryClient } from '@tanstack/react-query';
import { authKeys } from '../../services/auth.api';

const { Title, Text } = Typography;

export default function ChangePassword() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (values: { newPassword: string }) => {
    setLoading(true);
    setError(null);
    try {
      await changePassword(values.newPassword);
      // Invalidate auth cache so mustChangePassword is refreshed
      await queryClient.invalidateQueries({ queryKey: [...authKeys.me] });
      if (user) {
        navigate(getRoleLandingPage(user.role), { replace: true });
      } else {
        navigate('/login', { replace: true });
      }
    } catch {
      setError('Failed to change password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#F5F5F5' }}>
      <Card style={{ width: 400 }}>
        <Title level={3} style={{ textAlign: 'center', marginBottom: 24 }}>
          Set Your Password
        </Title>

        <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
          You must set a personal password before continuing.
        </Text>

        {error && (
          <Alert type="error" message={error} style={{ marginBottom: 16 }} showIcon />
        )}

        <Form form={form} layout="vertical" onFinish={handleSubmit} autoComplete="off">
          <Form.Item
            name="newPassword"
            label="New Password"
            rules={[
              { required: true, message: 'Password is required' },
              { min: 8, message: 'Password must be at least 8 characters' },
            ]}
          >
            <Input.Password placeholder="Enter new password" autoFocus />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            label="Confirm Password"
            dependencies={['newPassword']}
            rules={[
              { required: true, message: 'Please confirm your password' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) return Promise.resolve();
                  return Promise.reject(new Error('Passwords do not match'));
                },
              }),
            ]}
          >
            <Input.Password placeholder="Confirm new password" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading}>
              Set Password
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
