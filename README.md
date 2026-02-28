# VIVE — Application Mobile

> **VIVE** est une application mobile premium de santé et bien-être, construite avec React Native en bare workflow. Elle centralise vos données de santé (HealthKit sur iOS, Health Connect sur Android), offre un coaching intelligent via Jarvis, un système de gamification et gère les abonnements via RevenueCat.

---

## Table des matières

1. [Stack technique](#stack-technique)
2. [Palette de couleurs](#palette-de-couleurs)
3. [Prérequis](#prérequis)
4. [Installation](#installation)
5. [Variables d'environnement](#variables-denvironnement)
6. [Lancer l'application](#lancer-lapplication)
7. [Architecture du projet](#architecture-du-projet)
8. [Configuration HealthKit (iOS)](#configuration-healthkit-ios)
9. [Configuration Health Connect (Android)](#configuration-health-connect-android)
10. [Configuration Supabase](#configuration-supabase)
11. [Configuration RevenueCat](#configuration-revenuecat)
12. [Contribution](#contribution)

---

## Stack technique

| Technologie | Version | Rôle |
|---|---|---|
| **React Native** | 0.73 (bare workflow) | Framework mobile cross-platform |
| **TypeScript** | 5.x | Typage statique |
| **NativeWind** | 4.x | Tailwind CSS adapté React Native |
| **Zustand** | 4.x | Gestion d'état global léger |
| **React Query** (TanStack) | 5.x | Cache & synchronisation des données serveur |
| **Supabase JS** | 2.x | Backend as a Service (BDD, Auth, Realtime) |
| **RevenueCat** | 7.x | Gestion des abonnements & achats in-app |
| **react-native-health** | — | Accès à HealthKit sur iOS |
| **react-native-health-connect** | — | Accès à Health Connect sur Android |

---

## Palette de couleurs

L'application utilise une palette sombre et premium définie comme suit :

```
┌─────────────────────────────────────────────────────┐
│  Rôle        │  Nom       │  Valeur hex             │
├─────────────────────────────────────────────────────┤
│  Fond        │  Noir      │  #080810                │
│  Surface     │  Surface   │  #111118                │
│  Carte       │  Card      │  #1C1C28                │
│  Texte 1     │  Platine   │  #E8E8F0                │
│  Texte 2     │  Argent    │  #A8A8C0                │
│  Accent      │  Bleu      │  #3D8BFF                │
└─────────────────────────────────────────────────────┘
```

Ces valeurs sont déclarées dans `tailwind.config.js` sous la clé `theme.extend.colors` et dans `src/theme/colors.ts`.

---

## Prérequis

Avant de commencer, assurez-vous que les outils suivants sont installés et configurés sur votre machine.

### Outils généraux

- **Node.js** ≥ 18 LTS — [télécharger](https://nodejs.org)
- **npm** ≥ 9 ou **Yarn** ≥ 1.22
- **Git** ≥ 2.40

### iOS

- **macOS** Ventura ou supérieur
- **Xcode** ≥ 15 avec les Command Line Tools activés
- **CocoaPods** ≥ 1.14

```bash
# Installer CocoaPods via Bundler (recommandé)
gem install cocoapods
```

### Android

- **Android Studio** Hedgehog (2023.1.1) ou supérieur
- **JDK 17** (Adoptium Temurin recommandé)
- **Android SDK** avec les éléments suivants :
  - Android SDK Platform 34
  - Android SDK Build-Tools 34
  - Android Emulator
  - Intel x86 Atom_64 System Image (ou Google Play ARM Image pour Apple Silicon)

> ⚠️ Vérifiez que les variables d'environnement `ANDROID_HOME` et `JAVA_HOME` sont correctement définies dans votre fichier `~/.zshrc` ou `~/.bashrc`.

```bash
# Exemple de configuration dans ~/.zshrc
export ANDROID_HOME=$HOME/Library/Android/sdk
export JAVA_HOME=/Library/Java/JavaVirtualMachines/temurin-17.jdk/Contents/Home
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

---

## Installation

Suivez ces étapes dans l'ordre pour configurer le projet localement.

### 1. Cloner le dépôt

```bash
git clone https://github.com/votre-organisation/vive-app.git
cd vive-app
```

### 2. Installer les dépendances JavaScript

```bash
npm install
# ou avec Yarn
yarn install
```

### 3. Configurer les variables d'environnement

```bash
cp .env.example .env
```

Ouvrez le fichier `.env` et renseignez toutes les clés requises (voir la section [Variables d'environnement](#variables-denvironnement)).

### 4. Installer les pods iOS

```bash
cd ios
pod install
cd ..
```

> 💡 Si vous rencontrez des erreurs lors de `pod install`, essayez d'abord `pod repo update` puis relancez la commande.

### 5. Générer les types TypeScript Supabase (optionnel mais recommandé)

```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/supabase.ts
```

### 6. Vérifier l'installation

```bash
npx react-native doctor
```

Corrigez les éventuels avertissements avant de continuer.

---

## Variables d'environnement

Créez un fichier `.env` à la racine du projet en vous basant sur `.env.example`. Ce fichier ne doit **jamais** être commité dans le dépôt Git (il est listé dans `.gitignore`).

```dotenv
# ─────────────────────────────────────────
# Supabase
# ─────────────────────────────────────────
# URL de votre projet Supabase
# Exemple : https://xxxxxxxxxxx.supabase.co
SUPABASE_URL=https://VOTRE_PROJECT_ID.supabase.co

# Clé publique anonyme (safe pour le client)
SUPABASE_ANON_KEY=VOTRE_SUPABASE_ANON_KEY

# ─────────────────────────────────────────
# RevenueCat
# ─────────────────────────────────────────
# Clé publique SDK pour iOS (App Store Connect)
REVENUECAT_IOS_KEY=appl_XXXXXXXXXXXXXXXXXXXX

# Clé publique SDK pour Android (Google Play)
REVENUECAT_ANDROID_KEY=goog_XXXXXXXXXXXXXXXXXXXX
```

> ⚠️ Ces clés sont **publiques côté client**. Ne jamais exposer des clés secrètes (service_role, clés privées) dans l'application mobile.

Les variables sont injectées dans l'application via le package `react-native-config` :

```typescript
// src/lib/config.ts
import Config from 'react-native-config';

export const ENV = {
  supabaseUrl: Config.SUPABASE_URL ?? '',
  supabaseAnonKey: Config.SUPABASE_ANON_KEY ?? '',
  revenueCatIosKey: Config.REVENUECAT_IOS_KEY ?? '',
  revenueCatAndroidKey: Config.REVENUECAT_ANDROID_KEY ?? '',
};
```

---

## Lancer l'application

### iOS

```bash
# Lancer sur le simulateur par défaut
npx react-native run-ios

# Lancer sur un simulateur spécifique
npx react-native run-ios --simulator="iPhone 15 Pro"

# Lancer sur un appareil physique connecté
npx react-native run-ios --device
```

> 📱 Pour tester HealthKit, un **appareil physique** iOS est obligatoire. Le simulateur ne supporte pas HealthKit.

### Android

```bash
# Démarrer un émulateur Android depuis Android Studio
# ou brancher un appareil physique avec le débogage USB activé

# Lancer sur l'émulateur / appareil connecté
npx react-native run-android

# Lancer sur un appareil spécifique
npx react-native run-android --deviceId DEVICE_ID
```

> Obtenez la liste des appareils connectés avec `adb devices`.

### Démarrer le Metro Bundler séparément

```bash
npx react-native start
# ou avec le cache réinitialisé
npx react-native start --reset-cache
```

---

## Architecture du projet

```
vive-app/
├── android/                     # Projet Android natif
│   └── app/
│       └── src/main/
│           ├── AndroidManifest.xml
│           └── res/
├── ios/                         # Projet iOS natif
│   ├── ViveApp/
│   │   ├── Info.plist
│   │   └── ViveApp.entitlements
│   └── Podfile
├── src/
│   ├── screens/                 # Écrans de l'application
│   │   ├── dashboard/           # Tableau de bord santé (métriques, résumé journalier)
│   │   │   ├── DashboardScreen.tsx
│   │   │   └── components/
│   │   ├── jarvis/              # Coach IA & chat intelligent
│   │   │   ├── JarvisScreen.tsx
│   │   │   └── components/
│   │   ├── box/                 # Programmes & contenus premium
│   │   │   ├── BoxScreen.tsx
│   │   │   └── components/
│   │   ├── gamification/        # Badges, streaks, classements
│   │   │   ├── GamificationScreen.tsx
│   │   │   └── components/
│   │   └── settings/            # Profil, abonnement, préférences
│   │       ├── SettingsScreen.tsx
│   │       └── components/
│   ├── hooks/                   # Hooks React personnalisés
│   │   ├── useHealthKit.ts      # Lecture des données HealthKit (iOS)
│   │   ├── useHealthConnect.ts  # Lecture des données Health Connect (Android)
│   │   ├── useSupabase.ts       # Requêtes & mutations Supabase
│   │   └── useRevenueCat.ts     # Abonnements, offres, état premium
│   ├── lib/                     # Clients & configurations des services tiers
│   │   ├── supabase.ts          # Initialisation du client Supabase
│   │   ├── revenuecat.ts        # Initialisation & helpers RevenueCat
│   │   ├── healthkit.ts         # Wrapper react-native-health
│   │   └── healthconnect.ts     # Wrapper react-native-health-connect
│   ├── store/                   # Stores Zustand
│   │   ├── useAuthStore.ts
│   │   ├── useHealthStore.ts
│   │   └── useSubscriptionStore.ts
│   ├── navigation/              # React Navigation (Stack, Tab)
│   │   ├── RootNavigator.tsx
│   │   ├── AppNavigator.tsx
│   │   └── AuthNavigator.tsx
│   ├── components/              # Composants UI réutilisables
│   │   ├── ui/                  # Boutons, cartes, badges…
│   │   └── health/              # Graphiques, métriques…
│   ├── types/                   # Types & interfaces TypeScript
│   │   ├── health.ts
│   │   ├── supabase.ts          # Types générés par la CLI Supabase
│   │   └── navigation.ts
│   ├── theme/                   # Design tokens
│   │   └── colors.ts
│   └── utils/                   # Fonctions utilitaires
│       ├── formatters.ts
│       └── permissions.ts
├── .env                         # Variables d'environnement (non commité)
├── .env.example                 # Modèle des variables d'environnement
├── tailwind.config.js           # Configuration NativeWind / Tailwind
├── babel.config.js
├── tsconfig.json
└── package.json
```

---

## Configuration HealthKit (iOS)

### 1. Activer la capacité HealthKit dans Xcode

1. Ouvrez `ios/ViveApp.xcworkspace` dans **Xcode**.
2. Sélectionnez votre **Target** → onglet **Signing & Capabilities**.
3. Cliquez sur **+ Capability** et ajoutez **HealthKit**.
4. Cochez **Clinical Health Records** si nécessaire.

### 2. Fichier d'entitlements

Le fichier `ios/ViveApp/ViveApp.entitlements` doit contenir :

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>com.apple.developer.healthkit</key>
    <true/>
    <key>com.apple.developer.healthkit.access</key>
    <array/>
</dict>
</plist>
```

### 3. Descriptions de permission dans Info.plist

Ajoutez les clés suivantes dans `ios/ViveApp/Info.plist` afin d'expliquer à l'utilisateur pourquoi l'application accède à ses données de santé :

```xml
<!-- Lecture des données de santé -->
<key>NSHealthShareUsageDescription</key>
<string>VIVE accède à vos données de santé pour vous fournir un tableau de bord personnalisé et des recommandations adaptées à votre profil.</string>

<!-- Écriture des données de santé -->
<key>NSHealthUpdateUsageDescription</key>
<string>VIVE peut enregistrer vos séances d'entraînement et vos activités directement dans Santé.</string>
```

### 4. Exemple d'utilisation dans l'application

```typescript
// src/lib/healthkit.ts
import AppleHealthKit, {
  HealthKitPermissions,
  HealthUnit,
} from 'react-native-health';

const PERMISSIONS: HealthKitPermissions = {
  permissions: {
    read: [
      AppleHealthKit.Constants.Permissions.Steps,
      AppleHealthKit.Constants.Permissions.HeartRate,
      AppleHealthKit.Constants.Permissions.SleepAnalysis,
      AppleHealthKit.Constants.Permissions.ActiveEnergyBurned,
      AppleHealthKit.Constants.Permissions.BodyMass,
    ],
    write: [
      AppleHealthKit.Constants.Permissions.Steps,
      AppleHealthKit.Constants.Permissions.Workout,
    ],
  },
};

export const initHealthKit = (): Promise<void> =>
  new Promise((resolve, reject) => {
    AppleHealthKit.initHealthKit(PERMISSIONS, (error) => {
      if (error) {
        reject(new Error(`HealthKit init failed: ${error}`));
        return;
      }
      resolve();
    });
  });

export const getDailySteps = (): Promise<number> =>
  new Promise((resolve, reject) => {
    const options = { date: new Date().toISOString(), includeManuallyAdded: false };
    AppleHealthKit.getStepCount(options, (error, result) => {
      if (error) { reject(error); return; }
      resolve(result.value);
    });
  });
```

---

## Configuration Health Connect (Android)

### 1. Dépendances Gradle

Dans `android/app/build.gradle`, vérifiez que le `minSdkVersion` est au minimum **26** (requis par Health Connect) :

```gradle
android {
    defaultConfig {
        minSdkVersion 26
        targetSdkVersion 34
    }
}
```

### 2. Permissions dans AndroidManifest.xml

Ajoutez les permissions Health Connect dans `android/app/src/main/AndroidManifest.xml` :

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <!-- Déclaration requise pour Health Connect -->
    <queries>
        <package android:name="com.google.android.apps.healthdata" />
    </queries>

    <!-- Permissions de lecture -->
    <uses-permission android:name="android.permission.health.READ_STEPS" />
    <uses-permission android:name="android.permission.health.READ_HEART_RATE" />
    <uses-permission android:name="android.permission.health.READ_SLEEP" />
    <uses-permission android:name="android.permission.health.READ_ACTIVE_CALORIES_BURNED" />
    <uses-permission android:name="android.permission.health.READ_WEIGHT" />

    <!-- Permissions d'écriture -->
    <uses-permission android:name="android.permission.health.WRITE_STEPS" />
    <uses-permission android:name="android.permission.health.WRITE_EXERCISE" />

    <application
        android:name=".MainApplication"
        android:label="@string/app_name"
        android:icon="@mipmap/ic_launcher"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:allowBackup="false"
        android:theme="@style/AppTheme">

        <!-- Activity de politique de confidentialité Health Connect (obligatoire) -->
        <activity-alias
            android:name="ViewPermissionUsageActivity"
            android:exported="true"
            android:targetActivity=".MainActivity"
            android:permission="android.permission.START_VIEW_PERMISSION_USAGE">
            <intent-filter>
                <action android:name="android.intent.action.VIEW_PERMISSION_USAGE" />
                <category android:name="android.intent.category.HEALTH_PERMISSIONS" />
            </intent-filter>
        </activity-alias>

    </application>

</manifest>
```

### 3. Exemple d'utilisation dans l'application

```typescript
// src/lib/healthconnect.ts
import {
  initialize,
  requestPermission,
  readRecords,
} from 'react-native-health-connect';

export const initHealthConnect = async (): Promise<boolean> => {
  const isInitialized = await initialize();
  return isInitialized;
};

export const requestHealthPermissions = async (): Promise<void> => {
  await requestPermission([
    { accessType: 'read', recordType: 'Steps' },
    { accessType: 'read', recordType: 'HeartRate' },
    { accessType: 'read', recordType: 'SleepSession' },
    { accessType: 'read', recordType: 'ActiveCaloriesBurned' },
    { accessType: 'write', recordType: 'Steps' },
  ]);
};

export const getTodaySteps = async (): Promise<number> => {
  const now = new Date();
  const startOfDay = new Date(now.setHours(0, 0, 0, 0));

  const result = await readRecords('Steps', {
    timeRangeFilter: {
      operator: 'between',
      startTime: startOfDay.toISOString(),
      endTime: new Date().toISOString(),
    },
  });

  return result.records.reduce((acc, record) => acc + record.count, 0);
};
```

---

## Configuration Supabase

### 1. Créer le projet Supabase

1. Rendez-vous sur [app.supabase.com](https://app.supabase.com) et créez un nouveau projet.
2. Notez votre **Project URL** et votre **anon public key** (disponibles dans *Project Settings → API*).
3. Renseignez ces valeurs dans votre fichier `.env`.

### 2. Initialisation du client

```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ENV } from './config';
import type { Database } from '../types/supabase';

export const supabase = createClient<Database>(
  ENV.supabaseUrl,
  ENV.supabaseAnonKey,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);
```

### 3. Tables nécessaires

Exécutez les migrations SQL suivantes depuis l'éditeur SQL de Supabase ou via la CLI.

#### Table `profiles`

```sql
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  username text unique,
  full_name text,
  avatar_url text,
  bio text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Activer Row Level Security
alter table public.profiles enable row level security;

create policy "Un utilisateur peut voir son propre profil."
  on public.profiles for select using (auth.uid() = id);

create policy "Un utilisateur peut modifier son propre profil."
  on public.profiles for update using (auth.uid() = id);
```

#### Table `health_data`

```sql
create table public.health_data (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  date date not null,
  steps integer default 0,
  heart_rate_avg integer,
  sleep_hours numeric(4, 2),
  active_calories integer default 0,
  weight_kg numeric(5, 2),
  created_at timestamp with time zone default now(),
  unique(user_id, date)
);

alter table public.health_data enable row level security;

create policy "Accès aux données de santé personnelles uniquement."
  on public.health_data for all using (auth.uid() = user_id);
```

#### Table `gamification`

```sql
create table public.gamification (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null unique,
  total_points integer default 0,
  current_streak integer default 0,
  longest_streak integer default 0,
  badges jsonb default '[]'::jsonb,
  level integer default 1,
  updated_at timestamp with time zone default now()
);

alter table public.gamification enable row level security;

create policy "Accès aux données de gamification personnelles."
  on public.gamification for all using (auth.uid() = user_id);
```

#### Table `jarvis_conversations`

```sql
create table public.jarvis_conversations (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  role text check (role in ('user', 'assistant')) not null,
  content text not null,
  created_at timestamp with time zone default now()
);

alter table public.jarvis_conversations enable row level security;

create policy "Accès aux conversations Jarvis personnelles."
  on public.jarvis_conversations for all using (auth.uid() = user_id);
```

### 4. Activer l'authentification

Dans le tableau de bord Supabase → **Authentication → Providers** :

- Activez **Email/Password**
- Configurez **Apple Sign In** (iOS) avec votre Service ID Apple
- Configurez **Google Sign In** (Android) avec votre OAuth Client ID

---

## Configuration RevenueCat

### 1. Créer le projet RevenueCat

1. Rendez-vous sur [app.revenuecat.com](https://app.revenuecat.com) et créez un nouveau projet.
2. Ajoutez une application **iOS** (App Store Connect) et une application **Android** (Google Play).
3. Récupérez les clés publiques SDK pour chaque plateforme et renseignez-les dans `.env`.

### 2. Initialisation du client

```typescript
// src/lib/revenuecat.ts
import Purchases, { LOG_LEVEL } from 'react-native-purchases';
import { Platform } from 'react-native';
import { ENV } from './config';

export const initRevenueCat = async (userId?: string): Promise<void> => {
  if (__DEV__) {
    Purchases.setLogLevel(LOG_LEVEL.DEBUG);
  }

  const apiKey = Platform.OS === 'ios'
    ? ENV.revenueCatIosKey
    : ENV.revenueCatAndroidKey;

  Purchases.configure({ apiKey });

  if (userId) {
    await Purchases.logIn(userId);
  }
};

export const getOfferings = async () => {
  const offerings = await Purchases.getOfferings();
  return offerings.current;
};

export const purchasePackage = async (packageToPurchase: any) => {
  const { customerInfo } = await Purchases.purchasePackage(packageToPurchase);
  return customerInfo;
};

export const restorePurchases = async () => {
  const customerInfo = await Purchases.restorePurchases();
  return customerInfo;
};

export const checkEntitlement = async (entitlementId: string): Promise<boolean> => {
  const customerInfo = await Purchases.getCustomerInfo();
  return entitlementId in customerInfo.entitlements.active;
};
```

### 3. Produits & droits (Entitlements)

Dans le tableau de bord RevenueCat, configurez les éléments suivants :

#### Identifiants de produits recommandés

| Plateforme | Identifiant produit | Description |
|---|---|---|
| iOS (App Store) | `vive_premium_monthly` | Abonnement mensuel |
| iOS (App Store) | `vive_premium_yearly` | Abonnement annuel |
| Android (Google Play) | `vive_premium_monthly` | Abonnement mensuel |
| Android (Google Play) | `vive_premium_yearly` | Abonnement annuel |

#### Droit (Entitlement)

Créez un entitlement nommé **`premium`** et associez-y tous les produits ci-dessus. Dans l'application, vérifiez cet entitlement pour débloquer les fonctionnalités premium :

```typescript
// src/hooks/useRevenueCat.ts
import { useQuery } from '@tanstack/react-query';
import { checkEntitlement, getOfferings } from '../lib/revenuecat';

export const useRevenueCat = () => {
  const isPremiumQuery = useQuery({
    queryKey: ['revenuecat', 'premium'],
    queryFn: () => checkEntitlement('premium'),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const offeringsQuery = useQuery({
    queryKey: ['revenuecat', 'offerings'],
    queryFn: getOfferings,
    staleTime: 1000 * 60 * 30, // 30 minutes
  });

  return {
    isPremium: isPremiumQuery.data ?? false,
    isLoading: isPremiumQuery.isLoading,
    offerings: offeringsQuery.data,
  };
};
```

### 4. Webhook Supabase (optionnel)

Pour synchroniser les statuts d'abonnement côté serveur, configurez un **Webhook RevenueCat** pointant vers une **Supabase Edge Function** :

```
URL : https://VOTRE_PROJECT_ID.supabase.co/functions/v1/revenuecat-webhook
Événements : INITIAL_PURCHASE, RENEWAL, CANCELLATION, EXPIRATION
```

---

## Contribution

Nous accueillons volontiers les contributions à ce projet. Veuillez lire les directives ci-dessous avant de soumettre une pull request.

### Processus de contribution

1. **Forkez** le dépôt et créez une branche descriptive :
   ```bash
   git checkout -b feature/nom-de-la-fonctionnalite
   # ou
   git checkout -b fix/description-du-bug
   ```

2. **Développez** votre fonctionnalité ou correction en respectant les conventions du projet.

3. **Testez** vos modifications sur iOS et Android.

4. **Commitez** vos changements en suivant la convention **Conventional Commits** :
   ```
   feat(dashboard): ajouter le graphique de fréquence cardiaque hebdomadaire
   fix(healthkit): corriger la lecture des données de sommeil
   chore(deps): mettre à jour react-native-health vers 1.15.0
   ```

5. **Poussez** votre branche et ouvrez une **Pull Request** vers `main` avec une description claire des changements apportés.

### Standards de code

- Tout le code doit être **typé en TypeScript** (pas de `any` sauf cas exceptionnels justifiés)
- Suivre les règles **ESLint** et **Prettier** configurées dans le projet
- Les composants React doivent être des **fonctions** avec des types de props explicites
- Les hooks personnalisés doivent être préfixés par `use`

### Vérifications avant PR

```bash
# Linter
npm run lint

# Vérification TypeScript
npm run type-check

# Tests unitaires
npm run test

# Formatage
npm run format
```

---

<div align="center">

**VIVE** — Construire de meilleures habitudes, un jour à la fois.

Fait avec ❤️ en React Native

</div>