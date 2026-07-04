import { useState } from 'react';
import Icon from '../ui/Icon.jsx';
import { createViewing } from '../../services/api.js';
import { VN_MOBILE_PATTERN } from '../../utils/validation.js';

function validate(fields) {
  const errors = {};
  if (!fields.visitorName.trim()) errors.visitorName = 'Vui lòng nhập tên khách hàng.';
  if (!fields.visitorPhone.trim()) {
    errors.visitorPhone = 'Vui lòng nhập số điện thoại.';
  } else if (!VN_MOBILE_PATTERN.test(fields.visitorPhone.trim())) {
    errors.visitorPhone = 'Số điện thoại di động không hợp lệ.';
  }
  return errors;
}

export default function BookingForm({ propertyId, propertyTitle }) {
  const [fields, setFields] = useState({
    visitorName: '',
    visitorPhone: '',
    note: '',
  });

  const [errors, setErrors] = useState({});
  const [sending, setSending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState('');

  function handleChange(e) {
    const { name, value } = e.target;
    setFields((prev) => ({ ...prev, [name]: value }));
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
      await createViewing(propertyId, {
        propertyTitle,
        visitorName: fields.visitorName.trim(),
        visitorPhone: fields.visitorPhone.trim(),
        note: fields.note.trim() || undefined,
      });
      setSubmitted(true);
    } catch {
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

  return (
    <form className="booking-form" onSubmit={handleSubmit} noValidate>
      <h3 className="booking-form-title">
        <Icon name="Calendar" size={18} className="icon-accent" />
        Đặt lịch xem
      </h3>

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
