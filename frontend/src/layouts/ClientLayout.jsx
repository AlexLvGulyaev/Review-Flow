import { Link, Outlet } from "react-router-dom";

import { ClientModalProvider, useClientModals } from "../context/ClientModalContext.jsx";

function ClientHeader() {
  const { openReviewModal, openStatusModal } = useClientModals();

  return (
    <header className="client-header client-header-light">
      <div className="client-header-inner client-header-wide">
        <Link className="client-logo" to="/">
          <span className="client-logo-mark">N</span>
          <span className="client-logo-text">
            <strong>NORTHLINE</strong>
            <span>MARKET</span>
          </span>
        </Link>
        <nav className="client-nav client-nav-light" aria-label="Основное меню">
          <Link to="/">Главная</Link>
          <a href="/#about">О компании</a>
          <a href="/#delivery">Доставка и оплата</a>
          <a href="/#support">Поддержка</a>
        </nav>
        <div className="client-header-actions">
          <button type="button" className="client-btn-header outline" onClick={() => openStatusModal()}>
            Проверить статус
          </button>
          <button type="button" className="client-btn-header primary" onClick={openReviewModal}>
            Оставить отзыв
          </button>
        </div>
      </div>
    </header>
  );
}

function ClientFooter() {
  const { openReviewModal, openStatusModal } = useClientModals();

  return (
    <footer className="client-footer client-footer-rich">
      <div className="client-footer-inner client-footer-wide">
        <div className="client-footer-col brand">
          <strong>Northline Market</strong>
          <p>Ваш надёжный сервис для покупок и быстрой доставки.</p>
          <div className="client-social" aria-label="Соцсети">
            <span className="client-social-icon" title="Telegram">
              TG
            </span>
            <span className="client-social-icon" title="VK">
              VK
            </span>
          </div>
        </div>
        <div className="client-footer-col">
          <h4>Покупателям</h4>
          <ul>
            <li>
              <button type="button" className="client-footer-link" onClick={openReviewModal}>
                Оставить отзыв
              </button>
            </li>
            <li>
              <button type="button" className="client-footer-link" onClick={() => openStatusModal()}>
                Статус обращения
              </button>
            </li>
          </ul>
        </div>
        <div className="client-footer-col">
          <h4>О компании</h4>
          <ul>
            <li>
              <a href="#about">О Northline Market</a>
            </li>
          </ul>
        </div>
        <div className="client-footer-col">
          <h4>Поддержка</h4>
          <ul>
            <li>
              <button type="button" className="client-footer-link" onClick={() => openStatusModal()}>
                Проверить статус
              </button>
            </li>
            <li>
              <button type="button" className="client-footer-link" onClick={openReviewModal}>
                Оставить отзыв
              </button>
            </li>
          </ul>
        </div>
        <div className="client-footer-col">
          <h4>Контакты</h4>
          <p>support@northline.example</p>
          <p>+7 (495) 000-00-00</p>
        </div>
        <div className="client-footer-col">
          <h4>Мы принимаем</h4>
          <div className="client-payments" aria-label="Платёжные системы">
            <span className="payment-chip visa">VISA</span>
            <span className="payment-chip mastercard">MASTERCARD</span>
            <span className="payment-chip mir">МИР</span>
          </div>
        </div>
      </div>
      <div className="client-footer-bottom">
        <p>© {new Date().getFullYear()} Northline Market. Демо-сайт.</p>
      </div>
    </footer>
  );
}

export default function ClientLayout() {
  return (
    <ClientModalProvider>
      <div className="client-shell">
        <ClientHeader />
        <Outlet />
        <ClientFooter />
      </div>
    </ClientModalProvider>
  );
}
