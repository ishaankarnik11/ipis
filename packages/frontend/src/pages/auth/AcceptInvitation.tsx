import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { Typography, Card, Input, Select, Button, Alert, Spin, Result } from 'antd';
import { useQueryClient } from '@tanstack/react-query';
import type { UserRole } from '@ipis/shared';
import {
  authKeys,
  validateInvitation,
  completeProfile,
  type InvitationData,
} from '../../services/auth.api';
import { getRoleLandingPage } from '../../hooks/useAuth';

const { Title, Text } = Typography;

const roleLabels: Record<string, string> = {
  ADMIN: 'Administrator',
  FINANCE: 'Finance Manager',
  HR: 'HR Manager',
  DELIVERY_MANAGER: 'Delivery Manager',
  DEPT_HEAD: 'Department Head',
};

export default function AcceptInvitation() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [loading, setLoading] = useState(true);
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [errorState, setErrorState] = useState<{ code: string; message: string } | null>(null);

  const [name, setName] = useState('');
  const [departmentId, setDepartmentId] = useState<string | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [userRole, setUserRole] = useState<string>('ADMIN');

  useEffect(() => {
    if (!token) {
      setErrorState({ code: 'INVITATION_INVALID', message: 'Invalid invitation link' });
      setLoading(false);
      return;
    }

    validateInvitation(token).then((result) => {
      if (result.valid && result.data) {
        setInvitation(result.data);
        setUserRole(result.data.role);
      } else {
        setErrorState({ code: result.error ?? 'UNKNOWN', message: result.message ?? 'Invalid invitation' });
      }
      setLoading(false);
    }).catch(() => {
      setErrorState({ code: 'NETWORK_ERROR', message: 'Failed to validate invitation. Please try again.' });
      setLoading(false);
    });
  }, [token]);

  const handleSubmit = async () => {
    if (!token || name.trim().length < 2) return;
    setSubmitting(true);
    setSubmitError(null);

    try {
      const result = await completeProfile({ token, name: name.trim(), departmentId: departmentId ?? null });
      if ('data' in result && result.data) {
        setSuccess(true);
        queryClient.invalidateQueries({ queryKey: [...authKeys.me] });
        setTimeout(() => {
          navigate(getRoleLandingPage(result.data.role as UserRole), { replace: true });
        }, 1500);
      } else if ('error' in result && result.error) {
        setSubmitError(result.error.message);
      }
    } catch {
      setSubmitError('Failed to complete setup. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#F5F5F5' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (errorState) {
    const isExpired = errorState.code === 'INVITATION_EXPIRED';
    const isUsed = errorState.code === 'INVITATION_USED';

    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#F5F5F5' }}>
        <Card style={{ width: 420 }}>
          <Result
            status={isExpired ? 'warning' : isUsed ? 'info' : 'error'}
            title={
              isExpired ? 'Invitation Expired' :
              isUsed ? 'Already Used' :
              'Invalid Invitation'
            }
            subTitle={errorState.message}
            extra={isUsed && <Link to="/login"><Button type="primary">Go to Login</Button></Link>}
          />
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#F5F5F5' }}>
        <Card style={{ width: 420, textAlign: 'center', padding: '24px 0' }}>
          <div style={{ fontSize: 48, color: '#52c41a', marginBottom: 16 }}>&#10003;</div>
          <Title level={4}>You're all set!</Title>
          <Text type="secondary">Redirecting to your dashboard...</Text>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#F5F5F5' }}>
      <Card style={{ width: 420, padding: '8px 0' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Title level={3} style={{ color: '#1677ff', margin: '0 0 4px 0' }}>IPIS</Title>
          <Title level={4} style={{ margin: '0 0 8px 0' }}>Welcome to IPIS</Title>
          <Text>
            You've been invited as <strong>{roleLabels[userRole] ?? userRole}</strong>
          </Text>
        </div>

        {submitError && (
          <Alert type="error" message={submitError} style={{ marginBottom: 16 }} showIcon closable onClose={() => setSubmitError(null)} />
        )}

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>Email</label>
          <Input value={invitation?.email ?? ''} disabled size="large" />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>Full Name</label>
          <Input
            placeholder="Enter your full name"
            size="large"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            status={name.length > 0 && name.trim().length < 2 ? 'error' : ''}
            data-testid="name-input"
          />
          {name.length > 0 && name.trim().length < 2 && (
            <Text type="danger" style={{ fontSize: 12 }}>Name must be at least 2 characters</Text>
          )}
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>Department <Text type="secondary">(optional)</Text></label>
          <Select
            placeholder="— Select department (optional) —"
            size="large"
            style={{ width: '100%' }}
            allowClear
            value={departmentId}
            onChange={setDepartmentId}
            options={(invitation?.departments ?? []).map((d) => ({ value: d.id, label: d.name }))}
            data-testid="department-select"
          />
        </div>

        <Button
          type="primary"
          size="large"
          block
          loading={submitting}
          disabled={name.trim().length < 2 || submitting}
          onClick={handleSubmit}
          data-testid="complete-setup-btn"
        >
          Complete Setup
        </Button>
      </Card>
    </div>
  );
}
