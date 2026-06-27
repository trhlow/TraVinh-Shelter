import MaterialIcon from '../components/MaterialIcon.jsx';
import MainLayout from '../layouts/MainLayout.jsx';
import { detailImages } from '../data/templateData.js';

export default function PropertyDetailPage() {
  return (
    <MainLayout>
      <main className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-stack-lg">
        <div className="flex items-center gap-2 mb-stack-md text-on-surface-variant font-body-sm text-body-sm">
          <a className="hover:text-primary transition-colors" href="#/">Trang chủ</a>
          <MaterialIcon className="text-[16px]">chevron_right</MaterialIcon>
          <a className="hover:text-primary transition-colors" href="#/search">Cho thuê</a>
          <MaterialIcon className="text-[16px]">chevron_right</MaterialIcon>
          <span className="text-on-surface">NHÀ TRỌ THANH TRÚC - TRỐNG 2 PHÒNG</span>
        </div>

        <div className="flex flex-col lg:flex-row gap-gutter">
          <div className="w-full lg:w-2/3 flex flex-col gap-stack-lg">
            <div className="flex flex-col gap-stack-sm">
              <div className="w-full h-[300px] md:h-[450px] rounded-xl overflow-hidden shadow-sm relative group cursor-pointer">
                <img
                  alt="Main property view"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  data-alt="A bright, high-quality wide photograph of a clean, modern rental room interior in Tra Vinh."
                  id="main-gallery-image"
                  src={detailImages[0]}
                />
                <div className="absolute bottom-4 right-4 bg-surface/90 backdrop-blur-sm px-3 py-1 rounded-full font-label-bold text-label-bold flex items-center gap-2 shadow-sm border border-outline-variant">
                  <MaterialIcon className="text-[16px]">photo_library</MaterialIcon> 1/5
                </div>
              </div>
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                {detailImages.slice(1).map((image, index) => (
                  <img
                    key={image}
                    alt={`Thumbnail ${index + 1}`}
                    className={`w-24 h-16 rounded-lg object-cover cursor-pointer border-2 ${index === 0 ? 'border-primary' : 'border-transparent hover:border-outline-variant opacity-70 hover:opacity-100 transition-all'}`}
                    data-alt="Thumbnail showing rental room details."
                    src={image}
                  />
                ))}
                <div className="w-24 h-16 rounded-lg bg-surface-container-high flex items-center justify-center cursor-pointer border-2 border-transparent hover:border-outline-variant transition-all">
                  <span className="font-label-bold text-label-bold text-on-surface-variant">+1</span>
                </div>
              </div>
            </div>

            <div className="bg-surface-container-lowest p-stack-md rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-outline-variant/30 flex flex-col gap-4">
              <div className="flex flex-wrap gap-2 mb-1">
                <span className="bg-primary/10 text-primary px-2 py-1 rounded font-label-bold text-label-bold text-[12px]">Cho thuê</span>
                <span className="bg-surface-container text-on-surface-variant px-2 py-1 rounded font-label-bold text-label-bold text-[12px]">Phòng trọ</span>
              </div>
              <h1 className="font-headline-lg md:font-headline-xl text-headline-lg md:text-headline-xl text-on-surface">NHÀ TRỌ THANH TRÚC - TRỐNG 2 PHÒNG</h1>
              <div className="flex items-start gap-2 text-on-surface-variant font-body-md text-body-md">
                <MaterialIcon className="mt-0.5">location_on</MaterialIcon>
                <p>Hẻm 42, Đường Điện Biên Phủ, Phường 6, TP Trà Vinh</p>
              </div>
              <div className="font-price-display text-price-display text-action-orange pt-2 border-t border-outline-variant/30">
                1.2 Triệu / Tháng
              </div>
            </div>

            <div className="bg-surface-container-lowest p-stack-md rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-outline-variant/30">
              <h2 className="font-headline-md text-headline-md text-on-surface mb-stack-md">Thông tin chi tiết</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  ['straighten', 'Diện tích', '20 m²'],
                  ['bed', 'Phòng ngủ', '1'],
                  ['bathroom', 'Phòng tắm', '1'],
                  ['explore', 'Hướng', 'Đông Nam'],
                ].map(([icon, label, value]) => (
                  <div key={label} className="flex flex-col gap-1 p-3 bg-surface-container-low rounded-lg">
                    <MaterialIcon className="text-on-surface-variant">{icon}</MaterialIcon>
                    <span className="font-body-sm text-body-sm text-on-surface-variant">{label}</span>
                    <span className="font-label-bold text-label-bold text-on-surface">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-surface-container-lowest p-stack-md rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-outline-variant/30">
              <h2 className="font-headline-md text-headline-md text-on-surface mb-stack-md">Mô tả</h2>
              <div className="font-body-md text-body-md text-on-surface-variant flex flex-col gap-4 whitespace-pre-line">
                {`Hiện tại nhà trọ Thanh Trúc đang trống 2 phòng, cần tìm người thuê ưu tiên sinh viên hoặc người đi làm văn phòng.

- Vị trí: Gần Đại học Trà Vinh (cách 5 phút đi xe), hẻm rộng an ninh, xe ba gác vào tận nơi.
- Tiện ích: Phòng sạch sẽ, có gác lửng đúc kiên cố, toilet riêng trong phòng, có chỗ nấu ăn, wifi tốc độ cao miễn phí.
- An ninh: Khu vực yên tĩnh, có camera an ninh 24/24, cổng rào chắc chắn.
- Điện nước tính theo giá nhà nước.

Liên hệ xem phòng gọi trước 30 phút.`}
              </div>
            </div>
          </div>

          <div className="w-full lg:w-1/3 relative">
            <div className="sticky top-[100px] bg-surface-container-lowest p-stack-md rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.08)] border border-outline-variant/30 flex flex-col gap-6 z-10">
              <div className="flex items-center gap-4 border-b border-outline-variant/30 pb-4">
                <img
                  alt="Broker Avatar"
                  className="w-16 h-16 rounded-full object-cover border-2 border-primary"
                  data-alt="A professional headshot of a Vietnamese real estate broker smiling warmly."
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuDEReDPyvxSHAVlhe1urURWQSyldaV_T3XjYM4rz4nKtUwT9wclDkrhfasFGDEwscw7wXKhBx1E_Qf522aOCWVgWsgIr-Bc8Lh2xkPRH40w9LU08bCEGMU0qmWZL5cJ5dclae4gVSaGH_WOwJdam9ZcC2C0A6ajL-ZH092yqt7Fo9sGwHdoYPzKIvkjpzg84PQrHHGCGX-wOfFtip3XDjjbGoSQLyMRXEFMMDfjy-VCRv0f8nqFtp9G8GsFTvYWXKMgmAJgsflllhI"
                />
                <div className="flex flex-col">
                  <span className="font-label-bold text-label-bold text-on-surface text-[16px]">Nguyễn Văn A</span>
                  <span className="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-1 mt-1">
                    <MaterialIcon className="text-[14px]">verified</MaterialIcon> Môi giới uy tín
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <button className="w-full bg-success-green hover:bg-success-green/90 text-white font-label-bold text-label-bold py-3 rounded-lg flex justify-center items-center gap-2 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5">
                  <MaterialIcon>call</MaterialIcon>
                  Gọi ngay: 0901 234 567
                </button>
                <button className="w-full bg-[#0068FF] hover:bg-[#0068FF]/90 text-white font-label-bold text-label-bold py-3 rounded-lg flex justify-center items-center gap-2 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5">
                  <MaterialIcon>chat</MaterialIcon>
                  Chat Zalo
                </button>
              </div>
              <div className="text-center font-body-sm text-body-sm text-text-muted mt-2">
                Vui lòng báo bạn xem tin trên BĐS Trà Vinh
              </div>
            </div>
          </div>
        </div>
      </main>
    </MainLayout>
  );
}
