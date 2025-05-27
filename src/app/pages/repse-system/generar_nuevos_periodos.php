<?php
require_once 'cors.php';
require_once 'conexion.php';

$hoy = new DateTime();

function getInterval(string $type, int $count): ?DateInterval
{
    return match (strtolower($type)) {
        'días' => new DateInterval("P{$count}D"),
        'semanas' => new DateInterval("P" . ($count * 7) . "D"),
        'meses' => new DateInterval("P{$count}M"),
        'años' => new DateInterval("P{$count}Y"),
        default => null,
    };
}

// Obtener configuraciones periódicas que tienen al menos un periodo generado
$sql = "
  SELECT crf.required_file_id, crf.periodicity_type, crf.periodicity_count
  FROM company_required_files crf
  WHERE crf.is_periodic = 1
    AND crf.periodicity_type IS NOT NULL
    AND crf.periodicity_count IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM document_periods dp WHERE dp.required_file_id = crf.required_file_id
    )
";
$result = $mysqli->query($sql);


while ($row = $result->fetch_assoc()) {
    $required_file_id = (int) $row['required_file_id'];
    $tipo = $row['periodicity_type'];
    $cantidad = (int) $row['periodicity_count'];
    $interval = getInterval($tipo, $cantidad);
    if (!$interval)
        continue;

    // Obtener el ultimo periodo generado
    $stmt = $mysqli->prepare("SELECT start_date, end_date FROM document_periods WHERE required_file_id = ? ORDER BY end_date DESC LIMIT 1");
    $stmt->bind_param('i', $required_file_id);
    $stmt->execute();
    $ultimo = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$ultimo)
        continue;

    $lastEnd = new DateTime($ultimo['end_date']);
    $nextStart = (clone $lastEnd)->modify('+1 day');
    $nextEnd = (clone $nextStart)->add($interval)->sub(new DateInterval('P1D'));

    // Si el nuevo periodo ya pasó su fecha de fin, no se genera
    if ($nextEnd < $hoy)
        continue;

    // Verificar que no exista ya ese periodo
    $check = $mysqli->prepare("SELECT COUNT(*) AS total FROM document_periods WHERE required_file_id = ? AND start_date = ? AND end_date = ?");
    $start_str = $nextStart->format('Y-m-d');
    $end_str = $nextEnd->format('Y-m-d');
    $check->bind_param('iss', $required_file_id, $start_str, $end_str);
    $check->execute();
    $exists = $check->get_result()->fetch_assoc()['total'] > 0;
    $check->close();

    if (!$exists) {
        $insert = $mysqli->prepare("INSERT INTO document_periods (required_file_id, start_date, end_date, created_at) VALUES (?, ?, ?, NOW())");
        $insert->bind_param('iss', $required_file_id, $start_str, $end_str);
        $insert->execute();
        $insert->close();
    }
}

$mysqli->close();
echo "Generación automática de periodos completada.\n";
