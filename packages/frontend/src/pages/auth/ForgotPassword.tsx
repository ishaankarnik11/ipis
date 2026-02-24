import { useState } from 'react';
import { Link } from 'react-router';
import { Form, Input, Button, Alert, Typography, Card } from 'antd';
import { forgotPassword } from '../../services/auth.api';

const { Title } = Typography;

export default function ForgotPassword() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (values: { email: string }) => {
    setLoading(true);
    setError(null);
    try {
      await forgotPassword(values.email);
      setSubmitted(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#F5F5F5' }}>
      <Card style={{ width: 400 }}>
        <Title level={3} style={{ textAlign: 'center', marginBottom: 24 }}>
          Forgot Password
        </Title>

        {submitted ? (
          <>
            <Alert
              type="success"
              title="If that email is registered, a reset link has been sent."
              style={{ marginBottom: 16 }}
              showIcon
            />
            <Link to="/login">Back to Login</Link>
          </>
        ) : (
          <>
            {error && (
              <Alert type="error" title={error} style={{ marginBottom: 16 }} showIcon />
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

              <Form.Item>
                <Button type="primary" htmlType="submit" block loading={loading}>
                  Send Reset Link
                </Button>
              </Form.Item>

              <Link to="/login">Back to Login</Link>
            </Form>
          </>
        )}
      </Card>
    </div>
  );
}
