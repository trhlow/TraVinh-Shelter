-- Part (a): Canonicalize ward codes and align address text on existing V3 demo properties
UPDATE properties
SET attributes = jsonb_set(attributes, '{ward}', '"phuong-tra-vinh"'),
    address = 'Phường Trà Vinh, TP. Trà Vinh'
WHERE id = '22222222-2222-2222-2222-222222222221';

UPDATE properties
SET attributes = jsonb_set(attributes, '{ward}', '"phuong-hoa-thuan"'),
    address = 'Phường Hòa Thuận, TP. Trà Vinh'
WHERE id = '22222222-2222-2222-2222-222222222222';

UPDATE properties
SET attributes = jsonb_set(attributes, '{ward}', '"phuong-nguyet-hoa"'),
    address = 'Hẻm 42, Đường Điện Biên Phủ, Phường Nguyệt Hóa, TP. Trà Vinh'
WHERE id = '22222222-2222-2222-2222-222222222223';

-- Part (a-ext): Backfill extended trọ attributes on V3 demo property ...222223
-- Merges rooms/amenities/costs/conditions/summary while preserving existing keys (ward, area, etc.)
UPDATE properties
SET attributes = attributes || '{
  "transaction": "rent",
  "ward": "phuong-nguyet-hoa",
  "rooms": [
    { "label": "Phòng B.01", "price": 1200000, "available": true },
    { "label": "Phòng B.02", "price": 1200000, "available": false }
  ],
  "amenities": ["Giường", "Quạt trần", "Tủ quần áo", "Wifi", "Nước nóng"],
  "costs": {
    "electricity": { "value": "3.500đ/kWh" },
    "water": { "value": "50.000đ/người/tháng" },
    "service": { "value": "80.000đ/tháng" },
    "parking": { "value": "40.000đ/xe/tháng" }
  },
  "conditions": {
    "toilet": "Khép kín",
    "hours": "Tự do 24/7",
    "washer": "Giặt chung khu vực",
    "window": "Có cửa sổ thoáng",
    "balcony": "Không có",
    "pets": "Không nuôi",
    "parking": "Xe máy",
    "ev": "Không"
  },
  "summary": {
    "location": "Tọa lạc tại hẻm 42 đường Điện Biên Phủ, Phường Nguyệt Hóa — gần Đại học Trà Vinh và các tiện ích xung quanh.",
    "amenities": "Phòng thoáng mát, nội thất cơ bản đủ dùng, nước nóng riêng từng phòng, wifi tốc độ cao.",
    "convenience": "Khu vực yên tĩnh, chủ nhà thân thiện, phù hợp sinh viên. Hẻm thông xe máy, gần chợ và siêu thị."
  }
}'::jsonb
WHERE id = '22222222-2222-2222-2222-222222222223';

-- Part (b): Seed two trọ demo properties
INSERT INTO properties (id, broker_id, category_id, title, address, price, status, attributes)
VALUES
    (
        '33333333-3333-3333-3333-333333333301',
        '11111111-1111-1111-1111-111111111111',
        (SELECT id FROM categories WHERE slug = 'tro'),
        'Nhà trọ Điện Biên Phủ — sát ĐH Trà Vinh',
        'Phường Nguyệt Hóa, TP. Trà Vinh',
        1500000,
        'AVAILABLE',
        '{
          "ward": "phuong-nguyet-hoa",
          "area": 18,
          "transaction": "rent",
          "description": "Phòng trọ sạch sẽ, gần Đại học Trà Vinh, toilet khép kín, an ninh tốt.",
          "image": "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=900&q=80",
          "rooms": [
            { "label": "Phòng P.01", "price": 1500000, "available": true },
            { "label": "Phòng P.02", "price": 1500000, "available": false },
            { "label": "Phòng P.03", "price": 1600000, "available": true }
          ],
          "amenities": ["Giường", "Tủ lạnh", "Máy lạnh", "Wifi", "Nước nóng", "Tủ quần áo", "Gác"],
          "costs": {
            "electricity": { "value": "3.500đ/kWh" },
            "water": { "value": "60.000đ/người/tháng" },
            "service": { "value": "100.000đ/tháng" },
            "parking": { "value": "50.000đ/xe/tháng" }
          },
          "conditions": {
            "toilet": "Khép kín",
            "hours": "Tự do 24/7",
            "washer": "Giặt chung khu vực",
            "window": "Có cửa sổ thoáng",
            "balcony": "Không có",
            "pets": "Không nuôi",
            "parking": "Xe máy",
            "ev": "Không"
          },
          "summary": {
            "location": "Tọa lạc tại hẻm yên tĩnh đường Điện Biên Phủ, Phường Nguyệt Hóa — chỉ 5 phút đến Đại học Trà Vinh và gần các quán ăn, tiệm tạp hóa.",
            "amenities": "Phòng đủ nội thất cơ bản gồm giường, tủ lạnh, máy lạnh và wifi tốc độ cao. Gác lửng mở rộng không gian lưu trữ.",
            "convenience": "An ninh tốt, chủ nhà thân thiện, phù hợp sinh viên và người đi làm. Hẻm thông xe máy, gần trường và bệnh viện."
          }
        }'::jsonb
    ),
    (
        '33333333-3333-3333-3333-333333333302',
        '11111111-1111-1111-1111-111111111111',
        (SELECT id FROM categories WHERE slug = 'tro'),
        'Phòng trọ Hòa Thuận — nội thất đầy đủ',
        'Phường Hòa Thuận, TP. Trà Vinh',
        2000000,
        'AVAILABLE',
        '{
          "ward": "phuong-hoa-thuan",
          "area": 22,
          "transaction": "rent",
          "description": "Phòng trọ mới xây, đầy đủ nội thất, khu vực yên tĩnh, gần chợ và siêu thị Hòa Thuận.",
          "image": "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=900&q=80",
          "rooms": [
            { "label": "Phòng A1", "price": 2000000, "available": true },
            { "label": "Phòng A2", "price": 2000000, "available": true },
            { "label": "Phòng A3", "price": 2200000, "available": false }
          ],
          "amenities": ["Giường", "Tủ lạnh", "Máy lạnh", "Wifi", "Nước nóng", "Tủ quần áo", "Kệ bếp"],
          "costs": {
            "electricity": { "value": "3.500đ/kWh" },
            "water": { "value": "50.000đ/người/tháng" },
            "service": { "value": "Miễn phí", "free": true },
            "parking": { "value": "60.000đ/xe/tháng" }
          },
          "conditions": {
            "toilet": "Khép kín",
            "hours": "Tự do",
            "washer": "Máy giặt chung",
            "window": "Có cửa sổ",
            "balcony": "Có ban công nhỏ",
            "pets": "Không nuôi",
            "parking": "Xe máy, xe đạp",
            "ev": "Có chỗ sạc"
          },
          "summary": {
            "location": "Nằm trên đường chính khu vực Phường Hòa Thuận, cách chợ Hòa Thuận 3 phút đi bộ, gần siêu thị và trường tiểu học.",
            "amenities": "Phòng mới xây năm 2023, nội thất đầy đủ và hiện đại. Máy lạnh Daikin tiết kiệm điện, nước nóng riêng từng phòng.",
            "convenience": "Khu dân cư văn minh, hàng xóm thân thiện. Phù hợp cặp đôi hoặc người đi làm. Có máy giặt chung và bãi giữ xe an toàn."
          }
        }'::jsonb
    )
ON CONFLICT (id) DO NOTHING;
