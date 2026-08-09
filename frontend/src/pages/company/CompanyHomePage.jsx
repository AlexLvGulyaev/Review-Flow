import { FormEvent, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";

import { useCompanyAuth } from "../../context/CompanyAuthContext.jsx";
import { DEMO_COMPANY_USERS, getStaffHomePath } from "../../lib/companyAuth.js";

export default function CompanyHomePage() {
  const { isStaffSignedIn, session, login } = useCompanyAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (isStaffSignedIn && session) {
    return <Navigate to={getStaffHomePath(session.role)} replace />;
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const user = await login(email, password);
      navigate(getStaffHomePath(user.role), { replace: true });
    } catch (err) {
      setError(err.message || "Ошибка входа");
    } finally {
      setSubmitting(false);
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

        <form className="company-login-form" onSubmit={onSubmit}>
          <label className="company-login-form__field">
            <span className="company-login-form__label">Email</span>
            <input
              type="email"
              name="email"
              autoComplete="username"
              className="company-login-form__input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={submitting}
            />
          </label>
          <label className="company-login-form__field">
            <span className="company-login-form__label">Пароль</span>
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              className="company-login-form__input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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

        <footer className="company-login-card__footer muted">
          <p className="company-login-card__hint">Демо-учётные записи:</p>
          <ul className="company-login-card__accounts">
            {DEMO_COMPANY_USERS.map((u) => (
              <li key={u.email}>
                <code>{u.email}</code> · пароль <code>{u.password}</code> ({u.label})
              </li>
            ))}
          </ul>
          <p>
            <Link to="/">← На сайт для клиентов</Link>
          </p>
        </footer>
      </div>
    </div>
  );
}
