<?php
include 'conexion.php';

$empleadoId = $_GET['empleadoId'];

$sql = "SELECT * FROM kardex_vacaciones WHERE IDEmpleado = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $empleadoId);
$stmt->execute();
$result = $stmt->get_result();

$vacaciones = [];
while ($row = $result->fetch_assoc()) {
    $vacaciones[] = $row;
}

echo json_encode(["Vacaciones" => $vacaciones]);
?>
