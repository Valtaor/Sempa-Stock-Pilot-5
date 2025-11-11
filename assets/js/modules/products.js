/**
 * MODULE PRODUCTS
 *
 * Gère la vue produits avec affichage en grille de cartes,
 * filtres multi-critères, recherche et pagination
 */

class ProductsModule {
  constructor() {
    this.products = [];
    this.filteredProducts = [];
    this.currentPage = 1;
    this.perPage = 24;
    this.filters = {
      search: '',
      category: '',
      supplier: '',
      status: ''
    };
    this.currentViewType = localStorage.getItem('productsViewType') || 'grid'; // 'grid' ou 'table'
    this.initialized = false;

    // Gestion de la sélection multiple
    this.selectedProducts = new Set(); // IDs des produits sélectionnés
    this.bulkActionsBar = null; // Instance de la barre d'actions
    this.selectionMode = false; // Mode sélection activé/désactivé
  }

  /**
   * Récupère le client API (attend l'initialisation si nécessaire)
   */
  async getApiClient() {
    console.log('🔍 ProductsModule - Tentative de récupération API...');

    if (window.api) {
      console.log('✅ window.api disponible immédiatement');
      return window.api;
    }

    console.log('⏳ window.api non disponible, essai waitForStockPilotAPI...');

    if (typeof window.waitForStockPilotAPI === 'function') {
      console.log('✅ waitForStockPilotAPI existe, appel en cours...');
      const api = await window.waitForStockPilotAPI();
      console.log('✅ API récupérée via waitForStockPilotAPI');
      return api;
    }

    if (window.stockpilotAPIReady && typeof window.stockpilotAPIReady.then === 'function') {
      console.log('✅ stockpilotAPIReady existe, attente...');
      const api = await window.stockpilotAPIReady;
      console.log('✅ API récupérée via stockpilotAPIReady');
      return api;
    }

    console.error('❌ Aucune méthode d\'initialisation API trouvée !');
    console.error('window.api:', window.api);
    console.error('window.waitForStockPilotAPI:', typeof window.waitForStockPilotAPI);
    console.error('window.stockpilotAPIReady:', window.stockpilotAPIReady);

    throw new Error('API StockPilot non initialisée');
  }

  /**
   * Initialise le module
   */
  async init() {
    if (this.initialized) {
      console.log('📦 Module Products déjà initialisé');
      return;
    }

    console.log('📦 Initialisation du module Products...');

    try {
      // Vérifier et réparer le conteneur si nécessaire
      this.ensureContainer();

      // CORRECTION : Appliquer la vue par défaut AVANT de charger les produits
      // pour que le bon conteneur soit visible dès le début
      this.applyViewType(this.currentViewType);

      // Charger les produits
      await this.loadProducts();

      // Initialiser les event listeners (sans réappliquer la vue)
      this.initEventListeners();

      // Initialiser la barre d'actions en masse
      this.initBulkActionsBar();

      // Afficher les produits
      this.renderProducts();

      this.initialized = true;
      console.log('✅ Module Products initialisé');
    } catch (error) {
      console.error('❌ Erreur initialisation Products:', error);
      this.showError('Erreur lors du chargement des produits');
    }
  }

  /**
   * Vérifie que le conteneur existe (il doit toujours exister dans le HTML)
   */
  ensureContainer() {
    const container = document.getElementById('products-grid-container');

    if (container) {
      console.log('✅ Conteneur products-grid-container présent');
      return;
    }

    // Le conteneur devrait toujours exister dans le HTML (stocks.php ligne 340)
    // S'il n'existe pas, c'est une erreur critique
    console.error('❌ ERREUR CRITIQUE: Conteneur products-grid-container manquant du HTML !');
    console.error('❌ Vérifier stocks.php ligne 340 - le conteneur doit être présent');
  }

  /**
   * Charge les produits depuis l'API
   */
  async loadProducts() {
    console.log('🔄 Chargement des produits...');

    try {
      const apiClient = await this.getApiClient();
      const response = await apiClient.getProducts();
      this.products = response.products || [];
      this.applyFilters();

      // Remplir les selects de filtres
      this.populateFilterSelects();

      console.log(`✅ ${this.products.length} produits chargés`);
    } catch (error) {
      console.error('❌ Erreur chargement produits:', error);
      throw error;
    }
  }

