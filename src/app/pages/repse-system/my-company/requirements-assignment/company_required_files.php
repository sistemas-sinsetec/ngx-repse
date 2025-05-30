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

function refValues(array &$arr): array
{
    $refs = [];
    foreach ($arr as $key => &$value) {
        $refs[$key] = &$value;
    }
    return $refs;
}

function fetchAssoc($mysqli, string $sql, array $params = [], string $types = ''): array
{
    $stmt = $mysqli->prepare($sql) or respond(500, ['error' => $mysqli->error]);
    if (!empty($params)) {
        $stmt->bind_param($types, ...$params);
    }
    $stmt->execute();
    $result = $stmt->get_result();
    $rows = $result->fetch_all(MYSQLI_ASSOC);
    $stmt->close();
    return $rows;
}

function validateRequired(array $data): void
{
    $required = ['company_id', 'assigned_by', 'file_type_id', 'is_periodic', 'file_formats', 'start_date'];
    foreach ($required as $f) {
        if (!isset($data[$f])) {
            respond(400, ['error' => "Field {$f} is required"]);
        }
    }

    if (!is_array($data['file_formats']) || empty($data['file_formats'])) {
        respond(400, ['error' => 'file_formats must be a non-empty array']);
    }

    foreach ($data['file_formats'] as $idx => $f) {
        if (!isset($f['format_code'], $f['min_quantity'], $f['expiry_visible'])) {
            respond(400, ['error' => "file_formats[{$idx}] missing fields"]);
        }
        if (!$f['expiry_visible'] && (!isset($f['expiry_value'], $f['expiry_unit']))) {
            respond(400, ['error' => "file_formats[{$idx}] missing expiry details"]);
        }
    }

    if (!empty($data['is_periodic'])) {
        if (empty($data['periodicity_type']) || empty($data['periodicity_count'])) {
            respond(400, ['error' => 'Periodic details required for periodic documents']);
        }
    } else {
        $data['periodicity_type'] = null;
        $data['periodicity_count'] = null;
    }

}

function dateOverlap(array $a, array $b): bool
{
    return $a['start'] <= $b['end'] && $a['end'] >= $b['start'];
}


function generatePeriods(array $cfg): array
{
    $periods = [];
    $start = new DateTime($cfg['start_date']);

    if (!$cfg['is_periodic']) {
        $periods[] = ['start' => $start, 'end' => new DateTime('9999-12-31')];
        return $periods;
    }

    $type = strtolower($cfg['periodicity_type']);
    $count = (int) $cfg['periodicity_count'];
    switch ($type) {
        case 'días':
            $interval = new DateInterval("P{$count}D");
            break;
        case 'semanas':
            $interval = new DateInterval("P" . ($count * 7) . "D");
            break;
        case 'meses':
            $interval = new DateInterval("P{$count}M");
            break;
        case 'años':
            $interval = new DateInterval("P{$count}Y");
            break;
        default:
            respond(400, ['error' => 'Invalid period type']);
    }



    if (!empty($cfg['manual_generation'])) {
        $count = (int) $cfg['manual_range']['period_count'];
        $current = clone $start;
        for ($i = 0; $i < $count; $i++) {
            $end = (clone $current)->add($interval)->sub(new DateInterval('P1D'));
            $periods[] = ['start' => clone $current, 'end' => $end];
            $current = (clone $end)->modify('+1 day');
        }
    } else {
        $end = (clone $start)->add($interval)->sub(new DateInterval('P1D'));
        $periods[] = ['start' => $start, 'end' => $end];
    }

    return $periods;
}

