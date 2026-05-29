-- Sprint C7A — NM reference & demo dataset (no reviews, decisions, or match results)

CREATE UNIQUE INDEX IF NOT EXISTS uq_customers_nm_external_id
    ON customers (customer_external_id)
    WHERE customer_external_id IS NOT NULL;

-- Customers (25) — idempotent via external_id
INSERT INTO customers (
    customer_external_id, customer_name, email, phone, customer_segment, metadata
)
SELECT v.ext_id, v.name, v.email, v.phone, v.segment, v.meta::jsonb
FROM (
    VALUES
    ('NM-CUST-001', 'Анна Смирнова', 'anna.smirnova@nm-demo.retail', '+79001234001', 'premium', '{"loyalty_tier":"gold","city":"Москва"}'::jsonb),
    ('NM-CUST-002', 'Игорь Волков', 'igor.volkov@nm-demo.retail', '+79001234002', 'retail', '{"loyalty_tier":"silver","city":"Санкт-Петербург"}'::jsonb),
    ('NM-CUST-003', 'Елена Кузнецова', 'elena.kuznetsova@nm-demo.retail', '+79001234003', 'retail', '{"loyalty_tier":"standard","city":"Казань"}'::jsonb),
    ('NM-CUST-004', 'Дмитрий Орлов', 'dmitry.orlov@nm-demo.retail', '+79001234004', 'b2b', '{"company":"ООО СеверТорг","city":"Новосибирск"}'::jsonb),
    ('NM-CUST-005', 'Мария Петрова', 'maria.petrova@nm-demo.retail', '+79001234005', 'premium', '{"loyalty_tier":"platinum","city":"Москва"}'::jsonb),
    ('NM-CUST-006', 'Алексей Морозов', 'alexey.morozov@nm-demo.retail', '+79001234006', 'retail', '{"loyalty_tier":"standard","city":"Екатеринбург"}'::jsonb),
    ('NM-CUST-007', 'Ольга Новикова', 'olga.novikova@nm-demo.retail', '+79001234007', 'new_customer', '{"first_order":"2026-04","city":"Краснодар"}'::jsonb),
    ('NM-CUST-008', 'Сергей Лебедев', 'sergey.lebedev@nm-demo.retail', '+79001234008', 'retail', '{"loyalty_tier":"silver","city":"Воронеж"}'::jsonb),
    ('NM-CUST-009', 'Татьяна Соколова', 'tatiana.sokolova@nm-demo.retail', '+79001234009', 'premium', '{"loyalty_tier":"gold","city":"Москва"}'::jsonb),
    ('NM-CUST-010', 'Павел Егоров', 'pavel.egorov@nm-demo.retail', '+79001234010', 'b2b', '{"company":"ИП Егоров","city":"Самара"}'::jsonb),
    ('NM-CUST-011', 'Наталья Федорова', 'natalia.fedorova@nm-demo.retail', '+79001234011', 'retail', '{"loyalty_tier":"standard","city":"Ростов-на-Дону"}'::jsonb),
    ('NM-CUST-012', 'Виктор Романов', 'viktor.romanov@nm-demo.retail', '+79001234012', 'retail', '{"loyalty_tier":"silver","city":"Уфа"}'::jsonb),
    ('NM-CUST-013', 'Юлия Васильева', 'yulia.vasilieva@nm-demo.retail', '+79001234013', 'new_customer', '{"first_order":"2026-03","city":"Тюмень"}'::jsonb),
    ('NM-CUST-014', 'Андрей Захаров', 'andrey.zakharov@nm-demo.retail', '+79001234014', 'retail', '{"loyalty_tier":"standard","city":"Пермь"}'::jsonb),
    ('NM-CUST-015', 'Екатерина Белова', 'ekaterina.belova@nm-demo.retail', '+79001234015', 'premium', '{"loyalty_tier":"gold","city":"Москва"}'::jsonb),
    ('NM-CUST-016', 'Михаил Григорьев', 'mikhail.grigoriev@nm-demo.retail', '+79001234016', 'b2b', '{"company":"Григорьев и партнёры","city":"Нижний Новгород"}'::jsonb),
    ('NM-CUST-017', 'Светлана Макарова', 'svetlana.makarova@nm-demo.retail', '+79001234017', 'retail', '{"loyalty_tier":"silver","city":"Омск"}'::jsonb),
    ('NM-CUST-018', 'Константин Никитин', 'konstantin.nikitin@nm-demo.retail', '+79001234018', 'retail', '{"loyalty_tier":"standard","city":"Челябинск"}'::jsonb),
    ('NM-CUST-019', 'Ирина Павлова', 'irina.pavlova@nm-demo.retail', '+79001234019', 'new_customer', '{"first_order":"2026-05","city":"Сочи"}'::jsonb),
    ('NM-CUST-020', 'Роман Степанов', 'roman.stepanov@nm-demo.retail', '+79001234020', 'retail', '{"loyalty_tier":"standard","city":"Волгоград"}'::jsonb),
    ('NM-CUST-021', 'Алина Козлова', 'alina.kozlova@nm-demo.retail', '+79001234021', 'premium', '{"loyalty_tier":"platinum","city":"Москва"}'::jsonb),
    ('NM-CUST-022', 'Георгий Семёнов', 'georgy.semenov@nm-demo.retail', '+79001234022', 'retail', '{"loyalty_tier":"silver","city":"Калининград"}'::jsonb),
    ('NM-CUST-023', 'Вероника Медведева', 'veronika.medvedeva@nm-demo.retail', '+79001234023', 'retail', '{"loyalty_tier":"standard","city":"Иркутск"}'::jsonb),
    ('NM-CUST-024', 'Фёдор Борисов', 'fedor.borisov@nm-demo.retail', '+79001234024', 'b2b', '{"company":"Борисов Опт","city":"Хабаровск"}'::jsonb),
    ('NM-CUST-025', 'Людмила Тихонова', 'ludmila.tikhonova@nm-demo.retail', '+79001234025', 'retail', '{"loyalty_tier":"gold","city":"Москва"}'::jsonb)
) AS v(ext_id, name, email, phone, segment, meta)
WHERE NOT EXISTS (
    SELECT 1 FROM customers c WHERE c.customer_external_id = v.ext_id
);

