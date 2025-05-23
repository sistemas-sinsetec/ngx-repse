<?php
header('Content-Type: application/json');
require_once 'cors.php';
require_once 'conexion.php';

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';

    if ($action === 'submit_uploads') {
        $required_file_id = intval($_POST['required_file_id']);
        $period_id = intval($_POST['period_id']);
        $format_code = trim($_POST['format_code']);

        $stmt = $mysqli->prepare("
            SELECT cf.file_id, cf.file_path 
            FROM company_files cf
            JOIN document_periods dp ON cf.period_id = dp.period_id
            WHERE dp.required_file_id = ? AND cf.period_id = ? AND cf.file_ext = ? AND cf.status = 'uploaded'
        ");

        $stmt->bind_param("iis", $required_file_id, $period_id, $format_code);
        $stmt->execute();
        $result = $stmt->get_result();

        while ($row = $result->fetch_assoc()) {
            $oldPath = __DIR__ . '/../documents/' . $row['file_path'];
            $newPath = str_replace('/cargados/', '/subidos/', $oldPath);

            $newDir = dirname($newPath);
            if (!file_exists($newDir))
                mkdir($newDir, 0777, true);

            if (file_exists($oldPath)) {
                rename($oldPath, $newPath);
            }

            $newRelativePath = str_replace('/cargados/', '/subidos/', $row['file_path']);
            $update = $mysqli->prepare("UPDATE company_files SET file_path = ?, status = 'pending' WHERE file_id = ?");
            $update->bind_param("si", $newRelativePath, $row['file_id']);
            $update->execute();
            $update->close();
        }

        $stmt->close();
        echo json_encode(['success' => true]);
        exit;
    }

    if ($action === 'approve') {
        $file_id = intval($_POST['file_id']);

        // Obtener la ruta actual
        $stmt = $mysqli->prepare("SELECT file_path FROM company_files WHERE file_id = ?");
        $stmt->bind_param("i", $file_id);
        $stmt->execute();
        $result = $stmt->get_result();
        $file = $result->fetch_assoc();
        $stmt->close();

        if (!$file || !$file['file_path']) {
            echo json_encode(['success' => false, 'error' => 'Archivo no encontrado']);
            exit;
        }

        $oldPath = __DIR__ . '/../documents/' . $file['file_path'];

        if (!file_exists($oldPath)) {
            echo json_encode(['success' => false, 'error' => 'Archivo no existe físicamente']);
            exit;
        }

        // Nueva ruta (reemplaza "/subidos/" por "/aprobados/")
        $newPath = str_replace('/subidos/', '/aprobados/', $oldPath);
        $newDir = dirname($newPath);

        if (!file_exists($newDir)) {
            mkdir($newDir, 0777, true);
        }

        if (!rename($oldPath, $newPath)) {
            echo json_encode(['success' => false, 'error' => 'Error al mover archivo']);
            exit;
        }

        $newRelativePath = str_replace('/subidos/', '/aprobados/', $file['file_path']);

        // Actualizar DB
        $stmt = $mysqli->prepare("UPDATE company_files SET file_path = ?, status = 'approved' WHERE file_id = ?");
        $stmt->bind_param("si", $newRelativePath, $file_id);
        $stmt->execute();
        $stmt->close();

        echo json_encode(['success' => true]);
        exit;
    }

    if ($action === 'reject') {
        $file_id = intval($_POST['file_id']);
        $comment = $_POST['comment'] ?? '';

        // Obtener la ruta actual
        $stmt = $mysqli->prepare("SELECT file_path FROM company_files WHERE file_id = ?");
        $stmt->bind_param("i", $file_id);
        $stmt->execute();
        $result = $stmt->get_result();
        $file = $result->fetch_assoc();
        $stmt->close();

        if (!$file || !$file['file_path']) {
            echo json_encode(['success' => false, 'error' => 'Archivo no encontrado']);
            exit;
        }

        $oldPath = __DIR__ . '/../documents/' . $file['file_path'];

        if (!file_exists($oldPath)) {
            echo json_encode(['success' => false, 'error' => 'Archivo no existe físicamente']);
            exit;
        }

        // Nueva ruta (reemplaza "/subidos/" por "/rechazados/")
        $newPath = str_replace('/subidos/', '/rechazados/', $oldPath);
        $newDir = dirname($newPath);

        if (!file_exists($newDir)) {
            mkdir($newDir, 0777, true);
        }

        if (!rename($oldPath, $newPath)) {
            echo json_encode(['success' => false, 'error' => 'Error al mover archivo']);
            exit;
        }

        $newRelativePath = str_replace('/subidos/', '/rechazados/', $file['file_path']);

        // Actualizar DB
        $stmt = $mysqli->prepare("UPDATE company_files SET file_path = ?, status = 'rejected', comment = ? WHERE file_id = ?");
        $stmt->bind_param("ssi", $newRelativePath, $comment, $file_id);
        $stmt->execute();
        $stmt->close();

        echo json_encode(['success' => true]);
        exit;
    }

    if ($action === 'acknowledge') {
        $file_id = intval($_POST['file_id']);
        $stmt = $mysqli->prepare("SELECT file_path FROM company_files WHERE file_id = ?");
        $stmt->bind_param("i", $file_id);
        $stmt->execute();
        $result = $stmt->get_result();
        $file = $result->fetch_assoc();
        $stmt->close();

        if ($file) {
            $path = __DIR__ . '/../documents/' . $file['file_path'];
            if (file_exists($path)) {
                unlink($path);
            }
            $stmt = $mysqli->prepare("UPDATE company_files SET file_path = '', is_current = 0, status = 'acknowledged' WHERE file_id = ?");
            $stmt->bind_param("i", $file_id);
            $stmt->execute();
            $stmt->close();
            echo json_encode(['success' => true]);
        } else {
            echo json_encode(['success' => false, 'error' => 'File not found']);
        }
        exit;
    }

    if ($action === 'delete_uploaded') {
        $file_path = $_POST['file_path'] ?? '';

        if (!$file_path) {
            echo json_encode(['success' => false, 'error' => 'Missing file_path']);
            exit;
        }

        // Buscar el archivo en la base de datos
        $stmt = $mysqli->prepare("SELECT file_id FROM company_files WHERE file_path = ? AND status IN ('uploaded', 'pending')");
        $stmt->bind_param("s", $file_path);
        $stmt->execute();
        $result = $stmt->get_result();
        $file = $result->fetch_assoc();
        $stmt->close();

        if (!$file) {
            echo json_encode(['success' => false, 'error' => 'Archivo no encontrado o no eliminable']);
            exit;
        }

        // Eliminar archivo físico
        $absolutePath = __DIR__ . '/../documents/' . $file_path;
        if (file_exists($absolutePath)) {
            unlink($absolutePath);
        }

        // Eliminar registro
        $stmt = $mysqli->prepare("DELETE FROM company_files WHERE file_id = ?");
        $stmt->bind_param("i", $file['file_id']);
        $stmt->execute();
        $stmt->close();

        echo json_encode(['success' => true]);
        exit;
    }

    if ($action === 'submit_uploaded') {
        $required_file_id = intval($_POST['required_file_id']);
        $period_id = intval($_POST['period_id']);

        $stmt = $mysqli->prepare("
            SELECT cf.file_id, cf.file_path 
            FROM company_files cf
            JOIN document_periods dp ON cf.period_id = dp.period_id
            WHERE dp.required_file_id = ? AND cf.period_id = ? AND cf.status = 'uploaded'
        ");

        if (!$stmt) {
            echo json_encode(['success' => false, 'error' => 'Prepare failed: ' . $mysqli->error]);
            exit;
        }

        $stmt->bind_param("ii", $required_file_id, $period_id);
        $stmt->execute();
        $result = $stmt->get_result();

        while ($row = $result->fetch_assoc()) {
            $oldPath = __DIR__ . '/../documents/' . $row['file_path'];

            if (strpos($oldPath, '/cargados/') === false) {
                continue;
            }

            $newPath = str_replace('/cargados/', '/subidos/', $oldPath);

            $newDir = dirname($newPath);
            if (!file_exists($newDir)) {
                mkdir($newDir, 0777, true);
            }

            if (file_exists($oldPath)) {
                if (!rename($oldPath, $newPath)) {
                    echo json_encode(['success' => false, 'error' => 'Error al mover archivo: ' . $oldPath]);
                    exit;
                }
            }

            $newRelativePath = str_replace('/cargados/', '/subidos/', $row['file_path']);
            $update = $mysqli->prepare("UPDATE company_files SET file_path = ?, status = 'pending' WHERE file_id = ?");
            $update->bind_param("si", $newRelativePath, $row['file_id']);
            $update->execute();
            $update->close();
        }

        $stmt->close();
        echo json_encode(['success' => true]);
        exit;
    }


    if (!isset($_FILES['file'])) {
        echo json_encode(['success' => false, 'error' => 'No file uploaded']);
        exit;
    }

    $file = $_FILES['file'];
    $required_file_id = intval($_POST['required_file_id'] ?? 0);
    $period_id = intval($_POST['period_id'] ?? 0);
    $format_code = strtolower(trim($_POST['format_code'] ?? ''));

    if (!$required_file_id || !$format_code) {
        echo json_encode(['success' => false, 'error' => 'Missing parameters']);
        exit;
    }

    // Get company info and required file type name
    $stmt = $mysqli->prepare("
    SELECT c.id AS company_id, c.nameCompany AS company_name, ft.name AS required_file_name
    FROM company_required_files crf
    JOIN companies c ON crf.company_id = c.id
    JOIN file_types ft ON crf.file_type_id = ft.file_type_id
    WHERE crf.required_file_id = ?
");

    if (!$stmt) {
        echo json_encode(['success' => false, 'error' => 'Prepare failed (company query): ' . $mysqli->error]);
        exit;
    }

    $stmt->bind_param("i", $required_file_id);

    if (!$stmt->execute()) {
        echo json_encode(['success' => false, 'error' => 'Execute failed (company query): ' . $stmt->error]);
        $stmt->close();
        exit;
    }

    $result = $stmt->get_result();
    $company = $result->fetch_assoc();
    $stmt->close();

    if (!$company) {
        echo json_encode(['success' => false, 'error' => 'Invalid required_file_id or company not found']);
        exit;
    }

    $company_id = $company['company_id'];
    $company_name = $company['company_name'] ?: 'UnknownCompany';
    $required_file_name = $company['required_file_name'] ?: 'UnknownFile';
    $company_name = preg_replace('/[^a-zA-Z0-9_-]/', '', str_replace(' ', '_', $company_name));
    $required_file_name = preg_replace('/[^a-zA-Z0-9_-]/', '', str_replace(' ', '_', $required_file_name));

    // Get period info
    $period_range = 'sin_periodicidad';
    if ($period_id) {
        $stmt = $mysqli->prepare("SELECT start_date, end_date FROM document_periods WHERE period_id = ?");
        $stmt->bind_param("i", $period_id);
        $stmt->execute();
        $period = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        if ($period) {
            if ($period['end_date'] === '9999-12-31') {
                $period_range = 'sin_periodicidad';
            } else {
                $period_range = $period['start_date'] . '_' . $period['end_date'];
            }
        }
    }

    $company_dir = "{$company_id}-{$company_name}";
    $required_file_dir = "{$required_file_id}-{$required_file_name}";
    $period_dir = $period_range;
    $format_dir = $format_code;

    $base_dir = __DIR__ . "/../documents/$company_dir/$required_file_dir/$period_dir/$format_dir/cargados";

    if (!file_exists($base_dir)) {
        if (!mkdir($base_dir, 0777, true)) {
            echo json_encode(['success' => false, 'error' => 'Failed to create directory']);
            exit;
        }
    }

    // Build new file name
    $file_ext = pathinfo($file['name'], PATHINFO_EXTENSION) ?: 'unknown';
    $timestamp = date('Ymd\THis');
    $file_name = "{$company_id}_{$required_file_id}_{$period_id}_{$timestamp}.{$file_ext}";
    $file_path = "$base_dir/$file_name";

    if (!move_uploaded_file($file['tmp_name'], $file_path)) {
        echo json_encode(['success' => false, 'error' => 'Failed to save file']);
        exit;
    }

    $relative_path = "$company_dir/$required_file_dir/$period_dir/$format_dir/cargados/$file_name";
    $user_id = 1; // Replace with actual user ID if available

    $issue_date = $_POST['issue_date'] ?? null;
    $expiry_date = $_POST['expiry_date'] ?? null;

    $today = date('Y-m-d');
    // Validar que tengan formato YYYY-MM-DD
    $validDateFormat = function ($date) {
        return preg_match('/^\d{4}-\d{2}-\d{2}$/', $date);
    };

    // Usar la fecha de fin del periodo como default si no se proporciona
    $period_end = $period['end_date'] ?? $today;

    if (!$issue_date || !$validDateFormat($issue_date)) {
        $issue_date = $today;
    }

    if (!$expiry_date || !$validDateFormat($expiry_date)) {
        $expiry_date = $period_end;
    }

    $query = "
    INSERT INTO company_files (file_path, issue_date, expiry_date, user_id, status, is_current, period_id)
    VALUES (?, ?, ?, ?, 'uploaded', 1, ?)
    ";
    $stmt = $mysqli->prepare($query);

    if (!$stmt) {
        echo json_encode(['success' => false, 'error' => 'Prepare failed: ' . $mysqli->error, 'query' => $query]);
        exit;
    }

    $stmt->bind_param("sssii", $relative_path, $issue_date, $expiry_date, $user_id, $period_id);

    if (!$stmt->execute()) {
        echo json_encode(['success' => false, 'error' => 'Database insert failed: ' . $stmt->error]);
        $stmt->close();
        exit;
    }

    $stmt->close();

    echo json_encode(['success' => true]);
    exit;

}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $statusParam = $_GET['status'] ?? 'pending';
    $statuses = explode(',', $statusParam);

    $required_file_id = isset($_GET['required_file_id']) ? intval($_GET['required_file_id']) : null;
    $period_id = isset($_GET['period_id']) ? intval($_GET['period_id']) : null;

    $where = [];
    $params = [];
    $types = '';

    if (!in_array('all', $statuses)) {
        $placeholders = implode(',', array_fill(0, count($statuses), '?'));
        $where[] = "cf.status IN ($placeholders)";
        $types .= str_repeat('s', count($statuses));
        $params = array_merge($params, $statuses);
    }

    if ($required_file_id !== null) {
        $where[] = "dp.required_file_id = ?";
        $types .= 'i';
        $params[] = $required_file_id;
    }

    if ($period_id !== null) {
        $where[] = "cf.period_id = ?";
        $types .= 'i';
        $params[] = $period_id;
    }

    $sql = "
        SELECT cf.file_id, cf.file_path, cf.issue_date, cf.expiry_date, 
               cf.user_id, cf.status, cf.comment, cf.is_current, cf.uploaded_at, cf.period_id,
               dp.start_date, dp.end_date, dp.required_file_id,
               ft.name AS file_type_name, ft.description AS file_type_description,
               cf.file_ext
        FROM company_files cf
        LEFT JOIN document_periods dp ON cf.period_id = dp.period_id
        LEFT JOIN company_required_files crf ON dp.required_file_id = crf.required_file_id
        LEFT JOIN file_types ft ON crf.file_type_id = ft.file_type_id
    ";

    if (!empty($where)) {
        $sql .= ' WHERE ' . implode(' AND ', $where);
    }

    $stmt = $mysqli->prepare($sql);
    if ($types) {
        $stmt->bind_param($types, ...$params);
    }

    $stmt->execute();
    $result = $stmt->get_result();
    $documents = [];
    while ($row = $result->fetch_assoc()) {
        $documents[] = $row;
    }
    echo json_encode($documents);
    $stmt->close();
    exit;
}




echo json_encode(['success' => false, 'error' => 'Invalid request']);
