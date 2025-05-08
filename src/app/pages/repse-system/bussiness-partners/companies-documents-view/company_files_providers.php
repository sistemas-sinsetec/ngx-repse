<?php
header('Content-Type: application/json');
require_once 'cors.php';
require_once 'conexion.php';

$assigned_by = intval($_GET['assigned_by'] ?? 0);
if ($assigned_by <= 0) {
    echo json_encode(['success' => false, 'error' => 'Invalid assigned_by']);
    exit;
}

// Consulta principal
$stmt = $mysqli->prepare("
    SELECT c.id AS company_id, c.nameCompany AS company_name,
           ft.file_type_id, ft.name AS file_type_name,
           crf.required_file_id, crf.periodicity_type, crf.periodicity_count,
           dp.period_id, dp.start_date, dp.end_date,
           cf.file_id, cf.file_path, cf.file_ext
    FROM company_files cf
    LEFT JOIN document_periods dp ON cf.period_id = dp.period_id
    LEFT JOIN company_required_files crf ON dp.required_file_id = crf.required_file_id
    LEFT JOIN file_types ft ON crf.file_type_id = ft.file_type_id
    LEFT JOIN companies c ON crf.company_id = c.id
    WHERE crf.assigned_by = ? AND crf.company_id != ? AND cf.status = 'approved'
    ORDER BY c.nameCompany, ft.file_type_id, crf.required_file_id, dp.start_date, cf.file_ext
");
$stmt->bind_param("ii", $assigned_by, $assigned_by);
$stmt->execute();
$result = $stmt->get_result();

$companies = [];

while ($row = $result->fetch_assoc()) {
    $compId = $row['company_id'];
    $compName = $row['company_name'];
    $typeId = $row['file_type_id'];
    $typeName = $row['file_type_name'];
    $reqId = $row['required_file_id'];
    $periodicity = $row['periodicity_type'];
    $periodicityCount = $row['periodicity_count'];
    $periodId = $row['period_id'];
    $periodStart = $row['start_date'];
    $periodEnd = $row['end_date'];
    $format = $row['file_ext'];
    $filePath = $row['file_path'];

    // Limpiar periodicidad
    if ($periodEnd === '9999-12-31') {
        $periodStart = 'sin periodicidad';
        $periodEnd = '';
    }

    if (!$periodicity || $periodicity === 'null' || $periodicity === '0') {
        $periodicity = 'sin periodicidad';
        $periodicityCount = '';
    }

    if (!isset($companies[$compId])) {
        $companies[$compId] = [
            'id' => $compId,
            'name' => $compName,
            'catalog' => [],
        ];
    }

    if (!isset($companies[$compId]['catalog'][$typeId])) {
        $companies[$compId]['catalog'][$typeId] = [
            'name' => $typeName,
            'periodicities' => [],
        ];
    }

    if (!isset($companies[$compId]['catalog'][$typeId]['periodicities'][$reqId])) {
        $companies[$compId]['catalog'][$typeId]['periodicities'][$reqId] = [
            'type' => $periodicity,
            'count' => $periodicityCount,
            'periods' => [],
        ];
    }

    if (!isset($companies[$compId]['catalog'][$typeId]['periodicities'][$reqId]['periods'][$periodId])) {
        $companies[$compId]['catalog'][$typeId]['periodicities'][$reqId]['periods'][$periodId] = [
            'start_date' => $periodStart,
            'end_date' => $periodEnd,
            'formats' => [],
        ];
    }

    if (!isset($companies[$compId]['catalog'][$typeId]['periodicities'][$reqId]['periods'][$periodId]['formats'][$format])) {
        $companies[$compId]['catalog'][$typeId]['periodicities'][$reqId]['periods'][$periodId]['formats'][$format] = [
            'code' => $format,
            'files' => [],
        ];
    }

    $companies[$compId]['catalog'][$typeId]['periodicities'][$reqId]['periods'][$periodId]['formats'][$format]['files'][] = [
        'file_path' => $filePath,
    ];
}

$output = [];
foreach ($companies as $company) {
    $catalog = [];
    foreach ($company['catalog'] as $type) {
        $periodicities = [];
        foreach ($type['periodicities'] as $periodicity) {
            $periods = [];
            foreach ($periodicity['periods'] as $period) {
                $formats = [];
                foreach ($period['formats'] as $format) {
                    $formats[] = $format;
                }
                $period['formats'] = $formats;
                $periods[] = $period;
            }
            $periodicity['periods'] = $periods;
            $periodicities[] = $periodicity;
        }
        $type['periodicities'] = $periodicities;
        $catalog[] = $type;
    }
    $output[] = [
        'id' => $company['id'],
        'name' => $company['name'],
        'catalog' => $catalog,
    ];
}

echo json_encode($output);
$stmt->close();
