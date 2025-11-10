<?php
/**
 * Diagnostic avancé du système d'audit
 * URL: https://sempa.fr/wp-content/themes/uncode-child/diagnostic-audit-v2.php
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

if (!is_user_logged_in()) {
    die('❌ Vous devez être connecté');
}

header('Content-Type: text/html; charset=utf-8');
?>
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Diagnostic Audit v2</title>
    <style>
        body { font-family: monospace; padding: 20px; background: #1e1e1e; color: #d4d4d4; font-size: 13px; }
        .success { color: #4ec9b0; font-weight: bold; }
        .error { color: #f48771; font-weight: bold; }
        .warning { color: #dcdcaa; font-weight: bold; }
        .info { color: #9cdcfe; }
        pre { background: #252526; padding: 10px; border-left: 3px solid #007acc; margin: 10px 0; overflow-x: auto; }
        h2 { color: #569cd6; border-bottom: 1px solid #333; padding-bottom: 5px; margin-top: 30px; }
        .box { background: #252526; padding: 15px; margin: 10px 0; border-left: 3px solid #16825d; }
        table { border-collapse: collapse; width: 100%; margin: 10px 0; }
        th, td { border: 1px solid #333; padding: 8px; text-align: left; }
        th { background: #2d2d30; }
        .btn { background: #0e639c; color: white; padding: 10px 20px; border: none; cursor: pointer; margin: 5px; }
        .btn:hover { background: #1177bb; }
    </style>
</head>
<body>
    <h1>🔍 Diagnostic Audit v2 - Avancé</h1>
    <p><em>Généré le <?php echo date('Y-m-d H:i:s'); ?></em></p>

    <?php
    global $wpdb;
    $current_user = wp_get_current_user();

    // Section 0 : Informations de base
    echo '<h2>0. Informations de base</h2>';
    echo '<div class="box">';
    echo '<p><strong>Utilisateur:</strong> ' . $current_user->user_login . ' (' . $current_user->user_email . ')</p>';
    echo '<p><strong>Préfixe WordPress:</strong> <span class="info">' . $wpdb->prefix . '</span></p>';
    echo '<p><strong>Nom de la base:</strong> <span class="info">' . DB_NAME . '</span></p>';
    echo '<p><strong>Serveur MySQL:</strong> <span class="info">' . DB_HOST . '</span></p>';
    echo '</div>';

    // Section 1 : Lister TOUTES les tables
    echo '<h2>1. Tables de la base de données</h2>';
    $all_tables = $wpdb->get_col("SHOW TABLES");

    echo '<p class="info">Nombre total de tables: ' . count($all_tables) . '</p>';

    // Filtrer les tables intéressantes
    $stocks_tables = array_filter($all_tables, function($table) {
        return stripos($table, 'stock') !== false || stripos($table, 'sempa') !== false;
    });

    if (!empty($stocks_tables)) {
        echo '<p class="success">✅ Tables liées à Stock/Sempa:</p>';
        echo '<ul>';
        foreach ($stocks_tables as $table) {
            echo '<li>' . $table . '</li>';
        }
        echo '</ul>';
    } else {
        echo '<p class="warning">⚠️ Aucune table stock/sempa trouvée</p>';
    }

    // Chercher spécifiquement la table audit_log
    $audit_tables = array_filter($all_tables, function($table) {
        return stripos($table, 'audit') !== false;
    });

    if (!empty($audit_tables)) {
        echo '<p class="success">✅ Tables audit trouvées:</p>';
        echo '<ul>';
        foreach ($audit_tables as $table) {
            echo '<li>' . $table . '</li>';
        }
        echo '</ul>';
    } else {
        echo '<p class="error">❌ Aucune table audit trouvée</p>';
    }

    // Section 2 : Chercher le produit #526
    echo '<h2>2. Recherche du produit #526</h2>';

    $product_found = false;
    $product_table = null;

    // Essayer différentes tables possibles
    $possible_tables = ['stocks_sempa', 'wp_stocks_sempa', 'semparc_stocks', 'semparc_sempa_stocks'];

    foreach ($possible_tables as $table_test) {
        $full_table = $wpdb->prefix . $table_test;

        // Vérifier si la table existe
        if (in_array($full_table, $all_tables)) {
            echo '<p class="info">🔍 Test de la table: ' . $full_table . '</p>';

            $product = $wpdb->get_row("SELECT * FROM `$full_table` WHERE id = 526 LIMIT 1");

            if ($product) {
                echo '<p class="success">✅ Produit #526 trouvé dans: ' . $full_table . '</p>';
                echo '<pre>';
                print_r($product);
                echo '</pre>';
                $product_found = true;
                $product_table = $full_table;
                break;
            }
        }
    }

    if (!$product_found) {
        echo '<p class="error">❌ Produit #526 non trouvé</p>';

        // Chercher dans toutes les tables qui pourraient contenir des stocks
        foreach ($stocks_tables as $table) {
            echo '<p class="info">🔍 Recherche dans: ' . $table . '</p>';
            $count = $wpdb->get_var("SELECT COUNT(*) FROM `$table`");
            echo '<p>Nombre de lignes: ' . $count . '</p>';

            if ($count > 0) {
                $sample = $wpdb->get_row("SELECT * FROM `$table` LIMIT 1");
                if ($sample && isset($sample->id)) {
                    echo '<p class="info">Exemple d\'ID: ' . $sample->id . '</p>';
                }
            }
        }
    }

    // Section 3 : Créer la table audit_log
    echo '<h2>3. Création de la table audit_log</h2>';

    $audit_table = $wpdb->prefix . 'sempa_audit_log';
    echo '<p class="info">Table cible: ' . $audit_table . '</p>';

    if (isset($_POST['create_table'])) {
        echo '<p class="warning">⚠️ Tentative de création manuelle...</p>';

        $sql = "CREATE TABLE IF NOT EXISTS `$audit_table` (
            `id` BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
            `entity_type` VARCHAR(50) NOT NULL COMMENT 'Type d''entité (product, movement, etc.)',
            `entity_id` INT(11) NOT NULL COMMENT 'ID de l''entité modifiée',
            `action` VARCHAR(20) NOT NULL COMMENT 'Action (created, updated, deleted)',
            `user_id` INT(11) NOT NULL COMMENT 'ID utilisateur ayant effectué l''action',
            `user_name` VARCHAR(255) NOT NULL COMMENT 'Nom de l''utilisateur',
            `user_email` VARCHAR(255) NOT NULL COMMENT 'Email de l''utilisateur',
            `old_values` TEXT DEFAULT NULL COMMENT 'Valeurs avant modification (JSON)',
            `new_values` TEXT DEFAULT NULL COMMENT 'Valeurs après modification (JSON)',
            `changes_summary` TEXT DEFAULT NULL COMMENT 'Résumé des modifications',
            `ip_address` VARCHAR(45) DEFAULT NULL COMMENT 'Adresse IP',
            `user_agent` VARCHAR(500) DEFAULT NULL COMMENT 'User agent',
            `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (`id`),
            KEY `idx_entity` (`entity_type`, `entity_id`),
            KEY `idx_user` (`user_id`),
            KEY `idx_action` (`action`),
            KEY `idx_created` (`created_at`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";

        $result = $wpdb->query($sql);

        if ($result === false) {
            echo '<p class="error">❌ Échec de création</p>';
            echo '<pre>Erreur SQL: ' . $wpdb->last_error . '</pre>';
        } else {
            echo '<p class="success">✅ Table créée avec succès!</p>';

            // Vérifier
            $table_exists = $wpdb->get_var("SHOW TABLES LIKE '$audit_table'");
            if ($table_exists) {
                echo '<p class="success">✅ Vérification: la table existe maintenant</p>';
            }
        }
    } else {
        $table_exists = $wpdb->get_var("SHOW TABLES LIKE '$audit_table'");
        if ($table_exists) {
            echo '<p class="success">✅ Table existe déjà</p>';

            // Afficher la structure
            $columns = $wpdb->get_results("DESCRIBE `$audit_table`");
            echo '<table>';
            echo '<tr><th>Colonne</th><th>Type</th><th>Null</th><th>Clé</th></tr>';
            foreach ($columns as $col) {
                echo '<tr>';
                echo '<td>' . $col->Field . '</td>';
                echo '<td>' . $col->Type . '</td>';
                echo '<td>' . $col->Null . '</td>';
                echo '<td>' . $col->Key . '</td>';
                echo '</tr>';
            }
            echo '</table>';
        } else {
            echo '<p class="error">❌ Table n\'existe pas</p>';
            echo '<form method="post">';
            echo '<button type="submit" name="create_table" class="btn">Créer la table maintenant</button>';
            echo '</form>';
        }
    }

    // Section 4 : Test des permissions
    echo '<h2>4. Test des permissions MySQL</h2>';

    $test_table = $wpdb->prefix . 'test_permissions_' . time();

    $create_test = $wpdb->query("CREATE TABLE IF NOT EXISTS `$test_table` (id INT)");

    if ($create_test === false) {
        echo '<p class="error">❌ Pas de permission CREATE TABLE</p>';
        echo '<pre>Erreur: ' . $wpdb->last_error . '</pre>';
    } else {
        echo '<p class="success">✅ Permission CREATE TABLE OK</p>';

        // Nettoyer
        $wpdb->query("DROP TABLE IF EXISTS `$test_table`");
    }

    // Section 5 : Instructions
    echo '<h2>5. Prochaines étapes</h2>';
    echo '<ol>';
    if ($product_found) {
        echo '<li class="success">✅ Produit trouvé dans: ' . $product_table . '</li>';
    } else {
        echo '<li class="error">❌ Le produit #526 n\'existe pas - utilisez un autre ID de produit</li>';
    }

    $audit_exists = $wpdb->get_var("SHOW TABLES LIKE '$audit_table'");
    if ($audit_exists) {
        echo '<li class="success">✅ Table audit créée - modifiez un produit pour tester</li>';
    } else {
        echo '<li class="error">❌ Cliquez sur "Créer la table" ci-dessus</li>';
    }

    echo '<li>Rafraîchissez cette page après modification d\'un produit</li>';
    echo '<li><strong>SUPPRIMEZ ce fichier après diagnostic</strong></li>';
    echo '</ol>';
    ?>

    <hr>
    <p><em>⚠️ Supprimez ce fichier après utilisation</em></p>
</body>
</html>
