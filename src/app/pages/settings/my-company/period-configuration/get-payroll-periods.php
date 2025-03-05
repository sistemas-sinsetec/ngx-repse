<?php

// Incluir el archivo de conexión a la base de datos
require_once 'conexion.php'; // Asegúrate de que el archivo de conexión se llame "conexion.php"
require_once 'cors.php';

// Obtener el company_id y period_type_id de la solicitud
$company_id = $_GET['company_id'];
$period_type_id = $_GET['period_type_id'];

// Validar que los parámetros no estén vacíos
if (empty($company_id) || empty($period_type_id)) {
    http_response_code(400); // Bad Request
    echo json_encode(array("status" => "error", "message" => "Faltan parámetros requeridos."));
    exit;
}

// Consulta para obtener las semanas del periodo
$sql = "SELECT 
          period_number, 
          start_date, 
          end_date, 
          payment_date 
        FROM payroll_periods 
        WHERE company_id = ? AND period_type_id = ?";
$stmt = $mysqli->prepare($sql);

if ($stmt === false) {
    http_response_code(500); // Internal Server Error
    echo json_encode(array("status" => "error", "message" => "Error en la preparación de la consulta."));
    exit;
}

// Vincular los parámetros
$stmt->bind_param("ii", $company_id, $period_type_id);

// Ejecutar la consulta
$stmt->execute();
$result = $stmt->get_result();

$payrollPeriods = array();

if ($result->num_rows > 0) {
    while ($row = $result->fetch_assoc()) {
        $payrollPeriods[] = $row;
    }
}

// Devolver los resultados en formato JSON
echo json_encode($payrollPeriods);

// Cerrar la consulta y la conexión
$stmt->close();
$mysqli->close();
?>