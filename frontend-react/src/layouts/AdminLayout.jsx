import MaterialIcon from '../components/MaterialIcon.jsx';

export default function AdminLayout({ children, session, onLogout, variant = 'broker', activePath = '' }) {
  const isAdmin = variant === 'admin';
  const title = isAdmin ? 'Quản trị hệ thống' : 'Nhà môi giới';
  const subtitle = isAdmin ? 'Kiểm tra tài khoản và bài đăng' : 'Quản lý tin đăng và hồ sơ';
  const actionHref = isAdmin ? '#/admin/overview' : '#/broker/properties';
  const actionLabel = isAdmin ? 'Mở tổng quan' : 'Đăng tin mới';
  const actionIcon = isAdmin ? 'analytics' : 'add';
  const navItems = isAdmin
    ? [
      ['dashboard', 'Tổng quan', '#/admin/overview'],
      ['group', 'Tài khoản users', '#/admin/users'],
      ['badge', 'Môi giới', '#/admin/brokers'],
      ['description', 'Bài đăng', '#/admin/properties'],
    ]
    : [
      ['dashboard', 'Bảng điều khiển', '#/broker/dashboard'],
      ['description', 'Tin đăng của tôi', '#/broker/properties'],
      ['account_circle', 'Hồ sơ môi giới', '#/broker/profile'],
    ];
  const isActive = (href) => href.replace('#', '') === activePath;

  return (
    <div className="bg-surface text-on-surface flex flex-col md:flex-row min-h-screen">
      <nav className="hidden md:flex bg-surface-container-low h-screen w-64 fixed left-0 top-0 flex-col py-stack-lg z-40">
        <div className="px-gutter mb-stack-lg">
          <a className="flex items-center gap-2 font-headline-md text-headline-md font-bold text-trust-navy mb-stack-md" href="#/">
            <MaterialIcon filled>real_estate_agent</MaterialIcon>
            BĐS Trà Vinh
          </a>
          <div className="flex items-center gap-4 mb-stack-md">
            <div className="w-12 h-12 rounded-full bg-primary text-on-primary flex items-center justify-center">
              <MaterialIcon filled>{isAdmin ? 'admin_panel_settings' : 'badge'}</MaterialIcon>
            </div>
            <div>
              <h2 className="font-label-bold text-label-bold text-trust-navy">{title}</h2>
              <p className="font-body-sm text-body-sm text-on-surface-variant">{session?.email || subtitle}</p>
            </div>
          </div>
          <a className="w-full bg-action-orange text-white font-label-bold text-label-bold py-2 rounded hover:bg-orange-600 transition-colors inline-flex items-center justify-center gap-2" href={actionHref}>
            <MaterialIcon className="text-sm">{actionIcon}</MaterialIcon>
            {actionLabel}
          </a>
        </div>
        <ul className="flex-1 space-y-2">
          {navItems.map(([icon, label, href]) => {
            const active = isActive(href);
            return (
            <li key={label}>
              <a className={`flex items-center gap-3 px-gutter py-3 font-body-sm text-body-sm transition-all ${active ? 'text-primary font-bold border-r-4 border-primary bg-surface-container opacity-90' : 'text-on-surface-variant hover:bg-surface-container-high'}`} href={href}>
                <MaterialIcon filled={active}>{icon}</MaterialIcon>
                {label}
              </a>
            </li>
            );
          })}
          <li>
            <a className={`flex items-center gap-3 px-gutter py-3 transition-all font-body-sm text-body-sm ${activePath === '/' ? 'text-primary font-bold border-r-4 border-primary bg-surface-container opacity-90' : 'text-on-surface-variant hover:bg-surface-container-high'}`} href="#/">
              <MaterialIcon filled={activePath === '/'}>home</MaterialIcon>
              Trang chủ
            </a>
          </li>
        </ul>
        {session && (
          <div className="px-gutter">
            <button className="w-full border border-outline text-on-surface-variant font-label-bold text-label-bold py-2 rounded hover:bg-surface-container-high transition-colors" onClick={onLogout}>
              Đăng xuất
            </button>
          </div>
        )}
      </nav>
      <nav className="md:hidden sticky top-0 z-40 w-full bg-surface-container-low border-b border-outline-variant">
        <div className="px-margin-mobile py-3 flex items-center justify-between gap-3">
          <a className="flex items-center gap-2 font-headline-sm text-headline-sm font-bold text-trust-navy" href="#/">
            <MaterialIcon filled>real_estate_agent</MaterialIcon>
            BĐS Trà Vinh
          </a>
          {session && (
            <button className="border border-outline text-on-surface-variant font-label-bold text-label-bold px-3 py-2 rounded hover:bg-surface-container-high transition-colors" onClick={onLogout}>
              Đăng xuất
            </button>
          )}
        </div>
        <div className="px-margin-mobile pb-3 flex gap-2 overflow-x-auto no-scrollbar">
          {navItems.map(([icon, label, href]) => {
            const active = isActive(href);
            return (
              <a key={label} className={`shrink-0 inline-flex items-center gap-2 px-3 py-2 rounded font-body-sm text-body-sm ${active ? 'bg-primary text-on-primary font-bold' : 'bg-surface text-on-surface-variant border border-outline-variant'}`} href={href}>
                <MaterialIcon filled={active} className="text-sm">{icon}</MaterialIcon>
                {label}
              </a>
            );
          })}
          <a className={`shrink-0 inline-flex items-center gap-2 px-3 py-2 rounded font-body-sm text-body-sm ${activePath === '/' ? 'bg-primary text-on-primary font-bold' : 'bg-surface text-on-surface-variant border border-outline-variant'}`} href="#/">
            <MaterialIcon filled={activePath === '/'} className="text-sm">home</MaterialIcon>
            Trang chủ
          </a>
        </div>
      </nav>
      {children}
    </div>
  );
}
