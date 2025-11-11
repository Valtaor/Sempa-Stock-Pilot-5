# Guide : Modifications en masse de produits

## Comment utiliser la fonctionnalité

### Étape 1 : Activer le mode sélection

1. Allez sur la page **Produits**
2. Cliquez sur le bouton **"Sélectionner"** dans la barre d'outils (en haut à droite, entre les boutons de vue et "Ajouter un produit")
3. Le bouton devient bleu pour indiquer que le mode sélection est actif

### Étape 2 : Sélectionner les produits

- Des **checkboxes** apparaissent en haut à gauche de chaque carte produit
- Cochez les produits que vous souhaitez modifier en masse
- Vous pouvez en sélectionner autant que vous voulez

### Étape 3 : Choisir une action

Une **barre d'actions flottante** apparaît en bas de l'écran dès qu'au moins un produit est sélectionné.

Cette barre affiche :
- Le **nombre de produits sélectionnés**
- Les **actions disponibles** :
  - 📁 **Catégorie** : Changer la catégorie de tous les produits sélectionnés
  - 🚚 **Fournisseur** : Changer le fournisseur
  - 📦 **Stock** : Ajuster le stock (+10, -5, ou =20)
  - 🏷️ **État** : Changer l'état matériel (neuf/reconditionné)
  - 🗑️ **Supprimer** : Supprimer tous les produits sélectionnés

### Étape 4 : Appliquer l'action

1. Cliquez sur l'action souhaitée
2. Une fenêtre de dialogue s'ouvre pour saisir la nouvelle valeur
3. Confirmez pour appliquer la modification à tous les produits sélectionnés

### Ajustement du stock

Pour l'ajustement du stock, utilisez ces formats :
- `+10` : Ajoute 10 unités au stock actuel
- `-5` : Retire 5 unités du stock actuel
- `=20` : Définit le stock à exactement 20 unités

### Désélectionner

- Cliquez sur **"Désélectionner tout"** dans la barre d'actions
- Ou recliquez sur le bouton **"Sélectionner"** en haut pour quitter le mode sélection

## Fonctionnalités

✅ Sélection visuelle avec checkboxes
✅ Modification de catégorie en masse
✅ Modification de fournisseur en masse
✅ Ajustement de stock en masse
✅ Modification d'état matériel en masse
✅ Suppression en masse
✅ Notifications de succès/erreur
✅ Historique complet dans l'audit trail
✅ Gestion d'erreurs robuste

## Dépannage

### Le bouton "Sélectionner" n'apparaît pas
- Vérifiez que vous êtes bien sur la page Produits
- Rafraîchissez la page (F5)
- Vérifiez la console JavaScript pour des erreurs

### Les checkboxes n'apparaissent pas
- Assurez-vous d'avoir cliqué sur le bouton "Sélectionner"
- Le bouton doit être bleu quand le mode est actif

### La barre d'actions ne s'affiche pas
- Vérifiez que vous avez sélectionné au moins un produit
- La barre apparaît en bas de l'écran (peut nécessiter de scroller)

### Erreurs lors de la modification
- Vérifiez votre connexion
- Consultez les messages d'erreur dans les notifications
- Vérifiez les logs de la console pour plus de détails
