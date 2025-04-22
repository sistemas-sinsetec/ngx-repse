<?php
header('Content-Type: application/json');
require_once 'cors.php';
require_once 'conexion.php';

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        // Debe venir company_id para devolver dropdown + configs
        if (!isset($_GET['company_id'])) {
            http_response_code(400);
            echo json_encode(['error' => 'company_id parameter is required']);
            exit;
        }
        $company_id = intval($_GET['company_id']);

        // 1) Tipos de documento activos
        $typesStmt = $mysqli->prepare("
      SELECT file_type_id AS id, name, description, is_active
      FROM file_types
      WHERE is_active = 1
    ");
        $typesStmt->execute();
        $types = $typesStmt->get_result()->fetch_all(MYSQLI_ASSOC);
        $typesStmt->close();

        // 2) Configuraciones existentes
        $confStmt = $mysqli->prepare("
      SELECT 
        crf.required_file_id   AS id,
        crf.file_type_id       AS file_type_id,
        ft.name                AS file_type_name,
        crf.is_periodic,
        crf.periodicity_type,
        crf.periodicity_count,
        crf.min_documents_needed,
        crf.start_date,
        crf.end_date,
        crf.is_active
      FROM company_required_files crf
      JOIN file_types ft ON ft.file_type_id = crf.file_type_id
      WHERE crf.company_id = ?
        AND crf.is_active = 1
      ORDER BY crf.start_date DESC
    ");
        $confStmt->bind_param('i', $company_id);
        $confStmt->execute();
        $configs = $confStmt->get_result()->fetch_all(MYSQLI_ASSOC);
        $confStmt->close();

        echo json_encode([
            'file_types' => $types,
            'configs' => $configs,
        ]);
        break;

    case 'POST':
        // Inserta nueva configuración
        $data = json_decode(file_get_contents('php://input'), true);
        $required = ['company_id', 'file_type_id', 'is_periodic', 'periodicity_type', 'periodicity_count', 'min_documents_needed', 'start_date'];
        foreach ($required as $f) {
            if (!isset($data[$f])) {
                http_response_code(400);
                echo json_encode(['error' => "Field {$f} is required"]);
                exit;
            }
        }

        $company_id = intval($data['company_id']);
        $file_type_id = intval($data['file_type_id']);
        $is_periodic = $data['is_periodic'] ? 1 : 0;
        $periodicity_type = $mysqli->real_escape_string($data['periodicity_type']);
        $periodicity_count = intval($data['periodicity_count']);
        $min_documents_needed = intval($data['min_documents_needed']);
        $start_date = $mysqli->real_escape_string($data['start_date']);
        // end_date puede venir vacío si no es periódico
        $end_date = isset($data['end_date']) && $data['end_date'] !== ''
            ? "'" . $mysqli->real_escape_string($data['end_date']) . "'"
            : "NULL";

        $sql = "
      INSERT INTO company_required_files
        (company_id, file_type_id, is_periodic, periodicity_type, periodicity_count, min_documents_needed, start_date, end_date)
      VALUES
        (?, ?, ?, ?, ?, ?, ?, {$end_date})
    ";
        $stmt = $mysqli->prepare($sql);
        $stmt->bind_param(
            'iiisiis',
            $company_id,
            $file_type_id,
            $is_periodic,
            $periodicity_type,
            $periodicity_count,
            $min_documents_needed,
            $start_date
        );

        if ($stmt->execute()) {
            echo json_encode([
                'success' => true,
                'required_file_id' => $stmt->insert_id
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
