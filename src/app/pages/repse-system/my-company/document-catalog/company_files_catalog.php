<?php
header('Content-Type: application/json');
require_once 'cors.php';
require_once 'conexion.php';

// Validar company_id
$company_id = intval($_GET['company_id'] ?? 0);
if ($company_id <= 0) {
    echo json_encode(['success' => false, 'error' => 'Invalid company_id']);
    exit;
}

// Consulta con filtro por company_id e inclusión del asignador
$stmt = $mysqli->prepare("
    SELECT ft.file_type_id, ft.name AS file_type_name,
           crf.required_file_id, crf.periodicity_type, crf.periodicity_count,
           dp.period_id, dp.start_date, dp.end_date,
           cf.file_id, cf.file_path, cf.file_ext,
           crf.assigned_by, c.nameCompany AS assigning_company_name
    FROM company_files cf
    LEFT JOIN document_periods dp ON cf.period_id = dp.period_id
    LEFT JOIN company_required_files crf ON dp.required_file_id = crf.required_file_id
    LEFT JOIN file_types ft ON crf.file_type_id = ft.file_type_id
    LEFT JOIN companies c ON crf.assigned_by = c.id
    WHERE crf.company_id = ? AND cf.status = 'approved'
    ORDER BY ft.file_type_id, crf.required_file_id, dp.start_date, cf.file_ext
");
$stmt->bind_param("i", $company_id);
$stmt->execute();
$result = $stmt->get_result();

// Armar estructura jerárquica
$catalog = [];

while ($row = $result->fetch_assoc()) {
    $typeId = $row['file_type_id'];
    $assignedBy = intval($row['assigned_by']);
    $assigningCompany = $row['assigning_company_name'] ?? null;

    // Agregar nombre de empresa asignadora si es distinta a la actual
    if ($assignedBy !== $company_id && $assigningCompany) {
        $typeKey = $typeId . '-' . $assignedBy;
        $typeName = $row['file_type_name'] . ' (' . $assigningCompany . ')';
    } else {
        $typeKey = $typeId;
        $typeName = $row['file_type_name'];
    }

    $reqId = $row['required_file_id'];
    $periodicity = $row['periodicity_type'];
    $periodicityCount = $row['periodicity_count'];
    $periodId = $row['period_id'];
    $periodStart = $row['start_date'];
    $periodEnd = $row['end_date'];
    $format = $row['file_ext'];
    $filePath = $row['file_path'];

    if ($periodEnd === '9999-12-31') {
        $periodStart = 'sin periodicidad';
        $periodEnd = '';
    }

    if (!$periodicity || $periodicity === 'null' || $periodicity === '0') {
        $periodicity = 'sin periodicidad';
        $periodicityCount = '';
    }

    // Nivel 1: Tipo de documento
    if (!isset($catalog[$typeKey])) {
        $catalog[$typeKey] = [
            'name' => $typeName,
            'periodicities' => [],
        ];
    }

    // Nivel 2: Periodicidad
    $periodicityKey = $reqId;
    if (!isset($catalog[$typeKey]['periodicities'][$periodicityKey])) {
        $catalog[$typeKey]['periodicities'][$periodicityKey] = [
            'type' => $periodicity,
            'count' => $periodicityCount,
            'periods' => [],
        ];
    }

    // Nivel 3: Periodo
    $periodKey = $periodId;
    if (!isset($catalog[$typeKey]['periodicities'][$periodicityKey]['periods'][$periodKey])) {
        $catalog[$typeKey]['periodicities'][$periodicityKey]['periods'][$periodKey] = [
            'start_date' => $periodStart,
            'end_date' => $periodEnd,
            'formats' => [],
        ];
    }

    // Nivel 4: Formato
    $formatKey = $format;
    if (!isset($catalog[$typeKey]['periodicities'][$periodicityKey]['periods'][$periodKey]['formats'][$formatKey])) {
        $catalog[$typeKey]['periodicities'][$periodicityKey]['periods'][$periodKey]['formats'][$formatKey] = [
            'code' => $format,
            'files' => [],
        ];
    }

    // Nivel 5: Archivo
    $catalog[$typeKey]['periodicities'][$periodicityKey]['periods'][$periodKey]['formats'][$formatKey]['files'][] = [
        'file_path' => $filePath,
    ];
}

// Reorganizar a un array para enviar al frontend
$output = [];
foreach ($catalog as $type) {
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
    $output[] = $type;
}

echo json_encode($output);
$stmt->close();
