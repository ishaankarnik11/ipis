import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Typography, Card, Input, Button, Alert, message } from 'antd';
import { useQueryClient } from '@tanstack/react-query';
import type { UserRole } from '@ipis/shared';
import { authKeys, requestOtp, verifyOtp } from '../../services/auth.api';
import { getRoleLandingPage } from '../../hooks/useAuth';
import OtpInput from '../../components/OtpInput';

const { Title, Text } = Typography;

type Screen = 'email' | 'otp';

export default function Login() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [screen, setScreen] = useState<Screen>('email');
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [success, setSuccess] = useState(false);

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleRequestOtp = async () => {
    if (!isValidEmail) return;
    setSending(true);
    setError(null);

    try {
      const result = await requestOtp(email);
      if ('error' in result && result.error) {
        setError(result.error.message);
      } else {
        setScreen('otp');
        setCountdown(60);
        setOtpError(null);
      }
    } catch {
      setError('Failed to send OTP. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleVerifyOtp = async (otp: string) => {
    setVerifying(true);
    setOtpError(null);

    try {
      const result = await verifyOtp(email, otp);
      if ('data' in result && result.data) {
        setSuccess(true);
        queryClient.invalidateQueries({ queryKey: [...authKeys.me] });
        setTimeout(() => {
          navigate(getRoleLandingPage(result.data.role as UserRole), { replace: true });
        }, 500);
      } else if ('error' in result && result.error) {
        const code = result.error.code;
        if (code === 'OTP_EXHAUSTED') {
          setOtpError('Too many incorrect attempts. Please request a new code.');
          setCountdown(0);
        } else if (code === 'OTP_EXPIRED') {
          setOtpError('Code expired. Please request a new one.');
          setCountdown(0);
        } else {
          const remaining = 'attemptsRemaining' in result ? (result as { attemptsRemaining?: number }).attemptsRemaining : undefined;
          setOtpError(
            remaining != null
              ? `Incorrect code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
              : 'Incorrect code.',
          );
        }
      }
    } catch {
      setOtpError('Verification failed. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    setOtpError(null);
    setSending(true);
    try {
      const result = await requestOtp(email);
      if (!('error' in result)) {
        setCountdown(60);
        message.success('New code sent to your email');
      }
    } catch {
      message.error('Failed to resend code');
    } finally {
      setSending(false);
    }
  };

  const handleBack = () => {
    setScreen('email');
    setOtpError(null);
    setError(null);
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#F5F5F5' }}>
      <Card style={{ width: 420, padding: '8px 0' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Title level={3} style={{ color: '#1677ff', margin: '0 0 4px 0' }}>IPIS</Title>
          <Text type="secondary">Internal Profitability Intelligence System</Text>
        </div>

        {screen === 'email' && (
          <>
            <Title level={4} style={{ textAlign: 'center', marginBottom: 24 }}>Sign in to IPIS</Title>

            {error && (
              <Alert type="error" message={error} style={{ marginBottom: 16 }} showIcon closable onClose={() => setError(null)} />
            )}

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>Work email</label>
              <Input
                placeholder="you@company.com"
                size="large"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onPressEnter={handleRequestOtp}
                autoFocus
                data-testid="email-input"
              />
            </div>

            <Button
              type="primary"
              size="large"
              block
              loading={sending}
              disabled={!isValidEmail || sending}
              onClick={handleRequestOtp}
              data-testid="send-otp-btn"
            >
              Send OTP
            </Button>
          </>
        )}

        {screen === 'otp' && (
          <>
            <Title level={4} style={{ textAlign: 'center', marginBottom: 8 }}>Enter verification code</Title>
            <Text style={{ display: 'block', textAlign: 'center', marginBottom: 24, color: '#666' }}>
              We sent a 6-digit code to <strong>{email}</strong>
            </Text>

            {success ? (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <div style={{ fontSize: 48, color: '#52c41a', marginBottom: 8 }}>&#10003;</div>
                <Text>Redirecting...</Text>
              </div>
            ) : (
              <>
                <OtpInput
                  onComplete={handleVerifyOtp}
                  error={otpError}
                  disabled={verifying}
                />

                <div style={{ textAlign: 'center', marginTop: 24 }}>
                  {countdown > 0 ? (
                    <Text type="secondary">
                      Resend code in {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, '0')}
                    </Text>
                  ) : (
                    <Button type="link" onClick={handleResend} loading={sending} data-testid="resend-btn">
                      Resend OTP
                    </Button>
                  )}
                </div>

                <div style={{ textAlign: 'center', marginTop: 12 }}>
                  <Button type="link" onClick={handleBack} data-testid="back-btn">
                    Use a different email
                  </Button>
                </div>
              </>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
