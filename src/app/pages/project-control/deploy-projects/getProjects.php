<?php
include "conexion.php";
include "cors.php";

header('Content-Type: application/json');

try {
    // Obtener el cuerpo de la solicitud
    $input = json_decode(file_get_contents('php://input'), true);

    // Verificar si se proporciona el company_id
    if (!isset($input['company_id'])) {
        throw new Exception("El parámetro company_id es requerido.");
    }

    // Obtener el company_id desde el cuerpo de la solicitud
    $company_id = intval($input['company_id']);

    // Consulta SQL para obtener los proyectos filtrados por company_id
    $sql = "SELECT 
                project_id,
                alt_id,
                owned_business_entity_id,
                project_name,
                start_date,
                end_date,
                prospect_campaign_id,
                project_key,
                user_id,
                created_on,
                created_by,
                deleted_on,
                deleted_by,
                segment,
                business_entity_id,
                resources_expenses,
                update_date,
                company_id,
                created_date
            FROM 
                projects
            WHERE 
                company_id = ?";
    
    // Preparar la consulta
    $stmt = $mysqli->prepare($sql);
    if (!$stmt) {
        throw new Exception("Error al preparar la consulta SQL: " . $mysqli->error);
    }

    // Vincular el parámetro company_id
    $stmt->bind_param("i", $company_id);

    // Ejecutar la consulta
    if (!$stmt->execute()) {
        throw new Exception("Error al ejecutar la consulta SQL: " . $stmt->error);
    }

    // Obtener el resultado
    $result = $stmt->get_result();

    // Verificar si hay resultados
    if ($result->num_rows > 0) {
        $data = array();
        while ($row = $result->fetch_assoc()) {
            $data[] = $row;
        }
        echo json_encode(array("data" => $data));
    } else {
        echo json_encode(array("data" => [])); // Si no hay datos, devolver un arreglo vacío
    }

    // Cerrar la consulta
    $stmt->close();
} catch (Exception $e) {
    echo json_encode(array("error" => $e->getMessage()));
}

// Cerrar la conexión
$mysqli->close();
?>