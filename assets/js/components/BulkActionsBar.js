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
   * @param {Function} options.onChangePriceAchat - Callback pour changer le prix d'achat
   * @param {Function} options.onChangePriceVente - Callback pour changer le prix de vente
   * @param {Function} options.onChangeStockMin - Callback pour changer le stock minimum
   * @param {Function} options.onChangeStockMax - Callback pour changer le stock maximum
   * @param {Function} options.onChangeEmplacement - Callback pour changer l'emplacement
   * @param {Function} options.onChangeReference - Callback pour modifier la référence
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
      onChangePriceAchat = null,
      onChangePriceVente = null,
      onChangeStockMin = null,
      onChangeStockMax = null,
      onChangeEmplacement = null,
      onChangeReference = null,
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

        <!-- Actions principales -->
        <div class="sp-bulk-actions-bar__actions">
          <!-- Catégorie -->
          <button type="button"
                  class="sp-bulk-actions-bar__action"
                  data-action="change-category"
                  title="Changer la catégorie">
            <i data-lucide="folder"></i>
            <span>Catégorie</span>
          </button>

          <!-- Fournisseur -->
          <button type="button"
                  class="sp-bulk-actions-bar__action"
                  data-action="change-supplier"
                  title="Changer le fournisseur">
            <i data-lucide="truck"></i>
            <span>Fournisseur</span>
          </button>

          <!-- Stock -->
          <button type="button"
                  class="sp-bulk-actions-bar__action"
                  data-action="adjust-stock"
                  title="Ajuster le stock actuel">
            <i data-lucide="package"></i>
            <span>Stock</span>
          </button>

          <!-- Stock Min -->
          <button type="button"
                  class="sp-bulk-actions-bar__action"
                  data-action="change-stock-min"
                  title="Définir le stock minimum">
            <i data-lucide="arrow-down-to-line"></i>
            <span>Stock min</span>
          </button>

          <!-- Stock Max -->
          <button type="button"
                  class="sp-bulk-actions-bar__action"
                  data-action="change-stock-max"
                  title="Définir le stock maximum">
            <i data-lucide="arrow-up-to-line"></i>
            <span>Stock max</span>
          </button>

          <!-- Prix d'achat -->
          <button type="button"
                  class="sp-bulk-actions-bar__action"
                  data-action="change-price-achat"
                  title="Modifier le prix d'achat">
            <i data-lucide="euro"></i>
            <span>Prix achat</span>
          </button>

          <!-- Prix de vente -->
          <button type="button"
                  class="sp-bulk-actions-bar__action"
                  data-action="change-price-vente"
                  title="Modifier le prix de vente">
            <i data-lucide="coins"></i>
            <span>Prix vente</span>
          </button>

          <!-- État -->
          <button type="button"
                  class="sp-bulk-actions-bar__action"
                  data-action="change-state"
                  title="Changer l'état matériel">
            <i data-lucide="tag"></i>
            <span>État</span>
          </button>

          <!-- Emplacement -->
          <button type="button"
                  class="sp-bulk-actions-bar__action"
                  data-action="change-emplacement"
                  title="Modifier l'emplacement">
            <i data-lucide="map-pin"></i>
            <span>Emplacement</span>
          </button>

          <!-- Référence -->
          <button type="button"
                  class="sp-bulk-actions-bar__action"
                  data-action="change-reference"
                  title="Modifier la référence">
            <i data-lucide="hash"></i>
            <span>Référence</span>
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
      onChangePriceAchat,
      onChangePriceVente,
      onChangeStockMin,
      onChangeStockMax,
      onChangeEmplacement,
      onChangeReference,
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
      onChangePriceAchat,
      onChangePriceVente,
      onChangeStockMin,
      onChangeStockMax,
      onChangeEmplacement,
      onChangeReference,
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

    // Changer stock min
    const changeStockMinBtn = bar.querySelector('[data-action="change-stock-min"]');
    if (changeStockMinBtn && onChangeStockMin) {
      changeStockMinBtn.addEventListener('click', () => onChangeStockMin());
    }

    // Changer stock max
    const changeStockMaxBtn = bar.querySelector('[data-action="change-stock-max"]');
    if (changeStockMaxBtn && onChangeStockMax) {
      changeStockMaxBtn.addEventListener('click', () => onChangeStockMax());
    }

    // Changer prix d'achat
    const changePriceAchatBtn = bar.querySelector('[data-action="change-price-achat"]');
    if (changePriceAchatBtn && onChangePriceAchat) {
      changePriceAchatBtn.addEventListener('click', () => onChangePriceAchat());
    }

    // Changer prix de vente
    const changePriceVenteBtn = bar.querySelector('[data-action="change-price-vente"]');
    if (changePriceVenteBtn && onChangePriceVente) {
      changePriceVenteBtn.addEventListener('click', () => onChangePriceVente());
    }

    // Changer état
    const changeStateBtn = bar.querySelector('[data-action="change-state"]');
    if (changeStateBtn && onChangeState) {
      changeStateBtn.addEventListener('click', () => onChangeState());
    }

    // Changer emplacement
    const changeEmplacementBtn = bar.querySelector('[data-action="change-emplacement"]');
    if (changeEmplacementBtn && onChangeEmplacement) {
      changeEmplacementBtn.addEventListener('click', () => onChangeEmplacement());
    }

    // Changer référence
    const changeReferenceBtn = bar.querySelector('[data-action="change-reference"]');
    if (changeReferenceBtn && onChangeReference) {
      changeReferenceBtn.addEventListener('click', () => onChangeReference());
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
