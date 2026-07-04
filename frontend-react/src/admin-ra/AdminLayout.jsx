import { Layout, Menu } from 'react-admin';
import { MenuItem, ListItemIcon, ListItemText } from '@mui/material';
import Icon from '../components/ui/Icon.jsx';

// react-admin auto-renders the resource menu items; we append a plain anchor that escapes
// the admin HashRouter (basename="/admin") back to the site root via the outer hash router.
function AdminMenu() {
  return (
    <Menu>
      <Menu.ResourceItems />
      <MenuItem component="a" href="#/">
        <ListItemIcon>
          <Icon name="Home" size={20} />
        </ListItemIcon>
        <ListItemText>Về trang chủ</ListItemText>
      </MenuItem>
    </Menu>
  );
}

export default function AdminLayout(props) {
  return <Layout {...props} menu={AdminMenu} />;
}
