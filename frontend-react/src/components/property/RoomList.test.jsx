import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RoomList from './RoomList.jsx';

afterEach(cleanup);

const ROOMS = [
  { label: 'Phòng A1', price: 2000000, available: true },
  { label: 'Phòng A2', price: 2200000, available: false },
];

describe('RoomList', () => {
  test('renders available and unavailable rooms', () => {
    render(<RoomList rooms={ROOMS} />);
    expect(screen.getByText('Phòng A1')).toBeInTheDocument();
    expect(screen.getByText('Phòng A2')).toBeInTheDocument();
    expect(screen.getByText('Còn trống')).toBeInTheDocument();
    expect(screen.getByText('Đã thuê')).toBeInTheDocument();
  });

  test('renders a select button only for available rooms', () => {
    render(<RoomList rooms={ROOMS} onSelectRoom={vi.fn()} />);
    const buttons = screen.getAllByRole('button', { name: 'Chọn' });
    // only 1 room is available
    expect(buttons).toHaveLength(1);
  });

  test('calls onSelectRoom with the label when Chọn is clicked', async () => {
    const onSelectRoom = vi.fn();
    render(<RoomList rooms={ROOMS} onSelectRoom={onSelectRoom} />);
    await userEvent.click(screen.getByRole('button', { name: 'Chọn' }));
    expect(onSelectRoom).toHaveBeenCalledWith('Phòng A1');
  });

  test('renders nothing when rooms is empty', () => {
    const { container } = render(<RoomList rooms={[]} />);
    expect(container.firstChild).toBeNull();
  });
});
