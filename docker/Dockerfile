# ============================================
# Playwright Automation Framework - Dockerfile
# ============================================
# Uses official Microsoft Playwright image (SEC-06)
# ============================================

FROM mcr.microsoft.com/playwright:v1.44.0-jammy

# Set working directory
WORKDIR /app

# Copy package files first (for Docker layer caching)
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci --ignore-scripts

# Copy framework source
COPY . .

# Create output directories
RUN mkdir -p reports allure-results test-results screenshots videos traces .auth

# Default command: run all tests
CMD ["npx", "playwright", "test"]
