import { useEffect, useMemo, useState } from 'react';
import PropertyCard from '../components/PropertyCard.jsx';
import MainLayout from '../layouts/MainLayout.jsx';
import { searchProperties } from '../data/templateData.js';
import { WARDS } from '../data/locations.js';
import { fetchCategories, fetchProperties } from '../services/api.js';

const DEFAULT_CATEGORIES = [
  { name: 'Trọ', slug: 'tro' },
  { name: 'Nhà', slug: 'nha' },
  { name: 'Đất', slug: 'dat' },
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
    minPrice: queryParams.minPrice || '',
    maxPrice: queryParams.maxPrice || '',
    minArea: '',
    maxArea: '',
  };
}

export default function SearchPage({ queryParams, session, onLogout, theme, onToggleTheme }) {
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
    <MainLayout session={session} onLogout={onLogout} theme={theme} onToggleTheme={onToggleTheme}>
      {/* Page header */}
      <div className="page-header">
        <div className="container">
          <h1 className="page-header-title">Nhà đất bán tại Trà Vinh</h1>
          {subtitle && (
            <p className="page-header-subtitle">{subtitle}</p>
          )}
        </div>
      </div>

      <div className="container">
        <div className="search-layout">
          {/* Filter sidebar */}
          <aside className="filter-sidebar">
            <h2 className="text-display-sm filter-sidebar-heading">Bộ lọc tìm kiếm</h2>

            <div className="filter-group">
              <label className="filter-label">Từ khóa</label>
              <input
                className="input"
                placeholder="Ví dụ: Trà Vinh, Phường 6..."
                value={filters.query}
                onChange={(event) => updateFilter('query', event.target.value)}
              />
            </div>

            <div className="filter-group">
              <label className="filter-label">Danh mục</label>
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
              <div className="tab-bar">
                <button
                  className={`tab-btn${filters.transaction === 'sale' ? ' is-active' : ''}`}
                  onClick={() => updateFilter('transaction', 'sale')}
                >
                  Mua
                </button>
                <button
                  className={`tab-btn${filters.transaction === 'rent' ? ' is-active' : ''}`}
                  onClick={() => updateFilter('transaction', 'rent')}
                >
                  Thuê
                </button>
              </div>
            )}

            <div className="filter-group">
              <label className="filter-label">Khu vực</label>
              <select
                className="input"
                value={filters.ward}
                onChange={(event) => updateFilter('ward', event.target.value)}
              >
                {WARDS.map((ward) => (
                  <option key={ward.code} value={ward.code}>{ward.label}</option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label className="filter-label">
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
              <div className="filter-group">
                <label className="filter-label">Loại nhà</label>
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
              <div className="filter-group">
                <label className="filter-label">Diện tích (m²)</label>
                <div className="filter-bar-inner">
                  <input
                    className="input"
                    placeholder="Từ"
                    type="number"
                    value={filters.minArea}
                    onChange={(event) => updateFilter('minArea', event.target.value)}
                  />
                  <input
                    className="input"
                    placeholder="Đến"
                    type="number"
                    value={filters.maxArea}
                    onChange={(event) => updateFilter('maxArea', event.target.value)}
                  />
                </div>
              </div>
            )}

            <button
              className="btn btn-primary btn-full"
              onClick={() => setAppliedFilters(filters)}
            >
              Tìm kiếm ngay
            </button>
          </aside>

          {/* Results area */}
          <section>
            <div className="results-toolbar">
              <span className="results-count">
                {loading ? 'Đang tìm...' : `${sortedProperties.length} kết quả`}
              </span>
              <div className="filter-bar-inner">
                <span className="results-count">Sắp xếp:</span>
                <select
                  className="sort-select"
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
              <div className="alert alert-error">
                {error}
              </div>
            )}

            <div data-testid="property-grid" className="grid-3">
              {loading && [1, 2, 3, 4, 5, 6].map((item) => (
                <div key={item} className="skeleton skeleton-card" />
              ))}
              {!loading && sortedProperties.length === 0 && (
                <div className="card empty-state">
                  <h2 className="empty-state-title">Chưa có tin phù hợp</h2>
                  <p className="empty-state-desc">Hãy thử nới bộ lọc hoặc chọn khu vực khác.</p>
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
