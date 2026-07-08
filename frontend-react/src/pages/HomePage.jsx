import { useEffect, useState } from 'react';
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

const AREA_RANGES = [
  { label: 'Mọi diện tích' },
  { label: 'Dưới 60 m²' },
  { label: '60 - 100 m²' },
  { label: '100 - 200 m²' },
  { label: 'Trên 200 m²' },
];

// Category showcase rows — each fetched separately and rendered as its own row.
const SHOWCASE_ROWS = [
  { slug: 'tro', title: 'Phòng trọ cho thuê', subtitle: 'Phòng trọ mới, đã xác thực tại Trà Vinh' },
  { slug: 'nha', title: 'Nhà bán & cho thuê', subtitle: 'Nhà phố, nhà riêng tại Trà Vinh' },
  { slug: 'dat', title: 'Đất nền', subtitle: 'Đất thổ cư, đất nền pháp lý rõ ràng' },
];

const HERO_BG_IMAGE = 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1600&q=80';

const TRUST_CHIPS = ['Pháp lý đã kiểm tra', 'Môi giới xác minh', 'Hình ảnh thực tế', 'Không phí ẩn'];

const CATEGORY_CARDS = [
  { icon: 'Home', label: 'Nhà phố', slug: 'nha', count: '320 tin đăng' },
  { icon: 'Layers', label: 'Đất nền', slug: 'dat', count: '210 tin đăng' },
  { icon: 'Building', label: 'Căn hộ', slug: 'nha', count: '85 tin đăng' },
  { icon: 'Castle', label: 'Biệt thự', slug: 'nha', count: '42 tin đăng' },
  { icon: 'Key', label: 'Cho thuê', slug: 'tro', count: '160 tin đăng' },
];

const WHY_US = [
  { icon: 'ShieldCheck', title: 'Pháp lý minh bạch', desc: 'Mọi bất động sản đều được kiểm tra sổ đỏ, quy hoạch và pháp lý trước khi đăng tin.' },
  { icon: 'Headphones', title: 'Tư vấn tận tâm', desc: 'Đội ngũ môi giới am hiểu Trà Vinh, đồng hành từ lúc xem nhà đến khi công chứng.' },
  { icon: 'Tag', title: 'Giá tốt, rõ ràng', desc: 'Giá niêm yết minh bạch, không phí ẩn, thương lượng trực tiếp với chủ nhà.' },
];

const STATS = [
  { value: '1.200', suffix: '+', label: 'Giao dịch thành công' },
  { value: '3.500', suffix: '+', label: 'Khách hàng hài lòng' },
  { value: '12', suffix: '', label: 'Năm kinh nghiệm' },
  { value: '98', suffix: '%', label: 'Khách quay lại & giới thiệu' },
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
    <form className="search-pill" onSubmit={handleSearch}>
      <div className="search-pill-segment">
        <span className="search-pill-label">Loại hình</span>
        <select
          className="search-pill-select"
          value={category}
          onChange={e => setCategory(e.target.value)}
        >
          <option value="all">Tất cả</option>
          {CATEGORIES.map(item => (
            <option key={item.slug} value={item.slug}>{item.label}</option>
          ))}
        </select>
      </div>

      <div className="search-pill-segment">
        <span className="search-pill-label">Khu vực</span>
        <select
          className="search-pill-select"
          value={ward}
          onChange={e => setWard(e.target.value)}
        >
          {WARDS.map(item => (
            <option key={item.code} value={item.code}>{item.label}</option>
          ))}
        </select>
      </div>

      <div className="search-pill-segment">
        <span className="search-pill-label">Khoảng giá</span>
        <select
          className="search-pill-select"
          value={priceIndex}
          onChange={e => setPriceIndex(e.target.value)}
        >
          {HERO_PRICE_RANGES.map((range, index) => (
            <option key={range.label} value={String(index)}>{range.label}</option>
          ))}
        </select>
      </div>

      <div className="search-pill-segment">
        <span className="search-pill-label">Diện tích</span>
        <select className="search-pill-select" defaultValue="0">
          {AREA_RANGES.map((r, i) => (
            <option key={r.label} value={String(i)}>{r.label}</option>
          ))}
        </select>
      </div>

      <div className="search-pill-orb-wrap">
        <button type="submit" className="search-pill-orb" aria-label="Tìm kiếm">
          <Icon name="Search" size={19} />
          <span className="search-pill-orb-text">Tìm kiếm</span>
        </button>
      </div>
    </form>
  );
}

function SectionEyebrow({ text }) {
  return (
    <div className="section-eyebrow">
      <span className="section-eyebrow-line" />
      {text}
      <span className="section-eyebrow-line" />
    </div>
  );
}

