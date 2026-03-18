FROM python:3.12-slim

WORKDIR /app

RUN pip install uv

COPY pyproject.toml uv.lock* ./
RUN uv sync --no-dev

COPY alembic.ini ./
COPY alembic/ ./alembic/
COPY app/ ./app/

EXPOSE 8000

CMD uv run alembic upgrade head && uv run uvicorn app.main:app --host 0.0.0.0 --port 8000
