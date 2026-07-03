import { List, Datagrid, TextField, EmailField, SearchInput, SelectInput } from 'react-admin';
import { StatusChip, ToggleAccountStatus, USER_STATUS } from './statusControls.jsx';

const userFilters = [
  <SearchInput key="q" source="q" alwaysOn placeholder="Tìm tên, email, SĐT" />,
  <SelectInput key="status" source="status" choices={USER_STATUS} />,
];

export function UserList() {
  return (
    <List filters={userFilters} exporter={false} title="Tài khoản">
      <Datagrid bulkActionButtons={false} rowClick={false}>
        <TextField source="fullName" />
        <EmailField source="email" />
        <TextField source="role" />
        <StatusChip source="status" choices={USER_STATUS} />
        <ToggleAccountStatus resource="users" />
      </Datagrid>
    </List>
  );
}
