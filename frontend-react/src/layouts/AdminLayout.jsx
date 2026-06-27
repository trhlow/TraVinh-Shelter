import MaterialIcon from '../components/MaterialIcon.jsx';

export default function AdminLayout({ children, session, onLogout, variant = 'broker' }) {
  const isAdmin = variant === 'admin';
  const title = isAdmin ? 'Quản trị hệ thống' : 'Nhà môi giới';
  const subtitle = isAdmin ? 'Kiểm tra tài khoản và bài đăng' : 'Quản lý tin đăng và hồ sơ';
  const homeHref = isAdmin ? '#/admin' : '#/broker';
  const navItems = isAdmin
    ? [
      ['dashboard', 'Tổng quan', '#/admin', true],
      ['group', 'Tài khoản users', '#/admin', false],
      ['badge', 'Môi giới', '#/admin', false],
      ['description', 'Bài đăng', '#/admin', false],
    ]
    : [
      ['dashboard', 'Bảng điều khiển', '#/broker', false],
      ['description', 'Tin đăng của tôi', '#/broker', true],
      ['account_circle', 'Hồ sơ môi giới', '#/broker', false],
    ];

  return (
    <div className="bg-surface text-on-surface flex min-h-screen">
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
          <a className="w-full bg-action-orange text-white font-label-bold text-label-bold py-2 rounded hover:bg-orange-600 transition-colors inline-flex items-center justify-center gap-2" href={homeHref}>
            <MaterialIcon className="text-sm">{isAdmin ? 'analytics' : 'add'}</MaterialIcon>
            {isAdmin ? 'Mở dashboard' : 'Đăng tin mới'}
          </a>
        </div>
        <ul className="flex-1 space-y-2">
          {navItems.map(([icon, label, href, active]) => (
            <li key={label}>
              <a className={`flex items-center gap-3 px-gutter py-3 font-body-sm text-body-sm transition-all ${active ? 'text-primary font-bold border-r-4 border-primary bg-surface-container opacity-90' : 'text-on-surface-variant hover:bg-surface-container-high'}`} href={href}>
                <MaterialIcon filled={active}>{icon}</MaterialIcon>
                {label}
              </a>
            </li>
          ))}
          <li>
            <a className="flex items-center gap-3 px-gutter py-3 text-on-surface-variant hover:bg-surface-container-high transition-all font-body-sm text-body-sm" href="#/">
              <MaterialIcon>home</MaterialIcon>
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
      {children}
    </div>
  );
}
