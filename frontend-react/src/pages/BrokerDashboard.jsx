import { useEffect, useMemo, useState } from 'react';
import { buildDailySeries, buildWardData, DonutChart, GaugeChart, HorizontalBarChart, TrendAreaChart, WardBarChart } from '../components/Charts.jsx';
import { DashboardPanel, LoadingRows, StateBlock, StatCard, StatusBadge } from '../components/DashboardWidgets.jsx';
import ViewingsPanel from '../components/dashboard/ViewingsPanel.jsx';
import DateRangeFilter from '../components/dashboard/DateRangeFilter.jsx';
import BrandLogo from '../components/BrandLogo.jsx';
import { WARDS } from '../data/locations.js';
import Icon from '../components/ui/Icon.jsx';
import LoginPage from './LoginPage.jsx';
import { isInRange, percentDelta, previousRange, resolveDateRange } from '../utils/dateRange.js';
import { downloadCsv } from '../utils/exportCsv.js';
import {
  changePassword,
  createProperty,
  deleteProperty,
  fetchBrokerDashboard,
  fetchCurrentUser,
  uploadCurrentUserAvatar,
  uploadPropertyImage,
  updateCurrentProfile,
  updateProperty,
  updatePropertyStatus,
  fetchBrokerViewings,
  updateBrokerViewingStatus,
} from '../services/api.js';

const BROKER_SIDEBAR_ITEMS = [
  { href: '#/broker/dashboard', icon: 'LayoutDashboard', label: 'Bảng điều khiển' },
  { href: '#/broker/profile', icon: 'User', label: 'Hồ sơ môi giới' },
  { href: '#/broker/properties', icon: 'Building', label: 'Tin đăng của tôi' },
  { href: '#/broker/viewings', icon: 'Calendar', label: 'Lịch hẹn xem' },
];

