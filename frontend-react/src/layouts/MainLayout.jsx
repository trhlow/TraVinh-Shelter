import { useState } from 'react';
import BrandLogo, { BRAND_NAME } from '../components/BrandLogo.jsx';
import Icon from '../components/ui/Icon.jsx';
import useTheme from '../hooks/useTheme.js';

const NAV_CATEGORIES = [
  {
    title: 'Trọ', icon: 'Home', caption: 'Giá trọ, khu vực',
    links: [{ label: 'Xem phòng trọ', href: '#/search?category=tro&transaction=rent' }],
  },
  {
    title: 'Nhà', icon: 'Building2', caption: 'Thuê nhà, mua nhà',
    links: [
      { label: 'Thuê nhà', href: '#/search?category=nha&transaction=rent' },
      { label: 'Mua nhà', href: '#/search?category=nha&transaction=sale' },
    ],
  },
  {
    title: 'Đất', icon: 'Mountain', caption: 'Thuê đất, mua đất',
    links: [
      { label: 'Thuê đất', href: '#/search?category=dat&transaction=rent' },
      { label: 'Mua đất', href: '#/search?category=dat&transaction=sale' },
    ],
  },
];

const FOOTER_COLS = [
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

export function Header({ session, onLogout }) {
  const isBroker = session?.role === 'BROKER';
  const isAdmin = session?.role === 'ADMIN';
  const isUser = session?.role === 'USER';
  const { isDark, toggleTheme } = useTheme();

  return (
    <header className="navbar">
      <div className="navbar-inner">
        {/* Logo */}
        <a href="#/" aria-label={BRAND_NAME} className="navbar-logo">
          <BrandLogo />
        </a>

        {/* Nav links */}
        <nav className="navbar-nav" aria-label="Điều hướng chính">
          <div className="navbar-dropdown">
            <button
              className="navbar-link"
              type="button"
              style={{ background: 'none', border: 'none' }}
            >
              <Icon name="SlidersHorizontal" size={16} />
              Danh mục
              <Icon name="ChevronDown" size={14} />
            </button>
            <div className="navbar-dropdown-panel">
              {NAV_CATEGORIES.map((cat, i) => (
                <div
                  key={cat.title}
                  className="navbar-dropdown-col"
                  style={i > 0 ? { borderLeft: '1px solid var(--color-border)' } : {}}
                >
                  <div className="navbar-dropdown-cat-header">
                    <span className="navbar-dropdown-cat-icon">
                      <Icon name={cat.icon} size={18} />
                    </span>
                    <div>
                      <p className="navbar-dropdown-cat-name">{cat.title}</p>
                      <p className="navbar-dropdown-cat-caption">{cat.caption}</p>
                    </div>
                  </div>
                  {cat.links.map((link) => (
                    <a
                      key={link.href}
                      href={link.href}
                      className="navbar-dropdown-link"
                    >
                      {link.label}
                      <Icon name="ChevronRight" size={13} />
                    </a>
                  ))}
                </div>
              ))}
            </div>
          </div>

          <a className="navbar-link" href="#/projects">
            <Icon name="Building" size={16} /> Dự án
          </a>
          <a className="navbar-link" href="#/brokers">
            <Icon name="IdCard" size={16} /> Môi giới
          </a>
        </nav>

        {/* Right actions */}
        <div className="navbar-actions">
          <button
            type="button"
            onClick={toggleTheme}
            title={isDark ? 'Giao diện sáng' : 'Giao diện tối'}
            className="navbar-theme-btn"
          >
            <Icon name={isDark ? 'Sun' : 'Moon'} size={18} />
          </button>

          {!session && (
            <>
              <a href="#/login" className="btn btn-ghost btn-sm">
                <Icon name="User" size={15} /> Đăng nhập
              </a>
              <a href="#/register" className="btn btn-primary btn-sm navbar-desktop-only">
                Đăng ký
              </a>
            </>
          )}
          {isAdmin && (
            <a href="#/admin/overview" className="btn btn-ghost btn-sm navbar-desktop-only">
              <Icon name="ShieldCheck" size={15} /> Admin
            </a>
          )}
          {isBroker && (
            <>
              <a href="#/broker/dashboard" className="btn btn-ghost btn-sm navbar-desktop-only">
                <Icon name="LayoutDashboard" size={15} /> Bảng điều khiển
              </a>
              <a href="#/broker/properties" className="btn btn-primary btn-sm navbar-desktop-only">
                <Icon name="Plus" size={15} /> Đăng tin
              </a>
            </>
          )}
          {isUser && (
            <a href="#/profile" className="btn btn-ghost btn-sm navbar-desktop-only">
              <Icon name="User" size={15} /> Hồ sơ
            </a>
          )}
          {session && (
            <button type="button" onClick={onLogout} className="btn btn-ghost btn-sm">
              Đăng xuất
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

export function Footer() {
  const [email, setEmail] = useState('');
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-top">
          <a href="#/" aria-label={BRAND_NAME} style={{ color: '#fff', display: 'flex' }}>
            <BrandLogo />
          </a>
          <div className="footer-email-row">
            <label htmlFor="footer-email" className="sr-only">Email nhận tin</label>
            <input
              id="footer-email"
              type="email"
              className="footer-email-input"
              placeholder="Nhập email để nhận tin mới..."
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={{ flex: 1 }}
            />
            <button type="button" className="btn btn-primary btn-sm" style={{ flexShrink: 0 }}>
              Theo dõi
            </button>
          </div>
        </div>

        <div className="footer-grid">
          {FOOTER_COLS.map(col => (
            <div key={col.title}>
              <p className="footer-col-title">{col.title}</p>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {col.links.map(([label, href]) => (
                  <li key={label}>
                    <a className="footer-link" href={href}>{label}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div>
            <p className="footer-col-title">Công Tín Land</p>
            <p className="footer-about-text">
              Cổng thông tin bất động sản Trà Vinh, kết nối khách hàng với môi giới chuyên nghiệp.
            </p>
            <div className="footer-social-icons">
              {[
                ['Youtube', 'Youtube'], ['Facebook', 'Facebook'],
                ['Twitter', 'Twitter'], ['Instagram', 'Instagram'], ['Linkedin', 'Linkedin'],
              ].map(([icon, label]) => (
                <a
                  key={label}
                  href="#/"
                  aria-label={label}
                  className="footer-social-icon"
                >
                  <Icon name={icon} size={16} />
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <p className="footer-copyright">{BRAND_NAME} © 2025. All rights reserved.</p>
          <div className="footer-links-row">
            {[['Trang chủ', '#/'], ['Dự án', '#/projects'], ['Môi giới', '#/brokers']].map(([label, href]) => (
              <a key={label} className="footer-link" href={href}>{label}</a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

export default function MainLayout({ children, session, onLogout }) {
  return (
    <div className="layout-root">
      <Header session={session} onLogout={onLogout} />
      <main className="layout-main">{children}</main>
      <Footer />
      <nav className="mobile-nav" aria-label="Điều hướng mobile">
        {[
          { href: '#/', icon: 'Home', label: 'Home' },
          { href: '#/search', icon: 'Search', label: 'Tìm kiếm' },
          { href: '#/projects', icon: 'Building', label: 'Dự án' },
          { href: '#/brokers', icon: 'IdCard', label: 'Môi giới' },
          {
            href: session?.role === 'BROKER' ? '#/broker/properties' : session ? '#/profile' : '#/login',
            icon: session?.role === 'BROKER' ? 'Plus' : 'User',
            label: session?.role === 'BROKER' ? 'Đăng tin' : 'Tài khoản',
          },
        ].map(item => (
          <a key={item.href} href={item.href} className="mobile-nav-item">
            <Icon name={item.icon} size={20} />
            <span>{item.label}</span>
          </a>
        ))}
      </nav>
    </div>
  );
}
