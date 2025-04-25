<?php
header('Content-Type: application/json');
require_once 'cors.php';
require_once 'conexion.php';

function respond(int $code, array $payload): never
{
    http_response_code($code);
    echo json_encode($payload);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    /*──────────────────────────────────────────────────────────────────────*/
    /*  GET  /api/company_required_files.php?company_id=#                   */
    /*──────────────────────────────────────────────────────────────────────*/
    case 'GET':
        if (!isset($_GET['company_id'])) {
            respond(400, ['error' => 'company_id parameter is required']);
        }
        $company_id = (int) $_GET['company_id'];

        /* Tipos de documento activos ------------------------------------ */
        $typesStmt = $mysqli->prepare("
        SELECT file_type_id AS id, name, description, is_active
          FROM file_types
         WHERE is_active = 1
    ") or respond(500, ['error' => $mysqli->error]);
        $typesStmt->execute();
        $types = $typesStmt->get_result()->fetch_all(MYSQLI_ASSOC);
        $typesStmt->close();

        /* Configuraciones activas --------------------------------------- */
        $confStmt = $mysqli->prepare("
        SELECT crf.required_file_id   AS id,
               crf.file_type_id,
               ft.name                AS file_type_name,
               crf.is_periodic,
               crf.periodicity_type,
               crf.periodicity_count,
               crf.min_documents_needed,
               crf.start_date,
               crf.end_date,
               crf.is_active,
               ( SELECT COUNT(*)
                     FROM required_file_visibilities v
                    WHERE v.required_file_id = crf.required_file_id
                      AND v.is_visible = 1
               ) AS partner_count
          FROM company_required_files crf
          JOIN file_types ft ON ft.file_type_id = crf.file_type_id
         WHERE crf.company_id = ?
           AND crf.is_active  = 1
         ORDER BY crf.start_date DESC
    ") or respond(500, ['error' => $mysqli->error]);
        $confStmt->bind_param('i', $company_id);
        $confStmt->execute();
        $configs = $confStmt->get_result()->fetch_all(MYSQLI_ASSOC);
        $confStmt->close();

        respond(200, ['file_types' => $types, 'configs' => $configs]);

    /*──────────────────────────────────────────────────────────────────────*/
    /*  POST  /api/company_required_files.php                               */
    /*──────────────────────────────────────────────────────────────────────*/
    case 'POST':
        $data = json_decode(file_get_contents('php://input'), true) ?? [];

        /* ── Validaciones básicas ─────────────────────────────────────── */
        $required = [
            'company_id',
            'file_type_id',
            'is_periodic',
            'file_formats',
            'start_date'
        ];
        foreach ($required as $f) {
            if (!isset($data[$f]))
                respond(400, ['error' => "Field {$f} is required"]);
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
        $file_type_id = (int) $data['file_type_id'];
        $start_date = $data['start_date'];                       // YYYY-MM-DD
        $end_date = $data['end_date'] ?? null;
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
               SET is_active = 0,
                   end_date  = IF(end_date IS NULL OR end_date > ?,
                                   DATE_SUB(?, INTERVAL 1 DAY),
                                   end_date)
             WHERE company_id   = ?
               AND file_type_id = ?
               AND is_active    = 1
        ");
            $off->bind_param(
                'ssii',
                $start_date,
                $start_date,
                $company_id,
                $file_type_id
            );
            $off->execute();
            $off->close();

            /* 2) Insertar cabecera ------------------------------------- */
            $ins = $mysqli->prepare("
            INSERT INTO company_required_files
                  (company_id, file_type_id, is_periodic,
                   periodicity_type, periodicity_count,
                   min_documents_needed, start_date, end_date, is_active)
            VALUES (?,?,?,?,?,?,?, ?, 1)
        ");
            $ins->bind_param(
                'iiisiiss',
                $company_id,
                $file_type_id,
                $isPeriodicInt,        // ✅ variable, no expresión
                $periodicity_type,
                $periodicity_count,
                $min_docs,
                $start_date,
                $end_date
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

            /* 4) Crear primer periodo (si aplica) ---------------------- */
            if ($isPeriodic) {
                $inicio = new DateTime($start_date);
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
            }

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

    /*──────────────────────────────────────────────────────────────────────*/
    default:
        respond(405, ['error' => 'Method not allowed']);
}

$mysqli->close();
?>