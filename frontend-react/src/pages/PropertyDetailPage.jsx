import { useEffect, useState } from 'react';
import ImageGallery from '../components/ImageGallery.jsx';
import Icon from '../components/ui/Icon.jsx';
import MainLayout from '../layouts/MainLayout.jsx';
import RoomList from '../components/property/RoomList.jsx';
import BookingForm from '../components/property/BookingForm.jsx';
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

const fallbackBrokerAvatar =
  'https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&w=300&q=80';

// Map amenity keyword → lucide icon name
const AMENITY_ICON_MAP = [
  [/giường|bed/i, 'BedDouble'],
  [/tủ lạnh|refrigerator/i, 'Refrigerator'],
  [/máy lạnh|điều hòa|air con/i, 'AirVent'],
  [/wifi|internet/i, 'Wifi'],
  [/nước nóng|water heater/i, 'ShowerHead'],
  [/tủ quần áo|wardrobe/i, 'Package'],
  [/gác|loft/i, 'Layers'],
  [/bếp|cooking|kitchen/i, 'Utensils'],
  [/máy giặt|washer/i, 'WashingMachine'],
  [/sofa|ghế/i, 'Sofa'],
  [/tv|tivi|television/i, 'Tv'],
  [/camera|an ninh/i, 'ShieldCheck'],
  [/sân vườn|garden/i, 'Sparkles'],
  [/gara|garage/i, 'Car'],
  [/sân thượng|rooftop/i, 'Wind'],
  [/bơm nước|water pump/i, 'Droplets'],
  [/cửa bảo vệ|security door/i, 'Lock'],
  [/xe|parking|bãi giữ/i, 'Car'],
];

function amenityIcon(label) {
  for (const [regex, iconName] of AMENITY_ICON_MAP) {
    if (regex.test(label)) return iconName;
  }
  return 'Check';
}

const COST_CONFIG = [
  { key: 'electricity', label: 'Điện', icon: 'Zap' },
  { key: 'water', label: 'Nước', icon: 'Droplets' },
  { key: 'service', label: 'Dịch vụ', icon: 'Wrench' },
  { key: 'parking', label: 'Giữ xe', icon: 'Car' },
];

const CONDITION_LABELS = {
  toilet: 'Toilet',
  hours: 'Giờ giấc',
  washer: 'Máy giặt',
  window: 'Cửa sổ',
  balcony: 'Ban công',
  pets: 'Thú cưng',
  parking: 'Chỗ để xe',
  ev: 'Sạc xe điện',
};

