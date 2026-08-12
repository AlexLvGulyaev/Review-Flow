import { FormEvent, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";

import { useCompanyAuth } from "../../context/CompanyAuthContext.jsx";
import { getStaffHomePath } from "../../lib/companyAuth.js";

const DEMO_TOKEN = import.meta.env.VITE_OPS_DEMO_TOKEN || "";

export default function CompanyHomePage() {
  const { isStaffSignedIn, session, login, loginDemo } = useCompanyAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [token, setToken] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [demoSubmitting, setDemoSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (isStaffSignedIn && session) {
    return <Navigate to={getStaffHomePath(session.role)} replace />;
  }

  async function onTokenSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const user = await login(token);
      navigate(getStaffHomePath(user.role), { replace: true });
    } catch (err) {
      setError(err.message || "Ошибка входа");
    } finally {
      setSubmitting(false);
    }
  }

  async function onDemoLogin() {
    setError(null);
    setDemoSubmitting(true);
    try {
      const user = await loginDemo();
      navigate(getStaffHomePath(user.role), { replace: true });
    } catch (err) {
      setError(err.message || "Ошибка входа в демо-режим");
    } finally {
      setDemoSubmitting(false);
    }
  }

  const needsSignIn = Boolean(location.state?.staffSignInRequired);

  return (
    <div className="company-login-page">
      <div className="company-login-card">
        <header className="company-login-card__header">
          <h1 className="company-login-card__title">Рабочее пространство компании</h1>
          <p className="company-login-card__subtitle muted">
            Вход для сотрудников Northline Market
          </p>
        </header>

        {needsSignIn ? (
          <p className="company-login-card__notice" role="status">
            Войдите в рабочее пространство, чтобы продолжить.
          </p>
        ) : null}

        <form className="company-login-form" onSubmit={onTokenSubmit}>
          <label className="company-login-form__field">
            <span className="company-login-form__label">Bearer токен</span>
            <input
              type="password"
              name="token"
              autoComplete="off"
              placeholder="Вставьте токен доступа…"
              className="company-login-form__input"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              required
              disabled={submitting}
            />
          </label>

          {error ? (
            <p className="company-login-form__error" role="alert">
              {error}
            </p>
          ) : null}

          <button type="submit" className="company-login-form__submit" disabled={submitting}>
            {submitting ? "Вход…" : "Войти"}
          </button>
        </form>

        {DEMO_TOKEN ? (
          <button
            type="button"
            className="company-login-form__submit company-login-form__submit--outline"
            onClick={onDemoLogin}
            disabled={demoSubmitting}
          >
            {demoSubmitting ? "Вход…" : "Войти в демо-режим (только просмотр)"}
          </button>
        ) : null}

        <footer className="company-login-card__footer muted">
          <p className="company-login-card__hint">
            Токен выдаётся администратором при развёртывании. Демо-вход открывает
            консоль в режиме только для чтения.
          </p>
          <p>
            <Link to="/">← На сайт для клиентов</Link>
          </p>
        </footer>
      </div>
    </div>
  );
}