UPDATE customers c
SET
    customer_name = v.name,
    email = v.email,
    phone = v.phone,
    customer_segment = v.segment,
    metadata = v.meta::jsonb,
    updated_at = NOW()
FROM (
    VALUES
        ('NM-CUST-001', 'Анна Смирнова', 'anna.smirnova@nm-demo.retail', '+79001234001', 'premium', '{"loyalty_tier":"gold","city":"Москва"}'),
        ('NM-CUST-002', 'Игорь Волков', 'igor.volkov@nm-demo.retail', '+79001234002', 'retail', '{"loyalty_tier":"silver","city":"Санкт-Петербург"}'),
        ('NM-CUST-003', 'Елена Кузнецова', 'elena.kuznetsova@nm-demo.retail', '+79001234003', 'retail', '{"loyalty_tier":"standard","city":"Казань"}'),
        ('NM-CUST-004', 'Дмитрий Орлов', 'dmitry.orlov@nm-demo.retail', '+79001234004', 'b2b', '{"company":"ООО СеверТорг","city":"Новосибирск"}'),
        ('NM-CUST-005', 'Мария Петрова', 'maria.petrova@nm-demo.retail', '+79001234005', 'premium', '{"loyalty_tier":"platinum","city":"Москва"}'),
        ('NM-CUST-006', 'Алексей Морозов', 'alexey.morozov@nm-demo.retail', '+79001234006', 'retail', '{"loyalty_tier":"standard","city":"Екатеринбург"}'),
        ('NM-CUST-007', 'Ольга Новикова', 'olga.novikova@nm-demo.retail', '+79001234007', 'new_customer', '{"first_order":"2026-04","city":"Краснодар"}'),
        ('NM-CUST-008', 'Сергей Лебедев', 'sergey.lebedev@nm-demo.retail', '+79001234008', 'retail', '{"loyalty_tier":"silver","city":"Воронеж"}'),
        ('NM-CUST-009', 'Татьяна Соколова', 'tatiana.sokolova@nm-demo.retail', '+79001234009', 'premium', '{"loyalty_tier":"gold","city":"Москва"}'),
        ('NM-CUST-010', 'Павел Егоров', 'pavel.egorov@nm-demo.retail', '+79001234010', 'b2b', '{"company":"ИП Егоров","city":"Самара"}'),
        ('NM-CUST-011', 'Наталья Федорова', 'natalia.fedorova@nm-demo.retail', '+79001234011', 'retail', '{"loyalty_tier":"standard","city":"Ростов-на-Дону"}'),
        ('NM-CUST-012', 'Виктор Романов', 'viktor.romanov@nm-demo.retail', '+79001234012', 'retail', '{"loyalty_tier":"silver","city":"Уфа"}'),
        ('NM-CUST-013', 'Юлия Васильева', 'yulia.vasilieva@nm-demo.retail', '+79001234013', 'new_customer', '{"first_order":"2026-03","city":"Тюмень"}'),
        ('NM-CUST-014', 'Андрей Захаров', 'andrey.zakharov@nm-demo.retail', '+79001234014', 'retail', '{"loyalty_tier":"standard","city":"Пермь"}'),
        ('NM-CUST-015', 'Екатерина Белова', 'ekaterina.belova@nm-demo.retail', '+79001234015', 'premium', '{"loyalty_tier":"gold","city":"Москва"}'),
        ('NM-CUST-016', 'Михаил Григорьев', 'mikhail.grigoriev@nm-demo.retail', '+79001234016', 'b2b', '{"company":"Григорьев и партнёры","city":"Нижний Новгород"}'),
        ('NM-CUST-017', 'Светлана Макарова', 'svetlana.makarova@nm-demo.retail', '+79001234017', 'retail', '{"loyalty_tier":"silver","city":"Омск"}'),
        ('NM-CUST-018', 'Константин Никитин', 'konstantin.nikitin@nm-demo.retail', '+79001234018', 'retail', '{"loyalty_tier":"standard","city":"Челябинск"}'),
        ('NM-CUST-019', 'Ирина Павлова', 'irina.pavlova@nm-demo.retail', '+79001234019', 'new_customer', '{"first_order":"2026-05","city":"Сочи"}'),
        ('NM-CUST-020', 'Роман Степанов', 'roman.stepanov@nm-demo.retail', '+79001234020', 'retail', '{"loyalty_tier":"standard","city":"Волгоград"}'),
        ('NM-CUST-021', 'Алина Козлова', 'alina.kozlova@nm-demo.retail', '+79001234021', 'premium', '{"loyalty_tier":"platinum","city":"Москва"}'),
        ('NM-CUST-022', 'Георгий Семёнов', 'georgy.semenov@nm-demo.retail', '+79001234022', 'retail', '{"loyalty_tier":"silver","city":"Калининград"}'),
        ('NM-CUST-023', 'Вероника Медведева', 'veronika.medvedeva@nm-demo.retail', '+79001234023', 'retail', '{"loyalty_tier":"standard","city":"Иркутск"}'),
        ('NM-CUST-024', 'Фёдор Борисов', 'fedor.borisov@nm-demo.retail', '+79001234024', 'b2b', '{"company":"Борисов Опт","city":"Хабаровск"}'),
        ('NM-CUST-025', 'Людмила Тихонова', 'ludmila.tikhonova@nm-demo.retail', '+79001234025', 'retail', '{"loyalty_tier":"gold","city":"Москва"}')
) AS v(ext_id, name, email, phone, segment, meta)
WHERE c.customer_external_id = v.ext_id;

