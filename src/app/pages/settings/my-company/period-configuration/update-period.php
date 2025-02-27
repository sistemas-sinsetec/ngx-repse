<?php
header('Content-Type: application/json');

include_once 'cors.php';
include_once 'conexion.php';

$data = json_decode(file_get_contents('php://input'), true);

// Obtener el ID del periodo a actualizar
$period_type_id = intval($data['period_type_id']);

// Obtener los demás datos del periodo
$company_id = intval($data['company_id']);
$period_type_name = $mysqli->real_escape_string($data['period_type_name']);
$period_days = intval($data['period_days']);
$payment_days = intval($data['payment_days']);
$work_period = intval($data['work_period']);
$adjust_calendar_periods = intval($data['adjust_calendar_periods']);
$rest_days_position = json_encode($data['rest_days_position']); // Convertir el array a JSON
$payroll_position = intval($data['payroll_position']);
$fiscal_year_start = $mysqli->real_escape_string($data['fiscal_year_start']);
$payment_frequency = $mysqli->real_escape_string($data['payment_frequency']);
$selected_days = json_encode($data['selected_days']); // Convertir el array de días seleccionados a JSON

// Consulta SQL para actualizar el registro
$sql = "UPDATE period_types 
        SET company_id = $company_id, 
            period_type_name = '$period_type_name', 
            period_days = $period_days, 
            payment_days = $payment_days, 
            work_period = $work_period, 
            adjust_calendar_periods = $adjust_calendar_periods, 
            rest_days_position = '$rest_days_position', 
            payroll_position = $payroll_position, 
            fiscal_year_start = '$fiscal_year_start', 
            payment_frequency = '$payment_frequency',
            selected_days = '$selected_days'
        WHERE period_type_id = $period_type_id";

if ($mysqli->query($sql) === TRUE) {
    if ($mysqli->affected_rows > 0) {
        echo json_encode(['success' => true, 'message' => 'Registro actualizado correctamente']);
    } else {
        echo json_encode(['error' => 'No se encontró el registro con el ID proporcionado']);
    }
} else {
    echo json_encode(['error' => 'Error actualizando el periodo: ' . $mysqli->error]);
}

$mysqli->close();
?>