export default function HomePage({ session, onLogout, theme, onToggleTheme }) {
  const [properties, setProperties] = useState(featuredProperties);
  const [troProperties, setTroProperties] = useState([]);
  const [nhaProperties, setNhaProperties] = useState([]);
  const [datProperties, setDatProperties] = useState([]);

  useEffect(() => {
    let alive = true;
    fetchProperties({ category: 'all', transaction: 'all' })
      .then(items => { if (alive && items.length > 0) setProperties(items.slice(0, 6)); })
      .catch(() => { if (alive) setProperties(featuredProperties); });
    return () => { alive = false; };
  }, []);

  // Fetch each category separately.
  useEffect(() => {
    let alive = true;
    const setters = { tro: setTroProperties, nha: setNhaProperties, dat: setDatProperties };
    Object.entries(setters).forEach(([slug, setItems]) => {
      fetchProperties({ category: slug, transaction: 'all' })
        .then(items => { if (alive) setItems(items.slice(0, 8)); })
        .catch(() => { if (alive) setItems([]); });
    });
    return () => { alive = false; };
  }, []);

  const rowItems = { tro: troProperties, nha: nhaProperties, dat: datProperties };

  return (
    <MainLayout session={session} onLogout={onLogout} theme={theme} onToggleTheme={onToggleTheme}>
      {/* 1. HERO */}
      <section className="hero">
        <div className="container">
          <div className="hero-inner">
            <div className="hero-bg" aria-hidden="true">
              <img className="hero-bg-img" src={HERO_BG_IMAGE} alt="" loading="eager" />
              <div className="hero-bg-scrim" />
            </div>

            <div className="hero-content">
              <div className="hero-badge">
                <span className="hero-badge-dot" />
                Bất động sản Trà Vinh · Vĩnh Long · Bến Tre
              </div>
              <h1 className="hero-headline">
                Tìm ngôi nhà mơ ước<br />của bạn tại Trà Vinh
              </h1>
              <p className="hero-subtitle">
                Nhà phố, đất nền, căn hộ và biệt thự đã xác minh pháp lý. Kết nối trực tiếp với môi giới địa phương uy tín.
              </p>
            </div>

            <div className="hero-search-wrap">
              <HeroSearchBar />
            </div>
          </div>

          {/* Trust chips under hero */}
          <div className="hero-trust-chips">
            {TRUST_CHIPS.map(chip => (
              <span key={chip} className="hero-trust-chip">
                <Icon name="Check" size={16} />
                {chip}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* 2. CATEGORIES */}
      <section className="section" style={{ paddingTop: '80px' }}>
        <div className="container">
          <div className="section-center">
            <SectionEyebrow text="Danh mục" />
            <h2 className="text-display-md section-center-title">Khám phá theo loại hình</h2>
            <p className="section-center-subtitle">Chọn đúng loại bất động sản phù hợp với nhu cầu của bạn</p>
          </div>
          <div className="category-grid">
            {CATEGORY_CARDS.map(cat => (
              <a key={cat.label} href={`#/search?category=${cat.slug}`} className="category-card">
                <span className="category-card-icon">
                  <Icon name={cat.icon} size={24} />
                </span>
                <span>
                  <span className="category-card-label">{cat.label}</span>
                  <span className="category-card-count">{cat.count}</span>
                </span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* 3. FEATURED PROPERTIES */}
      <section className="section-subtle" style={{ paddingTop: '80px' }}>
        <div className="container">
          <div className="section-header">
            <div className="section-header-text">
              <SectionEyebrow text="Bất động sản nổi bật" />
              <h2 className="text-display-md">Tin đăng chọn lọc tại Trà Vinh</h2>
              <p>Đã kiểm tra pháp lý, hình ảnh thực tế, cập nhật mỗi ngày.</p>
            </div>
            <a href="#/search" className="section-header-link">
              Xem tất cả <Icon name="ArrowRight" size={17} />
            </a>
          </div>
          <FeaturedCarousel properties={properties} />
        </div>
      </section>

      {/* 4. CATEGORY SHOWCASE ROWS — Trọ / Nhà / Đất */}
      {SHOWCASE_ROWS.map(({ slug, title, subtitle }, index) => {
        const items = rowItems[slug];
        if (items.length === 0) return null;
        return (
          <section key={slug} className={index % 2 === 0 ? 'section' : 'section-subtle'}>
            <div className="container">
              <div className="section-header">
                <div className="section-header-text">
                  <h2 className="text-display-md">{title}</h2>
                  <p>{subtitle}</p>
                </div>
                <a href={`#/search?category=${slug}`} className="section-header-link">
                  Xem tất cả <Icon name="ArrowRight" size={15} />
                </a>
              </div>
              <div className="tro-showcase-row">
                {items.map(property => (
                  <TroShowcaseCard key={property.id || property.title} property={property} />
                ))}
              </div>
            </div>
          </section>
        );
      })}

      {/* 5. WHY CHOOSE US */}
      <section className="section-subtle" style={{ paddingTop: '80px', paddingBottom: '80px', background: 'var(--color-surface-soft)' }}>
        <div className="container">
          <div className="section-center">
            <SectionEyebrow text="Vì sao chọn chúng tôi" />
            <h2 className="text-display-md section-center-title">Uy tín · Tận tâm · Hiệu quả</h2>
            <p className="section-center-subtitle">Đồng hành cùng bạn từ lúc tìm kiếm đến khi cầm sổ trên tay</p>
          </div>
          <div className="why-us-grid">
            {WHY_US.map(item => (
              <div key={item.title} className="why-us-card">
                <span className="why-us-icon">
                  <Icon name={item.icon} size={24} />
                </span>
                <h3 className="why-us-title">{item.title}</h3>
                <p className="why-us-desc">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. STATS */}
      <section className="section" style={{ paddingTop: '80px', paddingBottom: '80px' }}>
        <div className="container">
          <div className="stats-grid">
            {STATS.map(s => (
              <div key={s.label} className="stats-item">
                <div className="stats-value">
                  {s.value}<span className="stats-suffix">{s.suffix}</span>
                </div>
                <div className="stats-label">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </MainLayout>
  );
}
