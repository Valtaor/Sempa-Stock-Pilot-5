<?php
if (!defined('ABSPATH')) {
    exit;
}

if (!class_exists('Sempa_Stocks_Schema_Setup')) {
    final class Sempa_Stocks_Schema_Setup
    {
        /**
         * Ensure all required tables exist in the database
         * This function will create missing tables automatically
         */
        public static function ensure_schema()
        {
            try {
                self::ensure_suppliers_table();
                self::ensure_suppliers_extended_columns();
                self::ensure_products_supplier_column();
                self::ensure_products_etat_materiel_column();
                self::ensure_products_image_url_column();
                self::ensure_audit_trail_columns();
                self::ensure_audit_log_table();
                self::ensure_saved_filters_table();
                self::ensure_stock_alerts_table();
            } catch (\Throwable $exception) {
                if (function_exists('error_log')) {
                    error_log('[Sempa] Schema setup error: ' . $exception->getMessage());
                }
            }
        }

        /**
         * Create the suppliers table if it doesn't exist
         */
        private static function ensure_suppliers_table()
        {
            $db = Sempa_Stocks_DB::instance();

            if (!($db instanceof \wpdb) || empty($db->dbh)) {
                error_log('[Sempa] Cannot create suppliers table: database connection not available');
                return false;
            }

            // Check if table already exists using any of the aliases
            if (Sempa_Stocks_DB::table_exists('fournisseurs_sempa')) {
                return true; // Table already exists
            }

            // Create the suppliers table (fournisseurs)
            $sql = "CREATE TABLE IF NOT EXISTS `fournisseurs` (
                `id` int(11) NOT NULL AUTO_INCREMENT,
                `nom` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
                `nom_contact` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
                `telephone` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
                `email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
                `date_creation` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (`id`),
                UNIQUE KEY `nom_unique` (`nom`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";

            $result = $db->query($sql);

            if ($result === false) {
                error_log('[Sempa] Failed to create suppliers table: ' . $db->last_error);
                return false;
            }

            // Clear the table cache to force re-detection
            Sempa_Stocks_DB::clear_cache();

            error_log('[Sempa] Suppliers table created successfully');
            return true;
        }

        /**
         * Add extended columns to suppliers table for complete supplier profiles
         */
        private static function ensure_suppliers_extended_columns()
        {
            $db = Sempa_Stocks_DB::instance();

            if (!($db instanceof \wpdb) || empty($db->dbh)) {
                return false;
            }

            $suppliers_table = 'fournisseurs';

            // Check which columns are missing
            $existing_columns = $db->get_col("SHOW COLUMNS FROM " . Sempa_Stocks_DB::escape_identifier($suppliers_table));
            $columns_to_add = [];

            if (!in_array('adresse', $existing_columns)) {
                $columns_to_add[] = "ADD COLUMN `adresse` TEXT DEFAULT NULL COMMENT 'Adresse du fournisseur'";
            }

            if (!in_array('code_postal', $existing_columns)) {
                $columns_to_add[] = "ADD COLUMN `code_postal` VARCHAR(20) DEFAULT NULL COMMENT 'Code postal'";
            }

            if (!in_array('ville', $existing_columns)) {
                $columns_to_add[] = "ADD COLUMN `ville` VARCHAR(255) DEFAULT NULL COMMENT 'Ville'";
            }

            if (!in_array('pays', $existing_columns)) {
                $columns_to_add[] = "ADD COLUMN `pays` VARCHAR(255) DEFAULT 'France' COMMENT 'Pays'";
            }

            if (!in_array('site_web', $existing_columns)) {
                $columns_to_add[] = "ADD COLUMN `site_web` VARCHAR(255) DEFAULT NULL COMMENT 'Site web'";
            }

            if (!in_array('siret', $existing_columns)) {
                $columns_to_add[] = "ADD COLUMN `siret` VARCHAR(50) DEFAULT NULL COMMENT 'Numéro SIRET'";
            }

            if (!in_array('conditions_paiement', $existing_columns)) {
                $columns_to_add[] = "ADD COLUMN `conditions_paiement` TEXT DEFAULT NULL COMMENT 'Conditions de paiement'";
            }

            if (!in_array('delai_livraison', $existing_columns)) {
                $columns_to_add[] = "ADD COLUMN `delai_livraison` VARCHAR(100) DEFAULT NULL COMMENT 'Délai de livraison habituel'";
            }

            if (!in_array('notes', $existing_columns)) {
                $columns_to_add[] = "ADD COLUMN `notes` TEXT DEFAULT NULL COMMENT 'Notes et commentaires'";
            }

            // If no columns to add, return
            if (empty($columns_to_add)) {
                return true;
            }

            // Build and execute ALTER TABLE query
            $sql = "ALTER TABLE " . Sempa_Stocks_DB::escape_identifier($suppliers_table) . " " . implode(', ', $columns_to_add);

            $result = $db->query($sql);

            if ($result === false) {
                error_log('[Sempa] Failed to add extended columns to suppliers table: ' . $db->last_error);
                return false;
            }

            error_log('[Sempa] Extended columns added to suppliers table successfully');
            return true;
        }

        /**
         * Add supplier column to products table if it doesn't exist
         */
        private static function ensure_products_supplier_column()
        {
            $db = Sempa_Stocks_DB::instance();

            if (!($db instanceof \wpdb) || empty($db->dbh)) {
                return false;
            }

            $products_table = Sempa_Stocks_DB::table('stocks_sempa');
            if (empty($products_table)) {
                return false;
            }

            // Check if supplier column already exists
            $columns = $db->get_results("SHOW COLUMNS FROM " . Sempa_Stocks_DB::escape_identifier($products_table) . " LIKE 'supplier'");

            if (!empty($columns)) {
                return true; // Column already exists
            }

            // Add supplier column
            $sql = "ALTER TABLE " . Sempa_Stocks_DB::escape_identifier($products_table) . "
                    ADD COLUMN `supplier` varchar(255) DEFAULT NULL COMMENT 'Nom du fournisseur' AFTER `category`";

            $result = $db->query($sql);

            if ($result === false) {
                error_log('[Sempa] Failed to add supplier column to products table: ' . $db->last_error);
                return false;
            }

            // Add index on supplier column
            $sql_index = "ALTER TABLE " . Sempa_Stocks_DB::escape_identifier($products_table) . "
                         ADD INDEX `idx_supplier` (`supplier`)";

            $db->query($sql_index); // Index creation can fail if it already exists, don't check result

            error_log('[Sempa] Supplier column added to products table successfully');
            return true;
        }

        /**
         * Add etat_materiel column to products table if it doesn't exist
         * This column stores the material state: 'neuf' (new) or 'reconditionné' (refurbished)
         */
        private static function ensure_products_etat_materiel_column()
        {
            $db = Sempa_Stocks_DB::instance();

            if (!($db instanceof \wpdb) || empty($db->dbh)) {
                return false;
            }

            $products_table = Sempa_Stocks_DB::table('stocks_sempa');
            if (empty($products_table)) {
                return false;
            }

            // Check if etat_materiel column already exists
            $columns = $db->get_results("SHOW COLUMNS FROM " . Sempa_Stocks_DB::escape_identifier($products_table) . " LIKE 'etat_materiel'");

            if (!empty($columns)) {
                return true; // Column already exists
            }

            // Add etat_materiel column with ENUM type
            $sql = "ALTER TABLE " . Sempa_Stocks_DB::escape_identifier($products_table) . "
                    ADD COLUMN `etat_materiel` ENUM('neuf', 'reconditionné') DEFAULT 'neuf' COMMENT 'État du matériel (neuf ou reconditionné)' AFTER `supplier`";

            $result = $db->query($sql);

            if ($result === false) {
                error_log('[Sempa] Failed to add etat_materiel column to products table: ' . $db->last_error);
                return false;
            }

            error_log('[Sempa] Etat_materiel column added to products table successfully');
            return true;
        }

        /**
         * Add image_url column to products table if it doesn't exist
         * This column stores the product image URL
         */
        private static function ensure_products_image_url_column()
        {
            $db = Sempa_Stocks_DB::instance();

            if (!($db instanceof \wpdb) || empty($db->dbh)) {
                return false;
            }

            $products_table = Sempa_Stocks_DB::table('stocks_sempa');
            if (empty($products_table)) {
                return false;
            }

            // Check if image_url column already exists
            $columns = $db->get_results("SHOW COLUMNS FROM " . Sempa_Stocks_DB::escape_identifier($products_table) . " LIKE 'image_url'");

            if (!empty($columns)) {
                return true; // Column already exists
            }

            // Add image_url column
            $sql = "ALTER TABLE " . Sempa_Stocks_DB::escape_identifier($products_table) . "
                    ADD COLUMN `image_url` TEXT DEFAULT NULL COMMENT 'URL de l''image du produit'";

            $result = $db->query($sql);

            if ($result === false) {
                error_log('[Sempa] Failed to add image_url column to products table: ' . $db->last_error);
                return false;
            }

            error_log('[Sempa] image_url column added to products table successfully');
            return true;
        }

        /**
         * Add audit trail columns to products and movements tables
         * Adds: created_by, created_at, modified_by, modified_at
         */
        private static function ensure_audit_trail_columns()
        {
            $db = Sempa_Stocks_DB::instance();

            if (!($db instanceof \wpdb) || empty($db->dbh)) {
                return false;
            }

            $products_table = Sempa_Stocks_DB::table('stocks_sempa');
            $movements_table = Sempa_Stocks_DB::table('mouvements_stocks_sempa');

            // Add audit columns to products table
            if (!empty($products_table)) {
                self::add_audit_columns_to_table($products_table, 'products');
            }

            // Add audit columns to movements table
            if (!empty($movements_table)) {
                self::add_audit_columns_to_table($movements_table, 'movements');
            }

            return true;
        }

        /**
         * Add audit columns to a specific table
         */
        private static function add_audit_columns_to_table($table_name, $table_type)
        {
            $db = Sempa_Stocks_DB::instance();

            // Check which columns are missing
            $existing_columns = $db->get_col("SHOW COLUMNS FROM " . Sempa_Stocks_DB::escape_identifier($table_name));
            $columns_to_add = [];

            if (!in_array('created_by', $existing_columns)) {
                $columns_to_add[] = "ADD COLUMN `created_by` int(11) DEFAULT NULL COMMENT 'ID utilisateur créateur'";
            }

            if (!in_array('created_at', $existing_columns)) {
                $columns_to_add[] = "ADD COLUMN `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT 'Date de création'";
            }

            if (!in_array('modified_by', $existing_columns)) {
                $columns_to_add[] = "ADD COLUMN `modified_by` int(11) DEFAULT NULL COMMENT 'ID utilisateur dernière modification'";
            }

            if (!in_array('modified_at', $existing_columns)) {
                $columns_to_add[] = "ADD COLUMN `modified_at` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP COMMENT 'Date dernière modification'";
            }

            // If no columns to add, return
            if (empty($columns_to_add)) {
                return true;
            }

            // Build and execute ALTER TABLE query
            $sql = "ALTER TABLE " . Sempa_Stocks_DB::escape_identifier($table_name) . " " . implode(', ', $columns_to_add);

            $result = $db->query($sql);

            if ($result === false) {
                error_log('[Sempa] Failed to add audit trail columns to ' . $table_type . ' table: ' . $db->last_error);
                return false;
            }

            error_log('[Sempa] Audit trail columns added to ' . $table_type . ' table successfully');
            return true;
        }

        /**
         * Create the audit_log table for tracking all changes
         */
        private static function ensure_audit_log_table()
        {
            $db = Sempa_Stocks_DB::instance();

            if (!($db instanceof \wpdb) || empty($db->dbh)) {
                error_log('[Sempa] Cannot create audit_log table: database connection not available');
                return false;
            }

            // Check if table already exists
            // Note: sempa tables are NOT prefixed with wp_
            $table_name = 'sempa_audit_log';
            $existing_tables = $db->get_col("SHOW TABLES LIKE '$table_name'");
            if (!empty($existing_tables)) {
                return true; // Table already exists
            }

            // Create the audit_log table
            $sql = "CREATE TABLE IF NOT EXISTS `$table_name` (
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

            $result = $db->query($sql);

            if ($result === false) {
                error_log('[Sempa] Failed to create audit_log table: ' . $db->last_error);
                return false;
            }

            error_log('[Sempa] Audit log table created successfully');
            return true;
        }

        /**
         * Create the saved_filters table for storing user filter presets
         */
        private static function ensure_saved_filters_table()
        {
            $db = Sempa_Stocks_DB::instance();

            if (!($db instanceof \wpdb) || empty($db->dbh)) {
                error_log('[Sempa] Cannot create saved_filters table: database connection not available');
                return false;
            }

            // Check if table already exists
            // Note: sempa tables are NOT prefixed with wp_
            $table_name = 'sempa_saved_filters';
            $existing_tables = $db->get_col("SHOW TABLES LIKE '$table_name'");
            if (!empty($existing_tables)) {
                return true; // Table already exists
            }

            // Create the saved_filters table
            $sql = "CREATE TABLE IF NOT EXISTS `$table_name` (
                `id` INT(11) NOT NULL AUTO_INCREMENT,
                `user_id` INT(11) NOT NULL COMMENT 'ID utilisateur propriétaire',
                `filter_name` VARCHAR(255) NOT NULL COMMENT 'Nom du filtre',
                `filter_data` TEXT NOT NULL COMMENT 'Données du filtre (JSON)',
                `is_default` TINYINT(1) DEFAULT 0 COMMENT 'Filtre par défaut',
                `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                `updated_at` DATETIME DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (`id`),
                KEY `idx_user` (`user_id`),
                KEY `idx_default` (`user_id`, `is_default`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";

            $result = $db->query($sql);

            if ($result === false) {
                error_log('[Sempa] Failed to create saved_filters table: ' . $db->last_error);
                return false;
            }

            error_log('[Sempa] Saved filters table created successfully');
            return true;
        }

        /**
         * Create the stock_alerts table for tracking stock alerts and reorder reminders
         */
        private static function ensure_stock_alerts_table()
        {
            $db = Sempa_Stocks_DB::instance();

            if (!($db instanceof \wpdb) || empty($db->dbh)) {
                error_log('[Sempa] Cannot create stock_alerts table: database connection not available');
                return false;
            }

            // Check if table already exists
            $table_name = 'sempa_stock_alerts';
            $existing_tables = $db->get_col("SHOW TABLES LIKE '$table_name'");
            if (!empty($existing_tables)) {
                return true; // Table already exists
            }

            // Create the stock_alerts table
            $sql = "CREATE TABLE IF NOT EXISTS `$table_name` (
                `id` INT(11) NOT NULL AUTO_INCREMENT,
                `product_id` INT(11) NOT NULL COMMENT 'ID du produit',
                `alert_type` ENUM('low_stock', 'out_of_stock', 'reorder_reminder') NOT NULL COMMENT 'Type d''alerte',
                `status` ENUM('active', 'acknowledged', 'resolved') DEFAULT 'active' COMMENT 'Statut de l''alerte',
                `alert_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Date de l''alerte',
                `reorder_date` DATE DEFAULT NULL COMMENT 'Date prévue de commande',
                `quantity_needed` INT(11) DEFAULT NULL COMMENT 'Quantité à commander',
                `supplier_id` INT(11) DEFAULT NULL COMMENT 'Fournisseur recommandé',
                `notes` TEXT DEFAULT NULL COMMENT 'Notes sur l''alerte',
                `acknowledged_by` INT(11) DEFAULT NULL COMMENT 'ID utilisateur ayant pris en charge',
                `acknowledged_at` DATETIME DEFAULT NULL COMMENT 'Date de prise en charge',
                `resolved_at` DATETIME DEFAULT NULL COMMENT 'Date de résolution',
                `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (`id`),
                KEY `idx_product` (`product_id`),
                KEY `idx_status` (`status`),
                KEY `idx_alert_type` (`alert_type`),
                KEY `idx_reorder_date` (`reorder_date`),
                KEY `idx_supplier` (`supplier_id`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";

            $result = $db->query($sql);

            if ($result === false) {
                error_log('[Sempa] Failed to create stock_alerts table: ' . $db->last_error);
                return false;
            }

            error_log('[Sempa] Stock alerts table created successfully');
            return true;
        }
    }
}
