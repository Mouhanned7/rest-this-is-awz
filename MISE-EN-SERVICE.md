# Daily Chicken — remise au propriétaire et mise en service

Guide adapté au code de ce projet, vérifié le 25 septembre 2026. Les exemples sont fictifs : remplacer leurs valeurs dans les réglages, sans publier les secrets. Le site et ses fonctions sont hébergés sur Vercel ; Firebase fournit Authentication et Firestore ; l’APK utilise ces mêmes services.

## 1. Les trois adresses e-mail à distinguer

| Utilisation | Où se règle-t-elle ? | Effet |
| --- | --- | --- |
| Expéditeur des e-mails de commande | `SMTP_EMAIL` + `SMTP_APP_PASSWORD` dans Vercel | Les clients reçoivent les messages envoyés par le Gmail du propriétaire. |
| Adresse qui reçoit les réponses | `ORDER_EMAIL_REPLY_TO`, facultatif | Quand le client répond à un message. À défaut : le Gmail expéditeur. |
| Compte de connexion du responsable | Utilisateur Firebase Authentication avec le rôle `dailyAdmin` | Ouvre l’application et autorise les actions sur les commandes. |
| Destinataire de chaque commande | E-mail saisi par l’acheteur sur le site | Ce n’est pas une variable Vercel : chaque acheteur reçoit son propre e-mail. |

Changer le Gmail expéditeur ne change pas le compte de connexion de l’application. Les deux peuvent utiliser la même adresse, mais leurs mots de passe sont différents.

## 2. Utiliser le Gmail du propriétaire pour les envois

