<?php
include 'conexion.php'; // Tu archivo de conexión a la base de datos
include 'cors.php';     // Si usas CORS

header('Content-Type: application/json');

try {
    // Obtener los datos del cuerpo de la petición
    $input = json_decode(file_get_contents('php://input'), true);

    if (!isset($input['company_id'], $input['period_type_id'], $input['week_number'])) {
        throw new Exception('Faltan parámetros requeridos.');
    }

    $companyId = intval($input['company_id']);
    $periodTypeId = intval($input['period_type_id']);
    $weekNumber = intval($input['week_number']);

    // Buscar el registro a eliminar
    $stmt = $mysqli->prepare("SELECT week_confirmation_id FROM week_confirmations 
        WHERE company_id = ? AND period_type_id = ? AND week_number = ?");
    $stmt->bind_param("iii", $companyId, $periodTypeId, $weekNumber);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 0) {
        echo json_encode([
            'success' => false,
            'message' => 'No se encontró ninguna confirmación para esa semana.'
        ]);
        exit;
    }

    // Eliminar el registro encontrado
    $stmt = $mysqli->prepare("DELETE FROM week_confirmations 
        WHERE company_id = ? AND period_type_id = ? AND week_number = ?");
    $stmt->bind_param("iii", $companyId, $periodTypeId, $weekNumber);
    $stmt->execute();

    echo json_encode([
        'success' => true,
        'message' => 'Confirmación de semana eliminada correctamente.'
    ]);
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Error al deshacer confirmación: ' . $e->getMessage()
    ]);
}
