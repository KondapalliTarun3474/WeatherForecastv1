# Dockerfile - Inference Only
FROM python:3.9-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

# Copy all application code
COPY . .

EXPOSE 5000

CMD ["python", "app.py"]
