<?php
declare(strict_types=1);

function epq_world_layout(): array {
    static $layout;
    return $layout ??= json_decode((string)file_get_contents(__DIR__.'/../data/world_layout.json'), true, 512, JSON_THROW_ON_ERROR);
}
