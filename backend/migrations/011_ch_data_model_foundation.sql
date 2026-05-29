-- Sprint 022D — C2 Implementation: Controlled Hybrid data model foundation

-- 1. product_areas
CREATE TABLE IF NOT EXISTS product_areas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(64) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. review_topics
CREATE TABLE IF NOT EXISTS review_topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(64) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    product_area_id UUID REFERENCES product_areas(id),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_review_topics_product_area_id ON review_topics(product_area_id);

-- 3. response_cases
CREATE TABLE IF NOT EXISTS response_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_code VARCHAR(64) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    scenario_id UUID NOT NULL REFERENCES interaction_scenarios(id),
    sentiment_id UUID NOT NULL REFERENCES sentiment_profiles(id),
    priority_id UUID NOT NULL REFERENCES priority_levels(id),
    product_area_id UUID NOT NULL REFERENCES product_areas(id),
    topic_id UUID NOT NULL REFERENCES review_topics(id),
    response_policy TEXT NOT NULL,
    approved_response_text TEXT NOT NULL,
    confidence_threshold NUMERIC(5, 4) NOT NULL DEFAULT 0.75,
    review_policy VARCHAR(32) NOT NULL DEFAULT 'operator_required',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by VARCHAR(128),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_response_cases_lookup
    ON response_cases(scenario_id, sentiment_id, priority_id, product_area_id, topic_id, is_active);

