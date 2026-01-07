<?php
// public/api/scrape.php

header('Content-Type: application/json');

// Check for URL parameter
$url = $_GET['url'] ?? '';

if (empty($url)) {
    http_response_code(400);
    echo json_encode(['error' => 'URL is required']);
    exit;
}

// Basic validation
if (!filter_var($url, FILTER_VALIDATE_URL)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid URL']);
    exit;
}

// Initialize cURL
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 20); // 20 seconds timeout
curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language: es-ES,es;q=0.9,en;q=0.8'
]);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false); // For dev environments

$html = curl_exec($ch);
$error = curl_error($ch);
curl_close($ch);

if ($error) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to fetch URL: ' . $error]);
    exit;
}

if (!$html) {
    http_response_code(500);
    echo json_encode(['error' => 'Empty response from URL']);
    exit;
}

// Parse HTML and extract text
// Suppress warnings for malformed HTML
libxml_use_internal_errors(true);
$dom = new DOMDocument();
$dom->loadHTML($html, LIBXML_NOERROR);
libxml_clear_errors();

// Remove script and style tags
$scripts = $dom->getElementsByTagName('script');
$remove = [];
foreach ($scripts as $item) $remove[] = $item;
foreach ($remove as $item) $item->parentNode->removeChild($item);

$styles = $dom->getElementsByTagName('style');
$remove = [];
foreach ($styles as $item) $remove[] = $item;
foreach ($remove as $item) $item->parentNode->removeChild($item);

$xpath = new DOMXPath($dom);

// 1. Extract Title
$title = '';
$titleNode = $xpath->query('//title')->item(0);
if ($titleNode) {
    $title = $titleNode->textContent;
}

// 2. Extract Meta Description
$metaDesc = '';
$metas = $xpath->query('//meta[@name="description" or @property="og:description"]/@content');
foreach ($metas as $meta) {
    $metaDesc .= $meta->nodeValue . ' ';
}

// 3. Extract JSON-LD (Structured Data)
$jsonLd = '';
$scripts = $xpath->query('//script[@type="application/ld+json"]');
foreach ($scripts as $script) {
    $jsonLd .= $script->nodeValue . "\n";
}

// 4. Extract Body Text
$body = $xpath->query('//body')->item(0);
if ($body) {
    // Remove inline scripts and styles inside body (already done globally but good to be safe)
    $text = $body->textContent;
} else {
    $text = $dom->textContent;
}

// Clean up whitespace
$text = preg_replace('/\s+/', ' ', $text);
$text = trim($text);

// Combine all context
$finalContent = "TITLE: $title\n\n";
if (!empty($metaDesc)) {
    $finalContent .= "DESCRIPTION: " . trim($metaDesc) . "\n\n";
}
if (!empty($jsonLd)) {
    // Limit JSON-LD length as it can be huge
    $finalContent .= "STRUCTURED DATA (JSON-LD): " . substr($jsonLd, 0, 5000) . "\n\n";
}
$finalContent .= "PAGE CONTENT:\n" . substr($text, 0, 10000);

// Final length check
$finalContent = substr($finalContent, 0, 15000);

echo json_encode(['success' => true, 'content' => $finalContent]);
?>
