# Daily Chicken — Vercel + Firebase

Le site et son API se déploient dans **un seul projet Vercel**. Aucun serveur séparé ni VPS n’est nécessaire. **Firebase est l’unique base de données** et gère la connexion du responsable ainsi que le temps réel. Stripe traite les paiements. Votre adresse e-mail et son mot de passe d’application permettent l’envoi des confirmations et annulations par SMTP.

Le domaine de production est https://www.dailychickenpizza.fr. Le nouveau compte SMTP a été vérifié et ses variables ont été mises à jour dans Vercel, puis redéployées. Au contrôle du 30 septembre 2026, l’API fonctionne mais annonce encore `testMode: true` pour Stripe. Pour accepter des paiements réels, fournir une clé serveur live et le secret du webhook live correspondant. L’activation du compte Stripe seule ne remplace pas les clés test de Vercel. Le fichier privé `.env.vercel.production` conserve des valeurs locales : ne pas l’importer intégralement pour écraser une production déjà configurée.

L’application Windows indépendante est dans `desktop/` ; ses commandes de lancement sont dans `desktop/README.md`. L’application Android reste dans `mobile/`.

## 1. Déployer sur Vercel

Importer le dépôt du projet dans Vercel, avec le dossier `Restaurant-main` comme racine si votre dépôt contient plusieurs dossiers. Choisir **Framework Preset : Other**. La configuration `vercel.json` fournit :

| Réglage | Valeur |
|---|---|
| Node.js | 24.x |
| Install Command | `npm ci` |
| Build Command | `npm run build:vercel` |
| Output Directory | `dist` |
| API | Fonction `api/index.js`, accessible sous `/api/...` |
| Durée maximale | 60 secondes par invocation |

Le build copie uniquement les pages et leurs fichiers publics dans `dist`. Les fichiers `.env`, sauvegardes, sources privées et configurations Flutter ne sont pas publiés. Le dossier `api` est traité séparément comme fonction Node.js ; il ne faut pas déployer uniquement `dist` sans le projet contenant l’API.

**Ne pas lancer `npm start` sur Vercel.** Cette commande sert à l’aperçu local. Vercel appelle directement la fonction exportée, sans `app.listen()` et sans processus permanent. Flutter se compile localement ; Vercel n’a pas besoin du SDK Flutter pour publier le site.

## 2. Renseigner les variables Vercel

Dans **Project → Settings → Environment Variables**, saisir les valeurs ci-dessous pour l’environnement Production. `.env.example` contient le modèle commenté pour les essais locaux. Le fichier `.env` de ce PC n’est pas automatiquement envoyé à Vercel. Ne jamais recopier les secrets dans JavaScript public ni dans Flutter.

| Variable | Valeur attendue |
|---|---|
| `PUBLIC_BASE_URL` | L’URL HTTPS finale, par exemple `https://votre-projet.vercel.app`, sans chemin ni slash final |
| `ONLINE_ORDERING_ENABLED` | `false` pendant la préparation, puis `true` après configuration et recette |
| `STRIPE_SECRET_KEY` | Votre clé Stripe ; commencer avec la clé de test déjà fournie |
| `STRIPE_WEBHOOK_SECRET` | Secret `whsec_…` du webhook du domaine Vercel final |
| `FIREBASE_PROJECT_ID` | `project_id` du compte de service Firebase |
| `FIREBASE_CLIENT_EMAIL` | `client_email` du compte de service Firebase |
| `FIREBASE_PRIVATE_KEY` | `private_key` complète, avec ses sauts de ligne réels ou `\n`. Ne pas ajouter de guillemets enveloppants dans le champ Vercel |
| `SMTP_EMAIL` | Adresse e-mail du restaurant, expéditeur et identifiant SMTP |
| `SMTP_APP_PASSWORD` | Mot de passe d’application de cette adresse |
| `SMTP_HOST` | `smtp.gmail.com` par défaut, ou serveur de votre fournisseur |
| `SMTP_PORT` | `465` pour TLS direct (par défaut), ou `587` pour STARTTLS obligatoire |
| `ORDER_EMAIL_REPLY_TO` | Adresse de réponse du restaurant, facultative |
| `GOOGLE_MAPS_SERVER_API_KEY` | Facultative : Geocoding API pour préremplir l’adresse depuis le GPS |
| `CRON_SECRET` | Facultatif : secret aléatoire d’au moins 32 caractères pour une reprise planifiée |

Après une modification des variables, redéployer le projet. Pour une Preview Vercel, utiliser des données de test et définir `PUBLIC_BASE_URL` sur le domaine exact de cette Preview ; les URLs de retour Stripe et le contrôle d’origine dépendent de cette valeur.

La détection GPS et les liens Google Maps n’exigent aucune clé Google. Le client doit autoriser la position dans son navigateur. L’adresse postale reste obligatoire en livraison. Le contrôle du téléphone accepte les numéros métropolitains de `01` à `09` à dix chiffres, ou `+33` suivi de neuf chiffres, avec normalisation des espaces, tirets et points. Il vérifie le format, pas l’identité du titulaire.

