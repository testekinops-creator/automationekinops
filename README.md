# MyConnect RMA — Playwright Automation Suite

> **Framework:** Playwright Test (JavaScript) · **Style:** TDD (`describe` / `test`)
> **Target:** https://myconnect-dev.ekinops.com
> **Valid S/N:** S0283505

---

## Project Structure

```
Automation Framework 2/
├── playwright.config.js         # Global config, projects, timeouts
├── package.json
├── .env.example                 # Environment variables template
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
│       ├── auth.spec.js         # Authentication (9 tests)
│       ├── rbac.spec.js         # Role-based access control (14 tests)
│       ├── dashboard.spec.js    # Dashboard KPI bubbles (10 tests)
│       ├── submit-rma.spec.js   # Submit RMA + Factory Receive (21 tests)
│       ├── view-rma.spec.js     # View RMA + Factory Insert (16 tests)
│       └── workflow.spec.js     # Workflow + Status Colours (14 tests)
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
| Customer Two     | customer.testtransport@rma.com   | Customer@1234567  | Customer User         |

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

## Test Coverage (93 Tests)

| Spec File          | Suite                    | Tests |
|--------------------|--------------------------|-------|
| auth.spec.js       | Authentication           | 9     |
| rbac.spec.js       | RBAC — All Roles         | 14    |
| dashboard.spec.js  | Dashboard KPIs           | 10    |
| submit-rma.spec.js | Submit RMA Form          | 11    |
| submit-rma.spec.js | Factory Receive          | 10    |
| view-rma.spec.js   | View RMA List            | 10    |
| view-rma.spec.js   | Factory Insert           | 6     |
| workflow.spec.js   | Workflow Transitions     | 5     |
| workflow.spec.js   | Status Badge Colours     | 8     |
| **Total**          |                          | **93**|

---

## Framework Architecture

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

- Tests use `test.skip()` gracefully when test data is unavailable
- Selectors use multiple fallback strategies for robustness
- `actionTimeout: 15s`, `navigationTimeout: 30s` configured for dev environment latency
- All credentials managed via `.env` — never commit `.env` to version control