-- Service cases / orders (50) — idempotent per customer + order_number
INSERT INTO service_cases (customer_id, case_type, case_title, product_area, metadata)
SELECT c.id, 'nm_order', v.case_title, v.product_area, v.metadata::jsonb
FROM (
    VALUES
        ('NM-CUST-001', 'Заказ NL-00501001', 'logistics', '{"order_number":"NL-00501001","nm_demo":true,"status":"delivered","channel":"online"}'),
        ('NM-CUST-001', 'Заказ NL-00501002', 'product_quality', '{"order_number":"NL-00501002","nm_demo":true,"status":"in_transit","channel":"online"}'),
        ('NM-CUST-002', 'Заказ NL-00501003', 'logistics', '{"order_number":"NL-00501003","nm_demo":true,"status":"delivered","channel":"pickup"}'),
        ('NM-CUST-002', 'Заказ NL-00501004', 'payment', '{"order_number":"NL-00501004","nm_demo":true,"status":"paid","channel":"online"}'),
        ('NM-CUST-003', 'Заказ NL-00501005', 'returns', '{"order_number":"NL-00501005","nm_demo":true,"status":"return_requested","channel":"online"}'),
        ('NM-CUST-003', 'Заказ NL-00501006', 'support', '{"order_number":"NL-00501006","nm_demo":true,"status":"closed","channel":"call_center"}'),
        ('NM-CUST-004', 'Заказ NL-00501007', 'logistics', '{"order_number":"NL-00501007","nm_demo":true,"status":"delayed","channel":"b2b_portal"}'),
        ('NM-CUST-004', 'Заказ NL-00501008', 'product_quality', '{"order_number":"NL-00501008","nm_demo":true,"status":"delivered","channel":"b2b_portal"}'),
        ('NM-CUST-005', 'Заказ NL-00501009', 'digital', '{"order_number":"NL-00501009","nm_demo":true,"status":"paid","channel":"mobile_app"}'),
        ('NM-CUST-005', 'Заказ NL-00501010', 'logistics', '{"order_number":"NL-00501010","nm_demo":true,"status":"in_transit","channel":"mobile_app"}'),
        ('NM-CUST-006', 'Заказ NL-00501011', 'payment', '{"order_number":"NL-00501011","nm_demo":true,"status":"paid","channel":"online"}'),
        ('NM-CUST-006', 'Заказ NL-00501012', 'general', '{"order_number":"NL-00501012","nm_demo":true,"status":"delivered","channel":"online"}'),
        ('NM-CUST-007', 'Заказ NL-00501013', 'logistics', '{"order_number":"NL-00501013","nm_demo":true,"status":"processing","channel":"online"}'),
        ('NM-CUST-007', 'Заказ NL-00501014', 'product_quality', '{"order_number":"NL-00501014","nm_demo":true,"status":"delivered","channel":"online"}'),
        ('NM-CUST-008', 'Заказ NL-00501015', 'support', '{"order_number":"NL-00501015","nm_demo":true,"status":"open","channel":"chat"}'),
        ('NM-CUST-008', 'Заказ NL-00501016', 'returns', '{"order_number":"NL-00501016","nm_demo":true,"status":"refund_pending","channel":"online"}'),
        ('NM-CUST-009', 'Заказ NL-00501017', 'logistics', '{"order_number":"NL-00501017","nm_demo":true,"status":"delayed","channel":"online"}'),
        ('NM-CUST-009', 'Заказ NL-00501018', 'payment', '{"order_number":"NL-00501018","nm_demo":true,"status":"paid","channel":"online"}'),
        ('NM-CUST-010', 'Заказ NL-00501019', 'product_quality', '{"order_number":"NL-00501019","nm_demo":true,"status":"delivered","channel":"b2b_portal"}'),
        ('NM-CUST-010', 'Заказ NL-00501020', 'logistics', '{"order_number":"NL-00501020","nm_demo":true,"status":"in_transit","channel":"b2b_portal"}'),
        ('NM-CUST-011', 'Заказ NL-00501021', 'digital', '{"order_number":"NL-00501021","nm_demo":true,"status":"paid","channel":"mobile_app"}'),
        ('NM-CUST-011', 'Заказ NL-00501022', 'support', '{"order_number":"NL-00501022","nm_demo":true,"status":"closed","channel":"online"}'),
        ('NM-CUST-012', 'Заказ NL-00501023', 'logistics', '{"order_number":"NL-00501023","nm_demo":true,"status":"delivered","channel":"pickup"}'),
        ('NM-CUST-012', 'Заказ NL-00501024', 'returns', '{"order_number":"NL-00501024","nm_demo":true,"status":"return_approved","channel":"online"}'),
        ('NM-CUST-013', 'Заказ NL-00501025', 'payment', '{"order_number":"NL-00501025","nm_demo":true,"status":"paid","channel":"online"}'),
        ('NM-CUST-013', 'Заказ NL-00501026', 'general', '{"order_number":"NL-00501026","nm_demo":true,"status":"delivered","channel":"online"}'),
        ('NM-CUST-014', 'Заказ NL-00501027', 'product_quality', '{"order_number":"NL-00501027","nm_demo":true,"status":"delivered","channel":"online"}'),
        ('NM-CUST-014', 'Заказ NL-00501028', 'logistics', '{"order_number":"NL-00501028","nm_demo":true,"status":"in_transit","channel":"online"}'),
        ('NM-CUST-015', 'Заказ NL-00501029', 'support', '{"order_number":"NL-00501029","nm_demo":true,"status":"open","channel":"premium_line"}'),
        ('NM-CUST-015', 'Заказ NL-00501030', 'digital', '{"order_number":"NL-00501030","nm_demo":true,"status":"paid","channel":"mobile_app"}'),
        ('NM-CUST-016', 'Заказ NL-00501031', 'logistics', '{"order_number":"NL-00501031","nm_demo":true,"status":"delayed","channel":"b2b_portal"}'),
        ('NM-CUST-016', 'Заказ NL-00501032', 'payment', '{"order_number":"NL-00501032","nm_demo":true,"status":"paid","channel":"b2b_portal"}'),
        ('NM-CUST-017', 'Заказ NL-00501033', 'returns', '{"order_number":"NL-00501033","nm_demo":true,"status":"return_requested","channel":"online"}'),
        ('NM-CUST-017', 'Заказ NL-00501034', 'product_quality', '{"order_number":"NL-00501034","nm_demo":true,"status":"delivered","channel":"online"}'),
        ('NM-CUST-018', 'Заказ NL-00501035', 'logistics', '{"order_number":"NL-00501035","nm_demo":true,"status":"delivered","channel":"pickup"}'),
        ('NM-CUST-018', 'Заказ NL-00501036', 'support', '{"order_number":"NL-00501036","nm_demo":true,"status":"closed","channel":"chat"}'),
        ('NM-CUST-019', 'Заказ NL-00501037', 'digital', '{"order_number":"NL-00501037","nm_demo":true,"status":"paid","channel":"online"}'),
        ('NM-CUST-019', 'Заказ NL-00501038', 'payment', '{"order_number":"NL-00501038","nm_demo":true,"status":"paid","channel":"online"}'),
        ('NM-CUST-020', 'Заказ NL-00501039', 'logistics', '{"order_number":"NL-00501039","nm_demo":true,"status":"in_transit","channel":"online"}'),
        ('NM-CUST-020', 'Заказ NL-00501040', 'general', '{"order_number":"NL-00501040","nm_demo":true,"status":"delivered","channel":"online"}'),
        ('NM-CUST-021', 'Заказ NL-00501041', 'product_quality', '{"order_number":"NL-00501041","nm_demo":true,"status":"delivered","channel":"mobile_app"}'),
        ('NM-CUST-021', 'Заказ NL-00501042', 'returns', '{"order_number":"NL-00501042","nm_demo":true,"status":"refund_pending","channel":"online"}'),
        ('NM-CUST-022', 'Заказ NL-00501043', 'logistics', '{"order_number":"NL-00501043","nm_demo":true,"status":"delayed","channel":"online"}'),
        ('NM-CUST-022', 'Заказ NL-00501044', 'support', '{"order_number":"NL-00501044","nm_demo":true,"status":"open","channel":"call_center"}'),
        ('NM-CUST-023', 'Заказ NL-00501045', 'payment', '{"order_number":"NL-00501045","nm_demo":true,"status":"paid","channel":"online"}'),
        ('NM-CUST-023', 'Заказ NL-00501046', 'digital', '{"order_number":"NL-00501046","nm_demo":true,"status":"paid","channel":"mobile_app"}'),
        ('NM-CUST-024', 'Заказ NL-00501047', 'logistics', '{"order_number":"NL-00501047","nm_demo":true,"status":"in_transit","channel":"b2b_portal"}'),
        ('NM-CUST-024', 'Заказ NL-00501048', 'product_quality', '{"order_number":"NL-00501048","nm_demo":true,"status":"delivered","channel":"b2b_portal"}'),
        ('NM-CUST-025', 'Заказ NL-00501049', 'support', '{"order_number":"NL-00501049","nm_demo":true,"status":"closed","channel":"premium_line"}'),
        ('NM-CUST-025', 'Заказ NL-00501050', 'logistics', '{"order_number":"NL-00501050","nm_demo":true,"status":"delivered","channel":"online"}')
) AS v(ext_id, case_title, product_area, metadata)
JOIN customers c ON c.customer_external_id = v.ext_id
WHERE NOT EXISTS (
    SELECT 1 FROM service_cases sc
    WHERE sc.customer_id = c.id
      AND sc.metadata->>'order_number' = v.metadata::jsonb->>'order_number'
);