## 3. Préparer Firebase

1. Utiliser un projet Firebase dédié au restaurant. Activer **Cloud Firestore** et **Authentication → Email/Mot de passe**.
2. Paramètres du projet → Comptes de service → Générer une clé privée. Reporter les trois champs serveur du JSON dans les variables Vercel. Il n’est pas nécessaire d’envoyer le JSON comme fichier.
3. Publier `firestore.rules` dans la console Firestore. Les commandes actives sont lisibles uniquement par un compte avec le rôle `dailyAdmin`. Les écritures sont réservées au serveur. Ces règles ferment aussi les autres collections : ne pas les appliquer sans adaptation à un projet partagé avec une autre application.
4. Sur ce PC, compléter `.env` avec les identifiants Firebase, `ADMIN_EMAIL` et `ADMIN_INITIAL_PASSWORD` (au moins 6 caractères (ou davantage selon la politique Firebase)), puis lancer `npm run admin:setup`. Ce script ponctuel crée ou autorise le responsable ; aucun serveur local permanent n’est nécessaire. Pour un compte existant, il conserve son mot de passe.
5. Retirer le mot de passe initial du fichier après utilisation. Il n’est pas nécessaire dans Vercel et n’est jamais intégré à Flutter.

La liste `dailyOrders` fournit les commandes en temps réel. Après une confirmation payée ou une annulation non payée, le document quitte cette liste. Une archive **privée dans le même Firebase**, `dailyOrderArchive`, conserve le statut, la trace du paiement et de l’e-mail pour éviter les doubles traitements et permettre le suivi client. Il s’agit donc d’un retrait de la liste active, pas d’un effacement définitif de toute trace. Définir la durée de conservation de cette archive avec l’exploitant.

Les collections privées `dailyOrderSecrets`, `dailyStripeEvents` et `dailyOperations` gardent respectivement les empreintes des jetons de suivi, les événements Stripe traités et les actions à reprendre. Aucune autre base de données n’est utilisée.

## 4. Brancher Stripe sur Vercel

Dans Stripe, créer un webhook vers :

```text
https://votre-projet.vercel.app/api/stripe/webhook
```

Événements : `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`.

Renseigner son secret dans `STRIPE_WEBHOOK_SECRET` sur Vercel puis redéployer. L’ancien secret local ne correspond pas nécessairement au nouveau webhook. L’URL doit être accessible à Stripe sans écran de connexion Vercel : vérifier les réglages de protection du déploiement si Stripe reçoit un refus d’accès.

Aucune clé publique `pk_…` n’est nécessaire : le site utilise Stripe Checkout hébergé. Le serveur recalcule le prix depuis la carte. Le retour dans le navigateur ne marque jamais une commande payée ; seul le webhook signé avec montant, devise et session corrects le fait.

Pour les essais locaux : `stripe listen --forward-to http://127.0.0.1:3000/api/stripe/webhook`, puis utiliser le secret fourni par cette session CLI dans le `.env` local.

## 5. Confirmation, annulation et e-mails

| État | Action du responsable | Résultat |
|---|---|---|
| Payée par Stripe | Confirmer | E-mail de confirmation puis retrait atomique de la liste active Firebase et archivage privé |
| Non payée | Annuler | Fermeture de la session Stripe éventuelle, e-mail d’annulation puis retrait de la liste et archivage |
| Paiement en cours de confirmation | Annulation refusée | Attendre le webhook, puis confirmer |

La clôture envoie le message par SMTP pendant la requête Vercel et attend son acceptation. Le responsable peut appuyer sur **Reprendre le traitement** en cas d’échec. L’opération est conservée dans Firebase : après une acceptation SMTP enregistrée dans Firebase, une reprise ne renvoie pas cet e-mail. Après une interruption brutale, le verrou expire au bout de 90 secondes.

Vercel ne lance pas la boucle locale de reprise toutes les 30 secondes. **Aucun Cron n’est activé par défaut**, pour ne pas supposer votre formule Vercel. Le bouton du responsable suffit pour reprendre une action. Un point d’entrée optionnel existe : `GET /api/internal/retry-orders`, protégé par `Authorization: Bearer <CRON_SECRET>`. Il traite au maximum une opération par appel et attend son résultat. Pour planifier cette reprise, configurer un Vercel Cron à une fréquence permise par votre formule ; Vercel lui transmet automatiquement `CRON_SECRET`. Une cadence fréquente évite les retards : le plan Hobby limite les Crons à une fois par jour et ne garantit pas la minute précise.

SMTP ne fournit pas de clé anti-doublon : si le serveur accepte le message mais que la connexion coupe avant sa réponse, ou si la sauvegarde de cette réponse échoue, une reprise peut envoyer un doublon. Le même Message-ID facilite le suivi mais ne garantit pas la déduplication. L’acceptation SMTP ne garantit pas l’arrivée en boîte de réception ; vérifier les courriers indésirables et les retours d’échec.

