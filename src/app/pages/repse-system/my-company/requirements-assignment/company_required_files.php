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

function isOverlapping(DateTimeInterface $start1, DateTimeInterface $end1, DateTimeInterface $start2, DateTimeInterface $end2): bool
{
    return $start1 <= $end2 && $end1 >= $start2;
}

function hasOverlap(array $newPeriod, array $existingPeriods): bool
{
    foreach ($existingPeriods as $ex) {
        $exStart = new DateTime($ex['start'] ?? $ex['start_date']);
        $exEnd = new DateTime($ex['end'] ?? $ex['end_date']);
        if (isOverlapping($newPeriod['start'], $newPeriod['end'], $exStart, $exEnd)) {
            return true;
        }
    }
    return false;
}

function getExistingPeriods(mysqli $mysqli, int $companyId, int $fileTypeId): array
{
    return fetchAssoc(
        $mysqli,
        "SELECT dp.start_date, dp.end_date
         FROM document_periods dp
         JOIN company_required_files crf ON crf.required_file_id = dp.required_file_id
         WHERE crf.company_id = ? AND crf.file_type_id = ?",
        [$companyId, $fileTypeId],
        'ii'
    );
}

function getExtendedPeriodsForPost(mysqli $mysqli, int $companyId, int $fileTypeId): array
{
    return fetchAssoc(
        $mysqli,
        "SELECT dp.start_date AS start, dp.end_date AS end, crf.is_periodic, crf.required_file_id
         FROM document_periods dp
         JOIN company_required_files crf ON crf.required_file_id = dp.required_file_id
         WHERE crf.company_id = ? AND crf.file_type_id = ?",
        [$companyId, $fileTypeId],
        'ii'
    );
}

