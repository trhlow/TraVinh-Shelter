import BrokerDashboard from '../pages/BrokerDashboard.jsx';
import HomePage from '../pages/HomePage.jsx';
import PropertyDetailPage from '../pages/PropertyDetailPage.jsx';
import SearchPage from '../pages/SearchPage.jsx';

export const routes = {
  '/': HomePage,
  '/search': SearchPage,
  '/property': PropertyDetailPage,
  '/property/detail': PropertyDetailPage,
  '/broker': BrokerDashboard,
  '/admin': BrokerDashboard,
};

export function resolveRoute(path) {
  return routes[path] ?? HomePage;
}
