/**
 * COMPOSANT HISTORY MODAL
 *
 * Modal pour afficher l'historique des modifications d'un produit
 */

console.log('📦 Chargement de HistoryModal.js...');

class HistoryModal {
  /**
   * Affiche l'historique d'un produit dans une modal
   *
   * @param {number} productId - ID du produit
   * @param {string} productName - Nom du produit pour le titre
   */
  static async show(productId, productName = 'Produit') {
    console.log(`🕒 Affichage historique produit #${productId}`);

    // Créer la modal
    const modal = this.createModal(productName);
    document.body.appendChild(modal);

    // Afficher le loader
    const content = modal.querySelector('.history-modal__content');
    content.innerHTML = '<div class="history-modal__loader">Chargement de l\'historique...</div>';

    try {
      // Charger l'historique
      const history = await this.fetchHistory(productId);

      // Afficher l'historique
      content.innerHTML = this.renderHistory(history);

      // Initialiser les icônes Lucide si disponibles
      if (window.lucide) {
        lucide.createIcons();
      }
    } catch (error) {
      console.error('❌ Erreur chargement historique:', error);
      content.innerHTML = `
        <div class="history-modal__error">
          <i data-lucide="alert-circle"></i>
          <p>Erreur lors du chargement de l'historique</p>
          <p class="history-modal__error-detail">${error.message}</p>
        </div>
      `;

      if (window.lucide) {
        lucide.createIcons();
      }
    }
  }

  /**
   * Crée l'élément modal
   *
   * @param {string} productName - Nom du produit
   * @returns {HTMLElement} Modal element
   */
  static createModal(productName) {
    const modal = document.createElement('div');
    modal.className = 'history-modal';
    modal.innerHTML = `
      <div class="history-modal__overlay"></div>
      <div class="history-modal__dialog">
        <div class="history-modal__header">
          <h2 class="history-modal__title">
            <i data-lucide="clock"></i>
            Historique - ${this.escapeHtml(productName)}
          </h2>
          <button class="history-modal__close" type="button" aria-label="Fermer">
            <i data-lucide="x"></i>
          </button>
        </div>
        <div class="history-modal__content">
          <!-- Contenu chargé dynamiquement -->
        </div>
      </div>
    `;

    // Event listeners
    const closeBtn = modal.querySelector('.history-modal__close');
    const overlay = modal.querySelector('.history-modal__overlay');

    const closeModal = () => {
      modal.remove();
    };

    closeBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', closeModal);

    // Fermer avec Escape
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        closeModal();
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);

    // Initialiser les icônes Lucide du header
    if (window.lucide) {
      lucide.createIcons();
    }