function tryGenerateNonOverlappingPeriods(array $cfg, array $existingPeriods, bool $manual): array
{
    $periods = [];
    $start = new DateTime($cfg['start_date']);
    $interval = getInterval($cfg['periodicity_type'], (int) $cfg['periodicity_count']);
    if (!$interval)
        respond(400, ['error' => 'Invalid periodicity_type']);

    $today = new DateTimeImmutable('today');
    $current = clone $start;

    if ($manual) {
        $count = (int) $cfg['manual_range']['period_count'];
        for ($i = 0; $i < $count; $i++) {
            $end = (clone $current)->add($interval)->sub(new DateInterval('P1D'));
            $period = ['start' => clone $current, 'end' => $end];

            if (hasOverlap($period, $existingPeriods)) {
                respond(409, ['error' => 'Uno o más periodos propuestos se solapan con una configuración existente.']);
            }

            $periods[] = $period;
            $current = (clone $end)->modify('+1 day');
        }
    } else {
        while (true) {
            $end = (clone $current)->add($interval)->sub(new DateInterval('P1D'));
            $period = ['start' => clone $current, 'end' => $end];

            if (hasOverlap($period, $existingPeriods)) {
                if (empty($periods)) {
                    respond(409, ['error' => 'Uno o más periodos propuestos se solapan con una configuración existente.']);
                }
                break;
            }

            $periods[] = $period;

            // Detener si se llegó a hoy o ya es futuro (solo planificar)
            if ($end >= $today)
                break;

            $current = (clone $end)->modify('+1 day');
        }
    }

    return $periods;
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
            LEFT JOIN company_files cf ON cf.period_id = p.period_id AND cf.status IN ('approved', 'late') AND cf.is_expired = 0
            WHERE p.required_file_id IN ($placeholders) GROUP BY p.period_id ORDER BY p.start_date", $ids, $types);
        $fmtCounts = fetchAssoc($mysqli, "SELECT dp.required_file_id, cf.file_ext AS format_code, COUNT(*) 
            AS uploaded_count FROM company_files cf 
            JOIN document_periods dp ON dp.period_id = cf.period_id 
            WHERE dp.required_file_id IN ($placeholders) AND cf.status IN ('approved', 'late') AND cf.is_expired = 0
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

        $companyId = (int) $data['company_id'];
        $fileTypeId = (int) $data['file_type_id'];

        $existingPeriods = getExtendedPeriodsForPost($mysqli, $companyId, $fileTypeId);
        $newPeriods = [];

        $start = new DateTimeImmutable($data['start_date']);

        // Siempre verificar si hay un requisito anterior sin periodicidad que debe ser acotado
        foreach ($existingPeriods as $prev) {
            if (
                $prev['is_periodic'] == 0 &&
                $prev['start'] < $start &&
                $prev['end'] == '9999-12-31'
            ) {
                $prevStart = new DateTimeImmutable($prev['start']);
                $interval = $prevStart->diff($start);

                if ($interval->days >= 7) {
                    $newEndDate = $start->modify('-1 day')->format('Y-m-d');

                    // Actualizar configuración anterior
                    $updateConfig = $mysqli->prepare("UPDATE company_required_files SET end_date = ? WHERE required_file_id = ?");
                    $updateConfig->bind_param('si', $newEndDate, $prev['required_file_id']);
                    $updateConfig->execute();
                    $updateConfig->close();

                    // Actualizar periodo correspondiente
                    $updatePeriod = $mysqli->prepare("UPDATE document_periods SET end_date = ? WHERE required_file_id = ?");
                    $updatePeriod->bind_param('si', $newEndDate, $prev['required_file_id']);
                    $updatePeriod->execute();
                    $updatePeriod->close();

                    // Refrescar periodos
                    $existingPeriods = getExtendedPeriodsForPost($mysqli, $companyId, $fileTypeId);

                } else {
                    respond(409, ['error' => 'Debe haber al menos una semana de separación con el requisito anterior sin periodicidad.']);
                }
            }
        }

        if (!empty($data['is_periodic'])) {
            $manual = !empty($data['manual_generation']);
            $newPeriods = tryGenerateNonOverlappingPeriods($data, $existingPeriods, $manual);

            if (empty($newPeriods)) {
                respond(409, ['error' => 'No se pudo generar ningún periodo. Todos se solapan o no hay espacio suficiente.']);
            }
        } else {
            // Documento no periódico
            $end = new DateTimeImmutable('9999-12-31');
            $openPeriod = ['start' => $start, 'end' => $end];

            foreach ($existingPeriods as $prev) {
                if (hasOverlap($openPeriod, [$prev])) {
                    respond(409, ['error' => 'El periodo propuesto se solapa con uno existente.']);
                }
            }

            $newPeriods[] = $openPeriod;
        }

        $mysqli->begin_transaction();

        try {
            $stmt = $mysqli->prepare("INSERT INTO company_required_files (
                    company_id, assigned_by, file_type_id, is_periodic,
                    periodicity_type, periodicity_count,
                    min_documents_needed, start_date, end_date
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");

            $assigned_by = (int) $data['assigned_by'];
            $isPeriodicInt = (int) $data['is_periodic'];
            $periodicityType = $isPeriodicInt ? $data['periodicity_type'] : null;
            $periodicityCount = $isPeriodicInt ? (int) $data['periodicity_count'] : null;
            $startDate = $data['start_date'];

            $lastPeriodEnd = end($newPeriods)['end'];
            $today = new DateTimeImmutable('today');

            if (!$isPeriodicInt) {
                $finalEndDate = '9999-12-31';
            } elseif (!empty($data['manual_generation'])) {
                $finalEndDate = $lastPeriodEnd->format('Y-m-d'); // manual siempre lleva end_date
            } elseif ($lastPeriodEnd < $today) {
                $finalEndDate = $lastPeriodEnd->format('Y-m-d'); // automático pero ya terminó
            } else {
                $finalEndDate = null; // automático, actual o futuro
            }

            $minDocs = array_sum(array_column($data['file_formats'], 'min_quantity'));

            $types = 'iiiisiiss';
            $params = [
                &
                $companyId,
                &
                $assigned_by,
                &
                $fileTypeId,
                &
                $isPeriodicInt,
                &
                $periodicityType,
                &
                $periodicityCount,
                &
                $minDocs,
                &
                $startDate,
                &
                $finalEndDate
            ];

            call_user_func_array([$stmt, 'bind_param'], array_merge([$types], $params));
            $stmt->execute();
            $requiredFileId = $stmt->insert_id;
            $stmt->close();

            // Insertar los formatos de archivo requeridos
            $fmtStmt = $mysqli->prepare("INSERT INTO required_file_formats (
                    required_file_id, format_code, min_required,
                    manual_expiry_visible, manual_expiry_value, manual_expiry_unit
                ) VALUES (?, ?, ?, ?, ?, ?)");

            foreach ($data['file_formats'] as $f) {
                $formatCode = $f['format_code'];
                $minRequired = (int) $f['min_quantity'];
                $expiryVisible = $f['expiry_visible'] ? 1 : 0;
                $expiryValue = $f['expiry_visible'] ? null : (int) $f['expiry_value'];
                $expiryUnit = $f['expiry_visible'] ? null : $f['expiry_unit'];

                $typesFmt = 'isiiis';
                $paramsFmt = [
                    &
                    $requiredFileId,
                    &
                    $formatCode,
                    &
                    $minRequired,
                    &
                    $expiryVisible,
                    &
                    $expiryValue,
                    &
                    $expiryUnit
                ];

                call_user_func_array([$fmtStmt, 'bind_param'], array_merge([$typesFmt], $paramsFmt));
                $fmtStmt->execute();
            }
            $fmtStmt->close();

            // Insertar periodos generados
            $periodStmt = $mysqli->prepare("INSERT INTO document_periods (required_file_id, start_date, end_date, created_at) VALUES (?, ?, ?, NOW())");
            if (!$isPeriodicInt) {
                // Documento no periódico: insertar un único periodo abierto
                $start = $startDate;
                $end = '9999-12-31';
                $periodStmt->bind_param('iss', $requiredFileId, $start, $end);
                $periodStmt->execute();
            } else {
                // Documento periódico: insertar múltiples periodos generados
                foreach ($newPeriods as $p) {
                    $start = $p['start']->format('Y-m-d');
                    $end = $p['end']->format('Y-m-d');
                    $periodStmt->bind_param('iss', $requiredFileId, $start, $end);
                    $periodStmt->execute();
                }
            }
            $periodStmt->close();

            $mysqli->commit();
            respond(200, ['success' => true, 'required_file_id' => $requiredFileId]);

        } catch (Throwable $e) {
            $mysqli->rollback();
            respond(500, ['error' => $e->getMessage()]);
        }

        break;
    case 'DELETE':

        if (isset($_GET['required_file_id'])) {
            // Obtención desde la URL
            $required_file_id = intval($_GET['required_file_id']);
        } else {
            // Obtención desde el cuerpo
            parse_str(file_get_contents("php://input"), $data);
            $required_file_id = intval($data['required_file_id'] ?? 0);
        }

        // Obtener información de empresa y nombre para ruta
        $stmt = $mysqli->prepare("
            SELECT c.id AS company_id, c.nameCompany AS company_name, ft.name AS required_file_name
            FROM company_required_files crf
            JOIN companies c ON crf.company_id = c.id
            JOIN file_types ft ON crf.file_type_id = ft.file_type_id
            WHERE crf.required_file_id = ?
        ");
        $stmt->bind_param("i", $required_file_id);
        $stmt->execute();
        $result = $stmt->get_result();
        $info = $result->fetch_assoc();
        $stmt->close();

        if (!$info) {
            echo json_encode(['success' => false, 'error' => 'No record found']);
            exit;
        }

        $company_id = $info['company_id'];
        $company_name = preg_replace('/[^a-zA-Z0-9_-]/', '', str_replace(' ', '_', $info['company_name']));
        $required_file_name = preg_replace('/[^a-zA-Z0-9_-]/', '', str_replace(' ', '_', $info['required_file_name']));
        $basePath = __DIR__ . "/../documents/{$company_id}-{$company_name}/{$required_file_id}-{$required_file_name}";

        // Eliminar archivos físicos
        function deleteFolderRecursively($folder)
        {
            if (!is_dir($folder))
                return;
            $items = scandir($folder);
            foreach ($items as $item) {
                if ($item === '.' || $item === '..')
                    continue;
                $path = $folder . DIRECTORY_SEPARATOR . $item;
                is_dir($path) ? deleteFolderRecursively($path) : unlink($path);
            }
            rmdir($folder);
        }

        if (is_dir($basePath)) {
            deleteFolderRecursively($basePath);
        }

        // Eliminar archivos de base de datos
        $mysqli->begin_transaction();

        try {
            $mysqli->query("DELETE FROM company_files WHERE period_id IN (SELECT period_id FROM document_periods WHERE required_file_id = $required_file_id)");
            $mysqli->query("DELETE FROM document_periods WHERE required_file_id = $required_file_id");
            $mysqli->query("DELETE FROM required_file_formats WHERE required_file_id = $required_file_id");
            $mysqli->query("DELETE FROM company_required_files WHERE required_file_id = $required_file_id");

            $mysqli->commit();
            echo json_encode(['success' => true]);
        } catch (Exception $e) {
            $mysqli->rollback();
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        }
        break;

    default:
        respond(405, ['error' => 'Method not allowed']);
}

$mysqli->close();
?>