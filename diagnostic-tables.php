<?php
/**
 * Diagnostic rapide : trouver les vraies tables
 * URL: https://sempa.fr/wp-content/themes/uncode-child/diagnostic-tables.php
 */

$wp_load_paths = [
    __DIR__ . '/../../../wp-load.php',
    __DIR__ . '/../../../../wp-load.php',
    __DIR__ . '/../../../../../wp-load.php',
];

foreach ($wp_load_paths as $path) {
    if (file_exists($path)) {
        require_once $path;
        break;
    }
}

if (!is_user_logged_in()) {
    die('❌ Non autorisé');
}

global $wpdb;
header('Content-Type: text/plain; charset=utf-8');

echo "=== DIAGNOSTIC TABLES SEMPA ===\n\n";

echo "Préfixe WordPress: {$wpdb->prefix}\n\n";

// Toutes les tables
$all_tables = $wpdb->get_col("SHOW TABLES");

echo "=== TOUTES LES TABLES SEMPA/STOCK ===\n";
foreach ($all_tables as $table) {
    if (stripos($table, 'sempa') !== false || stripos($table, 'stock') !== false) {
        // Compter les lignes
        $count = $wpdb->get_var("SELECT COUNT(*) FROM `$table`");
        echo "$table => $count lignes\n";

        // Si c'est une table de stocks, montrer un exemple
        if (stripos($table, 'stock') !== false && $count > 0) {
            $sample = $wpdb->get_row("SELECT * FROM `$table` LIMIT 1");
            if ($sample) {
                echo "  Colonnes: " . implode(', ', array_keys((array)$sample)) . "\n";
                if (isset($sample->id)) {
                    echo "  Exemple ID: {$sample->id}\n";
                }
                if (isset($sample->reference)) {
                    echo "  Exemple ref: {$sample->reference}\n";
                }
            }
        }
    }
}

echo "\n=== RECHERCHE PRODUIT #526 ===\n";

// Chercher le produit #526 dans toutes les tables
foreach ($all_tables as $table) {
    if (stripos($table, 'stock') !== false) {
        $product = $wpdb->get_row("SELECT * FROM `$table` WHERE id = 526 LIMIT 1");
        if ($product) {
            echo "✅ TROUVÉ dans: $table\n";
            echo "   Référence: {$product->reference}\n";
            echo "   Désignation: {$product->designation}\n";
            break;
        }
    }
}

echo "\n⚠️ Supprimez ce fichier après usage\n";
