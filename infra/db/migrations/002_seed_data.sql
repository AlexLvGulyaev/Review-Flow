-- Review Flow — minimal seed data (Milestone 1)

INSERT INTO interaction_scenarios (scenario_code, scenario_name, description, required_response_elements, forbidden_response_elements, escalation_rules)
VALUES
    ('complaint', 'Жалоба', 'Клиент выражает недовольство', 'признание проблемы, извинение, следующий шаг', 'агрессия, обвинения клиента', 'priority high/critical -> operator'),
    ('gratitude', 'Благодарность', 'Клиент благодарит', 'благодарность, персонализация', 'формальный отказ', NULL),
    ('suggestion', 'Предложение', 'Клиент предлагает улучшение', 'благодарность за идею, фиксация предложения', 'обещание сроков без согласования', NULL),
    ('question', 'Вопрос', 'Клиент задаёт вопрос', 'прямой ответ, уточнение при необходимости', 'выдуманные факты', NULL);

INSERT INTO sentiment_profiles (sentiment_code, sentiment_name, tone_policy, forbidden_tone, escalation_hint)
VALUES
    ('positive', 'Позитивный', 'дружелюбный, благодарный тон', 'сарказм', NULL),
    ('neutral', 'Нейтральный', 'спокойный, информативный тон', 'эмоциональные оценки', NULL),
    ('negative', 'Негативный', 'эмпатия, признание проблемы', 'обвинения, агрессия', 'эскалация оператору при critical'),
    ('aggressive', 'Агрессивный', 'максимально спокойный тон, деэскалация', 'зеркалирование агрессии', 'обязательная эскалация оператору');

INSERT INTO review_phrase_patterns (phrase_text, scenario, sentiment, topic, product_area, priority_hint)
VALUES
    ('опять задержали доставку', 'complaint', 'negative', 'delivery', 'logistics', 'high'),
    ('спасибо менеджеру', 'gratitude', 'positive', 'support', 'retail', 'low'),
    ('никто не отвечает', 'complaint', 'negative', 'support', 'retail', 'high'),
    ('добавьте оплату через СБП', 'suggestion', 'neutral', 'payment', 'fintech', 'medium');

INSERT INTO response_templates (scenario, sentiment, priority, rating_min, rating_max, topic, product_area, template_text, required_elements, forbidden_elements, is_active)
VALUES
    ('complaint', 'negative', 'high', 1, 2, 'delivery', 'logistics',
     'Здравствуйте, {{customer_name}}. Приносим извинения за задержку доставки. Мы зафиксировали ваше обращение и передаём его специалисту.',
     'извинение, фиксация проблемы, следующий шаг', 'компенсация без согласования, агрессия', TRUE),
    ('gratitude', 'positive', 'low', 4, 5, 'support', 'retail',
     'Здравствуйте, {{customer_name}}. Благодарим вас за отзыв! Нам приятно, что вы отметили работу нашей команды.',
     'благодарность, персонализация', 'формальный холодный тон', TRUE),
    ('complaint', 'negative', 'medium', 3, 3, 'support', 'retail',
     'Здравствуйте, {{customer_name}}. Сожалеем, что вам пришлось столкнуться с трудностями. Мы разберёмся в ситуации и свяжемся с вами.',
     'признание, следующий шаг', 'обвинения клиента', TRUE),
    ('question', 'neutral', 'low', NULL, NULL, NULL, NULL,
     'Здравствуйте, {{customer_name}}. Спасибо за ваш вопрос. Мы подготовим ответ и сообщим вам детали в ближайшее время.',
     'подтверждение получения', 'выдуманные факты', TRUE);

INSERT INTO prompt_versions (version_number, prompt_text, comment, is_active, created_by)
VALUES
    ('v1.0.0',
     'Ты — ассистент классификации отзывов клиентов. Классифицируй отзыв по: scenario, sentiment, priority, topic, product_area. Не генерируй ответы. Соблюдай tone policy. При низкой уверенности указывай needs_phrase_review.',
     'Initial system prompt — Milestone 1 bootstrap',
     TRUE,
     'system');
