import { List, Datagrid, TextField, DateField, SearchInput, SelectInput } from 'react-admin';
import { InlineStatusSelect, StatusChip, VIEWING_STATUS } from './statusControls.jsx';

const viewingFilters = [
  <SearchInput key="q" source="q" alwaysOn placeholder="Tìm khách hẹn, SĐT" />,
  <SelectInput key="status" source="status" choices={VIEWING_STATUS} />,
];

export function ViewingList() {
  return (
    <List filters={viewingFilters} exporter={false} title="Lịch hẹn xem">
      <Datagrid bulkActionButtons={false} rowClick={false}>
        <TextField source="roomLabel" label="Phòng / tin" emptyText="—" />
        <TextField source="visitorName" />
        <TextField source="visitorPhone" />
        <DateField source="requestedAt" showTime emptyText="—" />
        <StatusChip source="status" choices={VIEWING_STATUS} />
        <InlineStatusSelect resource="viewings" source="status" choices={VIEWING_STATUS} />
      </Datagrid>
    </List>
  );
}
