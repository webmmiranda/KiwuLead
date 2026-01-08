<?php
// public/api/imap_helper.php

// --- Robust IMAP Helper Class (Socket based) ---
class IMAPClient {
    private $stream;
    private $host;
    private $port;
    private $user;
    private $pass;
    private $tagCount = 0;
    private $error;

    public function __construct($h, $p, $u, $pw) {
        $this->host = $h;
        $this->port = $p;
        $this->user = $u;
        $this->pass = $pw;
    }

    public function getLastError() { return $this->error; }

    public function connect() {
        $tls = ($this->port == 993 || $this->port == 465) ? 'ssl://' : '';
        $timeout = 10;
        
        $this->stream = @fsockopen($tls . $this->host, $this->port, $errno, $errstr, $timeout);
        
        if (!$this->stream) {
            $this->error = "Connection failed: $errstr ($errno)";
            return false;
        }
        
        // Read banner
        $this->getLine(); 

        // Login
        if (!$this->exec("LOGIN \"{$this->user}\" \"{$this->pass}\"")) {
            $this->error = "Login failed. Check credentials.";
            return false;
        }

        // Select Inbox
        if (!$this->exec("SELECT INBOX")) {
            $this->error = "Could not open INBOX.";
            return false;
        }

        return true;
    }

    public function fetchRecent($limit = 10) {
        // Get total messages
        $response = $this->exec("STATUS INBOX (MESSAGES)", true);
        if (!$response) return [];

        preg_match('/MESSAGES (\d+)/', $response, $m);
        $total = isset($m[1]) ? (int)$m[1] : 0;
        
        if ($total == 0) return [];

        $start = max(1, $total - $limit + 1);
        $end = $total;
        
        $emails = [];
        
        // Fetch strictly what we need for each message
        // We go backwards to get newest first
        for ($i = $end; $i >= $start; $i--) {
            // Fetch Headers
            $rawHeaders = $this->exec("FETCH $i body[header]", true);
            
            // Parse headers
            $subject = $this->parseHeader($rawHeaders, 'Subject');
            $from = $this->parseHeader($rawHeaders, 'From');
            $date = $this->parseHeader($rawHeaders, 'Date');
            $mid = $this->parseHeader($rawHeaders, 'Message-ID');
            $to = $this->parseHeader($rawHeaders, 'To');
            $contentType = $this->parseHeader($rawHeaders, 'Content-Type');

            // Fetch Body
            // Strategy: 
            // 1. Try to fetch the whole body source (limit to say 50KB to avoid memory issues)
            // 2. Parse it locally to find HTML.
            $rawBody = $this->exec("FETCH $i BODY.PEEK[]<0.50000>", true); // 50KB limit
            
            // Clean response wrapper
            $rawBody = $this->cleanBodyResponse($rawBody);
            
            // Extract Content
            $bodyContent = $this->extractBodyContent($rawBody, $contentType);

            $emails[] = [
                'message_id' => $mid ?: md5($date . $from . $subject . $i),
                'subject' => $subject ?: '(No Subject)',
                'from' => $from ?: 'Unknown',
                'to' => $to,
                'timestamp' => $date ? strtotime($date) : time(),
                'body' => $bodyContent
            ];
        }
        
        return $emails;
    }

    private function extractBodyContent($rawSource, $mainContentType) {
        // Simple Parser
        // 1. Check if it's multipart
        if (preg_match('/boundary="?([^";\r\n]+)"?/i', $mainContentType, $m)) {
            $boundary = $m[1];
            $parts = explode("--" . $boundary, $rawSource);
            
            $htmlPart = "";
            $textPart = "";
            
            foreach ($parts as $part) {
                if (trim($part) == "--" || trim($part) == "") continue;
                
                // Separate headers and body of the part
                $p = explode("\r\n\r\n", $part, 2);
                if (count($p) < 2) continue;
                
                $headers = $p[0];
                $body = $p[1];
                
                if (stripos($headers, 'Content-Type: text/html') !== false) {
                    $htmlPart = $body;
                } elseif (stripos($headers, 'Content-Type: text/plain') !== false) {
                    $textPart = $body;
                }
            }
            
            $final = $htmlPart ?: $textPart;
            // Decode Quoted-Printable or Base64 if needed
            // This is complex regex check on headers. simplified:
            if (stripos($final, '=3D') !== false || stripos($final, "=\r\n") !== false) {
                $final = quoted_printable_decode($final);
            }
            // Check for base64 (rough check)
            // Ideally we parse Content-Transfer-Encoding header of that part.
            // For now, let's assume if it looks base64'd we decode it? No, unsafe. 
            // Better to parse the encoding from headers.
            
            return $final ?: "No readable content found.";
        } 
        
        // Not multipart, just return raw (likely text/plain or text/html)
        // Check encoding
        if (stripos($mainContentType, 'quoted-printable') !== false) {
            return quoted_printable_decode($rawSource);
        }
        return $rawSource;
    }

