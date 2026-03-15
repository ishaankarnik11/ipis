import { Navigate } from 'react-router';

// Password infrastructure removed — OTP-based auth (Epic 14)
export default function ResetPassword() {
  return <Navigate to="/login" replace />;
}
