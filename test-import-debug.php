<?php
/**
 * FICHIER DE TEST POUR DIAGNOSTIQUER L'IMPORT CSV
 *
 * Accédez à ce fichier via : https://sempa.fr/wp-content/themes/uncode-child/test-import-debug.php
 *
 * Ce fichier va tester directement la fonction ajax_import_csv sans passer par AJAX
 */

// Charger WordPress
require_once('../../../wp-load.php');

echo "<h1>🔧 Test d'import CSV - Diagnostic</h1>";
echo "<pre>";

// Vérifier que l'utilisateur est connecté
if (!is_user_logged_in()) {
    echo "❌ Vous devez être connecté pour exécuter ce test\n";
    echo "<a href='" . wp_login_url($_SERVER['REQUEST_URI']) . "'>Se connecter</a>\n";
    exit;
}

echo "✅ Utilisateur connecté: " . wp_get_current_user()->user_email . "\n\n";

// Vérifier que la classe existe
if (!class_exists('Sempa_Stocks_App')) {
    echo "❌ La classe Sempa_Stocks_App n'existe pas\n";
    exit;
}

echo "✅ Classe Sempa_Stocks_App existe\n\n";

// Vérifier que la fonction ajax_import_csv existe
if (!method_exists('Sempa_Stocks_App', 'ajax_import_csv')) {
    echo "❌ La méthode ajax_import_csv n'existe pas\n";
    exit;
}

echo "✅ Méthode ajax_import_csv existe\n\n";

// Vérifier que l'action AJAX est enregistrée
global $wp_filter;
$ajax_action = 'wp_ajax_sempa_stocks_import_csv';
if (!isset($wp_filter[$ajax_action])) {
    echo "❌ L'action AJAX sempa_stocks_import_csv n'est PAS enregistrée\n";
    echo "Actions AJAX enregistrées contenant 'sempa':\n";
    foreach ($wp_filter as $key => $value) {
        if (strpos($key, 'sempa') !== false && strpos($key, 'ajax') !== false) {
            echo "  - $key\n";
        }
    }
} else {
    echo "✅ L'action AJAX sempa_stocks_import_csv est enregistrée\n\n";
}

// Créer des données de test
$test_products = [
    [
        'reference' => 'TEST001',
        'designation' => 'Produit Test 1',
        'stock_actuel' => 10,
        'stock_minimum' => 5,
        'prix_achat' => 100.50
    ]
];

echo "📦 Données de test créées: " . count($test_products) . " produit(s)\n\n";

// Simuler la requête POST
$_POST['products'] = json_encode($test_products);
$_POST['nonce'] = wp_create_nonce('sempa_stocks_nonce');
$_POST['action'] = 'sempa_stocks_import_csv';

echo "🧪 Simulation de la requête POST:\n";
echo "  - action: " . $_POST['action'] . "\n";
echo "  - nonce: " . substr($_POST['nonce'], 0, 20) . "...\n";
echo "  - products: " . strlen($_POST['products']) . " caractères\n\n";

// Tester la fonction directement
echo "🚀 Appel direct de la fonction ajax_import_csv()...\n\n";

try {
    // Capturer la sortie
    ob_start();
    Sempa_Stocks_App::ajax_import_csv();
    $output = ob_get_clean();

    echo "📄 Sortie de la fonction:\n";
    echo $output . "\n";

} catch (Exception $e) {
    ob_end_clean();
    echo "❌ ERREUR: " . $e->getMessage() . "\n";
    echo "Trace: " . $e->getTraceAsString() . "\n";
}

echo "</pre>";