const EMPTY_FORM = {
  id: '',
  title: '',
  categorySlug: 'tro',
  transaction: 'rent',
  address: '',
  ward: 'phuong-tra-vinh',
  price: '',
  length: '',
  width: '',
  bedrooms: '',
  bathrooms: '',
  houseType: 'tret',
  description: '',
  amenities: [],
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
  const [listingStatusTab, setListingStatusTab] = useState('AVAILABLE');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [viewings, setViewings] = useState([]);
  const [viewingsLoading, setViewingsLoading] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current: '', next: '', confirm: '' });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [savingViewing, setSavingViewing] = useState(false);
  const [rangePreset, setRangePreset] = useState('all');
  const [rangeCustom, setRangeCustom] = useState({});

  const listings = stats.listings || [];
  const listingRange = useMemo(() => resolveDateRange(rangePreset, rangeCustom), [rangePreset, rangeCustom]);
  const rangedListings = useMemo(() => listings.filter((listing) => isInRange(listing.createdAt, listingRange)), [listings, listingRange]);
  const filteredListings = useMemo(() => listings.filter((listing) => listingMatchesQuery(listing, listingQuery)), [listings, listingQuery]);
  const statusFilteredListings = useMemo(() => filterListingsByStatus(filteredListings, listingStatusTab), [filteredListings, listingStatusTab]);
  const statusCounts = useMemo(() => countListingsByStatus(filteredListings), [filteredListings]);
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

  useEffect(() => {
    if (!session?.token || session.role !== 'BROKER' || section !== 'viewings') return;
    let alive = true;
    setViewingsLoading(true);
    fetchBrokerViewings(session.token)
      .then((items) => { if (alive) setViewings(Array.isArray(items) ? items : []); })
      .catch(() => { if (alive) setViewings([]); })
      .finally(() => { if (alive) setViewingsLoading(false); });
    return () => { alive = false; };
  }, [session, section]);

  useEffect(() => {
    setPasswordSuccess(false);
    setPasswordError('');
  }, [section]);

  const dashboardStats = useMemo(() => {
    // Fallback to server-wide stats only when the range is unbounded ("all") — data
    // has not loaded yet. A bounded range that legitimately matches nothing must
    // show 0, not silently un-filter to the unfiltered totals.
    const unbounded = !listingRange.from && !listingRange.to;
    const totalListings = rangedListings.length || (unbounded ? stats.totalListings : 0) || 0;
    const activeListings = rangedListings.filter(isAvailableListing).length || (unbounded ? stats.activeListings : 0) || 0;
    const pendingListings = rangedListings.filter(isPendingListing).length;
    const estimatedViews = rangedListings.reduce((sum, listing) => sum + listingViews(listing), 0);
    return {
      totalListings,
      activeListings,
      pendingListings,
      estimatedViews,
      leads: stats.pendingLeads || Math.max(0, totalListings * 2),
    };
  }, [rangedListings, stats, listingRange]);

  const statusChart = useMemo(() => chartBy(rangedListings, (listing) => listing.statusLabel || 'Đang hiển thị'), [rangedListings]);
  const categoryChart = useMemo(() => chartBy(rangedListings, (listing) => categoryLabel(listing.category)), [rangedListings]);
  const wardChart = useMemo(() => buildWardData(rangedListings, (listing) => listing.ward), [rangedListings]);

  const prevListingRange = useMemo(() => previousRange(listingRange), [listingRange]);
  const prevRangedListings = useMemo(() => (
    prevListingRange ? listings.filter((listing) => isInRange(listing.createdAt, prevListingRange)) : null
  ), [listings, prevListingRange]);

  const totalListingsDelta = prevRangedListings ? percentDelta(dashboardStats.totalListings, prevRangedListings.length) : null;
  const activeListingsDelta = prevRangedListings
    ? percentDelta(dashboardStats.activeListings, prevRangedListings.filter(isAvailableListing).length)
    : null;
  const leadsDelta = prevRangedListings
    ? percentDelta(dashboardStats.leads, Math.max(0, prevRangedListings.length * 2))
    : null;

  const totalListingsSparkline = useMemo(
    () => buildDailySeries(rangedListings, (listing) => listing.createdAt, 7).map((bucket) => bucket.count),
    [rangedListings],
  );
  const activeListingsSparkline = useMemo(
    () => buildDailySeries(rangedListings.filter(isAvailableListing), (listing) => listing.createdAt, 7).map((bucket) => bucket.count),
    [rangedListings],
  );

  const listingActivitySeries = useMemo(
    () => buildDailySeries(listings, (listing) => listing.createdAt, 30),
    [listings],
  );

  function trendFor(delta) {
    return delta == null ? undefined : { value: `${delta >= 0 ? '+' : ''}${delta}%`, direction: delta >= 0 ? 'up' : 'down' };
  }
  const profileCompletion = useMemo(() => {
    const fields = [
      profileForm?.fullName || profile?.fullName,
      profileForm?.phone || profile?.phone,
      profileForm?.email || profile?.email,
      avatarPreview || profile?.avatarUrl,
    ];
    const filled = fields.filter((field) => Boolean(field && String(field).trim())).length;
    return Math.round((filled / 4) * 100);
  }, [profileForm, profile, avatarPreview]);

  if (!session) return <LoginPage onLogin={onLogin} />;
  if (session.role !== 'BROKER') {
    return (
      <div className="dashboard-shell">
        <BrokerSidebar currentPath={currentPath} />
        <div className="dashboard-content">
          <div className="dashboard-main">
            <div className="card">
              <h1 className="dashboard-page-title">Không có quyền môi giới</h1>
              <p>Chỉ tài khoản môi giới do admin cấp mới được đăng và quản lý tin.</p>
            </div>
          </div>
        </div>
      </div>
    );
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

  async function handleChangePassword(e) {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess(false);
    if (passwordForm.next !== passwordForm.confirm) {
      setPasswordError('Mật khẩu mới không khớp.');
      return;
    }
    setSavingPassword(true);
    try {
      await changePassword(session.token, passwordForm.current, passwordForm.next);
      setPasswordSuccess(true);
      setPasswordForm({ current: '', next: '', confirm: '' });
    } catch (err) {
      setPasswordError(err.message || 'Đổi mật khẩu thất bại.');
    } finally {
      setSavingPassword(false);
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
    if (!editing && !(listingForm.coverFile || listingForm.coverUrl)) {
      setError('Vui lòng chọn ảnh đại diện cho tin đăng.');
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

  async function changeViewingStatus(id, status) {
    setSavingViewing(true);
    try {
      await updateBrokerViewingStatus(session.token, id, status);
      setViewings((vs) => vs.map((v) => v.id === id ? { ...v, status } : v));
    } catch (err) {
      setError(err.message || 'Không thể cập nhật trạng thái lịch hẹn.');
    } finally {
      setSavingViewing(false);
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
      length: property.length ? String(property.length) : '',
      width: property.width ? String(property.width) : '',
      bedrooms: property.bedrooms ? String(property.bedrooms) : '',
      bathrooms: property.bathrooms ? String(property.bathrooms) : '',
      houseType: property.houseType || 'tret',
      description: property.description || '',
      amenities: Array.isArray(property.amenities) ? property.amenities : [],
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
    const files = Array.from(event.target.files || []);
    setListingForm((current) => ({
      ...current,
      galleryFiles: files,
      galleryPreviews: files.map(objectUrlFor),
    }));
  }

  return (
    <div className="dashboard-shell">
      <BrokerSidebar currentPath={currentPath} onLogout={onLogout} session={session} />
      <div className="dashboard-content">
        <div className="dashboard-topbar">
          <span className="dashboard-topbar-title">{brokerTitle(section)}</span>
          <div className="dashboard-topbar-actions">
            {section === 'properties' && (
              <>
                <button
                  className="btn btn-ghost btn-sm"
                  type="button"
                  onClick={() => downloadCsv('tin-dang-cua-toi.csv', listings, [
                    { key: 'title', label: 'Tiêu đề' },
                    { key: 'address', label: 'Địa chỉ' },
                    { key: 'priceLabel', label: 'Giá' },
                    { key: 'statusLabel', label: 'Trạng thái' },
                    { key: 'createdAt', label: 'Ngày tạo' },
                  ])}
                >
                  Xuất CSV
                </button>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => document.getElementById('listing-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                  type="button"
                >
                  <Icon name="Plus" size={16} className="icon-inverse" />
                  Đăng tin mới
                </button>
              </>
            )}
          </div>
        </div>

        <div className="dashboard-main">
          <h1 className="dashboard-page-title">{brokerTitle(section)}</h1>

          {notice && <div className="alert dashboard-notice">{notice}</div>}
          {error && <div className="alert alert-error">{error}</div>}

          {section === 'dashboard' && (
            <>
              <div className="admin-filter-bar">
                <DateRangeFilter
                  preset={rangePreset}
                  custom={rangeCustom}
                  onChange={(nextPreset, nextCustom) => { setRangePreset(nextPreset); setRangeCustom(nextCustom); }}
                />
              </div>

              <div className="grid-3 dashboard-stats-row">
                <StatCard icon="Building" title="Tổng tin đăng" value={dashboardStats.totalListings} tone="navy" trend={trendFor(totalListingsDelta)} series={totalListingsSparkline} />
                <StatCard icon="Eye" title="Đang hiển thị" value={dashboardStats.activeListings} tone="green" trend={trendFor(activeListingsDelta)} series={activeListingsSparkline} />
                <StatCard icon="Users" title="Khách quan tâm" value={dashboardStats.leads} tone="orange" trend={trendFor(leadsDelta)} series={totalListingsSparkline} />
              </div>

              <div className="dashboard-live-row">
                <TrendAreaChart
                  title="Hoạt động tin đăng (30 ngày)"
                  series={listingActivitySeries}
                  unit="tin đăng"
                />
                <WardBarChart title="Tin đăng theo phường" data={wardChart} />
              </div>

              <div className="dashboard-charts-row">
                <GaugeChart title="Mức độ hoàn thiện hồ sơ" value={profileCompletion} max={100} label="hồ sơ" />
                <DonutChart title="Tin đăng theo danh mục" data={categoryChart} centerLabel="tin" />
                <HorizontalBarChart title="Trạng thái tin đăng" data={statusChart} />
              </div>

              <div className="dashboard-panels-row">
                <DashboardPanel title="Trạng thái hồ sơ" count={profileReady ? 'Đủ thông tin liên hệ' : 'Cần bổ sung'}>
                  <ProfileSummary profile={profile} profileForm={profileForm} avatarPreview={avatarPreview} profileReady={profileReady} />
                </DashboardPanel>
                <DashboardPanel title="Tin gần đây" count={`${rangedListings.slice(0, 4).length} tin mới`}>
                  <RecentListings listings={rangedListings} loading={loading} />
                </DashboardPanel>
              </div>
            </>
          )}

          {section === 'profile' && (
            <div className="dashboard-profile-grid">
              <DashboardPanel title="Hồ sơ đang hiển thị" count={profileReady ? 'Sẵn sàng đăng tin' : 'Cần cập nhật'}>
                <ProfileSummary profile={profile} profileForm={profileForm} avatarPreview={avatarPreview} profileReady={profileReady} />
              </DashboardPanel>
              <form className="card dashboard-form-card" onSubmit={saveProfile}>
                <h2 className="dashboard-section-title">Cập nhật hồ sơ môi giới</h2>
                <p className="dashboard-section-subtitle">Số điện thoại và tên môi giới sẽ hiển thị trên các tin đăng.</p>
                <div className="dashboard-form-avatar-row">
                  {avatarPreview ? (
                    <img className="dashboard-form-avatar-img" src={avatarPreview} alt="Ảnh đại diện môi giới" />
                  ) : (
                    <div className="dashboard-form-avatar-placeholder">
                      <Icon name="User" size={32} className="icon-muted" />
                    </div>
                  )}
                  <FormField label="Ảnh đại diện môi giới" className="dashboard-form-field-flex">
                    <input className="input" type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={handleAvatarChange} />
                  </FormField>
                </div>
                <FormField label="Họ tên">
                  <input className="input" value={profileForm.fullName} onChange={(event) => setProfileForm((current) => ({ ...current, fullName: event.target.value }))} required />
                </FormField>
                <FormField label="Số điện thoại">
                  <input className="input" value={profileForm.phone} onChange={(event) => setProfileForm((current) => ({ ...current, phone: event.target.value }))} required />
                </FormField>
                <button className="auth-btn" type="submit" disabled={saving}>
                  <Icon name="Check" size={16} className="icon-inverse" />
                  Lưu hồ sơ
                </button>
              </form>
              <div className="profile-password-section">
                <h3>Đổi mật khẩu</h3>
                <form onSubmit={handleChangePassword} className="password-form">
                  <div className="form-group">
                    <label>Mật khẩu hiện tại</label>
                    <input type="password" className="input" value={passwordForm.current}
                      onChange={e => setPasswordForm(f => ({ ...f, current: e.target.value }))} required />
                  </div>
                  <div className="form-group">
                    <label>Mật khẩu mới</label>
                    <input type="password" className="input" value={passwordForm.next}
                      onChange={e => setPasswordForm(f => ({ ...f, next: e.target.value }))} required />
                  </div>
                  <div className="form-group">
                    <label>Xác nhận mật khẩu mới</label>
                    <input type="password" className="input" value={passwordForm.confirm}
                      onChange={e => setPasswordForm(f => ({ ...f, confirm: e.target.value }))} required />
                  </div>
                  {passwordError && <p className="form-error">{passwordError}</p>}
                  {passwordSuccess && <p className="form-success">Đổi mật khẩu thành công!</p>}
                  <button className="auth-btn" type="submit" disabled={savingPassword}>
                    {savingPassword ? 'Đang lưu...' : 'Đổi mật khẩu'}
                  </button>
                </form>
              </div>
            </div>
          )}

          {section === 'properties' && (
            <>
              <form id="listing-form" className="card dashboard-form-card" onSubmit={saveListing}>
                <div className="dashboard-form-header">
                  <div>
                    <h2 className="dashboard-section-title">{editing ? 'Chỉnh sửa tin' : 'Đăng tin mới'}</h2>
                    <p className="dashboard-section-subtitle">Tin sẽ dùng thông tin liên hệ trong hồ sơ môi giới của bạn.</p>
                  </div>
                  {editing && (
                    <button className="btn btn-ghost btn-sm" type="button" onClick={() => setListingForm(EMPTY_FORM)}>
                      Hủy sửa
                    </button>
                  )}
                </div>
                {!profileReady && (
                  <div className="alert alert-error">
                    Vui lòng hoàn tất hồ sơ môi giới trước khi đăng tin. <a className="auth-link" href="#/broker/profile">Mở hồ sơ</a>
                  </div>
                )}
                <div className="dashboard-listing-grid">
                  <FormField label="Tiêu đề" className="dashboard-listing-span2">
                    <input className="input" value={listingForm.title} onChange={(event) => setListingValue('title', event.target.value, setListingForm)} required />
                  </FormField>
                  <FormField label="Danh mục">
                    <select className="input" value={listingForm.categorySlug} onChange={(event) => {
                      const categorySlug = event.target.value;
                      setListingForm((current) => ({ ...current, categorySlug, transaction: categorySlug === 'tro' ? 'rent' : current.transaction }));
                    }}>
                      <option value="tro">Trọ</option>
                      <option value="nha">Nhà</option>
                      <option value="dat">Đất</option>
                    </select>
                  </FormField>
                  {listingForm.categorySlug !== 'tro' && (
                    <FormField label="Nhu cầu">
                      <select className="input" value={listingForm.transaction} onChange={(event) => setListingValue('transaction', event.target.value, setListingForm)}>
                        <option value="sale">Mua bán</option>
                        <option value="rent">Cho thuê</option>
                      </select>
                    </FormField>
                  )}
                  <FormField label="Khu vực">
                    <select className="input" value={listingForm.ward} onChange={(event) => setListingValue('ward', event.target.value, setListingForm)}>
                      {WARDS.filter((ward) => ward.code !== 'all').map((ward) => (
                        <option key={ward.code} value={ward.code}>{ward.label}</option>
                      ))}
                    </select>
                  </FormField>
                  <FormField label="Địa chỉ" className="dashboard-listing-span2">
                    <input className="input" value={listingForm.address} onChange={(event) => setListingValue('address', event.target.value, setListingForm)} required />
                  </FormField>
                  <FormField label="Giá (VNĐ)">
                    <input className="input" type="number" min="0" value={listingForm.price} onChange={(event) => setListingValue('price', event.target.value, setListingForm)} required />
                  </FormField>
                  <FormField label="Chiều dài (m)">
                    <input className="input" type="number" min="0" step="0.01" value={listingForm.length} onChange={(event) => setListingValue('length', event.target.value, setListingForm)} />
                  </FormField>
                  <FormField label="Chiều rộng (m)">
                    <input className="input" type="number" min="0" step="0.01" value={listingForm.width} onChange={(event) => setListingValue('width', event.target.value, setListingForm)} />
                  </FormField>
                  {listingForm.categorySlug === 'nha' && listingForm.transaction === 'rent' && (
                    <FormField label="Loại nhà">
                      <select className="input" value={listingForm.houseType} onChange={(event) => setListingValue('houseType', event.target.value, setListingForm)}>
                        <option value="tret">Trệt</option>
                        <option value="lau">Lầu</option>
                      </select>
                    </FormField>
                  )}
                  {listingForm.categorySlug !== 'dat' && (
                    <>
                      <FormField label="Phòng ngủ">
                        <input className="input" type="number" min="0" value={listingForm.bedrooms} onChange={(event) => setListingValue('bedrooms', event.target.value, setListingForm)} />
                      </FormField>
                      <FormField label="Nhà vệ sinh">
                        <input className="input" type="number" min="0" value={listingForm.bathrooms} onChange={(event) => setListingValue('bathrooms', event.target.value, setListingForm)} />
                      </FormField>
                    </>
                  )}
                  <FormField label="Ảnh đại diện" className="dashboard-listing-span3">
                    <input className="input" type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={handleCoverChange} />
                    <p className="form-hint">Tỷ lệ 4:3 — tối thiểu 800×600px. Ảnh sẽ được cắt tự động khi hiển thị.</p>
                    {(listingForm.coverPreview || listingForm.coverUrl) && (
                      <div className="dashboard-cover-preview">
                        <img src={listingForm.coverPreview || listingForm.coverUrl} alt="Ảnh đại diện tin đăng" />
                      </div>
                    )}
                  </FormField>
                  <FormField label="Ảnh bổ sung (tùy chọn)" className="dashboard-listing-span3">
                    <input className="input" type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple onChange={handleGalleryChange} />
                    <p className="form-hint">Tỷ lệ 4:3 — tối thiểu 800×600px mỗi ảnh.</p>
                    {listingForm.galleryPreviews.length > 0 && (
                      <div className="dashboard-gallery-grid">
                        {listingForm.galleryPreviews.map((preview, index) => (
                          <img key={preview} className="dashboard-gallery-thumb" src={preview} alt={`Ảnh bổ sung ${index + 1}`} />
                        ))}
                      </div>
                    )}
                  </FormField>
                  <FormField label="Mô tả" className="dashboard-listing-span3">
                    <textarea className="input" value={listingForm.description} onChange={(event) => setListingValue('description', event.target.value, setListingForm)} />
                  </FormField>
                  <div className="form-group dashboard-listing-span3">
                    <label className="auth-field-label">Tiện ích</label>
                    <div className="amenity-checkboxes">
                      {['Wifi', 'Điều hòa', 'Gác lửng', 'WC riêng', 'Chỗ để xe', 'Máy giặt', 'Tủ lạnh'].map(a => (
                        <label key={a} className="amenity-checkbox-label">
                          <input
                            type="checkbox"
                            checked={listingForm.amenities.includes(a)}
                            onChange={e => setListingForm(f => ({
                              ...f,
                              amenities: e.target.checked
                                ? [...f.amenities, a]
                                : f.amenities.filter(x => x !== a),
                            }))}
                          />
                          {a}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
                <button className="auth-btn dashboard-submit-btn" type="submit" disabled={saving || !profileReady}>
                  <Icon name={editing ? 'Check' : 'Plus'} size={16} className="icon-inverse" />
                  {editing ? 'Lưu chỉnh sửa' : 'Đăng tin'}
                </button>
              </form>

              <div className="dashboard-search-bar">
                <label className="dashboard-search-label">
                  <span className="sr-only">Tìm tin đăng</span>
                  <Icon name="Search" size={16} className="icon-muted dashboard-search-icon" />
                  <input
                    className="input dashboard-search-input"
                    placeholder="Tìm theo tiêu đề, địa chỉ, giá..."
                    value={listingQuery}
                    onChange={(event) => setListingQuery(event.target.value)}
                  />
                </label>
                <p className="dashboard-search-count">
                  {loading ? 'Đang tải' : `${filteredListings.length}/${listings.length} tin phù hợp`}
                </p>
              </div>

              <div className="dashboard-status-tabs">
                {LISTING_STATUS_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    className={`dashboard-status-tab${listingStatusTab === tab.id ? ' is-active' : ''}`}
                    onClick={() => setListingStatusTab(tab.id)}
                  >
                    {tab.label}
                    <span className="dashboard-status-tab-count">{statusCounts[tab.id] || 0}</span>
                  </button>
                ))}
              </div>
              <DashboardPanel
                title={LISTING_STATUS_TABS.find((tab) => tab.id === listingStatusTab)?.label || 'Tin đăng'}
                count={loading ? 'Đang tải' : `${statusFilteredListings.length} tin`}
              >
                <ListingList
                  listings={statusFilteredListings}
                  loading={loading}
                  saving={saving}
                  onEdit={editListing}
                  onDelete={removeListing}
                  onStatus={changeStatus}
                  emptyTitle="Không có tin ở trạng thái này"
                  emptyDescription="Chọn trạng thái khác hoặc đổi từ khóa tìm kiếm."
                />
              </DashboardPanel>
            </>
          )}

          {section === 'viewings' && (
            <DashboardPanel title="Lịch hẹn xem" count={viewingsLoading ? 'Đang tải' : `${viewings.length} yêu cầu`}>
              <ViewingsPanel
                viewings={viewings}
                loading={viewingsLoading}
                onStatusChange={changeViewingStatus}
                saving={savingViewing}
              />
            </DashboardPanel>
          )}
        </div>
      </div>
    </div>
  );
}

function BrokerSidebar({ currentPath, onLogout, session }) {
  const activePath = currentPath.startsWith('/') ? `#${currentPath}` : currentPath;
  return (
    <aside className="dashboard-sidebar">
      <div className="dashboard-sidebar-header">
        <a href="#/">
          <BrandLogo />
        </a>
      </div>
      <nav className="dashboard-sidebar-nav">
        {BROKER_SIDEBAR_ITEMS.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className={`sidebar-item ${activePath === item.href ? 'is-active' : ''}`}
          >
            <Icon name={item.icon} size={18} />
            {item.label}
          </a>
        ))}
        <a href="#/" className="sidebar-item">
          <Icon name="Home" size={18} />
          Trang chủ
        </a>
      </nav>
      {session && (
        <div className="dashboard-sidebar-footer">
          <div className="dashboard-sidebar-user">
            <Icon name="User" size={16} className="icon-muted" />
            <span className="dashboard-sidebar-email">{session.email}</span>
          </div>
          <button className="sidebar-item dashboard-sidebar-logout" type="button" onClick={onLogout}>
            <Icon name="LogOut" size={16} />
            Đăng xuất
          </button>
        </div>
      )}
    </aside>
  );
}

function ProfileSummary({ profile, profileForm, avatarPreview, profileReady }) {
  return (
    <div className="dashboard-profile-summary">
      <div className="dashboard-profile-summary-top">
        {avatarPreview ? (
          <img className="dashboard-profile-avatar" src={avatarPreview} alt="Ảnh đại diện môi giới" />
        ) : (
          <div className="dashboard-profile-avatar-placeholder">
            <Icon name="User" size={24} className="icon-muted" />
          </div>
        )}
        <div>
          <p className="dashboard-profile-name">{profile?.fullName || profileForm.fullName || 'Chưa cập nhật tên'}</p>
          <p className="dashboard-profile-email">{profile?.email || 'Email tài khoản'}</p>
        </div>
      </div>
      <div className="dashboard-profile-meta">
        <ProfileLine label="Số điện thoại" value={profile?.phone || profileForm.phone || 'Chưa cập nhật'} />
        <ProfileLine label="Trạng thái hồ sơ" value={profileReady ? 'Sẵn sàng hiển thị' : 'Cần bổ sung'} tone={profileReady ? 'success' : 'warning'} />
      </div>
      <a className="auth-btn" href="#/broker/profile">
        Mở hồ sơ
      </a>
    </div>
  );
}

function ProfileLine({ label, value, tone = 'muted' }) {
  return (
    <div className="dashboard-profile-line">
      <span className="dashboard-profile-line-label">{label}</span>
      <StatusBadge tone={tone}>{value}</StatusBadge>
    </div>
  );
}

function RecentListings({ listings, loading }) {
  if (loading) return <LoadingRows rows={3} />;
  if (listings.length === 0) return <StateBlock title="Bạn chưa có tin đăng nào" description="Tạo tin đầu tiên trong mục Tin đăng của tôi." />;
  return (
    <div className="dashboard-recent-list">
      {listings.slice(0, 4).map((listing) => (
        <a key={listing.id} className="dashboard-recent-item" href="#/broker/properties">
          <img className="dashboard-recent-thumb" src={listing.image} alt={listing.title} />
          <div className="dashboard-recent-info">
            <div className="dashboard-recent-title">{listing.title}</div>
            <div className="dashboard-recent-price">{listing.priceLabel}</div>
          </div>
          <StatusBadge tone={listingStatusTone(listing)}>{listing.statusLabel}</StatusBadge>
        </a>
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
    <div className="dashboard-listing-list">
      {listings.map((listing) => (
        <ListingRow key={listing.id} listing={listing} onEdit={onEdit} onDelete={onDelete} onStatus={onStatus} saving={saving} />
      ))}
    </div>
  );
}

function ListingRow({ listing, onEdit, onDelete, onStatus, saving }) {
  const hidden = listing.rawStatus === 'HIDDEN';
  return (
    <div className="dashboard-listing-row">
      <div className="dashboard-listing-thumb-wrap">
        <img className="dashboard-listing-thumb" src={listing.image} alt={listing.title} />
        <div className="dashboard-listing-thumb-badge">
          <StatusBadge tone={listingStatusTone(listing)}>{listing.statusLabel}</StatusBadge>
        </div>
      </div>
      <div className="dashboard-listing-body">
        <h4 className="dashboard-listing-title">{listing.title}</h4>
        <p className="dashboard-listing-address">{listing.address}</p>
        <p className="dashboard-listing-price">{listing.priceLabel}</p>
        <div className="dashboard-listing-meta">
          <span>{listing.area || 0}m²</span>
          <span>{listingViews(listing)} lượt xem</span>
        </div>
      </div>
      <div className="dashboard-listing-actions">
        <select className="input" value={listing.rawStatus} onChange={(event) => onStatus(listing.id, event.target.value)} disabled={saving}>
          <option value="AVAILABLE">Đang hiển thị</option>
          <option value="HIDDEN">Đã ẩn</option>
          <option value="RENTED">Đã thuê</option>
          <option value="SOLD">Đã bán</option>
        </select>
        <div className="dashboard-listing-btns">
          <button className="btn btn-ghost btn-sm" onClick={() => onEdit(listing)} disabled={saving} aria-label="Chỉnh sửa tin" type="button">
            <Icon name="Pencil" size={16} className="icon-brand" />
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => onStatus(listing.id, hidden ? 'AVAILABLE' : 'HIDDEN')} disabled={saving} aria-label={hidden ? 'Hiện tin' : 'Ẩn tin'} type="button">
            <Icon name={hidden ? 'Eye' : 'EyeOff'} size={16} className="icon-muted" />
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => onDelete(listing.id)} disabled={saving} aria-label="Xóa tin" type="button">
            <Icon name="Trash2" size={16} className="icon-muted" />
          </button>
        </div>
      </div>
    </div>
  );
}

function FormField({ label, children, className = '' }) {
  return (
    <div className={`auth-field ${className}`}>
      <label className="auth-field-label">{label}</label>
      {children}
    </div>
  );
}

export function propertyPayload(form) {
  const length = numericOrNull(form.length);
  const width = numericOrNull(form.width);
  const attributes = {
    transaction: form.categorySlug === 'tro' ? 'rent' : form.transaction,
    ward: form.ward,
    length,
    width,
    area: length != null && width != null ? Number((length * width).toFixed(2)) : null,
    description: form.description,
    amenities: form.amenities,
  };
  if (form.categorySlug !== 'dat') {
    attributes.bedrooms = numericOrNull(form.bedrooms);
    attributes.bathrooms = numericOrNull(form.bathrooms);
  }
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

const LISTING_STATUS_TABS = [
  { id: 'AVAILABLE', label: 'Đang hoạt động' },
  { id: 'SOLD', label: 'Đã bán' },
  { id: 'RENTED', label: 'Đã thuê' },
  { id: 'HIDDEN', label: 'Đã ẩn' },
];

export function filterListingsByStatus(listings, status) {
  if (status === 'AVAILABLE') {
    return listings.filter((listing) => isAvailableListing(listing));
  }
  return listings.filter((listing) => listing.rawStatus === status);
}

export function countListingsByStatus(listings) {
  return LISTING_STATUS_TABS.reduce((counts, tab) => {
    counts[tab.id] = filterListingsByStatus(listings, tab.id).length;
    return counts;
  }, {});
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
    viewings: 'Lịch hẹn xem',
  }[section] || 'Bảng điều khiển';
}

function objectUrlFor(file) {
  if (typeof URL !== 'undefined' && URL.createObjectURL && file) {
    return URL.createObjectURL(file);
  }
  return '';
}
