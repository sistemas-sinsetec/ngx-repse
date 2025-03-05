<?php
include_once 'cors.php';
include_once 'conexion.php';

header('Content-Type: application/json');

$company_id = $_GET['company_id'];
$user_id = $_GET['user_id'];

try {
    $query = "
        SELECT 
            a.assignment_date,
            a.project_id,
            p.project_name,
            GROUP_CONCAT(DISTINCT a.employee_id) AS employee_ids,
            COUNT(DISTINCT a.employee_id) AS total_empleados
        FROM employee_assignments a
        LEFT JOIN projects p ON a.project_id = p.project_id
        WHERE 
            a.company_id = ?
            AND a.project_status = 'confirmed'
        GROUP BY a.assignment_date, a.project_id
        ORDER BY a.assignment_date DESC
        LIMIT 30
    ";

    $stmt = $mysqli->prepare($query);
    $stmt->bind_param('i', $company_id);
    $stmt->execute();
    
    $result = $stmt->get_result();
    $data = $result->fetch_all(MYSQLI_ASSOC);

    // Formatear la respuesta
    $response = [
        'success' => true,
        'data' => array_map(function($item) {
            return [
                'fecha' => $item['assignment_date'],
                'obra' => [
                    'project_id' => $item['project_id'],
                    'project_name' => $item['project_name']
                ],
                'empleados' => explode(',', $item['employee_ids'])
            ];
        }, $data)
    ];

    echo json_encode($response);

} catch(Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>