# Docker Management API Examples

## Authentication

All requests require the `X-API-Key` header:

```bash
X-API-Key: 89cd6f2df5d03771eab7f3cb7cfe59709bf8b8088eaa23cfb45f00bc91b51375
```

## Example Requests

### List Containers
```bash
# List running containers
curl -X GET "http://208.87.129.233/containers" \
  -H "X-API-Key: 89cd6f2df5d03771eab7f3cb7cfe59709bf8b8088eaa23cfb45f00bc91b51375"

# List all containers (including stopped)
curl -X GET "http://208.87.129.233/containers?all=true" \
  -H "X-API-Key: 89cd6f2df5d03771eab7f3cb7cfe59709bf8b8088eaa23cfb45f00bc91b51375"
```

### Create Container
```bash
curl -X POST "http://208.87.129.233/containers" \
  -H "X-API-Key: 89cd6f2df5d03771eab7f3cb7cfe59709bf8b8088eaa23cfb45f00bc91b51375" \
  -H "Content-Type: application/json" \
  -d '{
    "image": "nginx:latest",
    "name": "web-server",
    "ports": ["80:80"],
    "env": ["NGINX_HOST=example.com"]
  }'
```

### Start Container
```bash
curl -X POST "http://208.87.129.233/containers/web-server/start" \
  -H "X-API-Key: 89cd6f2df5d03771eab7f3cb7cfe59709bf8b8088eaa23cfb45f00bc91b51375"
```

### Stop Container
```bash
curl -X POST "http://208.87.129.233/containers/web-server/stop" \
  -H "X-API-Key: 89cd6f2df5d03771eab7f3cb7cfe59709bf8b8088eaa23cfb45f00bc91b51375"
```

### Get Container Logs
```bash
curl -X GET "http://208.87.129.233/containers/web-server/logs?tail=100" \
  -H "X-API-Key: 89cd6f2df5d03771eab7f3cb7cfe59709bf8b8088eaa23cfb45f00bc91b51375"
```

### Execute Command in Container
```bash
curl -X POST "http://208.87.129.233/containers/web-server/exec" \
  -H "X-API-Key: 89cd6f2df5d03771eab7f3cb7cfe59709bf8b8088eaa23cfb45f00bc91b51375" \
  -H "Content-Type: application/json" \
  -d '{
    "command": "ls -la /app"
  }'
```

### Remove Container
```bash
# Normal removal
curl -X DELETE "http://208.87.129.233/containers/web-server" \
  -H "X-API-Key: 89cd6f2df5d03771eab7f3cb7cfe59709bf8b8088eaa23cfb45f00bc91b51375"

# Force removal
curl -X DELETE "http://208.87.129.233/containers/web-server?force=true" \
  -H "X-API-Key: 89cd6f2df5d03771eab7f3cb7cfe59709bf8b8088eaa23cfb45f00bc91b51375"
```

## Response Examples

### Successful Container List Response
```json
[
  {
    "id": "abc123...",
    "name": "web-server",
    "image": "nginx:latest",
    "status": "running"
  }
]
```

### Error Response
```json
{
  "code": "CONTAINER_NOT_FOUND",
  "message": "Container 'web-server' not found"
}
```

## Setup Instructions

1. Build the server:
```bash
cd /root/Documents/Cline/MCP/chatgpt-server
npm run build
```

2. Run the setup script:
```bash
./setup.sh
```

3. Verify the installation:
```bash
# Check if NGINX is running
systemctl status nginx

# Check if the API server is running
pm2 status docker-api

# Test the API
curl http://208.87.129.233/health
```

## Notes

1. The API key shown in examples is from your .env file
2. All endpoints require API key authentication
3. Response codes:
   - 200: Success
   - 201: Resource created
   - 401: Unauthorized (invalid or missing API key)
   - 404: Resource not found
   - 500: Server error

4. Content-Type header must be `application/json` for POST requests with body