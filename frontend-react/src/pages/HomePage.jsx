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

// Category showcase rows — each fetched separately and rendered as its own row.
const SHOWCASE_ROWS = [
  { slug: 'tro', title: 'Phòng trọ cho thuê', subtitle: 'Phòng trọ mới, đã xác thực tại Trà Vinh' },
  { slug: 'nha', title: 'Nhà bán & cho thuê', subtitle: 'Nhà phố, nhà riêng tại Trà Vinh' },
  { slug: 'dat', title: 'Đất nền', subtitle: 'Đất thổ cư, đất nền pháp lý rõ ràng' },
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

      <div className="search-pill-orb-wrap">
        <button type="submit" className="search-pill-orb" aria-label="Tìm kiếm">
          <Icon name="Search" size={20} />
        </button>
      </div>
    </form>
  );
}

export default function HomePage({ session, onLogout }) {
  const [properties, setProperties] = useState(featuredProperties);
  const [troProperties, setTroProperties] = useState([]);
  const [nhaProperties, setNhaProperties] = useState([]);
  const [datProperties, setDatProperties] = useState([]);

  useEffect(() => {
    let alive = true;
    fetchProperties({ category: 'all', transaction: 'all' })
      .then(items => { if (alive && items.length > 0) setProperties(items.slice(0, 3)); })
      .catch(() => { if (alive) setProperties(featuredProperties); });
    return () => { alive = false; };
  }, []);

  // Fetch each category separately. A single `category:'all'` fetch is paged
  // (backend default size=20) and can starve a category, hiding its row even
  // when listings of that type exist on later pages.
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
    <MainLayout session={session} onLogout={onLogout}>
      {/* 1. HERO */}
      <section className="hero">
        <div className="container">
          <div className="hero-content">
            <h1 className="text-display-xl hero-headline">
              Tìm bất động sản tại Trà Vinh
            </h1>
            <div className="hero-ctas">
              <Button as="a" href="#/search" variant="primary" size="lg">
                <Icon name="Search" size={18} /> Tìm kiếm ngay
              </Button>
              <Button as="a" href="#/brokers" variant="secondary" size="lg">
                Xem môi giới
              </Button>
            </div>
            <HeroSearchBar />
          </div>
        </div>
      </section>

      {/* 2. FEATURED PROPERTIES — newest across all categories, leads the page */}
      <section className="section-subtle">
        <div className="container">
          <div className="section-header">
            <div className="section-header-text">
              <h2 className="text-display-md">Tin nổi bật</h2>
              <p>Khám phá các bất động sản tốt nhất tại Trà Vinh</p>
            </div>
            <a href="#/search" className="section-header-link">
              Xem tất cả <Icon name="ArrowRight" size={15} />
            </a>
          </div>
          <FeaturedCarousel properties={properties} />
        </div>
      </section>

      {/* 3. CATEGORY SHOWCASE ROWS — Trọ / Nhà / Đất */}
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
    </MainLayout>
  );
}
