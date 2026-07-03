import AdminApp from '../admin-ra/AdminApp.jsx';
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

function BrokerProfileRoute(props) {
  return <BrokerDashboard {...props} section="profile" currentPath="/broker/profile" />;
}

function BrokerPropertiesRoute(props) {
  return <BrokerDashboard {...props} section="properties" currentPath="/broker/properties" />;
}

function BrokerViewingsRoute(props) {
  return <BrokerDashboard {...props} section="viewings" currentPath="/broker/viewings" />;
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
  '/broker/viewings': BrokerViewingsRoute,
};

export function resolveRoute(path) {
  const [pathname, queryString = ''] = path.split('?');
  const queryParams = Object.fromEntries(new URLSearchParams(queryString));
  // Every /admin* path resolves to the SAME component so react-admin's own HashRouter
  // owns the sub-routing and the outer hash router never remounts <Admin> (see Task 0 spike).
  if (pathname.startsWith('/admin')) {
    return { Page: AdminApp, params: { queryParams } };
  }
  if (pathname.startsWith('/property/') && pathname !== '/property/detail') {
    return { Page: PropertyDetailPage, params: { propertyId: pathname.replace('/property/', ''), queryParams } };
  }
  return { Page: routes[pathname] ?? HomePage, params: { queryParams } };
}
