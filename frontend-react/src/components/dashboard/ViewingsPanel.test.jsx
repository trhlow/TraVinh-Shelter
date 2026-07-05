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

test('with propertyLookup, resolves property title + broker instead of a raw UUID', () => {
  const viewing = {
    id: 'v2', status: 'CONFIRMED', propertyId: 'prop-1', visitorName: 'Trần Thị B',
    visitorPhone: '0909999999', requestedAt: '2026-07-01T09:00:00.000Z', createdAt: '2026-06-30T08:00:00.000Z',
  };
  const propertyLookup = { 'prop-1': { title: 'Nhà mới đường Nguyễn Đáng', broker: { name: 'Trần Mỹ Linh', phone: '0912345678' } } };
  render(<ViewingsPanel viewings={[viewing]} propertyLookup={propertyLookup} />);

  expect(screen.getByText('Nhà mới đường Nguyễn Đáng')).toBeInTheDocument();
  expect(screen.getByText('Trần Mỹ Linh')).toBeInTheDocument();
  expect(screen.getByText('0912345678')).toBeInTheDocument();
  expect(screen.queryByText('prop-1')).not.toBeInTheDocument();
});

test('with propertyLookup, flags a PENDING viewing older than 24h as needing broker contact', () => {
  const overdue = {
    id: 'v3', status: 'PENDING', propertyId: 'prop-1', visitorName: 'Lê Văn C',
    visitorPhone: '0908888888', requestedAt: '2026-07-01T09:00:00.000Z',
    createdAt: new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString(),
  };
  const propertyLookup = { 'prop-1': { title: 'Nhà mới đường Nguyễn Đáng', broker: { name: 'Trần Mỹ Linh', phone: '0912345678' } } };
  render(<ViewingsPanel viewings={[overdue]} propertyLookup={propertyLookup} />);

  expect(screen.getByText('Cần liên hệ môi giới')).toBeInTheDocument();
});

test('without propertyLookup (broker view), no broker/submitted-at columns and no overdue badge', () => {
  render(<ViewingsPanel viewings={SAMPLE} />);
  expect(screen.queryByText('Cần liên hệ môi giới')).not.toBeInTheDocument();
  expect(screen.queryByText('Môi giới')).not.toBeInTheDocument();
});
