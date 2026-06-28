import { useState } from 'react';
import BrandLogo, { BRAND_NAME } from '../components/BrandLogo.jsx';
import MaterialIcon from '../components/MaterialIcon.jsx';
import useTheme from '../hooks/useTheme.js';

const categorySections = [
  {
    title: 'Trọ',
    icon: 'home',
    caption: 'Giá trọ, khu vực',
    links: [
      { label: 'Xem phòng trọ', href: '#/search?category=tro&transaction=rent' },
    ],
  },
  {
    title: 'Nhà',
    icon: 'home_work',
    caption: 'Thuê nhà, mua nhà, diện tích',
    links: [
      { label: 'Thuê nhà', href: '#/search?category=nha&transaction=rent' },
      { label: 'Mua nhà', href: '#/search?category=nha&transaction=sale' },
    ],
  },
  {
    title: 'Đất',
    icon: 'landscape',
    caption: 'Thuê đất, mua đất, khu vực',
    links: [
      { label: 'Thuê đất', href: '#/search?category=dat&transaction=rent' },
      { label: 'Mua đất', href: '#/search?category=dat&transaction=sale' },
    ],
  },
];

const footerColumns = [
  {
    title: 'Danh mục',
    links: [
      ['Phòng trọ', '#/search?category=tro&transaction=rent'],
      ['Nhà cho thuê', '#/search?category=nha&transaction=rent'],
      ['Nhà đất bán', '#/search?category=nha&transaction=sale'],
      ['Đất Trà Vinh', '#/search?category=dat&transaction=sale'],
    ],
  },
  {
    title: 'Công cụ',
    links: [
      ['Tìm kiếm', '#/search'],
      ['Dự án', '#/projects'],
      ['Môi giới', '#/brokers'],
      ['Đăng nhập', '#/login'],
    ],
  },
  {
    title: 'Hỗ trợ',
    links: [
      ['Điều khoản sử dụng', '#/'],
      ['Chính sách bảo mật', '#/'],
      ['Liên hệ quảng cáo', '#/'],
      ['Góp ý dịch vụ', '#/'],
    ],
  },
];

const socialLinks = [
  ['youtube', 'YouTube'],
  ['facebook', 'Facebook'],
  ['twitter', 'Twitter'],
  ['instagram', 'Instagram'],
  ['linkedin', 'LinkedIn'],
];

export function Header({ session, onLogout }) {
  const isBroker = session?.role === 'BROKER';
  const isAdmin = session?.role === 'ADMIN';
  const isUser = session?.role === 'USER';
  const { isDark, toggleTheme } = useTheme();
  const [query, setQuery] = useState('');

  function submitSearch(event) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set('query', query.trim());
    window.location.hash = params.toString() ? `#/search?${params}` : '#/search';
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-outline-variant bg-surface-container-lowest/95 backdrop-blur">
      <div className="mx-auto flex max-w-container-max items-center justify-between gap-4 px-margin-mobile py-3 md:px-margin-desktop">
        <a className="flex min-h-12 items-center text-on-surface" href="#/" aria-label={BRAND_NAME}>
          <BrandLogo />
        </a>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Điều hướng chính">
          <NavDropdown label="Danh mục" sections={categorySections} />
          <a className="public-header-link" href="#/projects">
            <MaterialIcon>apartment</MaterialIcon>
            Dự án
          </a>
          <a className="public-header-link" href="#/brokers">
            <MaterialIcon>badge</MaterialIcon>
            Môi giới
          </a>
        </nav>

        <form className="hidden flex-1 justify-end xl:flex" onSubmit={submitSearch}>
          <label className="public-header-search">
            <MaterialIcon>search</MaterialIcon>
            <span className="sr-only">Tìm tin</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tìm tin theo khu vực, giá, diện tích"
            />
            <button className="sr-only" type="submit">Tìm kiếm</button>
          </label>
        </form>

        <div className="flex items-center gap-2">
          <button className="kit-icon-button border border-outline-variant bg-surface-container-lowest text-primary" onClick={toggleTheme} type="button" title={isDark ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}>
            <MaterialIcon>{isDark ? 'light_mode' : 'dark_mode'}</MaterialIcon>
          </button>
          {!session && (
            <>
              <a className="ui-secondary-action min-h-10 px-3" href="#/login">
                <MaterialIcon className="text-sm">account_circle</MaterialIcon>
                Đăng nhập
              </a>
              <a className="ui-action hidden min-h-10 px-3 sm:inline-flex" href="#/register">
                Đăng ký
              </a>
            </>
          )}
          {isAdmin && (
            <a className="ui-secondary-action hidden min-h-10 px-3 md:inline-flex" href="#/admin/overview">
              <MaterialIcon className="text-sm">admin_panel_settings</MaterialIcon>
              Admin
            </a>
          )}
          {isBroker && (
            <>
              <a className="ui-secondary-action hidden min-h-10 px-3 md:inline-flex" href="#/broker/dashboard">
                <MaterialIcon className="text-sm">dashboard</MaterialIcon>
                Bảng điều khiển
              </a>
              <a className="ui-action hidden min-h-10 bg-action-orange px-3 text-on-primary hover:bg-orange-600 md:inline-flex" href="#/broker/properties">
                <MaterialIcon className="text-sm">add</MaterialIcon>
                Đăng tin
              </a>
            </>
          )}
          {isUser && (
            <a className="ui-secondary-action hidden min-h-10 px-3 md:inline-flex" href="#/profile">
              <MaterialIcon className="text-sm">account_circle</MaterialIcon>
              Hồ sơ
            </a>
          )}
          {session && (
            <button className="ui-secondary-action min-h-10 px-3" onClick={onLogout} type="button">
              Đăng xuất
            </button>
          )}
        </div>
      </div>

      <nav className="mx-auto flex max-w-container-max gap-2 overflow-x-auto px-margin-mobile pb-3 md:px-margin-desktop lg:hidden" aria-label="Điều hướng nhanh">
        <a className="dashboard-mobile-chip" href="#/search">
          <MaterialIcon className="text-sm">filter_list</MaterialIcon>
          Danh mục
        </a>
        <a className="dashboard-mobile-chip" href="#/projects">
          <MaterialIcon className="text-sm">apartment</MaterialIcon>
          Dự án
        </a>
        <a className="dashboard-mobile-chip" href="#/brokers">
          <MaterialIcon className="text-sm">badge</MaterialIcon>
          Môi giới
        </a>
        {isBroker && (
          <a className="dashboard-mobile-chip is-active" href="#/broker/properties">
            <MaterialIcon className="text-sm">add</MaterialIcon>
            Đăng tin
          </a>
        )}
      </nav>
    </header>
  );
}

