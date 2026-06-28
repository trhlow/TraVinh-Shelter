import { useEffect, useMemo, useState } from 'react';
import PropertyCard from '../components/PropertyCard.jsx';
import MainLayout from '../layouts/MainLayout.jsx';
import { searchProperties } from '../data/templateData.js';
import { fetchCategories, fetchProperties } from '../services/api.js';

const DEFAULT_CATEGORIES = [
  { name: 'Trọ', slug: 'tro' },
  { name: 'Nhà', slug: 'nha' },
  { name: 'Đất', slug: 'dat' },
];

const WARDS = [
  { label: 'Tất cả Trà Vinh', value: 'all' },
  { label: 'Phường 6', value: 'phuong-6' },
  { label: 'Phường 7', value: 'phuong-7' },
  { label: 'Cầu Ngang', value: 'cau-ngang' },
  { label: 'Châu Thành', value: 'chau-thanh' },
  { label: 'Long Đức', value: 'long-duc' },
];

const PRICE_GROUPS = {
  tro: [
    ['Mọi mức giá', '', ''],
    ['Dưới 1,5 triệu/tháng', '0', '1500000'],
    ['1,5 - 3 triệu/tháng', '1500000', '3000000'],
    ['Trên 3 triệu/tháng', '3000000', ''],
  ],
  rent: [
    ['Mọi mức giá', '', ''],
    ['Dưới 5 triệu/tháng', '0', '5000000'],
    ['5 - 10 triệu/tháng', '5000000', '10000000'],
    ['Trên 10 triệu/tháng', '10000000', ''],
  ],
  sale: [
    ['Mọi mức giá', '', ''],
    ['Dưới 1 tỷ', '0', '1000000000'],
    ['1 - 3 tỷ', '1000000000', '3000000000'],
    ['3 - 5 tỷ', '3000000000', '5000000000'],
    ['Trên 5 tỷ', '5000000000', ''],
  ],
};

function filtersFromQuery(queryParams = {}) {
  const category = ['tro', 'nha', 'dat'].includes(queryParams.category) ? queryParams.category : 'all';
  const transaction = category === 'tro'
    ? 'rent'
    : ['rent', 'sale'].includes(queryParams.transaction) ? queryParams.transaction : 'all';
  return {
    query: queryParams.query || queryParams.q || '',
    category,
    transaction,
    ward: queryParams.ward || 'all',
    houseType: queryParams.houseType || 'all',
    minPrice: '',
    maxPrice: '',
    minArea: '',
    maxArea: '',
  };
}

