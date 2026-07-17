const BRAND = 'Công Tín Land';

const PAGE_META = {
  home: {
    title: `${BRAND} — Bất động sản Trà Vinh: nhà, đất, phòng trọ`,
    description:
      'Nền tảng bất động sản Trà Vinh: phòng trọ, nhà bán và đất nền. Pháp lý minh bạch, môi giới xác minh, hình ảnh thực tế.',
    robots: 'index',
  },
  search: {
    title: `Tìm kiếm bất động sản — ${BRAND}`,
    description: 'Tìm phòng trọ, nhà bán và đất nền tại Trà Vinh theo phường, mức giá và diện tích.',
    robots: 'index',
  },
  property: {
    title: `Chi tiết bất động sản — ${BRAND}`,
    description: 'Thông tin chi tiết bất động sản tại Trà Vinh: giá, diện tích, pháp lý, tiện ích và liên hệ môi giới.',
    robots: 'index',
  },
  projects: {
    title: `Dự án — ${BRAND}`,
    description: 'Các dự án bất động sản tại Trà Vinh do Công Tín Land phân phối.',
    robots: 'index',
  },
  brokers: {
    title: `Đội ngũ môi giới — ${BRAND}`,
    description: 'Đội ngũ môi giới Công Tín Land am hiểu thị trường Trà Vinh, đồng hành từ lúc xem nhà đến khi công chứng.',
    robots: 'index',
  },
  login: {
    title: `Đăng nhập — ${BRAND}`,
    description: 'Đăng nhập tài khoản Công Tín Land.',
    robots: 'noindex',
  },
  broker: {
    title: `Bảng điều khiển môi giới — ${BRAND}`,
    description: 'Bảng điều khiển môi giới Công Tín Land.',
    robots: 'noindex',
  },
  admin: {
    title: `Quản trị — ${BRAND}`,
    description: 'Trang quản trị Công Tín Land.',
    robots: 'noindex',
  },
};

export function buildPageMeta(routeKey, data = {}) {
  const base = PAGE_META[routeKey] ?? PAGE_META.home;
  if (routeKey === 'property' && data.propertyTitle) {
    return { ...base, title: `${data.propertyTitle} — ${BRAND}` };
  }
  return base;
}