-- Review topics (extended NM coverage)
INSERT INTO review_topics (code, name, description, product_area_id)
SELECT v.code, v.name, v.description, pa.id
FROM (
    VALUES
        ('partial_delivery', 'Неполная комплектация', 'В заказе не хватает позиций', 'delivery'),
        ('courier_behavior', 'Поведение курьера', 'Жалоба или замечание о работе курьера', 'delivery'),
        ('wrong_item', 'Неверный товар', 'Привезли не тот товар или размер', 'product_quality'),
        ('damaged_packaging', 'Повреждённая упаковка', 'Упаковка повреждена при доставке', 'product_quality'),
        ('return_request', 'Оформление возврата', 'Клиент хочет вернуть товар', 'return'),
        ('refund_status', 'Статус возврата денег', 'Уточнение сроков возврата средств', 'return'),
        ('double_charge', 'Двойное списание', 'Списали сумму дважды', 'payment'),
        ('promo_not_applied', 'Промокод не сработал', 'Скидка или промокод не применились', 'payment'),
        ('support_wait', 'Долгое ожидание ответа', 'Долго не отвечают в поддержке', 'support'),
        ('staff_praise', 'Благодарность персоналу', 'Похвала сотрудника магазина или линии', 'support'),
        ('app_bug', 'Ошибка приложения', 'Техническая проблема в мобильном приложении', 'digital'),
        ('checkout_issue', 'Проблема оформления', 'Не получается оформить заказ на сайте', 'digital'),
        ('general_inquiry', 'Общий вопрос', 'Вопрос без узкой категории', 'general')
) AS v(code, name, description, area_code)
JOIN product_areas pa ON pa.code = v.area_code
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    product_area_id = EXCLUDED.product_area_id,
    is_active = TRUE,
    updated_at = NOW();

