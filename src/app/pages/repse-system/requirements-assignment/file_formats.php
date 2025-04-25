<?php
/**
 *  file_formats.php
 *
 *  Catálogo de formatos de archivo (PDF, XML, …).
 *  ─────────────────────────────────────────────────
 *  Métodos soportados
 *    GET      →  lista todos los formatos
 *    POST     →  crea un formato        { code, name, mime }
 *    PUT      →  actualiza un formato   { code, name?, mime? }
 *    DELETE   →  elimina un formato     ?code=pdf
 *
 *  La columna PRIMARY KEY de la tabla es `format_code`.
 */

header('Content-Type: application/json');
require_once 'cors.php';
require_once 'conexion.php';

$method = $_SERVER['REQUEST_METHOD'];

/*──────────────────────────────────────────────────────────────────────────*/
/*  GET  – Listado completo                                                */
/*──────────────────────────────────────────────────────────────────────────*/
if ($method === 'GET') {
    $sql = "SELECT
              format_code  AS code,
              descripcion  AS name,
              mime_default AS mime
            FROM file_formats
            ORDER BY name";
    $res = $mysqli->query($sql);

    echo json_encode($res->fetch_all(MYSQLI_ASSOC));
    exit;
}

/*──────────────────────────────────────────────────────────────────────────*/
/*  Lectura del cuerpo JSON para POST / PUT                                */
/*──────────────────────────────────────────────────────────────────────────*/
$body = json_decode(file_get_contents('php://input'), true) ?? [];
$code = $_GET['code'] ?? $body['code'] ?? null;  // sirve p/ PUT y DELETE
$name = $body['name'] ?? null;
$mime = $body['mime'] ?? null;

/* Utilidad */
function error400($msg)
{
    http_response_code(400);
    echo json_encode(['error' => $msg]);
    exit;
}

/*──────────────────────────────────────────────────────────────────────────*/
/*  POST  – Crear formato                                                  */
/*──────────────────────────────────────────────────────────────────────────*/
if ($method === 'POST') {
    if (!$code || !$name || !$mime) {
        error400('Se requieren code, name y mime');
    }

    $stmt = $mysqli->prepare("
        INSERT INTO file_formats (format_code, descripcion, mime_default)
        VALUES (?, ?, ?)
    ");
    $stmt->bind_param('sss', $code, $name, $mime);

    if ($stmt->execute()) {
        echo json_encode(['success' => true]);
    } else {
        http_response_code(409); // conflicto clave duplicada
        echo json_encode(['error' => $stmt->error]);
    }
    exit;
}

/*──────────────────────────────────────────────────────────────────────────*/
/*  PUT  – Actualizar formato                                              */
/*──────────────────────────────────────────────────────────────────────────*/
if ($method === 'PUT') {
    if (!$code)
        error400('Parámetro code obligatorio');

    $sets = [];
    $types = '';
    $vals = [];

    if ($name !== null) {
        $sets[] = 'descripcion = ?';
        $types .= 's';
        $vals[] = $name;
    }
    if ($mime !== null) {
        $sets[] = 'mime_default = ?';
        $types .= 's';
        $vals[] = $mime;
    }

    if (empty($sets))
        error400('Nada que actualizar');

    $sql = "UPDATE file_formats SET " . implode(', ', $sets) . " WHERE format_code = ?";
    $stmt = $mysqli->prepare($sql);
    $types .= 's';
    $vals[] = $code;
    $stmt->bind_param($types, ...$vals);

    $stmt->execute();
    echo json_encode(['success' => true, 'affected' => $stmt->affected_rows]);
    exit;
}

/*──────────────────────────────────────────────────────────────────────────*/
/*  DELETE – Eliminar formato                                              */
/*──────────────────────────────────────────────────────────────────────────*/
if ($method === 'DELETE') {
    if (!$code)
        error400('Parámetro code obligatorio para DELETE');

    $stmt = $mysqli->prepare("DELETE FROM file_formats WHERE format_code = ?");
    $stmt->bind_param('s', $code);
    $stmt->execute();

    echo json_encode(['success' => true, 'affected' => $stmt->affected_rows]);
    exit;
}

/*──────────────────────────────────────────────────────────────────────────*/
/*  Método no permitido                                                    */
/*──────────────────────────────────────────────────────────────────────────*/
http_response_code(405);
echo json_encode(['error' => 'Método HTTP no permitido']);
