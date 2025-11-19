# RPrint API Documentation

Complete API documentation for integrating remote printing into your applications.

**Base URL:** `https://growingsoft.net/api`

## Table of Contents

1. [Authentication](#authentication)
2. [Quick Start](#quick-start)
3. [API Endpoints](#api-endpoints)
4. [Webhooks](#webhooks)
5. [Error Handling](#error-handling)
6. [Code Examples](#code-examples)

## Authentication

RPrint supports two authentication methods:

### 1. JWT Token Authentication (User-based)

**Step 1: Register** (one-time)

```bash
curl -X POST https://growingsoft.net/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "my-app",
    "password": "secure-password-123",
    "displayName": "My Application",
    "email": "admin@myapp.com"
  }'
```

**Step 2: Login** (get token)

```bash
curl -X POST https://growingsoft.net/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "my-app",
    "password": "secure-password-123"
  }'
```

Response:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "client": {
    "id": "client-uuid",
    "username": "my-app",
    "displayName": "My Application"
  }
}
```

**Step 3: Use token in requests**

```bash
curl -X GET https://growingsoft.net/api/printers \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

Token is valid for **7 days**.

### 2. API Key Authentication (Server-to-Server) ⭐ Recommended

API keys are permanent and don't expire (unless configured), making them ideal for server-side integrations.

**Step 1: Create API Key**

First, login with JWT to create an API key:

```bash
curl -X POST https://growingsoft.net/api/api-keys \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Production Server",
    "expiresInDays": 0
  }'
```

Response:
```json
{
  "apiKey": "rprint_live_abc123def456...",
  "id": "key-uuid",
  "name": "Production Server",
  "message": "Store this API key securely - it will not be shown again"
}
```

⚠️ **IMPORTANT:** Save this key immediately - it cannot be retrieved later!

**Step 2: Use API key in requests**

```bash
curl -X GET https://growingsoft.net/api/printers \
  -H "X-API-Key: rprint_live_abc123def456..."
```

## Quick Start

### 1. Get Available Printers

```bash
curl -X GET "https://growingsoft.net/api/printers" \
  -H "X-API-Key: YOUR_API_KEY"
```

Response:
```json
[
  {
    "id": "printer-uuid-1",
    "workerId": "worker-uuid",
    "name": "HP_LaserJet_Pro",
    "displayName": "HP LaserJet Pro (Office)",
    "isDefault": true,
    "status": "online",
    "location": "Main Office - Floor 2",
    "capabilities": {
      "color": true,
      "duplex": true,
      "paperSizes": ["A4", "Letter", "Legal"],
      "maxCopies": 99
    }
  }
]
```

### 2. Submit Print Job (File Upload)

```bash
curl -X POST "https://growingsoft.net/api/jobs" \
  -H "X-API-Key: YOUR_API_KEY" \
  -F "file=@/path/to/document.pdf" \
  -F "printerId=printer-uuid-1" \
  -F "copies=2" \
  -F "colorMode=color" \
  -F "duplex=long"
```

Response:
```json
{
  "id": "job-uuid",
  "clientId": "client-uuid",
  "printerId": "printer-uuid-1",
  "fileName": "document.pdf",
  "fileSize": 524288,
  "mimeType": "application/pdf",
  "status": "pending",
  "copies": 2,
  "colorMode": "color",
  "duplex": "long",
  "orientation": "portrait",
  "paperSize": "A4",
  "createdAt": "2025-01-15T10:30:00Z"
}
```

### 3. Check Job Status

```bash
curl -X GET "https://growingsoft.net/api/jobs/job-uuid" \
  -H "X-API-Key: YOUR_API_KEY"
```

Response:
```json
{
  "id": "job-uuid",
  "status": "completed",
  "createdAt": "2025-01-15T10:30:00Z",
  "assignedAt": "2025-01-15T10:30:05Z",
  "completedAt": "2025-01-15T10:30:15Z"
}
```

### 4. Print from URL (No Upload Needed!)

```bash
curl -X POST "https://growingsoft.net/api/jobs/print-url" \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://myapp.com/invoices/invoice-12345.pdf",
    "printerId": "printer-uuid-1",
    "copies": 1,
    "webhookUrl": "https://myapp.com/api/print-callback"
  }'
```

## API Endpoints

### Authentication Endpoints

#### POST /auth/register
Register a new client account.

**Request:**
```json
{
  "username": "string (required, 3-50 chars)",
  "password": "string (required, min 6 chars)",
  "displayName": "string (optional)",
  "email": "string (optional)"
}
```

**Response:** `201 Created`
```json
{
  "id": "uuid",
  "username": "string",
  "displayName": "string",
  "createdAt": "datetime"
}
```

#### POST /auth/login
Login and receive JWT token.

**Request:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Response:** `200 OK`
```json
{
  "token": "jwt-token",
  "client": { ... }
}
```

### Printer Endpoints

#### GET /printers
List all available printers.

**Query Parameters:**
- `status` (optional): Filter by status (online, offline, busy, error)
- `workerId` (optional): Filter by worker ID

**Response:** `200 OK`
```json
[
  {
    "id": "uuid",
    "name": "string",
    "displayName": "string",
    "status": "online|offline|busy|error",
    "capabilities": {
      "color": boolean,
      "duplex": boolean,
      "paperSizes": ["A4", "Letter"],
      "maxCopies": number
    }
  }
]
```

### Print Job Endpoints

#### POST /jobs
Create print job with file upload.

**Headers:**
- `Authorization: Bearer {token}` OR `X-API-Key: {key}`
- `Content-Type: multipart/form-data`

**Form Fields:**
- `file` (required): File to print
- `printerId` (required): UUID of printer
- `copies` (optional, default: 1): Number of copies (1-99)
- `colorMode` (optional, default: color): `color` | `grayscale`
- `duplex` (optional, default: none): `none` | `short` | `long`
- `orientation` (optional, default: portrait): `portrait` | `landscape`
- `paperSize` (optional, default: A4): Paper size
- `webhookUrl` (optional): URL for job status callbacks

**Supported File Types:**
- PDF (application/pdf)
- Word (doc, docx)
- Excel (xls, xlsx)
- Images (jpg, png, gif, bmp, tiff)
- Text (txt)

**Max File Size:** 10MB

**Response:** `201 Created`
```json
{
  "id": "uuid",
  "status": "pending",
  ...
}
```

#### POST /jobs/print-url
Create print job from URL (no file upload needed).

**Request:**
```json
{
  "url": "string (required)",
  "printerId": "uuid (required)",
  "copies": 1,
  "colorMode": "color",
  "duplex": "none",
  "orientation": "portrait",
  "paperSize": "A4",
  "webhookUrl": "string (optional)",
  "headers": {
    "Authorization": "Bearer token"
  }
}
```

**Response:** `201 Created`

#### GET /jobs
List print jobs.

**Query Parameters:**
- `status` (optional): Filter by status
- `limit` (optional, default: 50, max: 100): Results per page
- `offset` (optional, default: 0): Pagination offset

**Response:** `200 OK`
```json
{
  "jobs": [ ... ],
  "total": 150,
  "limit": 50,
  "offset": 0
}
```

#### GET /jobs/:id
Get print job details.

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "status": "pending|assigned|printing|completed|failed|cancelled",
  "fileName": "string",
  "createdAt": "datetime",
  "completedAt": "datetime",
  "errorMessage": "string"
}
```

#### DELETE /jobs/:id
Cancel a print job.

**Response:** `200 OK`
```json
{
  "message": "Job cancelled successfully",
  "job": { ... }
}
```

### Webhook Endpoints

#### POST /webhooks
Create a webhook for job status notifications.

**Request:**
```json
{
  "url": "https://myapp.com/webhook",
  "events": [
    "job.assigned",
    "job.printing",
    "job.completed",
    "job.failed",
    "job.cancelled"
  ],
  "secret": "optional-secret-for-hmac",
  "active": true
}
```

**Response:** `201 Created`
```json
{
  "id": "uuid",
  "url": "string",
  "events": [...],
  "active": true,
  "createdAt": "datetime"
}
```

#### GET /webhooks
List all webhooks.

**Response:** `200 OK`
```json
[
  {
    "id": "uuid",
    "url": "string",
    "events": [...],
    "active": true,
    "lastTriggeredAt": "datetime"
  }
]
```

#### DELETE /webhooks/:id
Delete a webhook.

**Response:** `200 OK`

### API Key Endpoints

#### POST /api-keys
Create a permanent API key.

**Request:**
```json
{
  "name": "Production Server",
  "expiresInDays": 0
}
```

**Response:** `201 Created`
```json
{
  "apiKey": "rprint_live_...",
  "id": "uuid",
  "name": "string",
  "createdAt": "datetime",
  "expiresAt": null,
  "message": "Store this API key securely - it will not be shown again"
}
```

#### GET /api-keys
List all API keys (without revealing actual keys).

**Response:** `200 OK`
```json
[
  {
    "id": "uuid",
    "name": "string",
    "createdAt": "datetime",
    "expiresAt": "datetime",
    "lastUsedAt": "datetime"
  }
]
```

#### DELETE /api-keys/:id
Revoke an API key.

**Response:** `200 OK`

## Webhooks

### Webhook Payload Format

When a job status changes, RPrint will send a POST request to your webhook URL:

```json
{
  "event": "job.completed",
  "timestamp": "2025-01-15T10:30:15Z",
  "data": {
    "job": {
      "id": "job-uuid",
      "clientId": "client-uuid",
      "printerId": "printer-uuid",
      "fileName": "document.pdf",
      "status": "completed",
      "createdAt": "2025-01-15T10:30:00Z",
      "completedAt": "2025-01-15T10:30:15Z"
    }
  }
}
```

### Webhook Events

- `job.assigned` - Job assigned to a worker
- `job.printing` - Job started printing
- `job.completed` - Job completed successfully
- `job.failed` - Job failed (includes errorMessage)
- `job.cancelled` - Job was cancelled

### Webhook Headers

```
Content-Type: application/json
User-Agent: RPrint-Webhook/1.0
X-RPrint-Event: job.completed
X-RPrint-Signature: sha256=abc123... (if secret configured)
```

### Verifying Webhook Signatures

If you provided a secret when creating the webhook, verify the signature:

**PHP Example:**
```php
$payload = file_get_contents('php://input');
$signature = $_SERVER['HTTP_X_RPRINT_SIGNATURE'];
$secret = 'your-webhook-secret';

$expectedSignature = 'sha256=' . hash_hmac('sha256', $payload, $secret);

if (!hash_equals($expectedSignature, $signature)) {
    http_response_code(401);
    die('Invalid signature');
}
```

**Node.js Example:**
```javascript
const crypto = require('crypto');

const signature = req.headers['x-rprint-signature'];
const secret = 'your-webhook-secret';
const payload = JSON.stringify(req.body);

const expectedSignature = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

if (signature !== expectedSignature) {
    return res.status(401).send('Invalid signature');
}
```

### Webhook Best Practices

1. **Respond quickly** - Return 200 OK immediately, process async
2. **Handle retries** - RPrint may retry failed webhooks
3. **Verify signatures** - Always verify HMAC signatures if using secrets
4. **Use HTTPS** - Webhook URLs must use HTTPS in production
5. **Handle duplicates** - Use job ID to detect duplicate events

## Error Handling

### HTTP Status Codes

- `200 OK` - Success
- `201 Created` - Resource created successfully
- `400 Bad Request` - Invalid input/parameters
- `401 Unauthorized` - Invalid/missing credentials
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `408 Request Timeout` - URL download timeout
- `413 Payload Too Large` - File exceeds 10MB
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error

### Error Response Format

```json
{
  "error": "Error message description",
  "details": {
    "field": "Additional context"
  }
}
```

### Common Errors

**Authentication Failed:**
```json
{
  "error": "Invalid or expired token"
}
```

**Validation Error:**
```json
{
  "error": "Invalid request parameters",
  "details": {
    "printerId": "Printer ID is required"
  }
}
```

**Resource Not Found:**
```json
{
  "error": "Print job not found"
}
```

## Code Examples

### PHP (Using SDK)

```php
require 'RPrintClient.php';

$rprint = new RPrintClient('https://growingsoft.net/api', [
    'apiKey' => 'rprint_live_your_key'
]);

// Print from local file
$job = $rprint->printFile('/path/to/invoice.pdf', [
    'printerId' => 'printer-uuid',
    'copies' => 2,
    'duplex' => 'long'
]);

// Print from URL
$job = $rprint->printFromUrl('https://myapp.com/doc.pdf', [
    'printerId' => 'printer-uuid',
    'webhookUrl' => 'https://myapp.com/callback'
]);
```

### PHP (Raw cURL)

```php
$ch = curl_init('https://growingsoft.net/api/jobs/print-url');
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'X-API-Key: rprint_live_your_key',
    'Content-Type: application/json'
]);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
    'url' => 'https://example.com/document.pdf',
    'printerId' => 'printer-uuid',
    'copies' => 1
]));

