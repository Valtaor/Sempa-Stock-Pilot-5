/**
 * COMPOSANT BULK ACTIONS BAR
 *
 * Barre d'actions flottante pour les modifications en masse
 */

class BulkActionsBar {
  /**
   * Crée la barre d'actions en masse
   *
   * @param {Object} options - Options
   * @param {number} options.selectedCount - Nombre de produits sélectionnés
   * @param {Function} options.onSelectAll - Callback pour tout sélectionner
   * @param {Function} options.onDeselectAll - Callback pour tout désélectionner
   * @param {Function} options.onChangeCategory - Callback pour changer la catégorie
   * @param {Function} options.onChangeSupplier - Callback pour changer le fournisseur
   * @param {Function} options.onAdjustStock - Callback pour ajuster le stock
   * @param {Function} options.onChangeState - Callback pour changer l'état matériel
   * @param {Function} options.onDelete - Callback pour supprimer
   * @param {Array} options.categories - Liste des catégories disponibles
   * @param {Array} options.suppliers - Liste des fournisseurs disponibles
   * @returns {HTMLElement} - Élément DOM de la barre
   */
  static render(options = {}) {
    const {
      selectedCount = 0,
      onSelectAll = null,
      onDeselectAll = null,
      onChangeCategory = null,
      onChangeSupplier = null,
      onAdjustStock = null,
      onChangeState = null,
      onDelete = null,
      categories = [],
      suppliers = [],
    } = options;

    // Créer le conteneur
    const bar = document.createElement('div');
    bar.className = 'sp-bulk-actions-bar' + (selectedCount > 0 ? ' sp-bulk-actions-bar--visible' : '');
    bar.setAttribute('role', 'toolbar');
    bar.setAttribute('aria-label', 'Actions en masse');

    bar.innerHTML = `
      <div class="sp-bulk-actions-bar__content">
        <!-- Compteur et sélection -->
        <div class="sp-bulk-actions-bar__counter">
          <span class="sp-bulk-actions-bar__count">${selectedCount}</span>
          <span class="sp-bulk-actions-bar__label">${selectedCount > 1 ? 'produits sélectionnés' : 'produit sélectionné'}</span>
        </div>

        <!-- Actions -->
        <div class="sp-bulk-actions-bar__actions">
          <!-- Changer catégorie -->
          <button type="button"
                  class="sp-bulk-actions-bar__action"
                  data-action="change-category"
                  title="Changer la catégorie">
            <i data-lucide="folder"></i>
            <span>Catégorie</span>
          </button>

          <!-- Changer fournisseur -->
          <button type="button"
                  class="sp-bulk-actions-bar__action"
                  data-action="change-supplier"
                  title="Changer le fournisseur">
            <i data-lucide="truck"></i>
            <span>Fournisseur</span>
          </button>

          <!-- Ajuster stock -->
          <button type="button"
                  class="sp-bulk-actions-bar__action"
                  data-action="adjust-stock"
                  title="Ajuster le stock">
            <i data-lucide="package"></i>
            <span>Stock</span>
          </button>

          <!-- Changer état -->
          <button type="button"
                  class="sp-bulk-actions-bar__action"
                  data-action="change-state"
                  title="Changer l'état matériel">
            <i data-lucide="tag"></i>
            <span>État</span>
          </button>

          <!-- Supprimer -->
          <button type="button"
                  class="sp-bulk-actions-bar__action sp-bulk-actions-bar__action--danger"
                  data-action="delete"
                  title="Supprimer">
            <i data-lucide="trash-2"></i>
            <span>Supprimer</span>
          </button>
        </div>

        <!-- Boutons secondaires -->
        <div class="sp-bulk-actions-bar__secondary">
          <button type="button"
                  class="sp-bulk-actions-bar__btn sp-bulk-actions-bar__btn--text"
                  data-action="deselect-all"
                  title="Tout désélectionner">
            Désélectionner tout
          </button>
        </div>
      </div>
    `;

    // Attacher les event listeners
    this.attachEventListeners(bar, {
      onSelectAll,
      onDeselectAll,
      onChangeCategory,
      onChangeSupplier,
      onAdjustStock,
      onChangeState,
      onDelete,
    });

    return bar;
  }

  /**
   * Met à jour le compteur de la barre
   *
   * @param {HTMLElement} bar - Élément de la barre
   * @param {number} count - Nouveau nombre de sélections
   */
  static updateCount(bar, count) {
    const countElement = bar.querySelector('.sp-bulk-actions-bar__count');
    const labelElement = bar.querySelector('.sp-bulk-actions-bar__label');

    if (countElement) {
      countElement.textContent = count;
    }

    if (labelElement) {
      labelElement.textContent = count > 1 ? 'produits sélectionnés' : 'produit sélectionné';
    }

    // Afficher/masquer la barre
    if (count > 0) {
      bar.classList.add('sp-bulk-actions-bar--visible');
    } else {
      bar.classList.remove('sp-bulk-actions-bar--visible');
    }
  }

  /**
   * Attache les event listeners
   *
   * @param {HTMLElement} bar - Élément de la barre
   * @param {Object} callbacks - Callbacks pour les actions
   */
  static attachEventListeners(bar, callbacks) {
    const {
      onSelectAll,
      onDeselectAll,
      onChangeCategory,
      onChangeSupplier,
      onAdjustStock,
      onChangeState,
      onDelete,
    } = callbacks;

    // Désélectionner tout
    const deselectAllBtn = bar.querySelector('[data-action="deselect-all"]');
    if (deselectAllBtn && onDeselectAll) {
      deselectAllBtn.addEventListener('click', () => onDeselectAll());
    }

    // Changer catégorie
    const changeCategoryBtn = bar.querySelector('[data-action="change-category"]');
    if (changeCategoryBtn && onChangeCategory) {
      changeCategoryBtn.addEventListener('click', () => onChangeCategory());
    }

    // Changer fournisseur
    const changeSupplierBtn = bar.querySelector('[data-action="change-supplier"]');
    if (changeSupplierBtn && onChangeSupplier) {
      changeSupplierBtn.addEventListener('click', () => onChangeSupplier());
    }

    // Ajuster stock
    const adjustStockBtn = bar.querySelector('[data-action="adjust-stock"]');
    if (adjustStockBtn && onAdjustStock) {
      adjustStockBtn.addEventListener('click', () => onAdjustStock());
    }

    // Changer état
    const changeStateBtn = bar.querySelector('[data-action="change-state"]');
    if (changeStateBtn && onChangeState) {
      changeStateBtn.addEventListener('click', () => onChangeState());
    }

    // Supprimer
    const deleteBtn = bar.querySelector('[data-action="delete"]');
    if (deleteBtn && onDelete) {
      deleteBtn.addEventListener('click', () => onDelete());
    }
  }
}

// Export global
if (typeof window !== 'undefined') {
  window.BulkActionsBar = BulkActionsBar;
}

// Export pour module ES6
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BulkActionsBar;
}
