<?php

require __DIR__ . '/../vendor/autoload.php';

$dbPath = __DIR__ . '/../var/database.sqlite';
$schemaPath = __DIR__ . '/../database/schema.sql';

// Ensure var directory exists
if (!is_dir(dirname($dbPath))) {
    mkdir(dirname($dbPath), 0755, true);
}

$pdo = new PDO('sqlite:' . $dbPath);
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

// Enable foreign keys
$pdo->exec('PRAGMA foreign_keys = ON');

// Run schema
$schema = file_get_contents($schemaPath);
$pdo->exec($schema);

echo "Database initialized at: $dbPath\n";
