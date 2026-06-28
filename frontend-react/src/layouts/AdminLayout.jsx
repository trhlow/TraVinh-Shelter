import { useState } from 'react';
import BrandLogo from '../components/BrandLogo.jsx';
import MaterialIcon from '../components/MaterialIcon.jsx';
import useTheme from '../hooks/useTheme.js';

const SIDEBAR_KEY = 'travinh-sidebar-compact';

export default function AdminLayout({ children, session, onLogout, variant = 'broker', activePath = '' }) {
  const isAdmin = variant === 'admin';
  const { isDark, toggleTheme } = useTheme();
  const [compact, setCompact] = useState(readCompactPreference);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const title = isAdmin ? 'Quản trị hệ thống' : 'Nhà môi giới';
  const subtitle = isAdmin ? 'Kiểm soát users, môi giới và bài đăng' : 'Quản lý tin đăng, hồ sơ và hỗ trợ';
  const actionHref = isAdmin ? '#/admin/support' : '#/broker/properties';
  const actionLabel = isAdmin ? 'Xem ticket' : 'Đăng tin mới';
  const actionIcon = isAdmin ? 'support_agent' : 'add';
  const actionTone = isAdmin ? 'bg-[#0F62FE] hover:bg-[#0043CE]' : 'bg-action-orange hover:bg-orange-600';
  const profileHref = isAdmin ? '#/admin/overview' : '#/broker/profile';
  const navItems = isAdmin
    ? [
      ['dashboard', 'Tổng quan', '#/admin/overview'],
      ['group', 'Tài khoản users', '#/admin/users'],
      ['badge', 'Môi giới', '#/admin/brokers'],
      ['description', 'Bài đăng', '#/admin/properties'],
      ['support_agent', 'Hỗ trợ ưu tiên', '#/admin/support'],
    ]
    : [
      ['dashboard', 'Bảng điều khiển', '#/broker/dashboard'],
      ['description', 'Tin đăng của tôi', '#/broker/properties'],
      ['account_circle', 'Hồ sơ môi giới', '#/broker/profile'],
      ['support_agent', 'Hỗ trợ ưu tiên', '#/broker/support'],
    ];

  function toggleCompact() {
    setCompact((current) => {
      const next = !current;
      window.localStorage.setItem(SIDEBAR_KEY, String(next));
      return next;
    });
  }

  return (
    <div className="dashboard-shell min-h-screen bg-surface text-on-surface" data-compact={compact ? 'true' : 'false'}>
      <aside className="dashboard-sidebar fixed left-0 top-0 z-40 hidden h-screen flex-col bg-[#121619] text-[#DDE1E6] md:flex">
        <div className={`flex items-center ${compact ? 'justify-center px-3' : 'justify-between px-6'} h-20 border-b border-white/10`}>
          <a className="flex items-center gap-2 text-white" href="#/" title="Công Tín Land">
            <BrandLogo compact={compact} />
          </a>
        </div>

        <div className={`${compact ? 'px-3' : 'px-6'} py-5`}>
          <div className={`flex items-center gap-3 ${compact ? 'justify-center' : ''}`}>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded bg-white/10 text-action-orange">
              <MaterialIcon filled>{isAdmin ? 'admin_panel_settings' : 'real_estate_agent'}</MaterialIcon>
            </div>
            {!compact && (
              <div className="min-w-0">
                <h2 className="font-label-bold text-label-bold text-white">{title}</h2>
                <p className="truncate font-body-sm text-body-sm text-[#B8C7D9]">{session?.email || subtitle}</p>
              </div>
            )}
          </div>
          <a
            className={`mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded px-3 py-2 font-label-bold text-label-bold text-white shadow-sm transition-colors ${actionTone} ${compact ? 'px-0' : ''}`}
            href={actionHref}
            title={actionLabel}
          >
            <MaterialIcon className="text-sm">{actionIcon}</MaterialIcon>
            {!compact && actionLabel}
          </a>
        </div>

        <nav className="flex-1 overflow-y-auto pb-5">
          <p className={`${compact ? 'sr-only' : 'px-6 pb-2'} font-label-bold text-label-bold uppercase tracking-normal text-[#A2A9B0]`}>
            {isAdmin ? 'Admin' : 'Broker'}
          </p>
          <ul className="space-y-1">
            {navItems.map(([icon, label, href]) => (
              <SidebarItem
                active={isActive(href, activePath)}
                compact={compact}
                href={href}
                icon={icon}
                key={href}
                label={label}
              />
            ))}
            <SidebarItem active={activePath === '/'} compact={compact} href="#/" icon="home" label="Trang chủ" />
          </ul>
        </nav>

        {session && (
          <div className={`${compact ? 'px-3' : 'px-6'} border-t border-white/10 py-5`}>
            <button
              aria-label="Đăng xuất"
              className={`inline-flex min-h-11 w-full items-center justify-center gap-2 rounded border border-white/20 px-3 py-2 font-label-bold text-label-bold text-[#DDE1E6] transition-colors hover:bg-white/10 ${compact ? 'px-0' : ''}`}
              onClick={onLogout}
              type="button"
            >
              <MaterialIcon className="text-sm">logout</MaterialIcon>
              {!compact && 'Đăng xuất'}
            </button>
          </div>
        )}
      </aside>

      <div className="dashboard-workspace flex min-h-screen flex-col">
        <header className="sticky top-0 z-30 border-b border-outline-variant bg-surface-container-lowest/95 backdrop-blur">
          <div className="flex min-h-16 items-center justify-between gap-3 px-margin-mobile py-3 md:px-margin-desktop">
            <div className="flex min-w-0 items-center gap-3">
              <button
                aria-label={compact ? 'Mở rộng sidebar' : 'Thu gọn sidebar'}
                className="hidden h-10 w-10 items-center justify-center rounded border border-outline-variant text-on-surface-variant transition-colors hover:bg-surface-container-low md:inline-flex"
                onClick={toggleCompact}
                type="button"
              >
                <MaterialIcon>{compact ? 'menu_open' : 'menu'}</MaterialIcon>
              </button>
              <a className="flex items-center gap-2 text-trust-navy md:hidden" href="#/">
                <BrandLogo compact />
              </a>
              <div className="min-w-0">
                <p className="font-label-bold text-label-bold text-on-surface">{title}</p>
                <p className="hidden truncate font-body-sm text-body-sm text-on-surface-variant sm:block">{subtitle}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                aria-label={isDark ? 'Bật giao diện sáng' : 'Bật giao diện tối'}
                className="flex h-10 w-10 items-center justify-center rounded border border-outline-variant text-on-surface-variant transition-colors hover:bg-surface-container-low"
                onClick={toggleTheme}
                type="button"
              >
                <MaterialIcon>{isDark ? 'light_mode' : 'dark_mode'}</MaterialIcon>
              </button>

              <div className="relative">
                <button
                  aria-label="Thông báo"
                  className="relative flex h-10 w-10 items-center justify-center rounded border border-outline-variant text-on-surface-variant transition-colors hover:bg-surface-container-low"
                  onClick={() => {
                    setNotificationsOpen((current) => !current);
                    setProfileOpen(false);
                  }}
                  type="button"
                >
                  <MaterialIcon>notifications</MaterialIcon>
                  <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-action-orange" />
                </button>
                {notificationsOpen && (
                    <div className="absolute right-0 top-12 w-80 overflow-hidden rounded border border-outline-variant bg-surface-container-lowest shadow-lg">
                    <div className="border-b border-outline-variant px-4 py-3">
                      <p className="font-label-bold text-label-bold text-on-surface">Thông báo</p>
                    </div>
                    <div className="divide-y divide-outline-variant">
                      <NotificationLine icon="support_agent" title="Priority Support" text={isAdmin ? 'Có ticket mới cần kiểm tra.' : 'Bạn có thể gửi yêu cầu ưu tiên khi cần hỗ trợ.'} />
                      <NotificationLine icon="sync" title="Đồng bộ dữ liệu" text="Dashboard đang dùng dữ liệu API hiện có." />
                    </div>
                  </div>
                )}
              </div>

              <div className="relative">
                <button
                  className="flex items-center gap-2 rounded border border-outline-variant py-1.5 pl-1.5 pr-3 transition-colors hover:bg-surface-container-low"
                  onClick={() => {
                    setProfileOpen((current) => !current);
                    setNotificationsOpen(false);
                  }}
                  type="button"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded bg-primary text-on-primary font-label-bold text-label-bold">
                    {session?.email?.slice(0, 1).toUpperCase() || 'C'}
                  </span>
                  <span className="hidden max-w-40 truncate font-body-sm text-body-sm text-on-surface-variant sm:inline">{session?.email || 'Công Tín Land'}</span>
                  <MaterialIcon className="hidden text-sm text-on-surface-variant sm:inline">keyboard_arrow_down</MaterialIcon>
                </button>
                {profileOpen && (
                  <div className="absolute right-0 top-12 w-64 overflow-hidden rounded border border-outline-variant bg-surface-container-lowest shadow-lg">
                    <div className="border-b border-outline-variant px-4 py-3">
                      <p className="font-label-bold text-label-bold text-on-surface">{session?.email || 'Công Tín Land'}</p>
                      <p className="font-body-sm text-body-sm text-on-surface-variant">{session?.role || 'Guest'}</p>
                    </div>
                    <a className="flex items-center gap-2 px-4 py-3 font-body-sm text-body-sm text-on-surface hover:bg-surface-container-low" href={profileHref}>
                      <MaterialIcon className="text-sm">account_circle</MaterialIcon>
                      Hồ sơ
                    </a>
                    <a className="flex items-center gap-2 px-4 py-3 font-body-sm text-body-sm text-on-surface hover:bg-surface-container-low" href={isAdmin ? '#/admin/support' : '#/broker/support'}>
                      <MaterialIcon className="text-sm">support_agent</MaterialIcon>
                      Hỗ trợ ưu tiên
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
          </div>

          <nav className="flex gap-2 overflow-x-auto px-margin-mobile pb-3 md:hidden no-scrollbar">
            {navItems.map(([icon, label, href]) => {
              const active = isActive(href, activePath);
              return (
                <a key={href} className={`inline-flex shrink-0 items-center gap-2 rounded px-3 py-2 font-body-sm text-body-sm ${active ? 'bg-[#0F62FE] text-white font-bold' : 'border border-outline-variant bg-surface text-on-surface-variant'}`} href={href}>
                  <MaterialIcon filled={active} className="text-sm">{icon}</MaterialIcon>
                  {label}
                </a>
              );
            })}
            <a className={`inline-flex shrink-0 items-center gap-2 rounded px-3 py-2 font-body-sm text-body-sm ${activePath === '/' ? 'bg-[#0F62FE] text-white font-bold' : 'border border-outline-variant bg-surface text-on-surface-variant'}`} href="#/">
              <MaterialIcon filled={activePath === '/'} className="text-sm">home</MaterialIcon>
              Trang chủ
            </a>
          </nav>
        </header>

        {children}
      </div>
    </div>
  );
}

function SidebarItem({ active, compact, href, icon, label }) {
  return (
    <li>
      <a
        className={`mx-3 flex items-center gap-3 rounded px-3 py-2.5 font-body-sm text-body-sm transition-colors ${compact ? 'justify-center' : ''} ${active ? 'bg-[#0F62FE] text-white' : 'text-[#DDE1E6] hover:bg-white/10 hover:text-white'}`}
        href={href}
        title={label}
      >
        <MaterialIcon filled={active}>{icon}</MaterialIcon>
        {!compact && <span>{label}</span>}
      </a>
    </li>
  );
}

function NotificationLine({ icon, title, text }) {
  return (
    <div className="flex gap-3 px-4 py-3">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded bg-primary-fixed text-primary">
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

function readCompactPreference() {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(SIDEBAR_KEY) === 'true';
}
