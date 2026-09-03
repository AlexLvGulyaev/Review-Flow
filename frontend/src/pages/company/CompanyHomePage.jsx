import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";

import { useCompanyAuth } from "../../context/CompanyAuthContext.jsx";
import { getStaffHomePath } from "../../lib/companyAuth.js";
import { goProject } from "../../lib/projectReturn.js";

const DEMO_TOKEN = import.meta.env.VITE_OPS_DEMO_TOKEN || "";

/**
 * Экран входа — перенос референса AIC (admin-console/src/components/Login.jsx)
 * 1:1: центрированная ai-card, значок-эмодзи, заголовок display-шрифтом,
 * поле Bearer token, ошибка в рамке, кнопки «Войти» и демо-вход.
 * Логика входа — RF (whoami-валидация токена, сессия, роли).
 */
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
    const trimmed = token.trim();
    if (!trimmed) {
      setError("Введите токен.");
      return;
    }
    setSubmitting(true);
    try {
      const user = await login(trimmed);
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

  return (
    <div className="rf-login">
      <div className="rf-login-card">
        <div className="rf-login-head">
          <div className="rf-login-badge">⚙️</div>
          <h1 className="rf-login-title">Review Flow Admin Console</h1>
          <p className="rf-login-sub">
            Введите Bearer token для доступа к панели управления.
          </p>
        </div>

        <form className="rf-login-form" onSubmit={onTokenSubmit}>
          <div>
            <label
              className="rf-login-label"
              htmlFor="rf-login-token"
              title="Полный доступ к панели управления — по токену оператора."
            >
              Bearer token
            </label>
            <input
              id="rf-login-token"
              type="password"
              name="token"
              autoComplete="off"
              placeholder="Вставьте токен..."
              className="rf-login-input"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              disabled={submitting}
            />
          </div>

          {error ? (
            <div className="rf-login-error" role="alert">
              {error}
            </div>
          ) : null}

          <button type="submit" className="rf-login-btn" disabled={submitting}>
            {submitting ? "Вход…" : "Войти"}
          </button>

          {DEMO_TOKEN ? (
            <button
              type="button"
              className="rf-login-btn rf-login-btn--outline"
              onClick={onDemoLogin}
              disabled={demoSubmitting}
              title="Демо-режим: посмотрите консоль без прав изменения (read-only)."
            >
              {demoSubmitting ? "Вход…" : "Войти в демо-режим (только просмотр)"}
            </button>
          ) : null}

          <button
            type="button"
            className="rf-login-btn rf-login-btn--outline rf-login-btn--home"
            onClick={goProject}
            title="Вернуться на страницу проекта в витрине AIP."
          >
            К проекту
          </button>
        </form>
      </div>
    </div>
  );
}