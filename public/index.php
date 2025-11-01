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

function error(Response $response, string $message, int $status = 400, array $extra = []): Response {
	return json($response, array_merge(['error' => $message], $extra), $status);
}

// PDO SQLite connection
function db(): PDO {
	static $pdo = null;
	if ($pdo instanceof PDO) return $pdo;
	$dbPath = __DIR__ . '/../var/doio.sqlite';
	if (!file_exists($dbPath)) {
		throw new RuntimeException("Database file not found at var/doio.sqlite. Run 'composer run db:init'.");
	}
	$pdo = new PDO('sqlite:' . $dbPath, null, null, [
		PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
		PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
	]);
	$pdo->exec('PRAGMA foreign_keys = ON');
	return $pdo;
}

// Humanizer for DOIO macro strings like C(KC_0), C(S(KC_P))
function humanize(string $macro): ?string {
	$macro = trim($macro);
	if ($macro === '' || strtoupper($macro) === 'KC_NO') return null;
	$m = preg_replace('/\s+/', '', $macro ?? '');
	if ($m === '' || $m === null) return null;

	$mods = [];
	// unwrap nested modifiers like C(S(...))
	while (preg_match('/^(C|S|A|G)\((.*)\)$/', $m, $mm)) {
		$mods[] = $mm[1];
		$m = $mm[2];
	}

	// Normalize base key
	if (str_starts_with($m, 'KC_')) {
		$base = substr($m, 3);
	} else {
		$base = $m;
	}
	$map = [
		'ESC' => 'Esc','TAB'=>'Tab','ENTER'=>'Enter','SPACE'=>'Space','MINUS'=>'-','EQUAL'=>'=',
		'LBRC'=>'[','RBRC'=>']','BSLS'=>'\\\
','SCLN'=>';','QUOT'=>'\'','COMM'=>',','DOT'=>'.','SLSH'=>'/',
		'BSPC'=>'Backspace','DEL'=>'Delete','INS'=>'Insert','HOME'=>'Home','END'=>'End','PGUP'=>'PageUp','PGDN'=>'PageDown',
		'UP'=>'Up','DOWN'=>'Down','LEFT'=>'Left','RIGHT'=>'Right',
		'GRAVE'=>'`','TILDE'=>'~','CAPS'=>'CapsLock','LCTL'=>'LeftCtrl','RCTL'=>'RightCtrl','LALT'=>'LeftAlt','RALT'=>'RightAlt',
		'LGUI'=>'LeftCmd','RGUI'=>'RightCmd'
	];
	$baseUpper = strtoupper($base);
	$baseOut = $map[$baseUpper] ?? $base;

	$modsPretty = array_map(fn($x)=>['C'=>'Ctrl','S'=>'Shift','A'=>'Alt','G'=>'Cmd'][$x], $mods);
	$prefix = $modsPretty ? implode('+', $modsPretty) . '+' : '';
	return $prefix . $baseOut;
}

