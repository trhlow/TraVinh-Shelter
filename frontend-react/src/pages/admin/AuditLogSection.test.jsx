import '@testing-library/jest-dom/vitest';
import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';

vi.mock('../../services/api.js', () => ({
  fetchAdminAuditLogs: vi.fn(),
}));
import { fetchAdminAuditLogs } from '../../services/api.js';
import AuditLogSection from './AuditLogSection.jsx';

afterEach(() => { cleanup(); vi.clearAllMocks(); });

const baseProps = {
  session: { token: 't' },
  data: { users: [], brokers: [], properties: [], viewings: [] },
  loading: false,
  saving: false,
  actions: {},
  queryParams: {},
};

test('renders audit entries with Vietnamese action labels', async () => {
  fetchAdminAuditLogs.mockResolvedValue([
    { id: 'a1', action: 'LOCK_USER', actorEmail: 'admin@x.vn', targetLabel: 'Phạm Quốc Huy', detail: 'Khóa do vi phạm', createdAt: '2026-06-30T08:00:00Z' },
  ]);
  render(<AuditLogSection {...baseProps} />);
  await waitFor(() => expect(screen.getByText('Phạm Quốc Huy')).toBeInTheDocument());
  const tableElement = screen.getByRole('table');
  expect(within(tableElement).getByText('Khóa tài khoản')).toBeInTheDocument();
});

test('shows an empty state when fetch returns []', async () => {
  fetchAdminAuditLogs.mockResolvedValue([]);
  render(<AuditLogSection {...baseProps} />);
  await waitFor(() => expect(screen.getByText('Chưa có nhật ký')).toBeInTheDocument());
});
