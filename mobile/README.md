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

Le fichier `order-history/<projet-et-compte>/orders.json` est situé dans le répertoire privé de l’application. Les dates, articles, coordonnées client, position GPS et remarques sont conservés. Sur le Web, le stockage équivalent utilise le navigateur. L’historique est séparé par projet Firebase et compte responsable. Les archives encore présentes dans Firebase sont récupérées à la connexion. Il survit aux redémarrages et aux mises à jour signées avec la même clé, mais pas à la désinstallation ou à l’effacement des données. Une fois connecté, les détails archivés se consultent hors ligne. Un fichier illisible n’est pas écrasé automatiquement.


## Sauvegarde locale et nettoyage Firebase

À la connexion, puis toutes les 30 secondes et après un traitement, l’application transfère les commandes clôturées vers son fichier JSON privé. Elle relit le fichier avant d’accuser réception de la version exacte au serveur. Le serveur supprime ensuite l’archive, le jeton de suivi et les traces associées de paiement/e-mail. Une panne de stockage ou de réseau conserve la copie distante jusqu’à une tentative réussie. Les commandes actives ne sont jamais purgées par ce transfert.

Le premier appareil qui termine ce transfert garde l’historique : les copies locales des autres appareils ne sont pas synchronisées après suppression. Conserver une sauvegarde du répertoire de l’application avant de changer de poste ou de désinstaller. Les archives locales contiennent des données clients.

Les applications affichent les montants et les promotions calculés par le serveur, identiques au montant envoyé à Stripe. Le ticket Windows utilise également le champ `pizzaDiscount`.


Après confirmation serveur et sauvegarde locale, le retour à la liste n’attend plus le transfert des archives ni, sur Windows, la création/l’impression du ticket. Ces opérations continuent en arrière-plan ; un échec de nettoyage sera repris et un échec d’impression est signalé. Le jeton Firebase valide est réutilisé, avec renouvellement automatique par le SDK. Les horaires sont affichés « 11:00 AM – 1:00 PM » (11 h à 13 h, heure de Paris).
