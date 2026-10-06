<?php
declare(strict_types=1);

const EPQ_DB_HOST = '127.0.0.1';
const EPQ_DB_USER = 'root';
const EPQ_DB_PASS = '';
const EPQ_DB_NAME = 'english_power_quest';

function epq_db(): mysqli {
    static $db = null;
    if ($db instanceof mysqli) return $db;

    mysqli_report(MYSQLI_REPORT_OFF);
    $db = new mysqli(EPQ_DB_HOST, EPQ_DB_USER, EPQ_DB_PASS, EPQ_DB_NAME);

    if ($db->connect_errno) {
        throw new RuntimeException('MySQL connection failed: ' . $db->connect_error);
    }

    $db->set_charset('utf8mb4');
    return $db;
}
