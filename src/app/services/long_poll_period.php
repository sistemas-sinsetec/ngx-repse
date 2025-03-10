<?php
header('Content-Type: application/json');
require_once 'cors.php';
require_once 'conexion.php';

// Verificar si se ha pasado el parámetro company_id
if (!isset($_GET['company_id'])) {
    echo json_encode(['error' => 'company_id parameter is required']);
    exit;
}

$company_id = intval($_GET['company_id']);
$lastTimestamp = isset($_GET['lastTimestamp']) ? $_GET['lastTimestamp'] : null;

$timeout = 30; // Tiempo máximo de espera en segundos
$start_time = time();

while (true) {
    // Consulta SQL para obtener el tipo de período más reciente para la empresa
    $sql = "
        SELECT period_type_id, period_type_name, fiscal_year, fiscal_year_start, rest_days_position, timestamp
        FROM period_types 
        WHERE company_id = ?
        ORDER BY timestamp DESC LIMIT 1
    ";

    $stmt = $mysqli->prepare($sql);
    $stmt->bind_param("i", $company_id);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows > 0) {
        $row = $result->fetch_assoc();
        $row['rest_days_position'] = json_decode($row['rest_days_position'], true); // Convertir a array si es JSON
        
        // Si el timestamp ha cambiado, devolver el nuevo periodo inmediatamente
        if ($row['timestamp'] !== $lastTimestamp) {
            echo json_encode($row);
            $stmt->close();
            $mysqli->close();
            exit;
        }
    }

    $stmt->close();

    // Si no hay cambios después de 30 segundos, responder con null
    if (time() - $start_time > $timeout) {
        echo json_encode(null);
        $mysqli->close();
        exit;
    }

    usleep(500000); // Esperar 0.5 segundos antes de volver a consultar
}
?>
