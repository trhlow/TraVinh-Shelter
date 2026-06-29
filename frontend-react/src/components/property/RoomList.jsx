import Icon from '../ui/Icon.jsx';

const PRICE_FORMATTER = new Intl.NumberFormat('vi-VN');

function formatRoomPrice(price) {
  if (!price || price <= 0) return 'Liên hệ';
  if (price >= 1_000_000) {
    return `${(price / 1_000_000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} triệu/tháng`;
  }
  return `${PRICE_FORMATTER.format(price)}đ/tháng`;
}

export default function RoomList({ rooms = [], onSelectRoom }) {
  if (!rooms || rooms.length === 0) return null;

  return (
    <div className="room-list">
      {rooms.map((room) => (
        <div
          key={room.label}
          className={`room-list-item${room.available ? ' room-list-item--available' : ''}`}
        >
          <div className="room-list-info">
            <Icon name="BedDouble" size={16} className="icon-muted" />
            <span className="room-list-label">{room.label}</span>
          </div>
          <div className="room-list-right">
            <span className="room-list-price">{formatRoomPrice(room.price)}</span>
            {room.available ? (
              <span className="badge badge-success room-list-badge">Còn trống</span>
            ) : (
              <span className="badge badge-neutral room-list-badge">Đã thuê</span>
            )}
            {room.available && onSelectRoom && (
              <button
                type="button"
                className="room-list-select-btn"
                onClick={() => onSelectRoom(room.label)}
              >
                Chọn
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
