<?php
// getCommercialPartners.php
include_once 'cors.php';
include_once 'conexion.php';

header('Content-Type: application/json');

// Obtener compañía del cuerpo de la solicitud
$data = json_decode(file_get_contents("php://input"));

if (!isset($data->companyId)) {
    echo json_encode([
        'success' => false,
        'message' => 'ID de compañía requerido'
    ]);
    exit;
}

$companyId = filter_var($data->companyId, FILTER_SANITIZE_NUMBER_INT);

try {
    // Obtener socios comerciales
    $sql = "SELECT DISTINCT c.id, c.nameCompany, c.rfc, r.roleName as role 
            FROM user_company_roles ucr
            INNER JOIN companies c ON ucr.association_id = c.id
            INNER JOIN roles r ON ucr.role_id = r.id
            WHERE ucr.company_id = ?";
    
    $stmt = $mysqli->prepare($sql);
    $stmt->bind_param("i", $companyId);
    $stmt->execute();
    
    $result = $stmt->get_result();
    $partners = [];
    
    while ($row = $result->fetch_assoc()) {
        $partners[] = [
            'id' => $row['id'],
            'nameCompany' => $row['nameCompany'],
            'rfc' => $row['rfc'],
            'role' => $row['role']
        ];
    }
    
    if (count($partners) === 0) {
        echo json_encode([
            'success' => true,
            'message' => 'No se encontraron socios comerciales',
            'partners' => []
        ]);
        exit;
    }
    
    echo json_encode([
        'success' => true,
        'partners' => $partners
    ]);

} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Error al obtener socios: ' . $e->getMessage()
    ]);
} finally {
    $mysqli->close();
}
?>