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

$app->run();

