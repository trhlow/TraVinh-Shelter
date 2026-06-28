import { useEffect, useState } from 'react';
import ImageGallery from '../components/ImageGallery.jsx';
import Icon from '../components/ui/Icon.jsx';
import MainLayout from '../layouts/MainLayout.jsx';
import { detailImages } from '../data/templateData.js';
import { fetchPropertyDetail, fetchPropertyMedia } from '../services/api.js';

const fallbackProperty = {
  title: 'NHÀ TRỌ THANH TRÚC - TRỐNG 2 PHÒNG',
  address: 'Hẻm 42, Đường Điện Biên Phủ, Phường 6, TP Trà Vinh',
  priceLabel: '1.2 Triệu / Tháng',
  statusLabel: 'Cho thuê',
  category: 'tro',
  area: 20,
  bedrooms: 1,
  bathrooms: 1,
  direction: 'Đông Nam',
  description: `Hiện tại nhà trọ Thanh Trúc đang trống 2 phòng, cần tìm người thuê ưu tiên sinh viên hoặc người đi làm văn phòng.

- Vị trí: Gần Đại học Trà Vinh (cách 5 phút đi xe), hẻm rộng an ninh, xe ba gác vào tận nơi.
- Tiện ích: Phòng sạch sẽ, có gác lửng đúc kiên cố, toilet riêng trong phòng, có chỗ nấu ăn, wifi tốc độ cao miễn phí.
- An ninh: Khu vực yên tĩnh, có camera an ninh 24/24, cổng rào chắc chắn.
- Điện nước tính theo giá nhà nước.

Liên hệ xem phòng gọi trước 30 phút.`,
  broker: {
    name: 'Nguyễn Văn A',
    phone: '0901 234 567',
    email: 'broker@congtinland.vn',
    avatarUrl: '',
  },
};

const fallbackBrokerAvatar = 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&w=300&q=80';

