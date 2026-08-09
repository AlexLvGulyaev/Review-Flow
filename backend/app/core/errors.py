from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse


class DatabaseUnavailableError(Exception):
    pass


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(DatabaseUnavailableError)
    async def database_unavailable_handler(
        request: Request, exc: DatabaseUnavailableError
    ) -> JSONResponse:
        return JSONResponse(
            status_code=503,
            content={"detail": "Database unavailable"},
        )

    @app.exception_handler(Exception)
    async def generic_handler(request: Request, exc: Exception) -> JSONResponse:
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error"},
        )
