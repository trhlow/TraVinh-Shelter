import { useEffect, useState } from 'react';
import FeaturedCarousel from '../components/FeaturedCarousel.jsx';
import Icon from '../components/ui/Icon.jsx';
import Button from '../components/ui/Button.jsx';
import MainLayout from '../layouts/MainLayout.jsx';
import { featuredProperties } from '../data/templateData.js';
import { fetchProperties } from '../services/api.js';

const STATS = [
  { number: '500+', label: 'Bất động sản' },
  { number: '50+', label: 'Môi giới chuyên nghiệp' },
  { number: '1,200+', label: 'Giao dịch thành công' },
  { number: '5+', label: 'Năm kinh nghiệm' },
];

const SERVICES = [
  {
    icon: 'Search',
    title: 'Tìm kiếm thông minh',
    desc: 'Lọc bất động sản theo khu vực, giá, diện tích và loại hình một cách dễ dàng.',
  },
  {
    icon: 'ShieldCheck',
    title: 'Môi giới uy tín',
    desc: 'Đội ngũ môi giới được xác minh và quản lý chặt chẽ bởi Công Tín Land.',
  },
  {
    icon: 'TrendingUp',
    title: 'Thông tin thị trường',
    desc: 'Cập nhật giá cả và xu hướng thị trường bất động sản Trà Vinh liên tục.',
  },
  {
    icon: 'Phone',
    title: 'Hỗ trợ trực tiếp',
    desc: 'Kết nối ngay với môi giới qua điện thoại hoặc nhắn tin trong vài giây.',
  },
  {
    icon: 'FileText',
    title: 'Hồ sơ pháp lý rõ ràng',
    desc: 'Tất cả bất động sản đều được kiểm tra hồ sơ pháp lý trước khi đăng.',
  },
  {
    icon: 'DollarSign',
    title: 'Miễn phí cho người mua',
    desc: 'Người mua và thuê không mất phí khi sử dụng nền tảng Công Tín Land.',
  },
];

const MOCK_BROKERS = [
  { name: 'Nguyễn Văn An', area: 'TP. Trà Vinh', listings: 24, initial: 'A' },
  { name: 'Trần Thị Bình', area: 'Châu Thành', listings: 18, initial: 'B' },
  { name: 'Lê Văn Cường', area: 'Cầu Ngang', listings: 15, initial: 'C' },
  { name: 'Phạm Thị Dung', area: 'Tiểu Cần', listings: 12, initial: 'D' },
];

const CORAL_STATS = [
  { number: '98%', label: 'Khách hài lòng' },
  { number: '24h', label: 'Phản hồi trung bình' },
  { number: '0đ', label: 'Phí cho người mua' },
];

const CORAL_BENEFITS = [
  { icon: 'ShieldCheck', text: 'Môi giới được xác minh danh tính' },
  { icon: 'FileText', text: 'Hồ sơ pháp lý minh bạch' },
  { icon: 'Phone', text: 'Hỗ trợ tư vấn 7 ngày/tuần' },
];

function HeroSearchBar() {
  const [query, setQuery] = useState('');
  function handleSearch(e) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set('query', query.trim());
    window.location.hash = params.toString() ? `#/search?${params}` : '#/search';
  }
  return (
    <form className="hero-search" onSubmit={handleSearch}>
      <Icon name="Search" size={18} className="hero-search-icon" />
      <input
        className="hero-search-input"
        placeholder="Tìm theo khu vực, giá, loại bất động sản..."
        value={query}
        onChange={e => setQuery(e.target.value)}
      />
      <button type="submit" className="hero-search-btn">
        <Icon name="Search" size={16} /> Tìm kiếm
      </button>
    </form>
  );
}