-- Response cases (additional NM scenarios)
INSERT INTO response_cases (
    case_code, title, description,
    scenario_id, sentiment_id, priority_id, product_area_id, topic_id,
    response_policy, approved_response_text, confidence_threshold, review_policy,
    is_active, created_by
)
SELECT
    v.case_code, v.title, v.description,
    s.id, sp.id, pl.id, pa.id, rt.id,
    v.response_policy, v.approved_response_text, v.confidence_threshold, v.review_policy,
    TRUE, 'nm_seed_c7a'
FROM (
    VALUES
        (
            'partial_delivery_complaint',
            'Неполная комплектация заказа',
            'Клиент сообщает, что в посылке не хватает товаров',
            'complaint', 'negative', 'high', 'delivery', 'partial_delivery',
            'Признать недостачу. Зафиксировать номер заказа. Не обещать компенсацию без проверки склада. Сообщить о проверке комплектации.',
            'Здравствуйте! Благодарим за сообщение. Мы проверим комплектацию заказа и свяжемся с вами с результатом в ближайшее рабочее время.',
            0.85, 'operator_required'
        ),
        (
            'wrong_item_delivered',
            'Доставлен неверный товар',
            'Клиент получил товар, не соответствующий заказу',
            'complaint', 'negative', 'high', 'product_quality', 'wrong_item',
            'Извиниться за ошибку. Уточнить артикул и фото при необходимости. Описать шаг обмена без фиксации сроков без согласования.',
            'Здравствуйте! Приносим извинения за доставку неверного товара. Мы зафиксировали обращение и подготовим для вас варианты решения после проверки заказа.',
            0.85, 'operator_required'
        ),
        (
            'return_initiation_request',
            'Запрос на возврат товара',
            'Клиент хочет оформить возврат',
            'question', 'neutral', 'medium', 'return', 'return_request',
            'Объяснить порядок возврата по правилам NM. Не обещать срок зачисления без проверки. Дать ссылку на инструкцию при наличии.',
            'Здравствуйте! Спасибо за обращение. Мы подскажем порядок возврата для вашего заказа и сообщим необходимые шаги после уточнения данных.',
            0.80, 'operator_required'
        ),
        (
            'refund_timing_inquiry',
            'Срок возврата денежных средств',
            'Клиент спрашивает, когда вернут деньги',
            'question', 'neutral', 'medium', 'return', 'refund_status',
            'Не называть точную дату без проверки платежа. Указать, что статус уточняется. Сохранять спокойный тон.',
            'Здравствуйте! Мы уточняем статус возврата средств по вашему заказу и сообщим вам результат, как только проверка будет завершена.',
            0.80, 'operator_required'
        ),
        (
            'double_payment_complaint',
            'Двойное списание оплаты',
            'Клиент видит повторное списание',
            'complaint', 'negative', 'high', 'payment', 'double_charge',
            'Признать беспокойство. Не подтверждать ошибку банка без проверки. Обещать проверку транзакции.',
            'Здравствуйте! Мы понимаем ваше беспокойство и уже передали запрос на проверку платежа. Сообщим вам результат проверки в ближайшее время.',
            0.85, 'operator_required'
        ),
        (
            'promo_code_not_applied',
            'Промокод не применился',
            'Скидка не учтена при оплате',
            'complaint', 'negative', 'medium', 'payment', 'promo_not_applied',
            'Уточнить условия акции. Не обещать перерасчёт до проверки. Попросить код и дату заказа при необходимости.',
            'Здравствуйте! Мы проверим применение промокода к вашему заказу и вернёмся с ответом после сверки условий акции.',
            0.80, 'operator_required'
        ),
        (
            'support_wait_complaint',
            'Долгое ожидание в поддержке',
            'Клиент жалуется на время ответа',
            'complaint', 'negative', 'medium', 'support', 'support_wait',
            'Извиниться за ожидание. Не обещать приоритет без регламента. Подтвердить, что обращение в работе.',
            'Здравствуйте! Приносим извинения за ожидание ответа. Ваше обращение зафиксировано, мы продолжаем работу над ним и свяжемся с вами в ближайшее время.',
            0.80, 'operator_required'
        ),
        (
            'app_technical_issue',
            'Техническая ошибка приложения',
            'Сбой в мобильном приложении NM',
            'complaint', 'negative', 'medium', 'digital', 'app_bug',
            'Поблагодарить за сигнал. Попросить версию приложения при необходимости. Не обещать срок исправления релиза.',
            'Здравствуйте! Спасибо, что сообщили о проблеме в приложении. Мы передали информацию технической команде для анализа.',
            0.78, 'operator_required'
        ),
        (
            'website_checkout_problem',
            'Не удаётся оформить заказ на сайте',
            'Ошибка при оформлении на сайте',
            'complaint', 'negative', 'medium', 'digital', 'checkout_issue',
            'Предложить альтернативный канал при срочности. Зафиксировать симптом. Не обещать срок починки сайта.',
            'Здравствуйте! Нам жаль, что оформление заказа вызвало затруднения. Мы зафиксировали описание проблемы и проверим возможность оформления вашего заказа.',
            0.78, 'operator_required'
        ),
        (
            'courier_behavior_complaint',
            'Жалоба на курьера',
            'Негативный опыт взаимодействия с курьером',
            'complaint', 'negative', 'high', 'delivery', 'courier_behavior',
            'Выразить сочувствие. Зафиксировать факт для службы доставки. Не комментировать вину курьера до проверки.',
            'Здравствуйте! Нам очень жаль, что доставка оставила неприятные впечатления. Мы зафиксировали ваше обращение и передадим его на рассмотрение службе доставки.',
            0.85, 'operator_required'
        ),
        (
            'damaged_packaging_report',
            'Повреждённая упаковка при доставке',
            'Упаковка повреждена, клиент беспокоится о товаре',
            'complaint', 'negative', 'high', 'product_quality', 'damaged_packaging',
            'Признать проблему. Рекомендовать проверить товар. Описать следующий шаг по претензии без лишних обещаний.',
            'Здравствуйте! Сожалеем, что упаковка была повреждена. Пожалуйста, проверьте состояние товара — мы поможем оформить обращение при необходимости.',
            0.85, 'operator_required'
        ),
        (
            'staff_praise_message',
            'Благодарность сотруднику NM',
            'Клиент благодарит сотрудника магазина или линии',
            'gratitude', 'positive', 'low', 'support', 'staff_praise',
            'Поблагодарить клиента. Передать отзыв команде. Сохранить тёплый корпоративный тон.',
            'Здравствуйте! Большое спасибо за ваши слова — мы обязательно передадим благодарность нашей команде.',
            0.75, 'auto_draft_if_confident'
        )
) AS v(
    case_code, title, description,
    scenario_code, sentiment_code, priority_code, area_code, topic_code,
    response_policy, approved_response_text, confidence_threshold, review_policy
)
JOIN interaction_scenarios s ON s.scenario_code = v.scenario_code
JOIN sentiment_profiles sp ON sp.sentiment_code = v.sentiment_code
JOIN priority_levels pl ON pl.priority_code = v.priority_code
JOIN product_areas pa ON pa.code = v.area_code
JOIN review_topics rt ON rt.code = v.topic_code
ON CONFLICT (case_code) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    scenario_id = EXCLUDED.scenario_id,
    sentiment_id = EXCLUDED.sentiment_id,
    priority_id = EXCLUDED.priority_id,
    product_area_id = EXCLUDED.product_area_id,
    topic_id = EXCLUDED.topic_id,
    response_policy = EXCLUDED.response_policy,
    approved_response_text = EXCLUDED.approved_response_text,
    confidence_threshold = EXCLUDED.confidence_threshold,
    review_policy = EXCLUDED.review_policy,
    is_active = TRUE,
    updated_at = NOW();

