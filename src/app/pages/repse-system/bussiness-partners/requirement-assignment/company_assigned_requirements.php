<?php
header('Content-Type: application/json');
require_once 'cors.php';
require_once 'conexion.php';

if (!function_exists('refValues')) {
    function refValues(array &$arr): array
    {
        $refs = [];
        foreach ($arr as $key => &$value) {
            $refs[$key] = &$value;
        }
        return $refs;
    }
}

function respond(int $code, array $payload): never
{
    http_response_code($code);
    echo json_encode($payload);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        if (!isset($_GET['assigned_by'])) {
            respond(400, ['error' => 'assigned_by parameter is required']);
        }
        $assignedBy = (int) $_GET['assigned_by'];

        // Consulta para obtener requerimientos asignados a otros
        $stmt = $mysqli->prepare("
            SELECT 
                crf.required_file_id,
                crf.company_id,
                c.nameCompany AS company_name,
                ft.name AS document_name,
                crf.is_periodic,
                crf.periodicity_type,
                crf.periodicity_count,
                crf.min_documents_needed,
                crf.start_date,
                crf.end_date,
                (SELECT COUNT(*) FROM required_file_visibilities v 
                 WHERE v.required_file_id = crf.required_file_id
                 AND v.is_visible = 1) AS partner_count
            FROM company_required_files crf
            JOIN file_types ft ON ft.file_type_id = crf.file_type_id
            JOIN companies c ON c.id = crf.company_id
            WHERE crf.assigned_by = ?
              AND crf.company_id != ?
              AND crf.is_active = 1
        ") or respond(500, ['error' => $mysqli->error]);

        $stmt->bind_param('ii', $assignedBy, $assignedBy);
        $stmt->execute();
        $requirements = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        $stmt->close();

        if (empty($requirements)) {
            respond(200, []);
        }

        // Obtener IDs para consultas adicionales
        $ids = array_column($requirements, 'required_file_id');
        $placeholders = implode(',', array_fill(0, count($ids), '?'));

        // Obtener formatos de archivo
        $fmtsStmt = $mysqli->prepare("
            SELECT required_file_id, format_code, min_required
            FROM required_file_formats
            WHERE required_file_id IN ($placeholders)
        ") or respond(500, ['error' => $mysqli->error]);

        $types = str_repeat('i', count($ids));
        $fmtsStmt->bind_param(...refValues(array_merge([$types], $ids)));
        $fmtsStmt->execute();
        $formats = $fmtsStmt->get_result()->fetch_all(MYSQLI_ASSOC);
        $fmtsStmt->close();

        // Obtener periodos
        $persStmt = $mysqli->prepare("
            SELECT p.period_id, p.required_file_id, p.start_date, p.end_date,
                   COUNT(cf.file_id) AS uploaded_count
            FROM document_periods p
            LEFT JOIN company_files cf ON cf.period_id = p.period_id
            WHERE p.required_file_id IN ($placeholders)
            GROUP BY p.period_id
            ORDER BY p.start_date
        ") or respond(500, ['error' => $mysqli->error]);

        $persStmt->bind_param(...refValues(array_merge([$types], $ids)));
        $persStmt->execute();
        $periods = $persStmt->get_result()->fetch_all(MYSQLI_ASSOC);
        $persStmt->close();

        // Estructurar los datos de respuesta
        $today = new DateTimeImmutable('today');
        $result = [];

        foreach ($requirements as $req) {
            $reqId = $req['required_file_id'];
            $result[$reqId] = $req;
            $result[$reqId]['formats'] = [];
            $result[$reqId]['periods'] = [];
            $result[$reqId]['current_period'] = null;
            $result[$reqId]['deadline'] = null;
            $result[$reqId]['status'] = 'pending';
        }

        // Agregar formatos
        foreach ($formats as $fmt) {
            $result[$fmt['required_file_id']]['formats'][] = [
                'code' => $fmt['format_code'],
                'min_required' => (int) $fmt['min_required']
            ];
        }

        // Agregar periodos y calcular estado
        foreach ($periods as $period) {
            $reqId = $period['required_file_id'];
            $periodData = [
                'period_id' => (int) $period['period_id'],
                'start_date' => $period['start_date'],
                'end_date' => $period['end_date'],
                'uploaded_count' => (int) $period['uploaded_count']
            ];

            $result[$reqId]['periods'][] = $periodData;

            $start = new DateTimeImmutable($period['start_date']);
            $end = new DateTimeImmutable($period['end_date']);

            if ($today >= $start && $today <= $end) {
                $result[$reqId]['current_period'] = $periodData;
                $result[$reqId]['deadline'] = $period['end_date'];
            }
        }

        // Calcular estado para cada requerimiento
        foreach ($result as &$req) {
            $minPer = max($req['min_documents_needed'], 1);
            $done = array_reduce(
                $req['periods'],
                fn($s, $p) => $s + $p['uploaded_count'],
                0
            );
            $needed = $minPer * max(count($req['periods']), 1);

            if ($done >= $needed) {
                $req['status'] = 'complete';
            } elseif ($req['deadline'] && $today > new DateTimeImmutable($req['deadline'])) {
                $req['status'] = 'overdue';
            } elseif ($done > 0) {
                $req['status'] = 'partial';
            }
        }

        respond(200, array_values($result));
        break;
    case 'POST':
        $data = json_decode(file_get_contents('php://input'), true) ?? [];

        /* ── Validaciones básicas ─────────────────────────────────────── */
        $required = [
            'company_id',
            'assigned_by',
            'file_type_id',
            'is_periodic',
            'file_formats',
            'start_date'  // Siempre requerido, incluso si no es periódico
        ];
        foreach ($required as $f) {
            if (!isset($data[$f])) {
                respond(400, ['error' => "Field {$f} is required"]);
            }
        }

        /* Validar file_formats ----------------------------------------- */
        $fileFormats = $data['file_formats'];
        if (!is_array($fileFormats) || !$fileFormats) {
            respond(400, ['error' => 'file_formats must be a non-empty array']);
        }
        foreach ($fileFormats as $idx => $ff) {
            if (!isset($ff['format_code'], $ff['min_quantity'])) {
                respond(400, [
                    'error' =>
                        "file_formats[$idx] needs format_code and min_quantity"
                ]);
            }
            if ($ff['min_quantity'] < 1) {
                respond(400, [
                    'error' =>
                        "file_formats[$idx].min_quantity must be ≥ 1"
                ]);
            }
        }

        $isPeriodic = (bool) $data['is_periodic'];
        if (
            $isPeriodic &&
            (!isset($data['periodicity_type'], $data['periodicity_count']))
        ) {
            respond(400, [
                'error' =>
                    'periodicity_type and periodicity_count are required when is_periodic is true'
            ]);
        }

        /* ── Conversión de valores ────────────────────────────────────── */
        $company_id = (int) $data['company_id'];
        $assigned_by = (int) $data['assigned_by'];
        $file_type_id = (int) $data['file_type_id'];
        $start_date = $data['start_date'];  // YYYY-MM-DD
        $periodicity_type = $isPeriodic ? $data['periodicity_type'] : null;
        $periodicity_count = $isPeriodic ? (int) $data['periodicity_count'] : null;
        $isPeriodicInt = (int) $isPeriodic;

        /* Suma total de mínimos por formato ---------------------------- */
        $min_docs = array_sum(array_column($fileFormats, 'min_quantity'));

        /* ── Transacción ──────────────────────────────────────────────── */
        $mysqli->begin_transaction();
        try {
            /* 1) Desactivar versión anterior --------------------------- */
            $off = $mysqli->prepare("
            UPDATE company_required_files
               SET is_active = 0
             WHERE company_id   = ?
               AND file_type_id = ?
               AND is_active    = 1
        ");
            $off->bind_param('ii', $company_id, $file_type_id);
            $off->execute();
            $off->close();

            /* 2) Insertar cabecera ------------------------------------- */
            $ins = $mysqli->prepare("
            INSERT INTO company_required_files
                (company_id, assigned_by, file_type_id, is_periodic,
                periodicity_type, periodicity_count,
                min_documents_needed, start_date, is_active)
            VALUES (?,?,?,?,?,?,?,?,1)
        ");
            $ins->bind_param(
                'iiissiis',
                $company_id,
                $assigned_by,
                $file_type_id,
                $isPeriodicInt,
                $periodicity_type,
                $periodicity_count,
                $min_docs,
                $start_date
            );
            $ins->execute();
            $required_file_id = $ins->insert_id;
            $ins->close();

            /* 3) Detalle de formatos ----------------------------------- */
            $rf = $mysqli->prepare("
            INSERT INTO required_file_formats
                  (required_file_id, format_code, min_required)
            VALUES (?,?,?)
        ");
            foreach ($fileFormats as $ff) {
                $fmt = strtolower($ff['format_code']);
                $min = (int) $ff['min_quantity'];
                $rf->bind_param('isi', $required_file_id, $fmt, $min);
                $rf->execute();
            }
            $rf->close();

            /* 4) Crear primer periodo (para no periódicos también) */
            $inicio = new DateTime($start_date);
            if ($isPeriodic) {
                $cnt = $periodicity_count;
                switch (strtolower($periodicity_type)) {
                    case 'días':
                        $interval = "P{$cnt}D";
                        break;
                    case 'semanas':
                        $interval = "P{$cnt}W";
                        break;
                    case 'meses':
                        $interval = "P{$cnt}M";
                        break;
                    case 'años':
                        $interval = "P{$cnt}Y";
                        break;
                    default:
                        throw new Exception('Periodicidad no válida');
                }
                $fin = (clone $inicio)->add(new DateInterval($interval));
            } else {
                $fin = new DateTime('9999-12-31');
            }

            $p = $mysqli->prepare("
                INSERT INTO document_periods
                    (required_file_id, start_date, end_date, created_at)
                VALUES (?,?,?,NOW())
            ");
            $p->bind_param(
                'iss',
                $required_file_id,
                $inicio->format('Y-m-d'),
                $fin->format('Y-m-d')
            );
            $p->execute();
            $p->close();


            /* 5) Commit ------------------------------------------------ */
            $mysqli->commit();
            respond(201, [
                'success' => true,
                'required_file_id' => $required_file_id,
                'min_documents' => $min_docs
            ]);

        } catch (Throwable $e) {
            $mysqli->rollback();
            respond(500, ['error' => $e->getMessage()]);
        }

        break;
    default:
        respond(405, ['error' => 'Method not allowed']);

}

$mysqli->close();
?>