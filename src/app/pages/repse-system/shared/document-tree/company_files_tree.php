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

function buildCatalogEntry(&$tree, $typeId, $typeName, $reqId, $periodId, $startDate, $endDate, $format, $filePath)
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

$mode = $_GET['mode'] ?? '';
$company_id = intval($_GET['company_id'] ?? 0);
$status = $_GET['status'] ?? 'approved';

$validModes = ['catalog', 'providers'];
$validStatuses = ['approved', 'pending', 'rejected', 'uploaded', 'all'];

if (!in_array($mode, $validModes) || $company_id <= 0 || !in_array($status, $validStatuses)) {
    echo json_encode(['success' => false, 'error' => 'Parámetros inválidos']);
    exit;
}

$statusClause = $status === 'all' ? '1=1' : 'cf.status = ?';

if ($mode === 'catalog') {
    $sql = "
        SELECT ft.file_type_id, ft.name AS file_type_name,
               crf.required_file_id, crf.periodicity_type, crf.periodicity_count,
               dp.period_id, dp.start_date, dp.end_date,
               cf.file_path, cf.file_ext,
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
        echo json_encode(['success' => false, 'error' => 'Error al preparar consulta']);
        exit;
    }

    if ($status === 'all') {
        $stmt->bind_param("i", $company_id);
    } else {
        $stmt->bind_param("is", $company_id, $status);
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

        buildCatalogEntry($catalog, $typeId, $typeName, $row['required_file_id'], $row['period_id'], $periodStart, $periodEnd, $row['file_ext'], $row['file_path']);
        $catalog[$typeId]['periodicities'][$row['required_file_id']]['type'] = $periodicity;
        $catalog[$typeId]['periodicities'][$row['required_file_id']]['count'] = $count;
    }

    echo json_encode(treeToArray($catalog));
    $stmt->close();
    exit;
}

if ($mode === 'providers') {
    $sql = "
    SELECT c.id AS company_id, c.nameCompany AS company_name,
           ft.file_type_id, ft.name AS file_type_name,
           crf.required_file_id, crf.periodicity_type, crf.periodicity_count,
           dp.period_id, dp.start_date, dp.end_date,
           cf.file_path, cf.file_ext
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
        echo json_encode(['success' => false, 'error' => 'Error al preparar consulta']);
        exit;
    }

    if ($status === 'all') {
        $stmt->bind_param("ii", $company_id, $company_id);
    } else {
        $stmt->bind_param("iis", $company_id, $company_id, $status);
    }


    $stmt->execute();
    $result = $stmt->get_result();

    $companies = [];

    while ($row = $result->fetch_assoc()) {
        $compId = $row['company_id'];
        if (!isset($companies[$compId])) {
            $companies[$compId] = [
                'id' => $compId,
                'name' => $row['company_name'],
                'catalog' => [],
            ];
        }

        list($periodStart, $periodEnd) = normalizePeriod($row['start_date'], $row['end_date']);
        list($periodicity, $count) = normalizePeriodicity($row['periodicity_type'], $row['periodicity_count']);

        buildCatalogEntry(
            $companies[$compId]['catalog'],
            $row['file_type_id'],
            $row['file_type_name'],
            $row['required_file_id'],
            $row['period_id'],
            $periodStart,
            $periodEnd,
            $row['file_ext'],
            $row['file_path']
        );

        $companies[$compId]['catalog'][$row['file_type_id']]['periodicities'][$row['required_file_id']]['type'] = $periodicity;
        $companies[$compId]['catalog'][$row['file_type_id']]['periodicities'][$row['required_file_id']]['count'] = $count;
    }

    // Salida
    $output = [];
    foreach ($companies as $company) {
        $company['catalog'] = treeToArray($company['catalog']);
        $output[] = $company;
    }

    echo json_encode($output);
    $stmt->close();
    exit;
}

echo json_encode(['success' => false, 'error' => 'Invalid mode']);
exit;