function resolve_label(PDO $pdo, string $macro, ?string $app): ?string {
	$macro = trim($macro);
	if ($macro === '' || strtoupper($macro) === 'KC_NO') return null;
	// App-specific translation
	if ($app) {
		$stmt = $pdo->prepare('SELECT human_label FROM translations WHERE doio_macro = :m AND app = :a LIMIT 1');
		$stmt->execute([':m'=>$macro, ':a'=>$app]);
		$row = $stmt->fetch();
		if ($row) return $row['human_label'];
	}
	// Generic translation
	$stmt = $pdo->prepare('SELECT human_label FROM translations WHERE doio_macro = :m AND app IS NULL LIMIT 1');
	$stmt->execute([':m'=>$macro]);
	$row = $stmt->fetch();
	if ($row) return $row['human_label'];
	// Fallback humanizer
	return humanize($macro);
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

// List profiles
$app->get('/api/profiles', function (Request $request, Response $response): Response {
	try {
		$pdo = db();
		$rows = $pdo->query('SELECT id, name, app, created_at FROM profiles ORDER BY created_at DESC, id DESC')->fetchAll();
		return json($response, ['profiles' => $rows]);
	} catch (Throwable $e) {
		return error($response, 'Failed to list profiles', 500, ['details' => $e->getMessage()]);
	}
});

// Create profile
$app->post('/api/profiles', function (Request $request, Response $response): Response {
	try {
		$pdo = db();
		$raw = (string)$request->getBody();
		$body = json_decode($raw, true);
		if (!is_array($body)) return error($response, 'Invalid JSON body', 400);
		$name = trim((string)($body['name'] ?? ''));
		$appName = trim((string)($body['app'] ?? ''));
		if ($name === '' || $appName === '') return error($response, 'name and app are required', 422);
		$stmt = $pdo->prepare('INSERT INTO profiles (name, app) VALUES (:n, :a)');
		$stmt->execute([':n'=>$name, ':a'=>$appName]);
		$id = (int)$pdo->lastInsertId();
		$row = $pdo->query('SELECT id, name, app, created_at FROM profiles WHERE id = '.$id.' LIMIT 1')->fetch();
		return json($response, $row, 201);
	} catch (Throwable $e) {
		return error($response, 'Failed to create profile', 500, ['details' => $e->getMessage()]);
	}
});

// Import DOIO JSON for a profile
$app->post('/api/profiles/{id}/import', function (Request $request, Response $response, array $args): Response {
	$profileId = (int)($args['id'] ?? 0);
	if ($profileId <= 0) return error($response, 'Invalid profile id', 400);
	try {
		$pdo = db();
		// Ensure profile exists
		$profile = $pdo->query('SELECT id FROM profiles WHERE id = '.$profileId.' LIMIT 1')->fetch();
		if (!$profile) return error($response, 'Profile not found', 404);

		$raw = (string)$request->getBody();
		$json = json_decode($raw, true);
		if (!is_array($json)) return error($response, 'Invalid JSON payload', 400);

		$layers = $json['layers'] ?? null;
		if (!is_array($layers) || count($layers) < 4) return error($response, 'Invalid or missing layers (need 4 arrays)', 422);

		$pdo->beginTransaction();
		// Store raw import
		$stmt = $pdo->prepare('INSERT INTO imports (profile_id, raw_json) VALUES (:pid, :raw)');
		$stmt->execute([':pid'=>$profileId, ':raw'=>$raw]);

		// Upsert layer slot macros (skip noop=19)
		$noopIndex = 19;
		$up = $pdo->prepare('INSERT INTO doio_macros(profile_id, layer, slot_index, macro) VALUES(:pid,:layer,:slot,:macro)
			ON CONFLICT(profile_id, layer, slot_index) DO UPDATE SET macro=excluded.macro');
		for ($layer = 0; $layer < 4; $layer++) {
			$arr = $layers[$layer] ?? [];
			if (!is_array($arr) || count($arr) < 20) continue;
			for ($slot = 0; $slot <= 19; $slot++) {
				if ($slot === $noopIndex) continue;
				$macro = trim((string)($arr[$slot] ?? ''));
				if ($macro === '') continue;
				$up->execute([':pid'=>$profileId, ':layer'=>$layer, ':slot'=>$slot, ':macro'=>$macro]);
			}
		}

		// Encoders mapping if provided
		$enc = $json['encoders'] ?? null;
		if (is_array($enc)) {
			// Expect an indexed array of 3 encoders with left/right arrays of length >=4
			$map = [0=>'topRight', 1=>'topLeft', 2=>'big']; // per device note
			$upEnc = $pdo->prepare('INSERT INTO encoders(profile_id, layer, encoder, direction, macro)
				VALUES(:pid,:layer,:enc,:dir,:macro)
				ON CONFLICT(profile_id, layer, encoder, direction) DO UPDATE SET macro=excluded.macro');
			foreach ($map as $idx=>$name) {
				if (!isset($enc[$idx]) || !is_array($enc[$idx])) continue;
				$item = $enc[$idx];
				$left = $item['left'] ?? null; $right = $item['right'] ?? null;
				for ($layer = 0; $layer < 4; $layer++) {
					$lMacro = is_array($left) ? trim((string)($left[$layer] ?? '')) : '';
					$rMacro = is_array($right) ? trim((string)($right[$layer] ?? '')) : '';
					if ($lMacro !== '') {
						$upEnc->execute([':pid'=>$profileId, ':layer'=>$layer, ':enc'=>$name, ':dir'=>'left', ':macro'=>$lMacro]);
					}
					if ($rMacro !== '') {
						$upEnc->execute([':pid'=>$profileId, ':layer'=>$layer, ':enc'=>$name, ':dir'=>'right', ':macro'=>$rMacro]);
					}
				}
			}
		}

		$pdo->commit();
		return json($response, ['ok'=>true]);
	} catch (Throwable $e) {
		if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
		return error($response, 'Import failed', 500, ['details'=>$e->getMessage()]);
	}
});

// Build normalized frames
$app->get('/api/profiles/{id}/frames', function (Request $request, Response $response, array $args): Response {
	$profileId = (int)($args['id'] ?? 0);
	if ($profileId <= 0) return error($response, 'Invalid profile id', 400);
	try {
		$pdo = db();
		$prof = $pdo->query('SELECT id, name, app FROM profiles WHERE id = '.$profileId.' LIMIT 1')->fetch();
		if (!$prof) return error($response, 'Profile not found', 404);
		$appName = $prof['app'];

		// Fetch macros into map[layer][slot] = macro
		$stmt = $pdo->prepare('SELECT layer, slot_index, macro FROM doio_macros WHERE profile_id = :pid');
		$stmt->execute([':pid'=>$profileId]);
		$macros = [0=>[],1=>[],2=>[],3=>[]];
		foreach ($stmt as $row) {
			$macros[(int)$row['layer']][(int)$row['slot_index']] = $row['macro'];
		}

		// Fetch encoders
		$stmt = $pdo->prepare('SELECT layer, encoder, direction, macro FROM encoders WHERE profile_id = :pid');
		$stmt->execute([':pid'=>$profileId]);
		$enc = [
			'topLeft' => ['left'=>[null,null,null,null], 'right'=>[null,null,null,null]],
			'topRight'=> ['left'=>[null,null,null,null], 'right'=>[null,null,null,null]],
			'big'     => ['left'=>[null,null,null,null], 'right'=>[null,null,null,null]],
		];
		foreach ($stmt as $row) {
			$l = (int)$row['layer']; $e = $row['encoder']; $d = $row['direction'];
			if (isset($enc[$e][$d][$l])) $enc[$e][$d][$l] = $row['macro'];
		}

		// Positions: grid indices and knobs (big knob is 14)
		$grid = [[0,1,2,3],[5,6,7,8],[10,11,12,13],[15,16,17,18]];
		$knobs = ['topLeft'=>4,'topRight'=>9,'big'=>14];

		$frames = [];
		for ($layer=0; $layer<4; $layer++) {
			$keys = [];
			foreach ($grid as $rowIdxs) {
				foreach ($rowIdxs as $slot) {
					$macro = $macros[$layer][$slot] ?? '';
					$keys[] = resolve_label($pdo, $macro, $appName);
				}
			}
			$frames[] = [
				'id' => $layer,
				'keys' => $keys,
				'knobs' => [
					'topLeft' => [
						'onPress' => resolve_label($pdo, $macros[$layer][$knobs['topLeft']] ?? '', $appName),
						'dialLeft' => resolve_label($pdo, $enc['topLeft']['left'][$layer] ?? '', $appName),
						'dialRight'=> resolve_label($pdo, $enc['topLeft']['right'][$layer] ?? '', $appName),
					],
					'topRight' => [
						'onPress' => resolve_label($pdo, $macros[$layer][$knobs['topRight']] ?? '', $appName),
						'dialLeft' => resolve_label($pdo, $enc['topRight']['left'][$layer] ?? '', $appName),
						'dialRight'=> resolve_label($pdo, $enc['topRight']['right'][$layer] ?? '', $appName),
					],
					'big' => [
						'onPress' => resolve_label($pdo, $macros[$layer][$knobs['big']] ?? '', $appName),
						'dialLeft' => resolve_label($pdo, $enc['big']['left'][$layer] ?? '', $appName),
						'dialRight'=> resolve_label($pdo, $enc['big']['right'][$layer] ?? '', $appName),
					],
				],
			];
		}

		return json($response, $frames);
	} catch (Throwable $e) {
		return error($response, 'Failed to build frames', 500, ['details'=>$e->getMessage()]);
	}
});

// API endpoints (minimal for this step)

// Run app
$app->run();

