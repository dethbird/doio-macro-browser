<?php

require __DIR__ . '/../vendor/autoload.php';

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Slim\Factory\AppFactory;
use Slim\Views\Twig;
use Slim\Views\TwigMiddleware;

// Load environment variables
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/..');
$dotenv->load();

// Start session
session_start();

// Load Vite manifest
function getViteAssets(): array {
    $manifestPath = __DIR__ . '/assets/.vite/manifest.json';
    if (!file_exists($manifestPath)) {
        return [];
    }
    $manifest = json_decode(file_get_contents($manifestPath), true);
    $entry = $manifest['src/main.tsx'] ?? null;
    if (!$entry) {
        return [];
    }
    
    $assets = ['js' => [], 'css' => []];
    $assets['js'][] = '/assets/' . $entry['file'];
    
    if (!empty($entry['css'])) {
        foreach ($entry['css'] as $css) {
            $assets['css'][] = '/assets/' . $css;
        }
    }
    
    return $assets;
}

// Database connection
function getDb(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        $pdo = new PDO('sqlite:' . __DIR__ . '/../var/database.sqlite');
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
        $pdo->exec('PRAGMA foreign_keys = ON');
    }
    return $pdo;
}

// JSON response helper
function jsonResponse(Response $response, array $data, int $status = 200): Response {
    $response->getBody()->write(json_encode($data));
    return $response
        ->withHeader('Content-Type', 'application/json')
        ->withStatus($status);
}

$app = AppFactory::create();

// Add error middleware for debugging
$app->addErrorMiddleware(true, true, true);

$twig = Twig::create(__DIR__ . '/../templates', ['cache' => false]);
$app->add(TwigMiddleware::create($app, $twig));

// Auth check helper
$requireAuth = function (Request $request, Response $response, callable $next) {
    if (empty($_SESSION['authenticated'])) {
        return $response->withHeader('Location', '/login')->withStatus(302);
    }
    return $next($request, $response);
};

// Login page
$app->get('/login', function (Request $request, Response $response) {
    if (!empty($_SESSION['authenticated'])) {
        return $response->withHeader('Location', '/')->withStatus(302);
    }
    $view = Twig::fromRequest($request);
    return $view->render($response, 'login.twig');
});

// Login handler
$app->post('/login', function (Request $request, Response $response) {
    $data = $request->getParsedBody();
    $password = $data['password'] ?? '';
    
    if ($password === $_ENV['APP_PASSWORD']) {
        $_SESSION['authenticated'] = true;
        return $response->withHeader('Location', '/')->withStatus(302);
    }
    
    $view = Twig::fromRequest($request);
    return $view->render($response, 'login.twig', ['error' => 'Invalid password']);
});

// Logout
$app->get('/logout', function (Request $request, Response $response) {
    session_destroy();
    return $response->withHeader('Location', '/login')->withStatus(302);
});

// Protected routes
$app->get('/', function (Request $request, Response $response) use ($requireAuth) {
    $authResponse = $requireAuth($request, $response, function ($req, $res) {
        $view = Twig::fromRequest($req);
        $assets = getViteAssets();
        return $view->render($res, 'index.twig', ['assets' => $assets]);
    });
    return $authResponse;
});

$app->get('/api/healthcheck', function (Request $request, Response $response) {
    $data = ['status' => 'ok', 'timestamp' => time()];
    $response->getBody()->write(json_encode($data));
    return $response->withHeader('Content-Type', 'application/json');
});

// API: Get all applications
$app->get('/api/applications', function (Request $request, Response $response) {
    $db = getDb();
    $stmt = $db->query('SELECT * FROM application ORDER BY name');
    $applications = $stmt->fetchAll();
    return jsonResponse($response, $applications);
});

// API: Create application
$app->post('/api/applications', function (Request $request, Response $response) {
    $data = json_decode($request->getBody()->getContents(), true);
    $name = trim($data['name'] ?? '');
    
    if (empty($name)) {
        return jsonResponse($response, ['error' => 'Name is required'], 400);
    }
    
    $db = getDb();
    
    // Check if already exists
    $stmt = $db->prepare('SELECT id FROM application WHERE name = ?');
    $stmt->execute([$name]);
    if ($stmt->fetch()) {
        return jsonResponse($response, ['error' => 'Application already exists'], 409);
    }
    
    $stmt = $db->prepare('INSERT INTO application (name) VALUES (?)');
    $stmt->execute([$name]);
    
    $id = $db->lastInsertId();
    
    return jsonResponse($response, ['id' => (int)$id, 'name' => $name], 201);
});

