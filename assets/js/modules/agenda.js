/**
 * MODULE AGENDA PRÉVISIONNEL
 *
 * Gère les alertes de stock et le planning de commandes
 */

class AgendaModule {
  constructor() {
    this.alerts = [];
    this.currentFilter = 'active';
    this.currentTypeFilter = '';
    this.initialized = false;
    this.listenersAttached = false;

    console.log('📅 AgendaModule créé');
  }

  /**
   * Récupère le client API (attend l'initialisation si nécessaire)
   */
  async getApiClient() {
    if (window.api) {
      return window.api;
    }

    if (typeof window.waitForStockPilotAPI === 'function') {
      const api = await window.waitForStockPilotAPI();
      return api;
    }

    if (window.stockpilotAPIReady && typeof window.stockpilotAPIReady.then === 'function') {
      const api = await window.stockpilotAPIReady;
      return api;
    }

    throw new Error('API StockPilot non initialisée');
  }

  /**
   * Initialise le module
   */
  async init() {
    console.log('🚀 Initialisation du module agenda...');

    this.attachEventListeners();
    await this.loadAlerts();
    this.checkLowStockProducts();

    this.initialized = true;
    console.log('✅ Module agenda initialisé');
  }

  /**
   * Attache les event listeners
   */
  attachEventListeners() {
    // Empêcher l'attachement multiple des listeners
    if (this.listenersAttached) {
      console.log('⏭️ Event listeners agenda déjà attachés, skip');
      return;
    }

    console.log('🔗 Attachement event listeners agenda...');

    // Filtres de statut
    const statusFilters = document.querySelectorAll('[data-filter-status]');
    statusFilters.forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.currentFilter = e.target.dataset.filterStatus;

        // Update active button
        statusFilters.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');

        this.loadAlerts();
      });
    });

    // Filtres de type
    const typeFilters = document.querySelectorAll('[data-filter-type]');
    typeFilters.forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.currentTypeFilter = e.target.dataset.filterType;

        // Update active button
        typeFilters.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');

        this.loadAlerts();
      });
    });

    // Rafraîchir
    const refreshBtn = document.getElementById('btn-refresh-agenda');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        this.loadAlerts();
        this.checkLowStockProducts();
      });
    }

    this.listenersAttached = true;
    console.log('✅ Event listeners agenda attachés');
  }

  /**
   * Charge les alertes depuis l'API
   */
  async loadAlerts() {
    try {
      if (window.Loader) window.Loader.showFullscreen();

      const apiClient = await this.getApiClient();
      const data = await apiClient.getStockAlerts(this.currentFilter, this.currentTypeFilter);
      this.alerts = data.alerts || [];

      this.renderAlerts();
      this.updateStats();

      console.log('✅ Alertes chargées:', this.alerts.length);
    } catch (error) {
      console.error('❌ Erreur chargement alertes:', error);
      if (window.Notification) {
        window.Notification.show('Erreur lors du chargement des alertes', 'error');
      }
    } finally {
      if (window.Loader) window.Loader.hide();
    }
  }

  /**
   * Vérifie les produits en stock faible et crée des alertes automatiques
   */
  async checkLowStockProducts() {
    try {
      const apiClient = await this.getApiClient();
      const productsData = await apiClient.getProducts();
      const products = productsData.products || [];

      for (const product of products) {
        const stockActuel = parseInt(product.stock_actuel) || 0;
        const stockMin = parseInt(product.stock_min) || 0;

        // Stock faible
        if (stockMin > 0 && stockActuel <= stockMin && stockActuel > 0) {
          await this.createAlertIfNotExists(product.id, 'low_stock');
        }

        // Rupture de stock
        if (stockActuel === 0) {
          await this.createAlertIfNotExists(product.id, 'out_of_stock');
        }
      }

      console.log('✅ Vérification des stocks terminée');
    } catch (error) {
      console.error('❌ Erreur vérification stocks:', error);
    }
  }

  /**
   * Crée une alerte si elle n'existe pas déjà
   */
  async createAlertIfNotExists(productId, alertType) {
    // Vérifier si une alerte active existe déjà
    const existingAlert = this.alerts.find(a =>
      a.product_id === productId &&
      a.alert_type === alertType &&
      a.status === 'active'
    );

    if (existingAlert) return;

    try {
      const apiClient = await this.getApiClient();
      await apiClient.createStockAlert({
        product_id: productId,
        alert_type: alertType
      });
    } catch (error) {
      console.error('Erreur création alerte:', error);
    }
  }

  /**
   * Affiche les alertes
   */
  renderAlerts() {
    const container = document.getElementById('alerts-list');
    if (!container) return;

    if (this.alerts.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <i data-lucide="check-circle"></i>
          <p>Aucune alerte ${this.getStatusLabel(this.currentFilter).toLowerCase()}</p>
        </div>
      `;
      if (window.lucide) lucide.createIcons();
      return;
    }

    // Grouper par date de commande prévue
    const grouped = this.groupAlertsByDate(this.alerts);

    let html = '';
    for (const [date, alerts] of Object.entries(grouped)) {
      html += `
        <div class="alerts-group">
          <h3 class="alerts-group__title">${this.formatGroupDate(date)}</h3>
          <div class="alerts-group__items">
            ${alerts.map(alert => this.renderAlertCard(alert)).join('')}
          </div>
        </div>
      `;
    }

    container.innerHTML = html;

    if (window.lucide) lucide.createIcons();
  }

  /**
   * Groupe les alertes par date
   */
  groupAlertsByDate(alerts) {
    const grouped = {};

    alerts.forEach(alert => {
      const date = alert.reorder_date || 'À planifier';
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(alert);
    });

    // Trier les groupes
    const sorted = {};
    Object.keys(grouped).sort((a, b) => {
      if (a === 'À planifier') return 1;
      if (b === 'À planifier') return -1;
      return new Date(a) - new Date(b);
    }).forEach(key => {
      sorted[key] = grouped[key];
    });

    return sorted;
  }

  /**
   * Formate la date de groupe
   */
  formatGroupDate(date) {
    if (date === 'À planifier') return date;

    const d = new Date(date);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (d.toDateString() === today.toDateString()) {
      return 'Aujourd\'hui';
    } else if (d.toDateString() === tomorrow.toDateString()) {
      return 'Demain';
    }

    return d.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  /**
   * Affiche une carte d'alerte
   */
  renderAlertCard(alert) {
    const alertTypeClass = this.getAlertTypeClass(alert.alert_type);
    const alertTypeLabel = this.getAlertTypeLabel(alert.alert_type);

    return `
      <div class="alert-card ${alertTypeClass}" data-alert-id="${alert.id}">
        <div class="alert-card__header">
          <div class="alert-card__type">
            <i data-lucide="${this.getAlertTypeIcon(alert.alert_type)}"></i>
            <span class="badge badge--${alertTypeClass}">${alertTypeLabel}</span>
          </div>
          <div class="alert-card__actions">
            ${alert.status === 'active' ? `
              <button class="button button--sm button--ghost" onclick="agendaModule.acknowledgeAlert(${alert.id})" title="Prendre en charge">
                <i data-lucide="check"></i>
              </button>
            ` : ''}
            ${alert.status === 'acknowledged' ? `
              <button class="button button--sm button--success" onclick="agendaModule.resolveAlert(${alert.id})" title="Résoudre">
                <i data-lucide="check-circle"></i>
              </button>
            ` : ''}
            <button class="button button--sm button--ghost" onclick="agendaModule.editAlert(${alert.id})" title="Modifier">
              <i data-lucide="edit-2"></i>
            </button>
          </div>
        </div>

        <div class="alert-card__body">
          <h4>${this.escapeHtml(alert.reference || 'N/A')} - ${this.escapeHtml(alert.designation || 'N/A')}</h4>

          <div class="alert-info">
            <div class="alert-info__item">
              <span class="label">Stock actuel:</span>
              <span class="value ${alert.stock_actuel === 0 ? 'text-danger' : ''}">${alert.stock_actuel || 0}</span>
            </div>
            ${alert.stock_min ? `
              <div class="alert-info__item">
                <span class="label">Stock minimum:</span>
                <span class="value">${alert.stock_min}</span>
              </div>
            ` : ''}
            ${alert.quantity_needed ? `
              <div class="alert-info__item">
                <span class="label">Quantité à commander:</span>
                <span class="value">${alert.quantity_needed}</span>
              </div>
            ` : ''}
            ${alert.supplier ? `
              <div class="alert-info__item">
                <span class="label">Fournisseur:</span>
                <span class="value">${this.escapeHtml(alert.supplier)}</span>
              </div>
            ` : ''}
          </div>

          ${alert.notes ? `
            <div class="alert-notes">
              <p>${this.escapeHtml(alert.notes)}</p>
            </div>
          ` : ''}

          ${alert.acknowledged_at ? `
            <div class="alert-meta">
              Pris en charge le ${new Date(alert.acknowledged_at).toLocaleDateString('fr-FR')}
            </div>
          ` : ''}
        </div>

        ${alert.supplier_id ? `
          <div class="alert-card__footer">
            <button class="button button--sm button--primary" onclick="agendaModule.sendOrderEmail(${alert.id})">
              <i data-lucide="mail"></i> Commander
            </button>
          </div>
        ` : ''}
      </div>
    `;
  }

  /**
   * Met à jour les statistiques
   */
  updateStats() {
    const activeCount = this.alerts.filter(a => a.status === 'active').length;
    const acknowledgedCount = this.alerts.filter(a => a.status === 'acknowledged').length;

    const activeEl = document.querySelector('[data-stat="active-alerts"]');
    if (activeEl) activeEl.textContent = activeCount;

    const acknowledgedEl = document.querySelector('[data-stat="acknowledged-alerts"]');
    if (acknowledgedEl) acknowledgedEl.textContent = acknowledgedCount;
  }

  /**
   * Prend en charge une alerte
   */
  async acknowledgeAlert(alertId) {
    try {
      const apiClient = await this.getApiClient();
      await apiClient.updateStockAlert(alertId, { status: 'acknowledged' });
      if (window.Notification) {
        window.Notification.show('Alerte prise en charge', 'success');
      }
      await this.loadAlerts();
    } catch (error) {
      console.error('❌ Erreur:', error);
      if (window.Notification) {
        window.Notification.show('Erreur lors de la mise à jour', 'error');
      }
    }
  }

  /**
   * Résout une alerte
   */
  async resolveAlert(alertId) {
    try {
      const apiClient = await this.getApiClient();
      await apiClient.updateStockAlert(alertId, { status: 'resolved' });
      if (window.Notification) {
        window.Notification.show('Alerte résolue', 'success');
      }
      await this.loadAlerts();
    } catch (error) {
      console.error('❌ Erreur:', error);
      if (window.Notification) {
        window.Notification.show('Erreur lors de la mise à jour', 'error');
      }
    }
  }

  /**
   * Édite une alerte
   */
  editAlert(alertId) {
    const alert = this.alerts.find(a => a.id === alertId);
    if (!alert) return;

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'alert-edit-modal';

    modal.innerHTML = `
      <div class="modal-dialog">
        <div class="modal-header">
          <h2>Modifier l'alerte</h2>
          <button class="modal-close" onclick="agendaModule.closeModal()">&times;</button>
        </div>

        <form id="alert-edit-form" class="modal-body">
          <input type="hidden" id="alert-id" value="${alert.id}">

          <div class="form-group">
            <label>Produit</label>
            <input type="text" value="${alert.reference} - ${alert.designation}" readonly>
          </div>

          <div class="form-group">
            <label for="alert-reorder-date">Date de commande prévue</label>
            <input type="date" id="alert-reorder-date" value="${alert.reorder_date || ''}">
          </div>

          <div class="form-group">
            <label for="alert-quantity">Quantité à commander</label>
            <input type="number" id="alert-quantity" value="${alert.quantity_needed || ''}" min="1">
          </div>

          <div class="form-group">
            <label for="alert-notes">Notes</label>
            <textarea id="alert-notes" rows="4">${alert.notes || ''}</textarea>
          </div>
        </form>

        <div class="modal-footer">
          <button type="button" class="button button--ghost" onclick="agendaModule.closeModal()">Annuler</button>
          <button type="button" class="button button--primary" onclick="agendaModule.saveAlertEdit()">Enregistrer</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('active'), 10);
  }

  /**
   * Sauvegarde les modifications d'une alerte
   */
  async saveAlertEdit() {
    const alertId = parseInt(document.getElementById('alert-id')?.value);
    const reorderDate = document.getElementById('alert-reorder-date')?.value;
    const quantity = parseInt(document.getElementById('alert-quantity')?.value);
    const notes = document.getElementById('alert-notes')?.value;

    try {
      if (window.Loader) window.Loader.showFullscreen();

      const apiClient = await this.getApiClient();
      await apiClient.updateStockAlert(alertId, {
        reorder_date: reorderDate || null,
        quantity_needed: quantity || null,
        notes: notes || null
      });

      if (window.Notification) {
        window.Notification.show('Alerte mise à jour', 'success');
      }
      this.closeModal();
      await this.loadAlerts();
    } catch (error) {
      console.error('❌ Erreur:', error);
      if (window.Notification) {
        window.Notification.show('Erreur lors de la mise à jour', 'error');
      }
    } finally {
      if (window.Loader) window.Loader.hide();
    }
  }

  /**
   * Envoie un email de commande au fournisseur
   */
  async sendOrderEmail(alertId) {
    const alert = this.alerts.find(a => a.id === alertId);
    if (!alert || !alert.supplier_id) return;

    // Rediriger vers la vue fournisseurs avec le formulaire d'email pré-rempli
    if (window.suppliersModule) {
      // Switch to suppliers view
      const suppliersLink = document.querySelector('[data-view="suppliers"]');
      if (suppliersLink) suppliersLink.click();

      // Wait for view switch then open email form
      setTimeout(() => {
        window.suppliersModule.showEmailForm(alert.supplier_id);

        // Pre-fill subject and message
        setTimeout(() => {
          const subjectEl = document.getElementById('email-subject');
          const messageEl = document.getElementById('email-message');

          if (subjectEl) {
            subjectEl.value = `Commande: ${alert.reference} - ${alert.designation}`;
          }

          if (messageEl) {
            messageEl.value = `Bonjour,\n\nJe souhaiterais passer commande pour le produit suivant:\n\nRéférence: ${alert.reference}\nDésignation: ${alert.designation}\nQuantité: ${alert.quantity_needed || 'À définir'}\n\nPouvez-vous me confirmer la disponibilité et le délai de livraison ?\n\nCordialement,`;
          }
        }, 100);
      }, 300);
    }
  }

  /**
   * Ferme la modal
   */
  closeModal() {
    const modal = document.querySelector('.modal-overlay');
    if (modal) {
      modal.classList.remove('active');
      setTimeout(() => modal.remove(), 300);
    }
  }

  /**
   * Retourne la classe CSS pour un type d'alerte
   */
  getAlertTypeClass(type) {
    const classes = {
      'low_stock': 'warning',
      'out_of_stock': 'danger',
      'reorder_reminder': 'info'
    };
    return classes[type] || 'info';
  }

  /**
   * Retourne le label pour un type d'alerte
   */
  getAlertTypeLabel(type) {
    const labels = {
      'low_stock': 'Stock faible',
      'out_of_stock': 'Rupture',
      'reorder_reminder': 'Rappel commande'
    };
    return labels[type] || type;
  }

  /**
   * Retourne l'icône pour un type d'alerte
   */
  getAlertTypeIcon(type) {
    const icons = {
      'low_stock': 'alert-triangle',
      'out_of_stock': 'alert-circle',
      'reorder_reminder': 'bell'
    };
    return icons[type] || 'bell';
  }

  /**
   * Retourne le label pour un statut
   */
  getStatusLabel(status) {
    const labels = {
      'active': 'Actives',
      'acknowledged': 'En cours',
      'resolved': 'Résolues'
    };
    return labels[status] || status;
  }

  /**
   * Échappe les caractères HTML
   */
  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Créer et exposer l'instance globale
if (typeof window !== 'undefined') {
  window.agendaModule = new AgendaModule();
  console.log('✅ Module Agenda créé et exposé globalement');
}