-- 4. response_case_examples
CREATE TABLE IF NOT EXISTS response_case_examples (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    response_case_id UUID NOT NULL REFERENCES response_cases(id) ON DELETE CASCADE,
    example_text TEXT NOT NULL,
    source VARCHAR(32) NOT NULL,
    source_review_id UUID REFERENCES reviews(id),
    legacy_phrase_pattern_id UUID,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_response_case_examples_case_id
    ON response_case_examples(response_case_id);

-- 5. response_case_candidates
CREATE TABLE IF NOT EXISTS response_case_candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
    status VARCHAR(32) NOT NULL,
    proposed_title VARCHAR(255),
    proposed_description TEXT,
    proposed_scenario_id UUID REFERENCES interaction_scenarios(id),
    proposed_sentiment_id UUID REFERENCES sentiment_profiles(id),
    proposed_priority_id UUID REFERENCES priority_levels(id),
    proposed_product_area_id UUID REFERENCES product_areas(id),
    proposed_topic_id UUID REFERENCES review_topics(id),
    proposed_response_policy TEXT,
    proposed_approved_response_text TEXT,
    proposed_by_operator_id VARCHAR(128),
    reviewed_by_admin_id VARCHAR(128),
    promoted_response_case_id UUID REFERENCES response_cases(id),
    merged_into_case_id UUID REFERENCES response_cases(id),
    rejection_comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_response_case_candidates_review_id ON response_case_candidates(review_id);

-- 6. response_case_decisions
CREATE TABLE IF NOT EXISTS response_case_decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
    response_case_id UUID NOT NULL REFERENCES response_cases(id),
    decision_source VARCHAR(32) NOT NULL,
    match_confidence NUMERIC(5, 4),
    is_operator_override BOOLEAN NOT NULL DEFAULT FALSE,
    legacy_classification_id UUID REFERENCES review_classifications(id),
    is_current BOOLEAN NOT NULL DEFAULT TRUE,
    selected_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_response_case_decisions_current_review
    ON response_case_decisions(review_id)
    WHERE is_current = TRUE;

-- 7. case_match_results
CREATE TABLE IF NOT EXISTS case_match_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
    response_case_id UUID NOT NULL REFERENCES response_cases(id),
    response_case_decision_id UUID REFERENCES response_case_decisions(id),
    match_score NUMERIC(5, 4) NOT NULL,
    rank INTEGER NOT NULL,
    match_method VARCHAR(32) NOT NULL,
    is_selected BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_case_match_results_review_id ON case_match_results(review_id);

-- 8. response_case_feedback
CREATE TABLE IF NOT EXISTS response_case_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
    response_case_id UUID REFERENCES response_cases(id),
    response_case_decision_id UUID REFERENCES response_case_decisions(id),
    feedback_type VARCHAR(32) NOT NULL,
    rejection_reason VARCHAR(64),
    operator_id VARCHAR(128),
    comment TEXT,
    suggested_case_id UUID REFERENCES response_cases(id),
    legacy_rejection_feedback_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_response_case_feedback_review_id ON response_case_feedback(review_id);

-- Seed: product_areas
INSERT INTO product_areas (code, name, description)
VALUES
    ('delivery', 'Доставка', 'Вопросы доставки и поставки заказов'),
    ('product_quality', 'Качество товара', 'Претензии и оценка качества товара'),
    ('payment', 'Оплата', 'Вопросы оплаты и списаний'),
    ('return', 'Возврат', 'Возвраты и обмен'),
    ('support', 'Поддержка', 'Обслуживание и коммуникация с клиентом'),
    ('digital', 'Сайт / приложение', 'Цифровые каналы и приложение'),
    ('general', 'Общее', 'Общие обращения без узкой привязки')
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    is_active = TRUE,
    updated_at = NOW();

-- Seed: review_topics
INSERT INTO review_topics (code, name, description, product_area_id)
SELECT v.code, v.name, v.description, pa.id
FROM (
    VALUES
        ('delivery_delay', 'Нарушение сроков поставки', 'Клиент сообщает, что заказ доставлен позже обещанного срока', 'delivery'),
        ('order_status', 'Статус заказа', 'Клиент уточняет, где находится заказ', 'delivery'),
        ('employee_gratitude', 'Благодарность сотруднику', 'Клиент благодарит сотрудника за помощь', 'support'),
        ('product_defect', 'Недостаток товара', 'Клиент сообщает о браке или несоответствии товара', 'product_quality'),
        ('payment_question', 'Вопрос по оплате', 'Клиент уточняет списание или способ оплаты', 'payment'),
        ('service_improvement', 'Предложение улучшения сервиса', 'Клиент предлагает улучшить сервис', 'general')
) AS v(code, name, description, area_code)
JOIN product_areas pa ON pa.code = v.area_code
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    product_area_id = EXCLUDED.product_area_id,
    is_active = TRUE,
    updated_at = NOW();

-- Seed: response_cases (lookup FKs by business codes)
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
    TRUE, 'seed'
FROM (
    VALUES
        (
            'delivery_delay_confirmed_order',
            'Задержка поставки подтверждённого заказа',
            'Клиент сообщает о задержке уже подтверждённой поставки',
            'complaint', 'negative', 'high', 'delivery', 'delivery_delay',
            'Извиниться за задержку. Указать текущий статус заказа. Не обещать компенсацию без согласования. Предложить связь со специалистом при необходимости.',
            'Здравствуйте! Приносим извинения за задержку доставки вашего заказа. Мы проверили статус отправления и сообщим вам актуальные сроки в ближайшее время.',
            0.85, 'operator_required'
        ),
        (
            'order_status_inquiry',
            'Вопрос о статусе заказа',
            'Клиент уточняет, где находится заказ и когда ожидать доставку',
            'question', 'neutral', 'medium', 'delivery', 'order_status',
            'Дать понятный статус заказа. Не выдумывать сроки. При отсутствии данных — обещать уточнение.',
            'Здравствуйте! Спасибо за обращение. Мы уточняем статус вашего заказа и сообщим вам детали в ближайшее время.',
            0.80, 'operator_required'
        ),
        (
            'employee_gratitude_message',
            'Благодарность сотруднику',
            'Клиент благодарит сотрудника за помощь',
            'gratitude', 'positive', 'low', 'support', 'employee_gratitude',
            'Поблагодарить клиента. Отметить ценность обратной связи. Сохранить тёплый тон.',
            'Здравствуйте! Благодарим вас за тёплые слова — мы обязательно передадим их нашей команде.',
            0.75, 'auto_draft_if_confident'
        ),
        (
            'product_quality_complaint',
            'Жалоба на качество товара',
            'Клиент сообщает о браке или несоответствии товара',
            'complaint', 'negative', 'high', 'product_quality', 'product_defect',
            'Признать проблему. Не обвинять клиента. Описать следующий шаг по проверке/замене без необоснованных обещений.',
            'Здравствуйте! Нам очень жаль, что товар не оправдал ваших ожиданий. Мы зафиксировали обращение и свяжемся с вами для уточнения деталей.',
            0.85, 'operator_required'
        ),
        (
            'payment_inquiry',
            'Вопрос по оплате',
            'Клиент уточняет списание, счёт или способ оплаты',
            'question', 'neutral', 'medium', 'payment', 'payment_question',
            'Ответить по сути вопроса об оплате. Не раскрывать лишние персональные данные. При необходимости — эскалация.',
            'Здравствуйте! Мы получили ваш вопрос по оплате и подготовим для вас точный ответ после проверки данных.',
            0.80, 'operator_required'
        ),
        (
            'service_improvement_suggestion',
            'Предложение улучшения сервиса',
            'Клиент предлагает улучшить сервис или процесс',
            'suggestion', 'neutral', 'low', 'general', 'service_improvement',
            'Поблагодарить за идею. Зафиксировать предложение. Не обещать сроки внедрения без согласования.',
            'Здравствуйте! Спасибо за ваше предложение — мы передали его команде для рассмотрения.',
            0.75, 'operator_required'
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

-- Seed: response_case_examples
INSERT INTO response_case_examples (response_case_id, example_text, source, is_active)
SELECT rc.id, v.example_text, 'seed', TRUE
FROM (
    VALUES
        ('delivery_delay_confirmed_order', 'Обещали привезти вчера, но заказ так и не приехал'),
        ('delivery_delay_confirmed_order', 'Заказ NL-00500001 задерживается уже третий день'),
        ('delivery_delay_confirmed_order', 'Почему доставка подтверждённого заказа срывается?'),
        ('order_status_inquiry', 'Где сейчас мой заказ и когда ждать доставку?'),
        ('order_status_inquiry', 'Не могу понять статус отправления по номеру заказа'),
        ('order_status_inquiry', 'Подскажите, на каком этапе находится заказ'),
        ('employee_gratitude_message', 'Спасибо менеджеру Анне за помощь с возвратом'),
        ('employee_gratitude_message', 'Хочу отметить отличную работу сотрудника на линии'),
        ('product_quality_complaint', 'Пришёл товар с браком, упаковка повреждена'),
        ('product_quality_complaint', 'Качество не соответствует описанию на сайте'),
        ('payment_inquiry', 'Почему списали сумму дважды?'),
        ('payment_inquiry', 'Не понимаю, как оплатить заказ через СБП'),
        ('service_improvement_suggestion', 'Добавьте уведомления о статусе доставки в приложении'),
        ('service_improvement_suggestion', 'Предлагаю упростить форму обратной связи на сайте')
) AS v(case_code, example_text)
JOIN response_cases rc ON rc.case_code = v.case_code
WHERE NOT EXISTS (
    SELECT 1 FROM response_case_examples e
    WHERE e.response_case_id = rc.id AND e.example_text = v.example_text
);

-- Legacy KB: оставляем активными до C6 (MVP pipeline использует review_phrase_patterns и response_templates).
-- См. session log Sprint 022D.