// API: Get single application
$app->get('/api/applications/{id}', function (Request $request, Response $response, array $args) {
    $db = getDb();
    $stmt = $db->prepare('SELECT * FROM application WHERE id = ?');
    $stmt->execute([$args['id']]);
    $application = $stmt->fetch();
    
    if (!$application) {
        return jsonResponse($response, ['error' => 'Application not found'], 404);
    }
    
    return jsonResponse($response, $application);
});

// API: Get profiles for an application (application_id required)
$app->get('/api/applications/{application_id}/profiles', function (Request $request, Response $response, array $args) {
    $db = getDb();
    
    // Verify application exists
    $stmt = $db->prepare('SELECT id FROM application WHERE id = ?');
    $stmt->execute([$args['application_id']]);
    if (!$stmt->fetch()) {
        return jsonResponse($response, ['error' => 'Application not found'], 404);
    }
    
    $stmt = $db->prepare('SELECT * FROM profile WHERE application_id = ? ORDER BY name');
    $stmt->execute([$args['application_id']]);
    $profiles = $stmt->fetchAll();
    
    return jsonResponse($response, $profiles);
});

// API: Create profile for an application
$app->post('/api/applications/{application_id}/profiles', function (Request $request, Response $response, array $args) {
    $data = json_decode($request->getBody()->getContents(), true);
    $name = trim($data['name'] ?? '');
    $applicationId = $args['application_id'];
    
    if (empty($name)) {
        return jsonResponse($response, ['error' => 'Name is required'], 400);
    }
    
    $db = getDb();
    
    // Verify application exists
    $stmt = $db->prepare('SELECT id FROM application WHERE id = ?');
    $stmt->execute([$applicationId]);
    if (!$stmt->fetch()) {
        return jsonResponse($response, ['error' => 'Application not found'], 404);
    }
    
    $stmt = $db->prepare('INSERT INTO profile (application_id, name) VALUES (?, ?)');
    $stmt->execute([$applicationId, $name]);
    
    $id = $db->lastInsertId();
    
    return jsonResponse($response, [
        'id' => (int)$id,
        'application_id' => (int)$applicationId,
        'name' => $name,
        'json_filename' => null,
        'json' => null
    ], 201);
});

// API: Get single profile
$app->get('/api/applications/{application_id}/profiles/{id}', function (Request $request, Response $response, array $args) {
    $db = getDb();
    $stmt = $db->prepare('SELECT * FROM profile WHERE id = ? AND application_id = ?');
    $stmt->execute([$args['id'], $args['application_id']]);
    $profile = $stmt->fetch();
    
    if (!$profile) {
        return jsonResponse($response, ['error' => 'Profile not found'], 404);
    }
    
    // Parse the JSON field
    if ($profile['json']) {
        $profile['json'] = json_decode($profile['json'], true);
    }
    
    return jsonResponse($response, $profile);
});

// API: Update profile JSON
$app->put('/api/applications/{application_id}/profiles/{id}', function (Request $request, Response $response, array $args) {
    $data = json_decode($request->getBody()->getContents(), true);
    $json = $data['json'] ?? null;
    $jsonFilename = $data['json_filename'] ?? null;
    
    $db = getDb();
    $stmt = $db->prepare('SELECT * FROM profile WHERE id = ? AND application_id = ?');
    $stmt->execute([$args['id'], $args['application_id']]);
    $profile = $stmt->fetch();
    
    if (!$profile) {
        return jsonResponse($response, ['error' => 'Profile not found'], 404);
    }
    
    $stmt = $db->prepare('UPDATE profile SET json_filename = ?, json = ? WHERE id = ?');
    $stmt->execute([$jsonFilename, json_encode($json), $args['id']]);
    
    return jsonResponse($response, [
        'id' => (int)$profile['id'],
        'application_id' => (int)$profile['application_id'],
        'name' => $profile['name'],
        'json_filename' => $jsonFilename,
        'json' => $json
    ]);
});

// API: Get all translations (optionally filtered by profile_id)
$app->get('/api/translations', function (Request $request, Response $response) {
    $db = getDb();
    $params = $request->getQueryParams();
    $profileId = $params['profile_id'] ?? null;
    
    if ($profileId) {
        // Get profile-specific + generic translations
        $stmt = $db->prepare('SELECT * FROM translation WHERE profile_id = ? OR profile_id IS NULL ORDER BY via_macro');
        $stmt->execute([$profileId]);
    } else {
        // Get all translations
        $stmt = $db->query('SELECT * FROM translation ORDER BY via_macro');
    }
    
    $translations = $stmt->fetchAll();
    return jsonResponse($response, $translations);
});

