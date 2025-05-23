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
        $where = "";
        $bindValue = null;

        if (isset($_GET['assigned_by'])) {
            $bindValue = (int) $_GET['assigned_by'];
            $where = "crf.assigned_by = ? AND crf.company_id != crf.assigned_by";
        } elseif (isset($_GET['company_id'])) {
            $bindValue = (int) $_GET['company_id'];
            $where = "crf.company_id = ?";
        } else {
            respond(400, ['error' => 'company_id or assigned_by parameter is required']);
        }

        $docsStmt = $mysqli->prepare("
        SELECT crf.required_file_id,
                crf.assigned_by,
                crf.company_id,
                companies.nameCompany AS company_name,
                ft.name,
                crf.is_periodic,
                crf.periodicity_type,
                crf.periodicity_count,
                crf.start_date,
                crf.end_date,
                (SELECT COUNT(*)
                    FROM required_file_visibilities v
                    WHERE v.required_file_id = crf.required_file_id
                    AND v.is_visible = 1
                ) AS partner_count
            FROM company_required_files crf
            JOIN file_types ft ON ft.file_type_id = crf.file_type_id
            LEFT JOIN companies ON companies.id = crf.company_id
            WHERE $where
            AND crf.is_active = 1
        ") or respond(500, ['error' => $mysqli->error]);

        $docsStmt->bind_param('i', $bindValue);
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
                min_required,
                manual_expiry_value,
                manual_expiry_unit
            FROM required_file_formats
            WHERE required_file_id IN ($placeholders)
        ";
        $fmtsStmt = $mysqli->prepare($sqlFmts)
            or respond(500, ['error' => $mysqli->error]);
        // bind dynamic
        $types = str_repeat('i', count($ids));
        $bindArgs1 = array_merge([$types], $ids);
        $fmtsStmt->bind_param(...refValues($bindArgs1));
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
        $bindArgs2 = array_merge([$types], $ids);
        $persStmt->bind_param(...refValues($bindArgs2));
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
        $bindArgs3 = array_merge([$types], $ids);
        $fmtCountsStmt->bind_param(...refValues($bindArgs3));
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
                'uploaded_count' => 0,
                'manual_expiry_value' => isset($f['manual_expiry_value']) ? (int) $f['manual_expiry_value'] : null,
                'manual_expiry_unit' => $f['manual_expiry_unit'] ?? null,
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
        if (!isset($data['start_date']) || !$data['start_date']) {
            respond(400, ['error' => 'start_date is required and cannot be empty']);
        }
        $start_date = $data['start_date'];
        $end_date = $data['end_date'] ?? null;
        $periodicity_type = $isPeriodic ? $data['periodicity_type'] : null;
        $periodicity_count = $isPeriodic ? (int) $data['periodicity_count'] : null;
        $isPeriodicInt = (int) $isPeriodic;

        /* Suma total de mínimos por formato ---------------------------- */
        $min_docs = array_sum(array_column($fileFormats, 'min_quantity'));

        /* ── Transacción ──────────────────────────────────────────────── */
        $mysqli->begin_transaction();
        try {
            // Verificar si hay traslape con otras configuraciones activas del mismo documento
            $check = $mysqli->prepare("
                SELECT dp.start_date, dp.end_date
                FROM document_periods dp
                JOIN company_required_files crf ON crf.required_file_id = dp.required_file_id
                WHERE crf.company_id = ?
                AND crf.file_type_id = ?
                AND crf.is_active = 1
            ");
            $check->bind_param('ii', $company_id, $file_type_id);
            $check->execute();
            $res = $check->get_result();
            $check->close();

            $new_periods = [];
            $preview_start = new DateTime($start_date);

            if ($isPeriodic) {
                $cnt = $periodicity_count;
                switch (strtolower($periodicity_type)) {
                    case 'días':
                        $interval = new DateInterval("P{$cnt}D");
                        break;
                    case 'semanas':
                        $interval = new DateInterval("P" . ($cnt * 7) . "D");
                        break;
                    case 'meses':
                        $interval = new DateInterval("P{$cnt}M");
                        break;
                    case 'años':
                        $interval = new DateInterval("P{$cnt}Y");
                        break;
                    default:
                        respond(400, ['error' => 'Periodicidad no válida']);
                }
                $manual = $data['manual_generation'] ?? false;
                if ($manual) {
                    $rangeStart = new DateTime($data['manual_range']['start_date']);
                    $rangeEnd = isset($data['manual_range']['end_date']) ? new DateTime($data['manual_range']['end_date']) : null;
                    $maxCount = isset($data['manual_range']['period_count']) ? (int) $data['manual_range']['period_count'] : null;

                    $currentStart = clone $rangeStart;
                    $generated = 0;

                    while (true) {
                        $currentEnd = (clone $currentStart)->add($interval)->sub(new DateInterval('P1D'));

                        if ($rangeEnd && $currentStart > $rangeEnd)
                            break;
                        if ($maxCount && $generated >= $maxCount)
                            break;

                        $new_periods[] = ['start' => $currentStart, 'end' => $currentEnd];
                        $currentStart = (clone $currentEnd)->modify('+1 day');
                        $generated++;
                    }
                } else {
                    $currentEnd = (clone $preview_start)->add($interval)->sub(new DateInterval('P1D'));
                    $new_periods[] = ['start' => $preview_start, 'end' => $currentEnd];
                }
            }

            // Validar traslapes
            $lastEnDate = null;

            while ($row = $res->fetch_assoc()) {
                $exist_start = new DateTime($row['start_date']);
                $exist_end = new DateTime($row['end_date']);

                //GUARDADO
                if (is_null($lastEnDate) || $exist_end > $lastEnDate) {
                    $lastEnDate = $exist_end;
                }

                foreach ($new_periods as $np) {
                    if (
                        ($np['start'] <= $exist_end) &&
                        ($np['end'] >= $exist_start)
                    ) {
                        respond(409, [
                            'error' => 'Conflicto con otros periodos activos para este documento',
                            'last_movement_date' => $lastEnDate->format('Y-m-d')
                        ]);
                    }

                }

            }
            /* 1) Desactivar versión anterior --------------------------- */
            $startDateObj = new DateTimeImmutable($start_date);
            $isActiveNew = 1;

            // Verificar si existe una configuración activa más reciente
            $checkFuture = $mysqli->prepare("
                SELECT 1
                FROM company_required_files
                WHERE company_id = ?
                AND file_type_id = ?
                AND is_active = 1
                AND start_date > ?
                LIMIT 1
            ");
            $start_date_str = $startDateObj->format('Y-m-d');
            $checkFuture->bind_param('iis', $company_id, $file_type_id, $start_date_str);
            $checkFuture->execute();
            $checkFuture->store_result();

            if ($checkFuture->num_rows > 0) {
                // Ya hay una más reciente activa, entonces esta nueva debe quedar inactiva
                $isActiveNew = 0;
            }
            $checkFuture->close();


            if ($isActiveNew) {

                $off = $mysqli->prepare("
                    UPDATE company_required_files
                    SET is_active = 0,
                        end_date  = IF(end_date IS NULL OR end_date > ?,
                                        DATE_SUB(?, INTERVAL 1 DAY),
                                        end_date)
                    WHERE company_id   = ?
                    AND file_type_id = ?
                    AND is_active = 1
                    AND start_date <= ?
                ");
                $off->bind_param(
                    'ssiis',
                    $start_date, // Para IF(end_date > ?)
                    $start_date, // Para DATE_SUB(?)
                    $company_id,
                    $file_type_id,
                    $start_date // Para asegurar que sea anterior estrictamente
                );

                $off->execute();
                $off->close();
            }
            /* 2) Insertar cabecera ------------------------------------- */


            $ins = $mysqli->prepare("
                INSERT INTO company_required_files
                    (company_id, assigned_by, file_type_id, is_periodic,
                    periodicity_type, periodicity_count,
                    min_documents_needed, start_date, end_date, is_active)
                VALUES (?,?,?,?,?,?,?,?,?,?)
            ");
            $ins->bind_param(
                'iiiisiissi',
                $company_id,
                $assigned_by,
                $file_type_id,
                $isPeriodicInt,
                $periodicity_type,
                $periodicity_count,
                $min_docs,
                $start_date,
                $end_date,
                $isActiveNew
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

            /* 4) Crear periodos según rango o cantidad manual (si aplica) ---------- */
            $periodsToInsert = [];

            if ($isPeriodic) {
                $inicio = new DateTime($start_date);
                $cnt = $periodicity_count;
                switch (strtolower($periodicity_type)) {
                    case 'días':
                        $interval = new DateInterval("P{$cnt}D");
                        break;
                    case 'semanas':
                        $interval = new DateInterval("P" . ($cnt * 7) . "D");
                        break;
                    case 'meses':
                        $interval = new DateInterval("P{$cnt}M");
                        break;
                    case 'años':
                        $interval = new DateInterval("P{$cnt}Y");
                        break;
                    default:
                        throw new Exception('Periodicidad no válida');
                }

                $manual = $data['manual_generation'] ?? false;
                if ($manual) {
                    $rangeStart = new DateTime($data['manual_range']['start_date']);
                    $rangeEnd = isset($data['manual_range']['end_date']) ? new DateTime($data['manual_range']['end_date']) : null;
                    $maxCount = isset($data['manual_range']['period_count']) ? (int) $data['manual_range']['period_count'] : null;

                    $currentStart = clone $rangeStart;
                    $generated = 0;

                    while (true) {
                        $currentEnd = (clone $currentStart)->add($interval)->sub(new DateInterval('P1D'));

                        if ($rangeEnd && $currentStart > $rangeEnd)
                            break;
                        if ($maxCount && $generated >= $maxCount)
                            break;

                        $periodsToInsert[] = [
                            'start' => $currentStart->format('Y-m-d'),
                            'end' => $currentEnd->format('Y-m-d'),
                        ];

                        $currentStart = (clone $currentEnd)->modify('+1 day');
                        $generated++;
                    }
                } else {
                    $startDateObj = new DateTimeImmutable($start_date);
                    $today = new DateTimeImmutable('today');

                    // Si la fecha está en el futuro o es hoy, generar solo un periodo
                    if ($startDateObj >= $today) {
                        $currentStart = clone $inicio;
                        $currentEnd = (clone $currentStart)->add($interval)->sub(new DateInterval('P1D'));

                        $periodsToInsert[] = [
                            'start' => $currentStart->format('Y-m-d'),
                            'end' => $currentEnd->format('Y-m-d'),
                        ];
                    } else {
                        // ───── Generar periodos automáticamente hasta antes del primer periodo existente ─────

                        // 1. Obtener la fecha de inicio más temprana ya existente para ese requisito
                        $firstPeriodSql = "
                            SELECT MIN(dp.start_date) AS first_start
                            FROM document_periods dp
                            JOIN company_required_files crf ON crf.required_file_id = dp.required_file_id
                            WHERE crf.company_id = ? AND crf.file_type_id = ?
                        ";
                        $firstStmt = $mysqli->prepare($firstPeriodSql);
                        $firstStmt->bind_param('ii', $company_id, $file_type_id);
                        $firstStmt->execute();
                        $firstStmt->bind_result($firstPeriodStartRaw);
                        $firstStmt->fetch();
                        $firstStmt->close();

                        $limitDate = $firstPeriodStartRaw ? new DateTime($firstPeriodStartRaw) : null;

                        // 2. Generar periodos desde el inicio hasta antes del primer periodo existente
                        $currentStart = clone $inicio;

                        if (!$limitDate) {
                            // No hay periodos existentes → generar solo uno
                            $currentEnd = (clone $currentStart)->add($interval)->sub(new DateInterval('P1D'));
                            $periodsToInsert[] = [
                                'start' => $currentStart->format('Y-m-d'),
                                'end' => $currentEnd->format('Y-m-d'),
                            ];
                        } else {
                            // Generar periodos automáticamente hasta antes del primer periodo existente
                            $iterationLimit = 1000;
                            $iterationCount = 0;

                            while (true) {
                                if (++$iterationCount > $iterationLimit) {
                                    $mysqli->rollback();
                                    respond(500, ['error' => 'Error interno: generación automática sin límite']);
                                }

                                $currentEnd = (clone $currentStart)->add($interval)->sub(new DateInterval('P1D'));

                                if ($currentStart >= $limitDate)
                                    break;

                                $periodsToInsert[] = [
                                    'start' => $currentStart->format('Y-m-d'),
                                    'end' => $currentEnd->format('Y-m-d'),
                                ];

                                $nextStart = (clone $currentEnd)->modify('+1 day');
                                if ($nextStart >= $limitDate)
                                    break;

                                $currentStart = $nextStart;
                            }
                        }

                    }
                }
            } else {
                $periodsToInsert[] = [
                    'start' => $start_date,
                    'end' => '9999-12-31',
                ];
            }

            /* ✅ Validar que no se traslapen periodos existentes */
            if (!empty($periodsToInsert)) {
                $checkSql = "
                    SELECT start_date, end_date
                    FROM document_periods
                    WHERE required_file_id IN (
                        SELECT required_file_id
                        FROM company_required_files
                        WHERE company_id = ? AND file_type_id = ?
                    )
                ";
                $checkStmt = $mysqli->prepare($checkSql);
                $checkStmt->bind_param('ii', $company_id, $file_type_id);
                $checkStmt->execute();
                $existingPeriods = $checkStmt->get_result()->fetch_all(MYSQLI_ASSOC);
                $checkStmt->close();

                foreach ($periodsToInsert as $newPeriod) {
                    $newStart = new DateTime($newPeriod['start']);
                    $newEnd = new DateTime($newPeriod['end']);

                    foreach ($existingPeriods as $existing) {
                        $existStart = new DateTime($existing['start_date']);
                        $existEnd = new DateTime($existing['end_date']);

                        if ($newStart <= $existEnd && $newEnd >= $existStart) {
                            $mysqli->rollback();
                            respond(400, [
                                'error' => 'Los periodos generados se traslapan con una configuración existente del mismo documento.'
                            ]);
                        }
                    }
                }
            }

            /* 5) Insertar periodos ------------------------------------------------- */
            $p = $mysqli->prepare("
                INSERT INTO document_periods
                    (required_file_id, start_date, end_date, created_at)
                VALUES (?,?,?,NOW())
            ");
            foreach ($periodsToInsert as $period) {
                $p->bind_param('iss', $required_file_id, $period['start'], $period['end']);
                $p->execute();
            }
            $p->close();


        } catch (Throwable $e) {
            $mysqli->rollback();
            respond(500, ['error' => $e->getMessage()]);
        }

        $mysqli->commit();
        respond(200, ['success' => true, 'required_file_id' => $required_file_id]);

    /*──────────────────────────────────────────────────────────────────────*/
    default:
        respond(405, ['error' => 'Method not allowed']);
}
$mysqli->close();
?>