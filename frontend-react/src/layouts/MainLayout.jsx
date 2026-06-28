import BrandLogo, { BRAND_NAME } from '../components/BrandLogo.jsx';
import MaterialIcon from '../components/MaterialIcon.jsx';

export function Header({ session, onLogout }) {
  const isBroker = session?.role === 'BROKER';
  const isAdmin = session?.role === 'ADMIN';
  const saleSections = [
    {
      title: 'Nhà',
      links: [
        { label: 'Mua nhà', href: '#/search?category=nha&transaction=sale' },
      ],
    },
    {
      title: 'Đất',
      links: [
        { label: 'Mua đất', href: '#/search?category=dat&transaction=sale' },
      ],
    },
  ];
  const rentSections = [
    {
      links: [
        { label: 'Trọ', href: '#/search?category=tro&transaction=rent' },
      ],
    },
    {
      title: 'Nhà',
      links: [
        { label: 'Thuê nhà', href: '#/search?category=nha&transaction=rent' },
      ],
    },
    {
      title: 'Đất',
      links: [
        { label: 'Thuê đất', href: '#/search?category=dat&transaction=rent' },
      ],
    },
  ];

  return (
    <header className="bg-surface shadow-sm docked full-width top-0 sticky z-50 w-full transition-all duration-300">
      <div className="flex justify-between items-center px-margin-mobile md:px-margin-desktop py-4 max-w-container-max mx-auto">
        <a className="font-headline-md text-headline-md font-bold text-trust-navy flex items-center gap-2" href="#/">
          <BrandLogo />
        </a>

        <nav className="hidden md:flex items-center gap-8">
          <NavDropdown label="Mua" sections={saleSections} />
          <NavDropdown label="Thuê" sections={rentSections} />
          <a className="text-on-surface-variant hover:text-action-orange transition-colors px-2 py-1 rounded font-label-bold text-label-bold" href="#/projects">
            Dự án
          </a>
          <a className="text-on-surface-variant hover:text-action-orange transition-colors px-2 py-1 rounded font-label-bold text-label-bold" href="#/brokers">
            Môi giới
          </a>
        </nav>

        <div className="flex items-center gap-3">
          {!session && (
            <a className="hidden md:flex items-center justify-center px-4 py-2 border border-primary text-primary font-label-bold text-label-bold rounded hover:bg-surface-container-low transition-colors" href="#/login">
              Đăng nhập
            </a>
          )}
          {isAdmin && (
            <a className="hidden md:flex items-center justify-center px-4 py-2 border border-primary text-primary font-label-bold text-label-bold rounded hover:bg-surface-container-low transition-colors" href="#/admin/overview">
              Admin
            </a>
          )}
          {isBroker && (
            <a className="hidden md:flex items-center justify-center px-4 py-2 bg-action-orange text-on-primary font-label-bold text-label-bold rounded shadow-sm hover:opacity-90 transition-opacity" href="#/broker/properties">
              Đăng tin
            </a>
          )}
          {session && (
            <button className="font-label-bold text-label-bold text-on-surface-variant border border-outline px-4 py-2 rounded hover:bg-surface-container-low transition-colors" onClick={onLogout}>
              Đăng xuất
            </button>
          )}
        </div>
      </div>
      <nav className="md:hidden px-margin-mobile pb-3 max-w-container-max mx-auto flex gap-2 overflow-x-auto no-scrollbar">
        <a className="shrink-0 px-3 py-2 rounded border border-outline-variant bg-surface-container-lowest text-trust-navy font-label-bold text-label-bold" href="#/search">
          Tin đăng
        </a>
        <a className="shrink-0 px-3 py-2 rounded border border-outline-variant bg-surface-container-lowest text-trust-navy font-label-bold text-label-bold" href="#/projects">
          Dự án
        </a>
        <a className="shrink-0 px-3 py-2 rounded border border-outline-variant bg-surface-container-lowest text-trust-navy font-label-bold text-label-bold" href="#/brokers">
          Môi giới
        </a>
      </nav>
    </header>
  );
}

function NavDropdown({ label, sections }) {
  return (
    <div className="relative group">
      <button
        className="flex items-center gap-1 text-on-surface-variant hover:text-action-orange group-hover:text-action-orange hover:bg-surface-container-low transition-colors px-2 py-1 rounded font-label-bold text-label-bold"
        type="button"
        aria-haspopup="true"
      >
        {label}
        <MaterialIcon className="text-sm transition-transform duration-200 group-hover:rotate-180">keyboard_arrow_down</MaterialIcon>
      </button>
      <div className="absolute top-full left-0 mt-1 min-w-44 bg-surface-container-lowest border border-outline-variant rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible group-focus-within:opacity-100 group-focus-within:visible transition-all duration-200 z-50 overflow-hidden">
        {sections.map((section, index) => (
          <div key={section.title || section.links[0].href} className={`${index > 0 ? 'border-t border-outline-variant' : ''} py-2`}>
            {section.title && (
              <div className="px-4 pb-1 font-label-bold text-label-bold text-trust-navy">
                {section.title}
              </div>
            )}
            {section.links.map((link) => (
              <a
                key={link.href}
                className="block whitespace-nowrap px-4 py-2 text-body-sm hover:bg-surface-container-low text-on-surface"
                href={link.href}
              >
                {link.label}
              </a>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function Footer() {
  return (
    <footer className="w-full py-stack-lg bg-primary dark:bg-on-primary-fixed mt-auto">
      <div className="flex flex-col md:flex-row justify-between items-center px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto gap-4 md:gap-0">
        <div className="font-headline-sm text-headline-sm text-on-primary font-bold">
          {BRAND_NAME}
        </div>
        <div className="flex flex-wrap justify-center gap-4 md:gap-6">
          <a className="font-body-sm text-body-sm text-on-primary-container dark:text-primary-fixed-dim opacity-80 hover:opacity-100 hover:text-secondary-fixed transition-opacity duration-200" href="#/">Về chúng tôi</a>
          <a className="font-body-sm text-body-sm text-on-primary-container dark:text-primary-fixed-dim opacity-80 hover:opacity-100 hover:text-secondary-fixed transition-opacity duration-200" href="#/">Điều khoản sử dụng</a>
          <a className="font-body-sm text-body-sm text-on-primary-container dark:text-primary-fixed-dim opacity-80 hover:opacity-100 hover:text-secondary-fixed transition-opacity duration-200" href="#/">Chính sách bảo mật</a>
          <a className="font-body-sm text-body-sm text-on-primary-container dark:text-primary-fixed-dim opacity-80 hover:opacity-100 hover:text-secondary-fixed transition-opacity duration-200" href="#/">Liên hệ quảng cáo</a>
        </div>
        <div className="font-body-sm text-body-sm text-on-primary opacity-60 text-center md:text-right">
          © 2024 {BRAND_NAME}. Bảo lưu mọi quyền.
        </div>
      </div>
    </footer>
  );
}

export default function MainLayout({ children, session, onLogout }) {
  return (
    <div className="bg-surface text-on-surface font-body-sm min-h-screen flex flex-col">
      <Header session={session} onLogout={onLogout} />
      {children}
      <Footer />
    </div>
  );
}
