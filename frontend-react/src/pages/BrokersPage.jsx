import { useEffect, useMemo, useState } from 'react';
import MainLayout from '../layouts/MainLayout.jsx';
import MaterialIcon from '../components/MaterialIcon.jsx';
import { fetchProperties } from '../services/api.js';
import { MOCK_PROPERTIES } from '../services/mockData.js';

const WARDS = [
  ['all', 'Tất cả khu vực'],
  ['phuong-7', 'Phường 7'],
  ['long-duc', 'Long Đức'],
  ['cau-ke', 'Cầu Kè'],
  ['chau-thanh', 'Châu Thành'],
  ['cang-long', 'Càng Long'],
];

export default function BrokersPage({ session, onLogout }) {
  const [properties, setProperties] = useState(MOCK_PROPERTIES);
  const [query, setQuery] = useState('');
  const [ward, setWard] = useState('all');
  const [sort, setSort] = useState('top-sales');

  useEffect(() => {
    let alive = true;
    fetchProperties({ category: 'all', transaction: 'all' })
      .then((items) => {
        if (alive && items.length > 0) setProperties(items);
      })
      .catch(() => {
        if (alive) setProperties(MOCK_PROPERTIES);
      });
    return () => {
      alive = false;
    };
  }, []);

  const brokers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return brokerStatsFrom(properties)
      .filter((broker) => ward === 'all' || broker.wards.includes(ward))
      .filter((broker) => !normalizedQuery || broker.name.toLowerCase().includes(normalizedQuery))
      .sort((a, b) => {
        if (sort === 'most-listings') return b.listings.length - a.listings.length;
        if (sort === 'fast-response') return a.responseMinutes - b.responseMinutes;
        return b.closedDeals - a.closedDeals;
      });
  }, [properties, query, sort, ward]);

  return (
    <MainLayout session={session} onLogout={onLogout}>
      <main className="flex-grow">
        <section className="px-margin-mobile md:px-margin-desktop py-stack-lg max-w-container-max mx-auto">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-stack-lg">
            <div>
              <p className="font-label-bold text-label-bold text-action-orange mb-2">Môi giới</p>
              <h1 className="font-headline-xl-mobile md:font-headline-xl text-headline-xl-mobile md:text-headline-xl text-trust-navy">
                Hồ sơ môi giới Công Tín Land
              </h1>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full lg:w-auto">
              <input className="input bg-white" placeholder="Tìm theo tên" value={query} onChange={(event) => setQuery(event.target.value)} />
              <select className="input bg-white" value={ward} onChange={(event) => setWard(event.target.value)}>
                {WARDS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
              <select className="input bg-white" value={sort} onChange={(event) => setSort(event.target.value)}>
                <option value="top-sales">Người bán nhiều nhất</option>
                <option value="most-listings">Đăng tin nhiều nhất</option>
                <option value="fast-response">Phản hồi nhanh nhất</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-gutter">
            {brokers.map((broker, index) => (
              <article key={broker.email} className="bg-white border border-outline-variant rounded-lg p-5 shadow-sm">
                <div className="flex flex-col sm:flex-row gap-5">
                  <div className="shrink-0">
                    {broker.avatarUrl ? (
                      <img className="w-24 h-24 rounded-full object-cover border-2 border-primary" src={broker.avatarUrl} alt={broker.name} />
                    ) : (
                      <div className="w-24 h-24 rounded-full bg-primary text-on-primary flex items-center justify-center font-headline-lg text-headline-lg">
                        {broker.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                      <div>
                        <h2 className="font-headline-md text-headline-md text-trust-navy">{broker.name}</h2>
                        <p className="font-body-sm text-body-sm text-on-surface-variant">{broker.email}</p>
                      </div>
                      <span className="bg-primary-fixed text-trust-navy font-label-bold text-label-bold px-3 py-1 rounded">
                        Top {index + 1}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      <Metric label="Đã bán" value={broker.closedDeals} />
                      <Metric label="Tin đăng" value={broker.listings.length} />
                      <Metric label="Phút phản hồi" value={broker.responseMinutes} />
                    </div>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {broker.specialties.map((item) => (
                        <span key={item} className="bg-surface-container-low text-trust-navy font-body-sm text-body-sm px-3 py-1 rounded">{item}</span>
                      ))}
                    </div>
                    <div className="space-y-2">
                      {broker.listings.slice(0, 3).map((listing) => (
                        <a key={listing.id || listing.title} className="flex items-center gap-3 rounded border border-outline-variant p-2 hover:bg-surface-container-low transition-colors" href={listing.id ? `#/property/${listing.id}` : '#/property'}>
                          <img className="w-14 h-12 rounded object-cover" src={listing.image} alt={listing.title} />
                          <span className="font-body-sm text-body-sm text-on-surface line-clamp-1 flex-1">{listing.title}</span>
                          <MaterialIcon className="text-sm text-on-surface-variant">chevron_right</MaterialIcon>
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
    </MainLayout>
  );
}

function Metric({ label, value }) {
  return (
    <div className="bg-surface-container-low rounded p-3">
      <div className="font-headline-md text-headline-md text-trust-navy">{value}</div>
      <div className="font-body-sm text-body-sm text-on-surface-variant">{label}</div>
    </div>
  );
}

function brokerStatsFrom(properties) {
  const groups = new Map();
  properties.forEach((property, index) => {
    const broker = property.broker || {};
    const name = broker.name || broker.fullName || 'Môi giới Công Tín Land';
    const email = broker.email || `${name.toLowerCase().replace(/\s+/g, '.')}@congtinland.vn`;
    const current = groups.get(email) || {
      name,
      email,
      avatarUrl: broker.avatarUrl || '',
      responseMinutes: responseMinutesFrom(broker.responseTime, index),
      listings: [],
      wards: new Set(),
      categories: new Set(),
    };
    current.listings.push(property);
    if (property.ward) current.wards.add(property.ward);
    current.categories.add(categoryLabel(property.category));
    groups.set(email, current);
  });

  return [...groups.values()].map((broker, index) => {
    const sold = broker.listings.filter((listing) => (
      listing.rawStatus === 'SOLD' || listing.statusLabel === 'Đã bán' || listing.status === 'Đã bán'
    )).length;
    return {
      ...broker,
      wards: [...broker.wards],
      specialties: [...broker.categories],
      closedDeals: Math.max(sold, broker.listings.length + 2 - (index % 2)),
    };
  });
}

function categoryLabel(category) {
  if (category === 'tro') return 'Phòng trọ';
  if (category === 'dat' || category === 'land') return 'Đất nền';
  if (category === 'apartment') return 'Căn hộ';
  return 'Nhà phố';
}

function responseMinutesFrom(value, fallbackIndex) {
  const parsed = Number(String(value || '').match(/\d+/)?.[0]);
  return Number.isFinite(parsed) ? parsed : 5 + fallbackIndex * 2;
}
