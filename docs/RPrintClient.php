<?php
/**
 * RPrint PHP Client
 *
 * A complete PHP SDK for the RPrint Remote Printing API.
 *
 * @version 1.0.0
 * @author RPrint
 * @link https://growingsoft.net
 */

class RPrintException extends Exception {
    private $statusCode;
    private $details;

    public function __construct($message, $statusCode = 0, $details = null) {
        parent::__construct($message);
        $this->statusCode = $statusCode;
        $this->details = $details;
    }

    public function getStatusCode() {
        return $this->statusCode;
    }

    public function getDetails() {
        return $this->details;
    }
}

class RPrintClient {
    private $baseUrl;
    private $apiKey;
    private $username;
    private $password;
    private $token;
    private $tokenExpiry;
    private $logger;
    private $httpOptions;
    private $debug;

    /**
     * Create a new RPrint client
     *
     * @param string $baseUrl Base URL of RPrint API (e.g., https://growingsoft.net/api)
     * @param array $options Configuration options:
     *                       - apiKey: Permanent API key for authentication
     *                       - username: Username for JWT authentication
     *                       - password: Password for JWT authentication
     *                       - logger: PSR-3 compatible logger instance
     *                       - httpOptions: cURL options (timeout, verify_ssl, proxy, etc.)
     *                       - debug: Enable debug output (default: false)
     */
    public function __construct($baseUrl, $options = []) {
        $this->baseUrl = rtrim($baseUrl, '/');
        $this->apiKey = $options['apiKey'] ?? null;
        $this->username = $options['username'] ?? null;
        $this->password = $options['password'] ?? null;
        $this->logger = $options['logger'] ?? null;
        $this->debug = $options['debug'] ?? false;

        $this->httpOptions = array_merge([
            'timeout' => 30,
            'verify_ssl' => true,
            'proxy' => null
        ], $options['httpOptions'] ?? []);

        // Auto-login if username/password provided
        if ($this->username && $this->password && !$this->apiKey) {
            $this->login();
        }
    }

    /**
     * Login with username/password to get JWT token
     *
     * @return array Login response with token
     * @throws RPrintException
     */
    public function login() {
        if (!$this->username || !$this->password) {
            throw new RPrintException('Username and password required for login');
        }

        $response = $this->request('POST', '/auth/login', [
            'username' => $this->username,
            'password' => $this->password
        ], false);

        $this->token = $response['token'];
        // JWT tokens are valid for 7 days, refresh after 6 days
        $this->tokenExpiry = time() + (6 * 24 * 60 * 60);

        $this->log('info', 'Successfully logged in', ['username' => $this->username]);

        return $response;
    }

    /**
     * Get all available printers
     *
     * @param array $filters Optional filters (status, workerId)
     * @return array List of printers
     * @throws RPrintException
     */
    public function getPrinters($filters = []) {
        $query = http_build_query($filters);
        $url = '/printers' . ($query ? '?' . $query : '');
        return $this->request('GET', $url);
    }

    /**
     * Print a file from local path
     *
     * @param string $filePath Path to file to print
     * @param array $options Print options (printerId, copies, colorMode, etc.)
     * @return array Print job details
     * @throws RPrintException
     */
    public function printFile($filePath, $options = []) {
        if (!file_exists($filePath)) {
            throw new RPrintException("File not found: {$filePath}");
        }

        if (!isset($options['printerId'])) {
            throw new RPrintException('printerId is required');
        }

        // Prepare multipart form data
        $boundary = '----RPrintBoundary' . uniqid();
        $body = '';

        // Add file
        $fileName = basename($filePath);
        $fileData = file_get_contents($filePath);
        $mimeType = $this->getMimeType($filePath);

        $body .= "--{$boundary}\r\n";
        $body .= "Content-Disposition: form-data; name=\"file\"; filename=\"{$fileName}\"\r\n";
        $body .= "Content-Type: {$mimeType}\r\n\r\n";
        $body .= $fileData . "\r\n";

        // Add other fields
        foreach ($options as $key => $value) {
            if ($value !== null) {
                $body .= "--{$boundary}\r\n";
                $body .= "Content-Disposition: form-data; name=\"{$key}\"\r\n\r\n";
                $body .= $value . "\r\n";
            }
        }

        $body .= "--{$boundary}--\r\n";

        return $this->request('POST', '/jobs', $body, true, [
            'Content-Type' => "multipart/form-data; boundary={$boundary}"
        ]);
    }

