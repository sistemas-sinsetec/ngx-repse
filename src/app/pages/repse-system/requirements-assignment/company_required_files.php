<?php
header('Content-Type: application/json');
require_once 'cors.php';
require_once 'conexion.php';

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        // Validar company_id
        if (!isset($_GET['company_id'])) {
            http_response_code(400);
            echo json_encode(['error' => 'company_id parameter is required']);
            exit;
        }
        $company_id = intval($_GET['company_id']);

        // 1) Tipos de documento activos
        $typesStmt = $mysqli->prepare("
            SELECT 
                file_type_id AS id,
                name,
                description,
                is_active
            FROM file_types
            WHERE is_active = 1
        ");
        $typesStmt->execute();
        $types = $typesStmt->get_result()->fetch_all(MYSQLI_ASSOC);
        $typesStmt->close();

        // 2) Configuraciones existentes + cuenta de socios visibles
        $confStmt = $mysqli->prepare("
            SELECT 
                crf.required_file_id      AS id,
                crf.file_type_id          AS file_type_id,
                ft.name                   AS file_type_name,
                crf.is_periodic,
                crf.periodicity_type,
                crf.periodicity_count,
                crf.min_documents_needed,
                crf.start_date,
                crf.end_date,
                crf.is_active,
                (
                  SELECT COUNT(*)
                    FROM required_file_visibilities v
                   WHERE v.required_file_id = crf.required_file_id
                     AND v.is_visible       = 1
                )                         AS partner_count
            FROM company_required_files crf
            JOIN file_types ft 
              ON ft.file_type_id = crf.file_type_id
           WHERE crf.company_id = ?
             AND crf.is_active  = 1
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
        $data = json_decode(file_get_contents('php://input'), true);

        // Campos obligatorios
        $always = ['company_id', 'file_type_id', 'is_periodic', 'min_documents_needed', 'start_date'];
        foreach ($always as $f) {
            if (!isset($data[$f])) {
                http_response_code(400);
                echo json_encode(['error' => "Field {$f} is required"]);
                exit;
            }
        }

        // Validar periodicidad
        $isPeriodic = (bool) $data['is_periodic'];
        if ($isPeriodic) {
            foreach (['periodicity_type', 'periodicity_count'] as $f) {
                if (!isset($data[$f])) {
                    http_response_code(400);
                    echo json_encode(['error' => "Field {$f} is required when is_periodic is true"]);
                    exit;
                }
            }
        }

        // Valores para insertar
        $company_id = intval($data['company_id']);
        $file_type_id = intval($data['file_type_id']);
        $is_periodic = $isPeriodic ? 1 : 0;
        $periodicity_type = $isPeriodic
            ? $mysqli->real_escape_string($data['periodicity_type'])
            : null;
        $periodicity_count = $isPeriodic
            ? intval($data['periodicity_count'])
            : null;
        $min_docs = intval($data['min_documents_needed']);
        $start_date = $mysqli->real_escape_string($data['start_date']);
        $end_date_clause = (isset($data['end_date']) && $data['end_date'] !== '')
            ? "'" . $mysqli->real_escape_string($data['end_date']) . "'"
            : "NULL";

        // Insert en company_required_files
        $sql = "
        INSERT INTO company_required_files
          (company_id, file_type_id, is_periodic,
           periodicity_type, periodicity_count,
           min_documents_needed, start_date, end_date)
        VALUES
          (?, ?, ?, ?, ?, ?, ?, {$end_date_clause})
    ";
        $stmt = $mysqli->prepare($sql);
        $stmt->bind_param(
            'iiisiis',
            $company_id,
            $file_type_id,
            $is_periodic,
            $periodicity_type,
            $periodicity_count,
            $min_docs,
            $start_date
        );

        if ($stmt->execute()) {
            $required_file_id = $stmt->insert_id;

            // Calcular fecha fin del periodo según periodicidad
            if ($isPeriodic) {
                try {
                    $fechaInicio = new DateTime($start_date);
                    switch (strtolower($periodicity_type)) {
                        case 'semanas':
                            $interval = "P" . ($periodicity_count * 7) . "D";
                            break;
                        case 'meses':
                            $interval = "P{$periodicity_count}M";
                            break;
                        case 'años':
                            $interval = "P{$periodicity_count}Y";
                            break;
                        default:
                            throw new Exception("Periodicidad no válida");
                    }

                    $fechaFin = clone $fechaInicio;
                    $fechaFin->add(new DateInterval($interval));

                    // Insertar en document_periods
                    $insertPeriod = $mysqli->prepare("
                INSERT INTO document_periods
                    (required_file_id, start_date, end_date, created_at)
                VALUES (?, ?, ?, NOW())
            ");
                    $start_date_formatted = $fechaInicio->format('Y-m-d');
                    $end_date_formatted = $fechaFin->format('Y-m-d');

                    $insertPeriod->bind_param(
                        'iss',
                        $required_file_id,
                        $start_date_formatted,
                        $end_date_formatted
                    );

                    if (!$insertPeriod->execute()) {
                        throw new Exception($insertPeriod->error);
                    }

                    $insertPeriod->close();
                } catch (Exception $e) {
                    http_response_code(500);
                    echo json_encode(['error' => 'Error al crear periodo: ' . $e->getMessage()]);
                    exit;
                }
            }

            echo json_encode([
                'success' => true,
                'required_file_id' => $required_file_id,
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
