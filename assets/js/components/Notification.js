/**
 * COMPOSANT NOTIFICATION
 *
 * Système de notifications toast pour afficher des messages utilisateur
 */

class StockPilotNotification {
  /**
   * Instance singleton du conteneur de notifications
   */
  static container = null;

  /**
   * Pile des notifications actives
   */
  static activeNotifications = [];

  /**
   * Durée par défaut d'affichage (ms)
   */
  static DEFAULT_DURATION = 5000;

  /**
   * Nombre maximum de notifications affichées simultanément
   */
  static MAX_NOTIFICATIONS = 5;

  /**
   * Initialise le conteneur de notifications
   */
  static init() {
    if (this.container) {
      return this.container;
    }

    this.container = document.createElement('div');
    this.container.className = 'sp-notification-container';
    this.container.setAttribute('aria-live', 'polite');
    this.container.setAttribute('aria-atomic', 'true');
    document.body.appendChild(this.container);

    return this.container;
  }

  /**
   * Affiche une notification
   *
   * @param {Object} options - Options de la notification
   * @param {string} options.message - Message à afficher
   * @param {string} [options.type='info'] - Type: 'success', 'error', 'warning', 'info'
   * @param {number} [options.duration] - Durée d'affichage en ms (0 = infini)
   * @param {string} [options.icon] - Icône Lucide personnalisée
   * @param {Function} [options.onClose] - Callback appelé à la fermeture
   * @param {boolean} [options.dismissible=true] - Afficher le bouton de fermeture
   *
   * @returns {HTMLElement} L'élément notification créé
   */
  static show(options) {
    const {
      message,
      type = 'info',
      duration = this.DEFAULT_DURATION,
      icon = null,
      onClose = null,
      dismissible = true
    } = options;

    // Initialiser le conteneur si nécessaire
    if (!this.container) {
      this.init();
    }

    // Limiter le nombre de notifications
    if (this.activeNotifications.length >= this.MAX_NOTIFICATIONS) {
      const oldest = this.activeNotifications.shift();
      this.hide(oldest, true);
    }

    // Créer l'élément notification
    const notification = document.createElement('div');
    notification.className = `sp-notification sp-notification--${type}`;
    notification.setAttribute('role', 'alert');

    // Icône par défaut selon le type
    const defaultIcons = {
      success: 'check-circle',
      error: 'x-circle',
      warning: 'alert-triangle',
      info: 'info'
    };

    const iconName = icon || defaultIcons[type];

    // Contenu de la notification
    const content = `
      <div class="sp-notification__content">
        <i data-lucide="${iconName}" class="sp-notification__icon"></i>
        <div class="sp-notification__message">${message}</div>
      </div>
      ${dismissible ? '<button class="sp-notification__close" aria-label="Fermer"><i data-lucide="x"></i></button>' : ''}
    `;

    notification.innerHTML = content;

    // Gestionnaire de fermeture
    const closeHandler = () => {
      this.hide(notification);
      if (onClose) {
        onClose();
      }
    };

    // Bouton de fermeture
    if (dismissible) {
      const closeBtn = notification.querySelector('.sp-notification__close');
      closeBtn.addEventListener('click', closeHandler);
    }

    // Auto-fermeture après durée
    if (duration > 0) {
      notification._autoCloseTimeout = setTimeout(() => {
        closeHandler();
      }, duration);
    }

    // Ajouter au DOM
    this.container.appendChild(notification);
    this.activeNotifications.push(notification);

    // Initialiser les icônes Lucide
    if (window.lucide) {
      requestAnimationFrame(() => {
        window.lucide.createIcons();
      });
    }

    // Animation d'entrée
    requestAnimationFrame(() => {
      notification.classList.add('sp-notification--visible');
    });

    return notification;
  }

  /**
   * Masque une notification
   *
   * @param {HTMLElement} notification - Élément à masquer
   * @param {boolean} [immediate=false] - Masquer immédiatement sans animation
   */
  static hide(notification, immediate = false) {
    if (!notification || !notification.parentNode) {
      return;
    }

    // Annuler l'auto-fermeture
    if (notification._autoCloseTimeout) {
      clearTimeout(notification._autoCloseTimeout);
    }

    // Retirer de la pile active
    const index = this.activeNotifications.indexOf(notification);
    if (index > -1) {
      this.activeNotifications.splice(index, 1);
    }

    if (immediate) {
      notification.remove();
    } else {
      // Animation de sortie
      notification.classList.remove('sp-notification--visible');
      notification.addEventListener('transitionend', () => {
        notification.remove();
      }, { once: true });
    }
  }

  /**
   * Masque toutes les notifications
   */
  static hideAll() {
    const notifications = [...this.activeNotifications];
    notifications.forEach(notification => this.hide(notification, true));
  }

  /**
   * Méthodes raccourcies pour chaque type
   */
  static success(message, options = {}) {
    return this.show({ ...options, message, type: 'success' });
  }

  static error(message, options = {}) {
    return this.show({ ...options, message, type: 'error' });
  }

  static warning(message, options = {}) {
    return this.show({ ...options, message, type: 'warning' });
  }

  static info(message, options = {}) {
    return this.show({ ...options, message, type: 'info' });
  }
}

// Export pour utilisation en module ES6
if (typeof module !== 'undefined' && module.exports) {
  module.exports = StockPilotNotification;
}

// Export global
if (typeof window !== 'undefined') {
  window.StockPilotNotification = StockPilotNotification;
}