    /**
     * Print a file from URL
     *
     * @param string $url URL of file to print
     * @param array $options Print options (printerId, copies, colorMode, etc.)
     * @return array Print job details
     * @throws RPrintException
     */
    public function printFromUrl($url, $options = []) {
        if (!isset($options['printerId'])) {
            throw new RPrintException('printerId is required');
        }

        $data = array_merge(['url' => $url], $options);
        return $this->request('POST', '/jobs/print-url', $data);
    }

    /**
     * Get print job status
     *
     * @param string $jobId Job ID
     * @return array Job details
     * @throws RPrintException
     */
    public function getJobStatus($jobId) {
        return $this->request('GET', "/jobs/{$jobId}");
    }

    /**
     * Get list of print jobs
     *
     * @param array $filters Optional filters (status, limit, offset)
     * @return array Jobs list with pagination
     * @throws RPrintException
     */
    public function getJobs($filters = []) {
        $query = http_build_query($filters);
        $url = '/jobs' . ($query ? '?' . $query : '');
        return $this->request('GET', $url);
    }

    /**
     * Cancel a print job
     *
     * @param string $jobId Job ID to cancel
     * @return array Cancellation response
     * @throws RPrintException
     */
    public function cancelJob($jobId) {
        return $this->request('DELETE', "/jobs/{$jobId}");
    }

    /**
     * Create a webhook
     *
     * @param array $webhookData Webhook configuration (url, events, secret)
     * @return array Created webhook
     * @throws RPrintException
     */
    public function createWebhook($webhookData) {
        if (!isset($webhookData['url']) || !isset($webhookData['events'])) {
            throw new RPrintException('url and events are required for webhook creation');
        }

        return $this->request('POST', '/webhooks', $webhookData);
    }

    /**
     * Get all webhooks
     *
     * @return array List of webhooks
     * @throws RPrintException
     */
    public function getWebhooks() {
        return $this->request('GET', '/webhooks');
    }

    /**
     * Delete a webhook
     *
     * @param string $webhookId Webhook ID
     * @return array Deletion response
     * @throws RPrintException
     */
    public function deleteWebhook($webhookId) {
        return $this->request('DELETE', "/webhooks/{$webhookId}");
    }

    /**
     * Create an API key
     *
     * @param array $keyData API key configuration (name, expiresInDays)
     * @return array Created API key (includes plain key - store securely!)
     * @throws RPrintException
     */
    public function createApiKey($keyData) {
        if (!isset($keyData['name'])) {
            throw new RPrintException('name is required for API key creation');
        }

        return $this->request('POST', '/api-keys', $keyData);
    }

    /**
     * Get all API keys
     *
     * @return array List of API keys
     * @throws RPrintException
     */
    public function getApiKeys() {
        return $this->request('GET', '/api-keys');
    }

    /**
     * Delete an API key
     *
     * @param string $keyId API key ID
     * @return array Deletion response
     * @throws RPrintException
     */
    public function deleteApiKey($keyId) {
        return $this->request('DELETE', "/api-keys/{$keyId}");
    }

    /**
     * Make HTTP request to API
     *
     * @param string $method HTTP method
     * @param string $endpoint API endpoint
     * @param mixed $data Request body (array or string)
     * @param bool $authenticate Whether to include authentication
     * @param array $extraHeaders Additional headers
     * @return array Response data
     * @throws RPrintException
     */
    private function request($method, $endpoint, $data = null, $authenticate = true, $extraHeaders = []) {
        // Check if token needs refresh
        if ($authenticate && !$this->apiKey && $this->token && time() >= $this->tokenExpiry) {
            $this->log('info', 'Token expired, refreshing...');
            $this->login();
        }

        $url = $this->baseUrl . $endpoint;

        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, $this->httpOptions['timeout']);

