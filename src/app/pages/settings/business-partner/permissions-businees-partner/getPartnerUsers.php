<?php
// getPartnerUsers.php
include_once 'cors.php';
include_once 'conexion.php';

header('Content-Type: application/json');

$data = json_decode(file_get_contents("php://input"));

if (!isset($data->partnerId)) {
    echo json_encode(['success' => false, 'message' => 'ID de socio requerido']);
    exit;
}

$partnerId = filter_var($data->partnerId, FILTER_SANITIZE_NUMBER_INT);

try {
    $sql = "SELECT 
                u.id,
                u.name,
                u.email,
                u.phone,
                r.roleName as role,
                u.creation_date as fecha_registro
            FROM user_company_roles ucr
            INNER JOIN users u ON ucr.user_id = u.id
            INNER JOIN roles r ON ucr.role_id = r.id
            WHERE ucr.company_id = ?";
    
    // Verificar si la preparación fue exitosa
    if (!($stmt = $mysqli->prepare($sql))) {
        throw new Exception("Error en preparación: " . $mysqli->error);
    }
    
    // Verificar bind_param
    if (!$stmt->bind_param("i", $partnerId)) {
        throw new Exception("Error en bind_param: " . $stmt->error);
    }
    
    // Verificar ejecución
    if (!$stmt->execute()) {
        throw new Exception("Error en ejecución: " . $stmt->error);
    }
    
    $result = $stmt->get_result();
    $users = [];
    
    while ($row = $result->fetch_assoc()) {
        $users[] = [
            'id' => $row['id'],
            'name' => $row['name'],
            'email' => $row['email'],
            'phone' => $row['phone'],
            'role' => $row['role'],
            'fecha_registro' => $row['fecha_registro']
        ];
    }
    
    echo json_encode([
        'success' => true,
        'users' => $users
    ]);

} catch (Exception $e) {
    error_log($e->getMessage()); // Registrar error en el servidor
    echo json_encode([
        'success' => false,
        'message' => 'Error del servidor: ' . $e->getMessage()
    ]);
} finally {
    if (isset($stmt)) $stmt->close();
    $mysqli->close();
}
?>