# RPrint API Integration Summary

## What's Been Created

A comprehensive REST API system has been developed to allow external applications (like your PHP app on AWS) to print documents to printers connected to growingsoft.net.

## 📁 Documentation Files Created

1. **`openapi.yaml`** - Complete OpenAPI 3.0 specification
2. **`API_DOCUMENTATION.md`** - Comprehensive API reference with examples
3. **`PHP_SDK.md`** - PHP SDK documentation and usage guide
4. **`RPrintClient.php`** - Complete PHP client library (ready to use)
5. **`apidoc.html`** - Web-based interactive API documentation (Swagger UI)

## 🚀 Quick Start for PHP Integration

### Option 1: Using the PHP SDK (Recommended)

```php
<?php
require 'RPrintClient.php';

// Initialize with API key
$rprint = new RPrintClient('https://growingsoft.net/api', [
    'apiKey' => 'rprint_live_your_api_key_here'
]);

// Get printers
$printers = $rprint->getPrinters();

// Print from URL (no file upload needed!)
$job = $rprint->printFromUrl('https://myapp.com/invoice.pdf', [
    'printerId' => $printers[0]['id'],
    'copies' => 2,
    'colorMode' => 'color',
    'duplex' => 'long',
    'webhookUrl' => 'https://myapp.com/print-callback'
]);

echo "Print job submitted: {$job['id']}\n";
?>
```

### Option 2: Using Raw cURL

```php
<?php
$ch = curl_init('https://growingsoft.net/api/jobs/print-url');
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'X-API-Key: rprint_live_your_key',
    'Content-Type: application/json'
]);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
    'url' => 'https://example.com/document.pdf',
    'printerId' => 'printer-uuid-here',
    'copies' => 1
]));

$response = curl_exec($ch);
$job = json_decode($response, true);
echo "Job ID: {$job['id']}\n";
?>
```

## 🔑 Authentication

### 1. Create an API Key (One-time Setup)

First, create a client account and get an API key:

```bash
# 1. Register
curl -X POST https://growingsoft.net/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "aws-php-app",
    "password": "secure-password-123",
    "displayName": "AWS PHP Application"
  }'

# 2. Login to get JWT token
curl -X POST https://growingsoft.net/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "aws-php-app",
    "password": "secure-password-123"
  }'

# 3. Create permanent API key
curl -X POST https://growingsoft.net/api/api-keys \
  -H "Authorization: Bearer <jwt-token-from-step-2>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Production Server",
    "expiresInDays": 0
  }'
```

**Response will include your API key:**
```json
{
  "apiKey": "rprint_live_abc123...",
  "message": "Store this API key securely - it will not be shown again"
}
```

### 2. Use API Key in Requests

Include the API key in every request:

```
X-API-Key: rprint_live_abc123...
```

## 📊 Key Features

### 1. **URL-Based Printing** (No File Upload Needed!)
```bash
POST /api/jobs/print-url
{
  "url": "https://myapp.com/invoices/12345.pdf",
  "printerId": "printer-uuid",
  "copies": 2
}
```

### 2. **Webhooks** (Get Notified When Jobs Complete)
```bash
POST /api/webhooks
{
  "url": "https://myapp.com/print-callback",
  "events": ["job.completed", "job.failed"],
  "secret": "webhook-secret-123"
}
```

When a job completes, RPrint will POST to your webhook:
```json
{
  "event": "job.completed",
  "timestamp": "2025-01-15T10:30:15Z",
  "data": {
    "job": {
      "id": "job-uuid",
      "status": "completed",
      "fileName": "invoice.pdf"
    }
  }
}
```

### 3. **Traditional File Upload**
```bash
POST /api/jobs
Content-Type: multipart/form-data

file=@document.pdf
printerId=printer-uuid
copies=2
colorMode=color
duplex=long
```

## 🌐 API Documentation Access

Visit the interactive API documentation at:

**https://growingsoft.net/apidoc**

This provides:
- Complete API reference
- Try-it-out functionality
- Request/response examples
- Authentication guide

## 📝 API Endpoints Summary

### Print Jobs
- `POST /api/jobs` - Upload and print file
- `POST /api/jobs/print-url` - Print from URL (recommended!)
- `GET /api/jobs` - List all jobs
- `GET /api/jobs/:id` - Get job status
- `DELETE /api/jobs/:id` - Cancel job

### Printers
- `GET /api/printers` - List available printers

### Webhooks
- `POST /api/webhooks` - Create webhook
- `GET /api/webhooks` - List webhooks
- `DELETE /api/webhooks/:id` - Delete webhook

