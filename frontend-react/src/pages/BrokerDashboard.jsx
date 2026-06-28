import { useEffect, useMemo, useState } from 'react';
import { BarChart, DonutChart, HorizontalBarChart } from '../components/Charts.jsx';
import MaterialIcon from '../components/MaterialIcon.jsx';
import AdminLayout from '../layouts/AdminLayout.jsx';
import LoginPage from './LoginPage.jsx';
import {
  createProperty,
  deleteProperty,
  fetchBrokerDashboard,
  fetchCurrentUser,
  uploadCurrentUserAvatar,
  uploadPropertyImage,
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
  coverUrl: '',
  coverFile: null,
  coverPreview: '',
  galleryFiles: [],
  galleryPreviews: [],
};

export default function BrokerDashboard({ session, onLogin, onLogout, currentPath = '/broker/dashboard', section = 'dashboard' }) {
  const [profile, setProfile] = useState(null);
  const [profileForm, setProfileForm] = useState({ fullName: '', phone: '' });
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState('');
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
        setAvatarPreview(profileData.avatarUrl || '');
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

  const statusChart = useMemo(() => chartBy(stats.listings, (listing) => listing.statusLabel || 'Đang hiển thị'), [stats.listings]);
  const categoryChart = useMemo(() => chartBy(stats.listings, (listing) => categoryLabel(listing.category)), [stats.listings]);
  const viewChart = useMemo(() => stats.listings.slice(0, 5).map((listing) => ({
    label: shortLabel(listing.title),
    value: Math.max(32, listing.title.length * 3),
  })), [stats.listings]);
  const profileChart = useMemo(() => ([
    { label: 'Đã hoàn tất', value: profileReady ? 1 : 0, color: '#22C55E' },
    { label: 'Cần bổ sung', value: profileReady ? 0 : 1, color: '#F97316' },
  ]), [profileReady]);

  if (!session) return <LoginPage onLogin={onLogin} />;
  if (session.role !== 'BROKER') {
    return <AccessDenied session={session} onLogout={onLogout} activePath={currentPath} />;
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
      let nextProfile = await updateCurrentProfile(session.token, profileForm);
      if (avatarFile) {
        const avatarProfile = await uploadCurrentUserAvatar(session.token, avatarFile);
        nextProfile = { ...nextProfile, ...avatarProfile };
      }
      setProfile(nextProfile);
      setAvatarFile(null);
      setAvatarPreview(nextProfile.avatarUrl || '');
      setNotice('Đã cập nhật hồ sơ môi giới.');
    } catch (exception) {
      setError(exception.message || 'Không cập nhật được hồ sơ.');
    } finally {
      setSaving(false);
    }
  }

  function handleAvatarChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(objectUrlFor(file));
  }

  async function saveListing(event) {
    event.preventDefault();
    if (!profileReady) {
      setError('Bạn cần cập nhật họ tên và số điện thoại môi giới trước khi đăng tin.');
      return;
    }
    const selectedImageCount = (listingForm.coverFile || listingForm.coverUrl ? 1 : 0) + listingForm.galleryFiles.length;
    if (!editing && (selectedImageCount < 5 || selectedImageCount > 7)) {
      setError('Tin mới cần tổng cộng 5-7 ảnh, gồm 1 ảnh đại diện và 4-6 ảnh bổ sung.');
      return;
    }
    if (listingForm.galleryFiles.length > 6) {
      setError('Chỉ chọn tối đa 6 ảnh bổ sung để tổng ảnh không vượt quá 7.');
      return;
    }
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const payload = propertyPayload(listingForm);
      let savedProperty;
      if (editing) {
        savedProperty = await updateProperty(session.token, listingForm.id, payload);
        setNotice('Đã cập nhật tin đăng.');
      } else {
        savedProperty = await createProperty(session.token, payload);
        setNotice('Đã đăng tin mới.');
      }
      let coverUrl = listingForm.coverUrl;
      if (listingForm.coverFile) {
        const coverMedia = await uploadPropertyImage(session.token, savedProperty.id, listingForm.coverFile, true);
        coverUrl = coverMedia.url;
      }
      for (const file of listingForm.galleryFiles) {
        await uploadPropertyImage(session.token, savedProperty.id, file, false);
      }
      if (coverUrl && coverUrl !== payload.attributes.image) {
        await updateProperty(session.token, savedProperty.id, {
          ...payload,
          attributes: { ...payload.attributes, image: coverUrl },
        });
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
      coverUrl: property.image || '',
      coverFile: null,
      coverPreview: '',
      galleryFiles: [],
      galleryPreviews: [],
    });
  }

  function handleCoverChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setListingForm((current) => ({
      ...current,
      coverFile: file,
      coverPreview: objectUrlFor(file),
    }));
  }

  function handleGalleryChange(event) {
    const selectedFiles = Array.from(event.target.files || []);
    const files = selectedFiles.slice(0, 6);
    if (selectedFiles.length > 6) {
      setError('Chỉ chọn tối đa 6 ảnh bổ sung để tổng ảnh không vượt quá 7.');
    }
    setListingForm((current) => ({
      ...current,
      galleryFiles: files,
      galleryPreviews: files.map(objectUrlFor),
    }));
  }

  return (
    <AdminLayout session={session} onLogout={onLogout} variant="broker" activePath={currentPath}>
      <main className="flex-1 md:ml-64 p-margin-mobile md:p-margin-desktop w-full max-w-container-max mx-auto">
        <header className="mb-stack-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="font-headline-xl-mobile md:font-headline-xl text-headline-xl-mobile md:text-headline-xl text-trust-navy">{brokerTitle(section)}</h1>
            <p className="font-body-md text-body-md text-on-surface-variant mt-2">{brokerSubtitle(section)}</p>
          </div>
          {section === 'properties' && (
            <button className="bg-primary text-white font-label-bold text-label-bold px-6 py-3 rounded flex items-center gap-2 hover:bg-primary-container transition-colors shadow-sm" onClick={() => document.getElementById('listing-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
              <MaterialIcon className="text-sm">add</MaterialIcon>
              Đăng tin mới
            </button>
          )}
          {section === 'profile' && (
            <a className="bg-primary text-white font-label-bold text-label-bold px-6 py-3 rounded flex items-center gap-2 hover:bg-primary-container transition-colors shadow-sm" href="#/broker/properties">
              <MaterialIcon className="text-sm">description</MaterialIcon>
              Tin đăng của tôi
            </a>
          )}
        </header>

        {notice && <div className="mb-stack-md rounded border border-success-green/40 bg-success-green/10 text-trust-navy p-3 font-body-sm text-body-sm">{notice}</div>}
        {error && <div className="mb-stack-md rounded border border-error-container bg-error-container/50 text-on-error-container p-3 font-body-sm text-body-sm">{error}</div>}

        {section === 'dashboard' && (
          <>
            <section className="grid grid-cols-1 xl:grid-cols-3 gap-gutter mb-stack-lg">
              <DonutChart title="Mức sẵn sàng hồ sơ" data={profileChart} centerLabel="trạng thái" />
              <BarChart title="Tin đăng theo danh mục" data={categoryChart} />
              <HorizontalBarChart title="Trạng thái tin đăng" data={statusChart} />
            </section>

            <section className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-gutter">
              <div className="bg-white rounded-xl shadow-sm border border-surface-variant p-6">
                <h2 className="font-headline-md text-headline-md text-trust-navy mb-2">Trạng thái hồ sơ</h2>
                <p className="font-body-sm text-body-sm text-on-surface-variant mb-stack-md">{profileReady ? 'Hồ sơ môi giới đã sẵn sàng để hiển thị trên tin đăng.' : 'Bạn cần hoàn tất họ tên và số điện thoại trước khi đăng tin.'}</p>
                <a className="inline-flex items-center gap-2 bg-trust-navy text-on-primary font-label-bold text-label-bold px-4 py-2 rounded hover:bg-primary-container transition-colors" href="#/broker/profile">
                  <MaterialIcon className="text-sm">account_circle</MaterialIcon>
                  Mở hồ sơ
                </a>
              </div>
              <div className="grid grid-cols-1 gap-gutter">
                <HorizontalBarChart title="Lượt xem ước tính theo tin" data={viewChart.length > 0 ? viewChart : [{ label: 'Chưa có tin', value: 0 }]} />
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-surface-variant overflow-hidden xl:col-span-2">
                <div className="px-6 py-4 border-b border-surface-variant flex justify-between items-center bg-surface-bright">
                  <h3 className="font-headline-md text-headline-md text-trust-navy">Tin gần đây</h3>
                  <a className="font-label-bold text-label-bold text-primary hover:text-action-orange" href="#/broker/properties">Xem tất cả</a>
                </div>
                <div className="divide-y divide-surface-variant">
                  {stats.listings.length === 0 && (
                    <div className="p-8 text-center text-on-surface-variant font-body-sm text-body-sm">Bạn chưa có tin đăng nào.</div>
                  )}
                  {stats.listings.slice(0, 3).map((listing) => (
                    <a key={listing.id} className="p-4 flex items-center gap-4 hover:bg-surface-container-low" href="#/broker/properties">
                      <img className="w-20 h-16 rounded object-cover shrink-0" src={listing.image} alt={listing.title} />
                      <div className="min-w-0 flex-1">
                        <div className="font-label-bold text-label-bold text-trust-navy truncate">{listing.title}</div>
                        <div className="font-body-sm text-body-sm text-on-surface-variant truncate">{listing.priceLabel}</div>
                      </div>
                      <span className="font-body-sm text-body-sm text-on-surface-variant">{listing.statusLabel}</span>
                    </a>
                  ))}
                </div>
              </div>
            </section>
          </>
        )}

        {section === 'profile' && (
          <form className="bg-white rounded-xl shadow-sm border border-surface-variant p-6 max-w-2xl" onSubmit={saveProfile}>
            <h2 className="font-headline-md text-headline-md text-trust-navy mb-2">Hồ sơ môi giới</h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant mb-stack-md">Cập nhật hồ sơ trước khi đăng tin. Số điện thoại sẽ hiển thị để khách liên hệ trực tiếp.</p>
            <div className="space-y-stack-md">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                {avatarPreview ? (
                  <img className="w-24 h-24 rounded-full object-cover border-2 border-primary" src={avatarPreview} alt="Ảnh đại diện môi giới" />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-primary text-on-primary flex items-center justify-center">
                    <MaterialIcon filled className="text-4xl">badge</MaterialIcon>
                  </div>
                )}
                <Field label="Ảnh đại diện môi giới" className="flex-1">
                  <input className="input bg-white" type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={handleAvatarChange} />
                </Field>
              </div>
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
        )}

        {section === 'properties' && (
          <>
            <form id="listing-form" className={`bg-white rounded-xl shadow-sm border p-6 mb-stack-lg ${profileReady ? 'border-surface-variant' : 'border-action-orange/60'}`} onSubmit={saveListing}>
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
                  Vui lòng hoàn tất hồ sơ môi giới trước khi đăng tin. <a className="font-label-bold text-primary" href="#/broker/profile">Mở hồ sơ</a>
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
                <Field label="Ảnh đại diện" className="md:col-span-2">
                  <input className="input bg-white" type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={handleCoverChange} />
                  {(listingForm.coverPreview || listingForm.coverUrl) && (
                    <div className="mt-3 w-full max-w-sm h-44 rounded-lg overflow-hidden border border-outline-variant">
                      <img className="w-full h-full object-cover" src={listingForm.coverPreview || listingForm.coverUrl} alt="Ảnh đại diện tin đăng" />
                    </div>
                  )}
                </Field>
                <Field label="Ảnh bổ sung (4-6 ảnh)" className="md:col-span-2">
                  <input className="input bg-white" type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple onChange={handleGalleryChange} />
                  {listingForm.galleryPreviews.length > 0 && (
                    <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-3">
                      {listingForm.galleryPreviews.map((preview, index) => (
                        <img key={preview} className="h-28 w-full rounded-lg object-cover border border-outline-variant" src={preview} alt={`Ảnh bổ sung ${index + 1}`} />
                      ))}
                    </div>
                  )}
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
          </>
        )}
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

function brokerTitle(section) {
  return {
    dashboard: 'Bảng điều khiển',
    profile: 'Hồ sơ môi giới',
    properties: 'Tin đăng của tôi',
  }[section] || 'Bảng điều khiển';
}

function brokerSubtitle(section) {
  return {
    dashboard: 'Theo dõi nhanh số lượng tin, trạng thái hồ sơ và các tin gần đây.',
    profile: 'Cập nhật thông tin liên hệ hiển thị trên các tin đăng của bạn.',
    properties: 'Đăng tin mới, chỉnh sửa, xóa và cập nhật trạng thái tin của bạn.',
  }[section] || 'Theo dõi nhanh hoạt động môi giới của bạn.';
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

function AccessDenied({ session, onLogout, activePath }) {
  return (
    <AdminLayout session={session} onLogout={onLogout} variant="broker" activePath={activePath}>
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
  if (form.coverUrl?.trim()) attributes.image = form.coverUrl.trim();

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

function chartBy(items, getLabel) {
  const counts = new Map();
  items.forEach((item) => {
    const label = getLabel(item);
    counts.set(label, (counts.get(label) || 0) + 1);
  });
  const result = [...counts.entries()].map(([label, value]) => ({ label, value }));
  return result.length > 0 ? result : [{ label: 'Chưa có dữ liệu', value: 0 }];
}

function categoryLabel(category) {
  if (category === 'tro') return 'Trọ';
  if (category === 'dat') return 'Đất';
  if (category === 'nha') return 'Nhà';
  return category || 'Khác';
}

function shortLabel(value) {
  return value.length > 22 ? `${value.slice(0, 22)}...` : value;
}

function objectUrlFor(file) {
  if (typeof URL !== 'undefined' && URL.createObjectURL && file) {
    return URL.createObjectURL(file);
  }
  return '';
}
