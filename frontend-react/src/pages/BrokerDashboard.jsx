import MaterialIcon from '../components/MaterialIcon.jsx';
import { dashboardListings } from '../data/templateData.js';
import AdminLayout from '../layouts/AdminLayout.jsx';

export default function BrokerDashboard() {
  return (
    <AdminLayout>
      <main className="flex-1 md:ml-64 p-margin-mobile md:p-margin-desktop w-full max-w-container-max mx-auto">
        <header className="mb-stack-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="font-headline-xl-mobile md:font-headline-xl text-headline-xl-mobile md:text-headline-xl text-trust-navy">Tin đăng của tôi</h1>
            <p className="font-body-md text-body-md text-on-surface-variant mt-2">Quản lý và cập nhật danh sách bất động sản của bạn.</p>
          </div>
          <button className="bg-primary text-white font-label-bold text-label-bold px-6 py-3 rounded-lg flex items-center gap-2 hover:bg-primary-container transition-colors shadow-sm hover:shadow-md">
            <MaterialIcon className="text-sm">add</MaterialIcon>
            Đăng tin mới
          </button>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-gutter mb-stack-lg">
          <StatCard icon="list_alt" label="Tổng tin đăng" value="42" className="text-primary bg-primary-fixed" />
          <StatCard icon="visibility" label="Lượt xem (30 ngày)" value="12,450" className="text-primary bg-surface-tint/20" />
          <StatCard icon="group" label="Khách hàng tiềm năng" value="89" valueClassName="text-success-green" className="text-success-green bg-success-green/20" />
        </section>

        <section className="bg-white rounded-xl shadow-sm border border-surface-variant overflow-hidden">
          <div className="px-6 py-4 border-b border-surface-variant flex justify-between items-center bg-surface-bright">
            <h3 className="font-headline-md text-headline-md text-trust-navy">Danh sách hiện tại</h3>
            <div className="flex gap-2">
              <button className="px-4 py-2 text-primary font-label-bold text-label-bold border border-primary rounded-lg hover:bg-surface-container-low">Lọc</button>
            </div>
          </div>
          <div className="divide-y divide-surface-variant">
            {dashboardListings.map((listing) => (
              <ListingRow key={listing.title} listing={listing} />
            ))}
          </div>
        </section>
      </main>
    </AdminLayout>
  );
}

function StatCard({ icon, label, value, className, valueClassName = 'text-trust-navy' }) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-surface-variant flex items-center justify-between">
      <div>
        <p className="font-body-sm text-body-sm text-on-surface-variant mb-1">{label}</p>
        <p className={`font-headline-lg text-headline-lg ${valueClassName}`}>{value}</p>
      </div>
      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${className}`}>
        <MaterialIcon filled>{icon}</MaterialIcon>
      </div>
    </div>
  );
}

function ListingRow({ listing }) {
  return (
    <div className={`p-6 flex flex-col md:flex-row gap-6 hover:bg-surface-container-low transition-colors ${listing.visible ? '' : 'opacity-60'}`}>
      <div className={`w-full md:w-48 h-32 rounded-lg overflow-hidden relative shrink-0 ${listing.visible ? '' : 'grayscale'}`}>
        <img className="w-full h-full object-cover" data-alt="A real estate listing image." src={listing.image} alt={listing.title} />
        <div className={`absolute top-2 left-2 px-2 py-1 rounded text-xs font-label-bold ${listing.visible ? 'bg-white text-trust-navy' : 'bg-surface-variant text-on-surface'}`}>{listing.status}</div>
      </div>
      <div className="flex-1 flex flex-col justify-between">
        <div>
          <h4 className={`font-headline-md text-headline-md mb-1 ${listing.visible ? 'text-trust-navy' : 'text-on-surface-variant'}`}>{listing.title}</h4>
          <p className="font-body-sm text-body-sm text-on-surface-variant mb-2 line-clamp-1">{listing.location}</p>
          <p className={`font-price-display text-price-display ${listing.visible ? 'text-trust-navy' : 'text-on-surface-variant'}`}>{listing.price}</p>
        </div>
        {listing.visible && (
          <div className="flex items-center gap-4 mt-4 md:mt-0 font-body-sm text-body-sm text-on-surface-variant">
            <span className="flex items-center gap-1"><MaterialIcon className="text-sm">visibility</MaterialIcon> {listing.views}</span>
            <span className="flex items-center gap-1"><MaterialIcon className="text-sm">favorite</MaterialIcon> {listing.favorites}</span>
          </div>
        )}
      </div>
      <div className="flex md:flex-col justify-between md:justify-start items-end gap-4 shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-body-sm text-body-sm text-on-surface-variant">{listing.visible ? 'Hiển thị' : 'Ẩn'}</span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input defaultChecked={listing.visible} className="sr-only peer" type="checkbox" value="" />
            <div className="w-11 h-6 bg-surface-variant peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-success-green"></div>
          </label>
        </div>
        {listing.visible && (
          <div className="flex gap-2">
            <button className="p-2 text-primary hover:bg-primary-fixed rounded-lg transition-colors"><MaterialIcon>edit</MaterialIcon></button>
            <button className="p-2 text-error hover:bg-error-container rounded-lg transition-colors"><MaterialIcon>delete</MaterialIcon></button>
          </div>
        )}
      </div>
    </div>
  );
}
