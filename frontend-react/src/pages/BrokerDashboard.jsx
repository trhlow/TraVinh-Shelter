import { useEffect, useMemo, useState } from 'react';
import {
  buildDailySeries, buildWardData, ThreeDDonutChart, ThreeDFunnelChart, TrendBarLineChart, WardBarChart,
} from '../components/Charts.jsx';
import { DashboardPanel, LoadingRows, StateBlock, StatCard, StatusBadge } from '../components/DashboardWidgets.jsx';
import ViewingsPanel from '../components/dashboard/ViewingsPanel.jsx';
import DateRangeFilter from '../components/dashboard/DateRangeFilter.jsx';
import BrandLogo from '../components/BrandLogo.jsx';
import { WARDS } from '../data/locations.js';
import Icon from '../components/ui/Icon.jsx';
import LoginPage from './LoginPage.jsx';
import { isInRange, percentDelta, previousRange, resolveDateRange } from '../utils/dateRange.js';
import { downloadCsv } from '../utils/exportCsv.js';
import { trimLeadingEmptyMonths } from '../utils/chartSeries.js';
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
  { href: '#/broker/dashboard', icon: 'LayoutDashboard', label: 'Tổng quan' },
  { href: '#/broker/properties', icon: 'Building', label: 'Tin đăng của tôi' },
  { href: '#/broker/leads', icon: 'Users', label: 'Khách hàng tiềm năng' },
  { href: '#/broker/viewings', icon: 'Calendar', label: 'Lịch hẹn' },
  { href: '#/broker/settings', icon: 'Settings', label: 'Cài đặt' },
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
  const [profileForm, setProfileForm] = useState({ fullName: '', phone: '', facebookUrl: '', tiktokUrl: '' });
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
  const [quickSearch, setQuickSearch] = useState('');

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
        setProfileForm({
          fullName: profileData.fullName || '',
          phone: profileData.phone || '',
          facebookUrl: profileData.facebookUrl || '',
          tiktokUrl: profileData.tiktokUrl || '',
        });
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
    if (!session?.token || session.role !== 'BROKER' || !['dashboard', 'viewings', 'leads'].includes(section)) return;
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

  const activityMonthLabel = useMemo(
    () => new Intl.DateTimeFormat('vi-VN', { month: 'numeric', year: 'numeric' }).format(new Date()),
    [],
  );
  const activityChartData = useMemo(() => buildActivitySeries(listings, viewings), [listings, viewings]);
  const confirmedViewingsThisMonth = useMemo(() => {
    const now = new Date();
    return viewings.filter((viewing) => (
      viewing.status === 'CONFIRMED' && sameCalendarMonth(viewing.requestedAt || viewing.createdAt, now)
    )).length;
  }, [viewings]);
  const managedTypeData = useMemo(() => buildManagedTypeData(rangedListings), [rangedListings]);
  const leadFunnelData = useMemo(() => buildLeadFunnelData(dashboardStats.leads, viewings.length), [dashboardStats.leads, viewings.length]);
  const upcomingViewings = useMemo(() => viewings.slice(0, 4), [viewings]);

  function trendFor(delta) {
    return delta == null ? undefined : { value: `${delta >= 0 ? '+' : ''}${delta}%`, direction: delta >= 0 ? 'up' : 'down' };
  }

  function handleQuickSearch(event) {
    event.preventDefault();
    const term = quickSearch.trim();
    if (!term) return;
    setListingQuery(term);
    window.location.hash = '#/broker/properties';
  }

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
          <form className="dashboard-topbar-search" onSubmit={handleQuickSearch}>
            <Icon name="Search" size={16} className="icon-muted" />
            <input
              className="dashboard-topbar-search-input"
              type="search"
              value={quickSearch}
              onChange={(event) => setQuickSearch(event.target.value)}
              placeholder="Tìm tin đăng, khách hàng, lịch hẹn..."
              aria-label="Tìm nhanh dashboard môi giới"
            />
          </form>
          <div className="dashboard-topbar-actions">
            <button className="dashboard-icon-btn" type="button" aria-label="Thông báo">
              <Icon name="Bell" size={18} />
              {(dashboardStats.pendingListings || viewings.length) > 0 && <span className="dashboard-icon-dot" />}
            </button>
            <div className="dashboard-user-chip">
              <span className="dashboard-user-avatar">{initialsFor(profile?.fullName || session.fullName || session.email)}</span>
              <span className="dashboard-user-name">{profile?.fullName || session.fullName || 'Môi giới'}</span>
            </div>
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
          <div className="dashboard-title-row">
            <div>
              <h1 className="dashboard-page-title">{brokerTitle(section)}</h1>
              <p className="dashboard-page-subtitle">{brokerSubtitle(section, activityMonthLabel)}</p>
            </div>
            {section === 'dashboard' && (
              <div className="dashboard-period-chip">
                <Icon name="Calendar" size={16} />
                Tháng {activityMonthLabel}
                <Icon name="ChevronDown" size={15} className="icon-muted" />
              </div>
            )}
          </div>

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

              <div className="grid-4 dashboard-stats-row">
                <StatCard icon="Building" title="Tin đăng đang hoạt động" value={dashboardStats.activeListings} tone="navy" trend={trendFor(activeListingsDelta)} series={activeListingsSparkline} />
                <StatCard icon="Eye" title="Lượt xem trong tuần" value={dashboardStats.estimatedViews} tone="green" trend={trendFor(totalListingsDelta)} series={totalListingsSparkline} />
                <StatCard icon="Users" title="Leads mới" value={dashboardStats.leads} tone="orange" trend={trendFor(leadsDelta)} series={totalListingsSparkline} />
                <StatCard icon="CalendarCheck" title="Lịch hẹn xác nhận tháng này" value={confirmedViewingsThisMonth} tone="navy" />
              </div>

              <div className="dashboard-live-row">
                <TrendBarLineChart
                  title="Hoạt động môi giới theo tháng"
                  subtitle="Số bài đăng mới và lịch hẹn đã xác nhận theo từng tháng, tính từ khi có dữ liệu thực tế"
                  data={activityChartData}
                  currentLabel="Bài đăng"
                  previousLabel="Lịch hẹn xác nhận"
                />
                <ThreeDDonutChart
                  title="Loại hình BĐS đang quản lý"
                  subtitle="Trọ, nhà và đất đang quản lý"
                  data={managedTypeData}
                  centerLabel="tin"
                />
              </div>

              <div className="dashboard-charts-row">
                <ThreeDFunnelChart
                  title="Phễu chuyển đổi khách hàng"
                  subtitle="Lead → Liên hệ → Hẹn xem nhà → Chốt giao dịch"
                  data={leadFunnelData}
                />
                <WardBarChart title="Tin đăng theo phường" data={wardChart} />
                <DashboardPanel title="Lịch hẹn sắp tới" count={viewingsLoading ? 'Đang tải' : `${upcomingViewings.length} lịch`}>
                  <UpcomingViewingsSummary viewings={upcomingViewings} loading={viewingsLoading} />
                </DashboardPanel>
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

          {section === 'settings' && (
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
                <FormField label="Facebook">
                  <input className="input" type="url" aria-label="Facebook" placeholder="https://facebook.com/..." value={profileForm.facebookUrl} onChange={(event) => setProfileForm((current) => ({ ...current, facebookUrl: event.target.value }))} />
                </FormField>
                <FormField label="TikTok">
                  <input className="input" type="url" aria-label="TikTok" placeholder="https://tiktok.com/@..." value={profileForm.tiktokUrl} onChange={(event) => setProfileForm((current) => ({ ...current, tiktokUrl: event.target.value }))} />
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
                    Vui lòng hoàn tất hồ sơ môi giới trước khi đăng tin. <a className="auth-link" href="#/broker/settings">Mở hồ sơ</a>
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

          {section === 'leads' && (
            <div className="dashboard-live-row">
              <ThreeDFunnelChart
                title="Phễu khách hàng tiềm năng"
                subtitle="Theo dõi khách từ lead mới đến giao dịch thành công"
                data={leadFunnelData}
              />
              <DashboardPanel title="Lead mới cần xử lý" count={`${dashboardStats.leads} lead`}>
                <LeadPreview listings={rangedListings} />
              </DashboardPanel>
            </div>
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
        {(profile?.facebookUrl || profileForm.facebookUrl) && (
          <ProfileSocialLine label="Facebook" url={profile?.facebookUrl || profileForm.facebookUrl} />
        )}
        {(profile?.tiktokUrl || profileForm.tiktokUrl) && (
          <ProfileSocialLine label="TikTok" url={profile?.tiktokUrl || profileForm.tiktokUrl} />
        )}
        <ProfileLine label="Trạng thái hồ sơ" value={profileReady ? 'Sẵn sàng hiển thị' : 'Cần bổ sung'} tone={profileReady ? 'success' : 'warning'} />
      </div>
      <a className="auth-btn" href="#/broker/settings">
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

// Social profile URLs are links, not status text — unlike ProfileLine's StatusBadge.
function ProfileSocialLine({ label, url }) {
  return (
    <div className="dashboard-profile-line">
      <span className="dashboard-profile-line-label">{label}</span>
      <a className="dashboard-profile-line-link" href={url} target="_blank" rel="noopener noreferrer">
        {url}
      </a>
    </div>
  );
}

function RecentListings({ listings, loading }) {
  if (loading) return <LoadingRows rows={3} />;
  if (listings.length === 0) return <StateBlock title="Bạn chưa có tin đăng nào" description="Tạo tin đầu tiên trong mục Tin đăng của tôi." />;
  return (
    <div className="dashboard-table-wrap">
      <table className="dashboard-table">
        <thead>
          <tr>
            <th>Bất động sản</th>
            <th>Loại</th>
            <th>Trạng thái</th>
            <th>Lượt xem</th>
            <th>Liên hệ</th>
            <th>Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {listings.slice(0, 4).map((listing) => (
            <tr key={listing.id}>
              <td>
                <div className="dashboard-property-cell">
                  <img className="dashboard-property-thumb" src={listing.image} alt={listing.title} />
                  <div>
                    <div className="dashboard-table-name" style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{listing.title}</div>
                    <div className="dashboard-table-sub">{listing.address}</div>
                  </div>
                </div>
              </td>
              <td>{categoryLabel(listing.category)}</td>
              <td><StatusBadge tone={listingStatusTone(listing)}>{listing.statusLabel}</StatusBadge></td>
              <td><span className="dashboard-table-name">{listingViews(listing)}</span></td>
              <td><span className="dashboard-table-name">{listingContacts(listing)}</span></td>
              <td>
                <div className="dashboard-row-actions">
                  <a className="dashboard-icon-link" href="#/broker/properties" aria-label={`Sửa ${listing.title}`}>
                    <Icon name="Pencil" size={15} />
                  </a>
                  <a className="dashboard-icon-link" href={`#/property/${listing.id}`} aria-label={`Xem ${listing.title}`}>
                    <Icon name="Eye" size={15} />
                  </a>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function UpcomingViewingsSummary({ viewings, loading }) {
  if (loading) return <LoadingRows rows={3} />;
  if (viewings.length === 0) {
    return <StateBlock icon="Calendar" title="Chưa có lịch hẹn" description="Các lịch hẹn xem nhà sắp tới sẽ hiển thị tại đây." />;
  }
  return (
    <div className="dashboard-appointment-list">
      {viewings.map((viewing) => (
        <div className="dashboard-appointment-item" key={viewing.id}>
          <div>
            <div className="dashboard-table-name">{viewing.visitorName || 'Khách hàng'}</div>
            <div className="dashboard-table-sub">{viewing.propertyTitle || 'Bất động sản'} · {formatViewingDate(viewing.requestedAt || viewing.createdAt)}</div>
          </div>
          <StatusBadge tone={viewing.status === 'PENDING' ? 'warning' : 'success'}>{viewing.status || 'PENDING'}</StatusBadge>
        </div>
      ))}
    </div>
  );
}

function LeadPreview({ listings }) {
  const rows = listings.slice(0, 5).map((listing) => ({
    id: listing.id,
    title: listing.title,
    contacts: listingContacts(listing),
    views: listingViews(listing),
  }));
  if (rows.length === 0) return <StateBlock icon="Users" title="Chưa có lead mới" description="Lead sẽ được ghi nhận khi khách liên hệ tin đăng." />;
  return (
    <div className="dashboard-broker-list">
      {rows.map((row) => (
        <div className="dashboard-broker-row" key={row.id}>
          <div>
            <div className="dashboard-table-name">{row.title}</div>
            <div className="dashboard-table-sub">{row.views} lượt xem · {row.contacts} liên hệ</div>
          </div>
          <a className="btn btn-ghost btn-sm" href="#/broker/properties">Xử lý</a>
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

function listingContacts(listing) {
  return Math.max(1, Math.round(listingViews(listing) / 18));
}

function buildActivitySeries(listings, viewings) {
  const buckets = rollingMonthBuckets();
  listings.forEach((listing) => {
    const date = new Date(listing.createdAt || Date.now());
    if (Number.isNaN(date.getTime())) return;
    const bucket = buckets.find((item) => sameMonth(item.date, date));
    if (bucket) bucket.current += 1;
  });
  viewings.forEach((viewing) => {
    if (viewing.status !== 'CONFIRMED') return;
    const date = new Date(viewing.requestedAt || viewing.createdAt || Date.now());
    if (Number.isNaN(date.getTime())) return;
    const bucket = buckets.find((item) => sameMonth(item.date, date));
    if (bucket) bucket.previous += 1;
  });
  return trimLeadingEmptyMonths(buckets.map((bucket) => ({
    label: bucket.label,
    current: bucket.current || 0,
    previous: bucket.previous || 0,
  })));
}

function rollingMonthBuckets(referenceDate = new Date(), length = 12) {
  return Array.from({ length }, (_, index) => {
    const date = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - (length - 1 - index), 1);
    return {
      date,
      label: `T${date.getMonth() + 1}`,
      current: 0,
      previous: 0,
    };
  });
}

function sameMonth(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function sameCalendarMonth(value, reference) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return false;
  return date.getFullYear() === reference.getFullYear() && date.getMonth() === reference.getMonth();
}

export function buildManagedTypeData(listings) {
  const tro = listings.filter((item) => item.category === 'tro').length;
  const nha = listings.filter((item) => item.category === 'nha').length;
  const dat = listings.filter((item) => item.category === 'dat').length;
  return [
    { label: 'Trọ', value: tro },
    { label: 'Nhà', value: nha },
    { label: 'Đất', value: dat },
  ];
}

function buildLeadFunnelData(leads, viewingCount) {
  const leadCount = Math.max(leads, 1);
  return [
    { label: 'Lead', value: leadCount, color: 'var(--chart-1)' },
    { label: 'Liên hệ', value: Math.max(1, Math.round(leadCount * 0.72)), color: 'var(--chart-4)' },
    { label: 'Hẹn xem nhà', value: Math.max(viewingCount, Math.round(leadCount * 0.42)), color: 'var(--chart-3)' },
    { label: 'Chốt giao dịch', value: Math.max(1, Math.round(leadCount * 0.18)), color: 'var(--chart-5)' },
  ];
}

function formatViewingDate(value) {
  if (!value) return 'Chưa có thời gian';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Chưa có thời gian';
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(date);
}

function initialsFor(value) {
  const source = String(value || 'MG').trim();
  const words = source.includes('@') ? source.split('@')[0].split(/[._-]/) : source.split(/\s+/);
  return words.slice(0, 2).map((word) => word[0]?.toUpperCase()).join('') || 'MG';
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
    properties: 'Tin đăng của tôi',
    leads: 'Khách hàng tiềm năng',
    viewings: 'Lịch hẹn xem',
    settings: 'Cài đặt',
  }[section] || 'Bảng điều khiển';
}

function brokerSubtitle(section, monthLabel) {
  return {
    dashboard: `Hiệu suất tin đăng và khách hàng quan tâm trong tháng ${monthLabel}.`,
    properties: 'Tạo, chỉnh sửa và theo dõi trạng thái tin bất động sản.',
    leads: 'Theo dõi phễu chuyển đổi khách hàng từ lead mới đến giao dịch.',
    viewings: 'Theo dõi yêu cầu xem nhà và cập nhật lịch hẹn.',
    settings: 'Quản lý thông tin liên hệ hiển thị trên các tin đăng.',
  }[section] || 'Tổng quan hoạt động môi giới.';
}

function objectUrlFor(file) {
  if (typeof URL !== 'undefined' && URL.createObjectURL && file) {
    return URL.createObjectURL(file);
  }
  return '';
}
