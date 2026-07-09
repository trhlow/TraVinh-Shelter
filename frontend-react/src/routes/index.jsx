import AdminDashboard from '../pages/admin/AdminDashboard.jsx';
import BrokersPage from '../pages/BrokersPage.jsx';
import BrokerDashboard from '../pages/BrokerDashboard.jsx';
import HomePage from '../pages/HomePage.jsx';
import LoginPage from '../pages/LoginPage.jsx';
import ProjectsPage from '../pages/ProjectsPage.jsx';
import PropertyDetailPage from '../pages/PropertyDetailPage.jsx';
import SearchPage from '../pages/SearchPage.jsx';

function BrokerDashboardRoute(props) {
  return <BrokerDashboard {...props} section="dashboard" currentPath="/broker/dashboard" />;
}

function BrokerPropertiesRoute(props) {
  return <BrokerDashboard {...props} section="properties" currentPath="/broker/properties" />;
}

function BrokerViewingsRoute(props) {
  return <BrokerDashboard {...props} section="viewings" currentPath="/broker/viewings" />;
}

function BrokerLeadsRoute(props) {
  return <BrokerDashboard {...props} section="leads" currentPath="/broker/leads" />;
}

function BrokerSettingsRoute(props) {
  return <BrokerDashboard {...props} section="settings" currentPath="/broker/settings" />;
}

function ForgotPasswordRoute(props) {
  return <LoginPage {...props} initialMode="forgot" />;
}

const ADMIN_SECTIONS = {
  '/admin': 'overview',
  '/admin/overview': 'overview',
  '/admin/brokers': 'brokers',
  '/admin/properties': 'properties',
  '/admin/viewings': 'viewings',
  '/admin/reports': 'reports',
  '/admin/audit': 'audit',
};

export const routes = {
  '/': HomePage,
  '/search': SearchPage,
  '/property': PropertyDetailPage,
  '/property/detail': PropertyDetailPage,
  '/projects': ProjectsPage,
  '/brokers': BrokersPage,
  '/login': LoginPage,
  '/forgot-password': ForgotPasswordRoute,
  '/broker': BrokerDashboardRoute,
  '/broker/dashboard': BrokerDashboardRoute,
  '/broker/properties': BrokerPropertiesRoute,
  '/broker/viewings': BrokerViewingsRoute,
  '/broker/leads': BrokerLeadsRoute,
  '/broker/settings': BrokerSettingsRoute,
};

export function resolveRoute(path) {
  const [pathname, queryString = ''] = path.split('?');
  const queryParams = Object.fromEntries(new URLSearchParams(queryString));
  if (pathname.startsWith('/admin')) {
    const section = ADMIN_SECTIONS[pathname] || 'overview';
    return { Page: AdminDashboard, params: { section, queryParams } };
  }
  if (pathname.startsWith('/property/') && pathname !== '/property/detail') {
    return { Page: PropertyDetailPage, params: { propertyId: pathname.replace('/property/', ''), queryParams } };
  }
  return { Page: routes[pathname] ?? HomePage, params: { queryParams } };
}
