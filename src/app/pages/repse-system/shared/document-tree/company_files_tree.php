<?php
header('Content-Type: application/json');
require_once 'cors.php';
require_once 'conexion.php';

function normalizePeriod($start, $end)
{
    if ($end === '9999-12-31')
        return ['sin periodicidad', ''];
    return [$start, $end];
}

function normalizePeriodicity($type, $count)
{
    if (!$type || $type === 'null' || $type === '0') {
        return ['sin periodicidad', ''];
    }
    return [$type, $count];
}

function buildCatalogEntry(&$tree, $typeId, $typeName, $reqId, $periodId, $startDate, $endDate, $format, $filePath, $isExpired, $expiryDate = null, $status = null)
{
    if (!isset($tree[$typeId])) {
        $tree[$typeId] = [
            'name' => $typeName,
            'periodicities' => [],
        ];
    }

    if (!isset($tree[$typeId]['periodicities'][$reqId])) {
        $tree[$typeId]['periodicities'][$reqId] = [
            'type' => '',
            'count' => '',
            'periods' => [],
        ];
    }

    if (!isset($tree[$typeId]['periodicities'][$reqId]['periods'][$periodId])) {
        $tree[$typeId]['periodicities'][$reqId]['periods'][$periodId] = [
            'start_date' => $startDate,
            'end_date' => $endDate,
            'formats' => [],
        ];
    }

    if (!isset($tree[$typeId]['periodicities'][$reqId]['periods'][$periodId]['formats'][$format])) {
        $tree[$typeId]['periodicities'][$reqId]['periods'][$periodId]['formats'][$format] = [
            'code' => $format,
            'files' => [],
        ];
    }

    $tree[$typeId]['periodicities'][$reqId]['periods'][$periodId]['formats'][$format]['files'][] = [
        'file_path' => $filePath,
        'is_expired' => intval($isExpired),
        'expiry_date' => $expiryDate,
        'status' => $status
    ];
}

function treeToArray($tree)
{
    $output = [];
    foreach ($tree as $type) {
        $periodicities = [];
        foreach ($type['periodicities'] as $periodicity) {
            $periods = [];
            foreach ($periodicity['periods'] as $period) {
                $period['formats'] = array_values($period['formats']);
                $periods[] = $period;
            }
            $periodicity['periods'] = $periods;
            $periodicities[] = $periodicity;
        }
        $type['periodicities'] = $periodicities;
        $output[] = $type;
    }
    return $output;
}

// --- INICIO BLOQUE PARA MANEJO DE STATUS ---
$validStatuses = ['approved', 'pending', 'rejected', 'uploaded', 'late', 'approved_or_late', 'all'];
$statusList = isset($_GET['status']) ? array_intersect(explode(',', $_GET['status']), $validStatuses) : ['approved'];

if (empty($statusList)) {
    $statusList = ['approved'];
}

$statusClause = '';
$statusParams = [];

if (in_array('all', $statusList)) {
    // No filtrar por status
    $statusClause = '1=1';
    $statusParams = [];
} elseif (in_array('approved_or_late', $statusList)) {
    // approved OR late más otros estados si existen
    $extraStatuses = array_filter($statusList, fn($s) => $s !== 'approved_or_late');

    $statusClauseParts = ["cf.status = 'approved'", "cf.status = 'late'"];

    if (count($extraStatuses) > 0) {
        $placeholders = implode(',', array_fill(0, count($extraStatuses), '?'));
        $statusClauseParts[] = "cf.status IN ($placeholders)";
        $statusParams = array_merge($statusParams, $extraStatuses);
    }

    $statusClause = '(' . implode(' OR ', $statusClauseParts) . ')';
} else {
    // Caso normal: varios status
    $placeholders = implode(',', array_fill(0, count($statusList), '?'));
    $statusClause = "cf.status IN ($placeholders)";
    $statusParams = $statusList;

}
// --- FIN BLOQUE PARA MANEJO DE STATUS ---

$mode = $_GET['mode'] ?? '';
$company_id = intval($_GET['company_id'] ?? 0);

