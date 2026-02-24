import { useNavigate, useSearchParams, Link } from 'react-router';
import { Form, Input, Button, Alert, Typography, Card } from 'antd';
import { useLogin } from '../../hooks/useAuth';
import type { UserRole } from '@ipis/shared';
import { getRoleLandingPage } from '../../hooks/useAuth';

const { Title } = Typography;

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const loginMutation = useLogin();
  const [form] = Form.useForm();

  const expired = searchParams.get('expired') === 'true';
  const resetSuccess = searchParams.get('reset') === 'success';

  const handleSubmit = async (values: { email: string; password: string }) => {
    try {
      const result = await loginMutation.mutateAsync(values);
      // After login, if mustChangePassword is set, the AuthGuard / me response will handle redirect
      // But we need to check the me endpoint response after login
      // The login response doesn't include mustChangePassword, but after invalidation
      // the useAuth hook will pick it up. For immediate redirect, we check from login result.
      navigate(getRoleLandingPage(result.data.role as UserRole), { replace: true });
    } catch {
      // Error displayed via loginMutation.isError state
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#F5F5F5' }}>
      <Card style={{ width: 400 }}>
        <Title level={3} style={{ textAlign: 'center', marginBottom: 24 }}>
          IPIS Login
        </Title>

        {expired && (
          <Alert
            type="info"
            title="Your session has expired. Please log in again."
            style={{ marginBottom: 16 }}
            showIcon
          />
        )}

        {resetSuccess && (
          <Alert
            type="success"
            title="Password updated. Please log in."
            style={{ marginBottom: 16 }}
            showIcon
          />
        )}

        {loginMutation.isError && (
          <Alert
            type="error"
            title={
              loginMutation.error instanceof Error
                ? loginMutation.error.message
                : 'Invalid email or password'
            }
            style={{ marginBottom: 16 }}
            showIcon
          />
        )}

        <Form form={form} layout="vertical" onFinish={handleSubmit} autoComplete="off">
          <Form.Item
            label="Email"
            name="email"
            rules={[
              { required: true, message: 'Email is required' },
              { type: 'email', message: 'Please enter a valid email' },
            ]}
          >
            <Input placeholder="Enter your email" autoFocus />
          </Form.Item>

          <Form.Item
            label="Password"
            name="password"
            rules={[{ required: true, message: 'Password is required' }]}
          >
            <Input.Password placeholder="Enter your password" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={loginMutation.isPending}>
              Log In
            </Button>
          </Form.Item>

          <div style={{ textAlign: 'center' }}>
            <Link to="/forgot-password">Forgot password?</Link>
          </div>
        </Form>
      </Card>
    </div>
  );
}
