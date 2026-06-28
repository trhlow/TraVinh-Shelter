import { useEffect, useMemo, useState } from 'react';
import MainLayout from '../layouts/MainLayout.jsx';
import Icon from '../components/ui/Icon.jsx';
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
      {/* Page header */}
      <div style={{ background: 'var(--color-brand)', padding: '40px 0', color: '#fff' }}>
        <div className="container">
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-accent)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Môi giới</p>
          <h1 style={{ fontSize: 32, fontWeight: 700, margin: 0 }}>Hồ sơ môi giới Công Tín Land</h1>
        </div>
      </div>

      <div className="container" style={{ padding: '32px 24px' }}>
        {/* Filter bar */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 32 }}>
          <input
            className="input"
            style={{ flex: '1 1 180px', maxWidth: 280 }}
            placeholder="Tìm theo tên"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <select
            className="input"
            style={{ flex: '1 1 160px', maxWidth: 220 }}
            value={ward}
            onChange={(event) => setWard(event.target.value)}
          >
            {WARDS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <select
            className="input"
            style={{ flex: '1 1 200px', maxWidth: 260 }}
            value={sort}
            onChange={(event) => setSort(event.target.value)}
          >
            <option value="top-sales">Người bán nhiều nhất</option>
            <option value="most-listings">Đăng tin nhiều nhất</option>
            <option value="fast-response">Phản hồi nhanh nhất</option>
          </select>
        </div>

        {/* Broker grid */}
        <div className="grid-4" style={{ '--grid-cols': 2 }}>
          {brokers.map((broker, index) => (
            <article key={broker.email} className="card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                {/* Avatar */}
                <div style={{ flexShrink: 0 }}>
                  {broker.avatarUrl ? (
                    <img
                      style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--color-accent)' }}
                      src={broker.avatarUrl}
                      alt={broker.name}
                    />
                  ) : (
                    <div style={{
                      width: 72,
                      height: 72,
                      borderRadius: '50%',
                      background: 'var(--color-brand)',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 28,
                      fontWeight: 700,
                    }}>
                      {broker.name.charAt(0)}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                    <div>
                      <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-brand)', margin: 0 }}>{broker.name}</h2>
                      <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 2 }}>{broker.email}</p>
                    </div>
                    <span className="badge badge-neutral" style={{ flexShrink: 0 }}>Top {index + 1}</span>
                  </div>

                  {/* Stats */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, margin: '12px 0' }}>
                    <Metric label="Đã bán" value={broker.closedDeals} />
                    <Metric label="Tin đăng" value={broker.listings.length} />
                    <Metric label="Phút p/hồi" value={broker.responseMinutes} />
                  </div>

                  {/* Specialties */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                    {broker.specialties.map((item) => (
                      <span
                        key={item}
                        style={{
                          fontSize: 12,
                          padding: '3px 10px',
                          borderRadius: 100,
                          background: 'var(--color-bg-muted)',
                          color: 'var(--color-text-secondary)',
                        }}
                      >
                        {item}
                      </span>
                    ))}
                  </div>

                  {/* Recent listings */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {broker.listings.slice(0, 3).map((listing) => (
                      <a
                        key={listing.id || listing.title}
                        href={listing.id ? `#/property/${listing.id}` : '#/property'}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          padding: '6px 8px',
                          borderRadius: 8,
                          border: '1px solid var(--color-border)',
                          textDecoration: 'none',
                          background: 'var(--color-bg-subtle)',
                        }}
                      >
                        <img
                          style={{ width: 48, height: 40, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }}
                          src={listing.image}
                          alt={listing.title}
                        />
                        <span style={{ fontSize: 13, color: 'var(--color-text-primary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {listing.title}
                        </span>
                        <Icon name="ChevronRight" size={16} />
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </MainLayout>
  );
}

function Metric({ label, value }) {
  return (
    <div style={{ background: 'var(--color-bg-muted)', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
      <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-brand)' }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 2 }}>{label}</div>
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
