/**
 * CLIENT API
 *
 * Client pour communiquer avec le backend WordPress via AJAX
 */

class API {
  /**
   * Constructeur
   *
   * @param {string} ajaxUrl - URL de l'endpoint AJAX WordPress
   * @param {string} nonce - Nonce de sécurité WordPress
   */
  constructor(ajaxUrl, nonce) {
    this.ajaxUrl = ajaxUrl || '/wp-admin/admin-ajax.php';
    this.nonce = nonce;
    this.defaultTimeout = 30000; // 30 secondes
  }

  /**
   * Requête POST générique
   *
   * @param {string} action - Action WordPress
   * @param {Object} data - Données à envoyer
   * @param {Object} options - Options de la requête
   * @returns {Promise} Résultat de la requête
   */
  async request(action, data = {}, options = {}) {
    const {
      timeout = this.defaultTimeout,
      showLoader = false,
      loaderContainer = null
    } = options;

    let loader = null;

    try {
      // Afficher le loader si demandé
      if (showLoader && window.Loader) {
        if (loaderContainer) {
          loader = Loader.show(loaderContainer);
        } else {
          loader = Loader.showFullscreen();
        }
      }

      // Préparer les données
      const formData = new FormData();
      formData.append('action', action);
      formData.append('nonce', this.nonce);

      // Ajouter les données
      Object.entries(data).forEach(([key, value]) => {
        if (value instanceof File) {
          formData.append(key, value);
        } else if (typeof value === 'object') {
          formData.append(key, JSON.stringify(value));
        } else {
          formData.append(key, value);
        }
      });

      // Créer le contrôleur d'abort pour le timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      // Effectuer la requête
      const response = await fetch(this.ajaxUrl, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
        credentials: 'same-origin'
      });

      clearTimeout(timeoutId);

      // Vérifier le statut HTTP
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Parser la réponse JSON
      const result = await response.json();

      // Masquer le loader
      if (loader && window.Loader) {
        Loader.hide(loader);
      }

      // Vérifier le succès de la réponse WordPress
      if (result.success) {
        return result.data;
      } else {
        throw new Error(result.data?.message || 'Erreur inconnue');
      }

    } catch (error) {
      // Masquer le loader en cas d'erreur
      if (loader && window.Loader) {
        Loader.hide(loader);
      }

      // Gérer les différents types d'erreur
      if (error.name === 'AbortError') {
        throw new Error('La requête a expiré. Veuillez réessayer.');
      }

      throw error;
    }
  }

  /**
   * Requête GET (via POST WordPress avec action)
   *
   * @param {string} action - Action WordPress
   * @param {Object} params - Paramètres de la requête
   * @param {Object} options - Options de la requête
   * @returns {Promise} Résultat de la requête
   */
  async get(action, params = {}, options = {}) {
    return this.request(action, params, options);
  }

  /**
   * Requête POST
   *
   * @param {string} action - Action WordPress
   * @param {Object} data - Données à envoyer
   * @param {Object} options - Options de la requête
   * @returns {Promise} Résultat de la requête
   */
  async post(action, data = {}, options = {}) {
    return this.request(action, data, options);
  }

  /* ==========================================================================
     ENDPOINTS SPÉCIFIQUES STOCKPILOT
     ========================================================================== */

  /**
   * Dashboard - Récupérer les métriques
   */
  async getDashboardMetrics() {
    return this.get('sempa_stocks_dashboard');
  }

  /**
   * Produits - Récupérer la liste
   */
  async getProducts(filters = {}) {
    return this.get('sempa_stocks_products', filters);
  }

  /**
   * Produits - Enregistrer un produit
   */
  async saveProduct(productData) {
    return this.post('sempa_stocks_save_product', productData);
  }

  /**
   * Produits - Supprimer un produit
   */
  async deleteProduct(productId) {
    return this.post('sempa_stocks_delete_product', { id: productId });
  }

  /**
   * Produits - Mettre à jour un produit (mise à jour partielle)
   *
   * @param {number} productId - ID du produit
   * @param {Object} updateData - Données à mettre à jour
   */
  async updateProduct(productId, updateData) {
    return this.post('sempa_stocks_save_product', {
      id: productId,
      ...updateData
    });
  }

  /**
   * Produits - Mise à jour en masse
   *
   * @param {Array} productIds - IDs des produits à mettre à jour
   * @param {string} action - Type de mise à jour (category, supplier, stock, state)
   * @param {string} value - Nouvelle valeur
   */
  async bulkUpdateProducts(productIds, action, value) {
    return this.post('sempa_stocks_bulk_update', {
      ids: productIds,
      update_action: action,
      value: value
    });
  }

  /**
   * Produits - Suppression en masse
   *
   * @param {Array} productIds - IDs des produits à supprimer
   */
  async bulkDeleteProducts(productIds) {
    return this.post('sempa_stocks_bulk_delete', {
      ids: productIds
    });
  }

  /**
   * Mouvements - Récupérer la liste
   */
  async getMovements(filters = {}) {
    return this.get('sempa_stocks_movements', filters);
  }

  /**
   * Mouvements - Enregistrer un mouvement
   */
  async recordMovement(movementData) {
    return this.post('sempa_stocks_record_movement', movementData);
  }

  /**
   * Références - Récupérer catégories et fournisseurs
   */
  async getReferenceData() {
    return this.get('sempa_stocks_reference_data');
  }

  /**
   * Catégories - Créer une catégorie
   */
  async saveCategory(categoryData) {
    return this.post('sempa_stocks_save_category', categoryData);
  }

  /**
   * Fournisseurs - Créer un fournisseur
   */
  async saveSupplier(supplierData) {
    return this.post('sempa_stocks_save_supplier', supplierData);
  }

  /**
   * Fournisseurs - Récupérer la liste
   */
  async getSuppliers(filters = {}) {
    return this.get('sempa_stocks_suppliers', filters);
  }

  /**
   * Fournisseurs - Supprimer un fournisseur
   */
  async deleteSupplier(supplierId) {
    return this.post('sempa_stocks_delete_supplier', { id: supplierId });
  }

  /**
   * Fournisseurs - Envoyer un email
   *
   * @param {number} supplierId - ID du fournisseur
   * @param {string} subject - Sujet de l'email
   * @param {string} message - Corps du message
   * @param {Array} productIds - IDs des produits (optionnel)
   */
  async sendSupplierEmail(supplierId, subject, message, productIds = []) {
    return this.post('sempa_stocks_send_supplier_email', {
      supplier_id: supplierId,
      subject: subject,
      message: message,
      product_ids: productIds
    });
  }

  /**
   * Alertes - Récupérer les alertes de stock
   *
   * @param {string} status - Statut des alertes (active, acknowledged, resolved)
   * @param {string} type - Type d'alerte (optionnel)
   */
  async getStockAlerts(status = 'active', type = '') {
    return this.get('sempa_stocks_stock_alerts', { status, type });
  }

  /**
   * Alertes - Créer une alerte de stock
   *
   * @param {Object} alertData - Données de l'alerte
   */
  async createStockAlert(alertData) {
    return this.post('sempa_stocks_create_alert', alertData);
  }

  /**
   * Alertes - Mettre à jour une alerte
   *
   * @param {number} alertId - ID de l'alerte
   * @param {Object} updateData - Données à mettre à jour
   */
  async updateStockAlert(alertId, updateData) {
    return this.post('sempa_stocks_update_alert', {
      id: alertId,
      ...updateData
    });
  }

  /**
   * Export - Générer un export CSV
   */
  async exportCSV(filters = {}) {
    return this.post('sempa_stocks_export_csv', filters);
  }
}