### Configurer Gmail avec un mot de passe d’application

1. Activer la validation en deux étapes du compte Google.
2. Ouvrir https://myaccount.google.com/apppasswords et créer un mot de passe pour « Daily Chicken » (si cette option est disponible pour le compte).
3. Renseigner uniquement votre adresse dans `SMTP_EMAIL` et ce mot de passe dans `SMTP_APP_PASSWORD`. Gmail est déjà le serveur par défaut ; les espaces de présentation du mot de passe sont retirés automatiquement.
4. Reporter ces variables dans Vercel et redéployer. Le mot de passe reste dans les fonctions serveur et n’est jamais envoyé au navigateur ou à Flutter.

Un autre fournisseur peut être utilisé s’il autorise SMTP avec mot de passe d’application : adapter `SMTP_HOST` et `SMTP_PORT`. Les ports pris en charge sont 465 et 587, avec chiffrement obligatoire. Aucun domaine d’envoi supplémentaire n’est nécessaire avec votre adresse Gmail. Les limites d’envoi et restrictions du fournisseur restent applicables.

Il n’y a pas de remboursement automatique. Les règlements prévus au retrait ou à la livraison restent non payés dans cette version ; aucune saisie manuelle d’encaissement n’est implémentée.

## 6. Application Flutter

Enregistrer les applications dans Firebase avec les identifiants :

- Android : `fr.dailychicken.daily_orders`
- iOS : `fr.dailychicken.dailyOrders`

Compléter les variables publiques de `.env` : `FIREBASE_API_KEY`, `FIREBASE_MESSAGING_SENDER_ID`, `FIREBASE_ANDROID_APP_ID`, `FIREBASE_IOS_APP_ID`, `FIREBASE_IOS_BUNDLE_ID`, éventuellement `FIREBASE_STORAGE_BUCKET`. Pour une version web connectée, ajouter `FIREBASE_WEB_APP_ID` et `FIREBASE_AUTH_DOMAIN`. La clé Android distincte est fournie dans `FIREBASE_ANDROID_API_KEY` ; le site conserve `FIREBASE_API_KEY`.

Définir `PUBLIC_BASE_URL` sur **le domaine Vercel accessible au téléphone**, puis :

```sh
npm run mobile:config
cd mobile
flutter pub get
flutter analyze
flutter test
flutter build apk --release --dart-define-from-file=firebase.config.json
```

Le fichier généré contient uniquement la configuration Firebase publique et l’adresse de l’API Vercel, sans secret Stripe, identifiant SMTP privé, compte de service ni mot de passe. Un téléphone ne doit pas utiliser `127.0.0.1` pour contacter le serveur du site.

L’APK est dans `mobile/build/app/outputs/flutter-apk/app-release.apk`. Sans configuration Firebase compilée, il affiche l’écran de préparation et une démonstration fictive. La signature release est préparée ; sauvegarder les fichiers privés indiqués dans DEPLOIEMENT.md. La compilation iOS exige macOS et Xcode.

Le temps réel fonctionne dans l’application ouverte ; aucune notification push n’est prévue lorsqu’elle est fermée. La liste charge 100 commandes et permet de charger les précédentes. Les filtres portent sur les commandes chargées.

L’aperçu Flutter local `/responsable/` reste disponible après `flutter build web --base-href /responsable/`. Il n’est pas inclus dans le build Vercel du site ; l’application Android/iOS est un livrable séparé.

## Vérifications

```sh
npm test
npm run build:vercel
npm run check:config
```

Les tests couvrent les prix, les téléphones français, les droits d’accès, les webhooks signés, les doublons, les paiements concurrents aux annulations, les reprises après panne, l’adaptateur Vercel et l’absence de secrets dans les fichiers publics. Ils utilisent des services simulés. La recette avec votre Firebase, votre domaine Vercel, le webhook Stripe et votre compte SMTP doit être effectuée après configuration ; le déploiement distant n’a pas été testé depuis ce poste.

Les limites de requêtes actuelles sont locales à chaque instance de fonction ; elles ne constituent pas un quota global distribué. Les contrôles de prix, d’authentification et de signature sont appliqués à chaque requête. Le périmètre de livraison reste à confirmer avec le restaurant.

Références : [fonctions Vercel Node.js](https://vercel.com/docs/functions/runtimes/node-js), [durée des fonctions](https://vercel.com/docs/functions/configuring-functions/duration), [limites des Crons](https://vercel.com/docs/cron-jobs/usage-and-pricing), [sécuriser un Cron](https://vercel.com/docs/cron-jobs/manage-cron-jobs), [Firebase Flutter](https://firebase.google.com/docs/flutter/setup), [webhooks Stripe](https://docs.stripe.com/webhooks/signature), [mots de passe d’application Google](https://support.google.com/accounts/answer/185833?hl=fr), [SMTP Nodemailer](https://nodemailer.com/smtp), [e-mails sur Vercel](https://vercel.com/kb/guide/sending-emails-from-an-application-on-vercel).
