import { useEffect, useMemo, useState } from 'react';
import { BarChart, DonutChart, HorizontalBarChart } from '../components/Charts.jsx';
import { DashboardPageHeader, DashboardPanel, LoadingRows, StateBlock, StatusBadge } from '../components/DashboardWidgets.jsx';
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
  const [listingQuery, setListingQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const listings = stats.listings || [];
  const filteredListings = useMemo(() => listings.filter((listing) => listingMatchesQuery(listing, listingQuery)), [listings, listingQuery]);
  const visibleListings = useMemo(() => filteredListings.filter((listing) => listing.rawStatus !== 'HIDDEN'), [filteredListings]);
  const hiddenListings = useMemo(() => filteredListings.filter((listing) => listing.rawStatus === 'HIDDEN'), [filteredListings]);
  const profileReady = Boolean((profile?.fullName || profileForm.fullName).trim() && (profile?.phone || profileForm.phone).trim());
  const editing = Boolean(listingForm.id);

  useEffect(() => {
    if (!session?.token || session.role !== 'BROKER') return;
    let alive = true;
    setLoading(true);
    setError('');
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

  const dashboardStats = useMemo(() => {
    const totalListings = listings.length || stats.totalListings || 0;
    const activeListings = listings.filter(isAvailableListing).length || stats.activeListings || 0;
    const pendingListings = listings.filter(isPendingListing).length;
    const estimatedViews = listings.reduce((sum, listing) => sum + listingViews(listing), 0);
    return {
      totalListings,
      activeListings,
      pendingListings,
      estimatedViews,
      leads: stats.pendingLeads || Math.max(0, totalListings * 2),
    };
  }, [listings, stats]);

  const statusChart = useMemo(() => chartBy(listings, (listing) => listing.statusLabel || 'Đang hiển thị'), [listings]);
  const categoryChart = useMemo(() => chartBy(listings, (listing) => categoryLabel(listing.category)), [listings]);
  const viewChart = useMemo(() => listings.slice(0, 6).map((listing) => ({
    label: shortLabel(listing.title),
    value: listingViews(listing),
  })), [listings]);
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
      categorySlug: toFormCategory(property.category),
      transaction: property.transaction || 'rent',
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
    window.setTimeout(() => document.getElementById('listing-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
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
      <main className="dashboard-main">
        <div className="mb-stack-lg flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <DashboardPageHeader
            activePath={currentPath}
            loading={loading}
            subtitle={brokerSubtitle(section)}
            tabs={brokerTabs(dashboardStats, profileReady)}
            title={brokerTitle(section)}
          />
          {section === 'properties' && (
            <button className="ui-action" onClick={() => document.getElementById('listing-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' })} type="button">
              <MaterialIcon className="text-sm">add</MaterialIcon>
              Đăng tin mới
            </button>
          )}
          {section === 'profile' && (
            <a className="ui-action" href="#/broker/properties">
              <MaterialIcon className="text-sm">description</MaterialIcon>
              Tin đăng của tôi
            </a>
          )}
        </div>

        {notice && <div className="mb-stack-md rounded border border-success-green/40 bg-success-green/10 p-3 font-body-sm text-body-sm text-on-surface">{notice}</div>}
        {error && <div className="mb-stack-md rounded border border-error-container bg-error-container/50 p-3 font-body-sm text-body-sm text-on-error-container">{error}</div>}

        {section === 'dashboard' && (
          <>
            <section className="mb-stack-lg grid grid-cols-1 gap-gutter xl:grid-cols-3">
              <DonutChart title="Mức sẵn sàng hồ sơ" data={profileChart} centerLabel="trạng thái" />
              <BarChart title="Tin đăng theo danh mục" data={categoryChart} />
              <HorizontalBarChart title="Trạng thái tin đăng" data={statusChart} />
            </section>

            <section className="grid grid-cols-1 gap-gutter xl:grid-cols-[360px_1fr]">
              <DashboardPanel title="Trạng thái hồ sơ" count={profileReady ? 'Đủ thông tin liên hệ' : 'Cần bổ sung'}>
                <ProfileSummary profile={profile} profileForm={profileForm} avatarPreview={avatarPreview} profileReady={profileReady} />
              </DashboardPanel>
              <DashboardPanel title="Hiệu suất tin gần đây" count={`${viewChart.length} tin`}>
                <div className="p-5">
                  <MiniBarList data={viewChart.length > 0 ? viewChart : [{ label: 'Chưa có tin', value: 0 }]} />
                </div>
              </DashboardPanel>
              <DashboardPanel title="Tin gần đây" count={`${listings.slice(0, 4).length} tin mới`} className="xl:col-span-2">
                <RecentListings listings={listings} loading={loading} />
              </DashboardPanel>
            </section>
          </>
        )}

        {section === 'profile' && (
          <section className="grid grid-cols-1 gap-gutter xl:grid-cols-[360px_1fr]">
            <DashboardPanel title="Hồ sơ đang hiển thị" count={profileReady ? 'Sẵn sàng đăng tin' : 'Cần cập nhật'}>
              <ProfileSummary profile={profile} profileForm={profileForm} avatarPreview={avatarPreview} profileReady={profileReady} />
            </DashboardPanel>
            <form className="ui-panel p-5" onSubmit={saveProfile}>
              <h2 className="font-headline-md text-headline-md text-trust-navy">Cập nhật hồ sơ môi giới</h2>
              <p className="mb-stack-md mt-2 font-body-sm text-body-sm text-on-surface-variant">Số điện thoại và tên môi giới sẽ hiển thị trên các tin đăng để khách liên hệ trực tiếp.</p>
              <div className="space-y-stack-md">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  {avatarPreview ? (
                    <img className="h-24 w-24 rounded-full border-2 border-primary object-cover" src={avatarPreview} alt="Ảnh đại diện môi giới" />
                  ) : (
                    <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary text-on-primary">
                      <MaterialIcon filled className="text-4xl">badge</MaterialIcon>
                    </div>
                  )}
                  <Field label="Ảnh đại diện môi giới" className="flex-1">
                    <input className="input" type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={handleAvatarChange} />
                  </Field>
                </div>
                <Field label="Họ tên">
                  <input className="input" value={profileForm.fullName} onChange={(event) => setProfileForm((current) => ({ ...current, fullName: event.target.value }))} required />
                </Field>
                <Field label="Số điện thoại">
                  <input className="input" value={profileForm.phone} onChange={(event) => setProfileForm((current) => ({ ...current, phone: event.target.value }))} required />
                </Field>
                <button className="ui-action w-full disabled:opacity-60" disabled={saving}>
                  <MaterialIcon className="text-sm">save</MaterialIcon>
                  Lưu hồ sơ
                </button>
              </div>
            </form>
          </section>
        )}

        {section === 'properties' && (
          <>
            <form id="listing-form" className={`ui-panel mb-stack-lg p-5 ${profileReady ? '' : 'ring-1 ring-action-orange/60'}`} onSubmit={saveListing}>
              <div className="mb-stack-md flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <h2 className="font-headline-md text-headline-md text-trust-navy">{editing ? 'Chỉnh sửa tin' : 'Đăng tin mới'}</h2>
                  <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">Tin sẽ dùng thông tin liên hệ trong hồ sơ môi giới của bạn.</p>
                </div>
                {editing && (
                  <button className="rounded border border-primary px-4 py-2 font-label-bold text-label-bold text-primary transition-colors hover:bg-surface-container-low" type="button" onClick={() => setListingForm(EMPTY_FORM)}>
                    Hủy sửa
                  </button>
                )}
              </div>
              {!profileReady && (
                <div className="mb-stack-md rounded border border-action-orange/40 bg-secondary-fixed/40 p-3 font-body-sm text-body-sm text-on-secondary-container">
                  Vui lòng hoàn tất hồ sơ môi giới trước khi đăng tin. <a className="font-label-bold text-primary" href="#/broker/profile">Mở hồ sơ</a>
                </div>
              )}
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <Field label="Tiêu đề" className="lg:col-span-2">
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
                <Field label="Địa chỉ" className="lg:col-span-2">
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
                <Field label="Ảnh đại diện" className="lg:col-span-3">
                  <input className="input" type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={handleCoverChange} />
                  {(listingForm.coverPreview || listingForm.coverUrl) && (
                    <div className="mt-3 h-44 w-full max-w-sm overflow-hidden rounded-lg border border-outline-variant">
                      <img className="h-full w-full object-cover" src={listingForm.coverPreview || listingForm.coverUrl} alt="Ảnh đại diện tin đăng" />
                    </div>
                  )}
                </Field>
                <Field label="Ảnh bổ sung (4-6 ảnh)" className="lg:col-span-3">
                  <input className="input" type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple onChange={handleGalleryChange} />
                  {listingForm.galleryPreviews.length > 0 && (
                    <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
                      {listingForm.galleryPreviews.map((preview, index) => (
                        <img key={preview} className="h-28 w-full rounded-lg border border-outline-variant object-cover" src={preview} alt={`Ảnh bổ sung ${index + 1}`} />
                      ))}
                    </div>
                  )}
                </Field>
                <Field label="Mô tả" className="lg:col-span-3">
                  <textarea className="input min-h-28" value={listingForm.description} onChange={(event) => setListingValue('description', event.target.value, setListingForm)} />
                </Field>
              </div>
              <button className="ui-action mt-stack-md disabled:opacity-60" disabled={saving || !profileReady}>
                <MaterialIcon className="text-sm">{editing ? 'save' : 'add'}</MaterialIcon>
                {editing ? 'Lưu chỉnh sửa' : 'Đăng tin'}
              </button>
            </form>

            <div className="mb-stack-md flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <label className="relative block w-full md:max-w-md">
                <span className="sr-only">Tìm tin đăng</span>
                <MaterialIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-outline">search</MaterialIcon>
                <input
                  className="dashboard-search"
                  placeholder="Tìm theo tiêu đề, địa chỉ, giá..."
                  value={listingQuery}
                  onChange={(event) => setListingQuery(event.target.value)}
                />
              </label>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                {loading ? 'Đang tải' : `${filteredListings.length}/${listings.length} tin phù hợp`}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-gutter">
              <DashboardPanel title="Đang hoạt động hoặc đã bán" count={loading ? 'Đang tải' : `${visibleListings.length} tin`}>
                <ListingList
                  listings={visibleListings}
                  loading={loading}
                  saving={saving}
                  onEdit={editListing}
                  onDelete={removeListing}
                  onStatus={changeStatus}
                  emptyTitle="Không có tin đang hoạt động hoặc đã bán"
                  emptyDescription="Thử đổi từ khóa tìm kiếm hoặc mở lại tin đang tạm ẩn."
                />
              </DashboardPanel>
              <DashboardPanel title="Tạm ẩn" count={loading ? 'Đang tải' : `${hiddenListings.length} tin`}>
                <ListingList
                  listings={hiddenListings}
                  loading={loading}
                  saving={saving}
                  onEdit={editListing}
                  onDelete={removeListing}
                  onStatus={changeStatus}
                  emptyTitle="Không có tin tạm ẩn"
                  emptyDescription="Tin bị ẩn khỏi trang công khai sẽ được gom riêng tại đây."
                />
              </DashboardPanel>
            </div>
          </>
        )}

      </main>
    </AdminLayout>
  );
}

function ProfileSummary({ profile, profileForm, avatarPreview, profileReady }) {
  return (
    <div className="p-5">
      <div className="flex items-center gap-4">
        {avatarPreview ? (
          <img className="h-16 w-16 rounded-full border-2 border-primary object-cover" src={avatarPreview} alt="Ảnh đại diện môi giới" />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-on-primary">
            <MaterialIcon filled>badge</MaterialIcon>
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate font-headline-md text-headline-md text-on-surface">{profile?.fullName || profileForm.fullName || 'Chưa cập nhật tên'}</p>
          <p className="truncate font-body-sm text-body-sm text-on-surface-variant">{profile?.email || 'Email tài khoản'}</p>
        </div>
      </div>
      <div className="mt-5 space-y-3">
        <InfoLine icon="call" label="Số điện thoại" value={profile?.phone || profileForm.phone || 'Chưa cập nhật'} />
        <InfoLine icon="verified_user" label="Trạng thái hồ sơ" value={profileReady ? 'Sẵn sàng hiển thị' : 'Cần bổ sung'} tone={profileReady ? 'success' : 'warning'} />
      </div>
      <a className="ui-action mt-5 w-full" href="#/broker/profile">
        <MaterialIcon className="text-sm">account_circle</MaterialIcon>
        Mở hồ sơ
      </a>
    </div>
  );
}

function InfoLine({ icon, label, value, tone = 'muted' }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="flex items-center gap-2 font-body-sm text-body-sm text-on-surface-variant">
        <MaterialIcon className="text-sm">{icon}</MaterialIcon>
        {label}
      </span>
      <StatusBadge tone={tone}>{value}</StatusBadge>
    </div>
  );
}

function RecentListings({ listings, loading }) {
  if (loading) return <LoadingRows rows={3} />;
  if (listings.length === 0) return <StateBlock title="Bạn chưa có tin đăng nào" description="Tạo tin đầu tiên trong mục Tin đăng của tôi." />;
  return (
    <div className="divide-y divide-outline-variant">
      {listings.slice(0, 4).map((listing) => (
        <a key={listing.id} className="flex items-center gap-4 p-4 transition-colors hover:bg-surface-container-low" href="#/broker/properties">
          <img className="h-16 w-20 shrink-0 rounded object-cover" src={listing.image} alt={listing.title} />
          <div className="min-w-0 flex-1">
            <div className="truncate font-label-bold text-label-bold text-on-surface">{listing.title}</div>
            <div className="truncate font-body-sm text-body-sm text-on-surface-variant">{listing.priceLabel}</div>
          </div>
          <StatusBadge tone={listingStatusTone(listing)}>{listing.statusLabel}</StatusBadge>
        </a>
      ))}
    </div>
  );
}

function MiniBarList({ data }) {
  const max = Math.max(...data.map((item) => item.value), 1);
  return (
    <div className="space-y-4">
      {data.map((item) => (
        <div key={item.label}>
          <div className="mb-1 flex items-center justify-between gap-3">
            <span className="font-body-sm text-body-sm text-on-surface">{item.label}</span>
            <span className="font-label-bold text-label-bold text-trust-navy">{item.value}</span>
          </div>
          <div className="h-3 overflow-hidden rounded bg-surface-container-low">
            <div className="h-full rounded bg-action-orange" style={{ width: `${Math.max(8, (item.value / max) * 100)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function ListingList({
  listings,
  loading,
  saving,
  onEdit,
  onDelete,
  onStatus,
  emptyTitle = 'Bạn chưa có tin đăng nào',
  emptyDescription = 'Khi đăng tin mới, danh sách quản lý sẽ xuất hiện ở đây.',
}) {
  if (loading) return <LoadingRows rows={4} />;
  if (listings.length === 0) return <StateBlock title={emptyTitle} description={emptyDescription} />;
  return (
    <div className="divide-y divide-outline-variant">
      {listings.map((listing) => (
        <ListingRow key={listing.id} listing={listing} onEdit={onEdit} onDelete={onDelete} onStatus={onStatus} saving={saving} />
      ))}
    </div>
  );
}

function ListingRow({ listing, onEdit, onDelete, onStatus, saving }) {
  const hidden = listing.rawStatus === 'HIDDEN';
  return (
    <div className="flex flex-col gap-5 p-5 transition-colors hover:bg-surface-container-low md:flex-row">
      <div className="relative h-32 w-full shrink-0 overflow-hidden rounded-lg md:w-48">
        <img className="h-full w-full object-cover" data-alt="A real estate listing image." src={listing.image} alt={listing.title} />
        <div className="absolute left-2 top-2">
          <StatusBadge tone={listingStatusTone(listing)}>{listing.statusLabel}</StatusBadge>
        </div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-between">
        <div>
          <h4 className="mb-1 font-headline-md text-headline-md text-on-surface">{listing.title}</h4>
          <p className="mb-2 line-clamp-1 font-body-sm text-body-sm text-on-surface-variant">{listing.address}</p>
          <p className="font-price-display text-price-display text-trust-navy">{listing.priceLabel}</p>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-4 font-body-sm text-body-sm text-on-surface-variant">
          <span className="flex items-center gap-1"><MaterialIcon className="text-sm">straighten</MaterialIcon> {listing.area || 0}m²</span>
          <span className="flex items-center gap-1"><MaterialIcon className="text-sm">visibility</MaterialIcon> {listingViews(listing)}</span>
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2 md:w-52 md:flex-col md:items-stretch">
        <select className="input" value={listing.rawStatus} onChange={(event) => onStatus(listing.id, event.target.value)} disabled={saving}>
          <option value="AVAILABLE">Đang hiển thị</option>
          <option value="HIDDEN">Đã ẩn</option>
          <option value="RENTED">Đã thuê</option>
          <option value="SOLD">Đã bán</option>
        </select>
        <div className="flex gap-2">
          <button className="flex h-10 w-10 items-center justify-center rounded text-primary transition-colors hover:bg-primary-fixed disabled:opacity-60" onClick={() => onEdit(listing)} disabled={saving} aria-label="Chỉnh sửa tin" type="button">
            <MaterialIcon>edit</MaterialIcon>
          </button>
          <button className="flex h-10 w-10 items-center justify-center rounded text-on-surface-variant transition-colors hover:bg-surface-container disabled:opacity-60" onClick={() => onStatus(listing.id, hidden ? 'AVAILABLE' : 'HIDDEN')} disabled={saving} aria-label={hidden ? 'Hiện tin' : 'Ẩn tin'} type="button">
            <MaterialIcon>{hidden ? 'visibility' : 'visibility_off'}</MaterialIcon>
          </button>
          <button className="flex h-10 w-10 items-center justify-center rounded text-error transition-colors hover:bg-error-container disabled:opacity-60" onClick={() => onDelete(listing.id)} disabled={saving} aria-label="Xóa tin" type="button">
            <MaterialIcon>delete</MaterialIcon>
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-2 block font-label-bold text-label-bold text-trust-navy">{label}</span>
      {children}
    </label>
  );
}

function AccessDenied({ session, onLogout, activePath }) {
  return (
    <AdminLayout session={session} onLogout={onLogout} variant="broker" activePath={activePath}>
      <main className="dashboard-main">
        <section className="ui-panel p-stack-lg">
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
  if (category === 'dat' || category === 'land') return 'Đất';
  if (category === 'nha' || category === 'house') return 'Nhà';
  if (category === 'apartment') return 'Căn hộ';
  return category || 'Khác';
}

function toFormCategory(category) {
  if (category === 'land' || category === 'dat') return 'dat';
  if (category === 'house' || category === 'nha' || category === 'apartment') return 'nha';
  return 'tro';
}

function listingViews(listing) {
  return Math.max(32, String(listing.title || '').length * 3);
}

function listingMatchesQuery(listing, query) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return true;
  return [
    listing.title,
    listing.address,
    listing.priceLabel,
    listing.statusLabel,
    listing.rawStatus,
    categoryLabel(listing.category),
  ].some((value) => String(value || '').toLowerCase().includes(normalizedQuery));
}

function isAvailableListing(listing) {
  return listing.rawStatus === 'AVAILABLE' || String(listing.statusLabel || '').toLowerCase().includes('hiển thị');
}

function isPendingListing(listing) {
  const status = String(listing.rawStatus || listing.statusLabel || '').toLowerCase();
  return status.includes('pending') || status.includes('chờ') || status.includes('duyệt');
}

function listingStatusTone(listing) {
  if (isAvailableListing(listing)) return 'success';
  if (isPendingListing(listing)) return 'warning';
  if (listing.rawStatus === 'SOLD' || listing.rawStatus === 'RENTED') return 'info';
  if (listing.rawStatus === 'HIDDEN') return 'muted';
  return 'muted';
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
    dashboard: 'Theo dõi hiệu suất tin đăng, trạng thái hồ sơ và danh mục bằng biểu đồ.',
    profile: 'Cập nhật avatar, tên và số điện thoại hiển thị trên bài đăng.',
    properties: 'Đăng tin mới, chỉnh sửa, upload ảnh, ẩn/hiện và xóa tin của bạn.',
  }[section] || 'Theo dõi nhanh hoạt động môi giới của bạn.';
}

function brokerTabs(stats, profileReady) {
  return [
    { label: 'Bảng điều khiển', href: '#/broker/dashboard', count: stats.totalListings },
    { label: 'Hồ sơ môi giới', href: '#/broker/profile', count: profileReady ? 1 : 0 },
    { label: 'Tin đăng của tôi', href: '#/broker/properties', count: stats.activeListings },
  ];
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
