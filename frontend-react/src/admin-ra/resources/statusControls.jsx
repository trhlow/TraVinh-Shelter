import { useRecordContext, useUpdate, useNotify, useRefresh } from 'react-admin';
import { Button, Chip, MenuItem, Select } from '@mui/material';

export const USER_STATUS = [
  { id: 'ACTIVE', name: 'Hoạt động' },
  { id: 'LOCKED', name: 'Đã khóa' },
];

export const PROPERTY_STATUS = [
  { id: 'AVAILABLE', name: 'Đang hiển thị' },
  { id: 'SOLD', name: 'Đã bán' },
  { id: 'RENTED', name: 'Đã thuê' },
  { id: 'HIDDEN', name: 'Đã ẩn' },
];

export const VIEWING_STATUS = [
  { id: 'PENDING', name: 'Chờ xác nhận' },
  { id: 'CONFIRMED', name: 'Đã xác nhận' },
  { id: 'CANCELLED', name: 'Đã hủy' },
];

const STATUS_COLOR = {
  ACTIVE: 'success', LOCKED: 'error',
  AVAILABLE: 'success', PENDING: 'warning', SOLD: 'default', RENTED: 'info', HIDDEN: 'default',
  CONFIRMED: 'success', CANCELLED: 'error',
};

function labelOf(choices, id) {
  return choices.find((c) => c.id === id)?.name ?? id;
}

// Read-only colored chip for a status value (`source` defaults to `status`).
export function StatusChip({ source = 'status', choices = [] }) {
  const record = useRecordContext();
  if (!record) return null;
  const value = record[source];
  return <Chip size="small" color={STATUS_COLOR[value] || 'default'} label={labelOf(choices, value)} />;
}

// Inline dropdown that commits the new status immediately (pessimistic — no undo delay).
export function InlineStatusSelect({ resource, source = 'status', choices }) {
  const record = useRecordContext();
  const notify = useNotify();
  const refresh = useRefresh();
  const [update, { isPending }] = useUpdate();
  if (!record) return null;

  const onChange = (event) => {
    const status = event.target.value;
    update(
      resource,
      { id: record.id, data: { status }, previousData: record },
      {
        mutationMode: 'pessimistic',
        onSuccess: () => { notify('Đã cập nhật trạng thái', { type: 'info' }); refresh(); },
        onError: (error) => notify(error.message || 'Cập nhật thất bại', { type: 'error' }),
      },
    );
  };

  return (
    <Select
      size="small"
      value={record[source] || ''}
      onChange={onChange}
      disabled={isPending}
      onClick={(event) => event.stopPropagation()}
      sx={{ minWidth: 150 }}
    >
      {choices.map((choice) => <MenuItem key={choice.id} value={choice.id}>{choice.name}</MenuItem>)}
    </Select>
  );
}

// Lock / unlock toggle for user & broker accounts.
export function ToggleAccountStatus({ resource }) {
  const record = useRecordContext();
  const notify = useNotify();
  const refresh = useRefresh();
  const [update, { isPending }] = useUpdate();
  if (!record) return null;

  const locked = record.status !== 'ACTIVE';
  const next = locked ? 'ACTIVE' : 'LOCKED';

  const onClick = (event) => {
    event.stopPropagation();
    update(
      resource,
      { id: record.id, data: { status: next }, previousData: record },
      {
        mutationMode: 'pessimistic',
        onSuccess: () => { notify('Đã cập nhật trạng thái', { type: 'info' }); refresh(); },
        onError: (error) => notify(error.message || 'Cập nhật thất bại', { type: 'error' }),
      },
    );
  };

  return (
    <Button size="small" variant="outlined" color={locked ? 'success' : 'warning'} disabled={isPending} onClick={onClick}>
      {locked ? 'Mở khóa' : 'Khóa'}
    </Button>
  );
}
