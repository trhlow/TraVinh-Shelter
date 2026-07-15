import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BookingForm from './BookingForm.jsx';

vi.mock('../../services/api.js', () => ({
  requestViewingOtp: vi.fn(() => Promise.resolve({ message: 'OK', otpRequired: false })),
  verifyViewingOtp: vi.fn(() => Promise.resolve({ id: 'mock-viewing-1', status: 'PENDING' })),
}));

import { requestViewingOtp, verifyViewingOtp } from '../../services/api.js';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function renderForm(overrides = {}) {
  return render(
    <BookingForm propertyId="p-test" propertyTitle="Nhà trọ test" {...overrides} />,
  );
}

async function fillAndSubmitForm({ name = 'Trần Văn B', phone = '0901234567', note } = {}) {
  await userEvent.type(screen.getByLabelText(/Tên khách hàng/i), name);
  await userEvent.type(screen.getByLabelText(/Số điện thoại/i), phone);
  if (note) await userEvent.type(screen.getByLabelText(/Ghi chú/i), note);
  await userEvent.click(screen.getByRole('button', { name: /Đặt lịch hẹn/i }));
}

describe('BookingForm', () => {
  test('renders only Tên khách hàng, Số điện thoại, and Ghi chú fields', () => {
    renderForm();
    expect(screen.getByLabelText(/Tên khách hàng/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Số điện thoại/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Ghi chú/i)).toBeInTheDocument();
  });

  test('does NOT render the removed fields', () => {
    renderForm();
    expect(screen.queryByLabelText(/Ngày.*muốn xem/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Dự kiến vào ở/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Phòng muốn xem/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Số người ở/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Số lượng xe/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Nuôi thú cưng/i)).not.toBeInTheDocument();
  });

  test('shows validation errors and does NOT call requestViewingOtp when name+phone empty', async () => {
    renderForm();
    await userEvent.click(screen.getByRole('button', { name: /Đặt lịch hẹn/i }));
    expect(await screen.findByText(/Vui lòng nhập tên khách hàng/i)).toBeInTheDocument();
    expect(screen.getByText(/Vui lòng nhập số điện thoại/i)).toBeInTheDocument();
    expect(requestViewingOtp).not.toHaveBeenCalled();
  });

  test('rejects an invalid VN mobile number and does not submit', async () => {
    renderForm();
    await userEvent.type(screen.getByLabelText(/Tên khách hàng/i), 'Nguyễn Văn A');
    await userEvent.type(screen.getByLabelText(/Số điện thoại/i), '0123456789');
    await userEvent.click(screen.getByRole('button', { name: /Đặt lịch hẹn/i }));
    expect(await screen.findByText(/Số điện thoại di động không hợp lệ/i)).toBeInTheDocument();
    expect(requestViewingOtp).not.toHaveBeenCalled();
  });

  test('when OTP is not required, submits straight through and shows success', async () => {
    renderForm();
    await fillAndSubmitForm({ note: 'Xem vào cuối tuần' });

    await waitFor(() => expect(requestViewingOtp).toHaveBeenCalledTimes(1));
    expect(requestViewingOtp).toHaveBeenCalledWith('p-test', { visitorPhone: '0901234567' });

    await waitFor(() => expect(verifyViewingOtp).toHaveBeenCalledTimes(1));
    const [calledId, calledPayload] = verifyViewingOtp.mock.calls[0];
    expect(calledId).toBe('p-test');
    expect(calledPayload.booking).toEqual({
      propertyTitle: 'Nhà trọ test',
      visitorName: 'Trần Văn B',
      visitorPhone: '0901234567',
      note: 'Xem vào cuối tuần',
    });
    expect(calledPayload.otpCode).toMatch(/^\d{6}$/);

    expect(await screen.findByText(/Đã gửi yêu cầu đặt lịch/i)).toBeInTheDocument();
  });

  test('when OTP is required, shows the OTP step and does not call verifyViewingOtp yet', async () => {
    requestViewingOtp.mockResolvedValueOnce({ message: 'Mã OTP đã được gửi qua SMS.', otpRequired: true });
    renderForm();
    await fillAndSubmitForm();

    expect(await screen.findByLabelText(/Mã OTP/i)).toBeInTheDocument();
    expect(verifyViewingOtp).not.toHaveBeenCalled();
  });

  test('submits the entered OTP code and shows success', async () => {
    requestViewingOtp.mockResolvedValueOnce({ message: 'Mã OTP đã được gửi qua SMS.', otpRequired: true });
    renderForm();
    await fillAndSubmitForm();

    await userEvent.type(await screen.findByLabelText(/Mã OTP/i), '123456');
    await userEvent.click(screen.getByRole('button', { name: /Xác nhận/i }));

    await waitFor(() => expect(verifyViewingOtp).toHaveBeenCalledTimes(1));
    const [, calledPayload] = verifyViewingOtp.mock.calls[0];
    expect(calledPayload.otpCode).toBe('123456');
    expect(calledPayload.booking).toEqual({
      propertyTitle: 'Nhà trọ test',
      visitorName: 'Trần Văn B',
      visitorPhone: '0901234567',
      note: '',
    });

    expect(await screen.findByText(/Đã gửi yêu cầu đặt lịch/i)).toBeInTheDocument();
  });

  test('going back from the OTP step returns to the form', async () => {
    requestViewingOtp.mockResolvedValueOnce({ message: 'Mã OTP đã được gửi qua SMS.', otpRequired: true });
    renderForm();
    await fillAndSubmitForm();
    await screen.findByLabelText(/Mã OTP/i);

    await userEvent.click(screen.getByRole('button', { name: /Đổi số điện thoại/i }));

    expect(screen.getByLabelText(/Tên khách hàng/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Mã OTP/i)).not.toBeInTheDocument();
  });

  test('shows an inline error and allows retry when the OTP code is wrong', async () => {
    requestViewingOtp.mockResolvedValueOnce({ message: 'Mã OTP đã được gửi qua SMS.', otpRequired: true });
    verifyViewingOtp.mockRejectedValueOnce(new Error('Mã OTP không hợp lệ hoặc đã hết hạn'));
    renderForm();
    await fillAndSubmitForm();

    await userEvent.type(await screen.findByLabelText(/Mã OTP/i), '000000');
    await userEvent.click(screen.getByRole('button', { name: /Xác nhận/i }));

    expect(await screen.findByText(/Mã OTP không hợp lệ hoặc đã hết hạn/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Mã OTP/i)).toBeInTheDocument();
  });

  test('shows the real error message instead of a generic fallback when request-otp fails', async () => {
    requestViewingOtp.mockRejectedValueOnce(new Error('Không tìm thấy bất động sản'));
    renderForm();
    await fillAndSubmitForm();

    expect(await screen.findByText('Không tìm thấy bất động sản')).toBeInTheDocument();
  });

  test('falls back to a generic message when the failure has no message (e.g. network error)', async () => {
    requestViewingOtp.mockRejectedValueOnce(new Error());
    renderForm();
    await fillAndSubmitForm();

    expect(await screen.findByText(/Có lỗi xảy ra. Vui lòng thử lại hoặc liên hệ trực tiếp\./i)).toBeInTheDocument();
  });

  test('never renders commission-related text', () => {
    renderForm();
    expect(screen.queryByText(/hoa hồng/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/commission/i)).not.toBeInTheDocument();
  });
});
