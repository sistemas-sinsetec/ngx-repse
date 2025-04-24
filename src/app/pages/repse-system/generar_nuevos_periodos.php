<?php
require_once 'conexion.php';
require_once 'cors.php';

$hoy = new DateTime();
$diasAntesParaGenerar = 1;

// 1. Obtener configuraciones activas y periódicas
$sqlConfigs = "
    SELECT required_file_id, periodicity_type, periodicity_count
    FROM company_required_files
    WHERE is_periodic = 1 AND is_active = 1
";
$resultConfigs = $mysqli->query($sqlConfigs);

while ($config = $resultConfigs->fetch_assoc()) {
    $required_file_id = $config['required_file_id'];
    $tipo = strtolower($config['periodicity_type']);
    $cantidad = intval($config['periodicity_count']);

    // 2. Obtener el último periodo generado
    $stmtUltimo = $mysqli->prepare("
        SELECT start_date, end_date
        FROM document_periods
        WHERE required_file_id = ?
        ORDER BY end_date DESC
        LIMIT 1
    ");
    $stmtUltimo->bind_param('i', $required_file_id);
    $stmtUltimo->execute();
    $ultimo = $stmtUltimo->get_result()->fetch_assoc();
    $stmtUltimo->close();

    if (!$ultimo)
        continue;

    $fechaFin = new DateTime($ultimo['end_date']);
    $fechaGeneracion = (clone $fechaFin)->modify("-{$diasAntesParaGenerar} days");

    if ($hoy >= $fechaGeneracion) {
        // 3. Calcular nuevo periodo
        $nuevaInicio = (clone $fechaFin)->modify('+1 day');

        switch ($tipo) {
            case 'semanas':
                $interval = "P" . ($cantidad * 7) . "D";
                break;
            case 'meses':
                $interval = "P{$cantidad}M";
                break;
            case 'años':
                $interval = "P{$cantidad}Y";
                break;
            default:
                continue; // Tipo inválido
        }

        $nuevaFin = (clone $nuevaInicio)->add(new DateInterval($interval));

        // 4. Verificar si ya existe ese periodo
        $stmtCheck = $mysqli->prepare("
            SELECT COUNT(*) AS total
            FROM document_periods
            WHERE required_file_id = ? AND start_date = ? AND end_date = ?
        ");
        $start_str = $nuevaInicio->format('Y-m-d');
        $end_str = $nuevaFin->format('Y-m-d');
        $stmtCheck->bind_param('iss', $required_file_id, $start_str, $end_str);
        $stmtCheck->execute();
        $exists = $stmtCheck->get_result()->fetch_assoc()['total'] > 0;
        $stmtCheck->close();

        if (!$exists) {
            // 5. Insertar nuevo periodo
            $stmtInsert = $mysqli->prepare("
                INSERT INTO document_periods
                    (required_file_id, start_date, end_date, created_at)
                VALUES (?, ?, ?, NOW())
            ");
            $stmtInsert->bind_param('iss', $required_file_id, $start_str, $end_str);
            $stmtInsert->execute();
            $stmtInsert->close();
        }
    }
}

$mysqli->close();
echo "Verificación de periodos completa.\n";
