# Déploiement et APK Daily Orders

Les valeurs utiles de `Documents/key.txt` ont été importées dans `.env`. L'authentification SMTP a été vérifiée sans envoyer d'e-mail. Le fichier contient une application Firebase **web** du projet `mouhafr` ; la configuration Android a ensuite été importée depuis `Downloads/google-services.json`. Le compte de service serveur a également été importé et l’accès Firestore a été vérifié. Les identifiants responsable fournis à la fin de `key.txt` ont été repris dans `.env`.

## Vercel

Depuis le dossier `Restaurant-main`, dans PowerShell :

```powershell
npx vercel@latest login
npx vercel@latest link
```

Choisir votre compte et créer/lier le projet Daily Chicken. Framework : **Other**. Les réglages de compilation sont déjà dans `vercel.json`.

Dans les paramètres Vercel, importer les variables serveur de `.env` dans l'environnement **Production** : Stripe, Firebase serveur et SMTP. Ne pas importer `ADMIN_INITIAL_PASSWORD`, les variables d'émulateur ou le port local. Remplacer `PUBLIC_BASE_URL` par le domaine HTTPS du projet Vercel. Garder `ONLINE_ORDERING_ENABLED=false` jusqu'à la vérification des services. `.env` est volontairement exclu du déploiement : la commande suivante ne l'importe pas automatiquement.

```powershell
npx vercel@latest --prod
```

Configurer le webhook Stripe sur `https://VOTRE-DOMAINE/api/stripe/webhook`, renseigner son `STRIPE_WEBHOOK_SECRET` puis redéployer. Les détails figurent dans `CONFIGURATION.md`.

## Éléments Firebase encore nécessaires

1. **Android configuré** : `google-services.json` a été importé pour `fr.dailychicken.daily_orders`. `FIREBASE_ANDROID_APP_ID`, `FIREBASE_ANDROID_API_KEY` et l'ID de l'expéditeur sont renseignés dans `.env`. La clé publique web reste séparée.
2. **Clé serveur configurée localement** : `FIREBASE_CLIENT_EMAIL` et `FIREBASE_PRIVATE_KEY` sont renseignés dans `.env`. Il reste à les importer dans les variables Vercel. Ne jamais les mettre dans Flutter.
3. **Firestore sécurisé** : règles privées publiées ; lecture anonyme refusée (403). Authentication est actif.
4. **Compte responsable créé** avec les identifiants de `key.txt` et le rôle `dailyAdmin`. Connexion Firebase vérifiée.
5. **URL configurée** : `PUBLIC_BASE_URL=https://www.dailychickenpizza.fr` pour le site et l’APK.

## Compiler un APK connecté et signé

Depuis la racine :

```powershell
npm run admin:setup
npm run mobile:apk
```

La seconde commande vérifie la configuration Android et l'URL publique, génère uniquement les paramètres publics puis lance :

```powershell
cd mobile
flutter build apk --release --dart-define-from-file=firebase.config.json
```

Résultat attendu : `mobile/build/app/outputs/flutter-apk/app-release.apk`. Le responsable se connecte avec son e-mail et son mot de passe Firebase. Aucun mot de passe n'est intégré à l'APK. Les commandes proviennent de Firestore, avec mises à jour en temps réel et accès réservé au rôle `dailyAdmin`.

La signature de production est préparée dans `.secrets/daily-orders-release.jks` et `mobile/android/key.properties`. **Sauvegarder ces deux fichiers en privé** : ils servent aux futures mises à jour de l'APK. Ils sont exclus du dépôt et du déploiement Vercel. Si une ancienne APK de démonstration signée avec la clé debug est installée, il faudra la désinstaller avant d'installer la version release.

La compilation release connectée est terminée et la signature APK a été vérifiée. Le site public existe ; l’API nécessite le redéploiement du correctif de dépendance Firebase et la configuration des variables serveur. Le webhook Stripe reste à créer.

