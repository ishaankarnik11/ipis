import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router';
import { Layout, Menu, Button, Typography, Badge } from 'antd';
import { LogoutOutlined, MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { useAuth, useLogout } from '../hooks/useAuth';
import { getNavItemsForRole } from '../config/navigation';
import { projectKeys, getProjects } from '../services/projects.api';
import type { Project } from '../services/projects.api';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

const COLLAPSED_KEY = 'ipis_sidebar_collapsed';

export default function AppLayout() {
  const { user } = useAuth();
  const logoutMutation = useLogout();
  const navigate = useNavigate();
  const location = useLocation();

  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem(COLLAPSED_KEY) === 'true',
  );

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem(COLLAPSED_KEY, String(next));
  };

  const isAdmin = user?.role === 'ADMIN';

  const { data: projectsData } = useQuery({
    queryKey: projectKeys.all,
    queryFn: () => getProjects(),
    enabled: isAdmin,
  });

  const pendingCount = isAdmin
    ? (projectsData?.data ?? []).filter((p: Project) => p.status === 'PENDING_APPROVAL').length
    : 0;

  const navItems = user ? getNavItemsForRole(user.role) : [];

  const menuItems = navItems.map((item) => ({
    key: item.path,
    icon: item.icon,
    label:
      item.key === 'admin-pending' ? (
        <Badge count={pendingCount} size="small" offset={[8, 0]} overflowCount={99}>
          {item.label}
        </Badge>
      ) : (
        item.label
      ),
  }));

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        width={220}
        collapsedWidth={64}
        collapsed={collapsed}
        style={{ background: '#1B2A4A' }}
      >
        <div
          style={{
            height: 48,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: 700,
            fontSize: collapsed ? 14 : 18,
          }}
        >
          {collapsed ? 'IP' : 'IPIS'}
        </div>
        <nav aria-label="Main navigation">
          <Menu
            theme="dark"
            mode="inline"
            selectedKeys={[location.pathname]}
            items={menuItems}
            onClick={({ key }) => navigate(key)}
            style={{ background: 'transparent' }}
          />
        </nav>
      </Sider>

      <Layout>
        <Header
          style={{
            background: '#1B2A4A',
            padding: '0 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: 48,
            lineHeight: '48px',
          }}
        >
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={toggleCollapsed}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            style={{ color: '#fff' }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Text style={{ color: '#fff' }}>{user?.name}</Text>
            <Button
              type="text"
              icon={<LogoutOutlined />}
              onClick={() => logoutMutation.mutate()}
              loading={logoutMutation.isPending}
              style={{ color: '#fff' }}
            >
              Log Out
            </Button>
          </div>
        </Header>

        <Content style={{ margin: 16, padding: 24, background: '#fff', borderRadius: 6 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
