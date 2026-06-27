import { useEffect, useState } from 'react';
import PropertyCard from '../components/PropertyCard.jsx';
import MainLayout from '../layouts/MainLayout.jsx';
import { searchProperties } from '../data/templateData.js';
import { fetchCategories, fetchProperties } from '../services/api.js';

export default function SearchPage() {
  const [filters, setFilters] = useState({ category: 'all', minPrice: '', maxPrice: '', minArea: '', maxArea: '' });
  const [appliedFilters, setAppliedFilters] = useState(filters);
  const [categories, setCategories] = useState([]);
  const [properties, setProperties] = useState(searchProperties);

  useEffect(() => {
    let alive = true;
    fetchCategories()
      .then((items) => {
        if (alive) setCategories(items);
      })
      .catch(() => {
        if (alive) setCategories([]);
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    fetchProperties(appliedFilters)
      .then((items) => {
        if (alive) setProperties(items.length > 0 ? items : searchProperties);
      })
      .catch(() => {
        if (alive) setProperties(searchProperties);
      });
    return () => {
      alive = false;
    };
  }, [appliedFilters]);

  function updateFilter(name, value) {
    setFilters((current) => ({ ...current, [name]: value }));
  }

  return (
    <MainLayout>
      <main className="flex-grow w-full max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-stack-lg flex flex-col md:flex-row gap-gutter">
        <aside className="w-full md:w-1/4 flex-shrink-0 bg-surface-container-lowest shadow-sm p-4 rounded-lg h-fit border border-outline-variant">
          <h2 className="font-headline-md text-headline-md mb-stack-md text-trust-navy border-b border-outline-variant pb-2">Lọc Bất Động Sản</h2>
          <div className="mb-stack-md">
            <label className="font-label-bold text-label-bold block mb-2">Khu vực</label>
            <select className="w-full bg-surface-container-low border border-outline-variant rounded p-2 font-body-sm text-body-sm focus:border-trust-navy focus:ring-1 focus:ring-trust-navy">
              <option>Tất cả Trà Vinh</option>
              <option>Thành phố Trà Vinh</option>
              <option>Huyện Châu Thành</option>
              <option>Huyện Cầu Ngang</option>
            </select>
          </div>
          <div className="mb-stack-md">
            <label className="font-label-bold text-label-bold block mb-2">Loại hình</label>
            <select
              className="w-full bg-surface-container-low border border-outline-variant rounded p-2 font-body-sm text-body-sm focus:border-trust-navy focus:ring-1 focus:ring-trust-navy"
              value={filters.category}
              onChange={(event) => updateFilter('category', event.target.value)}
            >
              <option value="all">Tất cả</option>
              {(categories.length > 0 ? categories : [
                { name: 'Trọ', slug: 'tro' },
                { name: 'Nhà', slug: 'nha' },
                { name: 'Đất', slug: 'dat' },
              ]).map((category) => (
                <option key={category.slug} value={category.slug}>{category.name}</option>
              ))}
            </select>
          </div>
          <div className="mb-stack-md">
            <label className="font-label-bold text-label-bold block mb-2">Mức giá</label>
            <select
              className="w-full bg-surface-container-low border border-outline-variant rounded p-2 font-body-sm text-body-sm focus:border-trust-navy focus:ring-1 focus:ring-trust-navy"
              value={`${filters.minPrice}-${filters.maxPrice}`}
              onChange={(event) => {
                const [minPrice, maxPrice] = event.target.value.split('-');
                setFilters((current) => ({ ...current, minPrice, maxPrice }));
              }}
            >
              <option value="-">Mọi mức giá</option>
              <option value="0-1000000000">Dưới 1 tỷ</option>
              <option value="1000000000-3000000000">1 - 3 tỷ</option>
              <option value="3000000000-5000000000">3 - 5 tỷ</option>
              <option value="5000000000-">Trên 5 tỷ</option>
            </select>
          </div>
          <div className="mb-stack-md">
            <label className="font-label-bold text-label-bold block mb-2">Diện tích</label>
            <div className="flex gap-2">
              <input className="w-1/2 bg-surface-container-low border border-outline-variant rounded p-2 font-body-sm text-body-sm focus:border-trust-navy focus:ring-1 focus:ring-trust-navy" placeholder="Từ" type="number" value={filters.minArea} onChange={(event) => updateFilter('minArea', event.target.value)} />
              <input className="w-1/2 bg-surface-container-low border border-outline-variant rounded p-2 font-body-sm text-body-sm focus:border-trust-navy focus:ring-1 focus:ring-trust-navy" placeholder="Đến (m2)" type="number" value={filters.maxArea} onChange={(event) => updateFilter('maxArea', event.target.value)} />
            </div>
          </div>
          <button className="w-full bg-trust-navy text-on-primary font-label-bold text-label-bold py-2 rounded hover:bg-primary-container transition-colors" onClick={() => setAppliedFilters(filters)}>
            Áp dụng
          </button>
        </aside>

        <section className="w-full md:w-3/4 flex flex-col">
          <div className="flex justify-between items-center mb-stack-md pb-2 border-b border-outline-variant">
            <h1 className="font-headline-lg text-headline-lg text-trust-navy">Nhà đất bán tại Trà Vinh</h1>
            <div className="flex items-center gap-2">
              <span className="font-body-sm text-body-sm text-on-surface-variant">Sắp xếp:</span>
              <select className="bg-transparent border-none font-label-bold text-label-bold text-trust-navy cursor-pointer focus:ring-0">
                <option>Mới nhất</option>
                <option>Giá thấp đến cao</option>
                <option>Giá cao đến thấp</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-gutter" data-testid="property-grid">
            {properties.map((property) => (
              <PropertyCard key={property.title} property={property} compact />
            ))}
          </div>
        </section>
      </main>
    </MainLayout>
  );
}
