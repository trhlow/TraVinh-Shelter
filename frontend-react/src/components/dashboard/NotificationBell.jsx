import { useState } from 'react';
import Icon from '../ui/Icon.jsx';

export default function NotificationBell({ notifications = [] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="notif-bell">
      <button className="notif-bell-btn" type="button" aria-label="Thông báo" onClick={() => setOpen((current) => !current)}>
        <Icon name="Bell" size={18} />
        {notifications.length > 0 && <span className="notif-badge">{notifications.length}</span>}
      </button>
      {open && (
        <div className="notif-dropdown">
          {notifications.length === 0 ? (
            <p className="notif-empty">Không có thông báo mới.</p>
          ) : notifications.map((item) => (
            <a className="notif-item" key={item.id} href={item.href} onClick={() => setOpen(false)}>
              <Icon name={item.icon} size={16} className={item.tone === 'warning' ? 'icon-accent' : 'icon-muted'} />
              {item.text}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
