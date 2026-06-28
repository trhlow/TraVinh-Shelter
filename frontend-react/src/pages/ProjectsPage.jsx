import { useMemo, useState } from 'react';
import MainLayout from '../layouts/MainLayout.jsx';
import Icon from '../components/ui/Icon.jsx';

const PROJECTS = [
  {
    id: 'ct-riverside',
    name: 'Công Tín Riverside',
    ward: 'phuong-7',
    type: 'Nhà phố',
    status: 'Đang mở bán',
    units: 84,
    price: 'Từ 2,1 tỷ',
    image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
    highlights: ['Ven sông', 'Sổ riêng', 'Bàn giao 2026'],
  },
  {
    id: 'long-duc-garden',
    name: 'Long Đức Garden',
    ward: 'long-duc',
    type: 'Đất nền',
    status: 'Nhận giữ chỗ',
    units: 126,
    price: 'Từ 980 triệu',
    image: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80',
    highlights: ['Đường 12m', 'Gần QL53', 'Pháp lý rõ'],
  },
  {
    id: 'chau-thanh-green',
    name: 'Châu Thành Green Villas',
    ward: 'chau-thanh',
    type: 'Biệt thự vườn',
    status: 'Sắp mở bán',
    units: 32,
    price: 'Từ 4,8 tỷ',
    image: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=80',
    highlights: ['Không gian xanh', 'An ninh 24/7', 'Bàn giao thô'],
  },
];

const WARDS = [
  ['all', 'Tất cả khu vực'],
  ['phuong-7', 'Phường 7'],
  ['long-duc', 'Long Đức'],
  ['chau-thanh', 'Châu Thành'],
];

const STATUS_BADGE = {
  'Đang mở bán': 'success',
  'Nhận giữ chỗ': 'warning',
  'Sắp mở bán': 'neutral',
};

export default function ProjectsPage({ session, onLogout }) {
  const [ward, setWard] = useState('all');
  const [status, setStatus] = useState('all');

  const projects = useMemo(() => PROJECTS.filter((project) => (
    (ward === 'all' || project.ward === ward)
    && (status === 'all' || project.status === status)
  )), [status, ward]);

  return (
    <MainLayout session={session} onLogout={onLogout}>
      {/* Page header */}
      <div style={{ background: 'var(--color-brand)', padding: '40px 0', color: '#fff' }}>
        <div className="container">
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-accent)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Dự án</p>
          <h1 style={{ fontSize: 32, fontWeight: 700, margin: 0 }}>Khu đô thị và dự án nổi bật</h1>
        </div>
      </div>

      <div className="container" style={{ padding: '32px 24px' }}>
        {/* Filter bar */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 32 }}>
          <select
            className="input"
            style={{ minWidth: 176 }}
            value={ward}
            onChange={(event) => setWard(event.target.value)}
          >
            {WARDS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <select
            className="input"
            style={{ minWidth: 176 }}
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="Đang mở bán">Đang mở bán</option>
            <option value="Nhận giữ chỗ">Nhận giữ chỗ</option>
            <option value="Sắp mở bán">Sắp mở bán</option>
          </select>
        </div>

        {/* Project grid */}
        <div className="grid-3">
          {projects.map((project) => (
            <article key={project.id} className="card" style={{ overflow: 'hidden', padding: 0 }}>
              {/* Image */}
              <div style={{ position: 'relative', height: 220 }}>
                <img
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  src={project.image}
                  alt={project.name}
                />
                <span
                  className={`badge badge-${STATUS_BADGE[project.status] || 'neutral'}`}
                  style={{ position: 'absolute', top: 12, left: 12 }}
                >
                  {project.status}
                </span>
              </div>

              {/* Content */}
              <div style={{ padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                  <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-brand)', margin: 0 }}>{project.name}</h2>
                  <span style={{ fontWeight: 700, color: 'var(--color-accent)', whiteSpace: 'nowrap', fontSize: 15 }}>{project.price}</span>
                </div>

                <div style={{ display: 'flex', gap: 16, marginBottom: 16, color: 'var(--color-text-secondary)', fontSize: 14 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Icon name="Building2" size={15} />
                    {project.type}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Icon name="Home" size={15} />
                    {project.units} sản phẩm
                  </span>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {project.highlights.map((item) => (
                    <span
                      key={item}
                      style={{
                        fontSize: 12,
                        padding: '4px 10px',
                        borderRadius: 100,
                        background: 'var(--color-bg-muted)',
                        color: 'var(--color-text-secondary)',
                      }}
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </MainLayout>
  );
}
