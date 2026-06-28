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
        <a href="#/" aria-label={BRAND_NAME} style={{ display: 'flex', alignItems: 'center' }}>
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
                  <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                    <span style={{
                      width: 36, height: 36, borderRadius: 'var(--radius-sm)',
                      background: 'var(--color-accent-light)', color: 'var(--color-accent)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <Icon name={cat.icon} size={18} />
                    </span>
                    <div>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: 'var(--color-text-primary)' }}>{cat.title}</p>
                      <p style={{ margin: 0, fontSize: 12, color: 'var(--color-text-muted)' }}>{cat.caption}</p>
                    </div>
                  </div>
                  {cat.links.map((link) => (
                    <a
                      key={link.href}
                      href={link.href}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '6px 8px', borderRadius: 'var(--radius-sm)',
                        fontSize: 13, color: 'var(--color-text-secondary)',
                        transition: 'background 160ms, color 160ms',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-bg-subtle)'; e.currentTarget.style.color = 'var(--color-text-primary)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = ''; e.currentTarget.style.color = 'var(--color-text-secondary)'; }}
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
            style={{
              width: 36, height: 36, borderRadius: 'var(--radius-sm)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--color-text-secondary)', background: 'none', border: 'none',
              cursor: 'pointer', transition: 'background 160ms',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-bg-subtle)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
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
          <div style={{ display: 'flex', gap: 8, maxWidth: 380, width: '100%' }}>
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
            <p style={{ fontSize: 14, color: 'rgb(255 255 255 / 0.6)', lineHeight: 1.6, margin: '0 0 20px' }}>
              Cổng thông tin bất động sản Trà Vinh, kết nối khách hàng với môi giới chuyên nghiệp.
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[
                ['Youtube', 'Youtube'], ['Facebook', 'Facebook'],
                ['Twitter', 'Twitter'], ['Instagram', 'Instagram'], ['Linkedin', 'Linkedin'],
              ].map(([icon, label]) => (
                <a
                  key={label}
                  href="#/"
                  aria-label={label}
                  style={{
                    width: 36, height: 36, borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-dark-border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'rgb(255 255 255 / 0.6)', transition: 'color 160ms, border-color 160ms',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = '#fff'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'rgb(255 255 255 / 0.6)'; e.currentTarget.style.borderColor = 'var(--color-dark-border)'; }}
                >
                  <Icon name={icon} size={16} />
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <p style={{ margin: 0 }}>{BRAND_NAME} © 2025. All rights reserved.</p>
          <div style={{ display: 'flex', gap: 20 }}>
            {[['Trang chủ', '#/'], ['Dự án', '#/projects'], ['Môi giới', '#/brokers']].map(([label, href]) => (
              <a key={label} className="footer-link" href={href} style={{ padding: 0 }}>{label}</a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

export default function MainLayout({ children, session, onLogout }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--color-bg)' }}>
      <Header session={session} onLogout={onLogout} />
      <main style={{ flex: 1 }}>{children}</main>
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
