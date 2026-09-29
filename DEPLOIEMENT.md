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
5. **URL configurée** : `PUBLIC_BASE_URL=https://dailychicken.vercel.app` pour le site et l’APK.

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
