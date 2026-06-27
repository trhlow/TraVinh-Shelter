import MaterialIcon from './MaterialIcon.jsx';

export default function SearchBar() {
  return (
    <div className="bg-surface/95 backdrop-blur-sm rounded-xl p-4 shadow-[0_10px_30px_rgba(0,0,0,0.25)] w-full max-w-[900px] mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-4">
        <label className="relative">
          <MaterialIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-outline">home</MaterialIcon>
          <select className="w-full bg-surface-container-low border border-outline-variant rounded p-4 pl-12 font-body-md text-body-md focus:border-trust-navy focus:ring-1 focus:ring-trust-navy">
            <option>Loại hình (Tất cả)</option>
            <option>Nhà phố</option>
            <option>Căn hộ</option>
            <option>Đất nền</option>
          </select>
        </label>
        <label className="relative">
          <MaterialIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-outline">location_on</MaterialIcon>
          <select className="w-full bg-surface-container-low border border-outline-variant rounded p-4 pl-12 font-body-md text-body-md focus:border-trust-navy focus:ring-1 focus:ring-trust-navy">
            <option>Khu vực (Tất cả)</option>
            <option>TP Trà Vinh</option>
            <option>Châu Thành</option>
            <option>Cầu Ngang</option>
          </select>
        </label>
        <a className="bg-trust-navy text-on-primary font-label-bold text-label-bold px-10 py-4 rounded flex items-center justify-center gap-2 hover:bg-primary-container transition-colors" href="#/search">
          <MaterialIcon>search</MaterialIcon>
          Tìm kiếm
        </a>
      </div>
    </div>
  );
}