$response = curl_exec($ch);
$statusCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($statusCode === 201) {
    $job = json_decode($response, true);
    echo "Job created: {$job['id']}\n";
}
```

### Python

```python
import requests

headers = {
    'X-API-Key': 'rprint_live_your_key'
}

# Get printers
response = requests.get(
    'https://growingsoft.net/api/printers',
    headers=headers
)
printers = response.json()

# Print from URL
response = requests.post(
    'https://growingsoft.net/api/jobs/print-url',
    headers=headers,
    json={
        'url': 'https://example.com/document.pdf',
        'printerId': printers[0]['id'],
        'copies': 1,
        'webhookUrl': 'https://myapp.com/callback'
    }
)
job = response.json()
print(f"Job ID: {job['id']}")
```

### Node.js

```javascript
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

const client = axios.create({
    baseURL: 'https://growingsoft.net/api',
    headers: {
        'X-API-Key': 'rprint_live_your_key'
    }
});

// Print from file
async function printFile(filePath, printerId) {
    const form = new FormData();
    form.append('file', fs.createReadStream(filePath));
    form.append('printerId', printerId);
    form.append('copies', '1');

    const response = await client.post('/jobs', form, {
        headers: form.getHeaders()
    });

    return response.data;
}

// Print from URL
async function printFromUrl(url, printerId) {
    const response = await client.post('/jobs/print-url', {
        url,
        printerId,
        webhookUrl: 'https://myapp.com/callback'
    });

    return response.data;
}
```

### cURL Examples

**List printers:**
```bash
curl -X GET "https://growingsoft.net/api/printers" \
  -H "X-API-Key: rprint_live_your_key"
```

**Upload and print:**
```bash
curl -X POST "https://growingsoft.net/api/jobs" \
  -H "X-API-Key: rprint_live_your_key" \
  -F "file=@document.pdf" \
  -F "printerId=printer-uuid" \
  -F "copies=2" \
  -F "colorMode=color"
```

**Print from URL:**
```bash
curl -X POST "https://growingsoft.net/api/jobs/print-url" \
  -H "X-API-Key: rprint_live_your_key" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com/doc.pdf",
    "printerId": "printer-uuid"
  }'
```

## Rate Limiting

- **Limit:** 100 requests per 15 minutes per IP
- **Headers:**
  - `X-RateLimit-Limit`: Maximum requests allowed
  - `X-RateLimit-Remaining`: Remaining requests
  - `X-RateLimit-Reset`: Time when limit resets (Unix timestamp)

When rate limit exceeded:
```json
{
  "error": "Too many requests"
}
```

## Support

- **Documentation:** https://growingsoft.net/docs
- **GitHub Issues:** https://github.com/yourusername/rprint/issues
- **Email:** support@growingsoft.net

## Changelog

### Version 1.0.0 (2025-01-15)
- Initial API release
- JWT and API key authentication
- File upload and URL-based printing
- Webhook support
- PHP SDK
