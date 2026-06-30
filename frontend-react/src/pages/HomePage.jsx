import { useEffect, useState } from 'react';
import { Wifi, Wind, Layers, ShowerHead, Car } from 'lucide-react';
import FeaturedCarousel from '../components/FeaturedCarousel.jsx';
import TroShowcaseCard from '../components/TroShowcaseCard.jsx';
import Icon from '../components/ui/Icon.jsx';
import Button from '../components/ui/Button.jsx';
import MainLayout from '../layouts/MainLayout.jsx';
import { featuredProperties } from '../data/templateData.js';
import { WARDS, CATEGORIES } from '../data/locations.js';
import { fetchProperties } from '../services/api.js';

// Price brackets (VND) emitted as minPrice/maxPrice query params.
const HERO_PRICE_RANGES = [
  { label: 'Mọi mức giá', min: '', max: '' },
  { label: 'Dưới 1 triệu', min: '', max: '1000000' },
  { label: '1 - 3 triệu', min: '1000000', max: '3000000' },
  { label: '3 - 5 triệu', min: '3000000', max: '5000000' },
  { label: 'Dưới 1 tỷ', min: '', max: '1000000000' },
  { label: '1 - 3 tỷ', min: '1000000000', max: '3000000000' },
  { label: 'Trên 3 tỷ', min: '3000000000', max: '' },
];

const STATS = [
  { number: '500+', label: 'Bất động sản' },
  { number: '50+', label: 'Môi giới chuyên nghiệp' },
  { number: '1,200+', label: 'Giao dịch thành công' },
  { number: '5+', label: 'Năm kinh nghiệm' },
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
  const [ward, setWard] = useState('all');
  const [category, setCategory] = useState('all');
  const [priceIndex, setPriceIndex] = useState('0');

  function handleSearch(e) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (category !== 'all') params.set('category', category);
    if (ward !== 'all') params.set('ward', ward);
    const range = HERO_PRICE_RANGES[Number(priceIndex)] || HERO_PRICE_RANGES[0];
    if (range.min) params.set('minPrice', range.min);
    if (range.max) params.set('maxPrice', range.max);
    const qs = params.toString();
    window.location.hash = qs ? `#/search?${qs}` : '#/search';
  }

  return (
    <form className="hero-search-panel" onSubmit={handleSearch}>
      <div className="hero-search-row">
        <label className="hero-search-group">
          <span className="hero-search-group-label">
            <Icon name="MapPin" size={14} /> Khu vực
          </span>
          <select
            className="hero-search-select"
            value={ward}
            onChange={e => setWard(e.target.value)}
          >
            {WARDS.map(item => (
              <option key={item.code} value={item.code}>{item.label}</option>
            ))}
          </select>
        </label>

        <label className="hero-search-group">
          <span className="hero-search-group-label">
            <Icon name="LayoutGrid" size={14} /> Loại
          </span>
          <select
            className="hero-search-select"
            value={category}
            onChange={e => setCategory(e.target.value)}
          >
            <option value="all">Tất cả loại hình</option>
            {CATEGORIES.map(item => (
              <option key={item.slug} value={item.slug}>{item.label}</option>
            ))}
          </select>
        </label>

        <label className="hero-search-group">
          <span className="hero-search-group-label">
            <Icon name="Wallet" size={14} /> Khoảng giá
          </span>
          <select
            className="hero-search-select"
            value={priceIndex}
            onChange={e => setPriceIndex(e.target.value)}
          >
            {HERO_PRICE_RANGES.map((range, index) => (
              <option key={range.label} value={String(index)}>{range.label}</option>
            ))}
          </select>
        </label>

        <button type="submit" className="hero-search-submit">
          <Icon name="Search" size={18} /> Tìm kiếm
        </button>
      </div>
    </form>
  );
}

export default function HomePage({ session, onLogout }) {
  const [properties, setProperties] = useState(featuredProperties);
  const [troProperties, setTroProperties] = useState([]);

  useEffect(() => {
    let alive = true;
    fetchProperties({ category: 'all', transaction: 'all' })
      .then(items => { if (alive && items.length > 0) setProperties(items.slice(0, 3)); })
      .catch(() => { if (alive) setProperties(featuredProperties); });
    return () => { alive = false; };
  }, []);

  // Fetch tro listings separately — the `properties` state above is sliced to 3 for the
  // carousel and may not contain any 'tro' entries (mock has them past index 3).
  useEffect(() => {
    let alive = true;
    fetchProperties({ category: 'tro', transaction: 'all' })
      .then(items => { if (alive) setTroProperties(items.slice(0, 8)); })
      .catch(() => { if (alive) setTroProperties([]); });
    return () => { alive = false; };
  }, []);

  // Fall back to the featured carousel data only if the tro fetch yields nothing.
  const showcaseProperties = troProperties.length > 0 ? troProperties : properties;

  return (
    <MainLayout session={session} onLogout={onLogout}>
      {/* 1. HERO */}
      <section className="hero">
        <div className="container">
          <div className="hero-content">
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

      {/* 3. TRO SHOWCASE */}
      <section className="section">
        <div className="container">
          <div className="section-header">
            <div className="section-header-text">
              <h2 className="text-h2">Phòng trọ nổi bật</h2>
              <p>Phòng trọ mới, đã xác thực tại Trà Vinh</p>
            </div>
            <a href="#/search?category=tro" className="section-header-link">
              Xem tất cả <Icon name="ArrowRight" size={15} />
            </a>
          </div>
          <div className="tro-showcase-row">
            {showcaseProperties.map(property => (
              <TroShowcaseCard key={property.id || property.title} property={property} />
            ))}
          </div>
          <div className="amenity-highlights">
            {[
              { icon: Wifi, label: 'Wifi miễn phí' },
              { icon: Wind, label: 'Điều hòa' },
              { icon: Layers, label: 'Gác lửng' },
              { icon: ShowerHead, label: 'WC riêng' },
              { icon: Car, label: 'Chỗ để xe' },
            ].map(({ icon: Icon, label }) => (
              <span key={label} className="amenity-pill">
                <Icon size={16} />
                {label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* 4. FEATURED PROPERTIES */}
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

      {/* 5. WARD BROWSE — Phòng trọ theo Khu vực Trà Vinh */}
      <section className="section">
        <div className="container">
          <div className="section-header">
            <div className="section-header-text">
              <h2 className="text-h2">Phòng trọ theo Khu vực Trà Vinh</h2>
              <p>Tìm phòng trọ theo từng phường tại Trà Vinh</p>
            </div>
            <a href="#/search?category=tro" className="section-header-link">
              Xem tất cả phòng trọ <Icon name="ArrowRight" size={15} />
            </a>
          </div>
          <div className="ward-browse-grid">
            {WARDS.filter(item => item.code !== 'all').map(item => (
              <a
                key={item.code}
                href={`#/search?category=tro&ward=${item.code}`}
                className="ward-browse-card"
              >
                <span className="ward-browse-icon">
                  <Icon name="MapPin" size={18} />
                </span>
                <span className="ward-browse-name">{item.label}</span>
                <span className="ward-browse-cta">Xem phòng trọ</span>
              </a>
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
