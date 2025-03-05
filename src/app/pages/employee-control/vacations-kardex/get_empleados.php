<?php
include 'conexion.php';

if (!isset($_GET['companyId'])) {
    echo json_encode(["error" => "No se proporcionó companyId"]);
    exit;
}

$companyId = intval($_GET['companyId']); // Asegurar que sea un número entero

$sql = "SELECT IDEmpleado, NombreCompleto FROM empleados WHERE EmpresaID = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $companyId);
$stmt->execute();
$result = $stmt->get_result();

$empleados = [];
while ($row = $result->fetch_assoc()) {
    $empleados[] = $row;
}

echo json_encode($empleados);
?>
