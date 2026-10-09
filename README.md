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
6. [Activer les comptes et l’espace social (Supabase)](#6-activer-les-comptes-et-lespace-social-supabase-facultatif)
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
| **Fonctions vocales** | Écoute (synthèse vocale du navigateur, accent US/UK, vitesse, mode lent), dialogues lus en entier, reconnaissance vocale (Chrome, Edge, Safari), transcription, comparaison au modèle, **s’enregistrer et se réécouter** (audio gardé en mémoire uniquement). |
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
| **Synchronisation entre appareils** (avec fusion sans perte en cas de conflit) | Supabase | idem |
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

**Oral** : la reconnaissance vocale fonctionne dans Chrome, Edge et Safari (pas dans Firefox). Le micro n’est demandé qu’au moment où vous appuyez sur « Parler ». Sinon : réponse écrite ou auto-évaluation.

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

Le professeur IA en ligne passe par la fonction Supabase `teacher` (réservée aux utilisateurs connectés, avec quota quotidien par utilisateur). Suivez d’abord le §6, puis :

```bash
npx supabase secrets set AI_BASE_URL=https://api.groq.com/openai/v1 AI_MODEL=nom-du-modele AI_API_KEY=votre-cle AI_DAILY_LIMIT=50
npx supabase functions deploy teacher
```

Optionnel : `npx supabase secrets set ALLOWED_ORIGIN=https://votre-site.exemple` pour n’autoriser que votre site.

---

## 6. Activer les comptes et l’espace social (Supabase, facultatif)

Supabase est un service de base de données avec authentification. Son **offre gratuite** suffit pour un petit groupe d’amis (quotas ; un projet inactif 7 jours est mis en pause et se réactive depuis le tableau de bord). Vérifiez les conditions actuelles sur supabase.com/pricing.

### Étapes

1. Créez un compte sur <https://supabase.com> puis un **nouveau projet** (notez le mot de passe de la base).
2. Dans le projet : **SQL Editor** → « New query » → collez tout le contenu de `supabase/migrations/20261009000000_init.sql` → **Run**. Cela crée les tables, les politiques de sécurité (RLS) et les fonctions.
3. **Project Settings → API** : copiez « Project URL » et la clé « anon public ».
4. Dans votre fichier `.env` :
   ```bash
   VITE_SUPABASE_URL=https://votre-projet.supabase.co
   VITE_SUPABASE_ANON_KEY=votre-cle-anon-publique
   ```
   (Ces deux valeurs sont publiques par conception. Ne mettez **jamais** la clé `service_role` dans `.env` ni dans le code.)
5. **Authentication → URL Configuration** : indiquez l’adresse de votre site (« Site URL ») pour les e-mails de confirmation et de réinitialisation.
6. Déployez les fonctions serveur (suppression de compte et, si vous le souhaitez, professeur IA) avec la CLI Supabase :
   ```bash
   npx supabase login
   npx supabase link --project-ref VOTRE_REF_PROJET
   npx supabase functions deploy delete-account
   npx supabase functions deploy teacher      # si vous activez l'IA (voir §5)
   ```
7. Relancez l’application : « Paramètres › Compte » permet de créer un compte et de se connecter ; « Social » permet de créer un groupe et d’inviter des amis avec un code.

### Ce que fait la synchronisation

- À la connexion, au retour en ligne et quelques secondes après chaque modification, la progression est envoyée avec un **contrôle de version**.
- Si deux appareils ont modifié les données, elles sont **fusionnées** (historiques réunis, meilleurs scores et cartes les plus récentes conservés). Les deux versions d’origine sont gardées dans « Paramètres › Sauvegardes » et une notification vous prévient. Rien n’est écrasé silencieusement.

---

## 7. Mettre l’application en ligne

L’application est un site statique : après `npm run build`, il suffit d’héberger le dossier `dist/`. Hébergeurs avec offre gratuite (conditions à vérifier) :

- **Netlify** : créez un compte, puis glissez-déposez le dossier `dist/` sur <https://app.netlify.com/drop>.
- **Cloudflare Pages** : « Create a project » → « Direct Upload » → dossier `dist/`.
- **GitHub Pages** : gratuit pour les dépôts publics.

Les variables `VITE_*` sont intégrées au moment du `npm run build` : remplissez `.env` **avant** de construire. Aucune règle de redirection n’est nécessaire (navigation par `#/`).

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
    merge.ts, sync.ts Fusion et décisions de synchronisation
    localPartner.ts   Partenaire de conversation local
  services/           Accès au monde extérieur (stockage, voix, Supabase, IA)
  state/              Magasin d'état React (une seule source de vérité)
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
- **la synchronisation** : envoi, récupération, fusion sans perte, cœur du professeur IA (validation, prompt côté serveur, limitation) ;
- **la sécurité de la base Supabase** dans une vraie base Postgres embarquée (PGlite) : isolation des données, contrôle de concurrence, groupes réservés aux membres, statistiques masquées tant qu’elles ne sont pas partagées, quota IA, suppression des données.

Des tests de bout en bout dans un navigateur (Chromium) ont aussi été réalisés pendant le développement (parcours complet sur mobile et ordinateur, mode hors ligne, conversation avec un faux fournisseur d’IA) ; ils ne font pas partie de `npm test`.

---

## 11. Confidentialité et sécurité

- **Mode local** : toutes les données restent dans votre navigateur. Rien n’est envoyé ailleurs.
- **Voix** : LÉON ACADÉMIE n’enregistre ni ne conserve votre voix. La reconnaissance vocale est réalisée par le navigateur (dans **Chrome, l’audio est transmis à un service de Google** pour la transcription ; l’application l’indique avant la première utilisation). La fonction « s’enregistrer » garde l’audio en mémoire uniquement.
- **Secrets** : aucune clé secrète dans le code ni dans le dépôt. La clé du modèle d’IA reste côté serveur. `.env` est ignoré par Git.
- **Base distante** : RLS sur toutes les tables ; chacun ne lit que ses données ; les membres d’un groupe ne voient que le pseudo des autres et les statistiques que chacun a choisi de partager (rien par défaut).
- **Suppression** : « Paramètres » permet de supprimer ses données locales, ses données en ligne, ou son compte entier.

---

## 12. Limites connues

- **Prononciation** : l’application compare la **transcription** de la reconnaissance vocale au texte attendu. Une transcription correcte ne prouve pas une prononciation excellente ; il n’y a pas d’analyse phonétique fine.
- **Reconnaissance vocale** : indisponible dans Firefox ; nécessite Internet dans Chrome. Solution de remplacement : réponse écrite ou auto-évaluation.
- **Correcteur local** : il repère une liste de 47 règles d’erreurs fréquentes des francophones, pas toutes les erreurs. L’expression écrite est estimée automatiquement (longueur, mots attendus, erreurs repérées) : c’est une indication, pas la note d’un correcteur humain.
- **Professeur IA** : les réponses d’un modèle peuvent contenir des erreurs ; la qualité dépend du modèle choisi ; les offres gratuites ont des quotas.
- **Classements** : ils reposent sur les progrès enregistrés par l’appareil de chaque membre ; un utilisateur techniquement averti pourrait les falsifier (pas de correction côté serveur).
- **Supabase et fonctions Edge** : le schéma SQL et ses règles de sécurité sont testés automatiquement (PGlite) et le chemin du professeur IA a été testé avec le serveur de développement ; en revanche, les fonctions Edge et la connexion à un vrai projet Supabase n’ont pas pu être testées ici sans compte : faites un essai après configuration.
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
