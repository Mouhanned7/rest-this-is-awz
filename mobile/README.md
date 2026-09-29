# Daily Orders

Application Flutter de gestion des commandes Daily Chicken Pizza. Connexion Firebase par e-mail et mot de passe, rôle responsable, liste et détails en temps réel, Google Maps, confirmation payée et annulation non payée via le serveur.

Voir [le guide complet](../CONFIGURATION.md) et [le modèle de configuration](../.env.example).

Sans configuration Firebase compilée, l’application affiche un écran de préparation et une démonstration explicitement fictive. Aucun secret serveur ni mot de passe n’est intégré à l’application.

```sh
flutter pub get
flutter analyze
flutter test
flutter build apk --release --dart-define-from-file=firebase.config.json
```

Depuis la racine, `npm run mobile:apk` vérifie la configuration Android et l'URL HTTPS, prépare la signature privée et lance la compilation release. Voir [DEPLOIEMENT.md](../DEPLOIEMENT.md) pour les éléments manquants. Ne pas installer un APK sans configuration comme version connectée. macOS/Xcode sont nécessaires pour iOS.

## Version 1.1 : historique et e-mails

Présentation harmonisée : palette vert forêt et crème, tableau de bord des commandes, badges de paiement, historique avec recherche, espaces adaptés aux petits écrans et au texte agrandi. L’icône Android et l’écran de démarrage reprennent l’identité Daily. Les annulations utilisent une couleur distincte et restent soumises au dialogue de confirmation.

Un aperçu fictif indépendant se compile avec `flutter build web --target tool/preview.dart --base-href /responsable/`. Le serveur local du site l’affiche dans `/responsable/` (liste), `/responsable/?screen=login` (connexion) et `/responsable/?screen=history` (historique fictif). Cet aperçu n’utilise aucun compte réel et n’est pas l’entrée de compilation de l’APK signé.

Déployer d’abord les nouvelles fonctions Vercel (`npx vercel@latest --prod` depuis la racine), puis installer le nouvel APK. Le reçu utilise la nouvelle route protégée `POST /api/admin/orders/:id/payment-email`.

L’application ouverte détecte les paiements confirmés par Stripe et demande l’envoi du reçu au client, avant la confirmation du responsable. Une relance intervient toutes les 30 secondes en cas d’échec. Application fermée, cette détection attend la réouverture. La confirmation ou l’annulation déclenche ensuite son propre e-mail. L’envoi SMTP reste exécuté sur Vercel avec l’adresse et le mot de passe d’application : aucun secret SMTP dans l’APK. Une trace privée Firestore empêche de renvoyer un reçu déjà enregistré comme accepté, même avec plusieurs téléphones. L’acceptation SMTP ne garantit pas la réception dans la boîte principale.

Le bouton Historique donne accès aux commandes traitées depuis cet appareil avec cette version. Chaque commande complète est enregistrée **avant** sa suppression de la liste active Firebase, puis marquée Confirmée ou Annulée. Un traitement interrompu reste À vérifier et peut être repris sans perdre sa copie.

Le fichier `order-history/<projet-et-compte>/orders.json` est situé dans le répertoire privé de l’application. Les dates, articles, coordonnées client, position GPS et remarques sont conservés. Sur le Web, le stockage équivalent utilise le navigateur. L’historique est séparé par projet Firebase et compte responsable. Il ne récupère pas les anciennes commandes ni celles traitées sur un autre appareil. Il survit aux redémarrages et aux mises à jour signées avec la même clé, mais pas à la désinstallation ou à l’effacement des données. Une fois connecté, les détails archivés se consultent hors ligne. Un fichier illisible n’est pas écrasé automatiquement.
