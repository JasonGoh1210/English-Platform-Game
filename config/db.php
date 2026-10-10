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
    // Environment overrides support deployed installations and isolated integration tests.
    $host = getenv('EPQ_DB_HOST') ?: EPQ_DB_HOST;
    $user = getenv('EPQ_DB_USER') ?: EPQ_DB_USER;
    $envPassword = getenv('EPQ_DB_PASS');
    $password = $envPassword === false ? EPQ_DB_PASS : $envPassword;
    $name = getenv('EPQ_DB_NAME') ?: EPQ_DB_NAME;
    $db = new mysqli($host, $user, $password, $name);

    if ($db->connect_errno) {
        throw new RuntimeException('MySQL connection failed: ' . $db->connect_error);
    }

    $db->set_charset('utf8mb4');
    return $db;
}
