FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy server code
COPY berlin_mcp_server.py .

# Expose MCP server port
EXPOSE 8080

# Health check - use HTTP GET to /health endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8080/health').read()"

# Run the MCP server
CMD ["python", "berlin_mcp_server.py"]
