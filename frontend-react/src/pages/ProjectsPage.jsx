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
      <div className="page-header">
        <div className="container">
          <p className="page-header-eyebrow">Dự án</p>
          <h1 className="page-header-title">Khu đô thị và dự án nổi bật</h1>
        </div>
      </div>

      <div className="container">
        {/* Filter bar */}
        <div className="filter-bar-inner mt-24 mb-32">
          <select
            className="input"
            value={ward}
            onChange={(event) => setWard(event.target.value)}
          >
            {WARDS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <select
            className="input"
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
            <article key={project.id} className="project-card">
              {/* Image */}
              <div className="project-card-image">
                <img src={project.image} alt={project.name} />
                <span className={`badge badge-${STATUS_BADGE[project.status] || 'neutral'} project-card-badge`}>
                  {project.status}
                </span>
              </div>

              {/* Content */}
              <div className="project-card-body">
                <div className="filter-bar-inner justify-between gap-8 mb-8">
                  <h2 className="project-card-title">{project.name}</h2>
                  <span className="project-card-price">{project.price}</span>
                </div>

                <div className="project-card-meta">
                  <span className="project-card-meta-item">
                    <Icon name="Building2" size={15} className="icon-muted" />
                    {project.type}
                  </span>
                  <span className="project-card-meta-item">
                    <Icon name="Home" size={15} className="icon-muted" />
                    {project.units} sản phẩm
                  </span>
                </div>

                <div className="broker-specialty-tags">
                  {project.highlights.map((item) => (
                    <span key={item} className="specialty-tag">{item}</span>
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
