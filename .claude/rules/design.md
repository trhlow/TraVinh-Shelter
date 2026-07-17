# Design System — Công Tín Land

> Rewritten from scratch on branch `redesign/ui-rebuild` (2026-07-17). The previous version
> described an "Airbnb-inspired" system with accent `#ff385c` — Airbnb's own brand colour — that
> the code never actually implemented. This document describes what we build, not what we admire.

## Vị thế

**Uy tín — Tận tâm — Hiệu quả.** Không phải *Sang trọng*. Không phải *Ấn tượng*.

Người dùng là người tìm phòng trọ gần Đại học Trà Vinh, gia đình mua nhà, người bán đất. Họ cần
**tin được** và **tìm được**. Thiết kế phục vụ hai việc đó; mọi thứ khác là trang trí.

Tiêu chí đẹp của dự án này: **rõ ràng đến mức không ai phải hỏi lại.**

## Ba nguyên tắc

1. **Kiềm chế.** Xấu đến từ thừa, không phải từ thiếu. Thêm gì cũng phải trả giá.
2. **Thứ bậc.** Mỗi màn hình có đúng một thứ quan trọng nhất. Thứ khác lùi lại.
3. **Nhịp.** Khoảng cách theo thang, không theo cảm hứng. Đây là thứ vô hình tạo cảm giác tĩnh.

## Ảnh: ta không kiểm soát ảnh, nên ta kiểm soát cái khung

Ảnh tin đăng do chủ trọ, chủ đất tự chụp — tối, lệch, ám màu, đủ tỉ lệ. Đây là **ràng buộc thiết
kế nền tảng**, không phải chi tiết kỹ thuật.

Hệ quả bắt buộc:

- **Một tỉ lệ duy nhất** cho mọi ảnh tin đăng: `aspect-ratio: 4 / 3`, `object-fit: cover`,
  `object-position: center`. Không ngoại lệ ngoài gallery chi tiết và banner.
- **Luôn có `width`/`height`** trên `<img>` — trang nhảy khi ảnh tải đọc là rẻ tiền.
- **Ảnh không phải ngôi sao.** Thông tin (giá, diện tích, vị trí) gánh sức nặng thị giác, vì
  thông tin là thứ ta kiểm soát được. Đây là điểm khác biệt cố ý so với Airbnb/Apple: họ đẹp vì
  kiểm soát từng tấm ảnh; ta thì không.
- Luôn có ảnh thay thế khi thiếu ảnh — không bao giờ để khung vỡ.

## Màu

Xanh lá + vàng đồng. Đây là màu của **đất và sự bền vững ở đồng bằng sông Cửu Long** — của riêng
Công Tín Land, không mượn của ai.

Token semantic (`:root` = light, `[data-theme="dark"]` override). Component **chỉ** tham chiếu
token; không bao giờ hex thô trong JSX hay CSS ngoài khối định nghĩa token.

| Token | Light | Dùng cho |
|---|---|---|
| `--color-primary` | `#1d5a44` | CTA, link thương hiệu, accent duy nhất |
| `--color-gold` | `#c69a4c` | Nhấn phụ — giá, huy hiệu. Dùng tiết chế |
| `--color-canvas` | `#ffffff` | Nền |
| `--color-surface-soft` | `#f5f6f3` | Nền phụ, hover |
| `--color-ink` | `#16211c` | Tiêu đề, giá |
| `--color-body` | `#33403a` | Văn bản |
| `--color-muted` | `#6b7671` | Meta, nhãn phụ |
| `--color-hairline` | `#e8eae4` | Đường kẻ 1px |

Giá trị đầy đủ ở `src/styles/tokens.css`. **Một màu nhấn duy nhất** — không có màu nhấn thứ hai.

## Chữ — thang cứng, 6 cỡ

Bản cũ để CSS trôi thành **20 cỡ chữ** (kể cả `13.5px`, `12.5px`, và `34px` vi phạm chính quy tắc
của nó). 20 cỡ không phải thang — đó là chọn theo cảm hứng, và đó là thứ mắt đọc ra là "nghiệp dư".

