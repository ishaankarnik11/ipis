import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Typography, Card, Row, Col, Statistic, Space, Empty, Spin, Progress, Button, message } from 'antd';
import { FilePdfOutlined, ShareAltOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { formatCurrency, formatPercent } from '@ipis/shared';
import {
  reportKeys,
  getExecutiveDashboard,
  getPracticeDashboard,
  type ExecutiveDashboardData,
  type PracticeDashboardItem,
} from '../../services/dashboards.api';
import MarginHealthBadge from '../../components/MarginHealthBadge';
import AtRiskKPITile from '../../components/AtRiskKPITile';
import DataPeriodIndicator from '../../components/DataPeriodIndicator';
import { exportPdf } from '../../services/reports.api';
import { shareReport } from '../../services/share.api';
import { useAuth } from '../../hooks/useAuth';

const { Title, Text } = Typography;
const NIL_UUID = '00000000-0000-0000-0000-000000000000';

export default function ExecutiveDashboard() {
  const navigate = useNavigate();
  const [exporting, setExporting] = useState(false);
  const [sharing, setSharing] = useState(false);
  const { user } = useAuth();
  const canShare = user?.role === 'FINANCE' || user?.role === 'ADMIN';

  const { data: execData, isLoading: execLoading } = useQuery({
    queryKey: reportKeys.executive,
    queryFn: getExecutiveDashboard,
    staleTime: 2 * 60 * 1000,
  });

  const { data: practiceData, isLoading: practiceLoading } = useQuery({
    queryKey: reportKeys.practice,
    queryFn: getPracticeDashboard,
    staleTime: 2 * 60 * 1000,
  });

  const exec: ExecutiveDashboardData | null = execData?.data ?? null;
  const practices: PracticeDashboardItem[] = practiceData?.data ?? [];

  if (execLoading || practiceLoading) {
    return (
      <div data-testid="executive-dashboard" style={{ textAlign: 'center', padding: 48 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!exec) {
    return (
      <div data-testid="executive-dashboard">
        <Space style={{ marginBottom: 16 }}>
          <Title level={3} style={{ margin: 0 }}>Executive Dashboard</Title>
          <DataPeriodIndicator />
        </Space>
        <Empty description="No dashboard data available for the current period" />
      </div>
    );
  }

  // Practice: top 5 by cost
  const top5Practices = practices.slice(0, 5);
  const maxPracticeCost = top5Practices.length > 0
    ? Math.max(...top5Practices.map((p) => p.costPaise))
    : 1;

  return (
    <div data-testid="executive-dashboard">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Space>
          <Title level={3} style={{ margin: 0 }}>Executive Dashboard</Title>
          <DataPeriodIndicator />
        </Space>
        <Space>
          {canShare && (
            <Button
              icon={<ShareAltOutlined />}
              loading={sharing}
              disabled={sharing}
              onClick={async () => {
                setSharing(true);
                try {
                  const now = new Date();
                  const period = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
                  await shareReport({ reportType: 'executive', entityId: NIL_UUID, period });
                } catch {
                  message.error('Failed to create share link');
                } finally {
                  setSharing(false);
                }
              }}
            >
              Share Link
            </Button>
          )}
          <Button
            icon={<FilePdfOutlined />}
            loading={exporting}
            disabled={exporting}
            onClick={async () => {
              setExporting(true);
              try {
                const now = new Date();
                const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                await exportPdf({ reportType: 'executive', entityId: NIL_UUID, period });
              } finally {
                setExporting(false);
              }
            }}
          >
            Export PDF
          </Button>
        </Space>
      </div>

      {/* KPI Tiles */}
      <Row gutter={16} style={{ marginBottom: 24 }} data-testid="kpi-tiles">
        <Col span={6}>
          <Card>
            <Statistic title="Total Revenue" value={formatCurrency(exec.revenuePaise)} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="Total Cost" value={formatCurrency(exec.costPaise)} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="Gross Margin" value={formatPercent(exec.marginPercent)} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Billable Utilisation"
              value={formatPercent(exec.billableUtilisationPercent)}
            />
          </Card>
        </Col>
      </Row>

      {/* Top 5 Projects */}
      <Title level={4}>Top 5 Projects by Margin</Title>
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }} data-testid="top-5-projects">
        {exec.top5Projects.map((project) => (
          <Col key={project.projectId} xs={24} sm={12} md={8} lg={6} xl={4}>
            <Card
              hoverable
              size="small"
              data-testid="project-card"
              onClick={() => navigate(`/projects/${project.projectId}`)}
              style={{ cursor: 'pointer' }}
            >
              <Text strong>{project.projectName}</Text>
              <div style={{ marginTop: 8 }}>
                <Space direction="vertical" size={4}>
                  <Text type="secondary">{formatCurrency(project.revenuePaise)} revenue</Text>
                  <Space>
                    <Text>{formatPercent(project.marginPercent)}</Text>
                    <MarginHealthBadge marginPercent={project.marginPercent} />
                  </Space>
                </Space>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Bottom 5 Projects */}
      <Title level={4}>Bottom 5 Projects by Margin</Title>
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }} data-testid="bottom-5-projects">
        {exec.bottom5Projects.map((project) => (
          <Col key={project.projectId} xs={24} sm={12} md={8} lg={6} xl={4}>
            <Card
              hoverable
              size="small"
              data-testid="project-card"
              onClick={() => navigate(`/projects/${project.projectId}`)}
              style={{ cursor: 'pointer' }}
            >
              <Text strong>{project.projectName}</Text>
              <div style={{ marginTop: 8 }}>
                <Space direction="vertical" size={4}>
                  <Text type="secondary">{formatCurrency(project.revenuePaise)} revenue</Text>
                  <Space>
                    <Text>{formatPercent(project.marginPercent)}</Text>
                    <MarginHealthBadge marginPercent={project.marginPercent} />
                  </Space>
                  {project.profitPaise < 0 && <AtRiskKPITile deficitPaise={project.profitPaise} />}
                </Space>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Practice: Top Cost Contributors by Designation */}
      <Title level={4}>Top Cost Contributors by Designation</Title>
      <Card style={{ marginBottom: 24 }} data-testid="practice-section">
        {top5Practices.length === 0 ? (
          <Empty description="No practice data available" />
        ) : (
          <Space direction="vertical" style={{ width: '100%' }} size={12}>
            {top5Practices.map((practice) => (
              <div key={practice.designation}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text strong>{practice.designation}</Text>
                  <Text type="secondary">{formatCurrency(practice.costPaise)}</Text>
                </div>
                <Progress
                  percent={Math.round((practice.costPaise / maxPracticeCost) * 100)}
                  showInfo={false}
                  strokeColor={practice.marginPercent >= 0.2 ? '#52c41a' : practice.marginPercent >= 0.1 ? '#faad14' : '#f5222d'}
                />
              </div>
            ))}
          </Space>
        )}
      </Card>
    </div>
  );
}
