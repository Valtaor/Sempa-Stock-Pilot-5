<?php
/**
 * Script de diagnostic simple pour le système d'audit
 * À placer à la racine du thème et accéder via navigateur
 * URL: https://sempa.fr/wp-content/themes/uncode-child/diagnostic-audit.php
 *
 * ⚠️ SUPPRIMER après utilisation
 */

// Charger WordPress
$wp_load_paths = [
    __DIR__ . '/../../../wp-load.php',
    __DIR__ . '/../../../../wp-load.php',
    __DIR__ . '/../../../../../wp-load.php',
];

$wp_loaded = false;
foreach ($wp_load_paths as $path) {
    if (file_exists($path)) {
        require_once $path;
        $wp_loaded = true;
        break;
    }
}

if (!$wp_loaded) {
    die('❌ Impossible de charger WordPress');
}

// Sécurité basique
if (!is_user_logged_in()) {
    die('❌ Vous devez être connecté');
}

header('Content-Type: text/html; charset=utf-8');
?>
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Diagnostic Audit</title>
    <style>
        body { font-family: monospace; padding: 20px; background: #1e1e1e; color: #d4d4d4; }
        .success { color: #4ec9b0; }
        .error { color: #f48771; }
        .warning { color: #dcdcaa; }
        .info { color: #9cdcfe; }
        pre { background: #252526; padding: 10px; border-left: 3px solid #007acc; margin: 10px 0; }
        h2 { color: #569cd6; border-bottom: 1px solid #333; padding-bottom: 5px; }
    </style>
</head>
<body>
    <h1>🔍 Diagnostic du Système d'Audit</h1>
    <p><em>Généré le <?php echo date('Y-m-d H:i:s'); ?></em></p>

    <?php
    global $wpdb;

    // 1. Vérifier la classe
    echo '<h2>1. Classe Sempa_Audit_Logger</h2>';
    if (class_exists('Sempa_Audit_Logger')) {
        echo '<p class="success">✅ Classe chargée</p>';
        echo '<pre>Fichier: ' . (new ReflectionClass('Sempa_Audit_Logger'))->getFileName() . '</pre>';
    } else {
        echo '<p class="error">❌ Classe non disponible</p>';

        // Essayer de la charger
        $audit_file = __DIR__ . '/includes/audit-logger.php';
        if (file_exists($audit_file)) {
            echo '<p class="warning">⚠️ Tentative de chargement depuis: ' . $audit_file . '</p>';
            require_once $audit_file;

            if (class_exists('Sempa_Audit_Logger')) {
                echo '<p class="success">✅ Classe chargée manuellement</p>';
            } else {
                echo '<p class="error">❌ Échec du chargement</p>';
            }
        }
    }

    // 2. Vérifier la table
    echo '<h2>2. Table audit_log</h2>';
    $table_name = $wpdb->prefix . 'sempa_audit_log';
    echo '<p class="info">Table ciblée: ' . $table_name . '</p>';

    $table_exists = $wpdb->get_var("SHOW TABLES LIKE '$table_name'");

    if ($table_exists) {
        echo '<p class="success">✅ Table existe</p>';

        // Structure de la table
        $columns = $wpdb->get_results("DESCRIBE $table_name");
        echo '<h3>Structure:</h3>';
        echo '<pre>';
        foreach ($columns as $col) {
            echo "{$col->Field} ({$col->Type}) " . ($col->Null == 'NO' ? 'NOT NULL' : 'NULL') . "\n";
        }
        echo '</pre>';

        // Compter les entrées
        $count = $wpdb->get_var("SELECT COUNT(*) FROM $table_name");
        echo '<p class="info">Nombre d\'entrées: ' . $count . '</p>';

        if ($count > 0) {
            // Afficher les dernières entrées
            $entries = $wpdb->get_results("SELECT * FROM $table_name ORDER BY created_at DESC LIMIT 5");
            echo '<h3>5 dernières entrées:</h3>';
            echo '<pre>';
            foreach ($entries as $entry) {
                echo "ID: {$entry->id}\n";
                echo "Type: {$entry->entity_type} #{$entry->entity_id}\n";
                echo "Action: {$entry->action}\n";
                echo "User: {$entry->user_name} ({$entry->user_email})\n";
                echo "Date: {$entry->created_at}\n";
                echo "Résumé: {$entry->changes_summary}\n";
                echo "---\n";
            }
            echo '</pre>';
        }

        // Vérifier le produit #526
        echo '<h3>Entrées pour le produit #526:</h3>';
        $product_entries = $wpdb->get_results(
            "SELECT * FROM $table_name WHERE entity_type = 'product' AND entity_id = 526 ORDER BY created_at DESC"
        );

        if (empty($product_entries)) {
            echo '<p class="warning">⚠️ Aucune entrée pour le produit #526</p>';
        } else {
            echo '<p class="success">✅ ' . count($product_entries) . ' entrée(s)</p>';
            echo '<pre>';
            foreach ($product_entries as $entry) {
                echo "Action: {$entry->action} le {$entry->created_at} par {$entry->user_name}\n";
                echo "Résumé: {$entry->changes_summary}\n";
            }
            echo '</pre>';
        }

    } else {
        echo '<p class="error">❌ Table n\'existe pas</p>';

        // Essayer de créer
        if (class_exists('Sempa_Stocks_Schema_Setup')) {
            echo '<p class="warning">⚠️ Tentative de création via Sempa_Stocks_Schema_Setup...</p>';
            Sempa_Stocks_Schema_Setup::ensure_schema();

            $table_exists_after = $wpdb->get_var("SHOW TABLES LIKE '$table_name'");
            if ($table_exists_after) {
                echo '<p class="success">✅ Table créée avec succès!</p>';
            } else {
                echo '<p class="error">❌ Échec de création: ' . $wpdb->last_error . '</p>';
            }
        } else {
            echo '<p class="error">❌ Classe Sempa_Stocks_Schema_Setup non disponible</p>';
        }
    }

    // 3. Test d'insertion
    echo '<h2>3. Test d\'insertion</h2>';

    if (class_exists('Sempa_Audit_Logger') && $table_exists) {
        $test_result = Sempa_Audit_Logger::log(
            'test',
            999999,
            'created',
            null,
            ['diagnostic' => 'test_value', 'timestamp' => current_time('mysql')]
        );

        if ($test_result) {
            echo '<p class="success">✅ Insertion test réussie</p>';

            // Vérifier l'entrée
            $test_entry = $wpdb->get_row(
                "SELECT * FROM $table_name WHERE entity_type = 'test' AND entity_id = 999999 ORDER BY created_at DESC LIMIT 1"
            );

            if ($test_entry) {
                echo '<pre>';
                echo "ID: {$test_entry->id}\n";
                echo "User: {$test_entry->user_name} ({$test_entry->user_email})\n";
                echo "Date: {$test_entry->created_at}\n";
                echo '</pre>';

                // Nettoyer
                $wpdb->delete($table_name, ['id' => $test_entry->id]);
                echo '<p class="info">🧹 Entrée de test nettoyée</p>';
            } else {
                echo '<p class="error">❌ Entrée de test non trouvée dans la base!</p>';
            }
        } else {
            echo '<p class="error">❌ Échec de l\'insertion test</p>';
            echo '<p class="error">Erreur: ' . $wpdb->last_error . '</p>';
        }
    } else {
        echo '<p class="warning">⚠️ Impossible de tester (classe ou table manquante)</p>';
    }

    // 4. Vérifier le produit #526
    echo '<h2>4. Produit #526</h2>';
    $product = $wpdb->get_row("SELECT * FROM {$wpdb->prefix}stocks_sempa WHERE id = 526");

    if ($product) {
        echo '<p class="success">✅ Produit trouvé</p>';
        echo '<pre>';
        echo "Référence: {$product->reference}\n";
        echo "Désignation: {$product->designation}\n";
        echo "created_by: " . ($product->created_by ?? 'NULL') . "\n";
        echo "created_at: " . ($product->created_at ?? 'NULL') . "\n";
        echo "modified_by: " . ($product->modified_by ?? 'NULL') . "\n";
        echo "modified_at: " . ($product->modified_at ?? 'NULL') . "\n";
        echo '</pre>';
    } else {
        echo '<p class="error">❌ Produit non trouvé</p>';
    }

    // Instructions
    echo '<h2>5. Prochaines étapes</h2>';
    echo '<ol>';
    echo '<li>Si tout est ✅, modifiez le produit #526 depuis StockPilot</li>';
    echo '<li>Rafraîchissez cette page pour voir les nouvelles entrées</li>';
    echo '<li>Vérifiez l\'historique dans StockPilot</li>';
    echo '<li><strong>SUPPRIMEZ ce fichier après diagnostic</strong></li>';
    echo '</ol>';
    ?>

    <hr>
    <p><em>⚠️ Ce fichier doit être supprimé après utilisation pour des raisons de sécurité</em></p>
</body>
</html>
