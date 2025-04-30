<?php
header('Content-Type: application/json');
require_once 'cors.php';
require_once 'conexion.php';

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        if (!isset($_GET['required_file_id'])) {
            http_response_code(400);
            echo json_encode(['error' => 'required_file_id parameter is required']);
            exit;
        }
        $reqId = intval($_GET['required_file_id']);
        $stmt = $mysqli->prepare("
            SELECT visibility_id, provider_id, is_visible
              FROM required_file_visibilities
             WHERE required_file_id = ?
        ");
        $stmt->bind_param('i', $reqId);
        $stmt->execute();
        $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        $stmt->close();
        echo json_encode($rows);
        break;

    case 'POST':
        $data = json_decode(file_get_contents('php://input'), true);
        if (empty($data['required_file_id']) || empty($data['provider_id'])) {
            http_response_code(400);
            echo json_encode(['error' => 'required_file_id and provider_id are required']);
            exit;
        }
        $reqId = intval($data['required_file_id']);
        $provId = intval($data['provider_id']);
        $isVisible = isset($data['is_visible']) && $data['is_visible'] ? 1 : 1;

        // Inserta o actualiza is_visible
        $stmt = $mysqli->prepare("
            INSERT INTO required_file_visibilities
              (required_file_id, provider_id, is_visible)
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE is_visible = VALUES(is_visible)
        ");
        $stmt->bind_param('iii', $reqId, $provId, $isVisible);
        if ($stmt->execute()) {
            echo json_encode([
                'success' => true,
                'visibility_id' => $stmt->insert_id ?: null,
            ]);
        } else {
            http_response_code(500);
            echo json_encode(['error' => $stmt->error]);
        }
        $stmt->close();
        break;

    case 'DELETE':
        // Borrado lógico: marcar is_visible = 0
        if (!isset($_GET['required_file_id'], $_GET['provider_id'])) {
            http_response_code(400);
            echo json_encode(['error' => 'required_file_id and provider_id parameters are required']);
            exit;
        }
        $reqId = intval($_GET['required_file_id']);
        $provId = intval($_GET['provider_id']);

        $stmt = $mysqli->prepare("
            UPDATE required_file_visibilities
               SET is_visible = 0
             WHERE required_file_id = ?
               AND provider_id      = ?
        ");
        $stmt->bind_param('ii', $reqId, $provId);
        if ($stmt->execute()) {
            echo json_encode([
                'success' => true,
                'affected_rows' => $stmt->affected_rows,
            ]);
        } else {
            http_response_code(500);
            echo json_encode(['error' => $stmt->error]);
        }
        $stmt->close();
        break;

    default:
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
}

$mysqli->close();
