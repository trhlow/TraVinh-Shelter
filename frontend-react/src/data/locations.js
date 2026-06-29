export const WARDS = [
  { code: 'all', label: 'Tất cả Trà Vinh' },
  { code: 'phuong-tra-vinh', label: 'Phường Trà Vinh' },
  { code: 'phuong-long-duc', label: 'Phường Long Đức' },
  { code: 'phuong-nguyet-hoa', label: 'Phường Nguyệt Hóa' },
  { code: 'phuong-hoa-thuan', label: 'Phường Hòa Thuận' },
];

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
