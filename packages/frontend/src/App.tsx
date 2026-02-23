import { BrowserRouter, Routes, Route } from 'react-router';
import { Typography } from 'antd';

function HomePage() {
  return (
    <div style={{ padding: 24 }}>
      <Typography.Title level={2}>IPIS</Typography.Title>
      <Typography.Text>Internal Profitability Intelligence System</Typography.Text>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
      </Routes>
    </BrowserRouter>
  );
}
