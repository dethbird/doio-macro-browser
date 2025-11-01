<?php
declare(strict_types=1);

// Simple SQLite init script: creates var/doio.sqlite and applies database/schema.sql

$root = dirname(__DIR__);
$schemaFile = $root . '/database/schema.sql';
$dbDir = $root . '/var';
$dbPath = $dbDir . '/doio.sqlite';

if (!file_exists($schemaFile)) {
    fwrite(STDERR, "Schema file not found: $schemaFile\n");
    exit(1);
}

if (!is_dir($dbDir) && !mkdir($dbDir, 0775, true) && !is_dir($dbDir)) {
    fwrite(STDERR, "Failed to create directory: $dbDir\n");
    exit(1);
}

$schema = file_get_contents($schemaFile);
if ($schema === false) {
    fwrite(STDERR, "Failed to read schema file: $schemaFile\n");
    exit(1);
}

// Prefer PDO if available for better error reporting
$usePdo = class_exists(PDO::class);

try {
    if ($usePdo) {
        $pdo = new PDO('sqlite:' . $dbPath, null, null, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
        $pdo->exec($schema);
    } else {
        if (!class_exists(SQLite3::class)) {
            fwrite(STDERR, "Neither PDO_SQLite nor SQLite3 extension is available.\n");
            exit(1);
        }
        $db = new SQLite3($dbPath);
        if ($db->exec($schema) === false) {
            throw new RuntimeException('SQLite3 exec failed: ' . $db->lastErrorMsg());
        }
        $db->close();
    }
    echo "Initialized SQLite DB at: $dbPath\n";
} catch (Throwable $e) {
    fwrite(STDERR, "DB init failed: " . $e->getMessage() . "\n");
    exit(1);
}