-- Examples for new cases (3–4 per case)
INSERT INTO response_case_examples (response_case_id, example_text, source, is_active)
SELECT rc.id, v.example_text, 'nm_seed_c7a', TRUE
FROM (
    VALUES
        ('partial_delivery_complaint', 'В посылке не хватает одной позиции из трёх'),
        ('partial_delivery_complaint', 'Привезли заказ NL-00501007 неполным — нет аксессуара'),
        ('partial_delivery_complaint', 'Открыла коробку — внутри не всё, что заказывала'),
        ('partial_delivery_complaint', 'Неполная комплектация, просьба дослать недостающее'),
        ('wrong_item_delivered', 'Прислали другой размер, не тот что в заказе'),
        ('wrong_item_delivered', 'Вместо синей модели приехала чёрная'),
        ('wrong_item_delivered', 'Ошибка комплектации — не мой артикул в посылке'),
        ('return_initiation_request', 'Хочу вернуть товар, подскажите как оформить'),
        ('return_initiation_request', 'Как вернуть заказ NL-00501016 в течение 14 дней?'),
        ('return_initiation_request', 'Нужна инструкция по возврату через пункт выдачи'),
        ('refund_timing_inquiry', 'Когда вернут деньги после возврата?'),
        ('refund_timing_inquiry', 'Прошло 5 дней, возврат на карту ещё не пришёл'),
        ('refund_timing_inquiry', 'Уточните срок зачисления по заказу NL-00501033'),
        ('double_payment_complaint', 'С карты списали два раза за один заказ'),
        ('double_payment_complaint', 'Вижу дубль платежа в выписке за вчера'),
        ('double_payment_complaint', 'Почему повторное списание по NL-00501045?'),
        ('promo_code_not_applied', 'Промокод SPRING не сработал при оплате'),
        ('promo_code_not_applied', 'Скидка 15% не применилась в корзине'),
        ('promo_code_not_applied', 'Акция была активна, но сумма не уменьшилась'),
        ('support_wait_complaint', 'Третий день жду ответа в чате поддержки'),
        ('support_wait_complaint', 'Никто не перезвонил по обещанию'),
        ('support_wait_complaint', 'Очень долго отвечаете на моё обращение'),
        ('app_technical_issue', 'Приложение вылетает на экране оплаты'),
        ('app_technical_issue', 'Не могу войти в личный кабинет с нового телефона'),
        ('app_technical_issue', 'После обновления не открывается каталог'),
        ('website_checkout_problem', 'На сайте зависает оформление на шаге доставки'),
        ('website_checkout_problem', 'Кнопка «Оплатить» не активна'),
        ('website_checkout_problem', 'Не получается завершить заказ с ноутбука'),
        ('courier_behavior_complaint', 'Курьер был груб при вручении'),
        ('courier_behavior_complaint', 'Неожиданно бросил коробку у двери'),
        ('courier_behavior_complaint', 'Жалоба на поведение курьера по заказу NL-00501043'),
        ('damaged_packaging_report', 'Коробка мятая, внутри слышен хруст'),
        ('damaged_packaging_report', 'Упаковка порвана, боюсь за товар'),
        ('damaged_packaging_report', 'Доставили в помятой коробке'),
        ('staff_praise_message', 'Спасибо консультанту в магазине на Тверской'),
        ('staff_praise_message', 'Отдельная благодарность оператору линии премиум'),
        ('staff_praise_message', 'Хочу отметить вежливость сотрудника пункта выдачи')
) AS v(case_code, example_text)
JOIN response_cases rc ON rc.case_code = v.case_code
WHERE NOT EXISTS (
    SELECT 1 FROM response_case_examples e
    WHERE e.response_case_id = rc.id AND e.example_text = v.example_text
);

