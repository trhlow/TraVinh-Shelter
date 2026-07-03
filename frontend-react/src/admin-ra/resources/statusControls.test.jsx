import '@testing-library/jest-dom/vitest';
import { afterEach, expect, test } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { AdminContext, RecordContextProvider, testDataProvider } from 'react-admin';
import { ToggleAccountStatus } from './statusControls.jsx';

afterEach(cleanup);

function renderToggle(record) {
  return render(
    <AdminContext dataProvider={testDataProvider()}>
      <RecordContextProvider value={record}>
        <ToggleAccountStatus resource="users" />
      </RecordContextProvider>
    </AdminContext>,
  );
}

test('admin rows show a protected chip instead of a lock button', () => {
  renderToggle({ id: 1, role: 'ADMIN', status: 'ACTIVE' });

  expect(screen.queryByRole('button', { name: 'Khóa' })).not.toBeInTheDocument();
  expect(screen.getByText('Quản trị viên')).toBeInTheDocument();
});

test('non-admin active rows keep the lock button', () => {
  renderToggle({ id: 2, role: 'USER', status: 'ACTIVE' });

  expect(screen.getByRole('button', { name: 'Khóa' })).toBeInTheDocument();
});

test('locked broker rows keep the unlock button', () => {
  renderToggle({ id: 3, role: 'BROKER', status: 'LOCKED' });

  expect(screen.getByRole('button', { name: 'Mở khóa' })).toBeInTheDocument();
});