Từ nay đúng **6 cỡ**. Không thêm. Cần nhấn thì đổi weight, không đổi size.

| Token | Size | Weight | Dùng cho |
|---|---|---|---|
| `--text-display` | 28px | 700 | h1 trang |
| `--text-title` | 20px | 700 | Giá trên thẻ, tiêu đề mục |
| `--text-body` | 16px | 400 | Văn bản chạy |
| `--text-sm` | 14px | 400/600 | Tiêu đề thẻ, nhãn nút |
| `--text-caption` | 13px | 400 | Meta: diện tích, phòng, vị trí |
| `--text-badge` | 11px | 600 | Huy hiệu |

Font: `'Be Vietnam Pro'` — đủ dấu tiếng Việt. **Không heading nào quá 28px.**

**Độ dài dòng**: mọi văn bản chạy dài (mô tả BĐS) phải có `max-width: 68ch`. Dòng 150 ký tự làm
người đọc mỏi mắt và bỏ đi.

## Khoảng cách — thang 4px, không có ngoại lệ

`--space-1: 4px` · `--space-2: 8px` · `--space-3: 12px` · `--space-4: 16px` · `--space-6: 24px` ·
`--space-8: 32px` · `--space-12: 48px` · `--space-16: 64px`

Không viết `px` thô cho margin/padding/gap. Bản cũ có **1229 giá trị px thô** trong khi vẫn ghi
một thang trong tài liệu — token nửa vời tệ hơn không có token, vì nó tạo ảo giác có hệ thống.

## Bo góc & đổ bóng

`--radius-sm: 8px` (nút) · `--radius-md: 12px` (thẻ, ảnh) · `--radius-full: 9999px` (chip, badge)

**Một tier đổ bóng duy nhất**, dùng cho hover thẻ và dropdown. Phần lớn bề mặt phẳng.
Không dùng `!important` — bản cũ đạt 0 lần trong 4400 dòng; giữ kỷ luật đó.

## Thẻ tin đăng — sản phẩm chính

Thẻ là phần tử **lặp lại nhiều nhất** trên toàn site (trang tìm kiếm hàng trăm cái). 90% ấn tượng
thị giác hình thành ở đây. Chăm chút nó đáng giá hơn redesign bất kỳ trang nào.

Thứ tự đọc, từ trên xuống — **giá trước tiêu đề**, vì người mua BĐS quét theo giá và diện tích,
không theo tên tin:

1. Ảnh (khung chuẩn hoá) + chip loại BĐS
2. **Giá** — to nhất, đậm nhất
3. **Facts**: `45m² · 2 PN · 1 WC` — thứ khách lọc theo
4. Vị trí: phường, **không phải địa chỉ đầy đủ** (địa chỉ dài là nhiễu trên thẻ)
5. Tiêu đề — cắt 2 dòng, thứ yếu

Bản cũ hiện tiêu đề + địa chỉ + giá và **bỏ sót diện tích/phòng ngủ/WC** dù dữ liệu có sẵn.

## Trạng thái hỏng — nơi đẹp thật sự sống

Trang nào cũng đẹp với dữ liệu demo. Chỉ đường hỏng mới phân biệt người làm nghiêm túc.

- **Không bao giờ hiển thị dữ liệu giả.** Bản cũ hiện một phòng trọ bịa ("Thanh Trúc") khi fetch
  lỗi — trên một sàn có tagline *Uy tín*, đây là lỗi nặng nhất có thể mắc.
- Mỗi luồng cần: loading state, empty state, error state — thiết kế thật, không phải chữ trần.
- Thiếu ảnh, thiếu giá, thiếu diện tích đều phải có cách hiện tử tế.

## Không dùng

- Thư viện UI ngoài (MUI, Ant, Chakra). Chỉ `lucide-react` cho icon.
- `inline style`.
- Hex thô ngoài khối token.
- Màu nhấn thứ hai.
- Animation phức tạp — chỉ `transition` ngắn, có lý do.