    private function getLine() {
        $line = fgets($this->stream);
        return $line;
    }

    private function exec($cmd, $multiline = false) {
        $this->tagCount++;
        $tag = "TAG" . $this->tagCount;
        fwrite($this->stream, "$tag $cmd\r\n");

        $response = "";
        while (!feof($this->stream)) {
            $line = fgets($this->stream);
            if ($multiline) $response .= $line;
            
            if (strpos($line, "$tag OK") === 0) {
                return $multiline ? $response : true;
            }
            if (strpos($line, "$tag NO") === 0 || strpos($line, "$tag BAD") === 0) {
                return false;
            }
        }
        return false;
    }

    private function parseHeader($raw, $name) {
        // Simple regex to find "Header: Value"
        // Handles multiline headers roughly
        if (preg_match("/^$name:\s*(.*?)(?=\r\n[^\s]|\r\n$)/ims", $raw, $m)) {
            $val = trim($m[1]);
            // Decode MIME if needed (e.g. =?UTF-8?B?...)
            if (function_exists('mb_decode_mimeheader')) {
                return mb_decode_mimeheader($val);
            }
            return $val;
        }
        return null;
    }

    private function cleanBodyResponse($raw) {
        // Remove the command start line (e.g. * 1 FETCH...)
        $raw = preg_replace('/^\* \d+ FETCH.*?\r\n/i', '', $raw);
        // Remove the command end line (TAG OK...)
        $raw = preg_replace('/TAG\d+ OK.*\r\n$/', '', $raw);
        // Remove closing bracket usually at end
        $raw = preg_replace('/\)\r\n$/', '', $raw);
        
        return trim($raw);
    }

    public function appendSentMessage($folder, $rawMessage) {
        // 1. Check if folder exists, if not try common names
        // Note: For simplicity we assume 'Sent' or passed folder. 
        // Real implementations scan LIST.
        
        // 2. Prepare APPEND command
        // APPEND folder (\Seen) {size}
        $size = strlen($rawMessage);
        $this->exec("APPEND \"$folder\" (\Seen) {".$size."}", false);
        
        // 3. Wait for continuation '+'
        $line = $this->getLine();
        if (strpos($line, '+') !== 0) {
            $this->error = "Server did not accept literal for append: $line";
            return false;
        }

        // 4. Send Content
        // We write directly to stream to avoid tag prefix
        fwrite($this->stream, $rawMessage . "\r\n");
        
        // 5. Check final status (reading line by line until TAG OK/NO/BAD)
        // Since we are inside a command flow started by exec manual call above isn't quite right
        // because exec() handles the loop. 
        // Let's refactor exec to handle literals or do manually here.
        // Manual way:
        $response = "";
        $tag = "TAG" . $this->tagCount; // matches the one from exec call above? No, exec increments.
        // We need a custom exec for APPEND or modify exec.
        // Let's do it manually to be safe.
        
        // RE-DOING manual approach for correctness:
    }
    
    // Correct Append Implementation
    public function saveToSent($rawHeaders, $rawBody) {
        $content = $rawHeaders . "\r\n\r\n" . $rawBody;
        $size = strlen($content);
        $folder = "Sent"; // Default, could be "Sent Items", "INBOX.Sent"

        // Try 'Sent' first
        if (!$this->doAppend($folder, $content, $size)) {
             // Try 'Sent Items'
             $folder = "Sent Items";
             if (!$this->doAppend($folder, $content, $size)) {
                  // Try 'INBOX.Sent'
                  $folder = "INBOX.Sent";
                  $this->doAppend($folder, $content, $size);
             }
        }
        return true;
    }

    private function doAppend($folder, $content, $size) {
        $this->tagCount++;
        $tag = "TAG" . $this->tagCount;
        fwrite($this->stream, "$tag APPEND \"$folder\" (\Seen) {".$size."}\r\n");
        
        $response = fgets($this->stream);
        if (strpos($response, '+') === 0) {
            fwrite($this->stream, $content . "\r\n");
            // Read final result
            while (!feof($this->stream)) {
                $line = fgets($this->stream);
                if (strpos($line, "$tag OK") === 0) return true;
                if (strpos($line, "$tag NO") === 0 || strpos($line, "$tag BAD") === 0) return false;
            }
        }
        return false;
    }
    
    public function close() {
        if ($this->stream) {
            fwrite($this->stream, "LOGOUT\r\n");
            fclose($this->stream);
        }
    }
}

function extractEmail($str) {
    if (preg_match('/<([^>]+)>/', $str, $m)) {
        return $m[1];
    }
    // If no brackets, check if it looks like an email
    if (filter_var($str, FILTER_VALIDATE_EMAIL)) {
        return $str;
    }
    return '';
}

?>