Sources : [Vercel CLI](https://vercel.com/docs/cli/deploy), [signature Android Flutter](https://docs.flutter.dev/deployment/android), [configuration Firebase Flutter](https://firebase.google.com/docs/flutter/setup).


## Paiement réel et horaires

Le domaine de production est `https://www.dailychickenpizza.fr` ; le webhook réel doit utiliser `/api/stripe/webhook` sur ce domaine. Les clés `sk_live_` et `whsec_` sont uniquement côté serveur dans Vercel. Les quatre événements Checkout sont `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`.

Le site public refuse les sessions Stripe de test. Il vérifie aussi l’autorisation Stripe `charges_enabled` (cache de 60 secondes) : pendant la vérification du compte, le règlement au retrait/livreur reste proposé pendant les horaires d’ouverture. Après approbation Stripe, la carte redevient disponible automatiquement. Un changement de variables Vercel nécessite un redéploiement.

Les nouvelles commandes et l’accès au paiement sont bloqués de 13 h à 11 h le lendemain, heure de Paris, y compris si le formulaire est resté ouvert. Le panier reste conservé. Une session Stripe déjà ouverte avant la fermeture reste soumise à sa propre expiration chez Stripe.

`STRIPE_LEGACY_TEST_SECRET_KEY` permet uniquement de consulter/clôturer les anciennes sessions de test pendant leur migration vers l’historique local. Elle ne sert pas à créer les nouveaux paiements. Retirer cette variable après la fin de la migration de ces commandes.


## Interrupteur Firestore : commandes hors horaires

Dans Firebase → Firestore Database → collection `dailySettings` → document `ordering`, modifier le champ **booléen** `allowOutsideHours` :

- `true` (ON) : les commandes sont autorisées à toute heure, y compris en dehors de 11:00 AM–1:00 PM.
- `false` (OFF, valeur initiale) : les horaires normaux de Paris s’appliquent.

Le réglage est relu côté serveur à chaque création de commande et à chaque ouverture du paiement. Aucun redéploiement n’est nécessaire. Le bandeau du site se met à jour au prochain rafraîchissement ou dans la minute. Si le champ manque, n’est pas un booléen ou ne peut pas être lu, les horaires normaux s’appliquent. Les clients du site ne peuvent pas modifier ce réglage ; les règles Firestore restent fermées, la modification se fait dans la console Firebase avec les droits du propriétaire du projet.

Ce réglage ne désactive pas les autres validations (minimum de livraison, disponibilité du service, autorisation des encaissements Stripe). Le document de configuration reste dans Firestore lorsque les collections de commandes sont vidées.


## Adresse GPS internationale et carte indisponible

La recherche d’adresse utilise Google Geocoding si une clé serveur est configurée, puis IGN en France métropolitaine. Photon/OpenStreetMap sert de secours mondial, notamment en Tunisie. L’adresse textuelle est copiée dans le champ de livraison et reste modifiable ; un numéro absent doit être complété. Une saisie effectuée pendant la recherche n’est pas remplacée. Attribution OpenStreetMap affichée pour les résultats Photon. Les résultats proches sont mis en cache uniquement en mémoire, au plus 200 entrées pendant 10 minutes.

Le serveur public Photon accepte un usage raisonnable sans garantie de disponibilité : https://github.com/komoot/photon#demo-server. Pour un volume plus important, configurer `PHOTON_REVERSE_URL` vers une instance dédiée ou `GOOGLE_MAPS_SERVER_API_KEY`.

Si Stripe n’autorise pas encore les encaissements, le formulaire explique pourquoi la carte ne peut pas être sélectionnée et propose le règlement au retrait/livreur. Le bouton « Vérifier la disponibilité de la carte » rafraîchit ce statut sans effacer les coordonnées du client. L’activation reste conditionnée à l’approbation de Stripe, avec un cache serveur maximal de 60 secondes.