export default function HomePage({ session, onLogout }) {
  const [properties, setProperties] = useState(featuredProperties);

  useEffect(() => {
    let alive = true;
    fetchProperties({ category: 'all', transaction: 'all' })
      .then(items => { if (alive && items.length > 0) setProperties(items.slice(0, 3)); })
      .catch(() => { if (alive) setProperties(featuredProperties); });
    return () => { alive = false; };
  }, []);

  return (
    <MainLayout session={session} onLogout={onLogout}>
      {/* 1. HERO */}
      <section className="hero">
        <div className="container">
          <div className="hero-content">
            <div className="hero-eyebrow">
              <Icon name="MapPin" size={14} />
              Bất động sản Trà Vinh
            </div>
            <h1 className="hero-title">
              Công Tín Land - tìm nhà trọ, bất động sản Trà Vinh nhanh chóng
            </h1>
            <p className="hero-subtitle">
              Kết nối người mua — người bán — môi giới uy tín. Hàng trăm bất động sản được cập nhật hằng ngày tại Trà Vinh.
            </p>
            <div className="hero-ctas">
              <Button as="a" href="#/search" variant="primary" size="lg">
                <Icon name="Search" size={18} /> Tìm bất động sản
              </Button>
              <Button as="a" href="#/brokers" variant="secondary" size="lg">
                Xem môi giới
              </Button>
            </div>
            <HeroSearchBar />
          </div>
        </div>
      </section>

      {/* 2. STATS */}
      <div className="stats-bar">
        <div className="container">
          <div className="stats-grid">
            {STATS.map(stat => (
              <div key={stat.label}>
                <div className="stat-number">{stat.number}</div>
                <div className="stat-label">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 3. FEATURED PROPERTIES */}
      <section className="section-subtle">
        <div className="container">
          <div className="section-header">
            <div className="section-header-text">
              <h2 className="text-h2">Tin nổi bật</h2>
              <p>Khám phá các bất động sản tốt nhất tại Trà Vinh</p>
            </div>
            <a href="#/search" className="section-header-link">
              Xem tất cả <Icon name="ArrowRight" size={15} />
            </a>
          </div>
          <FeaturedCarousel properties={properties} />
        </div>
      </section>

      {/* 4. SERVICES */}
      <section className="section-pastel">
        <div className="container">
          <div className="section-center">
            <h2 className="text-h2 section-center-title">Tại sao chọn Công Tín Land?</h2>
            <p className="section-center-subtitle">
              Nền tảng bất động sản địa phương với đội ngũ môi giới được kiểm duyệt chặt chẽ.
            </p>
          </div>
          <div className="features-grid">
            {SERVICES.map(svc => (
              <div key={svc.title} className="feature-card">
                <div className="feature-icon">
                  <Icon name={svc.icon} size={22} />
                </div>
                <h3 className="text-h3 feature-card-title">{svc.title}</h3>
                <p className="feature-card-desc">
                  {svc.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. CORAL ACCENT */}
      <section className="section-coral">
        <div className="container">
          <div className="coral-inner">
            <div>
              <div className="coral-eyebrow">
                <Icon name="Star" size={14} /> Cam kết dịch vụ
              </div>
              <h2 className="coral-title">
                Đồng hành cùng hàng trăm môi giới chuyên nghiệp tại Trà Vinh
              </h2>
              <p className="coral-text">
                Công Tín Land kết nối khách hàng với đội ngũ môi giới được kiểm duyệt,
                mang lại trải nghiệm mua bán bất động sản minh bạch và an tâm.
              </p>
              <div className="coral-stats">
                {CORAL_STATS.map(stat => (
                  <div key={stat.label}>
                    <div className="coral-stat-number">{stat.number}</div>
                    <div className="coral-stat-label">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="coral-card">
              {CORAL_BENEFITS.map(benefit => (
                <div key={benefit.text} className="coral-card-row">
                  <span className="coral-card-icon">
                    <Icon name={benefit.icon} size={18} />
                  </span>
                  {benefit.text}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 6. BROKERS */}
      <section className="section-subtle">
        <div className="container">
          <div className="section-header">
            <div className="section-header-text">
              <h2 className="text-h2">Đội ngũ môi giới</h2>
              <p>Môi giới được xác minh và đào tạo bởi Công Tín Land</p>
            </div>
            <a href="#/brokers" className="section-header-link">
              Xem tất cả môi giới <Icon name="ArrowRight" size={15} />
            </a>
          </div>
          <div className="grid-4">
            {MOCK_BROKERS.map(broker => (
              <div key={broker.name} className="broker-card">
                <div className="broker-avatar-lg">{broker.initial}</div>
                <p className="broker-card-name">
                  {broker.name}
                </p>
                <p className="broker-card-area">
                  <Icon name="MapPin" size={12} /> {broker.area}
                </p>
                <p className="broker-card-count">
                  {broker.listings} tin đăng
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. NEWS / LATEST UPDATES */}
      <section className="section-subtle">
        <div className="container">
          <div className="section-header">
            <div className="section-header-text">
              <h2 className="text-h2">Tin tức mới nhất</h2>
              <p>Cập nhật thị trường và kinh nghiệm bất động sản Trà Vinh</p>
            </div>
            <a href="#/" className="section-header-link">
              Xem tất cả <Icon name="ArrowRight" size={15} />
            </a>
          </div>
          <div className="news-empty">
            <Icon name="FileText" size={28} className="icon-muted" />
            <p className="news-empty-title">Chưa có tin tức mới</p>
            <p className="news-empty-desc">Các bài viết về thị trường và kinh nghiệm bất động sản Trà Vinh sẽ được cập nhật tại đây.</p>
          </div>
        </div>
      </section>

      {/* 9. DARK CTA */}
      <section className="section-dark">
        <div className="container">
          <div className="section-center">
            <h2 className="text-h2 cta-dark-title">
              Bắt đầu tìm bất động sản ngay hôm nay
            </h2>
            <p className="cta-dark-subtitle">
              Tìm kiếm bất động sản phù hợp và kết nối với đội ngũ môi giới uy tín tại Trà Vinh.
            </p>
            <div className="cta-dark-buttons">
              <Button as="a" href="#/search" variant="primary" size="lg">
                Khám phá ngay
              </Button>
              <Button as="a" href="#/brokers" variant="outline-white" size="lg">
                Liên hệ môi giới
              </Button>
            </div>
          </div>
        </div>
      </section>
    </MainLayout>
  );
}
