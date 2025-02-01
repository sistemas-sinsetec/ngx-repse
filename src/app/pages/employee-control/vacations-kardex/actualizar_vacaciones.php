<?php
include 'conexion.php';

// Obtener datos de la petición
$data = json_decode(file_get_contents("php://input"), true);

if (!isset($data['empleadoId']) || !isset($data['dias']) || !isset($data['companyId'])) {
    echo json_encode(["error" => "Datos incompletos"]);
    exit;
}

$empleadoId = intval($data['empleadoId']);
$dias = intval($data['dias']);
$companyId = intval($data['companyId']);

// Validar que el empleado pertenece a la empresa antes de actualizar
$checkSql = "SELECT EmpresaID FROM empleados WHERE IDEmpleado = ?";
$checkStmt = $conn->prepare($checkSql);
$checkStmt->bind_param("i", $empleadoId);
$checkStmt->execute();
$checkResult = $checkStmt->get_result();

if ($checkResult->num_rows === 0) {
    echo json_encode(["error" => "Empleado no encontrado"]);
    exit;
}

$empleado = $checkResult->fetch_assoc();
if ($empleado['EmpresaID'] !== $companyId) {
    echo json_encode(["error" => "El empleado no pertenece a la empresa seleccionada"]);
    exit;
}

// Actualizar las vacaciones si la validación fue exitosa
$updateSql = "UPDATE kardex_vacaciones SET Tomadas = ? WHERE IDEmpleado = ? AND Concepto = 'Vacaciones tomadas antes de la alta'";
$updateStmt = $conn->prepare($updateSql);
$updateStmt->bind_param("ii", $dias, $empleadoId);

if ($updateStmt->execute()) {
    echo json_encode(["success" => "Vacaciones actualizadas correctamente"]);
} else {
    echo json_encode(["error" => "Error al actualizar vacaciones"]);
}
?>
