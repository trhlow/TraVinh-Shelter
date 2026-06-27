import MaterialIcon from '../components/MaterialIcon.jsx';

export default function AdminLayout({ children }) {
  return (
    <div className="bg-surface text-on-surface flex min-h-screen">
      <nav className="hidden md:flex bg-surface-container-low h-screen w-64 fixed left-0 top-0 flex-col py-stack-lg z-40">
        <div className="px-gutter mb-stack-lg">
          <div className="flex items-center gap-4 mb-stack-md">
            <img
              className="w-12 h-12 rounded-full object-cover"
              data-alt="A professional headshot of a real estate broker wearing a tailored navy suit against a clean, light gray background."
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDT8NUv_0za5QTYxgJJzUsOToCdimURvzwYkqrKA2cmLqZRLJkBcHgi9_OfnSixJG4wyjGC71kYxBag2GkLVnQc6CctXyU0eA8mvoAs-r0JlxOohs_v_6MiB4ruev33ofgb-LBJRE-jodA9PhAhS7rDCCooiaSngYJAsM30U5GcPSSifkWgwW2AnhPWrMLN6GW0J9P5_zLkDmFDtv9Ksezj6qZ8kI7LUQNakH2DG-DDrkUfqCIgWoGidZPfx4cN6r-7GflB2b5xVko"
              alt="Nhà môi giới"
            />
            <div>
              <h2 className="font-label-bold text-label-bold text-trust-navy">Nhà môi giới</h2>
              <p className="font-body-sm text-body-sm text-on-surface-variant">Quản lý tài khoản</p>
            </div>
          </div>
          <button className="w-full bg-action-orange text-white font-label-bold text-label-bold py-2 rounded-lg hover:bg-orange-600 transition-colors">
            Nâng cấp gói tin
          </button>
        </div>
        <ul className="flex-1 space-y-2">
          <li>
            <a className="flex items-center gap-3 px-gutter py-3 text-on-surface-variant hover:bg-surface-container-high transition-all font-body-sm text-body-sm" href="#/broker">
              <MaterialIcon>dashboard</MaterialIcon>
              Bảng điều khiển
            </a>
          </li>
          <li>
            <a className="flex items-center gap-3 px-gutter py-3 text-primary font-bold border-r-4 border-primary bg-surface-container font-body-sm text-body-sm opacity-80" href="#/broker">
              <MaterialIcon filled>description</MaterialIcon>
              Tin đăng của tôi
            </a>
          </li>
          <li>
            <a className="flex items-center gap-3 px-gutter py-3 text-on-surface-variant hover:bg-surface-container-high transition-all font-body-sm text-body-sm" href="#/broker">
              <MaterialIcon>event_available</MaterialIcon>
              Lịch hẹn
            </a>
          </li>
          <li>
            <a className="flex items-center gap-3 px-gutter py-3 text-on-surface-variant hover:bg-surface-container-high transition-all font-body-sm text-body-sm" href="#/broker">
              <MaterialIcon>chat</MaterialIcon>
              Tin nhắn
            </a>
          </li>
          <li>
            <a className="flex items-center gap-3 px-gutter py-3 text-on-surface-variant hover:bg-surface-container-high transition-all font-body-sm text-body-sm" href="#/broker">
              <MaterialIcon>settings</MaterialIcon>
              Cài đặt
            </a>
          </li>
        </ul>
      </nav>
      {children}
    </div>
  );
}