export default function PropertyDetailPage({ propertyId, session, onLogout }) {
  const [property, setProperty] = useState(fallbackProperty);
  const [mediaImages, setMediaImages] = useState(detailImages);
  const [mediaLoading, setMediaLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    fetchPropertyDetail(propertyId)
      .then((item) => {
        if (alive && item) setProperty(item);
      })
      .catch(() => {
        if (alive) setProperty(fallbackProperty);
      });
    return () => {
      alive = false;
    };
  }, [propertyId]);

  useEffect(() => {
    let alive = true;
    setMediaLoading(true);
    fetchPropertyMedia(propertyId)
      .then((items) => {
        if (!alive) return;
        const images = items.filter((item) => item.mediaType === 'IMAGE').map((item) => item.url);
        setMediaImages(images.length > 0 ? images : detailImages);
      })
      .catch(() => {
        if (alive) setMediaImages(detailImages);
      })
      .finally(() => {
        if (alive) setMediaLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [propertyId]);

  const galleryImages = [property.image, ...mediaImages].filter(Boolean);
  const categoryLabel = property.category === 'tro' ? 'Phòng trọ' : property.category === 'dat' ? 'Đất' : 'Nhà';
  const brokerPhone = property.broker?.phone || '0901 234 567';
  const brokerAvatar = property.broker?.avatarUrl || fallbackBrokerAvatar;

  return (
    <MainLayout session={session} onLogout={onLogout}>
      <div className="container" style={{ padding: '24px' }}>
        {/* Breadcrumb */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 24, fontSize: 14, color: 'var(--color-text-secondary)' }}>
          <a href="#/" style={{ color: 'var(--color-text-secondary)', textDecoration: 'none' }}>Trang chủ</a>
          <Icon name="ChevronRight" size={14} />
          <a href="#/search" style={{ color: 'var(--color-text-secondary)', textDecoration: 'none' }}>Cho thuê</a>
          <Icon name="ChevronRight" size={14} />
          <span style={{ color: 'var(--color-text-primary)' }}>{property.title}</span>
        </nav>

        {/* Main content: 2-col layout */}
        <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          {/* Left column — gallery + details */}
          <div style={{ flex: '1 1 0', minWidth: 0 }}>
            {/* Gallery */}
            <ImageGallery images={galleryImages} title={property.title} fallbackImage={detailImages[0]} />
            {mediaLoading && (
              <div style={{ marginTop: 8, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-bg-subtle)', fontSize: 13, color: 'var(--color-text-secondary)' }}>
                Đang tải thư viện ảnh...
              </div>
            )}

            {/* Property header info */}
            <div className="card" style={{ padding: 24, marginTop: 20 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                <span className="badge badge-success">{property.statusLabel}</span>
                <span className="badge badge-neutral">{categoryLabel}</span>
              </div>
              <h1 className="text-h2" style={{ marginBottom: 12 }}>{property.title}</h1>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, color: 'var(--color-text-secondary)', fontSize: 15, marginBottom: 16 }}>
                <Icon name="MapPin" size={16} style={{ marginTop: 2, flexShrink: 0 }} />
                <span>{property.address}</span>
              </div>
              <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--color-accent)', paddingTop: 12, borderTop: '1px solid var(--color-border)' }}>
                {property.priceLabel}
              </div>
            </div>

            {/* Property specs */}
            <div className="card" style={{ padding: 24, marginTop: 16 }}>
              <h2 className="text-h3" style={{ marginBottom: 16 }}>Thông tin chi tiết</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                {[
                  ['Ruler', 'Diện tích', `${property.area || 0} m²`],
                  ['Bed', 'Phòng ngủ', property.bedrooms || 0],
                  ['Bath', 'Phòng tắm', property.bathrooms || 0],
                  ['Sun', 'Hướng', property.direction || 'Đang cập nhật'],
                ].map(([iconName, label, value]) => (
                  <div
                    key={label}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                      padding: 12,
                      background: 'var(--color-bg-muted)',
                      borderRadius: 8,
                    }}
                  >
                    <Icon name={iconName} size={18} style={{ color: 'var(--color-text-secondary)' }} />
                    <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{label}</span>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Description */}
            <div className="card" style={{ padding: 24, marginTop: 16 }}>
              <h2 className="text-h3" style={{ marginBottom: 16 }}>Mô tả</h2>
              <div style={{ fontSize: 15, color: 'var(--color-text-secondary)', lineHeight: 1.7, whiteSpace: 'pre-line' }}>
                {property.description}
              </div>
            </div>
          </div>

          {/* Right column — broker contact */}
          <div style={{ width: 300, flexShrink: 0, position: 'sticky', top: 100 }}>
            <div className="card" style={{ padding: 24 }}>
              {/* Broker info */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 16, borderBottom: '1px solid var(--color-border)', marginBottom: 20 }}>
                <img
                  alt="Broker Avatar"
                  style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--color-accent)' }}
                  src={brokerAvatar}
                />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-brand)' }}>{property.broker?.name || 'Nguyễn Văn A'}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 2 }}>
                    <Icon name="ShieldCheck" size={14} style={{ color: 'var(--color-accent)' }} />
                    Môi giới uy tín
                  </div>
                </div>
              </div>

              {/* CTA buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button
                  style={{
                    width: '100%',
                    background: 'var(--color-accent)',
                    color: '#fff',
                    fontWeight: 600,
                    padding: '12px 16px',
                    borderRadius: 8,
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    fontSize: 15,
                  }}
                >
                  <Icon name="Phone" size={18} />
                  Gọi ngay: {brokerPhone}
                </button>
                <button
                  style={{
                    width: '100%',
                    background: '#0068FF',
                    color: '#fff',
                    fontWeight: 600,
                    padding: '12px 16px',
                    borderRadius: 8,
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    fontSize: 15,
                  }}
                >
                  <Icon name="Mail" size={18} />
                  Chat Zalo
                </button>
              </div>

              <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--color-text-muted)', marginTop: 16 }}>
                Vui lòng báo bạn xem tin trên Công Tín Land
              </p>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
