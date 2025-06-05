<?php
require_once 'conexion.php';

$required_file_id = isset($_GET['required_file_id']) ? intval($_GET['required_file_id']) : 0;

if (!$required_file_id) {
    http_response_code(400);
    echo json_encode(['error' => 'Falta el parámetro required_file_id']);
    exit;
}

// 1. Obtener nombre del tipo de documento y rango de fechas
$metaQuery = "
SELECT ft.name AS file_type_name, MIN(dp.start_date) AS start_date, MAX(dp.end_date) AS end_date
FROM company_required_files crf
JOIN file_types ft ON crf.file_type_id = ft.file_type_id
JOIN document_periods dp ON dp.required_file_id = crf.required_file_id
WHERE crf.required_file_id = ?
GROUP BY ft.name
";
$metaStmt = $mysqli->prepare($metaQuery);
$metaStmt->bind_param('i', $required_file_id);
$metaStmt->execute();
$metaResult = $metaStmt->get_result()->fetch_assoc();
$metaStmt->close();

if (!$metaResult) {
    http_response_code(404);
    echo json_encode(['error' => 'No se encontró el documento requerido']);
    exit;
}

$tipoDocumento = preg_replace('/[^a-zA-Z0-9_-]/', '_', $metaResult['file_type_name']);
$start = str_replace('-', '', $metaResult['start_date']);
$end = str_replace('-', '', $metaResult['end_date']);
$zipFileName = "{$tipoDocumento}_({$start}_{$end}).zip";

// 2. Obtener archivos aprobados
$sql = "
SELECT 
    cf.file_id,
    cf.file_path,
    cf.uploaded_at,
    cf.expiry_date,
    ft.name AS file_type_name,
    ft.notify_day,
    r.name AS required_file_name
FROM company_files cf
JOIN file_types ft ON cf.file_type_id = ft.file_type_id
JOIN company_required_files r ON cf.required_file_id = r.required_file_id
WHERE cf.company_id = ? AND cf.status = 'approved'
";

$stmt = $mysqli->prepare($sql);
$stmt->bind_param('i', $required_file_id);
$stmt->execute();
$result = $stmt->get_result();

$archivos = [];
while ($row = $result->fetch_assoc()) {
    $archivos[] = $row;
}
$stmt->close();

if (empty($archivos)) {
    http_response_code(404);
    echo json_encode(['error' => 'No se encontraron archivos aprobados']);
    exit;
}

// 3. Crear ZIP temporal
$zip = new ZipArchive();
$tmpZipPath = sys_get_temp_dir() . "/$zipFileName";

if ($zip->open($tmpZipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
    http_response_code(500);
    echo json_encode(['error' => 'No se pudo crear el archivo ZIP']);
    exit;
}

// 4. Agregar archivos dentro de carpetas por formato
foreach ($archivos as $file) {
    $fullPath = __DIR__ . '/../documents/' . $file['file_path'];
    if (!file_exists($fullPath))
        continue;

    $formato = strtolower($file['file_ext']);
    $nombreArchivo = basename($file['file_path']);
    $rutaInterna = "{$formato}/{$nombreArchivo}";

    $zip->addFile($fullPath, $rutaInterna);
}

$zip->close();

// 5. Enviar el archivo ZIP al navegador
header('Content-Type: application/zip');
header("Content-Disposition: attachment; filename=\"$zipFileName\"");
header('Content-Length: ' . filesize($tmpZipPath));
readfile($tmpZipPath);
unlink($tmpZipPath);
exit;
