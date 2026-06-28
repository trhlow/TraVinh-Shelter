import { useState } from 'react';
import BrandLogo from '../components/BrandLogo.jsx';
import MaterialIcon from '../components/MaterialIcon.jsx';
import useTheme from '../hooks/useTheme.js';

export default function AdminLayout({ children, session, onLogout, variant = 'broker', activePath = '' }) {
  const isAdmin = variant === 'admin';
  const { isDark, toggleTheme } = useTheme();
  const [profileOpen, setProfileOpen] = useState(false);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const navItems = isAdmin
    ? [
      ['dashboard', 'Tổng quan', '#/admin/overview'],
      ['group', 'Tài khoản users', '#/admin/users'],
      ['badge', 'Môi giới', '#/admin/brokers'],
      ['description', 'Bài đăng', '#/admin/properties'],
    ]
    : [
      ['dashboard', 'Bảng điều khiển', '#/broker/dashboard'],
      ['account_circle', 'Hồ sơ môi giới', '#/broker/profile'],
      ['description', 'Tin đăng của tôi', '#/broker/properties'],
    ];

  return (
    <div className="dashboard-shell min-h-screen bg-surface-container-low text-on-surface">
      <aside className="dashboard-sidebar fixed left-0 top-0 z-40 hidden h-screen flex-col border-r border-outline-variant bg-surface-container-lowest md:flex">
        <div className="px-8 pb-5 pt-6">
          <a className="inline-flex items-end gap-2 text-on-surface" href="#/">
            <BrandLogo />
          </a>
          <p className="ml-12 mt-[-6px] font-body-sm text-body-sm text-on-surface-variant">for Trà Vinh</p>
        </div>

        <div className="flex items-center justify-center gap-4 px-6 pb-5">
          <button className="kit-icon-button bg-surface-container-low" type="button" title="Hồ sơ">
            <MaterialIcon>person</MaterialIcon>
          </button>
          <button className="kit-icon-button text-primary" onClick={toggleTheme} type="button" title={isDark ? 'Giao diện sáng' : 'Giao diện tối'}>
            <MaterialIcon>{isDark ? 'light_mode' : 'dark_mode'}</MaterialIcon>
          </button>
          <div className="relative">
            <button
              className="kit-icon-button text-primary"
              onClick={() => setNoticeOpen((current) => !current)}
              type="button"
              title="Thông báo"
            >
              <MaterialIcon>notifications</MaterialIcon>
            </button>
            <span className="absolute right-0 top-0 flex h-5 min-w-5 items-center justify-center rounded-full bg-error px-1 text-[11px] font-bold leading-none text-on-error">
              {isAdmin ? '3' : '1'}
            </span>
            {noticeOpen && (
              <div className="absolute left-1/2 top-14 z-50 w-72 -translate-x-1/2 border border-outline-variant bg-surface-container-lowest shadow-lg">
                <div className="border-b border-outline-variant px-4 py-3">
                  <p className="font-label-bold text-label-bold text-on-surface">Thông báo</p>
                </div>
                <div className="divide-y divide-outline-variant">
                  <NoticeLine icon="sync" title="Dữ liệu API" text="Dashboard đang hiển thị dữ liệu thật từ backend." />
                  <NoticeLine icon="verified" title="Phân quyền" text={isAdmin ? 'Admin quản lý users, broker và bài đăng.' : 'Broker quản lý hồ sơ và tin đăng của mình.'} />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="px-4 pb-6">
          <label className="relative block">
            <span className="sr-only">Tìm nhanh</span>
            <MaterialIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-outline">search</MaterialIcon>
            <input className="dashboard-search" placeholder="Tìm nhanh..." />
          </label>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 pb-5">
          <ul className="space-y-2">
            {navItems.map(([icon, label, href]) => (
              <SidebarItem active={isActive(href, activePath)} href={href} icon={icon} key={href} label={label} />
            ))}
            <SidebarItem active={activePath === '/'} href="#/" icon="home" label="Trang chủ" />
          </ul>
        </nav>

        <div className="border-t border-outline-variant px-4 py-5">
          <div className="relative">
            <button
              className="flex w-full items-center gap-3 border border-outline-variant bg-surface-container-lowest px-3 py-3 text-left transition-colors hover:bg-surface-container-low"
              onClick={() => setProfileOpen((current) => !current)}
              type="button"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-container-low text-primary">
                <MaterialIcon>{isAdmin ? 'admin_panel_settings' : 'real_estate_agent'}</MaterialIcon>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-label-bold text-label-bold text-on-surface">{session?.email || 'Công Tín Land'}</span>
                <span className="block truncate font-body-sm text-body-sm text-on-surface-variant">{isAdmin ? 'Admin' : 'Broker'}</span>
              </span>
              <MaterialIcon className="text-on-surface-variant">more_horiz</MaterialIcon>
            </button>
            {profileOpen && (
              <div className="absolute bottom-16 left-0 right-0 overflow-hidden border border-outline-variant bg-surface-container-lowest shadow-lg">
                <a className="flex items-center gap-2 px-4 py-3 font-body-sm text-body-sm text-on-surface hover:bg-surface-container-low" href={isAdmin ? '#/admin/overview' : '#/broker/profile'}>
                  <MaterialIcon className="text-sm">account_circle</MaterialIcon>
                  Hồ sơ
                </a>
                {session && (
                  <button className="flex w-full items-center gap-2 border-t border-outline-variant px-4 py-3 text-left font-body-sm text-body-sm text-error hover:bg-error-container/30" onClick={onLogout} type="button">
                    <MaterialIcon className="text-sm">logout</MaterialIcon>
                    Đăng xuất
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </aside>

      <header className="sticky top-0 z-30 border-b border-outline-variant bg-surface-container-lowest px-margin-mobile py-3 md:hidden">
        <div className="flex items-center justify-between gap-3">
          <a className="text-on-surface" href="#/">
            <BrandLogo />
          </a>
          <div className="flex items-center gap-2">
            <button className="kit-icon-button border border-outline-variant bg-surface-container-lowest text-primary" onClick={toggleTheme} type="button" title={isDark ? 'Giao diện sáng' : 'Giao diện tối'}>
              <MaterialIcon>{isDark ? 'light_mode' : 'dark_mode'}</MaterialIcon>
            </button>
            {session && (
              <button className="ui-secondary-action min-h-10 px-3" onClick={onLogout} type="button">
                Đăng xuất
              </button>
            )}
          </div>
        </div>
        <nav className="mt-3 flex gap-2 overflow-x-auto no-scrollbar">
          {navItems.map(([icon, label, href]) => (
            <a key={href} className={`dashboard-mobile-chip ${isActive(href, activePath) ? 'is-active' : ''}`} href={href}>
              <MaterialIcon className="text-sm">{icon}</MaterialIcon>
              {label}
            </a>
          ))}
          <a className={`dashboard-mobile-chip ${activePath === '/' ? 'is-active' : ''}`} href="#/">
            <MaterialIcon className="text-sm">home</MaterialIcon>
            Trang chủ
          </a>
        </nav>
      </header>

      <div className="dashboard-workspace min-h-screen">
        {children}
      </div>
    </div>
  );
}

function SidebarItem({ active, href, icon, label }) {
  return (
    <li>
      <a className={`dashboard-sidebar-item ${active ? 'is-active' : ''}`} href={href}>
        <MaterialIcon filled={active}>{icon}</MaterialIcon>
        <span>{label}</span>
      </a>
    </li>
  );
}

function NoticeLine({ icon, title, text }) {
  return (
    <div className="flex gap-3 px-4 py-3">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center bg-surface-container-low text-primary">
        <MaterialIcon className="text-sm">{icon}</MaterialIcon>
      </span>
      <div>
        <p className="font-label-bold text-label-bold text-on-surface">{title}</p>
        <p className="font-body-sm text-body-sm text-on-surface-variant">{text}</p>
      </div>
    </div>
  );
}

function isActive(href, activePath) {
  return href.replace('#', '') === activePath;
}
