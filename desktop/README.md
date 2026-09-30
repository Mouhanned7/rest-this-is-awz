# Daily Chicken — application Windows

Cette deuxième application Flutter est indépendante de `mobile/`. Elle reprend le canal d’impression Windows du projet `genreateur_ticket-main`, avec les commandes et la connexion Daily Chicken.

## Utilisation

- Se connecter avec le même compte responsable que dans l’application mobile (Firebase Authentication, droit `dailyAdmin`).
- Les commandes de la collection Firestore `dailyOrders` se mettent à jour en direct. Un signal sonore annonce une nouvelle commande ou son passage au statut payé pendant que l’application reste ouverte.
- Une commande payée peut être confirmée. Une commande non payée peut être annulée. Le serveur vérifie à nouveau le paiement, envoie l’e-mail, puis retire la commande active.
- Une copie JSON locale précède cette action. L’historique de ce PC reste consultable hors ligne après connexion. Il est distinct de celui du téléphone et n’est pas synchronisé entre appareils.
- Chaque détail de commande et l’historique donnent accès au PDF et à la réimpression. Les tickets comprennent articles, options, montants, adresse, position GPS et remarque.
- Dans **Tickets & impression**, choisir une imprimante thermique **ESC/POS 80 mm**. L’impression après confirmation est désactivée jusqu’à son activation explicite. Un échec d’impression ne remet pas la commande confirmée en attente : réimprimer depuis l’historique.
- Les PDF sont dans `Documents/Daily Chicken/Tickets`. L’historique se trouve dans le dossier de support Windows de l’application, sous `order-history/<projet-et-compte>/orders.json`. Ces dossiers contiennent des données clients : ne pas les publier dans Git.

## Lancer depuis CMD

Depuis la racine du dépôt :

```cmd
npm run desktop:config
cd desktop
flutter pub get
flutter run -d windows --dart-define-from-file=firebase.config.json
```

Si Flutter n’est pas dans PATH, utiliser `C:\flutter\bin\flutter.bat` à sa place.

## Compiler pour un autre PC

```cmd
flutter build windows --release --dart-define-from-file=firebase.config.json
```

Distribuer **tout le dossier** `build/windows/x64/runner/Release`, avec ses DLL et son dossier `data`, et non le seul `daily_desktop.exe`. L’exécutable n’est pas signé avec un certificat Windows commercial. Le PC destinataire peut nécessiter Microsoft Visual C++ Redistributable x64.

Visual Studio Build Tools avec la charge **Desktop development with C++**, CMake et le SDK Windows sont nécessaires pour compiler, mais pas pour utiliser l’application compilée.

## Configuration et limites

`npm run desktop:config` lit le `.env` racine et exporte uniquement les identifiants Firebase publics et `PUBLIC_BASE_URL` dans `desktop/firebase.config.json`, ignoré par Git. Windows utilise `FIREBASE_WEB_APP_ID` du projet `mouhafr`. Aucun fichier Admin SDK, mot de passe responsable, clé Stripe ou mot de passe SMTP n’est embarqué.

Les envois d’e-mails passent par l’API authentifiée sur `https://www.dailychickenpizza.fr`. Les reçus de paiement sont dédupliqués par le serveur entre mobile et ordinateur. Aucune nouvelle base Firebase ni nouvelle règle permissive n’est nécessaire.

Firebase classe encore ses SDK Flutter Authentication et Firestore pour Windows en **bêta**, destinés aux workflows de développement : cette version native doit être validée en conditions réelles avant utilisation comme unique poste de production. Source : https://firebase.google.com/docs/flutter/setup.

## Vérification

```cmd
flutter analyze
flutter test
```

Les tests utilisent des commandes fictives : aucun paiement, e-mail client ou ticket physique n’est émis.
