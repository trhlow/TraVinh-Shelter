export function Header() {
  return (
    <nav className="bg-surface dark:bg-inverse-surface docked full-width top-0 sticky z-50 shadow-sm">
      <div className="flex justify-between items-center px-margin-mobile md:px-margin-desktop py-4 max-w-container-max mx-auto">
        <a className="font-headline-md text-headline-md font-bold text-trust-navy dark:text-primary-fixed" href="#/">
          BĐS Trà Vinh
        </a>
        <div className="hidden md:flex gap-6 items-center">
          <a className="font-body-md text-body-md text-on-surface-variant dark:text-surface-variant hover:text-primary dark:hover:text-primary-fixed hover:bg-surface-container-low dark:hover:bg-surface-container-highest transition-colors px-2 py-1 rounded" href="#/search">Cho thuê</a>
          <a className="font-body-md text-body-md text-on-surface-variant dark:text-surface-variant hover:text-primary dark:hover:text-primary-fixed hover:bg-surface-container-low dark:hover:bg-surface-container-highest transition-colors px-2 py-1 rounded" href="#/search">Bán nhà</a>
          <a className="font-body-md text-body-md text-on-surface-variant dark:text-surface-variant hover:text-primary dark:hover:text-primary-fixed hover:bg-surface-container-low dark:hover:bg-surface-container-highest transition-colors px-2 py-1 rounded" href="#/search">Bán đất</a>
        </div>
        <div className="flex gap-4 items-center">
          <button className="font-label-bold text-label-bold text-on-surface-variant border border-outline px-4 py-2 rounded-lg hover:bg-surface-container-low transition-colors hidden md:block">
            Đăng nhập
          </button>
          <a className="font-label-bold text-label-bold bg-action-orange text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity" href="#/broker">
            Đăng tin
          </a>
        </div>
      </div>
    </nav>
  );
}

export function Footer() {
  return (
    <footer className="w-full py-stack-lg bg-primary dark:bg-on-primary-fixed mt-auto">
      <div className="flex flex-col md:flex-row justify-between items-center px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto gap-4 md:gap-0">
        <div className="font-headline-sm text-headline-sm text-on-primary font-bold">
          BĐS Trà Vinh
        </div>
        <div className="flex flex-wrap justify-center gap-4 md:gap-6">
          <a className="font-body-sm text-body-sm text-on-primary-container dark:text-primary-fixed-dim opacity-80 hover:opacity-100 hover:text-secondary-fixed transition-opacity duration-200" href="#/">Về chúng tôi</a>
          <a className="font-body-sm text-body-sm text-on-primary-container dark:text-primary-fixed-dim opacity-80 hover:opacity-100 hover:text-secondary-fixed transition-opacity duration-200" href="#/">Điều khoản sử dụng</a>
          <a className="font-body-sm text-body-sm text-on-primary-container dark:text-primary-fixed-dim opacity-80 hover:opacity-100 hover:text-secondary-fixed transition-opacity duration-200" href="#/">Chính sách bảo mật</a>
          <a className="font-body-sm text-body-sm text-on-primary-container dark:text-primary-fixed-dim opacity-80 hover:opacity-100 hover:text-secondary-fixed transition-opacity duration-200" href="#/">Liên hệ quảng cáo</a>
        </div>
        <div className="font-body-sm text-body-sm text-on-primary opacity-60 text-center md:text-right">
          © 2024 Bất Động Sản Trà Vinh. Bảo lưu mọi quyền.
        </div>
      </div>
    </footer>
  );
}

export default function MainLayout({ children }) {
  return (
    <div className="bg-surface text-on-surface font-body-sm min-h-screen flex flex-col">
      <Header />
      {children}
      <Footer />
    </div>
  );
}
