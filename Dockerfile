FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Copy requirements (minimal pentru free tier)
COPY backend/requirements.txt .

# Install only essential dependencies
RUN pip install fastapi uvicorn python-multipart

# Copy application
COPY backend/app/main_simple.py ./app/main.py

# Expose port
EXPOSE 8000

# Start command pentru free tier
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]