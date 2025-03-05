<?php
header('Content-Type: application/json');

// Incluir archivos de conexión
require_once 'cors.php';
require_once 'conexion.php';

// Verificar si se ha pasado el parámetro company_id
if (!isset($_GET['company_id'])) {
    echo json_encode(['error' => 'company_id parameter is required']);
    exit;
}

$company_id = intval($_GET['company_id']);
$period_type_id = isset($_GET['period_type_id']) ? intval($_GET['period_type_id']) : null;

// Construir la consulta SQL para obtener el período más reciente
$sql = "
    SELECT period_id, period_type_id, period_type_name, fiscal_year, fiscal_year_start, rest_days_position 
    FROM period_types
    WHERE company_id = ?
";

if ($period_type_id) {
    $sql .= " AND period_type_id = ?";
}

$sql .= " ORDER BY fiscal_year DESC, fiscal_year_start DESC LIMIT 1"; // Tomar el período más reciente

$stmt = $mysqli->prepare($sql);

if ($period_type_id) {
    $stmt->bind_param("ii", $company_id, $period_type_id);
} else {
    $stmt->bind_param("i", $company_id);
}

$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows > 0) {
    $period = $result->fetch_assoc();
    echo json_encode($period);
} else {
    echo json_encode(['error' => 'No period found']);
}

$stmt->close();
$mysqli->close();
?>