1. Le propriétaire ouvre son propre compte Google et active la **validation en deux étapes**.
2. Il ouvre [Mots de passe des applications](https://myaccount.google.com/apppasswords), crée un mot de passe pour « Daily Chicken », puis conserve la valeur générée. Ce n’est pas le mot de passe habituel de Gmail. Certains comptes professionnels ou protégés n’offrent pas cette option. [Aide Google](https://support.google.com/accounts/answer/185833?hl=fr).
3. Dans Vercel : projet **dailychicken → Settings → Environment Variables**, modifier ces variables pour **Production** :

```dotenv
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_EMAIL=adresse-du-proprietaire@gmail.com
SMTP_APP_PASSWORD=mot_de_passe_application_genere_par_google
ORDER_EMAIL_REPLY_TO=adresse-du-proprietaire@gmail.com
```

4. Mettre les mêmes valeurs dans le `.env` local si les essais locaux doivent utiliser ce Gmail. Le fichier local ne met pas automatiquement à jour Vercel.
5. Redéployer le projet. Modifier des variables ne met pas à jour une version déjà déployée. [Variables Vercel](https://vercel.com/docs/environment-variables).

```powershell
npx vercel@latest --prod
```

6. Vérifier l’expéditeur et l’adresse de réponse lors de la prochaine commande consentie. Vérifier aussi les courriers indésirables. Le design HTML ne garantit pas la boîte principale ; pour un domaine d’expédition personnalisé, son fournisseur doit configurer SPF/DKIM/DMARC. [Consignes Gmail](https://support.google.com/mail/answer/81126?hl=fr).

**Aucun nouvel APK nécessaire pour changer uniquement le Gmail SMTP.** Le secret reste dans Vercel. L’application ouverte déclenche le reçu de paiement ; la confirmation et l’annulation déclenchent leurs messages respectifs. Si l’application est fermée, le reçu attend sa réouverture. Google révoque les mots de passe d’application après un changement du mot de passe Google : en recréer un puis actualiser Vercel si cela arrive. [Google](https://support.google.com/accounts/answer/185833?hl=fr).

## 3. Donner au propriétaire son accès à l’application

Si son compte responsable existe déjà, il utilise simplement son e-mail Firebase et son mot de passe. Pour créer un nouveau responsable dans le **même projet Firebase** :

1. Dans le `.env` local uniquement, renseigner :

```dotenv
ADMIN_EMAIL=adresse-du-proprietaire@gmail.com
ADMIN_INITIAL_PASSWORD=un_mot_de_passe_firebase_solide_et_distinct
```

2. Depuis le dossier du projet, exécuter :

```powershell
npm run admin:setup
```

3. Le script crée l’utilisateur s’il n’existe pas et lui attribue `dailyAdmin`. Si l’utilisateur existe déjà, il conserve son mot de passe actuel : `ADMIN_INITIAL_PASSWORD` ne le remplace pas.
4. Le propriétaire se connecte dans l’APK. Aucun APK à reconstruire si le projet Firebase et l’URL API restent identiques.
5. Après validation du transfert, désactiver les anciens comptes responsables qui ne doivent plus accéder au restaurant dans Firebase Authentication. Le script n’enlève pas automatiquement leur rôle.

`ADMIN_EMAIL` et `ADMIN_INITIAL_PASSWORD` ne sont pas utilisés par les fonctions Vercel à chaque connexion. Les changer dans Vercel seul ne crée pas de compte. Le mot de passe Firebase n’est jamais le mot de passe d’application Gmail. L’historique JSON est local et séparé par compte : le nouveau compte n’hérite pas automatiquement de l’historique d’un ancien compte.

## 4. Passer Stripe en réel

1. Utiliser le **compte Stripe du restaurant/propriétaire**. Dans le Dashboard, terminer les informations demandées pour activer les paiements et les versements : identité/entreprise, coordonnées bancaires et informations commerciales. Les fonds appartiennent au compte Stripe dont la clé est configurée.
2. Terminer les essais en mode test. **Traiter les commandes de test encore actives avant le changement de clé** : les confirmer si payées, les annuler si non payées. Les sessions Stripe test ne sont pas accessibles avec une clé live. Les copies historiques Firebase/JSON peuvent être conservées, mais elles ne représentent pas des ventes réelles. [Environnements Stripe](https://docs.stripe.com/keys).
3. Quitter le sandbox/mode test. Dans les clés API du compte réel, récupérer la clé serveur live. Dans cette intégration, `STRIPE_SECRET_KEY` reçoit la clé `sk_live_…`. Ne pas recopier une clé dans une page HTML, un dépôt public ou l’APK. La clé publique `pk_live_…` n’est pas utilisée ici : le serveur crée la session et le navigateur ouvre Checkout hébergé par Stripe. [Clés Stripe](https://docs.stripe.com/keys).
4. Dans Stripe **Workbench → Webhooks**, créer une destination en **mode réel**, de type événements Snapshot, pour votre compte. Utiliser l’URL publique finale :

```text
https://dailychicken.vercel.app/api/stripe/webhook
```

Si votre domaine est déjà prêt, remplacer le domaine ci-dessus par le vôtre. Le chemin reste `/api/stripe/webhook`. Sélectionner :

```text
checkout.session.completed
checkout.session.async_payment_succeeded
checkout.session.async_payment_failed
checkout.session.expired
```

5. Copier le **secret de signature de cette destination live**, qui commence par `whsec_`. Il est distinct de la clé API et du secret du webhook de test. Si Stripe demande une version d’API, la bibliothèque installée utilise actuellement `2025-08-27.basil` (Stripe Node 18.5). Choisir cette version pour la destination si elle est proposée ; une future mise à jour de la bibliothèque devra être vérifiée séparément. [Webhooks Stripe](https://docs.stripe.com/webhooks).
6. Dans Vercel, remplacer les variables **Production** ensemble :

```dotenv
STRIPE_SECRET_KEY=sk_live_REMPLACER_PAR_LA_CLE_REELLE
STRIPE_WEBHOOK_SECRET=whsec_REMPLACER_PAR_LE_SECRET_DU_WEBHOOK_LIVE
PUBLIC_BASE_URL=https://dailychicken.vercel.app
ONLINE_ORDERING_ENABLED=true
```

7. Redéployer avec `npx vercel@latest --prod`. Les clés test doivent rester dans l’environnement réservé aux essais, pas être mélangées aux clés live. Ne pas importer un ancien `.env.vercel.production` contenant des valeurs de test par-dessus cette configuration.
8. Ouvrir `https://dailychicken.vercel.app/api/public-config` (ou votre nouveau domaine) et vérifier : `orderingEnabled: true`, `paymentsEnabled: true`, `testMode: false`. Ce contrôle vérifie les réglages reconnus par le code, pas la validité complète du compte ou du webhook.
9. Lors de la première **vraie commande**, vérifier le paiement dans Stripe live, la livraison du webhook avec réponse 200, le statut Payée dans l’application et les e-mails au client. Le montant est réellement débité en live. Les numéros de carte de test comme 4242 ne servent qu’en sandbox. Une carte virtuelle bancaire reste une vraie carte.
10. Après traitement des derniers événements de test, désactiver l’ancienne destination de test si elle vise la même URL désormais configurée avec le secret live. Conserver un environnement d’essai distinct pour poursuivre les tests.

**Aucun nouvel APK nécessaire pour changer seulement les clés Stripe.** Firebase et l’application restent les mêmes. Acheter un domaine n’est pas obligatoire pour utiliser Stripe live. [Passage en réel Stripe](https://docs.stripe.com/get-started/checklist/go-live).

## 5. Ajouter un nom de domaine

Exemple fictif : `restaurant-exemple.fr`. Il ne désigne pas un domaine acheté ou configuré.

1. Acheter le domaine au nom du propriétaire du restaurant, puis ouvrir **Vercel → dailychicken → Settings → Domains → Add Domain**.
2. Ajouter le domaine principal et, si souhaité, `www.restaurant-exemple.fr`. Choisir une seule adresse principale et rediriger l’autre vers elle.
3. Chez le vendeur du domaine, recopier **exactement les enregistrements DNS affichés par Vercel pour ce projet**. Ne pas utiliser une IP ou un CNAME trouvé dans un vieux tutoriel. Attendre la validation du domaine et l’activation HTTPS. [Ajout d’un domaine Vercel](https://vercel.com/docs/domains/working-with-domains/add-a-domain).
4. Dans Vercel Production, modifier :

```dotenv
PUBLIC_BASE_URL=https://restaurant-exemple.fr
```

Sans slash final. Cette valeur sert aux retours Stripe après paiement et au contrôle de l’origine des requêtes du site. Le navigateur doit arriver sur cette adresse canonique avant de commander, sinon le contrôle d’origine peut refuser la commande.
5. Mettre la même `PUBLIC_BASE_URL` dans le `.env` local afin que les prochains APK utilisent ce domaine.
6. Dans Stripe live, modifier l’adresse de destination du webhook vers :

```text
https://restaurant-exemple.fr/api/stripe/webhook
```

Une modification de l’URL de la destination existante peut conserver son secret : vérifier le secret affiché. Une nouvelle destination possède son propre secret ; actualiser alors `STRIPE_WEBHOOK_SECRET` dans Vercel. Utiliser directement l’URL finale du webhook, sans redirection. Les clés API Stripe ne changent pas simplement parce que le domaine change. [Stripe](https://docs.stripe.com/webhooks).
7. Redéployer sur Vercel, puis vérifier le site, `/api/public-config` et la réception des événements Stripe.
8. Reconstruire et installer l’APK pour qu’il utilise l’adresse définitive :

```powershell
npm run mobile:apk
```

L’APK est créé dans `mobile/build/app/outputs/flutter-apk/app-release.apk`. Le script transforme `PUBLIC_BASE_URL` du `.env` local en `DAILY_API_BASE_URL` intégrée à l’application. Modifier seulement Vercel ne modifie pas un APK déjà installé. L’ancien APK peut continuer si son ancienne URL API reste accessible sans redirection problématique ; conserver ce point d’accès jusqu’à la mise à jour des appareils. Réutiliser la même clé de signature et installer la mise à jour par-dessus la version release pour préserver l’historique local.
9. Garder le projet Firebase actuel : aucune migration de Firestore, aucune nouvelle clé Admin et aucun nouveau `google-services.json` n’est nécessaire pour un simple changement de domaine. Pour une version Web connectée du tableau de bord ou des liens d’authentification, ajouter le domaine dans Firebase Authentication → Settings → Authorized domains. L’APK Android actuel utilise e-mail/mot de passe ; il ne dépend pas de l’ajout du domaine Web pour cette connexion. Ne pas remplacer automatiquement `FIREBASE_AUTH_DOMAIN` par le nouveau domaine : conserver le domaine Firebase existant sauf configuration spécifique du gestionnaire d’authentification. [Firebase](https://firebase.google.com/docs/auth/faq-and-troubleshooting).
10. Acheter le domaine du site ne crée pas une boîte `contact@restaurant-exemple.fr`. Pour garder Gmail, rien ne change côté SMTP. Pour cette adresse personnalisée, souscrire/configurer la boîte chez son fournisseur, puis adapter `SMTP_HOST`, `SMTP_PORT`, `SMTP_EMAIL`, `SMTP_APP_PASSWORD` et `ORDER_EMAIL_REPLY_TO` selon ses instructions.

## 6. Résumé des changements

| Changement | À modifier | Redéployer Vercel | Nouvel APK |
| --- | --- | --- | --- |
| Stripe test → réel | Clé serveur live + secret du webhook live | Oui | Non si l’URL API reste identique |
| Gmail expéditeur | `SMTP_EMAIL`, `SMTP_APP_PASSWORD`, éventuellement `ORDER_EMAIL_REPLY_TO` | Oui | Non |
| Nouveau compte responsable | Utilisateur Firebase + rôle `dailyAdmin` via `admin:setup` | Non | Non dans le même projet Firebase |
| Nouveau domaine | DNS, `PUBLIC_BASE_URL`, URL webhook, secret si nouvelle destination | Oui | Oui pour intégrer la nouvelle URL API |
| Changer de projet Firebase | Configurations Firebase serveur + mobile, règles, utilisateur responsable | Oui | Oui ; migration des données à prévoir |

Pour une remise complète, le propriétaire doit aussi disposer des accès de gestion au projet Vercel, au projet Firebase, au domaine et au compte Stripe. Changer le Gmail SMTP ne transfère pas la propriété de ces services. Les secrets et la clé de signature Android se transmettent par un moyen privé, jamais dans les fichiers publics du site.

## 7. Corrections livrées avec l’APK 1.1.1

- Filtres de l’application : texte vert sur blanc lorsqu’ils sont inactifs, blanc sur vert lorsqu’ils sont sélectionnés.
- Position client : tentative GPS puis tentative réseau, message utile en cas de refus, conservation d’une adresse saisie et adresse proposée en France via l’IGN lorsque Google n’est pas disponible. Le GPS exige l’autorisation du navigateur et HTTPS. La saisie manuelle reste possible. [Service IGN](https://cartes.gouv.fr/aide/fr/guides-utilisateur/utiliser-les-services-de-la-geoplateforme/geocodage/).
- Horaires : ouvert de 11 h inclus à 1 h exclu, chaque jour, fuseau Europe/Paris (été/hiver). Hors ouverture, le client voit un avertissement et choisit s’il transmet sa commande pour la réouverture. La commande reste autorisée après cet avertissement ; son statut de paiement dépend toujours de Stripe. Le serveur conserve le fait qu’elle a été passée hors ouverture.
- Ces corrections du site et de l’API nécessitent un redéploiement Vercel ; le correctif des filtres nécessite l’installation de l’APK 1.1.1.

## Pages À propos et Contact

Les nouvelles pages sont `/about.html` et `/contact.html`. Elles sont incluses dans la préparation Vercel. La FAQ se trouve aussi sur l’accueil.

Le formulaire de contact utilise le même Gmail et mot de passe d’application que les e-mails de commandes (`SMTP_EMAIL`, `SMTP_APP_PASSWORD`). Les messages arrivent par défaut sur `SMTP_EMAIL`. Pour les recevoir ailleurs, ajoutez `CONTACT_EMAIL` dans les variables Vercel, puis redéployez. Le bouton Répondre dans votre messagerie répond au visiteur. Aucun mot de passe ni adresse de destination privée n’est exposé dans le formulaire.

Les photos de la page À propos proviennent de la fiche Google Maps du restaurant, avec leur auteur et date. Il s’agit de photos d’archives de 2017–2018. La visite à 360° intégrée a été publiée en juin 2026. Ces médias restent hébergés par Google ; si une photo n’est plus disponible, le lien vers la fiche reste accessible.

Les boutons Instagram et Facebook permettent de partager Daily. Aucun compte officiel non vérifié n’a été ajouté.
