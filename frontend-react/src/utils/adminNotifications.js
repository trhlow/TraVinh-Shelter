export function buildAdminNotifications({ properties = [], viewings = [], users = [] }) {
  const items = [];
  const pendingPosts = properties.filter((property) => property.rawStatus === 'PENDING').length;
  const pendingViewings = viewings.filter((viewing) => viewing.status === 'PENDING').length;
  const lockedAccounts = users.filter((user) => user.status === 'LOCKED' || user.status === 'BLOCKED').length;

  if (pendingPosts > 0) {
    items.push({ id: 'pending-posts', icon: 'Clock', text: `${pendingPosts} tin chờ duyệt`, href: '#/admin/properties?status=PENDING', tone: 'warning' });
  }
  if (pendingViewings > 0) {
    items.push({ id: 'pending-viewings', icon: 'Calendar', text: `${pendingViewings} lịch hẹn chờ xác nhận`, href: '#/admin/viewings', tone: 'warning' });
  }
  if (lockedAccounts > 0) {
    items.push({ id: 'locked-accounts', icon: 'Lock', text: `${lockedAccounts} tài khoản đang bị khóa`, href: '#/admin/accounts', tone: 'muted' });
  }
  return items;
}