export default function PropertyDetailPage({ propertyId, session, onLogout }) {
  const [property, setProperty] = useState(fallbackProperty);
  const [mediaImages, setMediaImages] = useState(detailImages);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState('');

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
        const images = items
          .filter((item) => item.mediaType === 'IMAGE')
          .map((item) => item.url);
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
  const categoryLabel =
    property.category === 'tro'
      ? 'Phòng trọ'
      : property.category === 'dat'
      ? 'Đất'
      : 'Nhà';
  const brokerPhone = property.broker?.phone || '0901 234 567';
  const brokerAvatar = property.broker?.avatarUrl || fallbackBrokerAvatar;
  const isTro = property.category === 'tro';

  const hasAmenities = Array.isArray(property.amenities) && property.amenities.length > 0;
  const hasCosts = property.costs && Object.keys(property.costs).length > 0;
  const hasConditions = property.conditions && Object.keys(property.conditions).length > 0;
  const hasRooms = isTro && Array.isArray(property.rooms) && property.rooms.length > 0;

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
          {/* ── Left column ── */}
          <div className="detail-main">
            {/* Gallery */}
            <ImageGallery
              images={galleryImages}
              title={property.title}
              fallbackImage={detailImages[0]}
            />
            {mediaLoading && (
              <div className="media-loading-notice">Đang tải thư viện ảnh...</div>
            )}

            {/* Block 1: Basic info */}
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
              <div className="detail-price detail-price-rule">{property.priceLabel}</div>

              {/* Specs row */}
              {(property.area || property.bedrooms || property.bathrooms || property.direction) && (
                <div className="detail-meta-grid" style={{ marginTop: '16px' }}>
                  {property.area > 0 && (
                    <div className="detail-meta-item">
                      <Icon name="Ruler" size={18} className="icon-muted" />
                      <span className="detail-meta-label">Diện tích</span>
                      <span className="detail-meta-value">{property.area} m²</span>
                    </div>
                  )}
                  {property.bedrooms > 0 && (
                    <div className="detail-meta-item">
                      <Icon name="Bed" size={18} className="icon-muted" />
                      <span className="detail-meta-label">Phòng ngủ</span>
                      <span className="detail-meta-value">{property.bedrooms}</span>
                    </div>
                  )}
                  {property.bathrooms > 0 && (
                    <div className="detail-meta-item">
                      <Icon name="Bath" size={18} className="icon-muted" />
                      <span className="detail-meta-label">Phòng tắm</span>
                      <span className="detail-meta-value">{property.bathrooms}</span>
                    </div>
                  )}
                  {property.direction && property.direction !== 'Đang cập nhật' && (
                    <div className="detail-meta-item">
                      <Icon name="Sun" size={18} className="icon-muted" />
                      <span className="detail-meta-label">Hướng</span>
                      <span className="detail-meta-value">{property.direction}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Amenity icon grid */}
              {hasAmenities && (
                <div className="amenity-grid" style={{ marginTop: '20px' }}>
                  {property.amenities.map((label) => (
                    <div key={label} className="amenity-item">
                      <Icon name={amenityIcon(label)} size={16} className="icon-accent" />
                      <span>{label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Block 2: Costs */}
            {hasCosts && (
              <div className="card p-24 mt-16">
                <h2 className="detail-block-title">
                  <Icon name="DollarSign" size={18} className="icon-accent" />
                  Chi phí &amp; Điều kiện
                </h2>
                <div className="cost-list">
                  {COST_CONFIG.map(({ key, label, icon }) => {
                    const cost = property.costs[key];
                    if (!cost) return null;
                    return (
                      <div key={key} className="cost-row">
                        <div className="cost-row-left">
                          <Icon name={icon} size={15} className="icon-muted" />
                          {label}
                        </div>
                        <div className="cost-row-right">
                          {cost.free ? (
                            <span className="badge-free">Miễn phí</span>
                          ) : (
                            cost.value
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Block 3: Conditions */}
            {hasConditions && (
              <div className="card p-24 mt-16">
                <h2 className="detail-block-title">
                  <Icon name="Info" size={18} className="icon-accent" />
                  Thông tin chi tiết
                </h2>
                <div className="conditions-grid">
                  {Object.entries(property.conditions).map(([key, value]) => {
                    const label = CONDITION_LABELS[key];
                    if (!label || !value) return null;
                    return (
                      <div key={key} className="conditions-item">
                        <span className="conditions-label">{label}</span>
                        <span className="conditions-value">{value}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Block 4: Description */}
            {property.description && (
              <div className="card p-24 mt-16">
                <h2 className="detail-block-title">
                  <Icon name="FileText" size={18} className="icon-muted" />
                  Mô tả
                </h2>
                <p className="detail-description whitespace-pre">{property.description}</p>
              </div>
            )}

            {/* Block 6: Room list — trọ only */}
            {hasRooms && (
              <div className="card p-24 mt-16">
                <h2 className="detail-block-title">
                  <Icon name="BedDouble" size={18} className="icon-accent" />
                  Danh sách phòng trống
                </h2>
                <RoomList
                  rooms={property.rooms}
                  onSelectRoom={(label) => setSelectedRoom(label)}
                />
              </div>
            )}
          </div>

          {/* ── Right column — broker + booking ── */}
          <div className="detail-sidebar">
            {/* Broker contact card */}
            <div className="contact-card">
              <div className="contact-card-broker">
                <img
                  alt="Broker Avatar"
                  className="contact-avatar"
                  src={brokerAvatar}
                />
                <div>
                  <p className="contact-card-name">
                    {property.broker?.name || 'Nguyễn Văn A'}
                  </p>
                  <p className="contact-card-verified">
                    <Icon name="ShieldCheck" size={14} className="icon-accent" />
                    Môi giới uy tín
                  </p>
                </div>
              </div>

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

            {/* Booking form */}
            <BookingForm
              propertyId={propertyId}
              category={property.category}
              propertyTitle={property.title}
              selectedRoom={selectedRoom}
              rooms={property.rooms || []}
            />
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