  /**
   * Remplit les selects de filtres avec les catégories et fournisseurs
   */
  populateFilterSelects() {
    // Extraire les catégories uniques
    const categories = [...new Set(this.products.map(p => p.categorie).filter(Boolean))].sort();
    const categoryFilter = document.getElementById('stocks-filter-category');

    if (categoryFilter) {
      const currentValue = categoryFilter.value;
      categoryFilter.innerHTML = '<option value="">Toutes les catégories</option>';
      categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        option.textContent = cat;
        categoryFilter.appendChild(option);
      });
      if (currentValue) {
        categoryFilter.value = currentValue;
      }
    }

    // Extraire les fournisseurs uniques
    const suppliers = [...new Set(this.products.map(p => p.fournisseur).filter(Boolean))].sort();
    const supplierFilter = document.getElementById('stocks-filter-supplier');

    if (supplierFilter) {
      const currentValue = supplierFilter.value;
      supplierFilter.innerHTML = '<option value="">Tous les fournisseurs</option>';
      suppliers.forEach(sup => {
        const option = document.createElement('option');
        option.value = sup;
        option.textContent = sup;
        supplierFilter.appendChild(option);
      });
      if (currentValue) {
        supplierFilter.value = currentValue;
      }
    }

    console.log(`✅ Filtres peuplés: ${categories.length} catégories, ${suppliers.length} fournisseurs`);
  }

  /**
   * Initialise les event listeners
   */
  initEventListeners() {
    // Soumission du formulaire produit
    const productForm = document.getElementById('stock-product-form');
    if (productForm) {
      productForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log('📝 Soumission du formulaire produit');
        await this.saveProduct(e.target);
      });
      console.log('✅ Listener soumission formulaire produit attaché');
    } else {
      console.warn('⚠️ Formulaire produit non trouvé pour attacher le listener');
    }

    // Recherche
    const searchInput = document.getElementById('stocks-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.filters.search = e.target.value.trim().toLowerCase();
        this.currentPage = 1;
        this.applyFilters();
        this.renderProducts();
      });
    }

    // Filtre catégorie
    const categoryFilter = document.getElementById('stocks-filter-category');
    if (categoryFilter) {
      categoryFilter.addEventListener('change', (e) => {
        this.filters.category = e.target.value;
        this.currentPage = 1;
        this.applyFilters();
        this.renderProducts();
      });
    }

    // Filtre fournisseur
    const supplierFilter = document.getElementById('stocks-filter-supplier');
    if (supplierFilter) {
      supplierFilter.addEventListener('change', (e) => {
        this.filters.supplier = e.target.value;
        this.currentPage = 1;
        this.applyFilters();
        this.renderProducts();
      });
    }

    // Filtre statut
    const statusFilter = document.getElementById('stocks-filter-status');
    if (statusFilter) {
      statusFilter.addEventListener('change', (e) => {
        this.filters.status = e.target.value;
        this.currentPage = 1;
        this.applyFilters();
        this.renderProducts();
      });
    }

    // Bouton réinitialiser filtres
    const clearFiltersBtn = document.getElementById('stocks-clear-filters');
    if (clearFiltersBtn) {
      clearFiltersBtn.addEventListener('click', () => {
        this.clearFilters();
      });
    }

    // Bouton ajouter produit
    const addProductBtn = document.getElementById('stocks-open-product-form');
    if (addProductBtn) {
      addProductBtn.addEventListener('click', () => {
        this.openProductForm();
      });
    }

    // Boutons de fermeture du formulaire
    const closeFormBtn = document.getElementById('stocks-cancel-product');
    if (closeFormBtn) {
      closeFormBtn.addEventListener('click', () => {
        this.closeProductForm();
      });
    }

    const cancelFormBtn = document.querySelector('[data-dismiss="product"]');
    if (cancelFormBtn) {
      cancelFormBtn.addEventListener('click', () => {
        this.closeProductForm();
      });
    }

    // Pagination - produits par page
    const perPageSelect = document.getElementById('products-per-page');
    if (perPageSelect) {
      perPageSelect.addEventListener('change', (e) => {
        const value = e.target.value;
        this.perPage = value === 'all' ? this.filteredProducts.length : parseInt(value);
        this.currentPage = 1;
        this.renderProducts();
      });
    }

    // Pagination - page précédente
    const prevPageBtn = document.getElementById('products-prev-page');
    if (prevPageBtn) {
      prevPageBtn.addEventListener('click', () => {
        if (this.currentPage > 1) {
          this.currentPage--;
          this.renderProducts();
          this.scrollToTop();
        }
      });
    }

    // Pagination - page suivante
    const nextPageBtn = document.getElementById('products-next-page');
    if (nextPageBtn) {
      nextPageBtn.addEventListener('click', () => {
        const totalPages = Math.ceil(this.filteredProducts.length / this.perPage);
        if (this.currentPage < totalPages) {
          this.currentPage++;
          this.renderProducts();
          this.scrollToTop();
        }
      });
    }

    // Toggle de vue (cartes/tableau)
    const viewToggleBtns = document.querySelectorAll('.view-toggle__btn');
    viewToggleBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const viewType = btn.getAttribute('data-view-type');
        this.switchViewType(viewType);
      });
    });

    // Toggle mode sélection
    const toggleSelectionBtn = document.getElementById('stocks-toggle-selection-mode');
    if (toggleSelectionBtn) {
      toggleSelectionBtn.addEventListener('click', () => {
        this.toggleSelectionMode();
        // Mettre à jour l'apparence du bouton
        if (this.selectionMode) {
          toggleSelectionBtn.classList.add('button--primary');
          toggleSelectionBtn.classList.remove('button--ghost');
        } else {
          toggleSelectionBtn.classList.remove('button--primary');
          toggleSelectionBtn.classList.add('button--ghost');
        }
      });
    }

    // CORRECTION : Ne plus appliquer la vue ici car c'est déjà fait dans init()

    console.log('✅ Event listeners initialisés');
  }

  /**
   * Applique les filtres aux produits
   */
  applyFilters() {
    this.filteredProducts = this.products.filter(product => {
      // Filtre recherche
      if (this.filters.search) {
        const search = this.filters.search;
        const matchesSearch =
          (product.reference && product.reference.toLowerCase().includes(search)) ||
          (product.designation && product.designation.toLowerCase().includes(search)) ||
          (product.categorie && product.categorie.toLowerCase().includes(search)) ||
          (product.fournisseur && product.fournisseur.toLowerCase().includes(search));

        if (!matchesSearch) return false;
      }

      // Filtre catégorie
      if (this.filters.category && product.categorie !== this.filters.category) {
        return false;
      }

      // Filtre fournisseur
      if (this.filters.supplier && product.fournisseur !== this.filters.supplier) {
        return false;
      }

      // Filtre statut
      if (this.filters.status) {
        const stockStatus = ProductCard.getStockStatus(product);
        const statusMap = {
          'normal': 'success',
          'warning': 'warning',
          'critical': 'danger'
        };
        if (stockStatus.variant !== statusMap[this.filters.status]) {
          return false;
        }
      }

      return true;
    });

    console.log(`🔍 ${this.filteredProducts.length} produits après filtrage`);
  }

  /**
   * Affiche les produits (selon la vue active)
   */
  renderProducts() {
    console.log('🎨 Début renderProducts()');

    // Appeler la méthode appropriée selon la vue active
    if (this.currentViewType === 'table') {
      this.renderProductsTable();
    } else {
      this.renderProductsGrid();
    }
  }

  /**
   * Affiche les produits en mode grille (cartes)
   */
  renderProductsGrid() {
    console.log('🎨 Rendu des produits en mode grille');

    try {
      // Vérifier que le conteneur existe
      this.ensureContainer();

      const container = document.getElementById('products-grid-container');
      if (!container) {
        console.error('❌ Conteneur #products-grid-container non trouvé');
        return;
      }

      console.log('✅ Conteneur trouvé, suppression du loader HTML statique et affichage du loader dynamique...');

      // CORRECTION : Vider complètement le conteneur pour supprimer le loader HTML statique
      container.innerHTML = '';

      // Afficher le loader et garder la référence
      const loader = Loader.show(container, {
        size: 'lg',
        text: 'Chargement des produits...'
      });

      // Calculer la pagination
      const startIndex = (this.currentPage - 1) * this.perPage;
      const endIndex = startIndex + this.perPage;
      const productsToShow = this.filteredProducts.slice(startIndex, endIndex);

      console.log(`📦 ${productsToShow.length} produits à afficher (page ${this.currentPage})`);

      // Créer la grille
      const grid = ProductCard.renderGrid(productsToShow, {
        onEdit: (product) => this.editProduct(product),
        onDuplicate: (product) => this.duplicateProduct(product),
        onDelete: (product) => this.deleteProduct(product),
        onHistory: (product) => this.showHistory(product),
        // Options de sélection multiple
        selectable: this.selectionMode,
        isSelected: (product) => this.selectedProducts.has(product.id),
        onSelect: (product, selected) => this.handleProductSelect(product, selected)
      });

      console.log('✅ Grille créée:', grid);

      // Masquer le loader et afficher la grille
      setTimeout(() => {
        console.log('⏱️ Timeout déclenché, masquage du loader et affichage de la grille...');

        // Vérifier que le conteneur existe toujours
        const containerCheck = document.getElementById('products-grid-container');
        if (!containerCheck) {
          console.error('❌ Le conteneur a disparu pendant le timeout!');
          return;
        }

        // Masquer le loader correctement (passer le loader, pas le conteneur)
        if (loader) {
          Loader.hide(loader);
        }

        // Vider le conteneur et ajouter la grille
        containerCheck.innerHTML = '';
        containerCheck.appendChild(grid);

        console.log('✅ Grille ajoutée au DOM');

        // Initialiser les icônes Lucide
        if (window.lucide) {
          lucide.createIcons();
          console.log('✅ Icônes Lucide initialisées');
        }

        // Mettre à jour les infos de pagination
        this.updatePaginationInfo();
        console.log('✅ Pagination mise à jour');
      }, 300);
    } catch (error) {
      console.error('❌ Erreur dans renderProductsGrid():', error);
      this.showError('Erreur lors de l\'affichage des produits');
    }
  }

  /**
   * Met à jour les informations de pagination
   */
  updatePaginationInfo() {
    const totalPages = Math.ceil(this.filteredProducts.length / this.perPage);

    // Info nombre de résultats
    const countInfo = document.getElementById('products-count-info');
    if (countInfo) {
      const startIndex = (this.currentPage - 1) * this.perPage + 1;
      const endIndex = Math.min(startIndex + this.perPage - 1, this.filteredProducts.length);
      countInfo.textContent = `${startIndex}-${endIndex} sur ${this.filteredProducts.length} produits`;
    }

    // Info page actuelle
    const pageInfo = document.getElementById('products-page-info');
    if (pageInfo) {
      pageInfo.textContent = `Page ${this.currentPage} sur ${totalPages || 1}`;
    }

    // Bouton page précédente
    const prevBtn = document.getElementById('products-prev-page');
    if (prevBtn) {
      prevBtn.disabled = this.currentPage === 1;
    }

    // Bouton page suivante
    const nextBtn = document.getElementById('products-next-page');
    if (nextBtn) {
      nextBtn.disabled = this.currentPage >= totalPages;
    }
  }

  /**
   * Applique le type de vue sans re-render (pour l'initialisation)
   */
  applyViewType(viewType) {
    console.log(`✅ Application de la vue: ${viewType} (sans render)`);

    this.currentViewType = viewType;
    localStorage.setItem('productsViewType', viewType);

    // Mettre à jour les boutons toggle
    const toggleBtns = document.querySelectorAll('.view-toggle__btn');
    toggleBtns.forEach(btn => {
      const btnViewType = btn.getAttribute('data-view-type');
      if (btnViewType === viewType) {
        btn.classList.add('view-toggle__btn--active');
        btn.setAttribute('aria-pressed', 'true');
      } else {
        btn.classList.remove('view-toggle__btn--active');
        btn.setAttribute('aria-pressed', 'false');
      }
    });

    // Afficher/masquer les conteneurs avec classes CSS
    const gridContainer = document.getElementById('products-grid-container');
    const tableContainer = document.getElementById('products-table-container');

    if (viewType === 'grid') {
      if (gridContainer) gridContainer.classList.add('products-view--active');
      if (tableContainer) tableContainer.classList.remove('products-view--active');
    } else {
      if (gridContainer) gridContainer.classList.remove('products-view--active');
      if (tableContainer) tableContainer.classList.add('products-view--active');
    }

    console.log(`✅ Vue appliquée: ${viewType} (sans render)`);
  }

  /**
   * Bascule entre la vue grille et la vue tableau
   */
  switchViewType(viewType) {
    console.log(`🔄 Basculement vers vue ${viewType}`);

    this.currentViewType = viewType;
    localStorage.setItem('productsViewType', viewType);

    // Mettre à jour les boutons toggle
    const toggleBtns = document.querySelectorAll('.view-toggle__btn');
    toggleBtns.forEach(btn => {
      const btnViewType = btn.getAttribute('data-view-type');
      if (btnViewType === viewType) {
        btn.classList.add('view-toggle__btn--active');
        btn.setAttribute('aria-pressed', 'true');
      } else {
        btn.classList.remove('view-toggle__btn--active');
        btn.setAttribute('aria-pressed', 'false');
      }
    });

    // Afficher/masquer les conteneurs avec des CLASSES CSS (pas de style inline)
    const gridContainer = document.getElementById('products-grid-container');
    const tableContainer = document.getElementById('products-table-container');

    console.log('📊 État des conteneurs AVANT:', {
      gridExists: !!gridContainer,
      tableExists: !!tableContainer,
      gridHasActive: gridContainer ? gridContainer.classList.contains('products-view--active') : false,
      tableHasActive: tableContainer ? tableContainer.classList.contains('products-view--active') : false,
      gridDisplay: gridContainer ? window.getComputedStyle(gridContainer).display : 'N/A',
      tableDisplay: tableContainer ? window.getComputedStyle(tableContainer).display : 'N/A'
    });

    if (viewType === 'grid') {
      // Afficher la grille, masquer le tableau
      if (gridContainer) {
        gridContainer.classList.add('products-view--active');
      }
      if (tableContainer) {
        tableContainer.classList.remove('products-view--active');
      }
    } else {
      // Masquer la grille, afficher le tableau
      if (gridContainer) {
        gridContainer.classList.remove('products-view--active');
      }
      if (tableContainer) {
        tableContainer.classList.add('products-view--active');
      }
    }

    console.log('📊 État des conteneurs APRÈS:', {
      gridHasActive: gridContainer ? gridContainer.classList.contains('products-view--active') : false,
      tableHasActive: tableContainer ? tableContainer.classList.contains('products-view--active') : false,
      gridDisplay: gridContainer ? window.getComputedStyle(gridContainer).display : 'N/A',
      tableDisplay: tableContainer ? window.getComputedStyle(tableContainer).display : 'N/A',
      tableVisibility: tableContainer ? window.getComputedStyle(tableContainer).visibility : 'N/A',
      tableOpacity: tableContainer ? window.getComputedStyle(tableContainer).opacity : 'N/A',
      tableOffsetHeight: tableContainer ? tableContainer.offsetHeight : 'N/A'
    });

    // Re-render avec la nouvelle vue
    this.renderProducts();

    console.log(`✅ Vue basculée vers ${viewType}`);
  }

  /**
   * Affiche les produits en mode tableau
   */
  renderProductsTable() {
    console.log('🎨 Rendu des produits en mode tableau');

    const table = document.getElementById('stocks-products-table');
    const tbody = document.getElementById('products-table-body');
    if (!tbody || !table) {
      console.error('❌ Tableau non trouvé');
      return;
    }

    // Gérer la colonne de sélection dans le thead
    const thead = table.querySelector('thead tr');
    if (thead) {
      let checkboxTh = thead.querySelector('th.selection-column');

      if (this.selectionMode && !checkboxTh) {
        // Ajouter la colonne checkbox au début
        checkboxTh = document.createElement('th');
        checkboxTh.className = 'selection-column';
        checkboxTh.scope = 'col';
        checkboxTh.style.width = '40px';
        checkboxTh.innerHTML = `
          <label class="table-checkbox">
            <input type="checkbox" id="select-all-table" aria-label="Tout sélectionner">
          </label>
        `;
        thead.insertBefore(checkboxTh, thead.firstChild);

        // Event listener pour tout sélectionner/désélectionner
        const selectAllCheckbox = checkboxTh.querySelector('#select-all-table');
        if (selectAllCheckbox) {
          selectAllCheckbox.addEventListener('change', (e) => {
            if (e.target.checked) {
              this.selectAll();
            } else {
              this.deselectAll();
            }
          });
        }
      } else if (!this.selectionMode && checkboxTh) {
        // Retirer la colonne checkbox
        checkboxTh.remove();
      }
    }

    // Calculer la pagination
    const startIndex = (this.currentPage - 1) * this.perPage;
    const endIndex = startIndex + this.perPage;
    const productsToShow = this.filteredProducts.slice(startIndex, endIndex);

    // Vider le tableau
    tbody.innerHTML = '';

    if (productsToShow.length === 0) {
      const emptyRow = document.createElement('tr');
      const colspan = this.selectionMode ? 10 : 9;
      emptyRow.innerHTML = `<td colspan="${colspan}" class="empty">Aucun produit à afficher</td>`;
      tbody.appendChild(emptyRow);
      return;
    }

    // Remplir le tableau
    productsToShow.forEach(product => {
      const row = document.createElement('tr');

      // Déterminer le statut du stock
      const stockActuel = parseInt(product.stock_actuel) || 0;
      const stockMin = parseInt(product.stock_minimum) || 0;
      let stockClass = '';
      if (stockActuel <= 0) {
        stockClass = 'stock-critical';
      } else if (stockActuel <= stockMin) {
        stockClass = 'stock-warning';
      }

      row.className = stockClass;
      row.setAttribute('data-product-id', product.id);

      // Ajouter la classe selected si le produit est sélectionné
      if (this.selectedProducts.has(product.id)) {
        row.classList.add('selected');
      }

      let checkboxCell = '';
      if (this.selectionMode) {
        const isChecked = this.selectedProducts.has(product.id);
        checkboxCell = `
          <td class="selection-cell">
            <label class="table-checkbox">
              <input type="checkbox"
                     class="row-checkbox"
                     ${isChecked ? 'checked' : ''}
                     data-product-id="${product.id}"
                     aria-label="Sélectionner ${this.escapeHtml(product.designation)}">
            </label>
          </td>
        `;
      }

      row.innerHTML = checkboxCell + `
        <td class="editable" data-field="reference" data-product-id="${product.id}">${this.escapeHtml(product.reference || '')}</td>
        <td class="editable" data-field="designation" data-product-id="${product.id}"><strong>${this.escapeHtml(product.designation || '')}</strong></td>
        <td class="editable" data-field="categorie" data-product-id="${product.id}">${this.escapeHtml(product.categorie || '-')}</td>
        <td class="editable" data-field="fournisseur" data-product-id="${product.id}">${this.escapeHtml(product.fournisseur || '-')}</td>
        <td class="editable ${stockClass}" data-field="stock_actuel" data-product-id="${product.id}">${stockActuel}</td>
        <td class="editable" data-field="prix_achat" data-product-id="${product.id}">${product.prix_achat ? parseFloat(product.prix_achat).toFixed(2) + ' €' : '-'}</td>
        <td class="editable" data-field="prix_vente" data-product-id="${product.id}">${product.prix_vente ? parseFloat(product.prix_vente).toFixed(2) + ' €' : '-'}</td>
        <td class="editable" data-field="etat_materiel" data-product-id="${product.id}"><span class="badge badge--${product.etat_materiel === 'neuf' ? 'success' : 'info'}">${this.escapeHtml(product.etat_materiel || 'N/A')}</span></td>
        <td>
          <details class="actions-menu">
            <summary class="actions-menu__trigger" aria-label="Actions">
              <i data-lucide="more-horizontal"></i>
            </summary>
            <div class="actions-menu__content">
              <button data-action="duplicate" data-product-id="${product.id}">
                <i data-lucide="copy"></i>
                Dupliquer
              </button>
              <button data-action="delete" data-product-id="${product.id}" class="danger">
                <i data-lucide="trash-2"></i>
                Supprimer
              </button>
            </div>
          </details>
        </td>
      `;

      // Event listener pour la checkbox
      if (this.selectionMode) {
        const checkbox = row.querySelector('.row-checkbox');
        if (checkbox) {
          checkbox.addEventListener('change', (e) => {
            e.stopPropagation();
            this.handleProductSelect(product, e.target.checked);

            // Mettre à jour la classe selected sur la ligne
            if (e.target.checked) {
              row.classList.add('selected');
            } else {
              row.classList.remove('selected');
            }
          });
        }
      }

      // Ajouter les event listeners pour les actions
      const duplicateBtn = row.querySelector('[data-action="duplicate"]');
      const deleteBtn = row.querySelector('[data-action="delete"]');

      if (duplicateBtn) {
        duplicateBtn.addEventListener('click', () => this.duplicateProduct(product));
      }
      if (deleteBtn) {
        deleteBtn.addEventListener('click', () => this.deleteProduct(product));
      }

      // Ajouter les event listeners pour l'édition inline
      const editableCells = row.querySelectorAll('.editable');
      editableCells.forEach(cell => {
        cell.addEventListener('click', (e) => {
          // Ne pas éditer si on est en mode sélection et qu'on clique sur une checkbox
          if (this.selectionMode && e.target.closest('.row-checkbox')) {
            return;
          }
          this.makeTableCellEditable(cell, product);
        });
      });

      tbody.appendChild(row);
    });

    // Initialiser les icônes Lucide
    if (window.lucide) {
      lucide.createIcons();
    }

    // Mettre à jour la pagination
    this.updatePaginationInfo();

    console.log(`✅ ${productsToShow.length} produits affichés dans le tableau`);
  }

  /**
   * Échappe les caractères HTML
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Rend une cellule de tableau éditable
   *
   * @param {HTMLElement} cell - La cellule à rendre éditable
   * @param {Object} product - Le produit associé
   */
  makeTableCellEditable(cell, product) {
    // Éviter l'édition multiple
    if (cell.querySelector('input, select')) {
      return;
    }

    const field = cell.dataset.field;
    const productId = parseInt(cell.dataset.productId);
    const originalValue = cell.textContent.trim();

    // Récupérer la valeur brute (sans formatage)
    let rawValue = originalValue;
    if (field === 'price_achat' || field === 'price_vente') {
      rawValue = originalValue.replace(/[€\s]/g, '');
    }

    // Créer l'élément d'édition approprié
    let editor;

    if (field === 'etat_materiel') {
      // Select pour l'état matériel
      editor = document.createElement('select');
      editor.innerHTML = `
        <option value="neuf" ${rawValue === 'neuf' ? 'selected' : ''}>Neuf</option>
        <option value="reconditionne" ${rawValue === 'reconditionné' ? 'selected' : ''}>Reconditionné</option>
      `;
    } else {
      // Input pour les autres champs
      editor = document.createElement('input');
      editor.type = this.getInputTypeForField(field);
      editor.value = rawValue;

      if (field === 'price_achat' || field === 'price_vente' || field === 'stock_actuel' || field === 'stock_min' || field === 'stock_max') {
        editor.min = '0';
        editor.step = field.includes('price') ? '0.01' : '1';
      }
    }

    // Remplacer le contenu
    cell.textContent = '';
    cell.appendChild(editor);
    editor.focus();

    if (editor.tagName === 'INPUT') {
      editor.select();
    }

    // Fonction de sauvegarde
    const save = async () => {
      const newValue = editor.value.trim();

      // Ne rien faire si la valeur n'a pas changé
      if (newValue === rawValue || (editor.tagName === 'SELECT' && newValue === rawValue)) {
        cancel();
        return;
      }

      // Validation basique
      if (!newValue && field !== 'emplacement') {
        alert('La valeur ne peut pas être vide');
        editor.focus();
        return;
      }

      // Afficher un indicateur de chargement
      cell.textContent = '⏳';

      try {
        // Sauvegarder via l'API
        const updateData = { [field]: newValue };
        await API.updateProduct(productId, updateData);

        // Mettre à jour le produit dans le cache local
        const productIndex = this.products.findIndex(p => p.id === productId);
        if (productIndex !== -1) {
          this.products[productIndex][field] = newValue;
        }

        // Afficher la nouvelle valeur formatée
        this.displayCellValue(cell, field, newValue);

        // Notification de succès
        Notification.show(`${this.getFieldLabel(field)} mis à jour`, 'success');

        console.log(`✅ ${field} mis à jour pour produit ${productId}:`, newValue);
      } catch (error) {
        console.error('Erreur lors de la mise à jour:', error);
        Notification.show('Erreur lors de la mise à jour', 'error');
        cancel();
      }
    };

    // Fonction d'annulation
    const cancel = () => {
      this.displayCellValue(cell, field, rawValue);
    };

    // Event listeners
    editor.addEventListener('blur', save);

    editor.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        save();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        cancel();
      }
    });
  }

  /**
   * Retourne le type d'input approprié pour un champ
   *
   * @param {string} field - Nom du champ
   * @returns {string} - Type d'input
   */
  getInputTypeForField(field) {
    switch (field) {
      case 'stock_actuel':
      case 'stock_min':
      case 'stock_max':
        return 'number';
      case 'price_achat':
      case 'price_vente':
        return 'number';
      default:
        return 'text';
    }
  }

  /**
   * Affiche la valeur d'une cellule avec le formatage approprié
   *
   * @param {HTMLElement} cell - La cellule
   * @param {string} field - Nom du champ
   * @param {string} value - Valeur à afficher
   */
  displayCellValue(cell, field, value) {
    cell.textContent = '';

    if (field === 'price_achat' || field === 'price_vente') {
      cell.textContent = `${parseFloat(value).toFixed(2)} €`;
    } else if (field === 'etat_materiel') {
      cell.textContent = value === 'reconditionne' ? 'Reconditionné' : 'Neuf';
    } else if (field === 'designation') {
      const strong = document.createElement('strong');
      strong.textContent = value;
      cell.appendChild(strong);
    } else {
      cell.textContent = value || '';
    }
  }

  /**
   * Retourne le label d'un champ
   *
   * @param {string} field - Nom du champ
   * @returns {string} - Label du champ
   */
  getFieldLabel(field) {
    const labels = {
      reference: 'Référence',
      designation: 'Désignation',
      price_achat: 'Prix d\'achat',
      price_vente: 'Prix de vente',
      stock_actuel: 'Stock actuel',
      stock_min: 'Stock minimum',
      stock_max: 'Stock maximum',
      etat_materiel: 'État matériel',
      emplacement: 'Emplacement'
    };
    return labels[field] || field;
  }

  /**
   * Réinitialise tous les filtres
   */
  clearFilters() {
    this.filters = {
      search: '',
      category: '',
      supplier: '',
      status: ''
    };

    // Réinitialiser les champs
    const searchInput = document.getElementById('stocks-search');
    if (searchInput) searchInput.value = '';

    const categoryFilter = document.getElementById('stocks-filter-category');
    if (categoryFilter) categoryFilter.value = '';

    const supplierFilter = document.getElementById('stocks-filter-supplier');
    if (supplierFilter) supplierFilter.value = '';

    const statusFilter = document.getElementById('stocks-filter-status');
    if (statusFilter) statusFilter.value = '';

    this.currentPage = 1;
    this.applyFilters();
    this.renderProducts();

    console.log('🔄 Filtres réinitialisés');
  }

  /**
   * Édite un produit
   */
  editProduct(product) {
    console.log('✏️ Éditer produit:', product.id);
    this.openProductForm(product);
  }

  /**
   * Duplique un produit
   */
  duplicateProduct(product) {
    console.log('📋 Dupliquer produit:', product.id);

    // Créer une copie sans l'ID pour créer un nouveau produit
    const duplicatedProduct = {
      ...product,
      id: null, // Pas d'ID = nouveau produit
      reference: `${product.reference}-COPIE`,
      designation: `${product.designation} (Copie)`
    };

    this.openProductForm(duplicatedProduct);
  }

  /**
   * Supprime un produit
   */
  async deleteProduct(product) {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer le produit "${product.designation}" ?`)) {
      return;
    }

    console.log('🗑️ Supprimer produit:', product.id);

    try {
      // Appeler l'API de suppression
      const apiClient = await this.getApiClient();
      await apiClient.deleteProduct(product.id);

      // Afficher une notification de succès
      if (window.StockPilotNotification) {
        window.StockPilotNotification.success(
          `Le produit "${product.designation}" a été supprimé avec succès.`
        );
      }

      // Recharger les produits
      await this.loadProducts();
      this.renderProducts();
    } catch (error) {
      console.error('❌ Erreur suppression produit:', error);

      // Afficher une notification d'erreur
      if (window.StockPilotNotification) {
        window.StockPilotNotification.error(
          `Erreur lors de la suppression du produit : ${error.message}`
        );
      } else {
        alert('Erreur lors de la suppression du produit');
      }
    }
  }

  /**
   * Ouvre le formulaire de produit (ajout ou édition)
   *
   * @param {Object|null} product - Produit à éditer, null pour nouveau produit
   */
  openProductForm(product = null) {
    console.log(product ? '✏️ Ouvrir formulaire édition' : '➕ Ouvrir formulaire ajout', product);

    const panel = document.getElementById('stocks-product-panel');
    const form = document.getElementById('stock-product-form');

    if (!panel || !form) {
      console.error('❌ Formulaire produit non trouvé dans le DOM');
      return;
    }

    // Charger les catégories et fournisseurs dans les selects
    this.populateFormSelects();

    // Réinitialiser le formulaire
    form.reset();

    // Si édition, pré-remplir les champs
    if (product && product.id) {
      console.log('📝 Pré-remplissage du formulaire avec:', product);

      // Champs texte et nombre
      const fields = {
        'id': product.id,
        'reference': product.reference,
        'designation': product.designation,
        'categorie': product.categorie,
        'fournisseur': product.fournisseur,
        'etat_materiel': product.etat_materiel,
        'prix_achat': product.prix_achat,
        'prix_vente': product.prix_vente,
        'stock_actuel': product.stock_actuel,
        'stock_minimum': product.stock_minimum,
        'stock_maximum': product.stock_maximum,
        'emplacement': product.emplacement,
        'date_entree': product.date_entree,
        'notes': product.notes
      };

      Object.keys(fields).forEach(fieldName => {
        const field = form.querySelector(`[name="${fieldName}"]`);
        if (field && fields[fieldName] !== null && fields[fieldName] !== undefined) {
          field.value = fields[fieldName];
        }
      });

      // Changer le titre du formulaire
      const title = panel.querySelector('h2');
      if (title) {
        title.textContent = 'Modifier le produit';
      }
    } else if (product) {
      // Duplication : pré-remplir sans ID
      console.log('📋 Pré-remplissage pour duplication avec:', product);

      const fields = {
        'reference': product.reference,
        'designation': product.designation,
        'categorie': product.categorie,
        'fournisseur': product.fournisseur,
        'etat_materiel': product.etat_materiel,
        'prix_achat': product.prix_achat,
        'prix_vente': product.prix_vente,
        'stock_actuel': product.stock_actuel,
        'stock_minimum': product.stock_minimum,
        'stock_maximum': product.stock_maximum,
        'emplacement': product.emplacement,
        'notes': product.notes
      };

      Object.keys(fields).forEach(fieldName => {
        const field = form.querySelector(`[name="${fieldName}"]`);
        if (field && fields[fieldName] !== null && fields[fieldName] !== undefined) {
          field.value = fields[fieldName];
        }
      });

      // Titre pour duplication
      const title = panel.querySelector('h2');
      if (title) {
        title.textContent = 'Dupliquer le produit';
      }
    } else {
      // Nouveau produit
      const title = panel.querySelector('h2');
      if (title) {
        title.textContent = 'Nouveau produit';
      }
    }

    // Afficher le panel
    panel.removeAttribute('hidden');
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });

    console.log('✅ Formulaire produit ouvert');
  }

  /**
   * Sauvegarde un produit (création ou modification)
   *
   * @param {HTMLFormElement} form - Formulaire de produit
   */
  async saveProduct(form) {
    console.log('💾 Sauvegarde du produit...');

    try {
      const formData = new FormData(form);

      // Log des données du formulaire pour debug
      const productId = formData.get('id');
      console.log(`📝 ${productId ? 'Modification' : 'Création'} produit ${productId || 'nouveau'}`);

      const response = await fetch(SempaStocksData.ajaxUrl, {
        method: 'POST',
        body: formData,
        credentials: 'same-origin'
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.data?.message || 'Erreur lors de la sauvegarde');
      }

      console.log('✅ Produit sauvegardé:', result.data.product);

      // Afficher un message de succès
      alert(SempaStocksData.strings.saved || 'Produit enregistré avec succès');

      // Fermer le formulaire
      this.closeProductForm();

      // Recharger la liste des produits
      await this.loadProducts();
      this.renderProducts();

    } catch (error) {
      console.error('❌ Erreur sauvegarde produit:', error);
      alert(`Erreur: ${error.message}`);
    }
  }

  /**
   * Affiche l'historique d'un produit
   *
   * @param {Object} product - Produit
   */
  showHistory(product) {
    console.log(`🕒 Affichage historique produit #${product.id}`);

    if (typeof HistoryModal === 'undefined') {
      console.error('❌ HistoryModal n\'est pas chargé');
      alert('Le module d\'historique n\'est pas disponible');
      return;
    }

    HistoryModal.show(product.id, product.designation);
  }

  /**
   * Ferme le formulaire de produit
   */
  closeProductForm() {
    const panel = document.getElementById('stocks-product-panel');
    if (panel) {
      panel.setAttribute('hidden', '');
      console.log('✅ Formulaire produit fermé');
    }
  }

  /**
   * Remplit les selects du formulaire avec les catégories et fournisseurs
   */
  populateFormSelects() {
    // Extraire les catégories uniques
    const categories = [...new Set(this.products.map(p => p.categorie).filter(Boolean))];
    const categorySelect = document.getElementById('stocks-category-select');

    if (categorySelect) {
      categorySelect.innerHTML = '<option value="">Sélectionner une catégorie</option>';
      categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        option.textContent = cat;
        categorySelect.appendChild(option);
      });
    }

    // Extraire les fournisseurs uniques
    const suppliers = [...new Set(this.products.map(p => p.fournisseur).filter(Boolean))];
    const supplierSelect = document.getElementById('stocks-supplier-select');

    if (supplierSelect) {
      supplierSelect.innerHTML = '<option value="">Sélectionner un fournisseur</option>';
      suppliers.forEach(sup => {
        const option = document.createElement('option');
        option.value = sup;
        option.textContent = sup;
        supplierSelect.appendChild(option);
      });
    }

    console.log(`✅ Selects peuplés: ${categories.length} catégories, ${suppliers.length} fournisseurs`);
  }

  /**
   * Scroll vers le haut de la liste
   */
  scrollToTop() {
    const container = document.getElementById('view-products');
    if (container) {
      container.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  /**
   * Affiche un message d'erreur
   */
  showError(message) {
    const container = document.getElementById('products-grid-container');
    if (container) {
      container.innerHTML = `
        <div class="sp-empty-state">
          <i data-lucide="alert-circle"></i>
          <p>${message}</p>
        </div>
      `;
      if (window.lucide) {
        lucide.createIcons();
      }
    }
  }

  /**
   * Rafraîchit les produits
   */
  async refresh() {
    console.log('🔄 Rafraîchissement des produits...');
    await this.loadProducts();
    this.renderProducts();
  }

  /* ============================================================================
     GESTION DE LA SÉLECTION MULTIPLE
     ============================================================================ */

  /**
   * Initialise la barre d'actions en masse
   */
  initBulkActionsBar() {
    // Créer la barre
    this.bulkActionsBar = BulkActionsBar.render({
      selectedCount: 0,
      onDeselectAll: () => this.deselectAll(),
      onChangeCategory: () => this.showChangeCategoryModal(),
      onChangeSupplier: () => this.showChangeSupplierModal(),
      onAdjustStock: () => this.showAdjustStockModal(),
      onChangeState: () => this.showChangeStateModal(),
      onChangePriceAchat: () => this.showChangePriceAchatModal(),
      onChangePriceVente: () => this.showChangePriceVenteModal(),
      onChangeStockMin: () => this.showChangeStockMinModal(),
      onChangeStockMax: () => this.showChangeStockMaxModal(),
      onChangeEmplacement: () => this.showChangeEmplacementModal(),
      onChangeReference: () => this.showChangeReferenceModal(),
      onDelete: () => this.deleteSelectedProducts(),
      categories: [], // Sera rempli dynamiquement
      suppliers: [],  // Sera rempli dynamiquement
    });

    // Ajouter au DOM
    document.body.appendChild(this.bulkActionsBar);

    console.log('✅ Barre d\'actions en masse initialisée');
  }

  /**
   * Toggle mode sélection
   */
  toggleSelectionMode() {
    this.selectionMode = !this.selectionMode;

    if (!this.selectionMode) {
      // Désélectionner tout en sortant du mode sélection
      this.deselectAll();
    }

    // Re-render les produits pour afficher/masquer les cases à cocher
    this.renderProducts();

    console.log('🔄 Mode sélection:', this.selectionMode ? 'activé' : 'désactivé');
  }

  /**
   * Callback lors de la sélection d'un produit
   */
  handleProductSelect(product, selected) {
    if (selected) {
      this.selectedProducts.add(product.id);
    } else {
      this.selectedProducts.delete(product.id);
    }

    // Mettre à jour le compteur de la barre
    if (this.bulkActionsBar) {
      BulkActionsBar.updateCount(this.bulkActionsBar, this.selectedProducts.size);
    }

    console.log(`${selected ? '✅' : '❌'} Produit #${product.id} ${selected ? 'sélectionné' : 'désélectionné'} (${this.selectedProducts.size} total)`);
  }

  /**
   * Désélectionne tous les produits
   */
  deselectAll() {
    this.selectedProducts.clear();

    // Mettre à jour toutes les cartes
    document.querySelectorAll('.sp-product-card').forEach(card => {
      const checkbox = card.querySelector('[data-action="select"]');
      if (checkbox) {
        checkbox.checked = false;
        card.classList.remove('sp-product-card--selected');
        card.removeAttribute('data-selected');
      }
    });

    // Mettre à jour toutes les lignes du tableau
    document.querySelectorAll('.stocks-table tbody tr').forEach(row => {
      const checkbox = row.querySelector('.row-checkbox');
      if (checkbox) {
        checkbox.checked = false;
        row.classList.remove('selected');
      }
    });

    // Décocher la case "tout sélectionner" du tableau
    const selectAllCheckbox = document.getElementById('select-all-table');
    if (selectAllCheckbox) {
      selectAllCheckbox.checked = false;
    }

    // Mettre à jour la barre
    if (this.bulkActionsBar) {
      BulkActionsBar.updateCount(this.bulkActionsBar, 0);
    }

    console.log('🔄 Tous les produits désélectionnés');
  }

  /**
   * Sélectionne tous les produits visibles
   */
  selectAll() {
    const visibleProducts = this.getVisibleProducts();

    visibleProducts.forEach(product => {
      this.selectedProducts.add(product.id);

      // Mettre à jour dans la grille (cartes)
      const card = document.querySelector(`.sp-product-card[data-product-id="${product.id}"]`);
      if (card) {
        const checkbox = card.querySelector('[data-action="select"]');
        if (checkbox) {
          checkbox.checked = true;
          card.classList.add('sp-product-card--selected');
          card.setAttribute('data-selected', 'true');
        }
      }

      // Mettre à jour dans le tableau
      const row = document.querySelector(`.stocks-table tbody tr[data-product-id="${product.id}"]`);
      if (row) {
        const checkbox = row.querySelector('.row-checkbox');
        if (checkbox) {
          checkbox.checked = true;
          row.classList.add('selected');
        }
      }
    });

    // Cocher la case "tout sélectionner" du tableau
    const selectAllCheckbox = document.getElementById('select-all-table');
    if (selectAllCheckbox) {
      selectAllCheckbox.checked = true;
    }

    // Mettre à jour la barre
    if (this.bulkActionsBar) {
      BulkActionsBar.updateCount(this.bulkActionsBar, this.selectedProducts.size);
    }

    console.log(`✅ ${visibleProducts.length} produits sélectionnés`);
  }

  /**
   * Récupère les produits visibles (page courante)
   */
  getVisibleProducts() {
    const start = (this.currentPage - 1) * this.perPage;
    const end = start + this.perPage;
    return this.filteredProducts.slice(start, end);
  }

  /**
   * Récupère les produits sélectionnés
   */
  getSelectedProducts() {
    return this.products.filter(p => this.selectedProducts.has(p.id));
  }

  /* ============================================================================
     ACTIONS EN MASSE - MODALS
     ============================================================================ */

  /**
   * Affiche le modal pour changer la catégorie
   */
  async showChangeCategoryModal() {
    const selectedCount = this.selectedProducts.size;
    const category = prompt(`Nouvelle catégorie pour ${selectedCount} produit(s) :`);

    if (category === null) return; // Annulé

    if (!category.trim()) {
      alert('La catégorie ne peut pas être vide');
      return;
    }

    await this.bulkUpdateCategory(category.trim());
  }

  /**
   * Affiche le modal pour changer le fournisseur
   */
  async showChangeSupplierModal() {
    const selectedCount = this.selectedProducts.size;
    const supplier = prompt(`Nouveau fournisseur pour ${selectedCount} produit(s) :`);

    if (supplier === null) return; // Annulé

    await this.bulkUpdateSupplier(supplier.trim());
  }

  /**
   * Affiche le modal pour ajuster le stock
   */
  async showAdjustStockModal() {
    const selectedCount = this.selectedProducts.size;
    const adjustment = prompt(`Ajustement du stock pour ${selectedCount} produit(s):\n\n+10 pour ajouter 10\n-5 pour soustraire 5\n=20 pour définir à 20`);

    if (adjustment === null) return; // Annulé

    if (!adjustment.match(/^[+\-=]\d+$/)) {
      alert('Format invalide. Utilisez +10, -5 ou =20');
      return;
    }

    await this.bulkAdjustStock(adjustment);
  }

  /**
   * Affiche le modal pour changer l'état matériel
   */
  async showChangeStateModal() {
    const selectedCount = this.selectedProducts.size;
    const state = prompt(`État matériel pour ${selectedCount} produit(s):\n\n1. neuf\n2. reconditionné`);

    if (state === null) return; // Annulé

    const stateValue = state === '1' ? 'neuf' : state === '2' ? 'reconditionné' : state;

    if (!['neuf', 'reconditionné'].includes(stateValue)) {
      alert('État invalide. Choisissez "neuf" ou "reconditionné"');
      return;
    }

    await this.bulkUpdateState(stateValue);
  }

  /**
   * Affiche le modal pour changer le prix d'achat
   */
  async showChangePriceAchatModal() {
    const selectedCount = this.selectedProducts.size;
    const price = prompt(`Nouveau prix d'achat pour ${selectedCount} produit(s) (€):`);

    if (price === null) return; // Annulé

    const priceValue = parseFloat(price);
    if (isNaN(priceValue) || priceValue < 0) {
      alert('Prix invalide. Entrez un nombre positif.');
      return;
    }

    await this.bulkUpdatePriceAchat(priceValue);
  }

  /**
   * Affiche le modal pour changer le prix de vente
   */
  async showChangePriceVenteModal() {
    const selectedCount = this.selectedProducts.size;
    const price = prompt(`Nouveau prix de vente pour ${selectedCount} produit(s) (€):`);

    if (price === null) return; // Annulé

    const priceValue = parseFloat(price);
    if (isNaN(priceValue) || priceValue < 0) {
      alert('Prix invalide. Entrez un nombre positif.');
      return;
    }

    await this.bulkUpdatePriceVente(priceValue);
  }

  /**
   * Affiche le modal pour changer le stock minimum
   */
  async showChangeStockMinModal() {
    const selectedCount = this.selectedProducts.size;
    const stock = prompt(`Nouveau stock minimum pour ${selectedCount} produit(s):`);

    if (stock === null) return; // Annulé

    const stockValue = parseInt(stock);
    if (isNaN(stockValue) || stockValue < 0) {
      alert('Stock invalide. Entrez un nombre entier positif.');
      return;
    }

    await this.bulkUpdateStockMin(stockValue);
  }

  /**
   * Affiche le modal pour changer le stock maximum
   */
  async showChangeStockMaxModal() {
    const selectedCount = this.selectedProducts.size;
    const stock = prompt(`Nouveau stock maximum pour ${selectedCount} produit(s):`);

    if (stock === null) return; // Annulé

    const stockValue = parseInt(stock);
    if (isNaN(stockValue) || stockValue < 0) {
      alert('Stock invalide. Entrez un nombre entier positif.');
      return;
    }

    await this.bulkUpdateStockMax(stockValue);
  }

  /**
   * Affiche le modal pour changer l'emplacement
   */
  async showChangeEmplacementModal() {
    const selectedCount = this.selectedProducts.size;
    const emplacement = prompt(`Nouvel emplacement pour ${selectedCount} produit(s):`);

    if (emplacement === null) return; // Annulé

    await this.bulkUpdateEmplacement(emplacement.trim());
  }

  /**
   * Affiche le modal pour modifier la référence
   */
  async showChangeReferenceModal() {
    const selectedCount = this.selectedProducts.size;
    const action = prompt(`Modification de référence pour ${selectedCount} produit(s):\n\n1. Ajouter un préfixe\n2. Ajouter un suffixe\n3. Remplacer complètement`);

    if (action === null) return; // Annulé

    let value, mode;
    if (action === '1') {
      value = prompt('Préfixe à ajouter:');
      if (value === null) return;
      mode = 'prefix';
    } else if (action === '2') {
      value = prompt('Suffixe à ajouter:');
      if (value === null) return;
      mode = 'suffix';
    } else if (action === '3') {
      value = prompt('Nouvelle référence:');
      if (value === null) return;
      mode = 'replace';
    } else {
      alert('Action invalide. Choisissez 1, 2 ou 3.');
      return;
    }

    await this.bulkUpdateReference(mode, value.trim());
  }

  /**
   * Supprime les produits sélectionnés
   */
  async deleteSelectedProducts() {
    const selectedCount = this.selectedProducts.size;
    const selectedProducts = this.getSelectedProducts();

    if (!confirm(`Êtes-vous sûr de vouloir supprimer ${selectedCount} produit(s) ?\n\nCette action est irréversible.`)) {
      return;
    }

    console.log(`🗑️ Suppression de ${selectedCount} produits...`);

    try {
      const apiClient = await this.getApiClient();
      const selectedIds = Array.from(this.selectedProducts);

      const result = await apiClient.bulkDeleteProducts(selectedIds);

      // Afficher un message de succès
      if (window.StockPilotNotification) {
        window.StockPilotNotification.success(result.message || `${selectedCount} produit(s) supprimé(s) avec succès`);
      }

      console.log('✅ Suppression en masse réussie:', result);
    } catch (error) {
      console.error('❌ Erreur lors de la suppression en masse:', error);
      if (window.StockPilotNotification) {
        window.StockPilotNotification.error('Erreur lors de la suppression des produits');
      }
    }

    // Désélectionner et recharger
    this.deselectAll();
    await this.refresh();
  }

  /* ============================================================================
     ACTIONS EN MASSE - API CALLS
     ============================================================================ */

  /**
   * Met à jour la catégorie en masse
   */
  async bulkUpdateCategory(category) {
    const selectedIds = Array.from(this.selectedProducts);

    console.log(`🏷️ Mise à jour catégorie pour ${selectedIds.length} produits:`, category);

    try {
      const apiClient = await this.getApiClient();
      const result = await apiClient.bulkUpdateProducts(selectedIds, 'category', category);

      // Afficher un message de succès
      if (window.StockPilotNotification) {
        window.StockPilotNotification.success(result.message || `Catégorie mise à jour pour ${selectedIds.length} produit(s)`);
      }

      console.log('✅ Mise à jour catégorie réussie:', result);
    } catch (error) {
      console.error('❌ Erreur lors de la mise à jour de la catégorie:', error);
      if (window.StockPilotNotification) {
        window.StockPilotNotification.error('Erreur lors de la mise à jour de la catégorie');
      }
    }

    this.deselectAll();
    await this.refresh();
  }

  /**
   * Met à jour le fournisseur en masse
   */
  async bulkUpdateSupplier(supplier) {
    const selectedIds = Array.from(this.selectedProducts);

    console.log(`📦 Mise à jour fournisseur pour ${selectedIds.length} produits:`, supplier);

    try {
      const apiClient = await this.getApiClient();
      const result = await apiClient.bulkUpdateProducts(selectedIds, 'supplier', supplier);

      // Afficher un message de succès
      if (window.StockPilotNotification) {
        window.StockPilotNotification.success(result.message || `Fournisseur mis à jour pour ${selectedIds.length} produit(s)`);
      }

      console.log('✅ Mise à jour fournisseur réussie:', result);
    } catch (error) {
      console.error('❌ Erreur lors de la mise à jour du fournisseur:', error);
      if (window.StockPilotNotification) {
        window.StockPilotNotification.error('Erreur lors de la mise à jour du fournisseur');
      }
    }

    this.deselectAll();
    await this.refresh();
  }

  /**
   * Ajuste le stock en masse
   */
  async bulkAdjustStock(adjustment) {
    const selectedIds = Array.from(this.selectedProducts);

    console.log(`📊 Ajustement stock pour ${selectedIds.length} produits:`, adjustment);

    try {
      const apiClient = await this.getApiClient();
      const result = await apiClient.bulkUpdateProducts(selectedIds, 'stock', adjustment);

      // Afficher un message de succès
      if (window.StockPilotNotification) {
        window.StockPilotNotification.success(result.message || `Stock ajusté pour ${selectedIds.length} produit(s)`);
      }

      console.log('✅ Ajustement stock réussi:', result);
    } catch (error) {
      console.error('❌ Erreur lors de l\'ajustement du stock:', error);
      if (window.StockPilotNotification) {
        window.StockPilotNotification.error('Erreur lors de l\'ajustement du stock');
      }
    }

    this.deselectAll();
    await this.refresh();
  }

  /**
   * Met à jour l'état matériel en masse
   */
  async bulkUpdateState(state) {
    const selectedIds = Array.from(this.selectedProducts);

    console.log(`🎨 Mise à jour état pour ${selectedIds.length} produits:`, state);

    try {
      const apiClient = await this.getApiClient();
      const result = await apiClient.bulkUpdateProducts(selectedIds, 'state', state);

      // Afficher un message de succès
      if (window.StockPilotNotification) {
        window.StockPilotNotification.success(result.message || `État mis à jour pour ${selectedIds.length} produit(s)`);
      }

      console.log('✅ Mise à jour état réussie:', result);
    } catch (error) {
      console.error('❌ Erreur lors de la mise à jour de l\'état:', error);
      if (window.StockPilotNotification) {
        window.StockPilotNotification.error('Erreur lors de la mise à jour de l\'état');
      }
    }

    this.deselectAll();
    await this.refresh();
  }

  /**
   * Met à jour le prix d'achat en masse
   */
  async bulkUpdatePriceAchat(price) {
    const selectedIds = Array.from(this.selectedProducts);

    console.log(`💰 Mise à jour prix d'achat pour ${selectedIds.length} produits:`, price);

    try {
      const apiClient = await this.getApiClient();
      const result = await apiClient.bulkUpdateProducts(selectedIds, 'price_achat', price);

      if (window.StockPilotNotification) {
        window.StockPilotNotification.success(result.message || `Prix d'achat mis à jour pour ${selectedIds.length} produit(s)`);
      }

      console.log('✅ Mise à jour prix d\'achat réussie:', result);
    } catch (error) {
      console.error('❌ Erreur lors de la mise à jour du prix d\'achat:', error);
      if (window.StockPilotNotification) {
        window.StockPilotNotification.error('Erreur lors de la mise à jour du prix d\'achat');
      }
    }

    this.deselectAll();
    await this.refresh();
  }

  /**
   * Met à jour le prix de vente en masse
   */
  async bulkUpdatePriceVente(price) {
    const selectedIds = Array.from(this.selectedProducts);

    console.log(`💰 Mise à jour prix de vente pour ${selectedIds.length} produits:`, price);

    try {
      const apiClient = await this.getApiClient();
      const result = await apiClient.bulkUpdateProducts(selectedIds, 'price_vente', price);

      if (window.StockPilotNotification) {
        window.StockPilotNotification.success(result.message || `Prix de vente mis à jour pour ${selectedIds.length} produit(s)`);
      }

      console.log('✅ Mise à jour prix de vente réussie:', result);
    } catch (error) {
      console.error('❌ Erreur lors de la mise à jour du prix de vente:', error);
      if (window.StockPilotNotification) {
        window.StockPilotNotification.error('Erreur lors de la mise à jour du prix de vente');
      }
    }

    this.deselectAll();
    await this.refresh();
  }

  /**
   * Met à jour le stock minimum en masse
   */
  async bulkUpdateStockMin(stock) {
    const selectedIds = Array.from(this.selectedProducts);

    console.log(`📊 Mise à jour stock minimum pour ${selectedIds.length} produits:`, stock);

    try {
      const apiClient = await this.getApiClient();
      const result = await apiClient.bulkUpdateProducts(selectedIds, 'stock_min', stock);

      if (window.StockPilotNotification) {
        window.StockPilotNotification.success(result.message || `Stock minimum mis à jour pour ${selectedIds.length} produit(s)`);
      }

      console.log('✅ Mise à jour stock minimum réussie:', result);
    } catch (error) {
      console.error('❌ Erreur lors de la mise à jour du stock minimum:', error);
      if (window.StockPilotNotification) {
        window.StockPilotNotification.error('Erreur lors de la mise à jour du stock minimum');
      }
    }

    this.deselectAll();
    await this.refresh();
  }

  /**
   * Met à jour le stock maximum en masse
   */
  async bulkUpdateStockMax(stock) {
    const selectedIds = Array.from(this.selectedProducts);

    console.log(`📊 Mise à jour stock maximum pour ${selectedIds.length} produits:`, stock);

    try {
      const apiClient = await this.getApiClient();
      const result = await apiClient.bulkUpdateProducts(selectedIds, 'stock_max', stock);

      if (window.StockPilotNotification) {
        window.StockPilotNotification.success(result.message || `Stock maximum mis à jour pour ${selectedIds.length} produit(s)`);
      }

      console.log('✅ Mise à jour stock maximum réussie:', result);
    } catch (error) {
      console.error('❌ Erreur lors de la mise à jour du stock maximum:', error);
      if (window.StockPilotNotification) {
        window.StockPilotNotification.error('Erreur lors de la mise à jour du stock maximum');
      }
    }

    this.deselectAll();
    await this.refresh();
  }

  /**
   * Met à jour l'emplacement en masse
   */
  async bulkUpdateEmplacement(emplacement) {
    const selectedIds = Array.from(this.selectedProducts);

    console.log(`📍 Mise à jour emplacement pour ${selectedIds.length} produits:`, emplacement);

    try {
      const apiClient = await this.getApiClient();
      const result = await apiClient.bulkUpdateProducts(selectedIds, 'emplacement', emplacement);

      if (window.StockPilotNotification) {
        window.StockPilotNotification.success(result.message || `Emplacement mis à jour pour ${selectedIds.length} produit(s)`);
      }

      console.log('✅ Mise à jour emplacement réussie:', result);
    } catch (error) {
      console.error('❌ Erreur lors de la mise à jour de l\'emplacement:', error);
      if (window.StockPilotNotification) {
        window.StockPilotNotification.error('Erreur lors de la mise à jour de l\'emplacement');
      }
    }

    this.deselectAll();
    await this.refresh();
  }

  /**
   * Met à jour la référence en masse
   */
  async bulkUpdateReference(mode, value) {
    const selectedIds = Array.from(this.selectedProducts);

    console.log(`🔤 Mise à jour référence pour ${selectedIds.length} produits:`, mode, value);

    try {
      const apiClient = await this.getApiClient();
      // Envoyer mode et value comme objet JSON
      const result = await apiClient.bulkUpdateProducts(selectedIds, 'reference', JSON.stringify({ mode, value }));

      if (window.StockPilotNotification) {
        window.StockPilotNotification.success(result.message || `Référence mise à jour pour ${selectedIds.length} produit(s)`);
      }

      console.log('✅ Mise à jour référence réussie:', result);
    } catch (error) {
      console.error('❌ Erreur lors de la mise à jour de la référence:', error);
      if (window.StockPilotNotification) {
        window.StockPilotNotification.error('Erreur lors de la mise à jour de la référence');
      }
    }

    this.deselectAll();
    await this.refresh();
  }

  /**
   * Nettoie les ressources
   */
  destroy() {
    this.products = [];
    this.filteredProducts = [];
    this.selectedProducts.clear();
    this.initialized = false;

    // Retirer la barre d'actions
    if (this.bulkActionsBar && this.bulkActionsBar.parentNode) {
      this.bulkActionsBar.parentNode.removeChild(this.bulkActionsBar);
    }

    console.log('🧹 Module Products nettoyé');
  }
}

// Créer une instance globale
window.productsModule = new ProductsModule();

// Export pour utilisation en module ES6
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ProductsModule;
}
