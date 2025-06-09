<?php
require_once '../cors.php';
require_once '../conexion.php';

$hoy = new DateTime();
$logLines = [];

//  TODO: protección con clave
/*
if ($_GET['key'] !== '1234secret') {
    http_response_code(403);
    exit('Unauthorized');
}
*/

function writeLog(array $lines): void
{
    $logPath = __DIR__ . '/periodos_log.txt';
    $timestamp = (new DateTime())->format('Y-m-d H:i:s');
    $logEntry = "=== [$timestamp] ===\n" . implode("\n", $lines) . "\n\n";
    file_put_contents($logPath, $logEntry, FILE_APPEND);
}

function getInterval(string $type, int $count): ?DateInterval
{
    $type = strtolower($type);

    switch ($type) {
        case 'días':
            return new DateInterval("P{$count}D");
        case 'semanas':
            return new DateInterval("P" . ($count * 7) . "D");
        case 'meses':
            return new DateInterval("P{$count}M");
        case 'años':
            return new DateInterval("P{$count}Y");
        default:
            return null;
    }
}

function isOverlapping(DateTimeInterface $start1, DateTimeInterface $end1, DateTimeInterface $start2, DateTimeInterface $end2): bool
{
    return $start1 <= $end2 && $end1 >= $start2;
}

// Obtener configuraciones periódicas que tienen al menos un periodo generado
$sql = "
  SELECT crf.required_file_id, crf.periodicity_type, crf.periodicity_count,
        crf.company_id, crf.file_type_id, crf.assigned_by
  FROM company_required_files crf
  WHERE crf.is_periodic = 1
    AND crf.periodicity_type IS NOT NULL
    AND crf.periodicity_count IS NOT NULL
    AND crf.end_date IS NULL
    AND EXISTS (
      SELECT 1 FROM document_periods dp WHERE dp.required_file_id = crf.required_file_id
    )
";
$result = $mysqli->query($sql);

while ($row = $result->fetch_assoc()) {
    $required_file_id = (int) $row['required_file_id'];
    $tipo = $row['periodicity_type'];
    $cantidad = (int) $row['periodicity_count'];
    $companyId = (int) $row['company_id'];
    $fileTypeId = (int) $row['file_type_id'];
    $assignedBy = (int) $row['assigned_by'];

    $interval = getInterval($tipo, $cantidad);
    $logCreated = [];


    if (!$interval) {
        $logLines[] = "ID {$required_file_id}: Intervalo inválido.";
        continue;
    }

    // Periodos actuales del mismo required_file_id
    $stmt = $mysqli->prepare("SELECT start_date, end_date FROM document_periods WHERE required_file_id = ?");
    $stmt->bind_param('i', $required_file_id);
    $stmt->execute();
    $periods = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt->close();

    if (empty($periods)) {
        $logLines[] = "ID {$required_file_id}: No hay periodos existentes.";
        continue;
    }


    // Convertir fechas a objetos DateTime
    $existingPeriods = array_map(function ($p) {
        return [
            'start' => new DateTimeImmutable($p['start_date']),
            'end' => new DateTimeImmutable($p['end_date']),
        ];
    }, $periods);

    // Ordenar para obtener el último fin
    usort($existingPeriods, fn($a, $b) => $b['end'] <=> $a['end']);
    $lastEnd = $existingPeriods[0]['end'];
    $nextStart = $lastEnd->modify('+1 day');
    $nuevos = 0;

    // Traer periodos de otras configuraciones activas para el mismo documento
    $stmt = $mysqli->prepare("
        SELECT dp.start_date, dp.end_date
        FROM document_periods dp
        JOIN company_required_files crf2 ON crf2.required_file_id = dp.required_file_id
        WHERE crf2.required_file_id != ?
          AND crf2.company_id = ?
          AND crf2.file_type_id = ?
          AND crf2.assigned_by = ?
          AND crf2.end_date IS NULL
    ");
    $stmt->bind_param('iiii', $required_file_id, $companyId, $fileTypeId, $assignedBy);
    $stmt->execute();
    $otherPeriods = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt->close();

    $externalPeriods = array_map(fn($p) => [
        'start' => new DateTimeImmutable($p['start_date']),
        'end' => new DateTimeImmutable($p['end_date']),
    ], $otherPeriods);

    while (true) {
        $nextEnd = $nextStart->add($interval)->sub(new DateInterval('P1D'));

        if ($nextStart > $hoy) {
            $logLines[] = "ID {$required_file_id}: Se detuvo porque el siguiente inicio es futuro ({$nextStart->format('Y-m-d')}).";
            break;
        }

        // Verificar solapamiento con todos los existentes
        $overlaps = false;
        foreach (array_merge($existingPeriods, $externalPeriods) as $p) {
            if (isOverlapping($nextStart, $nextEnd, $p['start'], $p['end'])) {
                $overlaps = true;
                break;
            }
        }

        if ($overlaps) {
            $logLines[] = "ID {$required_file_id}: Se detuvo por solapamiento con otro periodo.";

            // Asignar end_date a esta configuración
            usort($existingPeriods, fn($a, $b) => $b['end'] <=> $a['end']);
            $lastEndDate = $existingPeriods[0]['end']->format('Y-m-d');

            $stmt = $mysqli->prepare("UPDATE company_required_files SET end_date = ? WHERE required_file_id = ?");
            $stmt->bind_param('si', $lastEndDate, $required_file_id);
            $stmt->execute();
            $stmt->close();

            $logLines[] = "ID {$required_file_id}: Se asignó end_date = {$lastEndDate} en company_required_files.";
            break;
        }


        // Insertar el nuevo periodo
        $stmt = $mysqli->prepare("INSERT INTO document_periods (required_file_id, start_date, end_date, created_at) VALUES (?, ?, ?, NOW())");
        $start_str = $nextStart->format('Y-m-d');
        $end_str = $nextEnd->format('Y-m-d');
        $stmt->bind_param('iss', $required_file_id, $start_str, $end_str);
        $stmt->execute();
        $stmt->close();

        $logCreated[] = "- Periodo generado: {$start_str} al {$end_str}";
        $nuevos++;

        // Añadir el nuevo periodo a la lista de existentes para comparación futura
        $existingPeriods[] = [
            'start' => new DateTimeImmutable($start_str),
            'end' => new DateTimeImmutable($end_str),
        ];

        $nextStart = $nextEnd->modify('+1 day');
    }

    if ($nuevos > 0) {
        $logLines[] = "ID {$required_file_id}: {$nuevos} periodo(s) generado(s).";
        $logLines = array_merge($logLines, $logCreated);
    } else {
        $logLines[] = "ID {$required_file_id}: Sin nuevos periodos generados.";
    }
}

$mysqli->close();
writeLog($logLines);
echo "Generación automática de periodos completada.\n";