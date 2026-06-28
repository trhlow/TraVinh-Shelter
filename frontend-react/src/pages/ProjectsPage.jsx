import { useMemo, useState } from 'react';
import MainLayout from '../layouts/MainLayout.jsx';
import MaterialIcon from '../components/MaterialIcon.jsx';

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

export default function ProjectsPage({ session, onLogout }) {
  const [ward, setWard] = useState('all');
  const [status, setStatus] = useState('all');

  const projects = useMemo(() => PROJECTS.filter((project) => (
    (ward === 'all' || project.ward === ward)
    && (status === 'all' || project.status === status)
  )), [status, ward]);

  return (
    <MainLayout session={session} onLogout={onLogout}>
      <main className="flex-grow">
        <section className="px-margin-mobile md:px-margin-desktop py-stack-lg max-w-container-max mx-auto">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-stack-lg">
            <div>
              <p className="font-label-bold text-label-bold text-action-orange mb-2">Dự án</p>
              <h1 className="font-headline-xl-mobile md:font-headline-xl text-headline-xl-mobile md:text-headline-xl text-trust-navy">
                Khu đô thị và dự án nổi bật
              </h1>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <select className="input bg-white min-w-44" value={ward} onChange={(event) => setWard(event.target.value)}>
                {WARDS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
              <select className="input bg-white min-w-44" value={status} onChange={(event) => setStatus(event.target.value)}>
                <option value="all">Tất cả trạng thái</option>
                <option value="Đang mở bán">Đang mở bán</option>
                <option value="Nhận giữ chỗ">Nhận giữ chỗ</option>
                <option value="Sắp mở bán">Sắp mở bán</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter">
            {projects.map((project) => (
              <article key={project.id} className="bg-white border border-outline-variant rounded-lg overflow-hidden shadow-sm">
                <div className="h-64 relative">
                  <img className="w-full h-full object-cover" src={project.image} alt={project.name} />
                  <span className="absolute top-4 left-4 bg-white text-trust-navy font-label-bold text-label-bold px-3 py-1 rounded">
                    {project.status}
                  </span>
                </div>
                <div className="p-5">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <h2 className="font-headline-md text-headline-md text-trust-navy">{project.name}</h2>
                    <span className="font-label-bold text-label-bold text-action-orange whitespace-nowrap">{project.price}</span>
                  </div>
                  <div className="flex flex-wrap gap-3 font-body-sm text-body-sm text-on-surface-variant mb-4">
                    <span className="flex items-center gap-1"><MaterialIcon className="text-sm">apartment</MaterialIcon>{project.type}</span>
                    <span className="flex items-center gap-1"><MaterialIcon className="text-sm">home_work</MaterialIcon>{project.units} sản phẩm</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {project.highlights.map((item) => (
                      <span key={item} className="bg-surface-container-low text-trust-navy font-body-sm text-body-sm px-3 py-1 rounded">
                        {item}
                      </span>
                    ))}
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
