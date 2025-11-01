<?php
declare(strict_types=1);

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Server\RequestHandlerInterface as RequestHandler;
use Slim\Factory\AppFactory;

$autoload = __DIR__ . '/../vendor/autoload.php';
if (!file_exists($autoload)) {
	header('Content-Type: text/plain', true, 500);
	echo "Vendor autoload not found. Please run 'composer install' in the project root.";
	exit(1);
}
require $autoload;

// Create App
$app = AppFactory::create();

// Routing middleware must be added in Slim 4
$app->addRoutingMiddleware();

// Set base path if app is not in web root (adjust if needed)
// $app->setBasePath('/');

// Error middleware (display errors for now; toggle in prod)
$displayErrorDetails = true;
$logErrors = true;
$logErrorDetails = true;
$errorMiddleware = $app->addErrorMiddleware($displayErrorDetails, $logErrors, $logErrorDetails);

// Note: Add CORS middleware later if a separate frontend origin is introduced.

// JSON response helper
function json(Response $response, $data, int $status = 200): Response {
	$payload = json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
	$response->getBody()->write($payload === false ? '{}' : $payload);
	return $response->withHeader('Content-Type', 'application/json')->withStatus($status);
}

// Health check
$app->get('/api/health', function (Request $request, Response $response): Response {
	return json($response, ['ok' => true, 'ts' => time()]);
});

// Simple index page so hitting "/" shows something instead of a 404
$app->get('/', function (Request $request, Response $response): Response {
	$html = '<!doctype html><html><head><meta charset="utf-8"><title>DOIO Macro Browser</title>' .
			'<style>body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Helvetica,Arial,sans-serif;padding:2rem}code{background:#f5f5f5;padding:.2rem .4rem;border-radius:4px}</style>' .
			'</head><body>' .
			'<h1>DOIO Macro Browser</h1>' .
			'<p>Backend is running. Try <code>/api/health</code> or <code>/api/profiles</code>.</p>' .
			'</body></html>';
	$response->getBody()->write($html);
	return $response->withHeader('Content-Type', 'text/html');
});

// API endpoints (minimal for this step)

// Run app
$app->run();

