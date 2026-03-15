import { useRef, useEffect, useState } from 'react';

interface OtpInputProps {
  length?: number;
  onComplete: (otp: string) => void;
  error?: string | null;
  disabled?: boolean;
}

export default function OtpInput({ length = 6, onComplete, error, disabled }: OtpInputProps) {
  const [values, setValues] = useState<string[]>(Array(length).fill(''));
  const [shake, setShake] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  // Trigger shake animation on error
  useEffect(() => {
    if (error) {
      setShake(true);
      setTimeout(() => {
        setShake(false);
        setValues(Array(length).fill(''));
        inputRefs.current[0]?.focus();
      }, 400);
    }
  }, [error, length]);

  const handleChange = (index: number, value: string) => {
    if (disabled) return;

    // Handle paste
    if (value.length > 1) {
      const digits = value.replace(/\D/g, '').slice(0, length);
      const newValues = Array(length).fill('');
      for (let i = 0; i < digits.length; i++) {
        newValues[i] = digits[i];
      }
      setValues(newValues);

      if (digits.length === length) {
        onComplete(digits);
      } else {
        inputRefs.current[Math.min(digits.length, length - 1)]?.focus();
      }
      return;
    }

    const digit = value.replace(/\D/g, '');
    if (!digit && value) return; // Non-numeric input

    const newValues = [...values];
    newValues[index] = digit;
    setValues(newValues);

    if (digit && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all digits entered
    if (digit && index === length - 1) {
      const otp = newValues.join('');
      if (otp.length === length) {
        onComplete(otp);
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !values[index] && index > 0) {
      const newValues = [...values];
      newValues[index - 1] = '';
      setValues(newValues);
      inputRefs.current[index - 1]?.focus();
    }
  };

  return (
    <div>
      <div
        style={{
          display: 'flex',
          gap: 8,
          justifyContent: 'center',
          animation: shake ? 'shake 0.3s ease' : undefined,
        }}
      >
        {values.map((val, i) => (
          <input
            key={i}
            ref={(el) => { inputRefs.current[i] = el; }}
            type="text"
            inputMode="numeric"
            pattern="[0-9]"
            maxLength={i === 0 ? 6 : 1}
            autoComplete={i === 0 ? 'one-time-code' : 'off'}
            value={val}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            disabled={disabled}
            data-testid={`otp-digit-${i}`}
            style={{
              width: 48,
              height: 56,
              textAlign: 'center',
              fontSize: 24,
              fontWeight: 600,
              border: `2px solid ${error ? '#ff4d4f' : '#d9d9d9'}`,
              borderRadius: 8,
              outline: 'none',
              transition: 'border-color 0.2s',
            }}
            onFocus={(e) => { e.target.style.borderColor = '#1677ff'; }}
            onBlur={(e) => { e.target.style.borderColor = error ? '#ff4d4f' : '#d9d9d9'; }}
          />
        ))}
      </div>
      {error && (
        <p style={{ color: '#ff4d4f', textAlign: 'center', marginTop: 12, fontSize: 14 }}>
          {error}
        </p>
      )}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-8px); }
          75% { transform: translateX(8px); }
        }
      `}</style>
    </div>
  );
}
