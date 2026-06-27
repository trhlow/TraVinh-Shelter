import AdminDashboard from '../pages/AdminDashboard.jsx';
import BrokerDashboard from '../pages/BrokerDashboard.jsx';
import HomePage from '../pages/HomePage.jsx';
import LoginPage from '../pages/LoginPage.jsx';
import PropertyDetailPage from '../pages/PropertyDetailPage.jsx';
import SearchPage from '../pages/SearchPage.jsx';

export const routes = {
  '/': HomePage,
  '/search': SearchPage,
  '/property': PropertyDetailPage,
  '/property/detail': PropertyDetailPage,
  '/login': LoginPage,
  '/broker': BrokerDashboard,
  '/admin': AdminDashboard,
};

export function resolveRoute(path) {
  const [pathname, queryString = ''] = path.split('?');
  const queryParams = Object.fromEntries(new URLSearchParams(queryString));
  if (pathname.startsWith('/property/') && pathname !== '/property/detail') {
    return { Page: PropertyDetailPage, params: { propertyId: pathname.replace('/property/', ''), queryParams } };
  }
  return { Page: routes[pathname] ?? HomePage, params: { queryParams } };
}