// Ejemplo para modo catalog:
if ($mode === 'catalog') {
    $sql = "
        SELECT ft.file_type_id, ft.name AS file_type_name,
               crf.required_file_id, crf.periodicity_type, crf.periodicity_count,
               dp.period_id, dp.start_date, dp.end_date,
               cf.file_path, cf.file_ext, cf.is_expired,
               cf.expiry_date,
               cf.status,
               crf.assigned_by, c.nameCompany AS assigning_company_name
        FROM company_files cf
        LEFT JOIN document_periods dp ON cf.period_id = dp.period_id
        LEFT JOIN company_required_files crf ON dp.required_file_id = crf.required_file_id
        LEFT JOIN file_types ft ON crf.file_type_id = ft.file_type_id
        LEFT JOIN companies c ON crf.assigned_by = c.id
        WHERE crf.company_id = ? AND $statusClause
        ORDER BY ft.file_type_id, crf.required_file_id, dp.start_date, cf.file_ext
    ";

    $stmt = $mysqli->prepare($sql);
    if (!$stmt) {
        echo json_encode(['success' => false, 'error' => 'Error al preparar consulta', 'mysqli_error' => $mysqli->error]);
        exit;
    }

    // Construir parámetros para bind_param: primero company_id (int), luego estados (string)
    $bindParams = [$company_id];
    $bindTypes = "i";

    foreach ($statusParams as $s) {
        $bindParams[] = $s;
        $bindTypes .= "s";
    }

    // Preparar arreglo para call_user_func_array
    $bindNames = [];
    $bindNames[] = &$bindTypes;
    foreach ($bindParams as $key => $value) {
        $bindNames[] = &$bindParams[$key];
    }

    // Ligar parámetros sólo si hay alguno (los estados pueden ser cero si all)
    if (!$stmt->bind_param(...$bindNames)) {
        echo json_encode(['success' => false, 'error' => 'Error en bind_param']);
        exit;
    }

    $stmt->execute();
    $result = $stmt->get_result();

    $catalog = [];

    while ($row = $result->fetch_assoc()) {
        $assignedBy = intval($row['assigned_by']);
        $typeId = ($assignedBy !== $company_id && $row['assigning_company_name'])
            ? $row['file_type_id'] . '-' . $assignedBy
            : $row['file_type_id'];

        $typeName = ($assignedBy !== $company_id && $row['assigning_company_name'])
            ? $row['file_type_name'] . ' (' . $row['assigning_company_name'] . ')'
            : $row['file_type_name'];

        list($periodStart, $periodEnd) = normalizePeriod($row['start_date'], $row['end_date']);
        list($periodicity, $count) = normalizePeriodicity($row['periodicity_type'], $row['periodicity_count']);

        buildCatalogEntry($catalog, $typeId, $typeName, $row['required_file_id'], $row['period_id'], $periodStart, $periodEnd, $row['file_ext'], $row['file_path'], $row['is_expired'], $row['expiry_date'], $row['status']);
        $catalog[$typeId]['periodicities'][$row['required_file_id']]['type'] = $periodicity;
        $catalog[$typeId]['periodicities'][$row['required_file_id']]['count'] = $count;
    }

    echo json_encode(treeToArray($catalog));
    $stmt->close();
    exit;
}

