import { useClientModals } from "../context/ClientModalContext.jsx";

const HERO_CHIPS = [
  {
    variant: "delivery",
    icon: "truck",
    title: "Быстрая доставка",
    text: "Доставляем заказы по всей России",
  },
  {
    variant: "quality",
    icon: "shield",
    title: "Качество товаров",
    text: "Проверяем поставки, маркировку и упаковку перед отправкой",
  },
  {
    variant: "support",
    icon: "headset",
    title: "Поддержка 24/7",
    text: "Мы всегда на связи и готовы помочь",
  },
  {
    variant: "payment",
    icon: "lock",
    title: "Безопасные платежи",
    text: "Надёжная защита платежей и данных",
  },
];

const FEATURE_CARDS = [
  {
    variant: "delivery",
    icon: "truck",
    title: "Быстрая доставка",
    text: "Отправляем заказы в день оформления и даём понятные сроки доставки.",
  },
  {
    variant: "quality",
    icon: "shield",
    title: "Проверенное качество",
    text: "Работаем с проверенными поставщиками и контролируем комплектацию.",
  },
  {
    variant: "support",
    icon: "headset",
    title: "Поддержка 24/7",
    text: "Помогаем с заказом, доставкой и возвратом — быстро и по делу.",
  },
  {
    variant: "payment",
    icon: "lock",
    title: "Безопасная оплата",
    text: "Оплата проходит через защищённые каналы, данные остаются в безопасности.",
  },
];

const METRICS = [
  { variant: "delivery", value: "50 000+", label: "довольных клиентов" },
  { variant: "quality", value: "250 000+", label: "доставленных заказов" },
  { variant: "support", value: "4.8 / 5", label: "средняя оценка сервиса" },
];

function FeatureIcon({ name }) {
  const common = {
    width: 20,
    height: 20,
    viewBox: "0 0 24 24",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg",
    "aria-hidden": true,
  };
  const stroke = "currentColor";
  const sw = 2;
  if (name === "truck") {
    return (
      <svg {...common}>
        <path d="M3 7h11v10H3V7Z" stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
        <path d="M14 10h4l3 3v4h-7V10Z" stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
        <path d="M7 19a2 2 0 1 0 0.01 0Z" stroke={stroke} strokeWidth={sw} />
        <path d="M18 19a2 2 0 1 0 0.01 0Z" stroke={stroke} strokeWidth={sw} />
      </svg>
    );
  }
  if (name === "shield") {
    return (
      <svg {...common}>
        <path
          d="M12 3l7 4v6c0 5-3 8-7 8s-7-3-7-8V7l7-4Z"
          stroke={stroke}
          strokeWidth={sw}
          strokeLinejoin="round"
        />
        <path d="M9.5 12l1.7 1.7L14.8 10" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
      </svg>
    );
  }
  if (name === "headset") {
    return (
      <svg {...common}>
        <path d="M4 12a8 8 0 0 1 16 0" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
        <path d="M6 12v5a2 2 0 0 0 2 2h1" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
        <path d="M18 12v5a2 2 0 0 1-2 2h-1" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
        <path d="M9 19h6" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M7 11V8a5 5 0 0 1 10 0v3" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
      <path d="M6 11h12v9H6v-9Z" stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
    </svg>
  );
}

function MetricIcon({ variant }) {
  const common = {
    width: 20,
    height: 20,
    viewBox: "0 0 24 24",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg",
    "aria-hidden": true,
  };
  const stroke = "currentColor";
  const sw = 2;
  if (variant === "delivery") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="9" stroke={stroke} strokeWidth={sw} />
        <path d="M8.5 10.5a2.5 2.5 0 0 1 4 0" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
        <path d="M9 16h.01" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
      </svg>
    );
  }
  if (variant === "quality") {
    return (
      <svg {...common}>
        <path
          d="M12 4l7 3v5l-2 4H7l-2-4V7l7-3Z"
          stroke={stroke}
          strokeWidth={sw}
          strokeLinejoin="round"
        />
        <path d="M12 11v9" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path
        d="M12 4l2.2 4.5 4.9.7-3.5 3.4.8 4.9L12 15.8l-4.4 2.3.8-4.9-3.5-3.4 4.9-.7L12 4Z"
        stroke={stroke}
        strokeWidth={sw}
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function HomePage() {
  const { openReviewModal, openStatusModal } = useClientModals();

  return (
    <main className="client-page client-page-home client-home">
      <section className="client-hero client-hero-reference client-home-hero">
        <div className="client-hero-reference-inner client-home-container">
          <div className="client-hero-grid client-home-hero-grid">
            <div className="client-hero-copy">
              <div className="client-hero-pill">
                <span className="dot" aria-hidden="true" />
                <span className="client-hero-pill-text">СЕРВИС, КОТОРОМУ ДОВЕРЯЮТ</span>
              </div>
              <h1 className="client-hero-title">Мы ценим ваше мнение</h1>
              <p className="client-hero-subtitle">
                Помогите нам стать лучше — оставьте отзыв о нашем сервисе. Мы внимательно читаем
                каждое обращение и обязательно отвечаем.
              </p>
              <div className="client-hero-actions">
                <button
                  type="button"
                  className="client-btn primary large hero-primary"
                  onClick={openReviewModal}
                >
                  Оставить отзыв
                </button>
                <button
                  type="button"
                  className="client-btn ghost large hero-secondary"
                  onClick={() => openStatusModal()}
                >
                  ▶︎ Проверить статус обращения
                </button>
              </div>
            </div>
            <div className="client-hero-visual">
              <img
                className="hero-asset"
                src="/assets/hero_scene_northline_market.png"
                alt=""
                loading="eager"
                decoding="async"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="client-features-bar client-home-strip">
        <div className="client-features-inner client-home-container">
          {HERO_CHIPS.map((f) => (
            <div key={f.title} className="client-feature-item">
              <span className={`client-feature-icon icon--${f.variant}`} aria-hidden="true">
                <FeatureIcon name={f.icon} />
              </span>
              <div>
                <strong>{f.title}</strong>
                <p className="muted">{f.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="client-section client-section-wide client-feature-cards client-home-cards">
        <div className="client-card-row client-home-container">
          {FEATURE_CARDS.map((c) => (
            <div key={c.title} className="client-wide-card">
              <div className={`client-wide-card-icon icon--${c.variant}`} aria-hidden="true">
                <FeatureIcon name={c.icon} />
              </div>
              <div className="client-wide-card-body">
                <h3>{c.title}</h3>
                <p className="muted">{c.text}</p>
              </div>
              <div className="client-wide-card-chevron" aria-hidden="true">
                ›
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="about" className="client-section client-section-wide client-about client-home-info">
        <div className="client-about-grid client-home-container">
          <img
            className="client-about-image"
            src="/assets/warehouse_northline_market.png"
            alt=""
            loading="lazy"
            decoding="async"
          />
          <div className="client-about-copy">
            <h2>О Northline Market</h2>
            <p className="muted client-section-lead">
              Маркетплейс товаров для дома и повседневных покупок. Мы строим сервис вокруг удобной
              доставки и честной обратной связи от клиентов.
            </p>
          </div>
          {METRICS.map((m) => (
            <div key={m.label} className="metric">
              <div className={`metric-icon icon--${m.variant}`} aria-hidden="true">
                <MetricIcon variant={m.variant} />
              </div>
              <div>
                <strong>{m.value}</strong>
                <p className="muted">{m.label}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