    return modal;
  }

  /**
   * Récupère l'historique depuis l'API
   *
   * @param {number} productId - ID du produit
   * @returns {Promise<Array>} Historique
   */
  static async fetchHistory(productId) {
    const url = `${SempaStocksData.ajaxUrl}?action=sempa_stocks_get_history&entity_type=product&entity_id=${productId}&nonce=${SempaStocksData.nonce}`;
    console.log('🔍 Requête historique:', { productId, url });

    const response = await fetch(url, {
      method: 'GET',
      credentials: 'same-origin',
    });

    console.log('📡 Réponse HTTP:', { status: response.status, ok: response.ok });

    if (!response.ok) {
      throw new Error(`Erreur HTTP ${response.status}`);
    }

    const data = await response.json();
    console.log('📦 Données reçues:', data);

    if (!data.success) {
      console.error('❌ Erreur API:', data.data?.message);
      throw new Error(data.data?.message || 'Erreur inconnue');
    }

    const history = data.data.history || [];
    console.log(`✅ Historique récupéré: ${history.length} entrées`, history);

    return history;
  }

  /**
   * Génère le HTML de l'historique
   *
   * @param {Array} history - Entrées d'historique
   * @returns {string} HTML
   */
  static renderHistory(history) {
    if (!history || history.length === 0) {
      return `
        <div class="history-modal__empty">
          <i data-lucide="inbox"></i>
          <p>Aucun historique disponible pour ce produit</p>
        </div>
      `;
    }

    const items = history.map(entry => this.renderHistoryEntry(entry)).join('');

    return `
      <div class="history-timeline">
        ${items}
      </div>
    `;
  }

  /**
   * Génère le HTML d'une entrée d'historique
   *
   * @param {Object} entry - Entrée d'historique
   * @returns {string} HTML
   */
  static renderHistoryEntry(entry) {
    const actionIcon = this.getActionIcon(entry.action);
    const actionLabel = this.getActionLabel(entry.action);
    const actionClass = this.getActionClass(entry.action);
    const date = this.formatDate(entry.created_at);
    const changes = this.renderChanges(entry.old_values, entry.new_values, entry.action);

    return `
      <div class="history-entry history-entry--${actionClass}">
        <div class="history-entry__icon">
          <i data-lucide="${actionIcon}"></i>
        </div>
        <div class="history-entry__content">
          <div class="history-entry__header">
            <span class="history-entry__action">${actionLabel}</span>
            <span class="history-entry__date">${date}</span>
          </div>
          <div class="history-entry__user">
            <i data-lucide="user"></i>
            ${this.escapeHtml(entry.user_name)} (${this.escapeHtml(entry.user_email)})
          </div>
          ${entry.changes_summary ? `
            <div class="history-entry__summary">
              ${this.escapeHtml(entry.changes_summary)}
            </div>
          ` : ''}
          ${changes ? `
            <details class="history-entry__details">
              <summary>Voir les détails</summary>
              <div class="history-entry__changes">
                ${changes}
              </div>
            </details>
          ` : ''}
        </div>
      </div>
    `;
  }

  /**
   * Génère le HTML des changements détaillés
   *
   * @param {Object|null} oldValues - Anciennes valeurs
   * @param {Object|null} newValues - Nouvelles valeurs
   * @param {string} action - Action effectuée
   * @returns {string} HTML
   */
  static renderChanges(oldValues, newValues, action) {
    if (action === 'created') {
      if (!newValues) return '';

      const fields = this.getDisplayFields(newValues);
      return fields.map(([label, value]) => `
        <div class="history-change">
          <strong>${label}:</strong> ${this.escapeHtml(this.formatValue(value))}
        </div>
      `).join('');
    }

    if (action === 'deleted') {
      if (!oldValues) return '';

      const fields = this.getDisplayFields(oldValues);
      return fields.map(([label, value]) => `
        <div class="history-change history-change--deleted">
          <strong>${label}:</strong> ${this.escapeHtml(this.formatValue(value))}
        </div>
      `).join('');
    }

    if (action === 'updated') {
      if (!oldValues || !newValues) return '';

      const changes = [];
      const fieldLabels = this.getFieldLabels();

      Object.keys(newValues).forEach(key => {
        const oldValue = oldValues[key];
        const newValue = newValues[key];

        if (oldValue != newValue && key !== 'id') {
          const label = fieldLabels[key] || key;
          changes.push(`
            <div class="history-change">
              <strong>${label}:</strong>
              <span class="history-change__old">${this.escapeHtml(this.formatValue(oldValue))}</span>
              →
              <span class="history-change__new">${this.escapeHtml(this.formatValue(newValue))}</span>
            </div>
          `);
        }
      });

      return changes.join('');
    }

    return '';
  }

  /**
   * Obtient les champs à afficher
   *
   * @param {Object} values - Valeurs
   * @returns {Array} Tableau de [label, valeur]
   */
  static getDisplayFields(values) {
    const fieldLabels = this.getFieldLabels();
    const fields = [];

    // Ordre d'affichage souhaité
    const order = [
      'reference', 'designation', 'categorie', 'fournisseur',
      'stock_actuel', 'stock_minimum', 'stock_maximum',
      'prix_achat', 'prix_vente', 'etat_materiel', 'emplacement'
    ];

    order.forEach(key => {
      if (values[key] !== undefined && values[key] !== null && values[key] !== '') {
        const label = fieldLabels[key] || key;
        fields.push([label, values[key]]);
      }
    });

    return fields;
  }

  /**
   * Labels des champs
   */
  static getFieldLabels() {
    return {
      reference: 'Référence',
      designation: 'Désignation',
      categorie: 'Catégorie',
      fournisseur: 'Fournisseur',
      etat_materiel: 'État',
      prix_achat: 'Prix achat',
      prix_vente: 'Prix vente',
      stock_actuel: 'Stock actuel',
      stock_minimum: 'Stock minimum',
      stock_maximum: 'Stock maximum',
      emplacement: 'Emplacement',
      notes: 'Notes',
      date_entree: 'Date d\'entrée',
    };
  }

  /**
   * Icône selon l'action
   */
  static getActionIcon(action) {
    const icons = {
      created: 'plus-circle',
      updated: 'edit-2',
      deleted: 'trash-2',
    };
    return icons[action] || 'activity';
  }

  /**
   * Label selon l'action
   */
  static getActionLabel(action) {
    const labels = {
      created: 'Création',
      updated: 'Modification',
      deleted: 'Suppression',
    };
    return labels[action] || action;
  }

  /**
   * Classe CSS selon l'action
   */
  static getActionClass(action) {
    const classes = {
      created: 'create',
      updated: 'update',
      deleted: 'delete',
    };
    return classes[action] || 'default';
  }

  /**
   * Formate une date
   */
  static formatDate(dateString) {
    if (!dateString) return '';

    const date = new Date(dateString);

    // Format relatif si récent
    const now = new Date();
    const diffMs = now - date;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffHours < 24) {
      if (diffHours < 1) {
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        if (diffMinutes < 1) return 'À l\'instant';
        return `Il y a ${diffMinutes} minute${diffMinutes > 1 ? 's' : ''}`;
      }
      return `Il y a ${diffHours} heure${diffHours > 1 ? 's' : ''}`;
    }

    // Format complet
    return date.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Formate une valeur pour l'affichage
   */
  static formatValue(value) {
    if (value === null || value === undefined) return '—';
    if (value === '') return '(vide)';
    if (typeof value === 'boolean') return value ? 'Oui' : 'Non';
    if (typeof value === 'number') return value.toString();
    return String(value);
  }

  /**
   * Échappe les caractères HTML
   */
  static escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
  }
}

// Export global
if (typeof window !== 'undefined') {
  window.HistoryModal = HistoryModal;
  console.log('✅ HistoryModal exporté vers window.HistoryModal');
}

// Export pour utilisation en module ES6
if (typeof module !== 'undefined' && module.exports) {
  module.exports = HistoryModal;
  console.log('✅ HistoryModal exporté comme module ES6');
}
