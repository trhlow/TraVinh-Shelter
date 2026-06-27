import { useEffect, useMemo, useState } from 'react';
import MaterialIcon from '../components/MaterialIcon.jsx';
import AdminLayout from '../layouts/AdminLayout.jsx';
import LoginPage from './LoginPage.jsx';
import {
  createProperty,
  deleteProperty,
  fetchBrokerDashboard,
  fetchCurrentUser,
  updateCurrentProfile,
  updateProperty,
  updatePropertyStatus,
} from '../services/api.js';

const EMPTY_FORM = {
  id: '',
  title: '',
  categorySlug: 'tro',
  transaction: 'rent',
  address: '',
  ward: 'phuong-6',
  price: '',
  area: '',
  bedrooms: '',
  bathrooms: '',
  houseType: 'tret',
  description: '',
  image: '',
};

export default function BrokerDashboard({ session, onLogin, onLogout }) {
  const [profile, setProfile] = useState(null);
  const [profileForm, setProfileForm] = useState({ fullName: '', phone: '' });
  const [stats, setStats] = useState({ activeListings: 0, totalListings: 0, pendingLeads: 0, listings: [] });
  const [listingForm, setListingForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const profileReady = Boolean((profile?.fullName || profileForm.fullName).trim() && (profile?.phone || profileForm.phone).trim());
  const editing = Boolean(listingForm.id);

  useEffect(() => {
    if (!session?.token || session.role !== 'BROKER') return;
    let alive = true;
    setLoading(true);
    Promise.all([
      fetchCurrentUser(session.token),
      fetchBrokerDashboard(session.token),
    ])
      .then(([profileData, dashboardData]) => {
        if (!alive) return;
        setProfile(profileData);
        setProfileForm({ fullName: profileData.fullName || '', phone: profileData.phone || '' });
        setStats(dashboardData);
      })
      .catch((exception) => {
        if (alive) setError(exception.message || 'Không tải được dashboard môi giới.');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [session]);

  const totalViews = useMemo(() => stats.listings.length * 137, [stats.listings.length]);

  if (!session) return <LoginPage onLogin={onLogin} />;
  if (session.role !== 'BROKER') {
    return <AccessDenied session={session} onLogout={onLogout} />;
  }

  async function reloadDashboard() {
    const dashboardData = await fetchBrokerDashboard(session.token);
    setStats(dashboardData);
  }

  async function saveProfile(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const nextProfile = await updateCurrentProfile(session.token, profileForm);
      setProfile(nextProfile);
      setNotice('Đã cập nhật hồ sơ môi giới.');
    } catch (exception) {
      setError(exception.message || 'Không cập nhật được hồ sơ.');
    } finally {
      setSaving(false);
    }
  }

  async function saveListing(event) {
    event.preventDefault();
    if (!profileReady) {
      setError('Bạn cần cập nhật họ tên và số điện thoại môi giới trước khi đăng tin.');
      return;
    }
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const payload = propertyPayload(listingForm);
      if (editing) {
        await updateProperty(session.token, listingForm.id, payload);
        setNotice('Đã cập nhật tin đăng.');
      } else {
        await createProperty(session.token, payload);
        setNotice('Đã đăng tin mới.');
      }
      setListingForm(EMPTY_FORM);
      await reloadDashboard();
    } catch (exception) {
      setError(exception.message || 'Không lưu được tin đăng.');
    } finally {
      setSaving(false);
    }
  }

  async function removeListing(propertyId) {
    if (!window.confirm('Xóa tin đăng này?')) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await deleteProperty(session.token, propertyId);
      setNotice('Đã xóa tin đăng.');
      await reloadDashboard();
    } catch (exception) {
      setError(exception.message || 'Không xóa được tin đăng.');
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(propertyId, status) {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await updatePropertyStatus(session.token, propertyId, status);
      setNotice('Đã cập nhật trạng thái tin.');
      await reloadDashboard();
    } catch (exception) {
      setError(exception.message || 'Không cập nhật được trạng thái.');
    } finally {
      setSaving(false);
    }
  }

  function editListing(property) {
    setListingForm({
      id: property.id,
      title: property.title,
      categorySlug: property.category,
      transaction: property.transaction,
      address: property.address,
      ward: property.ward || 'all',
      price: String(Math.round(property.rawPrice || 0)),
      area: property.area ? String(property.area) : '',
      bedrooms: property.bedrooms ? String(property.bedrooms) : '',
      bathrooms: property.bathrooms ? String(property.bathrooms) : '',
      houseType: property.houseType || 'tret',
      description: property.description || '',
      image: property.image || '',
    });
  }

  return (
    <AdminLayout session={session} onLogout={onLogout} variant="broker">
      <main className="flex-1 md:ml-64 p-margin-mobile md:p-margin-desktop w-full max-w-container-max mx-auto">
        <header className="mb-stack-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="font-headline-xl-mobile md:font-headline-xl text-headline-xl-mobile md:text-headline-xl text-trust-navy">Tin đăng của tôi</h1>
            <p className="font-body-md text-body-md text-on-surface-variant mt-2">Quản lý hồ sơ môi giới, đăng tin mới, chỉnh sửa và xóa tin của bạn.</p>
          </div>
          <button className="bg-primary text-white font-label-bold text-label-bold px-6 py-3 rounded flex items-center gap-2 hover:bg-primary-container transition-colors shadow-sm" onClick={() => document.getElementById('listing-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
            <MaterialIcon className="text-sm">add</MaterialIcon>
            Đăng tin mới
          </button>
        </header>

        {notice && <div className="mb-stack-md rounded border border-success-green/40 bg-success-green/10 text-trust-navy p-3 font-body-sm text-body-sm">{notice}</div>}
        {error && <div className="mb-stack-md rounded border border-error-container bg-error-container/50 text-on-error-container p-3 font-body-sm text-body-sm">{error}</div>}

        <section className="grid grid-cols-1 md:grid-cols-3 gap-gutter mb-stack-lg">
          <StatCard icon="list_alt" label="Tin đang hiển thị" value={stats.activeListings} className="text-primary bg-primary-fixed" />
          <StatCard icon="inventory_2" label="Tổng tin của tôi" value={stats.totalListings} className="text-primary bg-surface-tint/20" />
          <StatCard icon="visibility" label="Lượt xem ước tính" value={totalViews.toLocaleString('vi-VN')} className="text-success-green bg-success-green/20" />
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-gutter mb-stack-lg">
          <form className="bg-white rounded-xl shadow-sm border border-surface-variant p-6 h-fit" onSubmit={saveProfile}>
            <h2 className="font-headline-md text-headline-md text-trust-navy mb-2">Hồ sơ môi giới</h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant mb-stack-md">Cập nhật hồ sơ trước khi đăng tin. Số điện thoại sẽ hiển thị để khách liên hệ trực tiếp.</p>
            <div className="space-y-stack-md">
              <Field label="Họ tên">
                <input className="w-full bg-surface-container-low border border-outline-variant rounded p-2 font-body-sm text-body-sm focus:border-trust-navy focus:ring-1 focus:ring-trust-navy" value={profileForm.fullName} onChange={(event) => setProfileForm((current) => ({ ...current, fullName: event.target.value }))} required />
              </Field>
              <Field label="Số điện thoại">
                <input className="w-full bg-surface-container-low border border-outline-variant rounded p-2 font-body-sm text-body-sm focus:border-trust-navy focus:ring-1 focus:ring-trust-navy" value={profileForm.phone} onChange={(event) => setProfileForm((current) => ({ ...current, phone: event.target.value }))} required />
              </Field>
              <button className="w-full bg-trust-navy text-on-primary font-label-bold text-label-bold py-2 rounded hover:bg-primary-container transition-colors disabled:opacity-60" disabled={saving}>
                Lưu hồ sơ
              </button>
            </div>
          </form>

          <form id="listing-form" className={`bg-white rounded-xl shadow-sm border p-6 ${profileReady ? 'border-surface-variant' : 'border-action-orange/60'}`} onSubmit={saveListing}>
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 mb-stack-md">
              <div>
                <h2 className="font-headline-md text-headline-md text-trust-navy">{editing ? 'Chỉnh sửa tin' : 'Đăng tin mới'}</h2>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">Tin sẽ lấy số điện thoại từ hồ sơ môi giới của bạn.</p>
              </div>
              {editing && (
                <button className="text-primary border border-primary px-4 py-2 rounded font-label-bold text-label-bold hover:bg-surface-container-low" type="button" onClick={() => setListingForm(EMPTY_FORM)}>
                  Hủy sửa
                </button>
              )}
            </div>
            {!profileReady && (
              <div className="mb-stack-md rounded border border-action-orange/40 bg-secondary-fixed/40 text-on-secondary-container p-3 font-body-sm text-body-sm">
                Vui lòng hoàn tất hồ sơ môi giới trước khi đăng tin.
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Tiêu đề">
                <input className="input" value={listingForm.title} onChange={(event) => setListingValue('title', event.target.value, setListingForm)} required />
              </Field>
              <Field label="Danh mục">
                <select className="input" value={listingForm.categorySlug} onChange={(event) => {
                  const categorySlug = event.target.value;
                  setListingForm((current) => ({ ...current, categorySlug, transaction: categorySlug === 'tro' ? 'rent' : current.transaction }));
                }}>
                  <option value="tro">Trọ</option>
                  <option value="nha">Nhà</option>
                  <option value="dat">Đất</option>
                </select>
              </Field>
              {listingForm.categorySlug !== 'tro' && (
                <Field label="Nhu cầu">
                  <select className="input" value={listingForm.transaction} onChange={(event) => setListingValue('transaction', event.target.value, setListingForm)}>
                    <option value="sale">Mua bán</option>
                    <option value="rent">Cho thuê</option>
                  </select>
                </Field>
              )}
              <Field label="Khu vực">
                <select className="input" value={listingForm.ward} onChange={(event) => setListingValue('ward', event.target.value, setListingForm)}>
                  <option value="phuong-6">Phường 6</option>
                  <option value="phuong-7">Phường 7</option>
                  <option value="cau-ngang">Cầu Ngang</option>
                  <option value="chau-thanh">Châu Thành</option>
                  <option value="long-duc">Long Đức</option>
                </select>
              </Field>
              <Field label="Địa chỉ">
                <input className="input" value={listingForm.address} onChange={(event) => setListingValue('address', event.target.value, setListingForm)} required />
              </Field>
              <Field label="Giá (VNĐ)">
                <input className="input" type="number" min="0" value={listingForm.price} onChange={(event) => setListingValue('price', event.target.value, setListingForm)} required />
              </Field>
              <Field label="Diện tích (m²)">
                <input className="input" type="number" min="0" value={listingForm.area} onChange={(event) => setListingValue('area', event.target.value, setListingForm)} />
              </Field>
              {listingForm.categorySlug === 'nha' && listingForm.transaction === 'rent' && (
                <Field label="Loại nhà">
                  <select className="input" value={listingForm.houseType} onChange={(event) => setListingValue('houseType', event.target.value, setListingForm)}>
                    <option value="tret">Trệt</option>
                    <option value="lau">Lầu</option>
                  </select>
                </Field>
              )}
              <Field label="Phòng ngủ">
                <input className="input" type="number" min="0" value={listingForm.bedrooms} onChange={(event) => setListingValue('bedrooms', event.target.value, setListingForm)} />
              </Field>
              <Field label="Phòng tắm">
                <input className="input" type="number" min="0" value={listingForm.bathrooms} onChange={(event) => setListingValue('bathrooms', event.target.value, setListingForm)} />
              </Field>
              <Field label="Ảnh đại diện">
                <input className="input" value={listingForm.image} onChange={(event) => setListingValue('image', event.target.value, setListingForm)} />
              </Field>
              <Field label="Mô tả" className="md:col-span-2">
                <textarea className="input min-h-28" value={listingForm.description} onChange={(event) => setListingValue('description', event.target.value, setListingForm)} />
              </Field>
            </div>
            <button className="mt-stack-md bg-primary text-white font-label-bold text-label-bold px-6 py-3 rounded flex items-center gap-2 hover:bg-primary-container transition-colors shadow-sm disabled:opacity-60" disabled={saving || !profileReady}>
              <MaterialIcon className="text-sm">{editing ? 'save' : 'add'}</MaterialIcon>
              {editing ? 'Lưu chỉnh sửa' : 'Đăng tin'}
            </button>
          </form>
        </section>

        <section className="bg-white rounded-xl shadow-sm border border-surface-variant overflow-hidden">
          <div className="px-6 py-4 border-b border-surface-variant flex justify-between items-center bg-surface-bright">
            <h3 className="font-headline-md text-headline-md text-trust-navy">Danh sách hiện tại</h3>
            <span className="font-body-sm text-body-sm text-on-surface-variant">{loading ? 'Đang tải' : `${stats.listings.length} tin`}</span>
          </div>
          <div className="divide-y divide-surface-variant">
            {stats.listings.length === 0 && (
              <div className="p-8 text-center text-on-surface-variant font-body-sm text-body-sm">Bạn chưa có tin đăng nào.</div>
            )}
            {stats.listings.map((listing) => (
              <ListingRow key={listing.id} listing={listing} onEdit={editListing} onDelete={removeListing} onStatus={changeStatus} saving={saving} />
            ))}
          </div>
        </section>
      </main>
    </AdminLayout>
  );
}

function Field({ label, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="font-label-bold text-label-bold block mb-2 text-trust-navy">{label}</span>
      {children}
    </label>
  );
}

function StatCard({ icon, label, value, className }) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-surface-variant flex items-center justify-between">
      <div>
        <p className="font-body-sm text-body-sm text-on-surface-variant mb-1">{label}</p>
        <p className="font-headline-lg text-headline-lg text-trust-navy">{value}</p>
      </div>
      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${className}`}>
        <MaterialIcon filled>{icon}</MaterialIcon>
      </div>
    </div>
  );
}

function ListingRow({ listing, onEdit, onDelete, onStatus, saving }) {
  return (
    <div className="p-6 flex flex-col md:flex-row gap-6 hover:bg-surface-container-low transition-colors">
      <div className="w-full md:w-48 h-32 rounded-lg overflow-hidden relative shrink-0">
        <img className="w-full h-full object-cover" data-alt="A real estate listing image." src={listing.image} alt={listing.title} />
        <div className="absolute top-2 left-2 px-2 py-1 rounded text-xs font-label-bold bg-white text-trust-navy">{listing.statusLabel}</div>
      </div>
      <div className="flex-1 flex flex-col justify-between">
        <div>
          <h4 className="font-headline-md text-headline-md mb-1 text-trust-navy">{listing.title}</h4>
          <p className="font-body-sm text-body-sm text-on-surface-variant mb-2 line-clamp-1">{listing.address}</p>
          <p className="font-price-display text-price-display text-trust-navy">{listing.priceLabel}</p>
        </div>
        <div className="flex flex-wrap items-center gap-4 mt-4 font-body-sm text-body-sm text-on-surface-variant">
          <span className="flex items-center gap-1"><MaterialIcon className="text-sm">straighten</MaterialIcon> {listing.area || 0}m²</span>
          <span className="flex items-center gap-1"><MaterialIcon className="text-sm">visibility</MaterialIcon> {Math.max(32, listing.title.length * 3)}</span>
        </div>
      </div>
      <div className="flex md:flex-col justify-between md:justify-start items-end gap-3 shrink-0">
        <select className="bg-surface-container-low border border-outline-variant rounded p-2 font-body-sm text-body-sm focus:border-trust-navy focus:ring-1 focus:ring-trust-navy" value={listing.rawStatus} onChange={(event) => onStatus(listing.id, event.target.value)} disabled={saving}>
          <option value="AVAILABLE">Đang hiển thị</option>
          <option value="RENTED">Đã thuê</option>
          <option value="SOLD">Đã bán</option>
        </select>
        <div className="flex gap-2">
          <button className="p-2 text-primary hover:bg-primary-fixed rounded transition-colors" onClick={() => onEdit(listing)} disabled={saving} aria-label="Chỉnh sửa tin">
            <MaterialIcon>edit</MaterialIcon>
          </button>
          <button className="p-2 text-error hover:bg-error-container rounded transition-colors" onClick={() => onDelete(listing.id)} disabled={saving} aria-label="Xóa tin">
            <MaterialIcon>delete</MaterialIcon>
          </button>
        </div>
      </div>
    </div>
  );
}

function AccessDenied({ session, onLogout }) {
  return (
    <AdminLayout session={session} onLogout={onLogout} variant="broker">
      <main className="flex-1 md:ml-64 p-margin-mobile md:p-margin-desktop w-full max-w-container-max mx-auto">
        <section className="bg-white rounded-xl border border-outline-variant p-stack-lg">
          <h1 className="font-headline-lg text-headline-lg text-trust-navy mb-2">Không có quyền môi giới</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">Chỉ tài khoản môi giới do admin cấp mới được đăng và quản lý tin.</p>
        </section>
      </main>
    </AdminLayout>
  );
}

function propertyPayload(form) {
  const attributes = {
    transaction: form.categorySlug === 'tro' ? 'rent' : form.transaction,
    ward: form.ward,
    area: numericOrNull(form.area),
    bedrooms: numericOrNull(form.bedrooms),
    bathrooms: numericOrNull(form.bathrooms),
    description: form.description,
  };
  if (form.categorySlug === 'nha' && form.transaction === 'rent') {
    attributes.houseType = form.houseType;
  }
  if (form.image.trim()) attributes.image = form.image.trim();

  return {
    categorySlug: form.categorySlug,
    title: form.title.trim(),
    address: form.address.trim(),
    price: Number(form.price || 0),
    attributes,
  };
}

function numericOrNull(value) {
  if (value === '' || value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function setListingValue(name, value, setListingForm) {
  setListingForm((current) => ({ ...current, [name]: value }));
}