function NavDropdown({ label, sections }) {
  return (
    <div className="group relative">
      <button className="public-header-link" type="button" aria-haspopup="true">
        <MaterialIcon>filter_list</MaterialIcon>
        {label}
        <MaterialIcon className="text-sm transition-transform duration-200 group-hover:rotate-180">keyboard_arrow_down</MaterialIcon>
      </button>
      <div className="public-dropdown-panel invisible absolute left-0 top-full mt-2 opacity-0 transition-all duration-200 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
        <div className="grid gap-0 md:grid-cols-3">
          {sections.map((section, index) => (
            <div key={section.title} className={`${index > 0 ? 'border-t border-outline-variant md:border-l md:border-t-0' : ''} p-4`}>
              <div className="mb-3 flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center bg-surface-container-low text-primary">
                  <MaterialIcon>{section.icon}</MaterialIcon>
                </span>
                <div>
                  <h3 className="font-label-bold text-label-bold text-on-surface">{section.title}</h3>
                  <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">{section.caption}</p>
                </div>
              </div>
              <div className="space-y-1">
                {section.links.map((link) => (
                  <a key={link.href} className="flex items-center justify-between gap-3 px-2 py-2 font-body-sm text-body-sm text-on-surface transition-colors hover:bg-surface-container-low hover:text-primary" href={link.href}>
                    {link.label}
                    <MaterialIcon className="text-sm text-on-surface-variant">chevron_right</MaterialIcon>
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function Footer() {
  return (
    <footer className="public-footer mt-auto">
      <div className="mx-auto max-w-container-max px-margin-mobile py-10 md:px-margin-desktop">
        <div className="flex flex-col gap-6 border-b border-white/20 pb-8 lg:flex-row lg:items-center lg:justify-between">
          <a className="inline-flex w-fit text-white" href="#/" aria-label={BRAND_NAME}>
            <BrandLogo />
          </a>
          <div className="flex w-full flex-col gap-2 sm:flex-row lg:max-w-md">
            <label className="sr-only" htmlFor="footer-email">Email nhận tin</label>
            <input id="footer-email" className="public-footer-input flex-1" placeholder="Nhập email để nhận tin mới..." type="email" />
            <button className="public-footer-submit" type="button">Theo dõi</button>
          </div>
        </div>

        <div className="grid gap-8 py-8 md:grid-cols-4">
          {footerColumns.map((column) => (
            <div key={column.title}>
              <h3 className="mb-4 font-label-bold text-label-bold text-white">{column.title}</h3>
              <ul className="space-y-2">
                {column.links.map(([label, href]) => (
                  <li key={label}>
                    <a className="font-body-sm text-body-sm" href={href}>{label}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div>
            <h3 className="mb-4 font-label-bold text-label-bold text-white">Công Tín Land</h3>
            <p className="font-body-sm text-body-sm text-white/80">
              Cổng thông tin bất động sản Trà Vinh, kết nối khách hàng với môi giới được quản lý bởi admin.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              {socialLinks.map(([icon, label]) => (
                <a key={label} className="flex h-9 w-9 items-center justify-center border border-white/25 text-white/85 hover:text-white" href="#/" aria-label={label}>
                  <MaterialIcon>{icon}</MaterialIcon>
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-white/20 pt-6 font-body-sm text-body-sm text-white/75 md:flex-row md:items-center md:justify-between">
          <p>{BRAND_NAME} @ 2024. All rights reserved.</p>
          <div className="flex flex-wrap gap-4">
            <a href="#/">Trang chủ</a>
            <a href="#/projects">Dự án</a>
            <a href="#/brokers">Môi giới</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default function MainLayout({ children, session, onLogout }) {
  return (
    <div className="flex min-h-screen flex-col bg-surface pb-16 font-body-sm text-on-surface md:pb-0">
      <Header session={session} onLogout={onLogout} />
      {children}
      <Footer />
      <nav className="mobile-bottom-nav" aria-label="Điều hướng mobile">
        <a href="#/">
          <MaterialIcon>home</MaterialIcon>
          Home
        </a>
        <a href="#/search">
          <MaterialIcon>search</MaterialIcon>
          Tìm kiếm
        </a>
        <a href="#/projects">
          <MaterialIcon>apartment</MaterialIcon>
          Dự án
        </a>
        <a href="#/brokers">
          <MaterialIcon>badge</MaterialIcon>
          Môi giới
        </a>
        <a href={session?.role === 'BROKER' ? '#/broker/properties' : session ? '#/profile' : '#/login'}>
          <MaterialIcon>{session?.role === 'BROKER' ? 'add' : 'person'}</MaterialIcon>
          {session?.role === 'BROKER' ? 'Đăng tin' : 'Tài khoản'}
        </a>
      </nav>
    </div>
  );
}
