import {
  List, Datagrid, TextField, EmailField, SearchInput, SelectInput,
  Create, SimpleForm, TextInput, PasswordInput, required, email as emailValidator,
} from 'react-admin';
import { StatusChip, ToggleAccountStatus, USER_STATUS } from './statusControls.jsx';

const brokerFilters = [
  <SearchInput key="q" source="q" alwaysOn placeholder="Tìm tên, email, SĐT" />,
  <SelectInput key="status" source="status" choices={USER_STATUS} />,
];

export function BrokerList() {
  return (
    <List filters={brokerFilters} exporter={false} title="Môi giới">
      <Datagrid bulkActionButtons={false} rowClick={false}>
        <TextField source="fullName" />
        <TextField source="username" />
        <EmailField source="email" />
        <TextField source="phone" />
        <StatusChip source="status" choices={USER_STATUS} />
        <ToggleAccountStatus resource="brokers" />
      </Datagrid>
    </List>
  );
}

export function BrokerCreate() {
  return (
    <Create redirect="list" title="Tạo môi giới">
      <SimpleForm>
        <TextInput source="username" validate={[required()]} />
        <TextInput source="email" validate={[required(), emailValidator()]} />
        <PasswordInput source="password" validate={[required()]} />
        <TextInput source="fullName" validate={[required()]} />
        <TextInput source="phone" validate={[required()]} />
      </SimpleForm>
    </Create>
  );
}
