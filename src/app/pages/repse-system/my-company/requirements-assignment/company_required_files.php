<?php
header('Content-Type: application/json');
require_once 'cors.php';
require_once 'conexion.php';

if (!function_exists('refValues')) {
    /**
     * Convierte un array en un array de referencias,
     * necesario para bind_param + call_user_func_array en PHP ≥ 5.3
     *
     * @param array $arr
     * @return array
     */
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
    /*──────────────────────────────────────────────────────────────────────*/
    /*  GET  /api/company_required_files.php?company_id=#                   */
    /*──────────────────────────────────────────────────────────────────────*/
    case 'GET':
        if (!isset($_GET['company_id'])) {
            respond(400, ['error' => 'company_id parameter is required']);
        }
        $companyId = (int) $_GET['company_id'];

        // 1) documentos activos
        $docsStmt = $mysqli->prepare("
            SELECT crf.required_file_id,
                   ft.name,
                   crf.is_periodic,
                   crf.periodicity_type,
                   crf.periodicity_count,
                    (SELECT COUNT(*)
              FROM required_file_visibilities v
             WHERE v.required_file_id = crf.required_file_id
               AND v.is_visible = 1
           ) AS partner_count
              FROM company_required_files crf
              JOIN file_types ft ON ft.file_type_id = crf.file_type_id
             WHERE crf.company_id = ?
               AND crf.is_active  = 1
        ") or respond(500, ['error' => $mysqli->error]);
        $docsStmt->bind_param('i', $companyId);
        $docsStmt->execute();
        $docs = $docsStmt->get_result()->fetch_all(MYSQLI_ASSOC);
        $docsStmt->close();

        if (!$docs) {
            respond(200, []);
        }

        // ids y placeholders
        $ids = array_column($docs, 'required_file_id');
        $placeholders = implode(',', array_fill(0, count($ids), '?'));

        // 2) formatos mínimos
        $sqlFmts = "
            SELECT required_file_id,
                   format_code AS code,
                   min_required
              FROM required_file_formats
             WHERE required_file_id IN ($placeholders)
        ";
        $fmtsStmt = $mysqli->prepare($sqlFmts)
            or respond(500, ['error' => $mysqli->error]);
        // bind dynamic
        $types = str_repeat('i', count($ids));
        $fmtsStmt->bind_param(...refValues(array_merge([$types], $ids)));
        $fmtsStmt->execute();
        $fmts = $fmtsStmt->get_result()->fetch_all(MYSQLI_ASSOC);
        $fmtsStmt->close();

        // 3) periodos + archivos subidos
        $sqlPers = "
            SELECT p.period_id,
                   p.required_file_id,
                   p.start_date,
                   p.end_date,
                   COUNT(cf.file_id) AS uploaded_count
              FROM document_periods p
              LEFT JOIN company_files cf
                     ON cf.period_id = p.period_id AND cf.status = 'approved'
             WHERE p.required_file_id IN ($placeholders)
             GROUP BY p.period_id
             ORDER BY p.start_date
        ";
        $persStmt = $mysqli->prepare($sqlPers)
            or respond(500, ['error' => $mysqli->error]);
        $persStmt->bind_param(...refValues(array_merge([$types], $ids)));
        $persStmt->execute();
        $pers = $persStmt->get_result()->fetch_all(MYSQLI_ASSOC);
        $persStmt->close();

        // 4) conteos por formato
        $sqlFmtCounts = "
            SELECT dp.required_file_id, cf.file_ext AS format_code, COUNT(*) AS uploaded_count
            FROM company_files cf
            JOIN document_periods dp ON dp.period_id = cf.period_id
            WHERE dp.required_file_id IN ($placeholders)
            AND cf.status = 'approved'
            GROUP BY dp.required_file_id, cf.file_ext
        ";

        $fmtCountsStmt = $mysqli->prepare($sqlFmtCounts)
            or respond(500, ['error' => $mysqli->error]);
        $fmtCountsStmt->bind_param(...refValues(array_merge([$types], $ids)));
        $fmtCountsStmt->execute();
        $fmtCounts = $fmtCountsStmt->get_result()->fetch_all(MYSQLI_ASSOC);
        $fmtCountsStmt->close();


        // 5) armar estructura
        $today = new DateTimeImmutable('today');
        $out = [];

        foreach ($docs as $d) {
            $out[$d['required_file_id']] = $d + [
                'formats' => [],
                'periods' => [],
                'min_documents_needed' => 0,
                'deadline' => null,
                'current_period' => null,
                'status' => 'pending',
            ];
        }

        // 5a) formatos y sumatoria
        foreach ($fmts as $f) {
            $doc = &$out[$f['required_file_id']];
            $doc['formats'][] = [
                'code' => $f['code'],
                'min_required' => (int) $f['min_required'],
                'uploaded_count' => 0,  // ← nuevo campo
            ];
            $doc['min_documents_needed'] += (int) $f['min_required'];
        }

        // 5b) aplicar conteos por formato
        foreach ($fmtCounts as $fc) {
            $doc = &$out[$fc['required_file_id']];
            foreach ($doc['formats'] as &$fmt) {
                if ($fmt['code'] === $fc['format_code']) {
                    $fmt['uploaded_count'] = (int) $fc['uploaded_count'];
                    break;
                }
            }
        }

        // 5c periodos, deadline y periodo actual
        foreach ($pers as $p) {
            $doc = &$out[$p['required_file_id']];
            $period = [
                'period_id' => (int) $p['period_id'],
                'start_date' => $p['start_date'],
                'end_date' => $p['end_date'],
                'uploaded_count' => (int) $p['uploaded_count'],
            ];
            $doc['periods'][] = $period;

            $start = new DateTimeImmutable($p['start_date']);
            $end = new DateTimeImmutable($p['end_date']);

            if ($today >= $start && $today <= $end) {
                $doc['current_period'] = $period;
                $doc['deadline'] = $p['end_date'];
            }
        }

        // 5d calcular estado general
        foreach ($out as &$doc) {
            $minPer = max($doc['min_documents_needed'], 1);
            $done = array_reduce(
                $doc['periods'],
                fn($s, $p) => $s + $p['uploaded_count'],
                0
            );
            $needed = $minPer * max(count($doc['periods']), 1);

            if ($done >= $needed) {
                $doc['status'] = 'complete';
            } elseif (
                $doc['deadline'] &&
                $today > new DateTimeImmutable($doc['deadline'])
            ) {
                $doc['status'] = 'overdue';
            } elseif ($done > 0) {
                $doc['status'] = 'partial';
            } else {
                $doc['status'] = 'pending';
            }
        }

        respond(200, array_values($out));
    /*──────────────────────────────────────────────────────────────────────*/
    /*  POST  /api/company_required_files.php                               */
    /*──────────────────────────────────────────────────────────────────────*/
    case 'POST':
        $data = json_decode(file_get_contents('php://input'), true) ?? [];

        /* ── Validaciones básicas ─────────────────────────────────────── */
        $required = [
            'company_id',
            'assigned_by',
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
            if (!isset($ff['format_code'], $ff['min_quantity'], $ff['expiry_visible'])) {
                respond(400, ['error' => "file_formats[$idx] needs format_code, min_quantity, expiry_visible"]);
            }
            if ($ff['min_quantity'] < 1) {
                respond(400, ['error' => "file_formats[$idx].min_quantity must be ≥ 1"]);
            }
            if (!$ff['expiry_visible']) {
                if (!isset($ff['expiry_value'], $ff['expiry_unit'])) {
                    respond(400, ['error' => "file_formats[$idx] missing expiry_value and expiry_unit when expiry_visible is false"]);
                }
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
                    (company_id, assigned_by, file_type_id, is_periodic,
                    periodicity_type, periodicity_count,
                    min_documents_needed, start_date, end_date, is_active)
                VALUES (?,?,?,?,?,?,?,?,?, 1)
            ");
            $ins->bind_param(
                'iiiisiiss',  // Nota el tipo adicional 'i' para assigned_by
                $company_id,
                $assigned_by,
                $file_type_id,
                $isPeriodicInt,
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
                    (required_file_id, format_code, min_required, manual_expiry_visible, manual_expiry_value, manual_expiry_unit)
                VALUES (?,?,?,?,?,?)
            ");
            foreach ($fileFormats as $ff) {
                $fmt = strtolower($ff['format_code']);
                $min = (int) $ff['min_quantity'];
                $expiryVisible = $ff['expiry_visible'] ? 1 : 0;
                $expiryValue = $ff['expiry_value'] ?? null;
                $expiryUnit = $ff['expiry_unit'] ?? null;

                $rf->bind_param('isiiis', $required_file_id, $fmt, $min, $expiryVisible, $expiryValue, $expiryUnit);
                $rf->execute();
            }
            $rf->close();

            /* 4) Crear primer periodo (si aplica) ----------------------*/
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
            } else {
                $inicio = new DateTime($start_date);
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

    /*──────────────────────────────────────────────────────────────────────*/
    default:
        respond(405, ['error' => 'Method not allowed']);
}

$mysqli->close();
?>