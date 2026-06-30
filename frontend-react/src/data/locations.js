export const WARDS = [
  { code: 'all', label: 'Tất cả Trà Vinh' },
  { code: 'phuong-tra-vinh', label: 'Phường Trà Vinh', lat: 9.9347, lng: 106.3453 },
  { code: 'phuong-long-duc', label: 'Phường Long Đức', lat: 9.9626, lng: 106.3392 },
  { code: 'phuong-nguyet-hoa', label: 'Phường Nguyệt Hóa', lat: 9.9050, lng: 106.3210 },
  { code: 'phuong-hoa-thuan', label: 'Phường Hòa Thuận', lat: 9.8870, lng: 106.3010 },
];

// Map center + zoom for the Trà Vinh ward overview map.
export const TRA_VINH_CENTER = { lat: 9.93, lng: 106.34, zoom: 12 };

export const CATEGORIES = [
  { slug: 'tro', label: 'Trọ' },
  { slug: 'nha', label: 'Nhà' },
  { slug: 'dat', label: 'Đất' },
];

export function wardLabel(code) {
  if (!code || code === 'all') return 'Tất cả Trà Vinh';
  const found = WARDS.find((w) => w.code === code);
  return found ? found.label : 'Tất cả Trà Vinh';
}

export function categoryLabel(slug) {
  const found = CATEGORIES.find((c) => c.slug === slug);
  return found ? found.label : slug;
}