        if (!$this->httpOptions['verify_ssl']) {
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
            curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
        }

        if ($this->httpOptions['proxy']) {
            curl_setopt($ch, CURLOPT_PROXY, $this->httpOptions['proxy']);
        }

        // Set method and body
        $headers = [];

        if ($method !== 'GET') {
            curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);

            if ($data !== null) {
                if (is_array($data) && !isset($extraHeaders['Content-Type'])) {
                    $data = json_encode($data);
                    $headers[] = 'Content-Type: application/json';
                }
                curl_setopt($ch, CURLOPT_POSTFIELDS, $data);
            }
        }

        // Add authentication
        if ($authenticate) {
            if ($this->apiKey) {
                $headers[] = 'X-API-Key: ' . $this->apiKey;
            } elseif ($this->token) {
                $headers[] = 'Authorization: Bearer ' . $this->token;
            }
        }

        // Add extra headers
        foreach ($extraHeaders as $key => $value) {
            $headers[] = "{$key}: {$value}";
        }

        if (!empty($headers)) {
            curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        }

        // Debug output
        if ($this->debug) {
            echo "=== RPrint Request ===\n";
            echo "{$method} {$url}\n";
            echo "Headers: " . implode(', ', $headers) . "\n";
            if ($data && is_string($data) && strlen($data) < 1000) {
                echo "Body: {$data}\n";
            }
        }

        // Execute request
        $response = curl_exec($ch);
        $statusCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);

        // Debug output
        if ($this->debug) {
            echo "Status: {$statusCode}\n";
            echo "Response: {$response}\n";
            echo "======================\n\n";
        }

        // Check for cURL errors
        if ($error) {
            $this->log('error', 'cURL error', ['error' => $error]);
            throw new RPrintException("HTTP request failed: {$error}", 0);
        }

        // Parse response
        $responseData = json_decode($response, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            $this->log('error', 'Invalid JSON response', ['response' => $response]);
            throw new RPrintException('Invalid JSON response from server', $statusCode);
        }

        // Check for errors
        if ($statusCode >= 400) {
            $message = $responseData['error'] ?? 'Unknown error';
            $details = $responseData['details'] ?? null;

            $this->log('error', 'API error', [
                'status' => $statusCode,
                'message' => $message,
                'details' => $details
            ]);

            throw new RPrintException($message, $statusCode, $details);
        }

        return $responseData;
    }

    /**
     * Get MIME type of file
     *
     * @param string $filePath File path
     * @return string MIME type
     */
    private function getMimeType($filePath) {
        if (function_exists('mime_content_type')) {
            return mime_content_type($filePath);
        }

        $ext = strtolower(pathinfo($filePath, PATHINFO_EXTENSION));
        $mimeTypes = [
            'pdf' => 'application/pdf',
            'doc' => 'application/msword',
            'docx' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'xls' => 'application/vnd.ms-excel',
            'xlsx' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'jpg' => 'image/jpeg',
            'jpeg' => 'image/jpeg',
            'png' => 'image/png',
            'gif' => 'image/gif',
            'bmp' => 'image/bmp',
            'tiff' => 'image/tiff',
            'txt' => 'text/plain'
        ];

        return $mimeTypes[$ext] ?? 'application/octet-stream';
    }

    /**
     * Log message
     *
     * @param string $level Log level (info, error, etc.)
     * @param string $message Log message
     * @param array $context Additional context
     */
    private function log($level, $message, $context = []) {
        if ($this->logger && method_exists($this->logger, $level)) {
            $this->logger->$level($message, $context);
        } elseif ($this->debug) {
            echo "[{$level}] {$message}\n";
            if (!empty($context)) {
                echo json_encode($context, JSON_PRETTY_PRINT) . "\n";
            }
        }
    }
}
