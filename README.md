# LÉON ACADÉMIE

Application web d’entraînement **intensif** à l’anglais pour francophones qui comprennent déjà un peu l’anglais mais manquent de fluidité.
Parcours de **14 jours** (+ **10 jours facultatifs** personnalisés), adaptatif, avec exercices corrigés et expliqués en français, vocabulaire en répétition espacée, oral, conversation et suivi des progrès.

> **Honnêteté pédagogique** : aucune application ne garantit un niveau bilingue en 14 ou 24 jours. LÉON ACADÉMIE mesure vos progrès réels et présente les niveaux (A1 → C1) comme des **estimations pédagogiques**, jamais comme une certification officielle.

Elle fonctionne **gratuitement, sans compte et sans clé API**. Les fonctions avancées (professeur IA, comptes, groupes entre amis) sont **facultatives** et s’activent par configuration.

---

## Sommaire

1. [Ce qui fonctionne tout de suite](#1-ce-qui-fonctionne-tout-de-suite)
2. [Ce qui nécessite une configuration](#2-ce-qui-nécessite-une-configuration)
3. [Installation (débutant)](#3-installation-débutant)
4. [Utiliser l’application](#4-utiliser-lapplication)
5. [Activer le professeur IA](#5-activer-le-professeur-ia-facultatif)
6. [Activer les comptes et la sauvegarde en ligne (Supabase)](#6-activer-les-comptes-et-la-sauvegarde-en-ligne-supabase-facultatif)
7. [Mettre l’application en ligne](#7-mettre-lapplication-en-ligne)
8. [Architecture du projet](#8-architecture-du-projet)
9. [Fichiers de configuration](#9-fichiers-de-configuration)
10. [Tests](#10-tests)
11. [Confidentialité et sécurité](#11-confidentialité-et-sécurité)
12. [Limites connues](#12-limites-connues)
13. [Ajouter ou modifier du contenu](#13-ajouter-ou-modifier-du-contenu)

---

## 1. Ce qui fonctionne tout de suite

Sans aucune configuration (mode local gratuit) :

| Fonction | Détail |
|---|---|
| **Accueil, premier lancement** | Profil (objectif, temps disponible 30 min → 4 h, difficultés, préférences, thèmes). |
| **Test de positionnement** | 23 exercices progressifs : vocabulaire, grammaire, compréhension écrite et orale, construction de phrases, expression écrite, expression orale (si le navigateur le permet). Score par compétence. |
| **Parcours de 14 jours** | 14 jours de contenu original (leçons, ~200 mots, dialogues, écoute, traduction, oral, écriture, test de validation). Le jour suivant se débloque après le test du jour ; sous 70 %, une consolidation ciblée est proposée **sans bloquer**. |
| **Bilan intermédiaire (jour 7) et évaluation finale (jour 14)** | Évaluation finale **équivalente** au test initial (même structure, contenus différents) + rapport détaillé : progrès, compétences renforcées, difficultés persistantes, objectif atteint ou non, recommandations. |
| **Extension de 10 jours (jours 15 → 24)** | Proposée si les résultats le justifient (compétences < 70 %, notions fragiles, erreurs récurrentes). Contenu nouveau + révisions ciblées construites à partir de **vos** erreurs. Évaluation complémentaire au jour 24. Jamais bloqué ensuite : entraînement libre illimité. |
| **9 types d’exercices** | QCM, texte à trous, traduction, remise en ordre, conjugaison, compréhension orale, dictée, oral (répétition / réponse libre), rédaction. |
| **Corrections utiles** | Bonne réponse, explication en français, exemple supplémentaire, nouvelle tentative. Variantes correctes acceptées (contractions, orthographe UK/US, alternatives prévues), fautes de frappe tolérées **sans** confondre une faute de grammaire (work/works) avec une faute de frappe. Distinction : erreur de grammaire / de vocabulaire / formulation peu naturelle / problème de compréhension. |
| **Adaptation réelle** | Niveau d’accompagnement (soutien / standard / défi) calculé sur vos 30 dernières réponses ; exercices plus simples + remédiation en soutien, exercices exigeants en défi ; indices automatiques ; **réexplication** d’une notion après 2 erreurs sur cette notion. Les tests ne sont jamais modifiés (comparabilité). |
| **Immersion progressive** | Consignes en français au début, puis bilingues, puis en anglais avec « Aide en français » à la demande. |
| **Vocabulaire et répétition espacée** | 273 fiches (mot, traduction, exemple, contexte, prononciation API, audio, niveau, statut). Statuts : nouveau / en cours / fragile / maîtrisé (≥ 3 réussites consécutives et intervalle ≥ 7 jours). Recherche, filtres, révision d’une sélection, cartes ou saisie. |
| **Erreurs à corriger** | Chaque erreur revient jusqu’à 2 bonnes réponses consécutives. |
| **Sessions courtes et longues** | Session express (~15 min), révision ciblée, session longue (jour en cours). **Reprise** d’une session interrompue. |
| **Fonctions vocales** | Écoute (synthèse vocale du navigateur, accent US/UK, vitesse, mode lent), dialogues lus en entier, reconnaissance vocale (Chrome, Edge, Safari ; détection de compatibilité et messages adaptés à chaque appareil), diagnostic vocal intégré, transcription, comparaison au modèle, **s’enregistrer et se réécouter** (audio gardé en mémoire uniquement). |
| **Salle de conversation (partenaire local)** | 6 modes (guidé, conversation, immersion, correction, situation réelle, révision), 12 scénarios préparés, correcteur local de 47 règles d’erreurs fréquentes des francophones. **Clairement indiqué comme n’étant pas une IA.** |
| **Tableau de bord** | Jour en cours, objectifs, temps du jour (temps **actif** uniquement), vocabulaire révisé, compétences, erreurs, progression, prochain exercice recommandé, objectif quotidien modifiable. |
| **Statistiques** | Graphiques (XP, minutes, bonnes réponses), précision par compétence, vocabulaire, comparaison des évaluations, maîtrise des notions, badges. Vue tableau accessible pour chaque graphique. |
| **Récompenses** | XP gagnés **uniquement** en réussissant (pas de récompense du simple temps passé), séries de jours avec apprentissage réel, 16 badges, défis personnels. |
| **Notifications internes** | Mots à réviser, erreurs, série, jour en cours, badges, synchronisation. |
| **Application installable et hors ligne (PWA)** | Après une première visite, tout le contenu, les exercices, les révisions et les statistiques fonctionnent **sans Internet**. |
| **Données** | Sauvegarde locale automatique, export / import (transfert sans compte), sauvegardes automatiques, réinitialisation, suppression totale. |
| **Thèmes et accessibilité** | Sombre (futuriste) / clair / système, réduction des animations, navigation clavier, contrastes, responsive téléphone / tablette / ordinateur. |

## 2. Ce qui nécessite une configuration

| Fonction | Ce qu’il faut | Coût |
|---|---|---|
| **Professeur IA** (conversation libre, corrections détaillées des textes) | Un fournisseur de modèle compatible « OpenAI chat completions » (voir §5) | Gratuit possible (Ollama en local, ou offres gratuites **avec quotas** de Groq / Google Gemini – à vérifier) |
| **Comptes, connexion, mot de passe oublié** | Un projet Supabase (§6) | Offre gratuite Supabase (quotas, mise en pause après 7 jours d’inactivité) |
| **Sauvegarde automatique en ligne et synchronisation entre appareils** (fusion sans perte en cas de conflit) | Supabase | idem |
| **Groupes, invitations, classements, défis entre amis** | Supabase | idem |
| **Suppression du compte** | Supabase + fonction `delete-account` déployée | idem |

Tant que ces services ne sont pas configurés, l’application l’indique clairement et propose une solution de remplacement (partenaire local, export/import, défis personnels).

---

## 3. Installation (débutant)

### Prérequis

- **Node.js 20 ou plus récent** : téléchargez la version « LTS » sur <https://nodejs.org> et installez-la (suivant, suivant…).
- Un terminal : « Terminal » sur Mac, « PowerShell » sur Windows.

Vérifiez l’installation :

```bash
node -v    # doit afficher v20 ou plus
npm -v
```

### Installer et lancer

Dans le terminal, placez-vous dans le dossier du projet, puis :

```bash
npm install        # installe les dépendances (une seule fois)
npm run dev        # lance l'application en mode développement
```

Ouvrez l’adresse affichée (en général <http://localhost:5173>). C’est tout : l’application fonctionne en mode local gratuit.

### Autres commandes

| Commande | Rôle |
|---|---|
| `npm run dev` | Lance l’application en développement (rechargement automatique). |
| `npm test` | Lance les tests automatisés (logique, contenu, sécurité de la base). |
| `npm run build` | Vérifie le code (TypeScript) et crée la version de production dans `dist/`. |
| `npm run preview` | Affiche la version de production localement (utile pour tester le mode hors ligne). |
| `npm run typecheck` | Vérifie seulement les types TypeScript. |

> 💡 Le mode hors ligne (service worker) n’est actif que sur la version de production (`npm run build` puis `npm run preview`, ou une fois en ligne).

---

## 4. Utiliser l’application

1. **Première ouverture** : répondez aux 5 questions de profil, puis passez le test de positionnement (~25 min, interruptible).
2. **Chaque jour** : suivez la « prochaine étape recommandée » du tableau de bord. Une journée = leçon → vocabulaire → pratique → dialogue → écoute → traduction → oral → écriture → test.
3. **Révisez** vos mots dans « Révision » (5–10 min par jour) et corrigez vos erreurs.
4. **Parlez** dans la salle de conversation, à voix haute si votre navigateur le permet.
5. **Jour 14** : évaluation finale et rapport ; extension proposée si utile.

**Installer sur téléphone** : ouvrez le site (une fois en ligne, voir §7) dans Chrome (Android) → menu ⋮ → « Installer l’application » ; sur iPhone, Safari → bouton Partager → « Sur l’écran d’accueil ».

**Oral** : le micro n’est demandé qu’au moment où vous appuyez sur « Parler ». Quand la reconnaissance vocale n’est pas disponible, l’application l’explique et propose la réponse écrite ou l’auto-évaluation.

| Appareil / navigateur | Lecture à voix haute | Reconnaissance vocale |
| --- | --- | --- |
| Ordinateur : Chrome, Edge | ✅ | ✅ (transcription par Google, Internet nécessaire) |
| Ordinateur : Safari (Mac) | ✅ | ✅ (transcription par Apple) |
| Ordinateur : Firefox | ✅ | ❌ (réponse écrite proposée) |
| iPad / iPhone : **Safari** | ✅ (après un premier toucher) | ✅ si la **Dictée** est activée (Réglages › Général › Clavier) |
| iPad / iPhone : Chrome, Firefox, Edge… | ✅ | ❌ sur la plupart des versions : ouvrir dans Safari |
| Android : Chrome | ✅ | ✅ (services vocaux Google nécessaires) |
| Android : Samsung Internet | ✅ | ⚠️ peu fiable : préférer Chrome |
| Navigateurs intégrés (Facebook, Instagram, Messenger, TikTok…) | variable | ❌ le plus souvent : ouvrir dans Chrome ou Safari |

Ce tableau résume la documentation des navigateurs et les comportements gérés par l’application ; il n’a pas été vérifié sur chaque appareil réel. En cas de problème : **Paramètres › Voix et audio › Diagnostic vocal** affiche ce que l’appareil permet, teste la lecture, la reconnaissance et le micro, et produit un rapport à copier.

---

## 5. Activer le professeur IA (facultatif)

Le navigateur n’a **jamais** accès à la clé : il appelle un petit serveur (le serveur de développement Vite en local, ou une fonction Supabase en ligne) qui contacte le fournisseur. Le serveur construit lui-même les instructions du professeur, valide les requêtes et limite le nombre d’appels.

### Choisir un fournisseur

| Option | Coût | Remarques |
|---|---|---|
| **Ollama** (sur votre ordinateur) | 100 % gratuit, open source | Installez <https://ollama.com>, puis `ollama pull llama3.2`. Fonctionne seulement sur l’ordinateur où il est installé. Qualité correcte, nécessite un ordinateur assez puissant. |
| **Groq** | Offre gratuite avec quotas (requêtes et jetons par minute/jour) | Vérifiez les limites dans la console Groq. Créer une clé sur console.groq.com. |
| **Google Gemini** | Offre gratuite avec quotas (modèles « Flash ») | Les données de l’offre gratuite peuvent être utilisées pour améliorer les produits Google. Clé sur aistudio.google.com. |
| Autres (Mistral, OpenRouter…) | Variable | Doit proposer une API compatible OpenAI. |

> ⚠️ Les conditions et quotas des offres gratuites changent souvent : vérifiez-les avant de les utiliser. Un abonnement à un outil (ChatGPT Plus, Claude Pro…) **n’inclut pas** l’accès à l’API. Les API payantes (dont celle d’Anthropic pour les modèles Claude) ne sont pas gratuites : ne les activez qu’en connaissance de cause.

### En local (développement)

1. Copiez le fichier d’exemple : `cp .env.example .env` (Windows : copiez-collez le fichier et renommez-le `.env`).
2. Remplissez dans `.env` :
   ```bash
   AI_BASE_URL=http://localhost:11434/v1   # exemple Ollama
   AI_MODEL=llama3.2
   AI_API_KEY=                              # vide pour Ollama, votre clé sinon
   ```
3. Relancez `npm run dev`. La salle de conversation affiche « Professeur IA connecté ».

### En ligne (production)

Le professeur IA en ligne passe par la fonction Supabase `teacher` (réservée aux utilisateurs connectés, avec quota quotidien par utilisateur). Suivez d’abord le §6.

**Sans ligne de commande (depuis un téléphone)** : la fonction `teacher` est déclarée dans `supabase/config.toml` ; si l’intégration GitHub de Supabase est activée (« Deploy to production »), elle est déployée automatiquement. Il reste à saisir les secrets dans le tableau de bord Supabase : **Edge Functions → Secrets** (ou Project Settings → Edge Functions) → ajoutez `AI_BASE_URL`, `AI_MODEL`, `AI_API_KEY` (et facultativement `AI_DAILY_LIMIT`). Les secrets restent côté serveur : ne les mettez jamais dans Vercel ni dans le code.

**Avec la CLI** :

```bash
npx supabase secrets set AI_BASE_URL=https://api.groq.com/openai/v1 AI_MODEL=nom-du-modele AI_API_KEY=votre-cle AI_DAILY_LIMIT=50
npx supabase functions deploy teacher
```

Optionnel : `npx supabase secrets set ALLOWED_ORIGIN=https://votre-site.exemple` pour n’autoriser que votre site.

### Comment se déroule une conversation avec le professeur IA

- **Léon lance la discussion** sur le sujet choisi (ou un sujet « surprise »), puis réagit à ce que dit l’apprenant, rebondit sur ses détails et pose **une** question de suivi à la fois. Il peut changer de sujet quand la discussion s’essouffle et se souvient du contexte (les 14 derniers messages, plus un résumé des réponses plus anciennes).
- **Niveau** : le niveau de la dernière évaluation passée sert de point de départ ; Léon simplifie ou enrichit selon les réponses. Une **observation de niveau indicative** (jamais officielle) s’affiche au fil de la conversation.
- **Corrections** : seulement les erreurs importantes ou récurrentes du dernier message (2 au maximum), avec une explication courte en français et une version correcte ; rien n’est inventé quand la phrase est juste ; la réponse poursuit toujours la conversation.
- **Fiabilité** : délai maximal (45 s côté navigateur, 30 s côté serveur), nouvelle tentative automatique en cas d’erreur temporaire du fournisseur, repli si le modèle n’accepte pas le format JSON, message d’erreur clair et bouton **Réessayer** qui ne duplique jamais le message de l’apprenant.
- **Sécurité** : les consignes du professeur sont construites côté serveur ; les messages de l’apprenant ne peuvent pas les remplacer ; la clé reste un secret serveur. Les journaux techniques (codes d’erreur, durées) ne contiennent jamais le contenu des conversations.

Sans professeur IA configuré, la salle de conversation utilise le **partenaire local** (scénarios préparés et correcteur à règles, clairement présenté comme n’étant pas une IA). Il relance désormais toujours la discussion, mais il ne *comprend* pas les réponses : une conversation vraiment naturelle nécessite le professeur IA.

---

## 6. Activer les comptes et la sauvegarde en ligne (Supabase, facultatif)

Supabase fournit l’authentification (e-mail + mot de passe) et la base de données. Son **offre gratuite** suffit pour un usage personnel ou un petit groupe (quotas ; un projet inactif 7 jours est mis en pause et se réactive depuis le tableau de bord). Vérifiez les conditions actuelles sur supabase.com/pricing.

### Ce que vous obtenez

- **Inscription** (e-mail, mot de passe, confirmation), **connexion**, **déconnexion**, **mot de passe oublié** par e-mail, page **Mon compte** (e-mail, état de la sauvegarde, changement de mot de passe, suppression).
- **Sauvegarde automatique et invisible** de toute la progression (réponses, leçons, évaluations, vocabulaire, statistiques, badges, préférences…) : environ 1,5 s après chaque action (8 s au maximum en cas d’activité continue), quand l’onglet passe en arrière-plan, et un dernier envoi à la fermeture de la page.
- **Indicateur discret** en haut de l’écran : « Sauvegarde en cours… », « Progression sauvegardée », « Hors ligne — en attente », « Problème de sauvegarde — nouvelle tentative… ». Il n’affiche « sauvegardée » qu’après la **confirmation du serveur**.
- **Hors ligne / erreur réseau** : les modifications restent sur l’appareil et sont renvoyées automatiquement (nouvelles tentatives espacées de 2 s à 60 s, et dès le retour du réseau).
- **Restauration avant affichage** : à la connexion, la progression en ligne est récupérée *avant* d’afficher le tableau de bord. Si le serveur ne répond pas, l’application ne montre jamais une progression vide : elle propose de réessayer ou d’utiliser la copie de cet appareil.
- **Plusieurs appareils** : la base en ligne est la source de vérité ; si deux appareils ont modifié les données, elles sont **fusionnées** (rien n’est écrasé).
- **Protection contre l’effacement accidentel** : le serveur **refuse** de remplacer une progression existante par une progression vide (sauf « Recommencer le parcours », demandé explicitement).
- **Données utilisées sans compte** : à la première connexion, elles sont transférées dans le compte s’il est vide ; si le compte contient déjà une progression, l’application demande quoi faire (réunir les deux, recommandé, ou garder seulement le compte). Les données locales ne sont archivées qu’**après** confirmation de la sauvegarde en ligne.
- **Sécurité** : les mots de passe sont gérés par Supabase Auth (stockés hachés, jamais par l’application) ; chaque utilisateur n’accède qu’à ses propres données (politiques RLS) ; seule la clé **publique** est utilisée dans le navigateur.

### Étapes (tableau de bord Supabase)

1. Créez un compte sur <https://supabase.com> puis un **nouveau projet**.
2. **Créer les tables et la sécurité — méthode sans copier-coller (recommandée)** : **Project Settings → Integrations → GitHub** → autorisez GitHub, choisissez ce dépôt, laissez le dossier Supabase par défaut, activez **Deploy to production** avec la branche de production du dépôt. À chaque envoi sur cette branche, Supabase applique automatiquement les fichiers de `supabase/migrations` qui ne l’ont pas encore été (et déploie les fonctions déclarées dans `supabase/config.toml`).
3. **Méthode manuelle (alternative)** : **SQL Editor** → « New query » → collez `supabase/migrations/20261009000000_init.sql` → **Run**, puis faites de même avec `supabase/migrations/20261010000000_autosave.sql`. Les deux fichiers peuvent être ré-exécutés sans risque.
4. **Project Settings → API Keys** : copiez l’**URL du projet** et la clé **publique** (« publishable », qui commence par `sb_publishable_…`, ou l’ancienne clé « anon »). **Ne copiez jamais** la clé `service_role` / « secret ».
5. **Authentication → URL Configuration** :
   - **Site URL** : l’adresse de votre site, par exemple `https://votre-app.vercel.app/` ;
   - **Redirect URLs** : ajoutez `https://votre-app.vercel.app/**` (et `http://localhost:5173/**` pour le développement local). Sans cela, les liens de confirmation et de réinitialisation ne ramènent pas vers l’application.
6. **E-mails (important)** : le service d’e-mail intégré de Supabase est fortement limité (quelques e-mails par heure) et, sur les projets récents, n’envoie qu’aux adresses des membres de l’équipe du projet. Pour de vrais utilisateurs, choisissez :
   - **Option A (recommandée)** : **Authentication → Emails → SMTP Settings** et branchez un service SMTP avec offre gratuite (par exemple Brevo, environ 300 e-mails/jour ; conditions à vérifier). Les identifiants SMTP se saisissent **dans le tableau de bord Supabase**, jamais dans le code ;
   - **Option B** : désactiver la confirmation d’adresse (réglages du fournisseur **Email** : « Confirm email »). Plus simple, mais n’importe quelle adresse peut être utilisée et « Mot de passe oublié » nécessite quand même l’envoi d’e-mails.
7. Facultatif : dans les réglages du fournisseur **Email**, fixez la longueur minimale du mot de passe à 8 (l’application l’exige déjà côté formulaire).
8. Facultatif (suppression de compte depuis l’application, professeur IA) — fonctions serveur avec la CLI Supabase :
   ```bash
   npx supabase login
   npx supabase link --project-ref VOTRE_REF_PROJET
   npx supabase functions deploy delete-account
   npx supabase functions deploy teacher      # si vous activez l'IA (voir §5)
   ```

### Variables d’environnement

| Variable | Valeur | Publique ? |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | `https://VOTRE-REF.supabase.co` | Oui (visible dans le navigateur, c’est normal) |
| `VITE_SUPABASE_ANON_KEY` | clé « publishable » (`sb_publishable_…`) ou « anon » | Oui (la sécurité repose sur les règles RLS) |
| `VITE_APP_URL` (facultatif) | `https://votre-app.vercel.app/` : adresse utilisée dans les liens des e-mails | Oui |

En local : mettez-les dans `.env` (ignoré par Git). Sur Vercel : voir §7.

Les noms créés automatiquement par l’intégration Supabase ↔ Vercel sont aussi acceptés : `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` ou `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Seules l’URL et la clé publique sont utilisées ; si une clé secrète est fournie par erreur, la compilation s’arrête avec un message explicite.

### Limites à connaître

- Les liens reçus par e-mail (confirmation, réinitialisation) doivent être ouverts **dans le navigateur où la demande a été faite** (sécurité PKCE). Ouverts ailleurs, l’adresse est quand même confirmée : il suffit de se connecter.
- L’envoi de dernière seconde à la fermeture de la page est limité par les navigateurs (~60 Ko) : la sauvegarde ne repose pas dessus, les envois réguliers ont déjà eu lieu.
- Deux onglets ouverts sur le même compte fusionnent leurs modifications via le serveur ; évitez quand même de travailler dans deux onglets en même temps.

---

## 7. Mettre l’application en ligne

L’application est un site statique : après `npm run build`, il suffit d’héberger le dossier `dist/`. Les variables `VITE_*` sont intégrées **au moment du build** : après les avoir ajoutées ou modifiées, il faut **reconstruire / redéployer**. Aucune règle de redirection n’est nécessaire (navigation par `#/`).

### Vercel (déploiement relié à GitHub)

1. **Le plus simple** : reliez Supabase à Vercel par l’intégration officielle (Supabase : **Project Settings → Integrations → Vercel**, ou Vercel : onglet **Storage** / Marketplace « Supabase »). Les variables sont ajoutées automatiquement, rien à recopier. **Sinon**, Vercel → votre projet → **Settings → Environment Variables** : ajoutez `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` et, si vous voulez, `VITE_APP_URL` (cochez au moins *Production*, et *Preview* si vous testez les branches).
2. **Deployments** → dernier déploiement → **⋯ → Redeploy** (indispensable : les variables ne sont prises en compte qu’au build).
3. Vérifiez que l’adresse Vercel figure dans **Site URL** et **Redirect URLs** de Supabase (§6, étape 5). Pour les déploiements de prévisualisation, ajoutez aussi leur adresse (par exemple `https://*-votre-compte.vercel.app/**`).
4. Testez : créez un compte, confirmez l’e-mail, faites un exercice, puis connectez-vous depuis un autre appareil.

Réglages de build Vercel (détectés automatiquement) : commande `npm run build`, dossier de sortie `dist`.

### Autres hébergeurs gratuits (conditions à vérifier)

- **Netlify** : glissez-déposez le dossier `dist/` sur <https://app.netlify.com/drop>.
- **Cloudflare Pages** : « Create a project » → « Direct Upload » → dossier `dist/`.
- **GitHub Pages** : gratuit pour les dépôts publics.

> Rien n’est publié automatiquement : c’est vous qui décidez de mettre le site en ligne.

---

## 8. Architecture du projet

Technologies : **React 19 + TypeScript + Vite**, validation des données avec **Zod**, PWA avec un service worker maison, Supabase (facultatif, chargé seulement s’il est configuré), Vitest pour les tests. Aucune bibliothèque de graphiques ni de style : moins de dépendances.

```
src/
  content/            Contenu pédagogique (DONNÉES uniquement)
    schema.ts         Schémas Zod : exercices, activités, jours, fiches de vocabulaire
    builders.ts       Petites fonctions pour écrire le contenu de façon compacte
    concepts.ts       Notions de grammaire (avec rappels simplifiés pour la remédiation)
    days/day01..14    Les 14 jours du parcours + leur vocabulaire
    extension/        Jours 15 à 24
    assessments.ts    3 formes d'évaluation équivalentes (positionnement, finale, complémentaire)
    scenarios.ts      Scénarios du partenaire de conversation local
    index.ts          Assemblage, recherche, exercices de vocabulaire générés
  core/               Logique métier PURE (sans interface, testée)
    normalize.ts      Normalisation des réponses, variantes, fautes de frappe
    answerCheck.ts    Correction de tous les types d'exercices
    grammarRules.ts   Détecteur local d'erreurs fréquentes des francophones
    srs.ts            Répétition espacée
    adaptive.ts       Niveau d'accompagnement, immersion, sélection d'exercices, révisions ciblées
    progress.ts       Déblocage, séries, statistiques, recommandations
    assessment.ts     Scores d'évaluation, comparaison, conseil d'extension
    learner.ts        Enregistrement des réponses et modifications de l'état
    rewards.ts, challenges.ts, notifications.ts
    state.ts          Modèle des données sauvegardées (validé par Zod)
    merge.ts, sync.ts Fusion et plan de restauration à la connexion (testés)
    localPartner.ts   Partenaire de conversation local
  services/           Accès au monde extérieur (stockage, voix, Supabase, IA)
    storage.ts        Stockage local, un espace séparé par compte (+ « sans compte »)
    auth.ts           Inscription, connexion, mot de passe (messages en français)
    session.ts        Démarrage, restauration avant affichage, déconnexion
    autosave.ts       Sauvegarde automatique, nouvelles tentatives, hors ligne
  state/              Magasin d'état React (une seule source de vérité) et état du compte
  components/         Composants d'interface (exercices, graphiques, mise en page)
  pages/              Pages de l'application
supabase/
  migrations/         Schéma SQL + politiques RLS
  functions/          Fonctions serveur : teacher (IA), delete-account
    _shared/teacher-core.ts   Cœur du professeur IA, partagé avec le serveur de développement
tests/                Tests automatisés
public/               Manifeste PWA, service worker, icônes
```

**Principes** : contenu, logique et interface sont séparés ; toutes les statistiques proviennent des réponses réellement enregistrées ; aucune fausse réponse n’est présentée comme venant d’une IA.

---

## 9. Fichiers de configuration

| Fichier | Rôle |
|---|---|
| `package.json` | Dépendances et commandes (`npm run …`). |
| `vite.config.ts` | Configuration de Vite : serveur de développement (dont `/api/teacher`), génération de la liste hors ligne du service worker, tests. |
| `tsconfig*.json` | Configuration TypeScript (vérification stricte des types). |
| `.env.example` | Modèle des variables d’environnement (valeurs fictives). Copiez-le en `.env`. |
| `.env` | Vos valeurs réelles (**jamais** publié : ignoré par Git). |
| `public/manifest.webmanifest` | Nom, icônes et couleurs de l’application installable. |
| `public/sw.js` | Service worker (mode hors ligne). |
| `supabase/config.toml` | Configuration des fonctions Supabase. |
| `supabase/migrations/*.sql` | Création de la base et des règles de sécurité. |

---

## 10. Tests

```bash
npm test
```

Les tests vérifient notamment :

- **le contenu** : 14 + 10 jours valides, identifiants uniques, chaque réponse attendue est bien acceptée par le correcteur, aucun « piège » ne contredit une bonne réponse, évaluations équivalentes (même répartition de compétences) ;
- **la correction** : variantes, contractions, fautes de frappe vs erreurs de grammaire, pièges, oral, écriture, détecteur d’erreurs (sans fausses alertes sur des phrases correctes) ;
- **l’apprentissage** : répétition espacée (jamais « maîtrisé » après une seule réponse), enregistrement des réponses, déblocage, remédiation, séries, adaptation, évaluations, conseil d’extension, badges, défis, notifications, validation des données ;
- **la restauration à la connexion** : la base en ligne prime, jamais de remplacement par une copie vide, envoi des modifications non sauvegardées, fusion quand les deux versions ont changé, copie d’un autre compte ignorée, transfert des données sans compte, choix demandé quand les deux ont une progression ; cœur du professeur IA (validation, prompt côté serveur, limitation) ;
- **les fonctions vocales** (moteur de reconnaissance simulé) : détection iPad/iPhone, Android, navigateurs intégrés, Firefox, page non sécurisée ; comportement de Safari sans résultat « final », résultats répétés de Chrome Android, micro refusé, micro qui ne s’ouvre jamais, fin sans parole, arrêt sans événement de fin, double lancement, annulation ;
- **le mode conversation** (fournisseur d’IA simulé) : ouverture par Léon, consignes serveur (réaction au contenu, question de suivi, mémoire, corrections jamais inventées, niveau), analyse tolérante des réponses (JSON tronqué, réponse vide refusée), repli sans mode JSON, nouvelle tentative, quota épuisé, clé refusée, délai dépassé, réseau coupé, historique et mémoire envoyés au modèle ;
- **la sécurité de la base Supabase** dans une vraie base Postgres embarquée (PGlite), avec les deux migrations : isolation des données, contrôle de concurrence, refus de remplacer une progression par du vide (sauf remise à zéro volontaire), refus sans connexion, groupes réservés aux membres, statistiques masquées tant qu’elles ne sont pas partagées, quota IA, suppression des données.

Des tests de bout en bout dans un navigateur (Chromium/Playwright) ont aussi été réalisés pendant le développement ; ils ne font pas partie de `npm test` :

- parcours complet sur mobile et ordinateur, mode hors ligne (PWA), conversation avec un faux fournisseur d’IA ;
- **comptes et sauvegarde**, contre une pile locale équivalente à Supabase (vrai serveur d’authentification Supabase « GoTrue », vraie base Postgres avec RLS, boîte e-mail de test) : inscription + lien de confirmation, connexion, leçon sauvegardée en ligne, fermeture/retour, déconnexion/reconnexion, autre navigateur et mobile, second utilisateur isolé (y compris attaque directe de l’API), panne du serveur et mode avion sans perte, mot de passe oublié, fusion des données sans compte, redémarrage hors ligne, remise à zéro volontaire (24 vérifications).

---

## 11. Confidentialité et sécurité

- **Mode local** : toutes les données restent dans votre navigateur. Rien n’est envoyé ailleurs.
- **Voix** : LÉON ACADÉMIE n’enregistre ni ne conserve votre voix. La reconnaissance vocale est réalisée par le navigateur (dans **Chrome et Edge, l’audio est transmis à un service de Google**, dans Safari à Apple, pour la transcription ; l’application l’indique avant la première utilisation). La fonction « s’enregistrer » garde l’audio en mémoire uniquement.
- **Secrets** : aucune clé secrète dans le code ni dans le dépôt. La clé du modèle d’IA reste côté serveur. `.env` est ignoré par Git.
- **Base distante** : RLS sur toutes les tables ; chacun ne lit que ses données ; les membres d’un groupe ne voient que le pseudo des autres et les statistiques que chacun a choisi de partager (rien par défaut).
- **Mots de passe** : jamais stockés ni journalisés par l’application ; ils sont transmis uniquement à Supabase Auth (HTTPS), qui les stocke hachés (bcrypt).
- **Suppression** : « Paramètres » permet de supprimer ses données locales ; « Mon compte » permet de supprimer ses données en ligne ou son compte entier.

---

## 12. Limites connues

- **Prononciation** : l’application compare la **transcription** de la reconnaissance vocale au texte attendu. Une transcription correcte ne prouve pas une prononciation excellente ; il n’y a pas d’analyse phonétique fine.
- **Reconnaissance vocale** : fournie par le navigateur, donc indisponible dans Firefox, dans les navigateurs intégrés aux applications et dans la plupart des navigateurs autres que Safari sur iPad/iPhone ; nécessite Internet dans Chrome. Solution de remplacement : réponse écrite ou auto-évaluation. Une reconnaissance 100 % locale (modèle Whisper exécuté dans le navigateur) serait possible sans service payant, mais au prix d’un téléchargement d’environ 40 Mo par appareil et d’une reconnaissance plus lente sur tablette : elle n’est pas intégrée pour l’instant.
- **Correcteur local** : il repère une liste de 47 règles d’erreurs fréquentes des francophones, pas toutes les erreurs. L’expression écrite est estimée automatiquement (longueur, mots attendus, erreurs repérées) : c’est une indication, pas la note d’un correcteur humain.
- **Professeur IA** : les réponses d’un modèle peuvent contenir des erreurs ; la qualité dépend du modèle choisi ; les offres gratuites ont des quotas.
- **Classements** : ils reposent sur les progrès enregistrés par l’appareil de chaque membre ; un utilisateur techniquement averti pourrait les falsifier (pas de correction côté serveur).
- **Supabase et fonctions Edge** : les comptes et la sauvegarde ont été testés de bout en bout contre le vrai serveur d’authentification de Supabase et une vraie base Postgres en local ; en revanche, un **vrai projet Supabase hébergé** (envoi réel d’e-mails, réglages du tableau de bord) et les fonctions Edge (suppression de compte, IA) n’ont pas pu être testés ici sans compte : faites l’essai décrit au §7 après configuration.
- **Voix de synthèse** : leur qualité dépend de votre appareil (les voix « naturelles » d’Edge, Chrome ou Safari sont les meilleures).
- **Stockage local** : effacer les données du navigateur efface la progression locale ; exportez-la régulièrement ou utilisez un compte.

---

## 13. Ajouter ou modifier du contenu

Le contenu est dans `src/content/days/`. Exemple d’exercice dans une activité :

```ts
gap('present-simple', 1, 'She ___ to work by bus.', ['goes'], 'go → goes à la 3e personne.', {
  traps: [trap('go', 'grammar', 'N’oubliez pas le -es : she goes.')],
}),
```

- Ajoutez les nouveaux exercices **à la fin** d’une activité (les identifiants sont attribués selon l’ordre).
- Syntaxe des réponses acceptées : `{a|b}` = alternative, `[mot]` = facultatif. Exemple : `"I{'m| am} [really] tired"`.
- Lancez `npm test` : il vérifie automatiquement que chaque réponse attendue est acceptée et que le contenu est valide.
