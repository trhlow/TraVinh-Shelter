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
      <div className="container">
        {/* Breadcrumb */}
        <nav className="breadcrumb">
          <a href="#/">Trang chủ</a>
          <Icon name="ChevronRight" size={14} className="icon-muted" />
          <a href="#/search">Cho thuê</a>
          <Icon name="ChevronRight" size={14} className="icon-muted" />
          <span className="breadcrumb-current">{property.title}</span>
        </nav>

        {/* Main content: 2-col layout */}
        <div className="detail-layout">
          {/* Left column — gallery + details */}
          <div className="detail-main">
            {/* Gallery */}
            <ImageGallery images={galleryImages} title={property.title} fallbackImage={detailImages[0]} />
            {mediaLoading && (
              <div className="media-loading-notice">
                Đang tải thư viện ảnh...
              </div>
            )}

            {/* Property header info */}
            <div className="card card-section">
              <div className="filter-bar-inner mb-12">
                <span className="badge badge-success">{property.statusLabel}</span>
                <span className="badge badge-neutral">{categoryLabel}</span>
              </div>
              <h1 className="text-h2 mb-12">{property.title}</h1>
              <div className="filter-bar-inner detail-address mb-16">
                <Icon name="MapPin" size={16} className="icon-muted flex-shrink-0" />
                <span>{property.address}</span>
              </div>
              <div className="detail-price detail-price-rule">
                {property.priceLabel}
              </div>
            </div>

            {/* Property specs */}
            <div className="card p-24 mt-16">
              <h2 className="text-h3 mb-16">Thông tin chi tiết</h2>
              <div className="detail-meta-grid">
                {[
                  ['Ruler', 'Diện tích', `${property.area || 0} m²`],
                  ['Bed', 'Phòng ngủ', property.bedrooms || 0],
                  ['Bath', 'Phòng tắm', property.bathrooms || 0],
                  ['Sun', 'Hướng', property.direction || 'Đang cập nhật'],
                ].map(([iconName, label, value]) => (
                  <div key={label} className="detail-meta-item">
                    <Icon name={iconName} size={18} className="icon-muted" />
                    <span className="detail-meta-label">{label}</span>
                    <span className="detail-meta-value">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Description */}
            <div className="card p-24 mt-16">
              <h2 className="text-h3 mb-16">Mô tả</h2>
              <p className="detail-description whitespace-pre">
                {property.description}
              </p>
            </div>
          </div>

          {/* Right column — broker contact */}
          <div className="detail-sidebar">
            <div className="contact-card">
              {/* Broker info */}
              <div className="contact-card-broker">
                <img
                  alt="Broker Avatar"
                  className="contact-avatar"
                  src={brokerAvatar}
                />
                <div>
                  <p className="contact-card-name">{property.broker?.name || 'Nguyễn Văn A'}</p>
                  <p className="contact-card-verified">
                    <Icon name="ShieldCheck" size={14} className="icon-accent" />
                    Môi giới uy tín
                  </p>
                </div>
              </div>

              {/* CTA buttons */}
              <div className="contact-buttons">
                <button className="btn btn-primary btn-md btn-full">
                  <Icon name="Phone" size={18} />
                  Gọi ngay: {brokerPhone}
                </button>
                <button className="contact-btn-zalo">
                  <Icon name="Mail" size={18} />
                  Chat Zalo
                </button>
              </div>

              <p className="contact-footer-note">
                Vui lòng báo bạn xem tin trên Công Tín Land
              </p>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
