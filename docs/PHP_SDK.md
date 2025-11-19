# RPrint PHP SDK

Complete PHP integration library for RPrint Remote Printing API.

## Installation

Simply copy the `RPrintClient.php` file to your project:

```php
require_once 'path/to/RPrintClient.php';
```

## Quick Start

```php
<?php
require_once 'RPrintClient.php';

// Initialize client with credentials
$rprint = new RPrintClient('https://growingsoft.net/api', [
    'username' => 'your-app-name',
    'password' => 'your-password'
]);

// Or use API key (recommended for production)
$rprint = new RPrintClient('https://growingsoft.net/api', [
    'apiKey' => 'rprint_live_your_api_key_here'
]);

// Get available printers
$printers = $rprint->getPrinters();
echo "Available printers:\n";
foreach ($printers as $printer) {
    echo "- {$printer['displayName']} ({$printer['id']})\n";
}

// Submit a print job from local file
$job = $rprint->printFile('/path/to/document.pdf', [
    'printerId' => $printers[0]['id'],
    'copies' => 2,
    'colorMode' => 'color',
    'duplex' => 'long'
]);
echo "Print job submitted: {$job['id']}\n";

// Check job status
$status = $rprint->getJobStatus($job['id']);
echo "Job status: {$status['status']}\n";
?>
```

## Features

- ✅ JWT token and API key authentication
- ✅ File upload printing
- ✅ URL-based printing
- ✅ Job status checking
- ✅ Webhook configuration
- ✅ Automatic token refresh
- ✅ Error handling
- ✅ PSR-3 compatible logging

## API Reference

### Authentication

#### Using Username/Password

```php
$rprint = new RPrintClient('https://growingsoft.net/api', [
    'username' => 'your-app',
    'password' => 'secure-password'
]);
```

The client will automatically login and manage JWT tokens.

#### Using API Key (Recommended)

```php
$rprint = new RPrintClient('https://growingsoft.net/api', [
    'apiKey' => 'rprint_live_your_api_key_here'
]);
```

API keys don't expire and are more secure for server-to-server integration.

### Printing Methods

#### Print from Local File

```php
$job = $rprint->printFile('/path/to/file.pdf', [
    'printerId' => 'printer-uuid',
    'copies' => 1,
    'colorMode' => 'color',      // 'color' or 'grayscale'
    'duplex' => 'none',           // 'none', 'short', 'long'
    'orientation' => 'portrait',  // 'portrait' or 'landscape'
    'paperSize' => 'A4',
    'webhookUrl' => 'https://myapp.com/callback'  // Optional
]);
```

#### Print from URL

```php
$job = $rprint->printFromUrl('https://example.com/invoice.pdf', [
    'printerId' => 'printer-uuid',
    'copies' => 1,
    'colorMode' => 'color',
    'headers' => [  // Optional headers for URL fetch
        'Authorization' => 'Bearer token123'
    ]
]);
```

### Printer Management

#### Get All Printers

```php
$printers = $rprint->getPrinters();

foreach ($printers as $printer) {
    echo $printer['displayName'] . "\n";
    echo "  Status: " . $printer['status'] . "\n";
    echo "  Color: " . ($printer['capabilities']['color'] ? 'Yes' : 'No') . "\n";
    echo "  Duplex: " . ($printer['capabilities']['duplex'] ? 'Yes' : 'No') . "\n";
}
```

#### Get Online Printers Only

```php
$onlinePrinters = $rprint->getPrinters(['status' => 'online']);
```

### Job Management

#### Get Job Status

```php
$status = $rprint->getJobStatus($jobId);
echo "Status: {$status['status']}\n";
echo "Created: {$status['createdAt']}\n";

if ($status['status'] === 'completed') {
    echo "Completed at: {$status['completedAt']}\n";
} elseif ($status['status'] === 'failed') {
    echo "Error: {$status['errorMessage']}\n";
}
```

#### List All Jobs

```php
$jobs = $rprint->getJobs([
    'status' => 'completed',  // Optional filter
    'limit' => 50             // Optional limit
]);

foreach ($jobs['jobs'] as $job) {
    echo "{$job['fileName']} - {$job['status']}\n";
}
```

#### Cancel Job

```php
$result = $rprint->cancelJob($jobId);
echo $result['message'];
```

### Webhook Management

#### Create Webhook

```php
$webhook = $rprint->createWebhook([
    'url' => 'https://myapp.com/api/print-webhook',
    'events' => ['job.completed', 'job.failed'],
    'secret' => 'my-webhook-secret-key'  // For signature verification
]);
```

#### List Webhooks

```php
$webhooks = $rprint->getWebhooks();
```

#### Delete Webhook

```php
$rprint->deleteWebhook($webhookId);
```

### API Key Management

#### Create API Key

```php
$apiKey = $rprint->createApiKey([
    'name' => 'Production Server',
    'expiresInDays' => 365  // 0 = never expires
]);

// IMPORTANT: Store this securely - it won't be shown again!
echo "Your API key: {$apiKey['apiKey']}\n";
```

#### List API Keys

```php
$keys = $rprint->getApiKeys();
foreach ($keys as $key) {
    echo "{$key['name']} - Last used: {$key['lastUsedAt']}\n";
}
```

#### Delete API Key

```php
$rprint->deleteApiKey($keyId);
```

## Advanced Usage

### Custom Logger

```php
$rprint = new RPrintClient('https://growingsoft.net/api', [
    'apiKey' => 'rprint_live_key',
    'logger' => new MyPSR3Logger()
]);
```

