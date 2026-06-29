import '@testing-library/jest-dom/vitest';
import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import ViewingsPanel from './ViewingsPanel.jsx';

afterEach(cleanup);

const SAMPLE = [
  {
    id: 'v1',
    status: 'PENDING',
    propertyTitle: 'Nhà trọ Thanh Trúc',
    roomLabel: 'Phòng P.10',
    visitorName: 'Nguyễn Văn A',
    visitorPhone: '0901234567',
    requestedAt: '2026-07-01T09:00:00.000Z',
  },
];

test('renders empty state when there are no viewings', () => {
  render(<ViewingsPanel viewings={[]} />);
  expect(screen.getByText('Chưa có lịch hẹn xem')).toBeInTheDocument();
});

test('renders a viewing row with visitor and room info', () => {
  render(<ViewingsPanel viewings={SAMPLE} />);
  expect(screen.getByText('Nhà trọ Thanh Trúc')).toBeInTheDocument();
  expect(screen.getByText('Phòng: Phòng P.10')).toBeInTheDocument();
  expect(screen.getByText('Nguyễn Văn A')).toBeInTheDocument();
  expect(screen.getByText('0901234567')).toBeInTheDocument();
});

test('broker view (no onStatusChange) shows no status select', () => {
  render(<ViewingsPanel viewings={SAMPLE} />);
  expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
});

test('admin view calls onStatusChange when status is changed', () => {
  const onStatusChange = vi.fn();
  render(<ViewingsPanel viewings={SAMPLE} onStatusChange={onStatusChange} />);
  const select = screen.getByRole('combobox');
  fireEvent.change(select, { target: { value: 'CONFIRMED' } });
  expect(onStatusChange).toHaveBeenCalledWith('v1', 'CONFIRMED');
});
