import { useEffect, useState } from 'react';
import PropertyCard from '../components/PropertyCard.jsx';
import Icon from '../components/ui/Icon.jsx';
import MainLayout from '../layouts/MainLayout.jsx';
import PageMeta from '../components/PageMeta.jsx';
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

// Descriptions, not fabricated counts: we don't have a live total per
// category and won't invent one (see design.md — never show fake data).
const CATEGORY_ICONS = {
  tro: { icon: 'Key', blurb: 'Phòng trọ gần trường, khu dân cư' },
  nha: { icon: 'Home', blurb: 'Nhà phố, nhà riêng để ở và đầu tư' },
  dat: { icon: 'Layers', blurb: 'Đất thổ cư, đất nền pháp lý rõ' },
};

const WHY_US = [
  { icon: 'ShieldCheck', title: 'Pháp lý minh bạch', desc: 'Mọi bất động sản đều được kiểm tra sổ đỏ, quy hoạch và pháp lý trước khi đăng tin.' },
  { icon: 'Headphones', title: 'Tư vấn tận tâm', desc: 'Đội ngũ môi giới am hiểu Trà Vinh, đồng hành từ lúc xem nhà đến khi công chứng.' },
  { icon: 'Tag', title: 'Giá tốt, rõ ràng', desc: 'Giá niêm yết minh bạch, không phí ẩn, thương lượng trực tiếp với chủ nhà.' },
];

// Skeleton/card grid shared by every listing section on this page.
function ListingGrid({ items, count = 4 }) {
  if (items === null) {
    return (
      <div className="pcard-grid">
        {Array.from({ length: count }, (_, i) => (
          <div key={i} className="pcard-skeleton" aria-hidden="true" />
        ))}
      </div>
    );
  }
  if (items.length === 0) {
    return <p className="pcard-grid-empty">Chưa có tin đăng trong mục này.</p>;
  }
  return (
    <div className="pcard-grid">
      {items.map((property) => (
        <PropertyCard key={property.id || property.title} property={property} />
      ))}
    </div>
  );
}

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
  // null = loading (skeletons). We never seed with template data: a fetch
  // failure shows an honest empty state, not listings that don't exist.
  const [troProperties, setTroProperties] = useState(null);
  const [nhaProperties, setNhaProperties] = useState(null);
  const [datProperties, setDatProperties] = useState(null);

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
      <PageMeta routeKey="home" />
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
                Bất động sản Trà Vinh
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
      <section className="section">
        <div className="container">
          <div className="section-center">
            <SectionEyebrow text="Danh mục" />
            <h2 className="text-display-md section-center-title">Khám phá theo loại hình</h2>
            <p className="section-center-subtitle">Chọn đúng loại bất động sản phù hợp với nhu cầu của bạn</p>
          </div>
          <div className="category-grid">
            {CATEGORIES.map(cat => (
              <a key={cat.slug} href={`#/search?category=${cat.slug}`} className="category-card">
                <span className="category-card-icon">
                  <Icon name={CATEGORY_ICONS[cat.slug].icon} size={24} />
                </span>
                <span>
                  <span className="category-card-label">{cat.label}</span>
                  <span className="category-card-count">{CATEGORY_ICONS[cat.slug].blurb}</span>
                </span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* 3. CATEGORY ROWS — Trọ / Nhà / Đất. One listing appears once, in its
          own category row; no redundant mixed "featured" grid above them. */}
      {SHOWCASE_ROWS.map(({ slug, title, subtitle }, index) => {
        const items = rowItems[slug];
        if (items !== null && items.length === 0) return null;
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
              <ListingGrid items={items === null ? null : items.slice(0, 4)} />
            </div>
          </section>
        );
      })}

      {/* 5. WHY CHOOSE US */}
      <section className="section-subtle">
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
    </MainLayout>
  );
}
