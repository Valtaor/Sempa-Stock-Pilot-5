<?php
/**
 * Audit Logger - Système d'historique et de traçabilité
 *
 * Enregistre toutes les modifications dans la table audit_log
 */

if (!defined('ABSPATH')) {
    exit;
}

final class Sempa_Audit_Logger
{
    /**
     * Log a change to the audit trail
     *
     * @param string $entity_type Type of entity (product, movement, etc.)
     * @param int $entity_id ID of the entity
     * @param string $action Action performed (created, updated, deleted)
     * @param array|null $old_values Values before change
     * @param array|null $new_values Values after change
     * @return bool Success
     */
    public static function log($entity_type, $entity_id, $action, $old_values = null, $new_values = null)
    {
        global $wpdb;
        $user = wp_get_current_user();

        if (!$user->exists()) {
            error_log('[Sempa Audit] No user logged in, cannot log audit entry');
            return false;
        }

        $table_name = $wpdb->prefix . 'sempa_audit_log';

        // Generate changes summary
        $changes_summary = self::generate_changes_summary($old_values, $new_values, $action);

        // Get client IP
        $ip_address = self::get_client_ip();

        // Get user agent
        $user_agent = isset($_SERVER['HTTP_USER_AGENT']) ? substr($_SERVER['HTTP_USER_AGENT'], 0, 500) : '';

        $data = [
            'entity_type' => sanitize_key($entity_type),
            'entity_id' => absint($entity_id),
            'action' => sanitize_key($action),
            'user_id' => $user->ID,
            'user_name' => $user->display_name ?: $user->user_login,
            'user_email' => $user->user_email,
            'old_values' => $old_values ? wp_json_encode($old_values) : null,
            'new_values' => $new_values ? wp_json_encode($new_values) : null,
            'changes_summary' => $changes_summary,
            'ip_address' => $ip_address,
            'user_agent' => $user_agent,
            'created_at' => current_time('mysql'),
        ];

        $result = $wpdb->insert($table_name, $data);

        if ($result === false) {
            error_log('[Sempa Audit] Failed to insert audit log: ' . $wpdb->last_error);
            return false;
        }

        return true;
    }

    /**
     * Get audit history for a specific entity
     *
     * @param string $entity_type Type of entity
     * @param int $entity_id ID of entity
     * @param int $limit Maximum number of entries to return
     * @return array Array of audit log entries
     */
    public static function get_history($entity_type, $entity_id, $limit = 50)
    {
        global $wpdb;
        $table_name = $wpdb->prefix . 'sempa_audit_log';

        $query = $wpdb->prepare(
            "SELECT * FROM $table_name
             WHERE entity_type = %s AND entity_id = %d
             ORDER BY created_at DESC
             LIMIT %d",
            sanitize_key($entity_type),
            absint($entity_id),
            absint($limit)
        );

        $results = $wpdb->get_results($query, ARRAY_A);

        if ($results === null) {
            error_log('[Sempa Audit] Failed to fetch audit history: ' . $wpdb->last_error);
            return [];
        }

        // Decode JSON fields
        foreach ($results as &$entry) {
            if (!empty($entry['old_values'])) {
                $entry['old_values'] = json_decode($entry['old_values'], true);
            }
            if (!empty($entry['new_values'])) {
                $entry['new_values'] = json_decode($entry['new_values'], true);
            }
        }

        return $results;
    }

    /**
     * Get recent audit activity across all entities
     *
     * @param int $limit Maximum number of entries
     * @return array Array of audit log entries
     */
    public static function get_recent_activity($limit = 100)
    {
        global $wpdb;
        $table_name = $wpdb->prefix . 'sempa_audit_log';

        $query = $wpdb->prepare(
            "SELECT * FROM $table_name
             ORDER BY created_at DESC
             LIMIT %d",
            absint($limit)
        );

        $results = $wpdb->get_results($query, ARRAY_A);

        if ($results === null) {
            error_log('[Sempa Audit] Failed to fetch recent activity: ' . $wpdb->last_error);
            return [];
        }

        // Decode JSON fields
        foreach ($results as &$entry) {
            if (!empty($entry['old_values'])) {
                $entry['old_values'] = json_decode($entry['old_values'], true);
            }
            if (!empty($entry['new_values'])) {
                $entry['new_values'] = json_decode($entry['new_values'], true);
            }
        }

        return $results;
    }

    /**
     * Generate a human-readable summary of changes
     *
     * @param array|null $old_values Old values
     * @param array|null $new_values New values
     * @param string $action Action type
     * @return string Summary
     */
    private static function generate_changes_summary($old_values, $new_values, $action)
    {
        if ($action === 'created') {
            return 'Élément créé';
        }

        if ($action === 'deleted') {
            return 'Élément supprimé';
        }

        if (!is_array($old_values) || !is_array($new_values)) {
            return 'Modification';
        }

        $changes = [];
        $field_labels = self::get_field_labels();

        foreach ($new_values as $key => $new_value) {
            $old_value = $old_values[$key] ?? null;

            if ($old_value != $new_value) {
                $label = $field_labels[$key] ?? ucfirst($key);
                $changes[] = "$label modifié";
            }
        }

        if (empty($changes)) {
            return 'Aucune modification';
        }

        return implode(', ', $changes);
    }

    /**
     * Get field labels for human-readable output
     *
     * @return array Field labels
     */
    private static function get_field_labels()
    {
        return [
            'reference' => 'Référence',
            'designation' => 'Désignation',
            'categorie' => 'Catégorie',
            'fournisseur' => 'Fournisseur',
            'etat_materiel' => 'État matériel',
            'prix_achat' => 'Prix achat',
            'prix_vente' => 'Prix vente',
            'stock_actuel' => 'Stock actuel',
            'stock_minimum' => 'Stock minimum',
            'stock_maximum' => 'Stock maximum',
            'emplacement' => 'Emplacement',
            'notes' => 'Notes',
            'date_entree' => 'Date entrée',
            'document_pdf' => 'Document PDF',
        ];
    }

    /**
     * Get client IP address
     *
     * @return string IP address
     */
    private static function get_client_ip()
    {
        $ip = '';

        if (isset($_SERVER['HTTP_CLIENT_IP'])) {
            $ip = $_SERVER['HTTP_CLIENT_IP'];
        } elseif (isset($_SERVER['HTTP_X_FORWARDED_FOR'])) {
            $ip = $_SERVER['HTTP_X_FORWARDED_FOR'];
        } elseif (isset($_SERVER['HTTP_X_FORWARDED'])) {
            $ip = $_SERVER['HTTP_X_FORWARDED'];
        } elseif (isset($_SERVER['HTTP_FORWARDED_FOR'])) {
            $ip = $_SERVER['HTTP_FORWARDED_FOR'];
        } elseif (isset($_SERVER['HTTP_FORWARDED'])) {
            $ip = $_SERVER['HTTP_FORWARDED'];
        } elseif (isset($_SERVER['REMOTE_ADDR'])) {
            $ip = $_SERVER['REMOTE_ADDR'];
        }

        // Validate IP
        $ip = filter_var($ip, FILTER_VALIDATE_IP);

        return $ip ? substr($ip, 0, 45) : '';
    }
}
