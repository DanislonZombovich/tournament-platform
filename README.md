# 🏆 Danislon Tournaments — Esports Platform & Predictive Fantasy Engine

> **Fullstack Esports Tournament Management System with Graph-Based Bracket Algorithms, Mathematical Valve Fantasy Modeling, Pick'ems Predictive Engine, and Dual-Mode Neon / Embedded PostgreSQL**

---

## 📌 Оглавление
1. [Обзор платформы](#-обзор-платформы)
2. [Data Science & Алгоритмические основы](#-data-science--алгоритмические-основы)
   - [Теория графов и алгоритмы турнирных сеток (DAG Match Scheduling)](#1-теория-графов-и-алгоритмы-турнирных-сеток-dag-match-scheduling)
   - [Математическая модель фэнтези-очков Valve (Multi-Variate Scoring Model)](#2-математическая-модель-фэнтези-очков-valve-multi-variate-scoring-model)
   - [Стохастическая оптимизация и ожидаемая доходность (EV) карточек](#3-стохастическая-оптимизация-и-ожидаемая-доходность-ev-карточек)
   - [Предиктивный скоринг (Pick'ems) и аналитика лидербордов](#4-предиктивный-скоринг-pickems-и-аналитика-лидербордов)
   - [Двухдвижковая реляционная архитектура (Neon Serverless & Embedded PGlite)](#5-двухдвижковая-реляционная-архитектура-neon-serverless--embedded-pglite)
3. [Ключевые возможности](#-ключевые-возможности)
4. [Стек технологий](#-стек-технологий)
5. [Инструкция по установке и локальному запуску](#-инструкция-по-установке-и-локальному-запуску)
6. [Тестирование и верификация (Unit & Integration Tests)](#-тестирование-и-верификация-unit--integration-tests)
7. [Развертывание в продакшн (Cloudflare Workers & Neon)](#-развертывание-в-продакшн-cloudflare-workers--neon)
8. [Архитектура каталогов проекта](#-архитектура-каталогов-проекта)
9. [Лицензия](#-лицензия)

---

## 🔬 Обзор платформы

**Danislon Tournaments** — это высоконагруженная киберспортивная веб-платформа нового поколения для организации турниров, проведения фэнтези-лиг по регламенту The International Compendium и соревновательных прогнозов (Pick'ems). 

Платформа решает комплекс инженерных задач:
- Динамическое построение и автоматическое проведение сеток Single & Double Elimination на 4, 8 и 16 команд.
- Расчет фэнтези-баллов игроков по официальной мультипараметрической формуле Valve с учетом индивидуальных перков и перековки карточек.
- Защита турниров от подставных матчей через привязку и сквозную валидацию Steam OpenID 2.0.
- Поддержка Cloudflare Edge Workers с бессерверной БД Neon PostgreSQL и локальным встраиваемым движком PGlite.

---

## 📊 Data Science & Алгоритмические основы

### 1. Теория графов и алгоритмы турнирных сеток (DAG Match Scheduling)
Турнирные сетки моделируются как направленные ациклические графы (Directed Acyclic Graphs, DAG):
- Каждая вершина графа представляет матч серии Bo1 или Bo3 с указанием входящих зависимостей ($Match_{A}, Match_{B} \to Match_{Next}$).
- В формате **Single Elimination** переход победителя рассчитывается за $O(1)$:
  $$NextMatchIndex = \lfloor CurrentMatchIndex / 2 \rfloor$$
- В формате **Double Elimination** реализован двухуровневый алгоритм маршрутизации:
  - Победитель верхней сетки продвигается по ветке Winner Bracket.
  - Проигравшая команда падает в соответствующий раунд нижней сетки (Loser Bracket) по матрице соответствия раундов, сохраняя шанс на гранд-финал.
- При каскадном изменении результатов в админ-панели срабатывает топологический сброс: система автоматически инвалидирует все зависимые матчи вниз по дереву, предотвращая рассинхронизацию состояния турнира.

### 2. Математическая модель фэнтези-очков Valve (Multi-Variate Scoring Model)
Оценка эффективности игроков в реальных киберспортивных матчах строится на основе взвешенного многомерного векторного пространства показателей. Формула учитывает как атакующие действия, так и штрафы за смерти и вклад в командные цели:

$$\text{FantasyScore} = \sum_{i=1}^{M} w_i \cdot m_i \cdot (1 + b_i)$$

Где $m_i$ — сырая метрика матча, $w_i$ — базовый вес Valve, $b_i$ — стохастический бонус карточки:

| Метрика ($m_i$) | Вес ($w_i$) | Формула расчета | Вклад в игровую аналитику |
| :--- | :---: | :--- | :--- |
| **Убийства** | $0.3$ | $kills \times 0.3 \times (1 + bonusKills)$ | Боевой потенциал и сноубол |
| **Штраф за смерти** | $-0.3$ | $\max(0, 3.0 - deaths \times 0.3 \times (1 - bonusDeaths))$ | Оценка позиционирования и выживаемости |
| **Крипстат (CS)** | $0.003$ | $(last\_hits + denies) \times 0.003 \times (1 + bonusCS)$ | Эффективность фарминга и микроконтроля |
| **GPM** | $0.002$ | $gpm \times 0.002 \times (1 + bonusGPM)$ | Темп накопления экономической мощи |
| **Обзор (Варды)** | $0.5$ | $(placed + destroyed) \times 0.5 \times (1 + bonusWards)$ | Контроль карты и поддержка саппортов |
| **Башни** | $1.0$ | $tower\_kills \times 1.0 \times (1 + bonusTowers)$ | Участие в разрушении строений |
| **Рошан** | $1.5$ | $roshan\_kills \times 1.5 \times (1 + bonusRoshan)$ | Контроль ключевых нейтральных объектов |
| **Первая кровь (FB)** | $4.0$ | $4.0 \times (1 + bonusFB)$ | Доминация на старте игры |
| **Ассисты** | $0.15$ | $assists \times 0.15 \times (1 + bonusAssists)$ | Вовлеченность в командные взаимодействия |
| **Оглушения (Stuns)** | $0.05$ | $stuns \times 0.05 \times (1 + bonusStuns)$ | Контроль вражеских героев в секундах |

### 3. Стохастическая оптимизация и ожидаемая доходность (EV) карточек
- Игрокам предоставляется пул из 20 жетонов перековки (Reroll Tokens).
- Каждый ролл генерирует 3 случайных атрибута с нормализованными весовыми коэффициентами от $+15\%$ до $+50\%$.
- Игрок решает оптимизационную задачу: зная роль киберспортсмена (например, Керри vs Саппорт 5 позиции), максимизировать ожидаемое значение (Expected Value, EV) счета, подбирая синергичные статы (GPM/Kills для керри, Wards/Stuns для фулл-саппортов).

### 4. Предиктивный скоринг (Pick'ems) и аналитика лидербордов
- Двухфакторная модель прогнозирования матчей Bo3:
  1. Выбор триумфатора серии ($+5$ баллов).
  2. Точный счет карт ($2:0, 2:1, 0:2, 1:2$) ($+5$ баллов).
- Индивидуальные прогнозы фиксируются криптографически за 5 минут до старта первого матча игрового дня.
- Таблица лидеров турнира производит ранжирование с детерминированным тайбрейком по времени отправки прогнозов.

### 5. Двухдвижковая реляционная архитектура (Neon Serverless & Embedded PGlite)
- **Продакшн (Cloud)**: Бессерверный кластер Neon PostgreSQL (`@neondatabase/serverless`) с пулером подключений через WebSockets/HTTP, оптимизированный под холодные старты Edge Workers (время задержки < 15 мс).
- **Локальная разработка и тестирование**: Интегрированный в процесс движок `@electric-sql/pglite` (Postgres в WebAssembly/in-memory), позволяющий запускать 100% герметичные тесты и локальный сервер без необходимости устанавливать локальный демон PostgreSQL или Docker.

---

## ✨ Ключевые возможности

1. **Создание турниров любого масштаба**: Single & Double Elimination на 4, 8 или 16 команд. Публичные открытые и закрытые по паролю.
2. **Интерактивная турнирная сетка**: Визуализация путей команд, кликабельные матчи, статусы Live / Completed.
3. **Фэнтези-лига The International**: 5 ролевых слотов, перековка характеристик, автоматический скоринг по итогам матчей.
4. **Прогнозы (Pick'ems)**: Прогнозы на исходы серий и точные счета с подсчетом баллов.
5. **Ростеры команд со Steam-верификацией**: Приглашение участников по коду, проверка привязки SteamID64 всех игроков основы.
6. **Мульти-аутентификация**: Google OAuth2, Discord OAuth2 и Steam OpenID 2.0 с JWT-сессиями (без небезопасных паролей).
7. **Панель турнирного оператора (`/admin`)**: Посев грандов (Team Liquid, Gaimin Gladiators, Team Spirit, BetBoom), ввод результатов матчей, блокировка/разблокировка прогнозов, идемпотентный пересчет.

---

## 🛠️ Стек технологий

| Область | Технология | Назначение |
| :--- | :--- | :--- |
| **Фронтенд & SSR** | Next.js 16 (App Router, Turbopack) | Серверные и клиентские компоненты React 19 |
| **Стилизация** | Tailwind CSS 3.4 | Киберспортивная темная тема (Cyber Sapphire & Cyan) |
| **Язык** | TypeScript 5 | Строгая типизация API и турнирных алгоритмов |
| **Облачная БД** | Neon Serverless PostgreSQL | Высокопроизводительное реляционное хранилище |
| **Локальная БД** | @electric-sql/pglite | Встраиваемый WASM PostgreSQL для изолированных тестов |
| **Аутентификация** | Custom JWT + Multi-OAuth (Google OAuth2, Discord OAuth2, Steam OpenID 2.0) | Криптографически подписанные токены `jose` / `bcryptjs`, поддержка входа через Google, Discord и Steam |
| **Runtime / Edge** | Cloudflare Workers / Node.js 20+ | Edge-хостинг на базе `@opennextjs/cloudflare` |

---

## 🚀 Инструкция по установке и локальному запуску

### Требования
- Node.js 20.x или новее
- npm / yarn / pnpm

### 1. Клонирование репозитория
```bash
git clone https://github.com/DanislonZombovich/tournament-platform.git
cd tournament-platform
```

### 2. Установка зависимостей
```bash
npm install
```

### 3. Конфигурация окружения
Создайте локальный файл `.env`:
```bash
cp .env.example .env
```
Пример содержимого:
```ini
# Если не указан DATABASE_URL, автоматически используется встроенный PGlite!
DATABASE_URL="postgres://neondb_owner:password@ep-xyz.eu-central-1.aws.neon.tech/tournament_db?sslmode=require"
AUTH_SECRET="super-secret-random-jwt-key-minimum-32-chars"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
STEAM_API_KEY="YOUR_STEAM_WEB_API_KEY"
DISCORD_CLIENT_ID="your_discord_client_id"
DISCORD_CLIENT_SECRET="your_discord_client_secret"
GOOGLE_CLIENT_ID="your_google_client_id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your_google_client_secret"
```

| Переменная | Обязательная | Назначение / Описание | Пример / По умолчанию |
| :--- | :---: | :--- | :--- |
| `DATABASE_URL` | Нет (Опционально) | Строка подключения к PostgreSQL (Neon Serverless). Если не задана, автоматически активируется встроенный in-memory движок `@electric-sql/pglite`. | `postgres://user:pass@ep-xyz.neon.tech/neondb?sslmode=require` |
| `AUTH_SECRET` / `JWT_SECRET` | Да | Секретный ключ (минимум 32 символа) для криптографической подписи JWT токенов сессий (`HS256`). | `your-32-character-secret-key-for-jwt-signing` |
| `NEXT_PUBLIC_APP_URL` | Да | Базовый публичный URL веб-приложения для генерации OAuth redirect callback URL. | `http://localhost:3000` |
| `STEAM_API_KEY` | Для Steam OAuth | Ключ доступа к Steam Web API для аутентификации игроков через OpenID 2.0. | `your-steam-web-api-key` |
| `DISCORD_CLIENT_ID` | Для Discord OAuth | Client ID приложения Discord для авторизации пользователей. | `123456789012345678` |
| `DISCORD_CLIENT_SECRET` | Для Discord OAuth | Секрет приложения Discord для обмена OAuth-кода на токен. | `your_discord_client_secret` |
| `GOOGLE_CLIENT_ID` | Для Google OAuth | OAuth 2.0 Client ID из Google Cloud Console. | `client_id.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Для Google OAuth | OAuth 2.0 Client Secret из Google Cloud Console. | `your_google_client_secret` |

### 4. Запуск в режиме разработки
```bash
npm run dev
```
Откройте браузер по адресу [http://localhost:3000](http://localhost:3000).

---

## 🧪 Тестирование и верификация (Unit & Integration Tests)

В репозитории реализованы глубокие автоматизированные тесты, валидирующие математику фэнтези, продвижение по турнирной сетке и связный турнирный цикл:

```bash
npm test
```

Результат выполнения тестов:
```text
Running Valve fantasy unit tests...
All Valve fantasy unit tests passed! [OK]
Bracket & Prediction unit tests PASSED successfully!
Full Tournament, Fantasy & Prediction integration test PASSED successfully!
```

Также доступна проверка production-сборки:
```bash
npm run build
```

---

## ☁️ Развертывание в продакшн (Cloudflare Workers & Neon)

Проект оптимизирован для Cloudflare Workers:
1. Зарегистрируйтесь на [neon.tech](https://neon.tech) и создайте базу данных `tournament_db`.
2. Установите секреты в Cloudflare через Wrangler:
   ```bash
   npx wrangler secret put DATABASE_URL
   npx wrangler secret put AUTH_SECRET
   npx wrangler secret put STEAM_API_KEY
   npx wrangler secret put DISCORD_CLIENT_ID
   npx wrangler secret put DISCORD_CLIENT_SECRET
   npx wrangler secret put GOOGLE_CLIENT_ID
   npx wrangler secret put GOOGLE_CLIENT_SECRET
   npx wrangler secret put NEXT_PUBLIC_APP_URL
   ```
3. Соберите и задеплойте воркер:
   ```bash
   npm run build:worker
   npm run deploy
   ```

---

## 📂 Архитектура каталогов проекта

```text
tournament-platform/
├── src/
│   ├── app/                # Next.js 16 App Router (33 страницы и эндпоинта)
│   │   ├── admin/          # Панель управления турнирного оператора
│   │   ├── api/            # API Route Handlers (auth, fantasy, predictions, teams, tournaments)
│   │   ├── auth/           # Онбординг Steam-никнеймов
│   │   ├── fantasy/        # Фэнтези-лига The International
│   │   ├── leaderboard/    # Таблица лидеров турнира
│   │   ├── predictions/    # Прогнозы на матчи
│   │   ├── teams/          # Управление командами и ростерами
│   │   ├── tournaments/    # Каталог турниров и модалка создания
│   │   └── page.tsx        # Главная страница: турнирные сетки и выбор чемпионата
│   ├── components/         # React-компоненты интерфейса
│   ├── lib/                # Ядро: алгоритмы сеток (bracket.ts), формулы фэнтези (fantasy.ts), БД (db.ts)
│   └── tests/              # Набор тестов (fantasy.test.ts, bracket.test.ts, tournament_flow.test.ts)
├── package.json            # Скрипты и зависимости
├── tsconfig.json           # Конфигурация TypeScript
├── LICENSE                 # Лицензия MIT
└── README.md               # Документация проекта
```

---

## 📄 Лицензия

Проект распространяется под открытой лицензией [MIT License](LICENSE). Вы можете свободно использовать, модифицировать и распространять данный код.

