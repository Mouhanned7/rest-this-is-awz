# Mise en service de dailychicken.vercel.app

## État vérifié

- Gmail SMTP : authentification acceptée, aucun e-mail de test envoyé.
- Firebase serveur : accès Firestore confirmé.
- Firebase responsable : compte créé, connexion par mot de passe et rôle `dailyAdmin` vérifiés.
- Firestore : règles privées publiées, lecture anonyme refusée (403).
- Firebase Android : configuration importée pour `fr.dailychicken.daily_orders`.
- Stripe : clé de test validée. Le mot « et » collé à sa fin dans `key.txt` a été retiré dans `.env`. Utiliser la valeur corrigée de `.env`, pas l’ancienne copie du document.
- Webhook Stripe : aucun endpoint pour l’URL finale lors de la vérification. Son secret reste à créer.
- Site Vercel : page accessible. API publiée : erreur 500 `ERR_REQUIRE_ESM` dans `jwks-rsa`/`jose`. Un correctif local fixe `jwks-rsa` à la version CommonJS compatible 3.2.2 pour Firebase Admin ; il nécessite un redéploiement.

## 1. Ajouter les clés à Vercel

1. Ouvrir le tableau de bord Vercel et choisir le projet **dailychicken**.
2. Ouvrir **Settings → Environment Variables**.
3. Choisir **Import .env**, puis sélectionner le fichier local `.env.vercel.production` à la racine du projet. Si l’interface ne propose pas l’import, ajouter les variables une par une.
4. Choisir l’environnement **Production** et enregistrer. Les variables privées peuvent être marquées **Secret/Sensitive** si cette option est affichée.

Le fichier d’import contient seulement :

| Variable | Contenu |
|---|---|
| `PUBLIC_BASE_URL` | `https://dailychicken.vercel.app` |
| `ONLINE_ORDERING_ENABLED` | `false` pendant la préparation |
| `STRIPE_SECRET_KEY` | Clé de test corrigée |
| `FIREBASE_PROJECT_ID` | `mouhafr` |
| `FIREBASE_CLIENT_EMAIL` | Identifiant du compte de service |
| `FIREBASE_PRIVATE_KEY` | Clé privée du compte de service |
| `SMTP_EMAIL` | Adresse d’envoi du restaurant |
| `SMTP_APP_PASSWORD` | Mot de passe d’application Gmail |
| `SMTP_HOST` | `smtp.gmail.com` |
| `SMTP_PORT` | `465` |

Les variables Android et le mot de passe du responsable restent locaux : ils ne sont pas nécessaires à Vercel. `.env.vercel.production` contient des secrets et est exclu de Git, des fichiers publics et du déploiement automatique. Ne pas le partager publiquement.

En saisie manuelle, ne pas ajouter de guillemets autour des valeurs. Pour `FIREBASE_PRIVATE_KEY`, conserver le bloc complet, avec ses lignes BEGIN/END et ses sauts de ligne (les `\n` littéraux sont aussi pris en charge). L’import du fichier `.env` gère ses guillemets.

## 2. Créer le webhook Stripe

