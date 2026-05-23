# MyConnect RMA — Playwright Automation Suite

> **Framework:** Playwright Test (JavaScript) · **Style:** TDD (`describe` / `test`)
> **Target Environments:** dev, acc, qa, staging (configured via .env)
> **Valid S/N:** S0283505

---

## Project Structure

```
Automation Framework 2/
├── playwright.config.js         # Global config, projects, timeouts
├── package.json
├── .env.example                 # Environment variables template
├── .agents/                     # Antigravity Rules and Workflows
├── graphify-out/                # Knowledge Graph Output (HTML, JSON, Report)
├── config/
│   ├── global-setup.js          # Pre-test environment validation
│   ├── global-teardown.js       # Post-test cleanup
│   └── environments.js          # Multi-environment URL configs
├── src/
│   ├── pages/                   # Page Object Model (POM)
│   │   ├── BasePage.js          # Abstract base class for all POMs
│   │   └── rma/
│   │       ├── RMALoginPage.js
│   │       ├── RMADashboardPage.js
│   │       ├── SubmitRMAPage.js
│   │       ├── ViewRMAPage.js
│   │       ├── FactoryReceivePage.js
│   │       └── FactoryInsertPage.js
│   ├── fixtures/                # Custom Playwright fixtures
│   │   ├── index.js             # Barrel export (merged fixtures)
│   │   ├── auth.fixture.js      # Pre-authenticated page fixture
│   │   ├── pages.fixture.js     # Auto-instantiate POM fixtures
│   │   └── testData.fixture.js  # Inject RMA constants as fixture
│   ├── helpers/
│   │   ├── Constants.js         # Central test data (users, routes, etc.)
│   │   ├── rmaAuthHelper.js     # loginAs(), canAccess(), navigateToRMA()
│   │   ├── Logger.js            # Structured console logging
│   │   ├── RetryHelper.js       # Retry logic utilities
│   │   └── DateHelper.js        # Date formatting helpers
│   └── reporters/
│       └── SummaryReporter.js   # Custom test run summary reporter
├── tests/
│   └── rma/
│       ├── access/              # Role-based access & authentication (auth, rbac)
│       ├── functional/          # Core workflows (Submit, View, Dashboard, Factory, etc)
│       ├── regression/          # Bug regression test suites
│       └── security/            # API & Authorization security suites
├── docker/
│   └── Dockerfile
├── docker-compose.yml
├── Jenkinsfile
├── azure-pipelines.yml
├── .github/workflows/playwright.yml
└── .gitlab-ci.yml
```

---

## Test Users

| Display Name     | Email                            | Password          | Role                  |
|------------------|----------------------------------|-------------------|-----------------------|
| Admin User       | administrator.test@rma.com       | Admin@1234567     | Administrator         |
| RMA Admin        | rma.admin@rma.com                | RmaAdmin@1234567  | RMA Admin             |
| Repair Engineer  | rma.engineer@rma.com             | Engineer@1234567  | RMA Repair Engineer   |
| Repair Watcher   | rma.watcher@rma.com              | Watcher@1234567   | RMA Repair Watcher    |
| Customer One     | customer.testaccess@rma.com      | Customer@1234567  | Customer User         |
| Customer Two     | customer.testaccess2@rma.com   | Customer@1234567  | Customer User         |

---

## Setup & Installation

```bash
# 1. Clone and navigate to project
cd "Automation Framework 2"

# 2. Install dependencies
npm install

# 3. Install Playwright browsers
npx playwright install chromium

# 4. Copy and configure environment
cp .env.example .env
```

---

## Running Tests

```bash
# Run all RMA tests
npm test

# Run specific suites
npm run test:auth              # Authentication tests
npm run test:rbac              # RBAC / role access tests
npm run test:dashboard         # Dashboard KPI bubble tests
npm run test:submit            # Submit RMA form tests
npm run test:factory-receive   # Factory Receive tests
npm run test:factory-insert    # Factory Insert tests
npm run test:view              # View RMA list tests
npm run test:workflow          # Workflow transition tests
npm run test:colors            # Status badge colour tests

# Tag-based execution
npm run test:smoke             # Smoke tests only (@smoke)
npm run test:security          # Security tests only (@security)

# Cross-browser
npm run test:firefox
npm run test:webkit
npm run test:mobile

# Debug and UI modes
npm run test:headed            # Watch browser
npm run test:debug             # Step-through debug
npm run test:ui                # Playwright UI mode

# Reports
npm run report:show            # Open HTML report
npm run allure:generate        # Generate Allure report
npm run allure:open            # Open Allure report
```

---

## Test Coverage Domains

The automation suite is organized into key testing domains:

| Domain | Description |
|---|---|
| **Access Control** | Verifies authentication flows, multi-role RBAC matrices, and session stability. |
| **Functional** | End-to-end scenarios covering Dashboard KPIs, View/Submit RMA, and Factory modules. |
| **Regression** | Dedicated bug verification tests to prevent previously resolved issues from recurring. |
| **Security** | API boundary validation and authorization assertion tests. |

---

## Framework Architecture

### Agentic Tooling (Graphify)

This repository includes a [Graphify](https://github.com/safishamsi/graphify) integration to assist LLM agents (Antigravity/Claude/Gemini) in codebase navigation.
- **Rules & Workflows**: Located in `.agents/`
- **Output**: The extracted knowledge graph, HTML visualizer, and audit report are located in `graphify-out/`
- **Usage**: Run `/graphify .` in your AI coding assistant to rebuild the graph after major refactoring.

### Key Design Patterns

- **Page Object Model (POM):** All pages extend `BasePage` for shared navigation, waits, and locator methods
- **TDD Style:** Pure `describe`/`test` blocks — no BDD/Cucumber
- **Custom Fixtures:** Pre-authenticated pages, auto-instantiated POMs, injected test data
- **Multi-Role Login:** `loginAs(page, user)` helper supports RBAC testing with 6+ user roles
- **Per-Test Login:** Each test logs in fresh (no shared auth state) for role isolation

### CI/CD Support

Pre-configured pipelines for:
- **GitHub Actions** — `.github/workflows/playwright.yml`
- **Jenkins** — `Jenkinsfile`
- **Azure DevOps** — `azure-pipelines.yml`
- **GitLab CI** — `.gitlab-ci.yml`
- **Docker** — `docker-compose.yml` + `docker/Dockerfile`

### Reporting

- **Playwright HTML Report** — built-in, auto-generated
- **Allure Report** — detailed test analytics with history
- **JUnit XML** — CI/CD integration
- **Custom Summary Reporter** — console summary banner

---

## Notes

- **Dynamic Test Skips:** Tests use `skipWithEvidence()` gracefully when required test data is unavailable in the environment. This takes a screenshot of the state just before skipping and attaches it to the Playwright report, providing visual evidence for *why* the test was skipped.
- **Expected Failures:** Tests for known, active bugs are written but marked with `test.fail()`. This allows them to run, capture failure traces/screenshots for evidence, but report as "Expected Failures" so they do not break the overall build status.
- **Resilience:** Selectors use multiple fallback strategies (e.g., text, IDs, roles) for robustness across deployments.
- **Timeouts:** `actionTimeout: 15s`, `navigationTimeout: 30s` configured to handle dev environment latency gracefully.
- **Security:** All credentials managed via `.env` — never commit `.env` to version control.
