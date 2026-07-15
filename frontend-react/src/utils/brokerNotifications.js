import { isPendingListing } from '../pages/BrokerDashboard.jsx';

export function buildBrokerNotifications({ listings = [], viewings = [] }) {
  const items = [];
  const pendingListings = listings.filter((listing) => isPendingListing(listing)).length;
  const pendingViewings = viewings.filter((viewing) => viewing.status === 'PENDING').length;

  if (pendingListings > 0) {
    items.push({ id: 'pending-listings', icon: 'Clock', text: `${pendingListings} tin chờ duyệt`, href: '#/broker/properties', tone: 'warning' });
  }
  if (pendingViewings > 0) {
    items.push({ id: 'pending-viewings', icon: 'Calendar', text: `${pendingViewings} lịch hẹn chờ xác nhận`, href: '#/broker/viewings', tone: 'warning' });
  }
  return items;
}