### API Keys
- `POST /api/api-keys` - Create API key
- `GET /api/api-keys` - List your API keys
- `DELETE /api/api-keys/:id` - Revoke API key

## 🔄 Complete Workflow Example

```php
<?php
// 1. Initialize client
$rprint = new RPrintClient('https://growingsoft.net/api', [
    'apiKey' => getenv('RPRINT_API_KEY')
]);

// 2. Get available printers
$printers = $rprint->getPrinters(['status' => 'online']);
if (empty($printers)) {
    die("No printers available\n");
}

// 3. Print document from S3 or any URL
$job = $rprint->printFromUrl(
    'https://mybucket.s3.amazonaws.com/invoices/INV-12345.pdf',
    [
        'printerId' => $printers[0]['id'],
        'copies' => 2,
        'colorMode' => 'grayscale',
        'duplex' => 'long',
        'paperSize' => 'A4',
        'webhookUrl' => 'https://myapp.com/api/print-webhook'
    ]
);

echo "Print job {$job['id']} submitted successfully\n";
echo "Status: {$job['status']}\n";

// 4. Check status (optional, or use webhooks)
sleep(5);
$status = $rprint->getJobStatus($job['id']);
echo "Current status: {$status['status']}\n";
?>
```

## 🎯 Webhook Handler Example

```php
<?php
// webhook-handler.php

// Read payload
$payload = file_get_contents('php://input');
$data = json_decode($payload, true);

// Verify signature (if secret configured)
$signature = $_SERVER['HTTP_X_RPRINT_SIGNATURE'] ?? '';
$secret = 'your-webhook-secret';

if ($signature) {
    $expected = 'sha256=' . hash_hmac('sha256', $payload, $secret);
    if (!hash_equals($expected, $signature)) {
        http_response_code(401);
        die('Invalid signature');
    }
}

// Handle event
switch ($data['event']) {
    case 'job.completed':
        // Update your database
        updateInvoiceStatus($data['data']['job']['id'], 'printed');
        sendEmailNotification("Invoice printed successfully");
        break;

    case 'job.failed':
        logError("Print failed: " . $data['data']['job']['errorMessage']);
        retryPrintJob($data['data']['job']['id']);
        break;
}

http_response_code(200);
?>
```

## 📂 File Locations

All documentation is in the `/var/www/rprint/docs/` directory:

```
/var/www/rprint/
├── packages/server/
│   ├── openapi.yaml              # OpenAPI specification
│   └── public/
│       └── apidoc.html            # Interactive documentation page
└── docs/
    ├── API_DOCUMENTATION.md       # Complete API reference
    ├── PHP_SDK.md                 # PHP SDK guide
    ├── RPrintClient.php           # PHP client class (ready to use)
    └── INTEGRATION_SUMMARY.md     # This file
```

## 🚨 Important Security Notes

1. **Never commit API keys to git**
2. **Use environment variables** for API keys
3. **Use HTTPS** in production (already configured)
4. **Verify webhook signatures** to prevent spoofing
5. **Rotate API keys** periodically

## 💡 Best Practices

1. **Use URL-based printing** when possible (no file upload overhead)
2. **Configure webhooks** instead of polling for status
3. **Use API keys** (not JWT tokens) for server-to-server
4. **Filter printers** by status=online before printing
5. **Handle errors gracefully** (retry failed jobs, notify users)

## 🆘 Support & Troubleshooting

### View Interactive Documentation
```
https://growingsoft.net/apidoc
```

### Test API Connection
```bash
curl https://growingsoft.net/api/health
```

### Common Issues

**"Invalid API key"**
- Verify the key starts with `rprint_live_` or `rprint_test_`
- Check that the key hasn't been revoked
- Ensure you're using `X-API-Key` header

**"Printer not found"**
- List printers first: `GET /api/printers`
- Check printer status is "online"
- Verify printer ID is correct

**"File download failed"**
- Ensure URL is publicly accessible
- Check file size (max 10MB)
- Verify MIME type is supported

### Debug Mode

Enable debug logging in PHP SDK:
```php
$rprint = new RPrintClient('https://growingsoft.net/api', [
    'apiKey' => 'your-key',
    'debug' => true
]);
```

## 🎉 You're Ready!

You now have everything needed to integrate printing into your PHP application:

1. ✅ Complete REST API
2. ✅ PHP SDK with examples
3. ✅ Interactive documentation
4. ✅ Webhook support
5. ✅ URL-based printing
6. ✅ Secure API key authentication

**Next Steps:**
1. Create an API key (see authentication section)
2. Copy `RPrintClient.php` to your PHP project
3. Start printing!

For questions or issues, check the interactive documentation at https://growingsoft.net/apidoc
