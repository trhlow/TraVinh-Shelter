import { useState } from 'react';
import MaterialIcon from './MaterialIcon.jsx';

export default function SearchBar() {
  const [category, setCategory] = useState('all');
  const [ward, setWard] = useState('all');

  const search = new URLSearchParams({
    ...(category !== 'all' ? { category } : {}),
    ...(category === 'tro' ? { transaction: 'rent' } : {}),
    ...(ward !== 'all' ? { ward } : {}),
  }).toString();
  const href = search ? `#/search?${search}` : '#/search';

  return (
    <div className="ui-panel w-full max-w-[900px] mx-auto bg-surface-container-lowest/95 p-4 backdrop-blur-sm">
      <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-4">
        <label className="relative">
          <MaterialIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-outline">home</MaterialIcon>
          <select className="input h-14 !pl-12 font-body-md text-body-md" value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="all">Loại hình (Tất cả)</option>
            <option value="tro">Trọ</option>
            <option value="nha">Nhà</option>
            <option value="dat">Đất</option>
          </select>
        </label>
        <label className="relative">
          <MaterialIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-outline">location_on</MaterialIcon>
          <select className="input h-14 !pl-12 font-body-md text-body-md" value={ward} onChange={(event) => setWard(event.target.value)}>
            <option value="all">Khu vực (Tất cả)</option>
            <option value="phuong-6">Phường 6</option>
            <option value="phuong-7">Phường 7</option>
            <option value="cau-ngang">Cầu Ngang</option>
            <option value="chau-thanh">Châu Thành</option>
          </select>
        </label>
        <a className="ui-action h-14 px-10" href={href}>
          <MaterialIcon>search</MaterialIcon>
          Tìm kiếm
        </a>
      </div>
    </div>
  );
}
