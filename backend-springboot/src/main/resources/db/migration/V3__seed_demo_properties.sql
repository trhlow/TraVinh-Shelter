INSERT INTO users (id, username, password_hash, full_name, phone, email, role, status)
VALUES
    ('11111111-1111-1111-1111-111111111111', 'demo-broker', 'demo-password-hash', 'Nguyễn Văn A', '0901 234 567', 'broker@travinhrealty.vn', 'BROKER', 'ACTIVE')
ON CONFLICT (id) DO NOTHING;

INSERT INTO properties (id, broker_id, category_id, title, address, price, status, attributes)
VALUES
    (
        '22222222-2222-2222-2222-222222222221',
        '11111111-1111-1111-1111-111111111111',
        (SELECT id FROM categories WHERE slug = 'nha'),
        'Bán nhà phố liên kế đường Võ Nguyên Giáp, TP Trà Vinh',
        'Phường 7, TP Trà Vinh',
        2500000000,
        'AVAILABLE',
        '{
          "area": 100,
          "bedrooms": 3,
          "bathrooms": 2,
          "direction": "Đông Nam",
          "legal": "Sổ hồng riêng",
          "description": "Nhà phố liên kế thiết kế hiện đại, khu dân cư an ninh, phù hợp an cư hoặc đầu tư.",
          "image": "https://lh3.googleusercontent.com/aida-public/AB6AXuBkH3AYX5MrpWjt0snzYlgK8fLPrupR3ibSoxYSTJKFbDlusQS2_kfuaOpkSz0uYIdnBbfjmxOwDhXPfuNBK-5KR3p8oSYTzjvw0gTVGR4tzvN8f-9m-xbchIasS93NSEAxh634Ay8tX9GZbPo7KUtWFCZLZn70n5mVT5S4zs7OwXRfiWigHZtPY_3Tm9-oZkDSPrFPAxUd4vXrDG-gR-GW3R1IjKlZM8xJVmv0WUmk7FV8WLDIU3VX39UCLRoRpPA_modL10Ugt20"
        }'::jsonb
    ),
    (
        '22222222-2222-2222-2222-222222222222',
        '11111111-1111-1111-1111-111111111111',
        (SELECT id FROM categories WHERE slug = 'dat'),
        'Đất nền dự án khu dân cư mới, Cầu Ngang',
        'Thị trấn Cầu Ngang, Cầu Ngang',
        1200000000,
        'AVAILABLE',
        '{
          "area": 150,
          "legal": "Thổ cư 100%",
          "description": "Đất nền vuông vức, đường nhựa rộng, thích hợp xây nhà ở hoặc đầu tư dài hạn.",
          "image": "https://lh3.googleusercontent.com/aida-public/AB6AXuAUpxqUcNkJwe5SMvsATCUzNqKop1xaUKndLnxuDUCFODFiC0RbTczw45KfAAG6grxL3YLjd6TBF8tpAVViSGZsZYFIRb2uO902fO8ubE3YiybbfKyL_XlicFvzF-I6bVugqKQ1gaTc17i68sFAXbzY4cB_BhMYo8QDYmC-Dt9SLwdeaRHXJnlLQTNo0Bbj_PqybuMtecsv5GXtriadj-J9MMZtW1xnNZgKVDvCW-4dixEjQViaIpOu4Vnrm4Yu0aX-dYmM-GxlAiU"
        }'::jsonb
    ),
    (
        '22222222-2222-2222-2222-222222222223',
        '11111111-1111-1111-1111-111111111111',
        (SELECT id FROM categories WHERE slug = 'tro'),
        'NHÀ TRỌ THANH TRÚC - TRỐNG 2 PHÒNG',
        'Hẻm 42, Đường Điện Biên Phủ, Phường 6, TP Trà Vinh',
        1200000,
        'AVAILABLE',
        '{
          "area": 20,
          "bedrooms": 1,
          "bathrooms": 1,
          "direction": "Đông Nam",
          "transaction": "rent",
          "description": "Phòng sạch sẽ, có gác lửng, toilet riêng, khu vực yên tĩnh và gần Đại học Trà Vinh.",
          "image": "https://lh3.googleusercontent.com/aida-public/AB6AXuB9ef8-dberHibnQphjmNBcX1CWvOns0v5CdHRMuieROkgN1ruRBH2m5orpxiltXWsrnYy4OjnAJ1ZDFYlyQIbP4-RpZHN28Khpy_tKrWj48uWxXo3z0raX0j_Yw-hzjaQbDAMJVTQNw4new2hiLaRpz2K-hgHan5YDKB0gq-R7hCoqX9TJBOa77SfQamcPqd0ohYASG88UF5u8qHBg6OYZQmQxOV3Uk5omAtmxm2r5thmGWdkFhaDEqK086M4HiygSHqsCVYdRq4E"
        }'::jsonb
    )
ON CONFLICT (id) DO NOTHING;
