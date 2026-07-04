import { useMemo } from 'react';
import { HashRouter } from 'react-router-dom';
import { Admin, Resource } from 'react-admin';
import LoginPage from '../pages/LoginPage.jsx';
import { createAuthProvider } from './authProvider.js';
import { createDataProvider } from './dataProvider.js';
import { i18nProvider } from './i18nProvider.js';
import OverviewDashboard from './dashboard/OverviewDashboard.jsx';
import { BrokerList, BrokerCreate } from './resources/brokers.jsx';
import { PropertyList } from './resources/properties.jsx';
import { ViewingList } from './resources/viewings.jsx';

// Mounted for every /#/admin* path (see routes/index.jsx). The auth gate lives OUTSIDE
// <Admin> so unauthenticated visitors get the app's own LoginPage, never react-admin's.
export default function AdminApp({ session, onLogin, onLogout }) {
  const authProvider = useMemo(() => createAuthProvider({ session, onLogout }), [session, onLogout]);
  const dataProvider = useMemo(() => createDataProvider({ session }), [session]);

  if (!session) {
    return <LoginPage onLogin={onLogin} />;
  }
  if (session.role !== 'ADMIN') {
    return (
      <div className="dashboard-main">
        <h1 className="dashboard-page-title">Không có quyền quản trị</h1>
        <p>Chỉ tài khoản admin mới truy cập được khu vực này.</p>
        <a className="auth-btn" href="#/">Về trang chủ</a>
      </div>
    );
  }

  return (
    <HashRouter basename="/admin">
      <Admin
        dataProvider={dataProvider}
        authProvider={authProvider}
        i18nProvider={i18nProvider}
        dashboard={OverviewDashboard}
        loginPage={false}
        disableTelemetry
      >
        <Resource name="brokers" list={BrokerList} create={BrokerCreate} />
        <Resource name="properties" list={PropertyList} />
        <Resource name="viewings" list={ViewingList} />
      </Admin>
    </HashRouter>
  );
}
