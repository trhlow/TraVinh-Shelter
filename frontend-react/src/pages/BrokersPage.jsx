import { useEffect, useMemo, useState } from 'react';
import MainLayout from '../layouts/MainLayout.jsx';
import Icon from '../components/ui/Icon.jsx';
import { fetchProperties } from '../services/api.js';
import { MOCK_PROPERTIES } from '../services/mockData.js';
import { WARDS } from '../data/locations.js';

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
      {/* Page header */}
      <div className="page-header">
        <div className="container">
          <p className="page-header-eyebrow">Môi giới</p>
          <h1 className="page-header-title">Hồ sơ môi giới Công Tín Land</h1>
        </div>
      </div>

      <section className="section">
      <div className="container">
        {/* Filter bar */}
        <div className="filter-bar-inner mb-32">
          <input
            className="input"
            placeholder="Tìm theo tên"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <select
            className="input"
            value={ward}
            onChange={(event) => setWard(event.target.value)}
          >
            {WARDS.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}
          </select>
          <select
            className="input"
            value={sort}
            onChange={(event) => setSort(event.target.value)}
          >
            <option value="top-sales">Người bán nhiều nhất</option>
            <option value="most-listings">Đăng tin nhiều nhất</option>
            <option value="fast-response">Phản hồi nhanh nhất</option>
          </select>
        </div>

        {/* Broker grid */}
        <div className="broker-grid">
          {brokers.map((broker, index) => (
            <article key={broker.email} className="broker-profile-card">
              <div className="broker-profile-header">
                {/* Avatar */}
                {broker.avatarUrl ? (
                  <img
                    className="broker-avatar-img"
                    src={broker.avatarUrl}
                    alt={broker.name}
                  />
                ) : (
                  <div className="broker-avatar-circle">
                    {broker.name.charAt(0)}
                  </div>
                )}

                {/* Info */}
                <div className="broker-profile-info">
                  <div className="card-title-row mb-4">
                    <div>
                      <h2 className="broker-profile-name">{broker.name}</h2>
                      <p className="broker-profile-meta">{broker.email}</p>
                    </div>
                    <span className="badge badge-neutral flex-shrink-0">Top {index + 1}</span>
                  </div>

                  {/* Stats */}
                  <div className="broker-metric-grid">
                    <Metric label="Đã bán" value={broker.closedDeals} />
                    <Metric label="Tin đăng" value={broker.listings.length} />
                    <Metric label="Phút p/hồi" value={broker.responseMinutes} />
                  </div>

                  {/* Specialties */}
                  <div className="broker-specialty-tags">
                    {broker.specialties.map((item) => (
                      <span key={item} className="specialty-tag">{item}</span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Recent listings */}
              <div className="broker-listings-stack">
                {broker.listings.slice(0, 3).map((listing) => (
                  <a
                    key={listing.id || listing.title}
                    href={listing.id ? `#/property/${listing.id}` : '#/property'}
                    className="broker-listing-link"
                  >
                    <img
                      src={listing.image}
                      alt={listing.title}
                    />
                    <span className="broker-listing-title">{listing.title}</span>
                    <Icon name="ChevronRight" size={16} className="icon-muted" />
                  </a>
                ))}
              </div>
            </article>
          ))}
        </div>
      </div>
      </section>
    </MainLayout>
  );
}

function Metric({ label, value }) {
  return (
    <div className="broker-metric">
      <div className="broker-metric-value">{value}</div>
      <div className="broker-metric-label">{label}</div>
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
