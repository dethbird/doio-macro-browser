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

$app = AppFactory::create();

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

$app->run();

