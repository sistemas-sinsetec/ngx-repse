<?php

// Incluir el archivo de conexión a la base de datos
require_once 'conexion.php'; // Asegúrate de que el archivo de conexión se llame "conexion.php"
require_once 'cors.php';

// Obtener los datos enviados en el cuerpo de la solicitud POST
$data = json_decode(file_get_contents("php://input"), true);

// Validar que los datos no estén vacíos
if (empty($data)) {
    http_response_code(400); // Bad Request
    echo json_encode(array("status" => "error", "message" => "No se recibieron datos para actualizar."));
    exit;
}

// Extraer los datos del período
$period_type_id = $data['period_type_id']; // ID del tipo de período
$company_id = $data['company_id']; // ID de la compañía
$period_number = $data['period_number']; // Número del período
$start_date = $data['start_date']; // Fecha de inicio
$end_date = $data['end_date']; // Fecha de fin
$payment_date = $data['payment_date']; // Fecha de pago
$fiscal_year = $data['fiscal_year']; // Año fiscal
$month = $data['month']; // Mes
$imss_bimonthly_start = $data['imss_bimonthly_start'] ? 1 : 0; // Convertir a entero (0 o 1)
$imss_bimonthly_end = $data['imss_bimonthly_end'] ? 1 : 0; // Convertir a entero (0 o 1)
$month_start = $data['month_start'] ? 1 : 0; // Convertir a entero (0 o 1)
$month_end = $data['month_end'] ? 1 : 0; // Convertir a entero (0 o 1)
$fiscal_start = $data['fiscal_start'] ? 1 : 0; // Convertir a entero (0 o 1)
$fiscal_end = $data['fiscal_end'] ? 1 : 0; // Convertir a entero (0 o 1)
$payment_days = $data['payment_days']; // Días de pago

// Validar que los campos obligatorios no estén vacíos
if (empty($period_type_id) || empty($company_id) || empty($period_number) || empty($start_date) || empty($end_date)) {
    http_response_code(400); // Bad Request
    echo json_encode(array("status" => "error", "message" => "Faltan campos obligatorios."));
    exit;
}

// Consulta SQL para actualizar el período
$sql = "UPDATE payroll_periods 
        SET 
            start_date = ?, 
            end_date = ?, 
            payment_date = ?, 
            fiscal_year = ?, 
            month = ?, 
            imss_bimonthly_start = ?, 
            imss_bimonthly_end = ?, 
            month_start = ?, 
            month_end = ?, 
            fiscal_start = ?, 
            fiscal_end = ?, 
            payment_days = ?
        WHERE 
            company_id = ? 
            AND period_type_id = ? 
            AND period_number = ?";

$stmt = $mysqli->prepare($sql);

if ($stmt === false) {
    http_response_code(500); // Internal Server Error
    echo json_encode(array("status" => "error", "message" => "Error en la preparación de la consulta."));
    exit;
}

// Vincular los parámetros
$stmt->bind_param(
    "ssssiiiiiiiisii", // Tipos de datos: s = string, i = integer
    $start_date,
    $end_date,
    $payment_date,
    $fiscal_year,
    $month,
    $imss_bimonthly_start,
    $imss_bimonthly_end,
    $month_start,
    $month_end,
    $fiscal_start,
    $fiscal_end,
    $payment_days,
    $company_id,
    $period_type_id,
    $period_number
);

// Ejecutar la consulta
if ($stmt->execute()) {
    // Verificar si se actualizó alguna fila
    if ($stmt->affected_rows > 0) {
        http_response_code(200); // OK
        echo json_encode(array("status" => "success", "message" => "Período actualizado correctamente."));
    } else {
        http_response_code(404); // Not Found
        echo json_encode(array("status" => "error", "message" => "No se encontró el período para actualizar."));
    }
} else {
    http_response_code(500); // Internal Server Error
    echo json_encode(array("status" => "error", "message" => "Error al ejecutar la consulta."));
}

// Cerrar la consulta y la conexión
$stmt->close();
$mysqli->close();
?>