elseif ($mode === 'providers') {
    $sql = "
        SELECT c.id AS company_id, c.nameCompany AS company_name,
               ft.file_type_id, ft.name AS file_type_name,
               crf.required_file_id, crf.periodicity_type, crf.periodicity_count,
               dp.period_id, dp.start_date, dp.end_date,
               cf.file_path, cf.file_ext, cf.is_expired,
               cf.expiry_date,
               cf.status
        FROM company_files cf
        LEFT JOIN document_periods dp ON cf.period_id = dp.period_id
        LEFT JOIN company_required_files crf ON dp.required_file_id = crf.required_file_id
        LEFT JOIN file_types ft ON crf.file_type_id = ft.file_type_id
        LEFT JOIN companies c ON crf.company_id = c.id
        WHERE crf.assigned_by = ? AND crf.company_id != ? AND $statusClause
        ORDER BY c.nameCompany, ft.file_type_id, crf.required_file_id, dp.start_date, cf.file_ext
    ";

    $stmt = $mysqli->prepare($sql);
    if (!$stmt) {
        echo json_encode(['success' => false, 'error' => 'Error al preparar consulta', 'mysqli_error' => $mysqli->error]);
        exit;
    }

    $bindParams = [$company_id, $company_id];
    $bindTypes = "ii";

    foreach ($statusParams as $s) {
        $bindParams[] = $s;
        $bindTypes .= "s";
    }

    if (!empty($statusParams)) {
        $stmt->bind_param($bindTypes, ...$bindParams);
    } else {
        $stmt->bind_param($bindTypes, ...$bindParams);
    }

    $stmt->execute();
    $result = $stmt->get_result();

    $providers = [];

    while ($row = $result->fetch_assoc()) {
        $typeId = $row['file_type_id'];
        $typeName = $row['file_type_name'];
        list($periodStart, $periodEnd) = normalizePeriod($row['start_date'], $row['end_date']);
        list($periodicity, $count) = normalizePeriodicity($row['periodicity_type'], $row['periodicity_count']);

        if (!isset($providers[$row['company_id']])) {
            $providers[$row['company_id']] = [
                'name' => $row['company_name'],
                'types' => [],
            ];
        }

        if (!isset($providers[$row['company_id']]['types'][$typeId])) {
            $providers[$row['company_id']]['types'][$typeId] = [
                'name' => $typeName,
                'periodicities' => [],
            ];
        }

        if (!isset($providers[$row['company_id']]['types'][$typeId]['periodicities'][$row['required_file_id']])) {
            $providers[$row['company_id']]['types'][$typeId]['periodicities'][$row['required_file_id']] = [
                'type' => '',
                'count' => '',
                'periods' => [],
            ];
        }

        if (!isset($providers[$row['company_id']]['types'][$typeId]['periodicities'][$row['required_file_id']]['periods'][$row['period_id']])) {
            $providers[$row['company_id']]['types'][$typeId]['periodicities'][$row['required_file_id']]['periods'][$row['period_id']] = [
                'start_date' => $periodStart,
                'end_date' => $periodEnd,
                'formats' => [],
            ];
        }

        if (!isset($providers[$row['company_id']]['types'][$typeId]['periodicities'][$row['required_file_id']]['periods'][$row['period_id']]['formats'][$row['file_ext']])) {
            $providers[$row['company_id']]['types'][$typeId]['periodicities'][$row['required_file_id']]['periods'][$row['period_id']]['formats'][$row['file_ext']] = [
                'code' => $row['file_ext'],
                'files' => [],
            ];
        }

        $providers[$row['company_id']]['types'][$typeId]['periodicities'][$row['required_file_id']]['type'] = $periodicity;
        $providers[$row['company_id']]['types'][$typeId]['periodicities'][$row['required_file_id']]['count'] = $count;

        $providers[$row['company_id']]['types'][$typeId]['periodicities'][$row['required_file_id']]['periods'][$row['period_id']]['formats'][$row['file_ext']]['files'][] = [
            'file_path' => $row['file_path'],
            'is_expired' => intval($row['is_expired']),
            'expiry_date' => $row['expiry_date'],
            'status' => $row['status']
        ];
    }

    // Normalizamos el array para que no tenga keys numéricas intermedias
    foreach ($providers as &$provider) {
        $types = [];
        foreach ($provider['types'] as $type) {
            $periodicities = [];
            foreach ($type['periodicities'] as $periodicity) {
                $periods = [];
                foreach ($periodicity['periods'] as $period) {
                    $period['formats'] = array_values($period['formats']);
                    $periods[] = $period;
                }
                $periodicity['periods'] = $periods;
                $periodicities[] = $periodicity;
            }
            $type['periodicities'] = $periodicities;
            $types[] = $type;
        }
        $provider['types'] = $types;
    }

    echo json_encode(array_values($providers));
    $stmt->close();
    exit;
}

echo json_encode(['success' => false, 'error' => 'Modo inválido o no especificado']);