-- Extra examples for original C2 seed cases
INSERT INTO response_case_examples (response_case_id, example_text, source, is_active)
SELECT rc.id, v.example_text, 'nm_seed_c7a', TRUE
FROM (
    VALUES
        ('delivery_delay_confirmed_order', 'Доставка NL-00501017 опаздывает уже на два дня'),
        ('delivery_delay_confirmed_order', 'Курьер не приехал в обещанный интервал'),
        ('order_status_inquiry', 'Подскажите статус заказа NL-00501003'),
        ('order_status_inquiry', 'Когда привезут мой заказ из приложения?'),
        ('employee_gratitude_message', 'Спасибо Анне из чата за терпение'),
        ('product_quality_complaint', 'Ткань на куртке отличается от фото на сайте'),
        ('product_quality_complaint', 'Брак на молнии, прошу замену'),
        ('payment_inquiry', 'Не понял списание на 2 490 ₽'),
        ('payment_inquiry', 'Нужна квитанция по оплате заказа'),
        ('service_improvement_suggestion', 'Добавьте отслеживание курьера на карте'),
        ('service_improvement_suggestion', 'Хотелось бы выбор слота доставки вечером')
) AS v(case_code, example_text)
JOIN response_cases rc ON rc.case_code = v.case_code
WHERE NOT EXISTS (
    SELECT 1 FROM response_case_examples e
    WHERE e.response_case_id = rc.id AND e.example_text = v.example_text
);
