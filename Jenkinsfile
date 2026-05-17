pipeline {
    agent {
        docker {
            image 'mcr.microsoft.com/playwright:v1.44.0-jammy'
            args '--shm-size=2g'   // Prevent Chromium crashes from small /dev/shm
        }
    }

    parameters {
        choice(name: 'TEST_SUITE', choices: ['full', 'smoke', 'auth', 'integration', 'security', 'regression'], description: 'Which test suite to run')
        booleanParam(name: 'RUN_CROSS_BROWSER', defaultValue: false, description: 'Run cross-browser tests (Firefox + WebKit)')
        booleanParam(name: 'SKIP_CLEANUP', defaultValue: false, description: 'Skip pre-test RMA cleanup')
        string(name: 'SERIAL_OVERRIDE', defaultValue: '', description: 'Override the test serial number (leave blank for default)')
    }

    environment {
        CI                       = 'true'
        ENV                      = 'qa'
        NODE_ENV                 = 'test'

        // ── Application URL ──
        RMA_BASE_URL             = credentials('rma-base-url')

        // ── Credentials (stored in Jenkins Credentials Manager) ──
        RMA_ADMIN_EMAIL          = credentials('rma-admin-email')
        RMA_ADMIN_PASSWORD       = credentials('rma-admin-password')
        RMA_RMA_ADMIN_EMAIL      = credentials('rma-rma-admin-email')
        RMA_RMA_ADMIN_PASSWORD   = credentials('rma-rma-admin-password')
        RMA_ENGINEER_EMAIL       = credentials('rma-engineer-email')
        RMA_ENGINEER_PASSWORD    = credentials('rma-engineer-password')
        RMA_WATCHER_EMAIL        = credentials('rma-watcher-email')
        RMA_WATCHER_PASSWORD     = credentials('rma-watcher-password')
        RMA_CUSTOMER1_EMAIL      = credentials('rma-customer1-email')
        RMA_CUSTOMER1_PASSWORD   = credentials('rma-customer1-password')
        RMA_CUSTOMER2_EMAIL      = credentials('rma-customer2-email')
        RMA_CUSTOMER2_PASSWORD   = credentials('rma-customer2-password')
        RMA_SYSTEM_EMAIL         = credentials('rma-system-email')
        RMA_SYSTEM_PASSWORD      = credentials('rma-system-password')
        RMA_INACTIVE_EMAIL       = credentials('rma-inactive-email')
        RMA_INACTIVE_PASSWORD    = credentials('rma-inactive-password')
        RMA_SECCUSTOMER_EMAIL    = credentials('rma-seccustomer-email')
        RMA_SECCUSTOMER_PASSWORD = credentials('rma-seccustomer-password')

        // ── Test Data ──
        RMA_VALID_SERIAL         = "${params.SERIAL_OVERRIDE ?: 'T1138004504037566'}"
        SKIP_CLEANUP             = "${params.SKIP_CLEANUP}"

        // ── CI Metadata ──
        BUILD_NUMBER             = "${env.BUILD_NUMBER}"
        BRANCH_NAME              = "${env.BRANCH_NAME ?: 'main'}"
    }

    options {
        timeout(time: 45, unit: 'MINUTES')
        disableConcurrentBuilds()
        timestamps()
        buildDiscarder(logRotator(numToKeepStr: '30'))
        ansiColor('xterm')       // Colored console output
    }

    stages {
        // ─── Stage 1: Install Dependencies ───────────────────────────────
        stage('Install') {
            steps {
                echo '🔧 Installing dependencies...'
                sh 'node --version && npm --version'
                sh 'npm ci'
            }
        }

        // ─── Stage 2: Code Quality (non-blocking) ───────────────────────
        stage('Lint') {
            steps {
                sh 'npm run lint || true'
            }
        }

        // ─── Stage 3: Run Tests ──────────────────────────────────────────
        stage('Test') {
            steps {
                script {
                    def testCmd = ''
                    switch(params.TEST_SUITE) {
                        case 'smoke':
                            testCmd = 'npm run test:smoke'
                            break
                        case 'auth':
                            testCmd = 'npm run test:auth'
                            break
                        case 'integration':
                            testCmd = 'npm run test:integration'
                            break
                        case 'security':
                            testCmd = 'npm run test:security'
                            break
                        case 'regression':
                            testCmd = 'npx playwright test --project=rma tests/rma/regression/'
                            break
                        default: // 'full'
                            testCmd = 'npm run test:all'
                            break
                    }
                    echo "🚀 Running: ${testCmd}"
                    sh testCmd
                }
            }
        }

        // ─── Stage 4: Cross-Browser (optional) ──────────────────────────
        stage('Cross-Browser') {
            when {
                expression { return params.RUN_CROSS_BROWSER }
            }
            parallel {
                stage('Firefox') {
                    steps {
                        sh 'npx playwright test --project=rma-firefox'
                    }
                }
                stage('WebKit') {
                    steps {
                        sh 'npx playwright test --project=rma-webkit'
                    }
                }
            }
        }
    }

    post {
        always {
            // Archive all test artifacts
            archiveArtifacts artifacts: 'reports/**,test-results/**,allure-results/**', allowEmptyArchive: true

            // Publish JUnit results for Jenkins test trend graph
            junit testResults: 'reports/junit.xml', allowEmptyResults: true

            // Publish HTML report (requires HTML Publisher plugin)
            publishHTML(target: [
                reportDir: 'reports/html-report',
                reportFiles: 'index.html',
                reportName: 'Playwright Test Report',
                keepAll: true,
                alwaysLinkToLastBuild: true,
                allowMissing: true
            ])

            // Generate Allure report (requires Allure Jenkins plugin)
            allure includeProperties: false,
                   jdk: '',
                   results: [[path: 'allure-results']]
        }
        failure {
            archiveArtifacts artifacts: 'test-results/**', allowEmptyArchive: true
        }
        cleanup {
            cleanWs()
        }
    }
}