1. Ouvrir [Stripe Workbench → Webhooks](https://dashboard.stripe.com/webhooks).
2. Passer en **mode test / sandbox correspondant à la clé `sk_test_…`**.
3. Cliquer **Créer une destination d’événements / Create an event destination**.
4. Choisir **Votre compte / Your account**, puis les événements classiques **Snapshot** si un type est demandé.
5. Sélectionner ces quatre événements :

```text
checkout.session.completed
checkout.session.async_payment_succeeded
checkout.session.async_payment_failed
checkout.session.expired
```

6. Continuer → **Webhook endpoint**, puis saisir exactement :

```text
https://dailychicken.vercel.app/api/stripe/webhook
```

7. Donner le nom « Daily Chicken — test » et créer la destination.
8. Dans ses détails, révéler le **Signing secret / Secret de signature**, qui commence par `whsec_`.
9. Ajouter une variable Vercel **`STRIPE_WEBHOOK_SECRET`**, environnement **Production**, avec cette valeur. Remplacer aussi l’ancien secret du `.env` local. Le secret de `stripe listen` est différent de celui de cette destination.

## 3. Redéployer le code corrigé

L’import des variables seul ne publie ni le correctif API ni la nouvelle fenêtre de paiement. Depuis le dossier local `Restaurant-main` :

```powershell
npx vercel@latest --prod
```

Le dossier est déjà lié au projet `dailychicken`. Attendre **Ready**, puis ouvrir :

```text
https://dailychicken.vercel.app/api/public-config
```

La réponse doit être du JSON, sans erreur 500. Avec les commandes désactivées, `orderingEnabled` et `paymentsEnabled` restent `false` ; `testMode` doit être `true`.

## 4. Vérifier une commande en mode test

1. Dans Vercel, passer `ONLINE_ORDERING_ENABLED=true`, puis redéployer. Le site devient alors utilisable pour les commandes de test : effectuer cette recette avant de l’annoncer aux clients.
2. Créer une petite commande depuis le site, puis payer sur Stripe avec la carte de test `4242 4242 4242 4242`, une date future et un CVC de trois chiffres.
3. Dans Stripe → votre webhook → **Event deliveries / Livraisons**, vérifier une réponse **200** pour l’événement correspondant à cette commande.
4. De retour sur le site, attendre la fenêtre **« Paiement réussi ! »**. Elle apparaît seulement lorsque le serveur confirme le paiement ; une URL contenant `success` ne suffit pas.
5. Dans l’APK, se connecter avec les identifiants responsable de `key.txt`, vérifier la commande payée et ses détails. Confirmer la commande pour déclencher l’e-mail et le retrait de la liste active. Cette étape enverra réellement un e-mail à l’adresse client saisie, même si le paiement Stripe est en test.

Un exemple d’événement envoyé depuis Stripe sans commande créée sur le site ne valide pas le parcours complet : le serveur vérifie également l’identifiant de commande, le montant et la session Stripe.

En cas d’échec : **400** indique généralement une signature incorrecte ; **503** un service non configuré ou indisponible ; **500** nécessite de consulter **Vercel → Logs**. Un webhook ne doit pas être bloqué par un écran de connexion Vercel.

Les clés test ne permettent pas d’encaisser réellement. Le passage en réel exige la clé Stripe live et un webhook créé en mode live avec son propre secret.

## APK

APK release signé : `mobile/build/app/outputs/flutter-apk/app-release.apk`. Il contient la configuration Firebase publique et l’URL Vercel, sans clé privée ni mot de passe. La connexion du responsable est vérifiée via Firebase. La version 1.1 ajoute l’historique JSON local et le reçu de paiement déclenché par l’application ouverte : déployer le nouveau code Vercel avant de l’utiliser. L’API publique déployée a répondu correctement lors de la dernière vérification ; une commande test payée et confirmée a été observée dans les archives privées Firebase.

Pour reconstruire plus tard : `npm run mobile:apk`. Si l’ancienne APK de démonstration est installée, la désinstaller avant cette version, car sa signature est différente.

Pour mettre à jour un APK release existant signé avec la même clé, l’installer par-dessus : désinstaller efface l’historique local. Voir [le fonctionnement de l’historique et des reçus](mobile/README.md).

## Présentation des e-mails et dossier spam

Les messages de paiement, confirmation et annulation utilisent un modèle HTML adapté au mobile, avec une version texte alternative. L’expéditeur reste l’adresse Gmail authentifiée par SMTP et le bouton de contact appelle directement le restaurant. Aucun pixel de suivi ni image distante n’est nécessaire. Les remarques, noms et adresses sont échappés avant leur insertion dans le HTML.

Un reçu de paiement ne signifie pas que le restaurant a confirmé la commande : son texte distingue ces deux étapes. Chaque événement a son propre identifiant d’e-mail. Le nouveau design s’applique aux futurs envois après redéploiement, sans renvoyer les anciennes confirmations.

Le design ne garantit pas d’éviter les spams. L’acceptation par Gmail SMTP ne prouve pas la remise dans la boîte principale. Pour un message reçu en spam, utiliser « Non-spam » et ajouter l’expéditeur aux contacts. L’authentification du message reçu (SPF/DKIM/DMARC) se vérifie dans « Afficher l’original ». Aucune conclusion sur cette authentification ne peut être tirée sans les en-têtes du message reçu. Avec une adresse `@gmail.com`, Google gère le domaine expéditeur ; ne pas ajouter de faux enregistrements DNS au domaine Vercel. Un futur domaine d’expédition personnalisé devra être authentifié auprès de son fournisseur. [Recommandations Gmail](https://support.google.com/mail/answer/81126?hl=fr).

Pour examiner le modèle sans envoyer de message : `node scripts/preview-emails.cjs`. Les trois exemples fictifs sont générés dans `.design-backup/email-preview/`, exclu du déploiement.

Sources : [variables Vercel](https://vercel.com/docs/environment-variables), [webhooks Stripe](https://docs.stripe.com/webhooks), [cartes de test Stripe](https://docs.stripe.com/testing).
