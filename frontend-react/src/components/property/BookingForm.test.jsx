import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BookingForm from './BookingForm.jsx';

vi.mock('../../services/api.js', () => ({
  createViewing: vi.fn(() => Promise.resolve({ id: 'mock-viewing-1', status: 'PENDING' })),
}));

import { createViewing } from '../../services/api.js';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function renderForm(overrides = {}) {
  return render(
    <BookingForm propertyId="p-test" propertyTitle="Nhà trọ test" {...overrides} />,
  );
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

  test('shows validation errors and does NOT call createViewing when name+phone empty', async () => {
    renderForm();
    await userEvent.click(screen.getByRole('button', { name: /Đặt lịch hẹn/i }));
    expect(await screen.findByText(/Vui lòng nhập tên khách hàng/i)).toBeInTheDocument();
    expect(screen.getByText(/Vui lòng nhập số điện thoại/i)).toBeInTheDocument();
    expect(createViewing).not.toHaveBeenCalled();
  });

  test('rejects an invalid VN mobile number and does not submit', async () => {
    renderForm();
    await userEvent.type(screen.getByLabelText(/Tên khách hàng/i), 'Nguyễn Văn A');
    await userEvent.type(screen.getByLabelText(/Số điện thoại/i), '0123456789');
    await userEvent.click(screen.getByRole('button', { name: /Đặt lịch hẹn/i }));
    expect(await screen.findByText(/Số điện thoại di động không hợp lệ/i)).toBeInTheDocument();
    expect(createViewing).not.toHaveBeenCalled();
  });

  test('calls createViewing once with only propertyTitle, visitorName, visitorPhone, note', async () => {
    renderForm();
    await userEvent.type(screen.getByLabelText(/Tên khách hàng/i), 'Trần Văn B');
    await userEvent.type(screen.getByLabelText(/Số điện thoại/i), '0901234567');
    await userEvent.type(screen.getByLabelText(/Ghi chú/i), 'Xem vào cuối tuần');
    await userEvent.click(screen.getByRole('button', { name: /Đặt lịch hẹn/i }));

    await waitFor(() => expect(createViewing).toHaveBeenCalledTimes(1));
    const [calledId, calledPayload] = createViewing.mock.calls[0];
    expect(calledId).toBe('p-test');
    expect(calledPayload).toEqual({
      propertyTitle: 'Nhà trọ test',
      visitorName: 'Trần Văn B',
      visitorPhone: '0901234567',
      note: 'Xem vào cuối tuần',
    });
  });

  test('shows success message after valid submit', async () => {
    renderForm();
    await userEvent.type(screen.getByLabelText(/Tên khách hàng/i), 'Lê Thị C');
    await userEvent.type(screen.getByLabelText(/Số điện thoại/i), '0912345678');
    await userEvent.click(screen.getByRole('button', { name: /Đặt lịch hẹn/i }));

    expect(await screen.findByText(/Đã gửi yêu cầu đặt lịch/i)).toBeInTheDocument();
  });

  test('never renders commission-related text', () => {
    renderForm();
    expect(screen.queryByText(/hoa hồng/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/commission/i)).not.toBeInTheDocument();
  });
});
