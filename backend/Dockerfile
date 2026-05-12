FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /opt/render/project/src/backend

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["python", "-c", "import os, uvicorn; uvicorn.run('main:app', host='0.0.0.0', port=int(os.getenv('PORT', '8000')))"]
