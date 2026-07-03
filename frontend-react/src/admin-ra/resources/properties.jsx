import { List, Datagrid, TextField, DateField, SearchInput, SelectInput } from 'react-admin';
import { InlineStatusSelect, StatusChip, PROPERTY_STATUS } from './statusControls.jsx';

const propertyFilters = [
  <SearchInput key="q" source="q" alwaysOn placeholder="Tìm tiêu đề, địa chỉ" />,
  <SelectInput key="status" source="status" choices={PROPERTY_STATUS} />,
];

export function PropertyList() {
  return (
    <List filters={propertyFilters} exporter={false} title="Bài đăng">
      <Datagrid bulkActionButtons={false} rowClick={false}>
        <TextField source="title" />
        <TextField source="address" />
        <TextField source="category" />
        <TextField source="priceLabel" label="Giá" sortBy="price" />
        <StatusChip source="rawStatus" choices={PROPERTY_STATUS} />
        <DateField source="createdAt" showTime />
        <InlineStatusSelect resource="properties" source="rawStatus" choices={PROPERTY_STATUS} />
      </Datagrid>
    </List>
  );
}