function getInterval(string $type, int $count): ?DateInterval
{
    $type = strtolower($type);

    switch ($type) {
        case 'días':
            return new DateInterval("P{$count}D");
        case 'semanas':
            return new DateInterval("P" . ($count * 7) . "D");
        case 'meses':
            return new DateInterval("P{$count}M");
        case 'años':
            return new DateInterval("P{$count}Y");
        default:
            return null;
    }
}

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        $param = null;
        $where = '';
        $periodScope = $_GET['period_scope'] ?? 'all';
        $today = new DateTimeImmutable('today');


        if (isset($_GET['assigned_by'])) {
            $param = (int) $_GET['assigned_by'];
            $where = 'crf.assigned_by = ? AND crf.company_id != crf.assigned_by';
        } elseif (isset($_GET['company_id'])) {
            $param = (int) $_GET['company_id'];
            $where = 'crf.company_id = ?';
        } else {
            respond(400, ['error' => 'company_id or assigned_by parameter is required']);
        }

        $docs = fetchAssoc(
            $mysqli,
            "SELECT crf.required_file_id, crf.assigned_by, crf.company_id, ft.name,
                    crf.is_periodic, crf.periodicity_type, crf.periodicity_count,
                    crf.start_date, crf.end_date,
                    (SELECT COUNT(*) FROM required_file_visibilities v
                     WHERE v.required_file_id = crf.required_file_id AND v.is_visible = 1) AS partner_count
               FROM company_required_files crf
               JOIN file_types ft ON ft.file_type_id = crf.file_type_id
               WHERE $where",
            [$param],
            'i'
        );

        if (empty($docs))
            respond(200, []);

        $ids = array_column($docs, 'required_file_id');
        $placeholders = implode(',', array_fill(0, count($ids), '?'));
        $types = str_repeat('i', count($ids));

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
        $fmts = fetchAssoc($mysqli, "SELECT required_file_id, format_code 
            AS code, min_required, manual_expiry_value, manual_expiry_unit 
            FROM required_file_formats WHERE required_file_id 
            IN ($placeholders)", $ids, $types);
        $pers = fetchAssoc($mysqli, "SELECT p.period_id, p.required_file_id, p.start_date, p.end_date, COUNT(cf.file_id) 
            AS uploaded_count FROM document_periods p 
            LEFT JOIN company_files cf ON cf.period_id = p.period_id AND cf.status IN ('approved', 'late')
            WHERE p.required_file_id IN ($placeholders) GROUP BY p.period_id ORDER BY p.start_date", $ids, $types);
        $fmtCounts = fetchAssoc($mysqli, "SELECT dp.required_file_id, cf.file_ext AS format_code, COUNT(*) 
            AS uploaded_count FROM company_files cf 
            JOIN document_periods dp ON dp.period_id = cf.period_id 
            WHERE dp.required_file_id IN ($placeholders) AND cf.status IN ('approved', 'late')  
            GROUP BY dp.required_file_id, cf.file_ext", $ids, $types);

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

        foreach ($fmtCounts as $fc) {
            $doc = &$out[$fc['required_file_id']];
            foreach ($doc['formats'] as &$fmt) {
                if ($fmt['code'] === $fc['format_code']) {
                    $fmt['uploaded_count'] = (int) $fc['uploaded_count'];
                    break;
                }
            }
        }

        foreach ($pers as $p) {
            $start = new DateTimeImmutable($p['start_date']);
            $end = new DateTimeImmutable($p['end_date']);

            $include = true;
            if ($periodScope === 'current') {
                $include = $start <= $today && $end >= $today;
            } elseif ($periodScope === 'past') {
                $include = $end < $today;
            }

            if (!$include)
                continue;

            $doc = &$out[$p['required_file_id']];
            $period = [
                'period_id' => (int) $p['period_id'],
                'start_date' => $p['start_date'],
                'end_date' => $p['end_date'],
                'uploaded_count' => (int) $p['uploaded_count'],
            ];
            $doc['periods'][] = $period;


            $minReq = max($doc['min_documents_needed'], 1);

            if ($p['uploaded_count'] < $minReq && !$doc['current_period']) {
                $doc['current_period'] = $period;
                $doc['deadline'] = $p['end_date'];
            }
        }

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

        // Filtrar documentos sin periodos si se requiere
        if ($periodScope === 'current') {
            $out = array_filter($out, function ($doc) {
                return !empty($doc['periods']);
            });
        } elseif ($periodScope === 'past') {
            $out = array_filter($out, function ($doc) {
                return !empty($doc['periods']);
            });
        }

        respond(200, array_values($out));

    case 'POST':
        $data = json_decode(file_get_contents('php://input'), true) ?? [];
        validateRequired($data);

        $company_id = (int) $data['company_id'];
        $assigned_by = (int) $data['assigned_by'];
        $file_type_id = (int) $data['file_type_id'];
        $start_date = new DateTime($data['start_date']);
        $today = new DateTimeImmutable('today');

        // Obtener periodos existentes del mismo tipo
        $existing = fetchAssoc(
            $mysqli,
            "SELECT dp.start_date, dp.end_date
             FROM document_periods dp
             JOIN company_required_files crf ON crf.required_file_id = dp.required_file_id
             WHERE crf.company_id = ? AND crf.file_type_id = ?",
            [$company_id, $file_type_id],
            'ii'
        );

        $interval = getInterval($data['periodicity_type'], (int) $data['periodicity_count']);
        if (!$interval)
            respond(400, ['error' => 'Invalid periodicity_type']);

        $periodsToInsert = [];

        if (!empty($data['manual_generation'])) {
            $periodsToInsert = generatePeriods($data);
        } else {
            $current = clone $start_date;
            $stoppedByConflict = false;

            while ($current <= $today) {
                $end = (clone $current)->add($interval)->sub(new DateInterval('P1D'));

                // Verificar superposición
                $conflict = false;
                foreach ($existing as $ex) {
                    $exStart = new DateTime($ex['start_date']);
                    $exEnd = new DateTime($ex['end_date']);
                    if (dateOverlap(['start' => $current, 'end' => $end], ['start' => $exStart, 'end' => $exEnd])) {
                        $stoppedByConflict = true;
                        break 2; // salir del while y del foreach
                    }
                }

                $periodsToInsert[] = ['start' => clone $current, 'end' => $end];
                $current = (clone $end)->modify('+1 day');
            }

            if ($stoppedByConflict && !empty($periodsToInsert)) {
                $lastPeriod = end($periodsToInsert);
                $final_end_date = $lastPeriod['end']->format('Y-m-d');
            } else if (empty($periodsToInsert)) {
                respond(409, ['error' => 'No se pudo generar ningún periodo. Todos se solapan o no hay espacio suficiente.']);
            } else {
                $final_end_date = null;
            }
        }


        $mysqli->begin_transaction();

        try {
            $assigned_by = (int) $data['assigned_by'];
            $periodicity_type = !empty($data['is_periodic']) ? $data['periodicity_type'] : null;
            $periodicity_count = !empty($data['is_periodic']) ? (int) $data['periodicity_count'] : null;
            $min_docs = array_sum(array_column($data['file_formats'], 'min_quantity'));
            $start_date = $data['start_date'];
            $end_date = !empty($data['is_periodic'])
                ? ($final_end_date ?? null)
                : '9999-12-31';
            $isPeriodicInt = (int) $data['is_periodic'];

            $ins = $mysqli->prepare("INSERT INTO company_required_files (
                company_id, assigned_by, file_type_id, is_periodic,
                periodicity_type, periodicity_count, min_documents_needed, 
                start_date, end_date) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");

            $ins->bind_param(
                'iiiisiiss',
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

            $fmtStmt = $mysqli->prepare("INSERT INTO required_file_formats (
                required_file_id, format_code, min_required, 
                manual_expiry_visible, manual_expiry_value, manual_expiry_unit) 
                VALUES (?, ?, ?, ?, ?, ?)");

            foreach ($data['file_formats'] as $f) {
                $format_code = $f['format_code'];
                $min_quantity = (int) $f['min_quantity'];
                $expiry_visible = $f['expiry_visible'] ? 1 : 0;
                $expiry_value = $f['expiry_visible'] ? null : (int) $f['expiry_value'];
                $expiry_unit = $f['expiry_visible'] ? null : $f['expiry_unit'];

                $fmtStmt->bind_param(
                    'isiiis',
                    $required_file_id,
                    $format_code,
                    $min_quantity,
                    $expiry_visible,
                    $expiry_value,
                    $expiry_unit
                );
                $fmtStmt->execute();
            }
            $fmtStmt->close();

            $periodStmt = $mysqli->prepare("INSERT INTO document_periods (
                required_file_id, start_date, end_date, created_at) 
                VALUES (?, ?, ?, NOW())");

            foreach ($periodsToInsert as $p) {
                $start_str = $p['start']->format('Y-m-d');
                $end_str = $p['end']->format('Y-m-d');
                $periodStmt->bind_param('iss', $required_file_id, $start_str, $end_str);
                $periodStmt->execute();
            }
            $periodStmt->close();

            $mysqli->commit();
            respond(200, ['success' => true, 'required_file_id' => $required_file_id]);

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