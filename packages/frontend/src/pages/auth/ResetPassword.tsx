import { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router';
import { Form, Input, Button, Alert, Typography, Card, Spin } from 'antd';
import { validateResetToken, resetPassword } from '../../services/auth.api';

const { Title } = Typography;

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';

  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setTokenValid(false);
      setValidating(false);
      return;
    }

    validateResetToken(token)
      .then((res) => {
        setTokenValid(res.data.valid);
      })
      .catch(() => {
        setTokenValid(false);
      })
      .finally(() => {
        setValidating(false);
      });
  }, [token]);

  const handleSubmit = async (values: { newPassword: string }) => {
    setLoading(true);
    setError(null);
    try {
      await resetPassword(token, values.newPassword);
      navigate('/login?reset=success', { replace: true });
    } catch {
      setError('Failed to reset password. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  if (validating) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#F5F5F5' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#F5F5F5' }}>
      <Card style={{ width: 400 }}>
        <Title level={3} style={{ textAlign: 'center', marginBottom: 24 }}>
          Reset Password
        </Title>

        {!tokenValid ? (
          <>
            <Alert
              type="error"
              title="This reset link has expired or already been used. Request a new one."
              style={{ marginBottom: 16 }}
              showIcon
            />
            <Link to="/forgot-password">Request a new reset link</Link>
          </>
        ) : (
          <>
            {error && (
              <Alert type="error" title={error} style={{ marginBottom: 16 }} showIcon />
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
                <Input.Password placeholder="Enter new password" />
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
                  Reset Password
                </Button>
              </Form.Item>
            </Form>
          </>
        )}
      </Card>
    </div>
  );
}
