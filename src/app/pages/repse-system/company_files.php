<?php
header('Content-Type: application/json');
require_once 'cors.php';
require_once 'conexion.php';

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

function safe_prepare($mysqli, $query, $error_context = '')
{
    $stmt = $mysqli->prepare($query);
    if (!$stmt) {
        echo json_encode([
            'success' => false,
            'error' => "Prepare failed ($error_context): " . $mysqli->error
        ]);
        exit;
    }
    return $stmt;
}

function safe_execute($stmt, $error_context = '')
{
    if (!$stmt->execute()) {
        echo json_encode([
            'success' => false,
            'error' => "Execute failed ($error_context): " . $stmt->error
        ]);
        $stmt->close();
        exit;
    }
}

function bind_and_execute($stmt, $types, ...$params)
{
    if (!$stmt->bind_param($types, ...$params)) {
        echo json_encode([
            'success' => false,
            'error' => 'bind_param failed: ' . $stmt->error
        ]);
        exit;
    }
    safe_execute($stmt);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';

    // ===> INSERTAR AQUÍ EL NUEVO BLOQUE DE ACCIÓN <===
    if ($action === 'submit_multiple_files') {
        $file_ids_str = $_POST['file_ids'] ?? '';
        $file_ids = array_map('intval', explode(',', $file_ids_str));
        $file_ids = array_filter($file_ids, function($id) { return $id > 0; });

        if (empty($file_ids)) {
            echo json_encode(['success' => false, 'error' => 'No valid file IDs provided']);
            exit;
        }

        // 1. Obtener los archivos
        $placeholders = implode(',', array_fill(0, count($file_ids), '?'));
        $types = str_repeat('i', count($file_ids));
        
        $stmt = safe_prepare(
            $mysqli,
            "SELECT file_id, file_path FROM company_files WHERE file_id IN ($placeholders) AND status = 'uploaded'",
            'submit_multiple_files select'
        );
        $stmt->bind_param($types, ...$file_ids);
        safe_execute($stmt, 'submit_multiple_files select');
        $result = $stmt->get_result();
        $files_to_update = [];
        $file_ids_found = [];
        
        while ($row = $result->fetch_assoc()) {
            $file_ids_found[] = $row['file_id'];
            $files_to_update[] = $row;
        }
        $stmt->close();

        // 2. Mover archivos físicos
        foreach ($files_to_update as $row) {
            $oldPath = __DIR__ . '/../documents/' . $row['file_path'];
            $newPath = str_replace('/cargados/', '/subidos/', $oldPath);

            $newDir = dirname($newPath);
            if (!file_exists($newDir)) {
                mkdir($newDir, 0777, true);
            }

            if (file_exists($oldPath)) {
                rename($oldPath, $newPath);
            }
        }

        // 3. Actualizar la base de datos
        if (!empty($file_ids_found)) {
            $placeholders_update = implode(',', array_fill(0, count($file_ids_found), '?'));
            $types_update = str_repeat('i', count($file_ids_found));
            
            $update_sql = "UPDATE company_files 
                           SET file_path = REPLACE(file_path, '/cargados/', '/subidos/'),
                               status = 'pending' 
                           WHERE file_id IN ($placeholders_update)";
            
            $update_stmt = safe_prepare($mysqli, $update_sql, 'submit_multiple_files update');
            $update_stmt->bind_param($types_update, ...$file_ids_found);
            safe_execute($update_stmt, 'submit_multiple_files update');
            $update_stmt->close();
        }

        echo json_encode(['success' => true, 'updated_count' => count($file_ids_found)]);
        exit;
    }

    
    // 1. Acción para subir archivo físico (nueva)
    if ($action === 'upload_physical') {
        try {
            // Validar que se haya subido un archivo
            if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
                throw new Exception('No se recibió el archivo o hubo un error en la subida');
            }

            $file = $_FILES['file'];
            
            // Configurar directorio para archivos temporales
            $uploadDir = $_SERVER['DOCUMENT_ROOT'] . '/siindad/documents/temp_uploads/';
            
            // Crear directorio si no existe
            if (!file_exists($uploadDir)) {
                if (!mkdir($uploadDir, 0777, true)) {
                    throw new Exception('No se pudo crear el directorio temporal');
                }
            }

            // Generar nombre único para el archivo
            $fileName = uniqid() . '_' . basename($file['name']);
            $filePath = $uploadDir . $fileName;

            // Mover el archivo subido
            if (!move_uploaded_file($file['tmp_name'], $filePath)) {
                throw new Exception('Error al guardar el archivo en el servidor');
            }

            // Obtener fechas si existen
            $issueDate = $_POST['issue_date'] ?? null;
            $expiryDate = $_POST['expiry_date'] ?? null;

            // Devolver respuesta exitosa con la ruta relativa
            echo json_encode([
                'success' => true,
                'filePath' => "temp_uploads/" . $fileName,
                'fileName' => $fileName,
                'issue_date' => $issueDate,
                'expiry_date' => $expiryDate
            ]);
            
        } catch (Exception $e) {
            // Manejar errores
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => $e->getMessage()
            ]);
        }
        exit;
    }

    // 2. Acción para asociar archivo a una asignación (nueva)
    if ($action === 'associate_file') {
        try {
            // Obtener parámetros
            $requiredFileId = intval($_POST['required_file_id'] ?? 0);
            $periodId = intval($_POST['period_id'] ?? 0);
            $filePath = $_POST['file_path'] ?? '';
            $formatCode = strtolower(trim($_POST['format_code'] ?? ''));
            $issueDate = $_POST['issue_date'] ?? null;
            $expiryDate = $_POST['expiry_date'] ?? null;

            // Validar parámetros
            if ($requiredFileId <= 0 || $periodId <= 0 || empty($filePath) || empty($formatCode)) {
                throw new Exception('Parámetros incompletos para asociar el archivo');
            }

            // Obtener información de la empresa y tipo de documento
            $stmt = safe_prepare(
                $mysqli,
                "SELECT c.id AS company_id, c.nameCompany AS company_name, ft.name AS required_file_name
                 FROM company_required_files crf
                 JOIN companies c ON crf.company_id = c.id
                 JOIN file_types ft ON crf.file_type_id = ft.file_type_id
                 WHERE crf.required_file_id = ?",
                'company query'
            );
            bind_and_execute($stmt, "i", $requiredFileId);
            $result = $stmt->get_result();
            $company = $result->fetch_assoc();
            $stmt->close();

            if (!$company) {
                throw new Exception('Empresa o tipo de documento no encontrado');
            }

            // Preparar nombres de directorio
            $company_id = $company['company_id'];
            $company_name = $company['company_name'] ?: 'UnknownCompany';
            $required_file_name = $company['required_file_name'] ?: 'UnknownFile';
            
            // Sanitizar nombres para rutas
            $company_name = preg_replace('/[^a-zA-Z0-9_-]/', '', str_replace(' ', '_', $company_name));
            $required_file_name = preg_replace('/[^a-zA-Z0-9_-]/', '', str_replace(' ', '_', $required_file_name));

            // Obtener información del período
            $period_range = 'sin_periodicidad';
            $stmt = safe_prepare($mysqli, "SELECT start_date, end_date FROM document_periods WHERE period_id = ?", 'period query');
            bind_and_execute($stmt, "i", $periodId);
            $period = $stmt->get_result()->fetch_assoc();
            $stmt->close();
            
            if ($period) {
                $period_range = ($period['end_date'] === '9999-12-31') 
                    ? 'sin_periodicidad' 
                    : $period['start_date'] . '_' . $period['end_date'];
            }

            // Construir rutas
            $company_dir = "{$company_id}-{$company_name}";
            $required_file_dir = "{$requiredFileId}-{$required_file_name}";
            $period_dir = $period_range;
            $format_dir = $formatCode;

            $base_dir = __DIR__ . "/../documents/$company_dir/$required_file_dir/$period_dir/$format_dir/cargados";

            // Crear directorio si no existe
            if (!file_exists($base_dir)) {
                if (!mkdir($base_dir, 0777, true)) {
                    throw new Exception('Error al crear directorio: ' . $base_dir);
                }
            }

            // Preparar nuevo nombre de archivo
            $tempPath = __DIR__ . "/../documents/" . $filePath;
            $file_ext = pathinfo($tempPath, PATHINFO_EXTENSION) ?: 'unknown';
            $timestamp = date('Ymd\THis');
            $file_name = "{$company_id}_{$requiredFileId}_{$periodId}_{$timestamp}.{$file_ext}";
            $new_file_path = "$base_dir/$file_name";
            $relative_path = "$company_dir/$required_file_dir/$period_dir/$format_dir/cargados/$file_name";

            // Copiar archivo temporal a ubicación final
            if (!copy($tempPath, $new_file_path)) {
                throw new Exception('Error al copiar archivo a ubicación final: ' . $tempPath . ' -> ' . $new_file_path);
            }

            // Obtener fechas válidas
            $today = date('Y-m-d');
            $validDateFormat = function ($date) {
                return preg_match('/^\d{4}-\d{2}-\d{2}$/', $date);
            };

            $period_end = $period['end_date'] ?? $today;
            $final_issue_date = ($issueDate && $validDateFormat($issueDate)) ? $issueDate : $today;
            $final_expiry_date = ($expiryDate && $validDateFormat($expiryDate)) ? $expiryDate : $period_end;

            // Determinar cobertura del período
            $period_coverage = 'full';
            if (isset($period['start_date']) && $final_expiry_date < $period['start_date']) {
                $period_coverage = 'none';
            } elseif (isset($period['end_date']) && $final_expiry_date < $period['end_date']) {
                $period_coverage = 'partial';
            }

            // Verificar si está expirado
            $is_expired = ($period_coverage === 'partial' && $final_expiry_date < $today) ? 1 : 0;
            $user_id = 1; // Reemplazar con ID de usuario real

            // Insertar registro en base de datos
           $stmt = safe_prepare($mysqli, "
            INSERT INTO company_files 
            (file_path, issue_date, expiry_date, user_id, status, is_current, period_id, period_coverage, is_expired, file_ext)
            VALUES (?, ?, ?, ?, 'uploaded', 1, ?, ?, ?, ?)
        ", 'file insert');
            
             bind_and_execute(
            $stmt, 
            "sssisiss", 
            $relative_path, 
            $final_issue_date, 
            $final_expiry_date, 
            $user_id,
            $periodId, 
            $period_coverage, 
            $is_expired,
            $file_ext
        );

        $file_id = $stmt->insert_id;
        $stmt->close();

        // MODIFICAR ESTA PARTE: Añadir file_path a la respuesta
        echo json_encode([
            'success' => true,
            'message' => 'Archivo asociado correctamente',
            'file_id' => $file_id,
            'file_path' => $relative_path  // <- Nueva línea añadida
        ]);
        
    } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => $e->getMessage()
            ]);
        }
        exit;
    }

    if ($action === 'submit_uploads') {
        $required_file_id = intval($_POST['required_file_id']);
        $format_code = trim($_POST['format_code']);
        $period_ids_str = $_POST['period_ids'] ?? '';
        
        // Convertir a array de IDs
        $period_ids = array_map('intval', explode(',', $period_ids_str));
        $period_ids = array_filter($period_ids, function($id) {
            return $id > 0;
        });

        if (empty($period_ids)) {
            echo json_encode(['success' => false, 'error' => 'No se proporcionaron IDs de período válidos']);
            exit;
        }

        // 1. Obtener todos los archivos a procesar
        $placeholders = implode(',', array_fill(0, count($period_ids), '?'));
        $types = str_repeat('i', count($period_ids));
        
        $stmt = safe_prepare(
            $mysqli,
            "SELECT cf.file_id, cf.file_path 
             FROM company_files cf
             JOIN document_periods dp ON cf.period_id = dp.period_id
             WHERE dp.required_file_id = ? 
               AND cf.period_id IN ($placeholders)
               AND cf.file_ext = ? 
               AND cf.status = 'uploaded'",
            'submit_uploads select'
        );
        
        // Parámetros: required_file_id + period_ids + format_code
        $params = array_merge([$required_file_id], $period_ids, [$format_code]);
        $stmt->bind_param("i".$types."s", ...$params);
        safe_execute($stmt, 'submit_uploads select');
        
        $result = $stmt->get_result();
        $file_ids = [];
        $files_to_update = [];
        
        while ($row = $result->fetch_assoc()) {
            $file_ids[] = $row['file_id'];
            $files_to_update[] = $row;
        }
        $stmt->close();

        // 2. Mover archivos físicos
        foreach ($files_to_update as $row) {
            $oldPath = __DIR__ . '/../documents/' . $row['file_path'];
            $newPath = str_replace('/cargados/', '/subidos/', $oldPath);

            $newDir = dirname($newPath);
            if (!file_exists($newDir)) {
                mkdir($newDir, 0777, true);
            }

            if (file_exists($oldPath)) {
                rename($oldPath, $newPath);
            }
        }

        // 3. Actualización MASIVA del estado y rutas
        if (!empty($file_ids)) {
            $placeholders_file = implode(',', array_fill(0, count($file_ids), '?'));
            $types_file = str_repeat('i', count($file_ids));
            
            $update_sql = "UPDATE company_files 
                           SET file_path = REPLACE(file_path, '/cargados/', '/subidos/'),
                               status = 'pending' 
                           WHERE file_id IN ($placeholders_file)";
            
            $update_stmt = safe_prepare($mysqli, $update_sql, 'submit_uploads mass update');
            $update_stmt->bind_param($types_file, ...$file_ids);
            safe_execute($update_stmt, 'submit_uploads mass update');
            $update_stmt->close();
        }

        echo json_encode(['success' => true, 'updated_count' => count($file_ids)]);
        exit;
    }


    if ($action === 'approve') {
        $file_id = intval($_POST['file_id']);

        // Obtener la ruta actual
        $stmt = safe_prepare($mysqli, "SELECT file_path FROM company_files WHERE file_id = ?", 'approve select');
        bind_and_execute($stmt, "i", $file_id);

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
        $stmt = safe_prepare($mysqli, "UPDATE company_files SET file_path = ?, status = 'approved' WHERE file_id = ?", 'approve update');
        bind_and_execute($stmt, "si", $newRelativePath, $file_id);
        $stmt->close();

        echo json_encode(['success' => true]);
        exit;
    }

    if ($action === 'approve_late') {
        $file_id = intval($_POST['file_id']);

        // Obtener la ruta actual
        $stmt = safe_prepare($mysqli, "SELECT file_path FROM company_files WHERE file_id = ?", 'approve_late select');
        bind_and_execute($stmt, "i", $file_id);

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

        // Mover a carpeta de tardíos
        $newPath = str_replace('/subidos/', '/tardios/', $oldPath);
        $newDir = dirname($newPath);

        if (!file_exists($newDir)) {
            mkdir($newDir, 0777, true);
        }

        if (!rename($oldPath, $newPath)) {
            echo json_encode(['success' => false, 'error' => 'Error al mover archivo']);
            exit;
        }

        $newRelativePath = str_replace('/subidos/', '/tardios/', $file['file_path']);

        // Actualizar DB con estado 'late'
        $stmt = safe_prepare($mysqli, "UPDATE company_files SET file_path = ?, status = 'late' WHERE file_id = ?", 'approve_late update');
        bind_and_execute($stmt, "si", $newRelativePath, $file_id);
        $stmt->close();

        echo json_encode(['success' => true]);
        exit;
    }

    if ($action === 'reject') {
        $file_id = intval($_POST['file_id']);
        $comment = $_POST['comment'] ?? '';

        // Obtener la ruta actual
        $stmt = safe_prepare($mysqli, "SELECT file_path FROM company_files WHERE file_id = ?", 'reject select');
        bind_and_execute($stmt, "i", $file_id);

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
        $stmt = safe_prepare($mysqli, "UPDATE company_files SET file_path = ?, status = 'rejected', comment = ? WHERE file_id = ?", 'reject update');
        bind_and_execute($stmt, "ssi", $newRelativePath, $comment, $file_id);
        $stmt->close();

        echo json_encode(['success' => true]);
        exit;
    }

    if ($action === 'acknowledge') {
        $file_id = intval($_POST['file_id']);
        $stmt = safe_prepare($mysqli, "SELECT file_path FROM company_files WHERE file_id = ?", 'acknowledge select');
        bind_and_execute($stmt, "i", $file_id);

        $result = $stmt->get_result();
        $file = $result->fetch_assoc();
        $stmt->close();

        if ($file) {
            $path = __DIR__ . '/../documents/' . $file['file_path'];
            if (file_exists($path)) {
                unlink($path);
            }
            $stmt = safe_prepare($mysqli, "UPDATE company_files SET file_path = '', is_current = 0, status = 'acknowledged' WHERE file_id = ?", 'acknowledge update');
            bind_and_execute($stmt, "i", $file_id);
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
        $stmt = safe_prepare($mysqli, "SELECT file_id FROM company_files WHERE file_path = ? AND status IN ('uploaded', 'pending')", 'delete select');
        bind_and_execute($stmt, "s", $file_path);

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
        $stmt = safe_prepare($mysqli, "DELETE FROM company_files WHERE file_id = ?", 'delete delete');
        bind_and_execute($stmt, "i", $file['file_id']);
        $stmt->close();

        echo json_encode(['success' => true]);
        exit;
    }

    if ($action === 'submit_uploaded') {
        $required_file_id = intval($_POST['required_file_id']);
        $period_id = intval($_POST['period_id']);

        // Obtener todos los archivos a procesar
        $stmt = safe_prepare(
            $mysqli,
            "SELECT cf.file_id, cf.file_path 
            FROM company_files cf
            JOIN document_periods dp ON cf.period_id = dp.period_id
            WHERE dp.required_file_id = ? 
              AND cf.period_id = ? 
              AND cf.status = 'uploaded'",
            'submit_uploaded select'
        );
        
        bind_and_execute($stmt, "ii", $required_file_id, $period_id);
        $result = $stmt->get_result();
        $file_ids = [];
        $files_to_update = [];
        
        while ($row = $result->fetch_assoc()) {
            $file_ids[] = $row['file_id'];
            $files_to_update[] = $row;
        }
        $stmt->close();

        // Mover archivos físicos
        foreach ($files_to_update as $row) {
            $oldPath = __DIR__ . '/../documents/' . $row['file_path'];

            // Solo procesar si está en /cargados/
            if (strpos($oldPath, '/cargados/') === false) {
                continue;
            }

            $newPath = str_replace('/cargados/', '/subidos/', $oldPath);
            $newDir = dirname($newPath);
            
            if (!file_exists($newDir)) {
                mkdir($newDir, 0777, true);
            }

            if (file_exists($oldPath)) {
                rename($oldPath, $newPath);
            }
        }

        // Actualización MASIVA del estado y rutas
        if (!empty($file_ids)) {
            $placeholders = implode(',', array_fill(0, count($file_ids), '?'));
            $types = str_repeat('i', count($file_ids));
            
            // Actualizar rutas y estados en una sola operación
            $update_sql = "UPDATE company_files 
                           SET file_path = REPLACE(file_path, '/cargados/', '/subidos/'),
                               status = 'pending' 
                           WHERE file_id IN ($placeholders)";
            
            $update_stmt = safe_prepare($mysqli, $update_sql, 'submit_uploaded mass update');
            $update_stmt->bind_param($types, ...$file_ids);
            safe_execute($update_stmt, 'submit_uploaded mass update');
            $update_stmt->close();
        }

        echo json_encode([
            'success' => true, 
            'updated_count' => count($file_ids)
        ]);
        exit;
    }

    // Acción tradicional para subida directa
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
    $stmt = safe_prepare($mysqli, "
        SELECT c.id AS company_id, c.nameCompany AS company_name, ft.name AS required_file_name
        FROM company_required_files crf
        JOIN companies c ON crf.company_id = c.id
        JOIN file_types ft ON crf.file_type_id = ft.file_type_id
        WHERE crf.required_file_id = ?
    ", 'company query');
    bind_and_execute($stmt, "i", $required_file_id);

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
        $stmt = safe_prepare($mysqli, "SELECT start_date, end_date FROM document_periods WHERE period_id = ?", 'period query');
        bind_and_execute($stmt, "i", $period_id);
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

    // Determinar period_coverage del archivo respecto al periodo
    $period_coverage = 'none';
    if ($expiry_date < $period['start_date']) {
        $period_coverage = 'none';
    } elseif ($expiry_date >= $period['end_date']) {
        $period_coverage = 'full';
    } else {
        $period_coverage = 'partial';
    }

    $is_expired = ($period_coverage === 'partial' && $expiry_date < date('Y-m-d')) ? 1 : 0;

    $stmt = safe_prepare($mysqli, "
        INSERT INTO company_files (file_path, issue_date, expiry_date, user_id, status, is_current, period_id, period_coverage, is_expired)
        VALUES (?, ?, ?, ?, 'uploaded', 1, ?, ?, ?)
    ", 'file insert');
    bind_and_execute($stmt, "sssissi", $relative_path, $issue_date, $expiry_date, $user_id, $period_id, $period_coverage, $is_expired);

    $stmt->close();

    echo json_encode(['success' => true]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $statusParam = $_GET['status'] ?? 'pending';
    $statuses = explode(',', $statusParam);

    $required_file_id = isset($_GET['required_file_id']) ? intval($_GET['required_file_id']) : null;
    $period_id = isset($_GET['period_id']) ? intval($_GET['period_id']) : null;
    $period_coverage = $_GET['period_coverage'] ?? null;
    $is_expired = isset($_GET['is_expired']) ? intval($_GET['is_expired']) : null;

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

    if ($period_coverage !== null) {
        $where[] = "cf.period_coverage = ?";
        $types .= 's';
        $params[] = $period_coverage;
    }

    if ($is_expired !== null) {
        $where[] = "cf.is_expired = ?";
        $types .= 'i';
        $params[] = $is_expired;
    }

    $mysqli->query("
        UPDATE company_files
        SET is_expired = 1
        WHERE period_coverage = 'partial'
        AND expiry_date < CURDATE()
        AND is_expired = 0
        AND status IN ('approved', 'pending')
    ");

    $sql = "
        SELECT cf.file_id, cf.file_path, cf.issue_date, cf.expiry_date, 
               cf.user_id, cf.status, cf.comment, cf.is_current, cf.uploaded_at, cf.period_id,
               cf.period_coverage, cf.is_expired,
               dp.start_date, dp.end_date, dp.required_file_id,
               ft.name AS file_type_name, ft.description AS file_type_description,
               ft.notify_day,
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