// API: Create translation
$app->post('/api/translations', function (Request $request, Response $response) {
    $data = json_decode($request->getBody()->getContents(), true);
    $viaMacro = trim($data['via_macro'] ?? '');
    $humanLabel = trim($data['human_label'] ?? '');
    $profileId = isset($data['profile_id']) ? (int)$data['profile_id'] : null;
    
    if (empty($viaMacro) || empty($humanLabel)) {
        return jsonResponse($response, ['error' => 'via_macro and human_label are required'], 400);
    }
    
    $db = getDb();
    
    // Verify profile exists if specified
    if ($profileId !== null) {
        $stmt = $db->prepare('SELECT id FROM profile WHERE id = ?');
        $stmt->execute([$profileId]);
        if (!$stmt->fetch()) {
            return jsonResponse($response, ['error' => 'Profile not found'], 404);
        }
    }
    
    // Check for existing translation
    if ($profileId !== null) {
        $stmt = $db->prepare('SELECT id FROM translation WHERE via_macro = ? AND profile_id = ?');
        $stmt->execute([$viaMacro, $profileId]);
    } else {
        $stmt = $db->prepare('SELECT id FROM translation WHERE via_macro = ? AND profile_id IS NULL');
        $stmt->execute([$viaMacro]);
    }
    
    if ($stmt->fetch()) {
        return jsonResponse($response, ['error' => 'Translation already exists'], 409);
    }
    
    $stmt = $db->prepare('INSERT INTO translation (via_macro, profile_id, human_label) VALUES (?, ?, ?)');
    $stmt->execute([$viaMacro, $profileId, $humanLabel]);
    
    $id = $db->lastInsertId();
    
    return jsonResponse($response, [
        'id' => (int)$id,
        'via_macro' => $viaMacro,
        'profile_id' => $profileId,
        'human_label' => $humanLabel
    ], 201);
});

// API: Update translation
$app->put('/api/translations/{id}', function (Request $request, Response $response, array $args) {
    $data = json_decode($request->getBody()->getContents(), true);
    $humanLabel = trim($data['human_label'] ?? '');
    
    if (empty($humanLabel)) {
        return jsonResponse($response, ['error' => 'human_label is required'], 400);
    }
    
    $db = getDb();
    $stmt = $db->prepare('SELECT * FROM translation WHERE id = ?');
    $stmt->execute([$args['id']]);
    $translation = $stmt->fetch();
    
    if (!$translation) {
        return jsonResponse($response, ['error' => 'Translation not found'], 404);
    }
    
    $stmt = $db->prepare('UPDATE translation SET human_label = ? WHERE id = ?');
    $stmt->execute([$humanLabel, $args['id']]);
    
    return jsonResponse($response, [
        'id' => (int)$translation['id'],
        'via_macro' => $translation['via_macro'],
        'profile_id' => $translation['profile_id'] ? (int)$translation['profile_id'] : null,
        'human_label' => $humanLabel
    ]);
});

// API: Delete translation
$app->delete('/api/translations/{id}', function (Request $request, Response $response, array $args) {
    $db = getDb();
    $stmt = $db->prepare('SELECT id FROM translation WHERE id = ?');
    $stmt->execute([$args['id']]);
    
    if (!$stmt->fetch()) {
        return jsonResponse($response, ['error' => 'Translation not found'], 404);
    }
    
    $stmt = $db->prepare('DELETE FROM translation WHERE id = ?');
    $stmt->execute([$args['id']]);
    
    return jsonResponse($response, ['success' => true]);
});

