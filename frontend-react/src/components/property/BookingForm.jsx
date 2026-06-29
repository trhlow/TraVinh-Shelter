import { useState, useEffect } from 'react';
import Icon from '../ui/Icon.jsx';
import { createViewing } from '../../services/api.js';

const isTro = (category) => category === 'tro';

function validate(fields) {
  const errors = {};
  if (!fields.visitorName.trim()) errors.visitorName = 'Vui lòng nhập tên khách hàng.';
  if (!fields.visitorPhone.trim()) errors.visitorPhone = 'Vui lòng nhập số điện thoại.';
  return errors;
}

export default function BookingForm({
  propertyId,
  category,
  propertyTitle,
  selectedRoom,
  rooms = [],
}) {
  const troMode = isTro(category);

  const [fields, setFields] = useState({
    visitorName: '',
    visitorPhone: '',
    note: '',
    requestedAt: '',
    expectedMoveIn: '',
    roomLabel: '',
    occupants: '',
    vehicles: '',
    pets: false,
  });

  const [errors, setErrors] = useState({});
  const [sending, setSending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Sync selectedRoom prop into roomLabel field
  useEffect(() => {
    if (selectedRoom) {
      setFields((prev) => ({ ...prev, roomLabel: selectedRoom }));
    }
  }, [selectedRoom]);

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setFields((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate(fields);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setSending(true);
    setSubmitError('');

    try {
      const payload = {
        propertyTitle,
        visitorName: fields.visitorName.trim(),
        visitorPhone: fields.visitorPhone.trim(),
        note: fields.note.trim() || undefined,
        requestedAt: fields.requestedAt ? new Date(fields.requestedAt).toISOString() : undefined,
        expectedMoveIn: fields.expectedMoveIn.trim() || undefined,
      };

      if (troMode) {
        if (fields.roomLabel) payload.roomLabel = fields.roomLabel;
        if (fields.occupants) payload.occupants = Number(fields.occupants);
        if (fields.vehicles) payload.vehicles = Number(fields.vehicles);
        payload.pets = fields.pets;
      }

      await createViewing(propertyId, payload);
      setSubmitted(true);
    } catch (err) {
      setSubmitError('Có lỗi xảy ra. Vui lòng thử lại hoặc liên hệ trực tiếp.');
    } finally {
      setSending(false);
    }
  }

  if (submitted) {
    return (
      <div className="booking-form-success">
        <Icon name="CalendarCheck" size={32} className="icon-accent" />
        <p className="booking-form-success-text">
          Đã gửi yêu cầu đặt lịch, môi giới sẽ liên hệ bạn sớm.
        </p>
      </div>
    );
  }

  const availableRooms = rooms.filter((r) => r.available);

  return (
    <form className="booking-form" onSubmit={handleSubmit} noValidate>
      <h3 className="booking-form-title">
        <Icon name="Calendar" size={18} className="icon-accent" />
        Đặt lịch xem
      </h3>

      {/* Datetime */}
      <div className="booking-form-field">
        <label className="booking-form-label" htmlFor="bf-requestedAt">
          Ngày &amp; giờ muốn xem
        </label>
        <input
          id="bf-requestedAt"
          name="requestedAt"
          type="datetime-local"
          className="booking-form-input"
          value={fields.requestedAt}
          onChange={handleChange}
        />
      </div>

      {/* Expected move-in */}
      <div className="booking-form-field">
        <label className="booking-form-label" htmlFor="bf-expectedMoveIn">
          Dự kiến vào ở
        </label>
        <input
          id="bf-expectedMoveIn"
          name="expectedMoveIn"
          type="text"
          placeholder="Ví dụ: 01/08/2025"
          className="booking-form-input"
          value={fields.expectedMoveIn}
          onChange={handleChange}
        />
      </div>

      {/* Room select — trọ only */}
      {troMode && availableRooms.length > 0 && (
        <div className="booking-form-field">
          <label className="booking-form-label" htmlFor="bf-roomLabel">
            Phòng muốn xem
          </label>
          <select
            id="bf-roomLabel"
            name="roomLabel"
            className="booking-form-input booking-form-select"
            value={fields.roomLabel}
            onChange={handleChange}
          >
            <option value="">— Chọn phòng —</option>
            {availableRooms.map((r) => (
              <option key={r.label} value={r.label}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Visitor name */}
      <div className="booking-form-field">
        <label className="booking-form-label" htmlFor="bf-visitorName">
          Tên khách hàng <span className="booking-form-required">*</span>
        </label>
        <input
          id="bf-visitorName"
          name="visitorName"
          type="text"
          placeholder="Nguyễn Văn A"
          className={`booking-form-input${errors.visitorName ? ' booking-form-input--error' : ''}`}
          value={fields.visitorName}
          onChange={handleChange}
        />
        {errors.visitorName && (
          <p className="booking-form-error">{errors.visitorName}</p>
        )}
      </div>

      {/* Visitor phone */}
      <div className="booking-form-field">
        <label className="booking-form-label" htmlFor="bf-visitorPhone">
          Số điện thoại <span className="booking-form-required">*</span>
        </label>
        <input
          id="bf-visitorPhone"
          name="visitorPhone"
          type="tel"
          placeholder="0901 234 567"
          className={`booking-form-input${errors.visitorPhone ? ' booking-form-input--error' : ''}`}
          value={fields.visitorPhone}
          onChange={handleChange}
        />
        {errors.visitorPhone && (
          <p className="booking-form-error">{errors.visitorPhone}</p>
        )}
      </div>

      {/* Note */}
      <div className="booking-form-field">
        <label className="booking-form-label" htmlFor="bf-note">
          Ghi chú
        </label>
        <textarea
          id="bf-note"
          name="note"
          rows={3}
          placeholder="Yêu cầu thêm..."
          className="booking-form-input booking-form-textarea"
          value={fields.note}
          onChange={handleChange}
        />
      </div>

      {/* Trọ-only fields */}
      {troMode && (
        <>
          <div className="booking-form-tro-row">
            <div className="booking-form-field booking-form-field--half">
              <label className="booking-form-label" htmlFor="bf-occupants">
                <Icon name="Users2" size={14} className="icon-muted" />
                Số người ở
              </label>
              <input
                id="bf-occupants"
                name="occupants"
                type="number"
                min={1}
                max={10}
                placeholder="1"
                className="booking-form-input"
                value={fields.occupants}
                onChange={handleChange}
              />
            </div>
            <div className="booking-form-field booking-form-field--half">
              <label className="booking-form-label" htmlFor="bf-vehicles">
                <Icon name="Bike" size={14} className="icon-muted" />
                Số lượng xe
              </label>
              <input
                id="bf-vehicles"
                name="vehicles"
                type="number"
                min={0}
                max={10}
                placeholder="1"
                className="booking-form-input"
                value={fields.vehicles}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="booking-form-field booking-form-field--checkbox">
            <label className="booking-form-checkbox-label" htmlFor="bf-pets">
              <input
                id="bf-pets"
                name="pets"
                type="checkbox"
                className="booking-form-checkbox"
                checked={fields.pets}
                onChange={handleChange}
              />
              <Icon name="PawPrint" size={14} className="icon-muted" />
              Nuôi thú cưng
            </label>
          </div>
        </>
      )}

      {submitError && (
        <p className="booking-form-error booking-form-error--submit">{submitError}</p>
      )}

      <button
        type="submit"
        className="btn btn-primary btn-md btn-full booking-form-submit"
        disabled={sending}
      >
        {sending ? (
          <>
            <Icon name="Clock" size={16} />
            Đang gửi...
          </>
        ) : (
          <>
            <Icon name="CalendarCheck" size={16} />
            Đặt lịch hẹn
          </>
        )}
      </button>
    </form>
  );
}