### Custom HTTP Options

```php
$rprint = new RPrintClient('https://growingsoft.net/api', [
    'apiKey' => 'rprint_live_key',
    'httpOptions' => [
        'timeout' => 30,
        'verify_ssl' => true,
        'proxy' => 'http://proxy.example.com:8080'
    ]
]);
```

### Handling Webhooks

```php
<?php
// webhook-handler.php

// Read webhook payload
$payload = file_get_contents('php://input');
$data = json_decode($payload, true);

// Verify signature (if secret was configured)
$secret = 'my-webhook-secret-key';
$signature = $_SERVER['HTTP_X_RPRINT_SIGNATURE'] ?? '';

if ($signature) {
    $expectedSignature = 'sha256=' . hash_hmac('sha256', $payload, $secret);
    if (!hash_equals($expectedSignature, $signature)) {
        http_response_code(401);
        die('Invalid signature');
    }
}

// Process webhook
$event = $data['event'];
$job = $data['data']['job'];

switch ($event) {
    case 'job.completed':
        echo "Job {$job['id']} completed successfully\n";
        // Update your database, send notification, etc.
        break;

    case 'job.failed':
        echo "Job {$job['id']} failed: {$job['errorMessage']}\n";
        // Handle failure, retry, notify user, etc.
        break;

    case 'job.printing':
        echo "Job {$job['id']} is now printing\n";
        break;
}

http_response_code(200);
?>
```

## Error Handling

```php
try {
    $job = $rprint->printFile('/path/to/file.pdf', [
        'printerId' => 'printer-uuid'
    ]);
} catch (RPrintException $e) {
    echo "Error: " . $e->getMessage() . "\n";
    echo "HTTP Status: " . $e->getStatusCode() . "\n";

    if ($e->getStatusCode() === 401) {
        echo "Authentication failed - check credentials\n";
    } elseif ($e->getStatusCode() === 404) {
        echo "Printer not found\n";
    } elseif ($e->getStatusCode() === 400) {
        echo "Bad request: " . json_encode($e->getDetails()) . "\n";
    }
}
```

## Complete Example: AWS Lambda Integration

```php
<?php
// Lambda function to print invoice PDFs stored in S3

require 'vendor/autoload.php';
require 'RPrintClient.php';

function handler($event, $context) {
    // Initialize RPrint client
    $rprint = new RPrintClient('https://growingsoft.net/api', [
        'apiKey' => getenv('RPRINT_API_KEY')
    ]);

    // Get S3 object URL from event
    $bucket = $event['Records'][0]['s3']['bucket']['name'];
    $key = $event['Records'][0]['s3']['object']['key'];
    $s3Url = "https://{$bucket}.s3.amazonaws.com/{$key}";

    // Get printer ID from environment
    $printerId = getenv('INVOICE_PRINTER_ID');

    // Submit print job
    try {
        $job = $rprint->printFromUrl($s3Url, [
            'printerId' => $printerId,
            'copies' => 2,
            'colorMode' => 'grayscale',
            'duplex' => 'long',
            'webhookUrl' => getenv('WEBHOOK_CALLBACK_URL')
        ]);

        return [
            'statusCode' => 200,
            'body' => json_encode([
                'message' => 'Print job submitted',
                'jobId' => $job['id']
            ])
        ];
    } catch (RPrintException $e) {
        return [
            'statusCode' => 500,
            'body' => json_encode([
                'error' => $e->getMessage()
            ])
        ];
    }
}
?>
```

## Environment Variables

For production deployments, use environment variables:

```php
$rprint = new RPrintClient(
    getenv('RPRINT_API_URL'),  // https://growingsoft.net/api
    ['apiKey' => getenv('RPRINT_API_KEY')]
);
```

## Testing

```php
<?php
require 'RPrintClient.php';

// Test connection
$rprint = new RPrintClient('https://growingsoft.net/api', [
    'username' => 'test-user',
    'password' => 'test-password'
]);

echo "Testing RPrint connection...\n";

// Test 1: Get printers
echo "1. Fetching printers...\n";
$printers = $rprint->getPrinters();
echo "   Found " . count($printers) . " printers\n";

if (empty($printers)) {
    die("No printers available. Please add a worker first.\n");
}

// Test 2: Print test document
echo "2. Submitting test print job...\n";
$job = $rprint->printFromUrl('https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', [
    'printerId' => $printers[0]['id'],
    'copies' => 1
]);
echo "   Job ID: {$job['id']}\n";

// Test 3: Check status
echo "3. Checking job status...\n";
sleep(2);
$status = $rprint->getJobStatus($job['id']);
echo "   Status: {$status['status']}\n";

echo "\nAll tests passed!\n";
?>
```

## Troubleshooting

### Authentication Issues

```php
// Enable debug logging
$rprint = new RPrintClient('https://growingsoft.net/api', [
    'username' => 'user',
    'password' => 'pass',
    'debug' => true
]);
```

### SSL Certificate Issues

```php
// Disable SSL verification (not recommended for production)
$rprint = new RPrintClient('https://growingsoft.net/api', [
    'apiKey' => 'key',
    'httpOptions' => ['verify_ssl' => false]
]);
```

### Network Issues

```php
// Increase timeout
$rprint = new RPrintClient('https://growingsoft.net/api', [
    'apiKey' => 'key',
    'httpOptions' => ['timeout' => 60]
]);
```

## Support

For issues and questions:
- GitHub: https://github.com/anthropics/rprint/issues
- Email: support@growingsoft.net
