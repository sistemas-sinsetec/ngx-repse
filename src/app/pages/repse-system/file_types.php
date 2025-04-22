<?php
header('Content-Type: application/json');
require_once 'cors.php';
require_once 'conexion.php';

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        // GET all or single
        if (isset($_GET['id']) && is_numeric($_GET['id'])) {
            $id = intval($_GET['id']);
            $stmt = $mysqli->prepare("SELECT file_type_id, name, description, is_active FROM file_types WHERE file_type_id = ?");
            $stmt->bind_param("i", $id);
            $stmt->execute();
            $res = $stmt->get_result();
            if ($res->num_rows) {
                echo json_encode($res->fetch_assoc());
            } else {
                http_response_code(404);
                echo json_encode(['error' => 'Not found']);
            }
            $stmt->close();
        } else {
            $result = $mysqli->query("SELECT file_type_id, name, description, is_active FROM file_types");
            $all = $result->fetch_all(MYSQLI_ASSOC);
            echo json_encode($all);
        }
        break;

    case 'POST':
        // Create
        $data = json_decode(file_get_contents('php://input'), true);
        if (empty($data['name'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Field name is required']);
            exit;
        }
        $name = $data['name'];
        $description = isset($data['description']) ? $data['description'] : null;
        $is_active = isset($data['is_active']) ? (int) $data['is_active'] : 1;

        $stmt = $mysqli->prepare(
            "INSERT INTO file_types (name, description, is_active) VALUES (?, ?, ?)"
        );
        $stmt->bind_param("ssi", $name, $description, $is_active);
        if ($stmt->execute()) {
            echo json_encode([
                'success' => true,
                'file_type_id' => $stmt->insert_id
            ]);
        } else {
            http_response_code(500);
            echo json_encode(['error' => $stmt->error]);
        }
        $stmt->close();
        break;

    case 'PUT':
        // Update
        $data = json_decode(file_get_contents('php://input'), true);
        if (empty($data['file_type_id']) || !is_numeric($data['file_type_id'])) {
            http_response_code(400);
            echo json_encode(['error' => 'file_type_id is required']);
            exit;
        }
        $id = intval($data['file_type_id']);
        $name = isset($data['name']) ? $data['name'] : null;
        $description = array_key_exists('description', $data) ? $data['description'] : null;
        $is_active = isset($data['is_active']) ? (int) $data['is_active'] : null;

        // Build dynamic SET clause
        $fields = [];
        $types = '';
        $vals = [];
        if ($name !== null) {
            $fields[] = 'name = ?';
            $types .= 's';
            $vals[] = $name;
        }
        if ($description !== null) {
            $fields[] = 'description = ?';
            $types .= 's';
            $vals[] = $description;
        }
        if ($is_active !== null) {
            $fields[] = 'is_active = ?';
            $types .= 'i';
            $vals[] = $is_active;
        }
        if (empty($fields)) {
            http_response_code(400);
            echo json_encode(['error' => 'Nothing to update']);
            exit;
        }
        $sql = "UPDATE file_types SET " . implode(', ', $fields) . " WHERE file_type_id = ?";
        $types .= 'i';
        $vals[] = $id;

        $stmt = $mysqli->prepare($sql);
        // bind params dynamically
        $stmt->bind_param($types, ...$vals);
        if ($stmt->execute()) {
            echo json_encode(['success' => true, 'affected_rows' => $stmt->affected_rows]);
        } else {
            http_response_code(500);
            echo json_encode(['error' => $stmt->error]);
        }
        $stmt->close();
        break;

    case 'DELETE':
        // Delete
        if (isset($_GET['id']) && is_numeric($_GET['id'])) {
            $id = intval($_GET['id']);
            $stmt = $mysqli->prepare("DELETE FROM file_types WHERE file_type_id = ?");
            $stmt->bind_param("i", $id);
            if ($stmt->execute()) {
                echo json_encode(['success' => true, 'affected_rows' => $stmt->affected_rows]);
            } else {
                http_response_code(500);
                echo json_encode(['error' => $stmt->error]);
            }
            $stmt->close();
        } else {
            http_response_code(400);
            echo json_encode(['error' => 'id parameter is required']);
        }
        break;

    default:
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
}

$mysqli->close();