// API: Bulk save translations for a profile
// Body: { profile_id: number, translations: { [via_macro: string]: { label: string, icon?: string } } }
// Empty label will delete the translation, non-empty will upsert
$app->post('/api/translations/bulk', function (Request $request, Response $response) {
    $data = json_decode($request->getBody()->getContents(), true);
    $profileId = isset($data['profile_id']) ? (int)$data['profile_id'] : null;
    $translations = $data['translations'] ?? [];
    
    if ($profileId === null) {
        return jsonResponse($response, ['error' => 'profile_id is required'], 400);
    }
    
    if (!is_array($translations)) {
        return jsonResponse($response, ['error' => 'translations must be an object'], 400);
    }
    
    $db = getDb();
    
    // Verify profile exists
    $stmt = $db->prepare('SELECT id FROM profile WHERE id = ?');
    $stmt->execute([$profileId]);
    if (!$stmt->fetch()) {
        return jsonResponse($response, ['error' => 'Profile not found'], 404);
    }
    
    $saved = 0;
    $deleted = 0;
    
    foreach ($translations as $viaMacro => $value) {
        $viaMacro = trim($viaMacro);
        if (empty($viaMacro)) continue;
        
        // Support both old format (string) and new format ({ label, icon })
        if (is_string($value)) {
            $humanLabel = trim($value);
            $iconUrl = null;
        } else {
            $humanLabel = trim($value['label'] ?? '');
            $iconUrl = isset($value['icon']) ? trim($value['icon']) : null;
            if ($iconUrl === '') $iconUrl = null;
        }
        
        // Check if translation exists for this profile
        $stmt = $db->prepare('SELECT id FROM translation WHERE via_macro = ? AND profile_id = ?');
        $stmt->execute([$viaMacro, $profileId]);
        $existing = $stmt->fetch();
        
        if (empty($humanLabel)) {
            // Delete if exists and value is empty
            if ($existing) {
                $stmt = $db->prepare('DELETE FROM translation WHERE id = ?');
                $stmt->execute([$existing['id']]);
                $deleted++;
            }
        } else {
            // Upsert
            if ($existing) {
                $stmt = $db->prepare('UPDATE translation SET human_label = ?, icon_url = ? WHERE id = ?');
                $stmt->execute([$humanLabel, $iconUrl, $existing['id']]);
            } else {
                $stmt = $db->prepare('INSERT INTO translation (via_macro, profile_id, human_label, icon_url) VALUES (?, ?, ?, ?)');
                $stmt->execute([$viaMacro, $profileId, $humanLabel, $iconUrl]);
            }
            $saved++;
        }
    }
    
    return jsonResponse($response, ['success' => true, 'saved' => $saved, 'deleted' => $deleted]);
});

// API: Get layer translations for a profile
$app->get('/api/profiles/{id}/layer-translations', function (Request $request, Response $response, array $args) {
    $db = getDb();
    $stmt = $db->prepare('SELECT * FROM layer_translation WHERE profile_id = ? ORDER BY layer_index');
    $stmt->execute([$args['id']]);
    $translations = $stmt->fetchAll();
    return jsonResponse($response, $translations);
});

// API: Bulk save layer translations for a profile
// Body: { layers: { [layer_index: number]: { label: string, icon?: string } } }
// Empty label will delete the translation, non-empty will upsert
$app->post('/api/profiles/{id}/layer-translations', function (Request $request, Response $response, array $args) {
    $profileId = (int)$args['id'];
    $data = json_decode($request->getBody()->getContents(), true);
    $layers = $data['layers'] ?? [];
    
    if (!is_array($layers)) {
        return jsonResponse($response, ['error' => 'layers must be an object'], 400);
    }
    
    $db = getDb();
    
    // Verify profile exists
    $stmt = $db->prepare('SELECT id FROM profile WHERE id = ?');
    $stmt->execute([$profileId]);
    if (!$stmt->fetch()) {
        return jsonResponse($response, ['error' => 'Profile not found'], 404);
    }
    
    $saved = 0;
    $deleted = 0;
    
    foreach ($layers as $layerIndex => $value) {
        $layerIndex = (int)$layerIndex;
        
        // Support both old format (string) and new format ({ label, icon })
        if (is_string($value)) {
            $humanLabel = trim($value);
            $iconUrl = null;
        } else {
            $humanLabel = trim($value['label'] ?? '');
            $iconUrl = isset($value['icon']) ? trim($value['icon']) : null;
            if ($iconUrl === '') $iconUrl = null;
        }
        
        // Check if translation exists
        $stmt = $db->prepare('SELECT id FROM layer_translation WHERE profile_id = ? AND layer_index = ?');
        $stmt->execute([$profileId, $layerIndex]);
        $existing = $stmt->fetch();
        
        if (empty($humanLabel)) {
            // Delete if exists and value is empty
            if ($existing) {
                $stmt = $db->prepare('DELETE FROM layer_translation WHERE id = ?');
                $stmt->execute([$existing['id']]);
                $deleted++;
            }
        } else {
            // Upsert
            if ($existing) {
                $stmt = $db->prepare('UPDATE layer_translation SET human_label = ?, icon_url = ? WHERE id = ?');
                $stmt->execute([$humanLabel, $iconUrl, $existing['id']]);
            } else {
                $stmt = $db->prepare('INSERT INTO layer_translation (profile_id, layer_index, human_label, icon_url) VALUES (?, ?, ?, ?)');
                $stmt->execute([$profileId, $layerIndex, $humanLabel, $iconUrl]);
            }
            $saved++;
        }
    }
    
    return jsonResponse($response, ['success' => true, 'saved' => $saved, 'deleted' => $deleted]);
});

$app->run();

