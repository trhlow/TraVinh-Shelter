import AdminDashboard from '../pages/AdminDashboard.jsx';
import BrokersPage from '../pages/BrokersPage.jsx';
import BrokerDashboard from '../pages/BrokerDashboard.jsx';
import HomePage from '../pages/HomePage.jsx';
import LoginPage from '../pages/LoginPage.jsx';
import ProjectsPage from '../pages/ProjectsPage.jsx';
import PropertyDetailPage from '../pages/PropertyDetailPage.jsx';
import SearchPage from '../pages/SearchPage.jsx';

function AdminOverviewRoute(props) {
  return <AdminDashboard {...props} section="overview" currentPath="/admin/overview" />;
}

function AdminBrokersRoute(props) {
  return <AdminDashboard {...props} section="brokers" currentPath="/admin/brokers" />;
}

function AdminPropertiesRoute(props) {
  return <AdminDashboard {...props} section="properties" currentPath="/admin/properties" />;
}

function BrokerDashboardRoute(props) {
  return <BrokerDashboard {...props} section="dashboard" currentPath="/broker/dashboard" />;
}

function BrokerProfileRoute(props) {
  return <BrokerDashboard {...props} section="profile" currentPath="/broker/profile" />;
}

function BrokerPropertiesRoute(props) {
  return <BrokerDashboard {...props} section="properties" currentPath="/broker/properties" />;
}

function ForgotPasswordRoute(props) {
  return <LoginPage {...props} initialMode="forgot" />;
}

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
  '/broker/profile': BrokerProfileRoute,
  '/broker/properties': BrokerPropertiesRoute,
  '/admin': AdminOverviewRoute,
  '/admin/overview': AdminOverviewRoute,
  '/admin/brokers': AdminBrokersRoute,
  '/admin/properties': AdminPropertiesRoute,
};

export function resolveRoute(path) {
  const [pathname, queryString = ''] = path.split('?');
  const queryParams = Object.fromEntries(new URLSearchParams(queryString));
  if (pathname.startsWith('/property/') && pathname !== '/property/detail') {
    return { Page: PropertyDetailPage, params: { propertyId: pathname.replace('/property/', ''), queryParams } };
  }
  return { Page: routes[pathname] ?? HomePage, params: { queryParams } };
}
