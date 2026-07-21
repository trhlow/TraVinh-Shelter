# Design: Dashboard chart visual redesign (2026 modern language, retire 3D-toggle donut)

**Ngày**: 2026-07-18
**Branch**: `redesign/ui-rebuild`
**Yêu cầu gốc**: "các chart đó có làm cho đẹp thêm được không? 2026 rồi tôi thấy các biểu đồ kiểu vậy ít ai
dùng lắm" → sau khi xác nhận muốn "mạnh tay" (không phải chỉ polish), đã brainstorm qua visual companion
(5 vòng mockup, `.superpowers/brainstorm/75627-1784365311/content/chart-combined-mockup-v5.html` là bản
cuối được duyệt, đánh giá 9.4/10, "đủ tốt để chốt UI").

## Vấn đề cụ thể của bộ chart cũ (lý do đổi, không phải gu)

- `ThreeDDonutChart` có nút chuyển `2D/3D` (`ChartModeToggle`, `.chart-mode-toggle`) — mô phỏng độ sâu
  giả cho pie chart, trào lưu dashboard doanh nghiệp ~2013-2015, không thêm thông tin, chỉ thêm hiệu ứng.
  Dataviz hiện đại (Stripe/Linear/Vercel) đã bỏ hẳn.
- `TrendBarLineChart`/`WardBarChart`/`CategoryBarChart` dùng cột chữ nhật thẳng cạnh, khung/lưới nặng —
  thẩm mỹ "enterprise BI cũ" so với chuẩn 2026 (thanh mảnh, đầu bo tròn, ít chrome hơn).
- 6 component trong `Charts.jsx` không còn nơi nào gọi (`DonutChart`, `BarChart`, `ThreeDAreaChart`,
  `HorizontalBarChart`, `TrendAreaChart`, `GaugeChart`) — xác nhận qua `grep -rl "<ComponentName"` trên
  `src/pages` + `src/components`, loại trừ `Charts.jsx`/`*.test.jsx` chính nó, mỗi cái 0 kết quả.

## Hướng thiết kế đã chốt qua visual companion

Người dùng tự đề xuất công thức pha trộn 3 hướng ban đầu (Minimal Line kiểu Stripe/Linear, Soft Bento kiểu
Notion/Attio, Editorial số liệu kiểu Basecamp) theo tỉ lệ **70% khung Bento (card bo góc, khoảng trắng) +
20% Minimal Line (biểu đồ xu hướng chính) + 10% Editorial (số to, thanh tỷ lệ)**. Sau 5 vòng tinh chỉnh
(căn trục ngày thật, tooltip không đè lên bộ lọc, card cân đối, màu đơn sắc thay vì màu-theo-ý-nghĩa-ngụ-ý),
bản v5 được duyệt là bản chốt. Ảnh chụp Puppeteer xác nhận: điểm dữ liệu và nhãn ngày thẳng hàng (cùng hệ
toạ độ SVG), tooltip không chồng lên bộ lọc thời gian, card "Hoạt động gần đây" cân với cột bên trái.

**4 điểm micro-polish cuối được yêu cầu áp dụng khi code thật** (không polish thêm ở mockup, làm thẳng
trong implementation):
1. Hover trên mini-bar-sparkline: nhẹ hơn viền đậm hiện tại (outline 2px) — dùng nền nhạt hoặc opacity,
   không tạo cảm giác "đã chọn/focus".
2. Tooltip của trend chart nằm gần điểm cuối hơn nữa (mockup đã sửa 1 lần, còn "hơi rời" theo đánh giá cuối
   — dùng khoảng cách 8-12px thay vì vị trí hiện tại).
3. Card "Hoạt động gần đây" nén nhẹ đáy hơn nữa (padding-bottom giảm thêm, không thêm nội dung giả để lấp
   chỗ trống).
4. Text mô tả kiểu "Bản v5 — sửa tooltip va chạm..." chỉ tồn tại trong mockup review, **không** đưa vào
   sản phẩm thật — tiêu đề thật là "Tổng quan hoạt động và xu hướng tin đăng" (admin) / tương đương cho
   broker.

## Bổ sung từ audit tham khảo (2026-07-18, sau khi spec ban đầu đã viết)

