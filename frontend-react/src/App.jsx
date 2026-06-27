import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Building2,
  CalendarDays,
  Heart,
  Home,
  Loader2,
  Lock,
  Mail,
  MapPin,
  Menu,
  Phone,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  User,
  X,
} from 'lucide-react';
import { fetchBrokerDashboard, fetchProperties } from './services/api.js';
import { validateContactForm, validateLoginForm } from './utils/validation.js';

const initialFilters = {
  query: '',
  category: 'all',
  transaction: 'all',
  minPrice: '',
  maxPrice: '',
  ward: 'all',
};

const navigation = [
  { path: '/', label: 'Mua bán', icon: Home },
  { path: '/rentals', label: 'Cho thuê', icon: Building2 },
  { path: '/broker', label: 'Môi giới', icon: User },
  { path: '/admin', label: 'Quản trị', icon: ShieldCheck },
];

export default function App() {
  const [route, setRoute] = useHashRoute();
  const [filters, setFilters] = useState(initialFilters);
  const [selectedId, setSelectedId] = useState(null);
  const [favorites, setFavorites] = useState(() => new Set());
  const [properties, setProperties] = useState([]);
  const [status, setStatus] = useState({ phase: 'loading', message: '' });
  const [brokerStats, setBrokerStats] = useState(null);
  const [contactState, setContactState] = useState({ values: { name: '', phone: '', message: '' }, errors: {}, sent: false });

  useEffect(() => {
    let alive = true;
    setStatus({ phase: 'loading', message: '' });
    fetchProperties(filters)
      .then((items) => {
        if (!alive) return;
        setProperties(items);
        setSelectedId((current) => (current && items.some((item) => item.id === current) ? current : items[0]?.id ?? null));
        setStatus({ phase: 'ready', message: '' });
      })
      .catch((error) => {
        if (!alive) return;
        setProperties([]);
        setSelectedId(null);
        setStatus({ phase: 'error', message: error.message || 'Không thể tải dữ liệu.' });
      });
    return () => {
      alive = false;
    };
  }, [filters]);

  useEffect(() => {
    fetchBrokerDashboard().then(setBrokerStats).catch(() => setBrokerStats(null));
  }, []);

  const selectedProperty = useMemo(
    () => properties.find((property) => property.id === selectedId) ?? properties[0],
    [properties, selectedId],
  );

  const routeKind = route.path.split('/')[1] || 'properties';
  const showLogin = route.path === '/login';

  function updateFilter(name, value) {
    setFilters((current) => ({ ...current, [name]: value }));
  }

  function resetFilters() {
    setFilters(initialFilters);
  }

  function toggleFavorite(id) {
    setFavorites((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function submitContact(event) {
    event.preventDefault();
    const errors = validateContactForm(contactState.values);
    if (Object.keys(errors).length > 0) {
      setContactState((current) => ({ ...current, errors, sent: false }));
      return;
    }
    setContactState((current) => ({ ...current, errors: {}, sent: true }));
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#/" aria-label="Tra Vinh Realty home">
          <span className="brand-mark"><Home size={24} aria-hidden="true" /></span>
          <span>
            <strong>TRA VINH REALTY</strong>
            <small>Kết nối an cư bền vững</small>
          </span>
        </a>
        <nav className="primary-nav" aria-label="Primary navigation">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = route.path === item.path || (item.path === '/' && routeKind === 'properties');
            return (
              <button key={item.path} type="button" className={active ? 'nav-item active' : 'nav-item'} onClick={() => setRoute(item.path)} aria-current={active ? 'page' : undefined}>
                <Icon size={18} aria-hidden="true" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="topbar-actions">
          <button type="button" className="icon-text" onClick={() => setRoute('/favorites')}>
            <Heart size={18} aria-hidden="true" />
            <span>Yêu thích</span>
            <b>{favorites.size}</b>
          </button>
          <button type="button" className="login-button" onClick={() => setRoute('/login')}>
            <User size={18} aria-hidden="true" />
            <span>Đăng nhập</span>
          </button>
          <button type="button" className="menu-button" aria-label="Open menu">
            <Menu size={22} aria-hidden="true" />
          </button>
        </div>
      </header>

      <main className="workspace">
        <aside className="sidebar" aria-label="Property filters">
          <section className="panel filter-panel">
            <div className="panel-title">
              <h2>Tìm kiếm bất động sản</h2>
              <button type="button" className="ghost-button" onClick={resetFilters}>Đặt lại</button>
            </div>
            <label className="field">
              <span>Địa điểm hoặc dự án</span>
              <div className="input-icon">
                <MapPin size={17} aria-hidden="true" />
                <input value={filters.query} onChange={(event) => updateFilter('query', event.target.value)} placeholder="Phường 7, Long Đức..." />
              </div>
            </label>
            <div className="field-grid">
              <label className="field">
                <span>Loại</span>
                <select value={filters.category} onChange={(event) => updateFilter('category', event.target.value)}>
                  <option value="all">Tất cả</option>
                  <option value="house">Nhà</option>
                  <option value="apartment">Căn hộ</option>
                  <option value="land">Đất</option>
                </select>
              </label>
              <label className="field">
                <span>Giao dịch</span>
                <select value={filters.transaction} onChange={(event) => updateFilter('transaction', event.target.value)}>
                  <option value="all">Tất cả</option>
                  <option value="sale">Mua bán</option>
                  <option value="rent">Cho thuê</option>
                </select>
              </label>
            </div>
            <div className="field-grid">
              <label className="field">
                <span>Giá từ</span>
                <input inputMode="decimal" value={filters.minPrice} onChange={(event) => updateFilter('minPrice', event.target.value)} placeholder="0" />
              </label>
              <label className="field">
                <span>Đến</span>
                <input inputMode="decimal" value={filters.maxPrice} onChange={(event) => updateFilter('maxPrice', event.target.value)} placeholder="5" />
              </label>
            </div>
            <label className="field">
              <span>Phường / xã</span>
              <select value={filters.ward} onChange={(event) => updateFilter('ward', event.target.value)}>
                <option value="all">Tất cả</option>
                <option value="phuong-7">Phường 7</option>
                <option value="long-duc">Long Đức</option>
                <option value="cang-long">Càng Long</option>
                <option value="cau-ke">Cầu Kè</option>
              </select>
            </label>
            <button type="button" className="primary-button">
              <Search size={18} aria-hidden="true" />
              Tìm kiếm
            </button>
          </section>

          <section className="panel tools-panel">
            <h2>Quản lý & công cụ</h2>
            <button type="button" onClick={() => setRoute('/broker')}><Building2 size={18} aria-hidden="true" /> Quản lý tin đăng</button>
            <button type="button" onClick={() => setRoute('/appointments')}><CalendarDays size={18} aria-hidden="true" /> Lịch hẹn xem</button>
            <button type="button" onClick={() => setRoute('/admin')}><ShieldCheck size={18} aria-hidden="true" /> Quản lý môi giới</button>
          </section>
        </aside>

        <section className="results" aria-labelledby="results-heading">
          <div className="results-toolbar">
            <div>
              <h1 id="results-heading">{routeTitle(routeKind)}</h1>
              <p>{status.phase === 'ready' ? `${properties.length} kết quả phù hợp tại Trà Vinh` : 'Đang đồng bộ dữ liệu thị trường'}</p>
            </div>
            <div className="toolbar-actions">
              <button type="button" className="view-toggle active"><SlidersHorizontal size={17} aria-hidden="true" /> Lưới</button>
              <button type="button" className="view-toggle">Danh sách</button>
            </div>
          </div>

          <MarketStrip count={properties.length} routeKind={routeKind} />

          {route.path === '/broker' || route.path === '/admin' ? (
            <DashboardPanel stats={brokerStats} kind={route.path} />
          ) : (
            <PropertyResults
              status={status}
              properties={route.path === '/favorites' ? properties.filter((property) => favorites.has(property.id)) : properties}
              selectedId={selectedProperty?.id}
              favorites={favorites}
              onSelect={setSelectedId}
              onFavorite={toggleFavorite}
              onReset={resetFilters}
            />
          )}
        </section>

        <aside className="detail-rail" aria-label="Property detail">
          <PropertyDetail
            property={selectedProperty}
            favorite={selectedProperty ? favorites.has(selectedProperty.id) : false}
            onFavorite={() => selectedProperty && toggleFavorite(selectedProperty.id)}
            contactState={contactState}
            onContactChange={(values) => setContactState((current) => ({ ...current, values, errors: {}, sent: false }))}
            onContactSubmit={submitContact}
          />
        </aside>
      </main>

      {showLogin && <LoginDialog onClose={() => setRoute('/')} />}
    </div>
  );
}

function PropertyResults({ status, properties, selectedId, favorites, onSelect, onFavorite, onReset }) {
  if (status.phase === 'loading') {
    return <StatePanel icon={Loader2} title="Đang tải dữ liệu..." message="Nguồn tin đang được cập nhật." spinning />;
  }
  if (status.phase === 'error') {
    return <StatePanel icon={AlertTriangle} title="Đã xảy ra lỗi" message={status.message} action="Thử lại" onAction={onReset} />;
  }
  if (properties.length === 0) {
    return <StatePanel icon={Search} title="Không tìm thấy kết quả" message="Không có bất động sản phù hợp với bộ lọc hiện tại." action="Đặt lại bộ lọc" onAction={onReset} />;
  }
  return (
    <div className="property-grid" data-testid="property-grid">
      {properties.map((property) => (
        <article key={property.id} className={property.id === selectedId ? 'property-card selected' : 'property-card'}>
          <button type="button" className="card-main" onClick={() => onSelect(property.id)} aria-label={`Xem ${property.title}`}>
            <img src={property.image} alt={property.title} loading="lazy" />
            <div className="card-body">
              <span className="tag">{property.statusLabel}</span>
              <h3>{property.title}</h3>
              <p><MapPin size={14} aria-hidden="true" /> {property.address}</p>
              <strong>{property.priceLabel}</strong>
              <dl>
                <div><dt>Diện tích</dt><dd>{property.area} m²</dd></div>
                <div><dt>Phòng</dt><dd>{property.bedrooms}</dd></div>
                <div><dt>Hướng</dt><dd>{property.direction}</dd></div>
              </dl>
            </div>
          </button>
          <button type="button" className="favorite-button" onClick={() => onFavorite(property.id)} aria-label={favorites.has(property.id) ? 'Bỏ yêu thích' : 'Thêm yêu thích'}>
            <Heart size={19} fill={favorites.has(property.id) ? 'currentColor' : 'none'} aria-hidden="true" />
          </button>
        </article>
      ))}
    </div>
  );
}

function MarketStrip({ count, routeKind }) {
  const intent = routeKind === 'rentals' ? 'Nguồn thuê đang mở' : routeKind === 'favorites' ? 'Danh sách theo dõi' : 'Nguồn bán mới';
  return (
    <div className="market-strip" aria-label="Market summary">
      <div>
        <span>{intent}</span>
        <strong>{count} tin phù hợp</strong>
      </div>
      <div>
        <span>Khu vực trọng tâm</span>
        <strong>TP. Trà Vinh và vùng ven</strong>
      </div>
      <div>
        <span>Kiểm tra pháp lý</span>
        <strong>Môi giới xác minh trước khi hẹn</strong>
      </div>
    </div>
  );
}

function PropertyDetail({ property, favorite, onFavorite, contactState, onContactChange, onContactSubmit }) {
  if (!property) {
    return <StatePanel icon={Building2} title="Chọn một tin đăng" message="Chi tiết bất động sản sẽ hiển thị tại đây." />;
  }
  return (
    <section className="detail-panel panel">
      <img className="detail-image" src={property.image} alt={property.title} />
      <div className="detail-heading">
        <span className="tag">{property.statusLabel}</span>
        <button type="button" className="favorite-button inline" onClick={onFavorite} aria-label={favorite ? 'Bỏ yêu thích' : 'Thêm yêu thích'}>
          <Heart size={20} fill={favorite ? 'currentColor' : 'none'} aria-hidden="true" />
        </button>
      </div>
      <h2>{property.title}</h2>
      <p className="muted"><MapPin size={15} aria-hidden="true" /> {property.address}</p>
      <strong className="detail-price">{property.priceLabel}</strong>
      <dl className="detail-specs">
        <div><dt>Diện tích</dt><dd>{property.area} m²</dd></div>
        <div><dt>Kích thước</dt><dd>{property.size}</dd></div>
        <div><dt>Phòng ngủ</dt><dd>{property.bedrooms}</dd></div>
        <div><dt>Pháp lý</dt><dd>{property.legal}</dd></div>
      </dl>
      <p className="description">{property.description}</p>
      <BrokerCard broker={property.broker} />
      <ContactForm state={contactState} broker={property.broker} onChange={onContactChange} onSubmit={onContactSubmit} />
    </section>
  );
}

function BrokerCard({ broker }) {
  return (
    <div className="broker-card">
      <div className="avatar" aria-hidden="true">{broker.name.charAt(0)}</div>
      <div>
        <h3>{broker.name}</h3>
        <p>{broker.rating} · phản hồi trong {broker.responseTime}</p>
      </div>
      <a href={`tel:${broker.phone}`} aria-label={`Gọi ${broker.name}`}><Phone size={18} aria-hidden="true" /></a>
    </div>
  );
}

function ContactForm({ state, broker, onChange, onSubmit }) {
  return (
    <form className="contact-form" onSubmit={onSubmit} noValidate>
      <h3>Liên hệ môi giới</h3>
      <label className="field">
        <span>Họ tên</span>
        <input value={state.values.name} onChange={(event) => onChange({ ...state.values, name: event.target.value })} aria-invalid={Boolean(state.errors.name)} />
        {state.errors.name && <small role="alert">{state.errors.name}</small>}
      </label>
      <label className="field">
        <span>Số điện thoại</span>
        <input inputMode="tel" value={state.values.phone} onChange={(event) => onChange({ ...state.values, phone: event.target.value })} aria-invalid={Boolean(state.errors.phone)} />
        {state.errors.phone && <small role="alert">{state.errors.phone}</small>}
      </label>
      <label className="field">
        <span>Nội dung</span>
        <textarea value={state.values.message} onChange={(event) => onChange({ ...state.values, message: event.target.value })} />
      </label>
      <button type="submit" className="primary-button"><Phone size={17} aria-hidden="true" /> Gửi yêu cầu</button>
      <a className="secondary-link" href={`mailto:${broker.email}`}><Mail size={16} aria-hidden="true" /> Email môi giới</a>
      {state.sent && <p className="success" role="status">Yêu cầu đã được ghi nhận.</p>}
    </form>
  );
}

function LoginDialog({ onClose }) {
  const [mode, setMode] = useState('login');
  const [values, setValues] = useState({ email: '', password: '', fullName: '' });
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);

  function submit(event) {
    event.preventDefault();
    const nextErrors = validateLoginForm(values, mode);
    setErrors(nextErrors);
    setSubmitted(Object.keys(nextErrors).length === 0);
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="login-dialog" role="dialog" aria-modal="true" aria-labelledby="login-title">
        <button type="button" className="close-button" onClick={onClose} aria-label="Đóng"><X size={20} aria-hidden="true" /></button>
        <h2 id="login-title">{mode === 'login' ? 'Đăng nhập' : 'Đăng ký'}</h2>
        <div className="tabs" role="tablist" aria-label="Authentication mode">
          <button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>Đăng nhập</button>
          <button type="button" className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')}>Đăng ký</button>
        </div>
        <form onSubmit={submit} noValidate>
          {mode === 'register' && (
            <label className="field">
              <span>Họ tên</span>
              <input value={values.fullName} onChange={(event) => setValues({ ...values, fullName: event.target.value })} aria-invalid={Boolean(errors.fullName)} />
              {errors.fullName && <small role="alert">{errors.fullName}</small>}
            </label>
          )}
          <label className="field">
            <span>Email</span>
            <input type="email" value={values.email} onChange={(event) => setValues({ ...values, email: event.target.value })} aria-invalid={Boolean(errors.email)} />
            {errors.email && <small role="alert">{errors.email}</small>}
          </label>
          <label className="field">
            <span>Mật khẩu</span>
            <div className="input-icon">
              <Lock size={16} aria-hidden="true" />
              <input type="password" value={values.password} onChange={(event) => setValues({ ...values, password: event.target.value })} aria-invalid={Boolean(errors.password)} />
            </div>
            {errors.password && <small role="alert">{errors.password}</small>}
          </label>
          <button type="submit" className="primary-button">{mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}</button>
          {submitted && <p className="success" role="status">Thông tin hợp lệ. API auth sẽ xử lý bước tiếp theo.</p>}
        </form>
      </section>
    </div>
  );
}

function DashboardPanel({ stats, kind }) {
  const title = kind === '/admin' ? 'Bảng quản trị' : 'Bảng môi giới';
  const cards = stats ?? { activeListings: 18, pendingLeads: 7, appointments: 4, conversion: '22%' };
  return (
    <section className="dashboard-panel">
      <h2>{title}</h2>
      <div className="metric-grid">
        <Metric label="Tin đang đăng" value={cards.activeListings} />
        <Metric label="Yêu cầu mới" value={cards.pendingLeads} />
        <Metric label="Lịch hẹn" value={cards.appointments} />
        <Metric label="Tỷ lệ chốt" value={cards.conversion} />
      </div>
      <div className="panel table-panel">
        <h3>Việc cần xử lý</h3>
        <div className="task-row"><span>Duyệt tin mới tại Phường 7</span><b>Hôm nay</b></div>
        <div className="task-row"><span>Gọi lại khách quan tâm đất Long Đức</span><b>10:30</b></div>
        <div className="task-row"><span>Cập nhật pháp lý tin nhà phố</span><b>Ưu tiên</b></div>
      </div>
    </section>
  );
}

function Metric({ label, value }) {
  return (
    <div className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function StatePanel({ icon: Icon, title, message, action, onAction, spinning = false }) {
  return (
    <div className="state-panel">
      <Icon className={spinning ? 'spin' : ''} size={34} aria-hidden="true" />
      <h2>{title}</h2>
      <p>{message}</p>
      {action && <button type="button" className="secondary-button" onClick={onAction}>{action}</button>}
    </div>
  );
}

function routeTitle(kind) {
  if (kind === 'favorites') return 'Tin đã yêu thích';
  if (kind === 'rentals') return 'Bất động sản cho thuê';
  return 'Kết quả tìm kiếm';
}

function useHashRoute() {
  const read = () => ({ path: window.location.hash.replace(/^#/, '') || '/' });
  const [route, setRouteState] = useState(read);
  useEffect(() => {
    const onHashChange = () => setRouteState(read());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);
  const setRoute = (path) => {
    window.location.hash = path;
    setRouteState({ path });
  };
  return [route, setRoute];
}
