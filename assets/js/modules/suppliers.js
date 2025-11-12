/**
 * MODULE FOURNISSEURS
 *
 * Gère l'affichage et la gestion des fournisseurs
 */

class SuppliersModule {
  constructor() {
    this.suppliers = [];
    this.currentSupplier = null;
    this.searchTerm = '';
    this.initialized = false;
    this.listenersAttached = false;

    console.log('📦 SuppliersModule créé');
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
    console.log('🚀 Initialisation du module fournisseurs...');

    this.attachEventListeners();
    await this.loadSuppliers();

    this.initialized = true;
    console.log('✅ Module fournisseurs initialisé');
  }

  /**
   * Attache les event listeners
   */
  attachEventListeners() {
    // Empêcher l'attachement multiple des listeners
    if (this.listenersAttached) {
      console.log('⏭️ Event listeners déjà attachés, skip');
      return;
    }

    console.log('🔗 Attachement event listeners fournisseurs...');

    // Bouton ajouter fournisseur
    const addBtn = document.getElementById('btn-add-supplier');
    if (addBtn) {
      addBtn.addEventListener('click', () => this.showSupplierForm());
    }

    // Recherche
    const searchInput = document.getElementById('suppliers-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchTerm = e.target.value.toLowerCase();
        this.renderSuppliers();
      });
    }

    // Rafraîchir
    const refreshBtn = document.getElementById('btn-refresh-suppliers');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.loadSuppliers());
    }

    this.listenersAttached = true;
    console.log('✅ Event listeners fournisseurs attachés');
  }

  /**
   * Charge les fournisseurs depuis l'API
   */
  async loadSuppliers() {
    try {
      if (window.Loader) window.Loader.showFullscreen();

      const apiClient = await this.getApiClient();
      const data = await apiClient.getSuppliers();
      this.suppliers = data.suppliers || [];

      this.renderSuppliers();

      console.log('✅ Fournisseurs chargés:', this.suppliers.length);
    } catch (error) {
      console.error('❌ Erreur chargement fournisseurs:', error);
      if (window.Notification) {
        window.Notification.show('Erreur lors du chargement des fournisseurs', 'error');
      }
    } finally {
      if (window.Loader) window.Loader.hide();
    }
  }

  /**
   * Affiche les fournisseurs
   */
  renderSuppliers() {
    const container = document.getElementById('suppliers-list');
    if (!container) return;

    // Filtrer par recherche
    let filteredSuppliers = this.suppliers;
    if (this.searchTerm) {
      filteredSuppliers = this.suppliers.filter(s =>
        s.nom?.toLowerCase().includes(this.searchTerm) ||
        s.email?.toLowerCase().includes(this.searchTerm) ||
        s.ville?.toLowerCase().includes(this.searchTerm)
      );
    }

    if (filteredSuppliers.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <i data-lucide="inbox"></i>
          <p>Aucun fournisseur trouvé</p>
          <button class="button button--primary" onclick="suppliersModule.showSupplierForm()">
            Ajouter un fournisseur
          </button>
        </div>
      `;
      if (window.lucide) lucide.createIcons();
      return;
    }

    container.innerHTML = filteredSuppliers.map(supplier => this.renderSupplierCard(supplier)).join('');

    if (window.lucide) lucide.createIcons();
  }

  /**
   * Affiche une carte fournisseur
   */
  renderSupplierCard(supplier) {
    return `
      <div class="supplier-card" data-supplier-id="${supplier.id}">
        <div class="supplier-card__header">
          <h3>${this.escapeHtml(supplier.nom)}</h3>
          <div class="supplier-card__actions">
            <button class="button button--sm button--ghost" onclick="suppliersModule.editSupplier(${supplier.id})" title="Modifier">
              <i data-lucide="edit-2"></i>
            </button>
            <button class="button button--sm button--ghost" onclick="suppliersModule.showEmailForm(${supplier.id})" title="Envoyer un email">
              <i data-lucide="mail"></i>
            </button>
            <button class="button button--sm button--danger" onclick="suppliersModule.deleteSupplier(${supplier.id})" title="Supprimer">
              <i data-lucide="trash-2"></i>
            </button>
          </div>
        </div>

        <div class="supplier-card__body">
          ${supplier.nom_contact ? `
            <div class="supplier-info">
              <i data-lucide="user"></i>
              <span>${this.escapeHtml(supplier.nom_contact)}</span>
            </div>
          ` : ''}

          ${supplier.email ? `
            <div class="supplier-info">
              <i data-lucide="mail"></i>
              <a href="mailto:${this.escapeHtml(supplier.email)}">${this.escapeHtml(supplier.email)}</a>
            </div>
          ` : ''}

          ${supplier.telephone ? `
            <div class="supplier-info">
              <i data-lucide="phone"></i>
              <a href="tel:${this.escapeHtml(supplier.telephone)}">${this.escapeHtml(supplier.telephone)}</a>
            </div>
          ` : ''}

          ${supplier.adresse || supplier.ville ? `
            <div class="supplier-info">
              <i data-lucide="map-pin"></i>
              <span>
                ${supplier.adresse ? this.escapeHtml(supplier.adresse) + '<br>' : ''}
                ${supplier.code_postal ? this.escapeHtml(supplier.code_postal) + ' ' : ''}
                ${supplier.ville ? this.escapeHtml(supplier.ville) : ''}
                ${supplier.pays && supplier.pays !== 'France' ? '<br>' + this.escapeHtml(supplier.pays) : ''}
              </span>
            </div>
          ` : ''}

          ${supplier.site_web ? `
            <div class="supplier-info">
              <i data-lucide="globe"></i>
              <a href="${this.escapeHtml(supplier.site_web)}" target="_blank" rel="noopener">${this.escapeHtml(supplier.site_web)}</a>
            </div>
          ` : ''}

          ${supplier.delai_livraison ? `
            <div class="supplier-info">
              <i data-lucide="clock"></i>
              <span>Délai: ${this.escapeHtml(supplier.delai_livraison)}</span>
            </div>
          ` : ''}

          ${supplier.notes ? `
            <div class="supplier-notes">
              <p>${this.escapeHtml(supplier.notes)}</p>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  /**
   * Affiche le formulaire de fournisseur
   */
  showSupplierForm(supplier = null) {
    this.currentSupplier = supplier;

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'supplier-modal';

    modal.innerHTML = `
      <div class="modal-dialog">
        <div class="modal-header">
          <h2>${supplier ? 'Modifier le fournisseur' : 'Nouveau fournisseur'}</h2>
          <button class="modal-close" onclick="suppliersModule.closeModal()">&times;</button>
        </div>

        <form id="supplier-form" class="modal-body">
          <div class="form-grid">
            <div class="form-group">
              <label for="supplier-nom">Nom du fournisseur *</label>
              <input type="text" id="supplier-nom" name="nom" value="${supplier?.nom || ''}" required>
            </div>

            <div class="form-group">
              <label for="supplier-contact">Nom du contact</label>
              <input type="text" id="supplier-contact" name="nom_contact" value="${supplier?.nom_contact || ''}">
            </div>

            <div class="form-group">
              <label for="supplier-email">Email</label>
              <input type="email" id="supplier-email" name="email" value="${supplier?.email || ''}">
            </div>

            <div class="form-group">
              <label for="supplier-telephone">Téléphone</label>
              <input type="tel" id="supplier-telephone" name="telephone" value="${supplier?.telephone || ''}">
            </div>

            <div class="form-group form-group--full">
              <label for="supplier-adresse">Adresse</label>
              <textarea id="supplier-adresse" name="adresse" rows="2">${supplier?.adresse || ''}</textarea>
            </div>

            <div class="form-group">
              <label for="supplier-cp">Code postal</label>
              <input type="text" id="supplier-cp" name="code_postal" value="${supplier?.code_postal || ''}">
            </div>

            <div class="form-group">
              <label for="supplier-ville">Ville</label>
              <input type="text" id="supplier-ville" name="ville" value="${supplier?.ville || ''}">
            </div>

            <div class="form-group">
              <label for="supplier-pays">Pays</label>
              <input type="text" id="supplier-pays" name="pays" value="${supplier?.pays || 'France'}">
            </div>

            <div class="form-group">
              <label for="supplier-web">Site web</label>
              <input type="url" id="supplier-web" name="site_web" value="${supplier?.site_web || ''}">
            </div>

            <div class="form-group">
              <label for="supplier-siret">SIRET</label>
              <input type="text" id="supplier-siret" name="siret" value="${supplier?.siret || ''}">
            </div>

            <div class="form-group">
              <label for="supplier-delai">Délai de livraison</label>
              <input type="text" id="supplier-delai" name="delai_livraison" value="${supplier?.delai_livraison || ''}" placeholder="Ex: 2-3 jours">
            </div>

            <div class="form-group form-group--full">
              <label for="supplier-paiement">Conditions de paiement</label>
              <textarea id="supplier-paiement" name="conditions_paiement" rows="2">${supplier?.conditions_paiement || ''}</textarea>
            </div>

            <div class="form-group form-group--full">
              <label for="supplier-notes">Notes</label>
              <textarea id="supplier-notes" name="notes" rows="3">${supplier?.notes || ''}</textarea>
            </div>
          </div>
        </form>

        <div class="modal-footer">
          <button type="button" class="button button--ghost" onclick="suppliersModule.closeModal()">Annuler</button>
          <button type="button" class="button button--primary" onclick="suppliersModule.saveSupplier()">
            ${supplier ? 'Mettre à jour' : 'Créer'}
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('active'), 10);
  }

  /**
   * Sauvegarde un fournisseur
   */
  async saveSupplier() {
    const form = document.getElementById('supplier-form');
    if (!form) return;

    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    if (!data.nom) {
      if (window.Notification) {
        window.Notification.show('Le nom du fournisseur est obligatoire', 'error');
      }
      return;
    }

    try {
      if (window.Loader) window.Loader.showFullscreen();

      if (this.currentSupplier) {
        data.id = this.currentSupplier.id;
      }

      const apiClient = await this.getApiClient();
      await apiClient.saveSupplier(data);

      if (window.Notification) {
        window.Notification.show(`Fournisseur ${this.currentSupplier ? 'modifié' : 'créé'} avec succès`, 'success');
      }

      this.closeModal();
      await this.loadSuppliers();
    } catch (error) {
      console.error('❌ Erreur sauvegarde fournisseur:', error);
      if (window.Notification) {
        window.Notification.show('Erreur lors de la sauvegarde', 'error');
      }
    } finally {
      if (window.Loader) window.Loader.hide();
    }
  }

  /**
   * Édite un fournisseur
   */
  editSupplier(id) {
    const supplier = this.suppliers.find(s => s.id === id);
    if (supplier) {
      this.showSupplierForm(supplier);
    }
  }

  /**
   * Supprime un fournisseur
   */
  async deleteSupplier(id) {
    const supplier = this.suppliers.find(s => s.id === id);
    if (!supplier) return;

    if (!confirm(`Supprimer le fournisseur "${supplier.nom}" ?\n\nCette action est irréversible.`)) {
      return;
    }

    try {
      if (window.Loader) window.Loader.showFullscreen();

      const apiClient = await this.getApiClient();
      await apiClient.deleteSupplier(id);

      if (window.Notification) {
        window.Notification.show('Fournisseur supprimé avec succès', 'success');
      }
      await this.loadSuppliers();
    } catch (error) {
      console.error('❌ Erreur suppression fournisseur:', error);
      if (window.Notification) {
        window.Notification.show('Erreur lors de la suppression', 'error');
      }
    } finally {
      if (window.Loader) window.Loader.hide();
    }
  }

  /**
   * Affiche le formulaire d'envoi d'email
   */
  showEmailForm(supplierId) {
    const supplier = this.suppliers.find(s => s.id === supplierId);
    if (!supplier || !supplier.email) {
      if (window.Notification) {
        window.Notification.show('Ce fournisseur n\'a pas d\'email', 'error');
      }
      return;
    }

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'email-modal';

    modal.innerHTML = `
      <div class="modal-dialog">
        <div class="modal-header">
          <h2>Envoyer un email à ${this.escapeHtml(supplier.nom)}</h2>
          <button class="modal-close" onclick="suppliersModule.closeModal()">&times;</button>
        </div>

        <form id="email-form" class="modal-body">
          <input type="hidden" id="email-supplier-id" value="${supplierId}">

          <div class="form-group">
            <label for="email-to">Destinataire</label>
            <input type="email" id="email-to" value="${supplier.email}" readonly>
          </div>

          <div class="form-group">
            <label for="email-subject">Sujet *</label>
            <input type="text" id="email-subject" required placeholder="Demande de devis">
          </div>

          <div class="form-group">
            <label for="email-message">Message *</label>
            <textarea id="email-message" rows="10" required placeholder="Bonjour,

Je souhaiterais obtenir un devis pour les produits suivants...

Cordialement,"></textarea>
          </div>
        </form>

        <div class="modal-footer">
          <button type="button" class="button button--ghost" onclick="suppliersModule.closeModal()">Annuler</button>
          <button type="button" class="button button--primary" onclick="suppliersModule.sendEmail()">
            <i data-lucide="send"></i> Envoyer
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('active'), 10);
    if (window.lucide) lucide.createIcons();
  }

  /**
   * Envoie un email au fournisseur
   */
  async sendEmail() {
    const supplierId = parseInt(document.getElementById('email-supplier-id')?.value);
    const subject = document.getElementById('email-subject')?.value;
    const message = document.getElementById('email-message')?.value;

    if (!subject || !message) {
      if (window.Notification) {
        window.Notification.show('Le sujet et le message sont obligatoires', 'error');
      }
      return;
    }

    try {
      if (window.Loader) window.Loader.showFullscreen();

      const apiClient = await this.getApiClient();
      await apiClient.sendSupplierEmail(supplierId, subject, message);

      if (window.Notification) {
        window.Notification.show('Email envoyé avec succès', 'success');
      }
      this.closeModal();
    } catch (error) {
      console.error('❌ Erreur envoi email:', error);
      if (window.Notification) {
        window.Notification.show('Erreur lors de l\'envoi de l\'email', 'error');
      }
    } finally {
      if (window.Loader) window.Loader.hide();
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
  window.suppliersModule = new SuppliersModule();
  console.log('✅ Module Fournisseurs créé et exposé globalement');
}
