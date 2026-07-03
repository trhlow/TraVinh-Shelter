import { mergeTranslations } from 'ra-core';
import englishMessages from 'ra-language-english';

// Minimal Vietnamese dictionary: the labels an admin sees every day (resource names,
// column headers, primary actions, page titles). System messages (validation, etc.)
// stay in the bundled English defaults — out of scope for this pass.
export const viMessages = mergeTranslations(englishMessages, {
  ra: {
    auth: {
      logout: 'Đăng xuất',
      user_menu: 'Tài khoản',
    },
    action: {
      save: 'Lưu',
      cancel: 'Hủy',
      delete: 'Xóa',
      edit: 'Sửa',
      create: 'Tạo mới',
      create_item: 'Tạo mới',
      list: 'Danh sách',
      refresh: 'Làm mới',
      remove_filter: 'Bỏ bộ lọc',
      add_filter: 'Thêm bộ lọc',
      search: 'Tìm kiếm',
      back: 'Quay lại',
      confirm: 'Xác nhận',
    },
    page: {
      list: '%{name}',
      create: 'Tạo %{name}',
      edit: '%{name}',
      dashboard: 'Tổng quan',
      empty: 'Chưa có %{name}.',
      invite: 'Bạn có muốn tạo mới?',
      loading: 'Đang tải',
      not_found: 'Không tìm thấy',
    },
    navigation: {
      no_results: 'Không có kết quả',
      page_rows_per_page: 'Số dòng mỗi trang:',
      next: 'Sau',
      previous: 'Trước',
      skip_nav: 'Bỏ qua tới nội dung',
    },
  },
  resources: {
    brokers: {
      name: 'Môi giới',
      fields: {
        fullName: 'Họ tên',
        username: 'Tài khoản',
        email: 'Email',
        phone: 'Số điện thoại',
        password: 'Mật khẩu',
        status: 'Trạng thái',
      },
    },
    users: {
      name: 'Tài khoản',
      fields: {
        fullName: 'Họ tên',
        username: 'Tài khoản',
        email: 'Email',
        role: 'Vai trò',
        status: 'Trạng thái',
      },
    },
    properties: {
      name: 'Bài đăng',
      fields: {
        title: 'Tiêu đề',
        address: 'Địa chỉ',
        category: 'Danh mục',
        priceLabel: 'Giá',
        rawStatus: 'Trạng thái',
        createdAt: 'Ngày tạo',
      },
    },
    viewings: {
      name: 'Lịch hẹn xem',
      fields: {
        roomLabel: 'Phòng / tin',
        visitorName: 'Khách hẹn',
        visitorPhone: 'Số điện thoại',
        requestedAt: 'Thời gian hẹn',
        status: 'Trạng thái',
      },
    },
  },
});
