from pathlib import Path

from sqlalchemy import text

from app.db.session import engine

MIGRATIONS_DIR = Path(__file__).resolve().parents[2] / "migrations"


def run_pending_migrations() -> None:
    """Apply SQL migrations not yet recorded in schema_migrations."""
    if not MIGRATIONS_DIR.exists():
        return

    with engine.begin() as conn:
        conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS schema_migrations (
                    version VARCHAR(64) PRIMARY KEY,
                    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
                """
            )
        )
        for path in sorted(MIGRATIONS_DIR.glob("*.sql")):
            version = path.name
            applied = conn.execute(
                text("SELECT 1 FROM schema_migrations WHERE version = :v"),
                {"v": version},
            ).first()
            if applied:
                continue
            sql = path.read_text(encoding="utf-8")
            for statement in _split_statements(sql):
                stmt = statement.strip()
                if stmt:
                    conn.execute(text(stmt))
            conn.execute(
                text(
                    "INSERT INTO schema_migrations (version) VALUES (:v) ON CONFLICT DO NOTHING"
                ),
                {"v": version},
            )


def _split_statements(sql: str) -> list[str]:
    parts: list[str] = []
    buf: list[str] = []
    for line in sql.splitlines():
        stripped = line.strip()
        if stripped.startswith("--"):
            continue
        buf.append(line)
        if stripped.endswith(";"):
            parts.append("\n".join(buf))
            buf = []
    if buf:
        parts.append("\n".join(buf))
    return parts