Người dùng chia sẻ 3 bài audit UI/UX bên ngoài (broker/admin/public site) để **tham khảo, không phải yêu
cầu nguyên văn** — đã xác minh một số claim cụ thể trong đó **sai** so với code thật (ví dụ: audit nói
trạng thái `CONFIRMED` chưa dịch, nhưng `ViewingsPanel.jsx:5` đã là `"Đã xác nhận"` từ trước — claim không
đối chiếu code thật, không tin nguyên văn các claim khác chưa tự kiểm chứng). Sau khi lọc, đúng **3 điểm**
chạm vào phạm vi chart đang spec, đủ cụ thể/ít rủi ro để đưa vào ngay:

1. **"Mật độ tin từng phường" (admin Reports) không nên là 4 card riêng** — audit chỉ ra 4 `CategoryBarChart`
   nhỏ đứng cạnh nhau khó so sánh hơn 1 bảng ma trận Phường × Danh mục. Đồng ý — xem component
   `WardCategoryMatrix` mới bên dưới, thay hoàn toàn cách tiếp cận "4 CategoryBreakdown" ban đầu dự định.
2. **"Top môi giới theo hoạt động" (admin Reports) không phải dữ liệu chuỗi thời gian** — chỉ 6 môi giới
   xếp hạng theo hoạt động, không có trục ngày/tháng thật. Dùng `TrendLineChart` (line chart) cho dữ liệu
   này là sai loại biểu đồ ngay từ trong code hiện tại (đã vậy trước khi có audit — đây là lỗi có thật, audit
   chỉ giúp phát hiện, không phải ý kiến thẩm mỹ). Thay bằng `RankingList` mới bên dưới.
