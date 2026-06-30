import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BookingForm from './BookingForm.jsx';

// ── Mock createViewing so tests don't hit real API or localStorage side-effects ──
vi.mock('../../services/api.js', () => ({
  createViewing: vi.fn(() => Promise.resolve({ id: 'mock-viewing-1', status: 'PENDING' })),
}));

import { createViewing } from '../../services/api.js';

const TRO_ROOMS = [
  { label: 'Phòng P.01', price: 1500000, available: true },
  { label: 'Phòng P.02', price: 1500000, available: false },
];

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// ── Trọ category ──────────────────────────────────────────────────────────────
describe('BookingForm — trọ category', () => {
  function renderTro(overrides = {}) {
    return render(
      <BookingForm
        propertyId="p-tro-test"
        category="tro"
        propertyTitle="Nhà trọ test"
        rooms={TRO_ROOMS}
        {...overrides}
      />,
    );
  }

  test('renders trọ-only fields: occupants, vehicles, pets', () => {
    renderTro();
    expect(screen.getByLabelText(/Số người ở/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Số lượng xe/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Nuôi thú cưng/i)).toBeInTheDocument();
  });

  test('renders room select with available rooms only', () => {
    renderTro();
    const select = screen.getByLabelText(/Phòng muốn xem/i);
    expect(select).toBeInTheDocument();
    // only available room P.01 shown; P.02 (unavailable) should NOT appear
    expect(screen.getByRole('option', { name: 'Phòng P.01' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Phòng P.02' })).not.toBeInTheDocument();
  });

  test('syncs selectedRoom prop into room select', () => {
    renderTro({ selectedRoom: 'Phòng P.01' });
    const select = screen.getByLabelText(/Phòng muốn xem/i);
    expect(select.value).toBe('Phòng P.01');
  });

  test('shows validation errors and does NOT call createViewing when name+phone empty', async () => {
    renderTro();
    await userEvent.click(screen.getByRole('button', { name: /Đặt lịch hẹn/i }));
    expect(await screen.findByText(/Vui lòng nhập tên khách hàng/i)).toBeInTheDocument();
    expect(screen.getByText(/Vui lòng nhập số điện thoại/i)).toBeInTheDocument();
    expect(createViewing).not.toHaveBeenCalled();
  });

  test('calls createViewing once with correct payload on valid submit', async () => {
    renderTro();
    await userEvent.type(screen.getByLabelText(/Tên khách hàng/i), 'Trần Văn B');
    await userEvent.type(screen.getByLabelText(/Số điện thoại/i), '0901234567');
    await userEvent.click(screen.getByRole('button', { name: /Đặt lịch hẹn/i }));

    await waitFor(() => expect(createViewing).toHaveBeenCalledTimes(1));
    const [calledId, calledPayload] = createViewing.mock.calls[0];
    expect(calledId).toBe('p-tro-test');
    expect(calledPayload.visitorName).toBe('Trần Văn B');
    expect(calledPayload.visitorPhone).toBe('0901234567');
    // pets field must be present for trọ
    expect('pets' in calledPayload).toBe(true);
  });

  test('shows success message after valid submit', async () => {
    renderTro();
    await userEvent.type(screen.getByLabelText(/Tên khách hàng/i), 'Lê Thị C');
    await userEvent.type(screen.getByLabelText(/Số điện thoại/i), '0912345678');
    await userEvent.click(screen.getByRole('button', { name: /Đặt lịch hẹn/i }));

    expect(
      await screen.findByText(/Đã gửi yêu cầu đặt lịch/i),
    ).toBeInTheDocument();
  });
});

// ── Validation: phone + dates ──────────────────────────────────────────────────
describe('BookingForm — validation', () => {
  function renderTro(overrides = {}) {
    return render(
      <BookingForm
        propertyId="p-tro-test"
        category="tro"
        propertyTitle="Nhà trọ test"
        rooms={TRO_ROOMS}
        {...overrides}
      />,
    );
  }

  test('rejects an invalid VN mobile number and does not submit', async () => {
    renderTro();
    await userEvent.type(screen.getByLabelText(/Tên khách hàng/i), 'Nguyễn Văn A');
    await userEvent.type(screen.getByLabelText(/Số điện thoại/i), '0123456789');
    await userEvent.click(screen.getByRole('button', { name: /Đặt lịch hẹn/i }));

    expect(await screen.findByText(/Số điện thoại di động không hợp lệ/i)).toBeInTheDocument();
    expect(createViewing).not.toHaveBeenCalled();
  });

  test('rejects a view date in the past', async () => {
    renderTro();
    await userEvent.type(screen.getByLabelText(/Tên khách hàng/i), 'Nguyễn Văn A');
    await userEvent.type(screen.getByLabelText(/Số điện thoại/i), '0901234567');
    fireEvent.change(screen.getByLabelText(/Ngày.*muốn xem/i), { target: { value: '2020-01-01T10:00' } });
    await userEvent.click(screen.getByRole('button', { name: /Đặt lịch hẹn/i }));

    expect(await screen.findByText(/Ngày xem không được ở quá khứ/i)).toBeInTheDocument();
    expect(createViewing).not.toHaveBeenCalled();
  });

  test('rejects a move-in date earlier than the view date', async () => {
    renderTro();
    await userEvent.type(screen.getByLabelText(/Tên khách hàng/i), 'Nguyễn Văn A');
    await userEvent.type(screen.getByLabelText(/Số điện thoại/i), '0901234567');
    fireEvent.change(screen.getByLabelText(/Ngày.*muốn xem/i), { target: { value: '2030-06-15T10:00' } });
    fireEvent.change(screen.getByLabelText(/Dự kiến vào ở/i), { target: { value: '2030-06-14' } });
    await userEvent.click(screen.getByRole('button', { name: /Đặt lịch hẹn/i }));

    expect(await screen.findByText(/Ngày vào ở không được trước ngày xem/i)).toBeInTheDocument();
    expect(createViewing).not.toHaveBeenCalled();
  });

  test('accepts a move-in date on/after the view date', async () => {
    renderTro();
    await userEvent.type(screen.getByLabelText(/Tên khách hàng/i), 'Nguyễn Văn A');
    await userEvent.type(screen.getByLabelText(/Số điện thoại/i), '0901234567');
    fireEvent.change(screen.getByLabelText(/Ngày.*muốn xem/i), { target: { value: '2030-06-15T10:00' } });
    fireEvent.change(screen.getByLabelText(/Dự kiến vào ở/i), { target: { value: '2030-06-20' } });
    await userEvent.click(screen.getByRole('button', { name: /Đặt lịch hẹn/i }));

    await waitFor(() => expect(createViewing).toHaveBeenCalledTimes(1));
  });
});

// ── Nhà/Đất category ─────────────────────────────────────────────────────────
describe('BookingForm — nhà category', () => {
  function renderNha() {
    return render(
      <BookingForm
        propertyId="p-nha-test"
        category="nha"
        propertyTitle="Nhà phố test"
        rooms={[]}
      />,
    );
  }

  test('does NOT render trọ-only fields for nhà', () => {
    renderNha();
    expect(screen.queryByLabelText(/Số người ở/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Số lượng xe/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Nuôi thú cưng/i)).not.toBeInTheDocument();
  });

  test('does NOT render room select for nhà', () => {
    renderNha();
    expect(screen.queryByLabelText(/Phòng muốn xem/i)).not.toBeInTheDocument();
  });

  test('payload for nhà does NOT include pets/occupants/vehicles', async () => {
    renderNha();
    await userEvent.type(screen.getByLabelText(/Tên khách hàng/i), 'Phạm Văn D');
    await userEvent.type(screen.getByLabelText(/Số điện thoại/i), '0934567890');
    await userEvent.click(screen.getByRole('button', { name: /Đặt lịch hẹn/i }));

    await waitFor(() => expect(createViewing).toHaveBeenCalledTimes(1));
    const [, payload] = createViewing.mock.calls[0];
    expect('pets' in payload).toBe(false);
    expect('occupants' in payload).toBe(false);
    expect('vehicles' in payload).toBe(false);
  });
});

// ── Đất category ──────────────────────────────────────────────────────────────
describe('BookingForm — đất category', () => {
  test('does NOT render trọ-only fields for đất', () => {
    render(
      <BookingForm
        propertyId="p-dat-test"
        category="dat"
        propertyTitle="Đất test"
        rooms={[]}
      />,
    );
    expect(screen.queryByLabelText(/Số người ở/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Nuôi thú cưng/i)).not.toBeInTheDocument();
  });
});

// ── No commission text anywhere ────────────────────────────────────────────────
describe('BookingForm — commission guard', () => {
  test('never renders commission-related text', () => {
    render(
      <BookingForm
        propertyId="p-any"
        category="tro"
        propertyTitle="Test"
        rooms={TRO_ROOMS}
      />,
    );
    expect(screen.queryByText(/hoa hồng/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/commission/i)).not.toBeInTheDocument();
  });
});
