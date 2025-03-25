<?php
// Habilitar reporte de errores
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Configurar cabeceras CORS y tipo de contenido
header('Content-Type: application/json');
require_once 'cors.php';
require_once 'conexion.php';

// Verificar método GET
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    echo json_encode(['error' => 'Método no permitido. Solo se permite GET.']);
    exit;
}

// Obtener company_id de los parámetros
$company_id = isset($_GET['company_id']) ? intval($_GET['company_id']) : null;

// Validar company_id
if (!$company_id) {
    echo json_encode(['error' => 'Se requiere el parámetro company_id']);
    exit;
}

// Consulta SQL segura usando sentencias preparadas
$sql = "SELECT 
            idCIF, 
            RFC, 
            CURP, 
            CorporateName, 
            TradeName, 
            StartDate, 
            Status, 
            PostalCode, 
            RoadName, 
            ExteriorNumber, 
            Neighborhood, 
            Municipality, 
            FederalEntity 
        FROM company_data 
        WHERE company_id = ?";

// Preparar y ejecutar la consulta
if ($stmt = $mysqli->prepare($sql)) {
    $stmt->bind_param('i', $company_id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows > 0) {
        $company_data = $result->fetch_assoc();
        
        // Formatear fecha si existe
        if (isset($company_data['StartDate'])) {
            $company_data['StartDate'] = date('d/m/Y', strtotime($company_data['StartDate']));
        }
        
        echo json_encode(['data' => $company_data]);
    } else {
        echo json_encode(['error' => 'No se encontraron datos para la empresa especificada']);
    }
    
    $stmt->close();
} else {
    echo json_encode(['error' => 'Error en la preparación de la consulta: ' . $mysqli->error]);
}

// Cerrar conexión
$mysqli->close();
?>