3. **Trục ngày trên chart nhiều điểm cần thưa nhãn theo chiều rộng** — khi `TrendLineChart` render dữ liệu
   theo ngày (ví dụ broker's 28-31 điểm/tháng), không nhồi hết nhãn ngày vào cùng lúc trên màn hẹp. Thêm vào
   phần "Trục ngày" của `TrendLineChart` bên dưới.

Các phần khác của audit (đổi bộ KPI admin, filter toolbar chuẩn hóa, data table, redesign toàn broker/public
site, design token mới #176247...) **không** đưa vào phạm vi này — đổi ý nghĩa dữ liệu hiển thị hoặc là dự
án độc lập, để riêng làm backlog sau.

## Phạm vi — quyết định qua 3 câu hỏi làm rõ

**Q1 — WardBarChart/CategoryBarChart (cột đứng) có nằm trong phạm vi?** → **Có**, làm lại theo ngôn ngữ
mới (thanh ngang bo tròn, không phải cột đứng).

**Q2 — Thẻ KPI "Tin đăng: 24" trong mockup thay thế hay thêm vào hàng KPI hiện có?** → **Thay thế**: 1 thẻ
đóng vai trò KPI chính chuyển hẳn vào cụm mới; các KPI khác vẫn ở hàng riêng, gọn hơn, không trùng số liệu.

**Q3 (tự quyết định, không hỏi thêm — lý do nêu dưới) — Bố cục 2 cột của mockup áp dụng cho trang nào?**

Mockup được dựng quanh đúng bộ 4 panel của **Admin Overview** (KPI chính, trend chart, category breakdown,
audit log) — khớp 1-1 với cấu trúc trang đó sau khi đã tái tổ chức ở spec
`2026-07-18-broker-admin-dashboard-ia-redesign-design.md` (đã triển khai, xem
`docs/superpowers/plans/2026-07-18-broker-admin-dashboard-ia-redesign.md`).

**Broker dashboard có nhiều panel hơn** (activity chart, upcoming viewings, ward chart, type breakdown,
profile summary, recent listings — 6 panel, không phải 4) và **không** nằm trong phạm vi buổi brainstorm
này (không có ảnh chụp nào của broker được đưa ra để duyệt). Ép 6 panel vào khung 4-ô của mockup là suy
diễn ngoài phạm vi đã duyệt, rủi ro tái cấu trúc sai. Quyết định: **chỉ admin Overview được tái cấu trúc
bố cục** theo đúng wireframe đã duyệt; **broker dashboard và admin Reports giữ nguyên bố cục hàng/cột hiện
tại, chỉ thay "da" từng component chart bằng bộ component mới** (tinh thần giống quyết định đã có tiền lệ ở
spec IA-redesign: "nơi cấu trúc đã ổn thì không tái cấu trúc, chỉ nơi có vấn đề cụ thể mới đổi bố cục").

| Trang | Tái cấu trúc bố cục? | Đổi da component? |
|---|---|---|
| Admin Overview (`OverviewSection.jsx`) | **Có** — theo đúng wireframe mockup | Có |
| Broker Dashboard (`BrokerDashboard.jsx`) | Không — giữ nguyên hàng/cột hiện tại | Có |
| Admin Reports (`ReportsSection.jsx`) | Không — giữ nguyên hàng/cột hiện tại | Có |

## Component mới trong `components/Charts.jsx`

Xóa 10 component cũ không còn dùng sau redesign: `DonutChart`, `BarChart`, `ThreeDAreaChart`,
`HorizontalBarChart`, `TrendAreaChart`, `GaugeChart` (đã chết từ trước), cộng với `ThreeDDonutChart`,
`TrendBarLineChart`, `WardBarChart`, `CategoryBarChart` (bị 5 component mới dưới đây thay thế hoàn toàn ở
mọi call site). Xóa luôn phần hỗ trợ chỉ phục vụ các component trên: `ThreeDChartPanel`, `ChartModeToggle`,
`conicGradientFor`, `donutSegments`, `DONUT_HIT_R`, `DONUT_HIT_STROKE`, `TREND_LEFT_MARGIN` v.v. (rà lại
lúc viết plan — chỉ xóa phần thực sự không còn ai gọi, xác nhận bằng grep sau khi 3 component mới đã thay
thế xong, không xóa trước khi có consumer mới).

**Giữ nguyên, dùng lại**: `buildWardData`, `buildCategoryDensityData`, `buildDailySeries`,
`buildMonthlySeries`, `Sparkline`, `CHART_PALETTE`/`--chart-1..6` (rà lại cuối — nếu không component nào
trong file còn tham chiếu sau redesign thì coi là dọn dẹp tùy chọn, không bắt buộc phải xóa token CSS ở
`styles.css:53-58,122-127`, vì đó là rủi ro thấp/lợi ích thấp, để lại không hại gì), `ChartTooltip`,
`.chart-panel`/`.chart-tooltip*`/`.widget-state-block*` (CSS dùng chung, giữ nguyên).

### 1. `TrendLineChart` — thay `TrendBarLineChart` ở cả 5 call site

Props giữ **y hệt** `TrendBarLineChart` hiện tại — không đổi shape dữ liệu, không đổi call site nào ngoài
đổi tên import + tên component trong JSX:

```
TrendLineChart({ title, subtitle, data, currentLabel = 'Hiện tại', previousLabel = 'So sánh', rotateLabels = false })
```

`data: [{ label, current, previous }]` — giữ nguyên như 5 nơi gọi hiện có (xác nhận qua khảo sát: 4/5 nơi
có `previous` thật sự khác 0 — `activityChartData` broker, `systemActivityData` admin overview,
`topBrokerData` admin reports, và bản thân component's `hasPrevious` logic vốn đã xử lý; 1/5 nơi
(`userGrowthData` ở ReportsSection "Tăng trưởng người dùng mới") luôn có `previous: 0` — component vẫn
phải render đúng single-series khi đó, y như hành vi hiện tại).

**Hình học mới** (thay hoàn toàn cách vẽ hiện tại):
- Series `current`: 1 đường line (`stroke-width: 2.5`, `stroke-linecap/linejoin: round`) + vùng gradient
  mờ dưới đường (`stop-opacity` từ ~0.18 ở đỉnh xuống 0 ở đáy, màu `var(--color-primary)`).
- Series `previous` (chỉ vẽ khi `hasPrevious`): 1 đường line mảnh hơn (`stroke-width: 1.5`), **không** tô
  gradient, màu nhạt hơn (`color-mix(in srgb, var(--color-primary), transparent 55%)` hoặc tương đương) —
  giữ nguyên tắc "không donut/pie thứ 2 tranh sự chú ý", 2 đường trên cùng 1 chart vẫn rõ ràng vì có
  độ đậm/độ dày khác nhau.
- Điểm cuối của series `current`: 1 chấm tròn viền trắng nổi bật (như mockup) — **không** áp dụng cho mọi
  điểm như bug đã sửa trước đây (`trend-line-dot` cũ), chỉ điểm cuối + điểm đang hover.
- **Trục ngày**: label render bằng `<text>` **trong cùng SVG viewBox** với các điểm dữ liệu, dùng chung
  một hàm tính `x` cho cả điểm lẫn nhãn (đây là bài học rút ra từ chính quá trình làm mockup — bản đầu có
  bug điểm và nhãn lệch nhau vì 2 hệ toạ độ tách rời (CSS flex cho nhãn, SVG viewBox cho điểm); component
  thật vốn đã tính `columnCenterX` dùng chung cho bar/dot/label như `TrendBarLineChart` hiện tại — **bắt
  buộc giữ nguyên nguyên tắc "1 hàm tính x, dùng lại cho mọi thứ cần căn theo trục", không tách riêng**).
- **Thưa nhãn ngày khi nhiều điểm** (bổ sung từ audit, mục 3): khi `data.length` vượt một ngưỡng (ví dụ
  > 10 điểm — con số chính xác chốt lúc viết plan, dựa trên độ rộng nhãn ngày thực tế "12/07" ~5 ký tự),
  không render `<text>` cho mọi điểm — chỉ render nhãn ở một số điểm cách đều (ví dụ mỗi điểm thứ N) cộng
  điểm đầu/cuối luôn hiện. Áp dụng cho mọi kích thước màn hình bằng cùng 1 logic (không cần media query
  riêng, vì ngưỡng đã tính theo số điểm dữ liệu, không theo viewport) — khớp với trường hợp cụ thể nhất
  cần xử lý: broker's `activityChartData` có 28-31 điểm/tháng.
- **Bỏ hẳn control "7 ngày/30 ngày/12 tháng" trong chart** — mockup có control này để ngữ cảnh hoá hình
  ảnh, nhưng trang đã có `DateRangeFilter`/`admin-filter-bar` ở cấp trang lọc đúng dữ liệu này rồi. Thêm
  1 control thứ 2 ngay trong chart sẽ tạo 2 nơi lọc thời gian độc lập, gây nhầm "cái nào mới là bộ lọc thật"
  — không phải yêu cầu đã được duyệt (người dùng chỉ khen *hình thức* của control, không yêu cầu thêm
  tương tác mới). **Quyết định: không thêm control này vào implementation.**
- **Tooltip**: dùng lại `ChartTooltip` đã có (percent-of-viewBox positioning, đã validated), nhưng theo
  điểm micro-polish #2, đưa vị trí neo (`leftPct`/`topPct`) gần điểm hơn — cụ thể: neo ngay tại toạ độ
  điểm hover, không dịch thêm offset lớn như mockup ban đầu.
- **Empty state**: giữ nguyên logic `isEmpty` hiện có (mọi điểm `current`/`previous` đều 0 → hiện
  `widget-state-block` — đã có sẵn, không viết lại).

### 2. `CategoryBreakdown` — thay `ThreeDDonutChart` (3 nơi) + `WardBarChart` (1 nơi) + `CategoryBarChart` (4 nơi)

```
CategoryBreakdown({ title, subtitle, data, totalLabel = 'Tổng cộng', unitLabel = 'tin' })
```

`data: [{ label, value }]` — **đúng shape `ThreeDDonutChart` đã nhận** (không đổi cách tính dữ liệu ở bất
kỳ call site nào — `categoryDistributionData`, `managedTypeData`, `distributionData` giữ nguyên; chỉ
`wardChart`/`wardDensityData[].data` cần map lại field `count`→`value` tại call site, vì `buildWardData`/
`buildCategoryDensityData` hiện trả `{code/slug, label, count, pct}` — giữ nguyên 2 hàm này, chỉ đổi cách
JSX gọi component tiêu thụ chúng).

**Hình học mới** — thanh ngang bo tròn, thay hoàn toàn donut/cột đứng:
- Mỗi dòng: `label` (trái) — `giá trị + "· " + pct%` (phải, cùng hàng, `align-items:baseline`) — thanh
  tiến trình bo tròn (`border-radius: 9999px`, track nền `var(--color-hairline)` hoặc nhạt hơn, fill theo
  `pct`).
- **Màu đơn sắc, không phải đa sắc `CHART_PALETTE`**: mỗi dòng đã có nhãn chữ đi kèm nên nhận dạng không
  phụ thuộc màu (đúng nguyên tắc dataviz "identity is never color-alone" — ở đây nhãn chữ *là* identity,
  không cần hue riêng). Dùng 1 dải độ đậm của `var(--color-primary)` qua `color-mix()` (đã có tiền lệ dùng
  trong file này ở `.kpi-chip-navy`): dòng đầu 100% `--color-primary`, dòng sau nhạt dần
  (`color-mix(in srgb, var(--color-primary), white 30%)`, `color-mix(in srgb, var(--color-primary), white
  55%)`...). Đây là quyết định trực tiếp từ phản hồi "màu vàng ở Đất cần có lý do... nếu không nên dùng
  cùng xanh khác độ đậm" — áp dụng cho **mọi** nơi dùng component này, không riêng category breakdown.
  Dữ liệu có > 5 dòng (ví dụ ward breakdown 4 dòng, category density 3 dòng) vẫn đủ dải độ đậm phân biệt
  được — nếu > 6 dòng cần rà lại độ tương phản giữa các bậc liền kề lúc viết plan.
- Dòng cuối: `totalLabel` (mặc định "Tổng cộng") — tổng `value` — **không** suy luận "nhiều nhất" trong
  dòng này (bài học từ vòng review: gộp 2 thông tin khác nhau trên 1 dòng gây hiểu nhầm).
- **Empty state**: khi `data` rỗng hoặc mọi `value` = 0 — dùng lại `widget-state-block` pattern (như
  `TrendLineChart`/`ThreeDDonutChart` đã làm ở plan trước) thay vì vẽ thanh 0%.

### 3. `MiniBarSparkline` — bổ sung bên cạnh `Sparkline` hiện có, dùng trong `StatCard`

```
MiniBarSparkline({ series, activeCount = 2 })
```

`series: number[]` — cùng shape `Sparkline` đang nhận. Vẽ `series.length` cột mảnh đều nhau
(`border-radius: 2px`, căn đáy), `activeCount` cột cuối cùng tô `var(--color-primary)`, còn lại tô
`var(--color-hairline)` hoặc tương tự nhạt (đúng như mockup: 2 cột cuối đậm, còn lại nhạt, thể hiện "gần
đây" nổi bật hơn quá khứ). Hover từng cột: theo điểm micro-polish #1, dùng nền/opacity nhẹ, **không** dùng
viền `outline` đậm (tránh cảm giác "đã chọn").

### 4. `RankingList` — thay `TrendLineChart` riêng cho "Top môi giới theo hoạt động" (admin Reports)

```
RankingList({ title, subtitle, data, primaryLabel, secondaryLabel })
```

`data: [{ label, current, previous }]` — **shape y hệt** những gì `topBrokerData`/`buildTopBrokerData` đã
trả (không đổi hàm tính dữ liệu, chỉ đổi component tiêu thụ). Không có avatar trong dữ liệu hiện có — không
tự bịa thêm ảnh đại diện.

Hình dạng: danh sách xếp hạng, mỗi dòng = số thứ tự (`1.`, `2.`...) + `label` (tên môi giới, đã rút gọn sẵn
từ `buildTopBrokerData`) + 2 số liệu bên phải (`current` gắn `primaryLabel`, `previous` gắn
`secondaryLabel`, ví dụ "12 tin đăng · 5 lịch hẹn"). Có thể thêm 1 thanh ngang mảnh dưới tên thể hiện độ dài
tương đối của `current` so với người xếp hạng cao nhất (không bắt buộc, chỉ nếu không tốn thêm effort đáng
kể lúc code — nếu phức tạp hơn dự kiến, bỏ qua, danh sách xếp hạng thuần text vẫn đúng yêu cầu). Trường hợp
dữ liệu rỗng/placeholder (`buildTopBrokerData` trả `[{label:'Chưa có', current:0, previous:0}]` khi không
có môi giới) — hiện đúng dòng đó bình thường (đã là placeholder hợp lệ từ trước, không phải trường hợp cần
`widget-state-block`).

### 5. `WardCategoryMatrix` — thay 4 `CategoryBreakdown` riêng lẻ cho "Mật độ tin từng phường" (admin Reports)

```
WardCategoryMatrix({ title, subtitle, wards })
```

`wards`: **dùng thẳng shape `wardDensityData` hiện có** — `[{ code, label, data: [{slug, label, count,
pct}] }]`, không đổi `buildCategoryDensityData`/cách tính. Bảng: mỗi hàng = 1 phường, cột = Trọ/Nhà/Đất +
Tổng (tổng hàng = sum của `count` 3 category). Tô nền ô rất nhẹ theo độ lớn tương đối của `count` trong
toàn bảng (`color-mix(in srgb, var(--color-primary), transparent X%)`, X tính theo `count/maxCountInTable`
— cùng kỹ thuật color-mix đã dùng cho `CategoryBreakdown`, không phải kỹ thuật mới). Đây thay thế hoàn
toàn khối `dashboard-ward-density-row` (4 card riêng) hiện có — **xóa** khối đó, 1 bảng duy nhất chiếm chỗ.

## Thay đổi `StatCard` (`components/DashboardWidgets.jsx`) — chỉ nhánh có `series`

**Không đổi hành vi của StatCard khi không có `series`** (đa số KPI card khác trong app — "Tổng số người
dùng", "Môi giới hoạt động", "Lịch hẹn xác nhận tháng này"... — giữ nguyên y hệt, không rủi ro).

Khi `series` có (hiện chỉ 2 nơi: broker's "Tin đăng đang hoạt động" `activeListingsSparkline`, admin's
"Tổng số tin đăng" `totalListingsSparkline`):
- Đổi `<Sparkline>` → `<MiniBarSparkline>`.
- Đổi khối `trend` từ pill 1 dòng (`.kpi-trend`) sang 2 dòng xếp chồng: dòng 1 = `▲/▼ {value}` in đậm màu
  `var(--color-primary)`/`var(--color-error)` theo `direction`; dòng 2 = text phụ màu `var(--color-muted)`
  giải thích so sánh với gì (**cần thêm 1 prop mới**, ví dụ `trendContext: string`, ví dụ "so với 7 ngày
  trước" — call site phải truyền prop này tường minh, không suy luận ngầm; nếu không truyền, giữ nguyên
  hiển thị 1 dòng như hiện tại để không phá vỡ các nơi gọi khác chưa cập nhật).
- Thêm 1 dòng caption nhỏ dưới mini-chart (ví dụ "7 ngày gần nhất") — **prop mới**, ví dụ `seriesCaption`,
  optional, không hiện gì nếu không truyền.

## Bố cục mới cho Admin Overview (`OverviewSection.jsx`) — áp dụng đúng wireframe đã duyệt

Kế thừa cấu trúc đã có từ plan IA-redesign trước (header gộp, filter bar, `grid-4` KPI). Thay đổi tiếp:

1. **Rút "Tổng số tin đăng" khỏi `grid-4` KPI row** → còn 3 thẻ (Tổng số người dùng, Môi giới hoạt động,
   Lịch hẹn xác nhận tháng này) → đổi `grid-4` thành `grid-3` (đã có sẵn class này trong `styles.css`, xác
   nhận ở phần khảo sát trước — không cần class mới).
2. **Thay khối `dashboard-charts-row` (chart+donut hiện tại) bằng 1 grid 2 cột mới** (label tạm
   `dashboard-hero-row`, class mới, đơn giản: `grid-template-columns: 1fr 2fr` giống tỷ lệ mockup, breakpoint
   1 cột ở ≤1024px như các grid khác trong file):
   - Cột trái (hẹp), xếp dọc: `StatCard` "Tổng số tin đăng" (giờ có `series`/`trendContext`/`seriesCaption`)
     → `CategoryBreakdown` "Phân bổ theo danh mục" (dữ liệu y hệt `categoryDistributionData` hiện có).
   - Cột phải (rộng), xếp dọc: `TrendLineChart` "Hoạt động hệ thống theo tháng" → panel "Log hoạt động hệ
     thống" (`AuditTimeline`, giữ nguyên nội dung/logic, chỉ đổi vị trí lồng ghép).
3. **Panel "Tình trạng hệ thống"** (hiện đang ghép cùng hàng với audit log theo plan trước) — cột phải giờ
   chỉ còn 1 slot cho audit log (đã dời "Tình trạng hệ thống" ra). Đặt "Tình trạng hệ thống" thành 1 hàng
   riêng full-width bên dưới cụm 2 cột (giữ nguyên nội dung, chỉ đổi vị trí — đây là quyết định hợp lý nhất
   vì mockup không có chỗ tương đương cho nó, và nó không tự nhiên ghép cặp với category breakdown hay
   audit log về mặt nội dung).

## Broker dashboard + Admin Reports — chỉ đổi da, không đổi bố cục

`BrokerDashboard.jsx`: đổi `TrendBarLineChart`→`TrendLineChart`, `WardBarChart`→`CategoryBreakdown`,
`ThreeDDonutChart` (type breakdown)→`CategoryBreakdown`, `StatCard` "Tin đăng đang hoạt động" nhận thêm
`series`/`trendContext`/`seriesCaption`. Vị trí trong `dashboard-charts-row`/`dashboard-chart-span-2` giữ
nguyên y hệt (chart ở cột rộng, breakdown/upcoming-viewings ở cột hẹp) — chỉ tên component và data-mapping
(`count`→`value` cho ward data) đổi.

`ReportsSection.jsx`: `TrendBarLineChart`→`TrendLineChart` chỉ cho "Tăng trưởng người dùng mới" (dữ liệu
chuỗi tháng thật) — **"Top môi giới theo hoạt động" đổi sang `RankingList`**, không phải `TrendLineChart`
(sửa từ quyết định ban đầu của spec này, xem mục "Bổ sung từ audit"). `ThreeDDonutChart`→`CategoryBreakdown`
("Phân bổ tin đăng theo khu vực"). **`CategoryBarChart` × 4 (`dashboard-ward-density-row`) đổi hoàn toàn
sang 1 `WardCategoryMatrix`** thay vì 4 `CategoryBreakdown` — đây là điểm duy nhất ở `ReportsSection.jsx`
thực sự đổi số lượng panel (4 card → 1 bảng), không chỉ đổi da. Các panel khác trên trang giữ nguyên vị trí.

## Ngoài phạm vi

- Không thêm control lọc thời gian mới trong chart (đã giải thích ở trên).
- Không đổi `admin-filter-bar`/`DateRangeFilter` hiện có.
- Không đổi bố cục hàng/cột tổng thể của `BrokerDashboard.jsx`/`ReportsSection.jsx` — ngoại lệ duy nhất đã
  nêu rõ ở trên: `dashboard-ward-density-row` (4 card) → 1 `WardCategoryMatrix`, vì đây là hệ quả trực tiếp
  của việc đổi loại biểu diễn dữ liệu (4 chart nhỏ → 1 bảng), không phải tái cấu trúc trang.
- Không bắt buộc dọn `--chart-1..6` token/`CHART_PALETTE` nếu không còn ai dùng — để lại, rủi ro thấp.
- Không thêm `onSelectWard`-kiểu drill-down mới cho `CategoryBreakdown` (prop này tồn tại ở `WardBarChart`
  cũ nhưng xác nhận qua grep: không nơi nào thực sự truyền nó — không phải chức năng đang hoạt động, không
  cần giữ).

## Test plan (chi tiết hoá lúc viết plan)

- `Charts.test.jsx`: viết lại toàn bộ test cho `TrendLineChart`/`CategoryBreakdown`/`MiniBarSparkline`/
  `RankingList`/`WardCategoryMatrix` (thay test cũ của `TrendBarLineChart`/`ThreeDDonutChart`/
  `WardBarChart`/`CategoryBarChart`, không giữ song song 2 bộ test cho 2 API khác nhau của cùng 1 nhu cầu).
  Thêm case riêng cho `TrendLineChart`'s thưa-nhãn-ngày (nhiều điểm → không phải mọi điểm đều có `<text>`)
  và `RankingList`'s trường hợp placeholder rỗng (`[{label:'Chưa có', current:0, previous:0}]`).
- `OverviewSection.test.jsx`, `BrokerDashboard.*.test.jsx`, `ReportsSection.test.jsx`: cập nhật theo tên
  component mới nếu test hiện tại query theo tên cũ; hầu hết vẫn pass nếu chỉ query theo text/role.
- `DashboardWidgets.test.jsx` (nếu tồn tại — xác nhận lúc viết plan): thêm case `StatCard` với
  `trendContext`/`seriesCaption` mới, xác nhận case không truyền các prop này vẫn render y hệt hành vi cũ
  (backward-compat).
- `npm test -- --run` toàn bộ, không thấp hơn baseline 248 hiện tại (số lượng test cụ thể sẽ đổi vì thay
  hẳn bộ test của 4 component cũ bằng 3 component mới — tổng số có thể tăng/giảm, quan trọng là 0 fail).
- Xác minh trực quan bằng Puppeteer thật: chụp cả 3 trang (broker dashboard, admin overview, admin reports)
  ở sáng/tối, đối chiếu với mockup v5 đã duyệt cho admin overview cụ thể.