export default function SearchPage({ queryParams, session, onLogout }) {
  const queryKey = JSON.stringify(queryParams || {});
  const [filters, setFilters] = useState(() => filtersFromQuery(queryParams));
  const [appliedFilters, setAppliedFilters] = useState(() => filtersFromQuery(queryParams));
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [properties, setProperties] = useState(searchProperties);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sort, setSort] = useState('newest');

  useEffect(() => {
    const nextFilters = filtersFromQuery(queryParams);
    setFilters(nextFilters);
    setAppliedFilters(nextFilters);
  }, [queryKey]);

  useEffect(() => {
    let alive = true;
    fetchCategories()
      .then((items) => {
        if (alive && items.length > 0) setCategories(items);
      })
      .catch(() => {
        if (alive) setCategories(DEFAULT_CATEGORIES);
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError('');
    fetchProperties(appliedFilters)
      .then((items) => {
        if (alive) setProperties(items);
      })
      .catch((exception) => {
        if (!alive) return;
        setError(exception.message || 'Không tải được danh sách tin.');
        setProperties(searchProperties);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [appliedFilters]);

  const sortedProperties = useMemo(() => {
    const items = [...properties];
    if (sort === 'price-asc') return items.sort((a, b) => (a.rawPrice || 0) - (b.rawPrice || 0));
    if (sort === 'price-desc') return items.sort((a, b) => (b.rawPrice || 0) - (a.rawPrice || 0));
    return items;
  }, [properties, sort]);

  const subtitle = subtitleFor(appliedFilters);
  const priceOptions = priceOptionsFor(filters);

  function updateFilter(name, value) {
    setFilters((current) => {
      if (name === 'category') {
        return {
          ...current,
          query: current.query,
          category: value,
          transaction: value === 'tro' ? 'rent' : value === 'all' ? 'all' : 'sale',
          houseType: 'all',
          minPrice: '',
          maxPrice: '',
          minArea: '',
          maxArea: '',
        };
      }
      return { ...current, [name]: value };
    });
  }

  function updatePrice(value) {
    const [minPrice = '', maxPrice = ''] = value.split('-');
    setFilters((current) => ({ ...current, minPrice, maxPrice }));
  }

  return (
    <MainLayout session={session} onLogout={onLogout}>
      {/* Page header */}
      <div style={{ background: 'var(--color-brand)', padding: '40px 0', color: '#fff' }}>
        <div className="container">
          <h1 style={{ fontSize: 32, fontWeight: 700, margin: 0 }}>Nhà đất bán tại Trà Vinh</h1>
          {subtitle && (
            <p style={{ marginTop: 8, opacity: 0.8, fontSize: 16 }}>{subtitle}</p>
          )}
        </div>
      </div>

      <div className="container" style={{ padding: '32px 24px' }}>
        <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          {/* Filter sidebar */}
          <aside style={{ minWidth: 220, flex: '0 0 220px' }}>
            <div className="card" style={{ padding: 20 }}>
              <h2 className="text-h3" style={{ marginBottom: 16 }}>Bộ lọc tìm kiếm</h2>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 14 }}>Từ khóa</label>
                <input
                  className="input"
                  placeholder="Ví dụ: Trà Vinh, Phường 6..."
                  value={filters.query}
                  onChange={(event) => updateFilter('query', event.target.value)}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 14 }}>Danh mục</label>
                <select
                  className="input"
                  value={filters.category}
                  onChange={(event) => updateFilter('category', event.target.value)}
                >
                  <option value="all">Tất cả</option>
                  {categories.map((category) => (
                    <option key={category.slug} value={category.slug}>{category.name}</option>
                  ))}
                </select>
              </div>

              {['nha', 'dat'].includes(filters.category) && (
                <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', marginBottom: 16 }}>
                  <button
                    style={{
                      flex: 1,
                      padding: '8px 0',
                      border: 'none',
                      background: 'transparent',
                      fontWeight: filters.transaction === 'sale' ? 700 : 400,
                      borderBottom: filters.transaction === 'sale' ? '2px solid var(--color-brand)' : '2px solid transparent',
                      color: filters.transaction === 'sale' ? 'var(--color-brand)' : 'var(--color-text-secondary)',
                      cursor: 'pointer',
                    }}
                    onClick={() => updateFilter('transaction', 'sale')}
                  >
                    Mua
                  </button>
                  <button
                    style={{
                      flex: 1,
                      padding: '8px 0',
                      border: 'none',
                      background: 'transparent',
                      fontWeight: filters.transaction === 'rent' ? 700 : 400,
                      borderBottom: filters.transaction === 'rent' ? '2px solid var(--color-brand)' : '2px solid transparent',
                      color: filters.transaction === 'rent' ? 'var(--color-brand)' : 'var(--color-text-secondary)',
                      cursor: 'pointer',
                    }}
                    onClick={() => updateFilter('transaction', 'rent')}
                  >
                    Thuê
                  </button>
                </div>
              )}

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 14 }}>Khu vực</label>
                <select
                  className="input"
                  value={filters.ward}
                  onChange={(event) => updateFilter('ward', event.target.value)}
                >
                  {WARDS.map((ward) => (
                    <option key={ward.value} value={ward.value}>{ward.label}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 14 }}>
                  {filters.category === 'tro' ? 'Giá trọ' : filters.transaction === 'rent' ? 'Giá thuê' : 'Giá bán'}
                </label>
                <select
                  className="input"
                  value={`${filters.minPrice}-${filters.maxPrice}`}
                  onChange={(event) => updatePrice(event.target.value)}
                >
                  {priceOptions.map(([label, minPrice, maxPrice]) => (
                    <option key={`${minPrice}-${maxPrice}`} value={`${minPrice}-${maxPrice}`}>{label}</option>
                  ))}
                </select>
              </div>

              {filters.category === 'nha' && filters.transaction === 'rent' && (
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 14 }}>Loại nhà</label>
                  <select
                    className="input"
                    value={filters.houseType}
                    onChange={(event) => updateFilter('houseType', event.target.value)}
                  >
                    <option value="all">Tất cả</option>
                    <option value="tret">Trệt</option>
                    <option value="lau">Lầu</option>
                  </select>
                </div>
              )}

              {filters.category !== 'tro' && (
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 14 }}>Diện tích (m²)</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      className="input"
                      style={{ width: '50%' }}
                      placeholder="Từ"
                      type="number"
                      value={filters.minArea}
                      onChange={(event) => updateFilter('minArea', event.target.value)}
                    />
                    <input
                      className="input"
                      style={{ width: '50%' }}
                      placeholder="Đến"
                      type="number"
                      value={filters.maxArea}
                      onChange={(event) => updateFilter('maxArea', event.target.value)}
                    />
                  </div>
                </div>
              )}

              <button
                className="btn btn-primary"
                style={{ width: '100%' }}
                onClick={() => setAppliedFilters(filters)}
              >
                Tìm kiếm ngay
              </button>
            </div>
          </aside>

          {/* Results area */}
          <section style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingBottom: 12, borderBottom: '1px solid var(--color-border)' }}>
              <span style={{ color: 'var(--color-text-secondary)', fontSize: 14 }}>
                {loading ? 'Đang tìm...' : `${sortedProperties.length} kết quả`}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>Sắp xếp:</span>
                <select
                  style={{ background: 'transparent', border: 'none', fontWeight: 600, color: 'var(--color-brand)', cursor: 'pointer' }}
                  value={sort}
                  onChange={(event) => setSort(event.target.value)}
                >
                  <option value="newest">Mới nhất</option>
                  <option value="price-asc">Giá thấp đến cao</option>
                  <option value="price-desc">Giá cao đến thấp</option>
                </select>
              </div>
            </div>

            {error && (
              <div style={{ marginBottom: 16, padding: 12, borderRadius: 8, background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', fontSize: 14 }}>
                {error}
              </div>
            )}

            <div data-testid="property-grid" className="grid-3">
              {loading && [1, 2, 3, 4, 5, 6].map((item) => (
                <div key={item} style={{ height: 280, borderRadius: 12, background: 'var(--color-bg-muted)', animation: 'pulse 1.5s ease-in-out infinite' }} />
              ))}
              {!loading && sortedProperties.length === 0 && (
                <div className="card" style={{ padding: 40, textAlign: 'center', gridColumn: '1 / -1' }}>
                  <h2 className="text-h3" style={{ marginBottom: 8 }}>Chưa có tin phù hợp</h2>
                  <p style={{ color: 'var(--color-text-secondary)' }}>Hãy thử nới bộ lọc hoặc chọn khu vực khác.</p>
                </div>
              )}
              {!loading && sortedProperties.map((property) => (
                <PropertyCard key={property.id || property.title} property={property} compact />
              ))}
            </div>
          </section>
        </div>
      </div>
    </MainLayout>
  );
}

function priceOptionsFor(filters) {
  if (filters.category === 'tro') return PRICE_GROUPS.tro;
  return filters.transaction === 'rent' ? PRICE_GROUPS.rent : PRICE_GROUPS.sale;
}

function subtitleFor(filters) {
  if (filters.query?.trim()) return `Kết quả cho "${filters.query.trim()}"`;
  if (filters.category === 'tro') return 'Phòng trọ tại Trà Vinh';
  if (filters.category === 'nha' && filters.transaction === 'rent') return 'Nhà cho thuê tại Trà Vinh';
  if (filters.category === 'nha') return 'Nhà đất bán tại Trà Vinh';
  if (filters.category === 'dat' && filters.transaction === 'rent') return 'Đất cho thuê tại Trà Vinh';
  if (filters.category === 'dat') return 'Đất bán tại Trà Vinh';
  return '';
}
