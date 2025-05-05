<?php
header('Content-Type: application/json');
require_once 'cors.php';
require_once 'conexion.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {

    $action = $_POST['action'];
    $file_id = intval($_POST['file_id']);

    if ($action === 'approve') {
        $stmt = $mysqli->prepare("UPDATE company_files SET status = 'approved' WHERE file_id = ?");
        $stmt->bind_param("i", $file_id);
        $stmt->execute();
        $stmt->close();
        echo json_encode(['success' => true]);
        exit;
    }

    if ($action === 'reject') {
        $comment = $_POST['comment'] ?? '';
        $stmt = $mysqli->prepare("UPDATE company_files SET status = 'rejected', comment = ? WHERE file_id = ?");
        $stmt->bind_param("si", $comment, $file_id);
        $stmt->execute();
        $stmt->close();
        echo json_encode(['success' => true]);
        exit;
    }

    if ($action === 'acknowledge') {
        $stmt = $mysqli->prepare("SELECT file_path FROM company_files WHERE file_id = ?");
        $stmt->bind_param("i", $file_id);
        $stmt->execute();
        $result = $stmt->get_result();
        $file = $result->fetch_assoc();
        $stmt->close();

        if ($file) {
            $path = __DIR__ . '/../' . $file['file_path'];
            if (file_exists($path)) {
                unlink($path);
            }
            $stmt = $mysqli->prepare("DELETE FROM company_files WHERE file_id = ?");
            $stmt->bind_param("i", $file_id);
            $stmt->execute();
            $stmt->close();

            echo json_encode(['success' => true]);
        } else {
            echo json_encode(['success' => false, 'error' => 'File not found']);
        }
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

    $stmt = $mysqli->prepare("SELECT company_id FROM company_required_files WHERE required_file_id = ?");
    $stmt->bind_param("i", $required_file_id);
    $stmt->execute();
    $result = $stmt->get_result();
    $company = $result->fetch_assoc();
    $stmt->close();

    if (!$company) {
        echo json_encode(['success' => false, 'error' => 'Invalid required_file_id']);
        exit;
    }

    $company_id = $company['company_id'];

    $base_dir = __DIR__ . "/../documents/$company_id/$required_file_id/$period_id/$format_code";
    if (!file_exists($base_dir)) {
        mkdir($base_dir, 0777, true);
    }

    $file_ext = pathinfo($file['name'], PATHINFO_EXTENSION);
    $file_name = uniqid() . "." . $file_ext;
    $file_path = "$base_dir/$file_name";

    if (!move_uploaded_file($file['tmp_name'], $file_path)) {
        echo json_encode(['success' => false, 'error' => 'Failed to save file']);
        exit;
    }

    $relative_path = "documents/$company_id/$required_file_id/$period_id/$format_code/$file_name";
    $user_id = 1; // Sustituye por el usuario real (ej. $_SESSION['user_id'])

    $stmt = $mysqli->prepare("
        INSERT INTO company_files (file_path, issue_date, user_id, status, is_current, period_id)
        VALUES (?, CURDATE(), ?, 'pending', 1, ?)
    ");
    $stmt->bind_param("sii", $relative_path, $user_id, $period_id);
    $stmt->execute();
    $stmt->close();

    echo json_encode(['success' => true]);
    exit;

}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $status = $_GET['status'] ?? 'pending';

    if ($status === 'all') {
        $stmt = $mysqli->prepare("
            SELECT cf.file_id, cf.file_path, cf.issue_date, cf.expiry_date, 
                   cf.user_id, cf.status, cf.comment, cf.is_current, cf.uploaded_at, cf.period_id,
                   dp.start_date, dp.end_date, dp.required_file_id,
                   ft.name AS file_type_name, ft.description AS file_type_description,
                   cf.file_ext
            FROM company_files cf
            LEFT JOIN document_periods dp ON cf.period_id = dp.period_id
            LEFT JOIN company_required_files crf ON dp.required_file_id = crf.required_file_id
            LEFT JOIN file_types ft ON crf.file_type_id = ft.file_type_id
        ");
    } else {
        $stmt = $mysqli->prepare("
            SELECT cf.file_id, cf.file_path, cf.issue_date, cf.expiry_date, 
                   cf.user_id, cf.status, cf.comment, cf.is_current, cf.uploaded_at, cf.period_id,
                   dp.start_date, dp.end_date, dp.required_file_id,
                   ft.name AS file_type_name, ft.description AS file_type_description,
                   cf.file_ext
            FROM company_files cf
            LEFT JOIN document_periods dp ON cf.period_id = dp.period_id
            LEFT JOIN company_required_files crf ON dp.required_file_id = crf.required_file_id
            LEFT JOIN file_types ft ON crf.file_type_id = ft.file_type_id
            WHERE cf.status = ?
        ");
        $stmt->bind_param("s", $status);
    }

    if (!$stmt) {
        echo json_encode(['success' => false, 'error' => $mysqli->error]);
        exit;
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