let apiInstance = null;
let resolveAPIReady = null;

function dispatchStockPilotEvent(name, detail) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.dispatchEvent(new CustomEvent(name, { detail }));
  } catch (error) {
    if (typeof document !== 'undefined' && typeof document.createEvent === 'function') {
      const event = document.createEvent('CustomEvent');
      event.initCustomEvent(name, false, false, detail);
      window.dispatchEvent(event);
    }
  }
}

/**
 * Initialise (ou réinitialise) l'instance API globale
 *
 * @param {Object} data - Données d'initialisation provenant de WordPress
 */
function bootstrapStockPilotAPI(data) {
  if (typeof window === 'undefined') {
    return null;
  }

  if (!data || !data.ajaxUrl) {
    console.warn('⚠️ StockPilot API: données d\'initialisation invalides', data);
    return null;
  }

  const shouldReinitialize = !apiInstance ||
    apiInstance.ajaxUrl !== data.ajaxUrl ||
    apiInstance.nonce !== data.nonce;

  if (!shouldReinitialize) {
    return apiInstance;
  }

  apiInstance = new API(data.ajaxUrl, data.nonce);
  window.api = apiInstance;

  if (typeof resolveAPIReady === 'function') {
    resolveAPIReady(apiInstance);
    resolveAPIReady = null;
  }

  dispatchStockPilotEvent('StockPilotAPIReady', apiInstance);

  return apiInstance;
}

/**
 * Promesse utilitaire pour attendre l'initialisation de l'API
 *
 * @returns {Promise<API>}
 */
function waitForStockPilotAPI() {
  if (apiInstance) {
    return Promise.resolve(apiInstance);
  }

  if (typeof window === 'undefined') {
    return Promise.reject(new Error('StockPilot API indisponible (environnement serveur)'));
  }

  if (!window.stockpilotAPIReady) {
    window.stockpilotAPIReady = new Promise((resolve) => {
      if (apiInstance) {
        resolve(apiInstance);
      } else {
        resolveAPIReady = resolve;
      }
    });
  }

  return window.stockpilotAPIReady;
}

// Initialisation automatique + listeners navigateur
if (typeof window !== 'undefined') {
  // Exposer la classe et la promesse utilitaire
  window.API = API;
  API.waitForInstance = waitForStockPilotAPI;

  if (!window.stockpilotAPIReady) {
    window.stockpilotAPIReady = new Promise((resolve) => {
      if (apiInstance) {
        resolve(apiInstance);
      } else {
        resolveAPIReady = resolve;
      }
    });
  }

  window.addEventListener('StockPilotDataReady', (event) => {
    bootstrapStockPilotAPI(event.detail);
  });

  if (window.SempaStocksData) {
    bootstrapStockPilotAPI(window.SempaStocksData);
  }

  // Exposer un helper global explicite
  window.waitForStockPilotAPI = waitForStockPilotAPI;
  window.initializeStockPilotAPI = bootstrapStockPilotAPI;
}

// Export pour utilisation en module ES6/CommonJS
if (typeof module !== 'undefined' && module.exports) {
  module.exports = API;
}
