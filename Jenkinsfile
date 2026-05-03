pipeline {
    agent {
        docker {
            image 'mcr.microsoft.com/playwright:v1.44.0-jammy'
        }
    }

    environment {
        CI = 'true'
        ENV = 'qa'
        RMA_BASE_URL = credentials('rma-base-url')
        RMA_ADMIN_EMAIL = credentials('rma-admin-email')
        RMA_ADMIN_PASSWORD = credentials('rma-admin-password')
        RMA_VALID_SERIAL = 'S0283505'
        BUILD_NUMBER = "${env.BUILD_NUMBER}"
        BRANCH_NAME = "${env.BRANCH_NAME}"
    }

    options {
        timeout(time: 45, unit: 'MINUTES')
        disableConcurrentBuilds()
    }

    stages {
        stage('Install') {
            steps {
                sh 'npm ci'
            }
        }

        stage('Lint') {
            steps {
                sh 'npm run lint'
            }
        }

        stage('Security Audit') {
            steps {
                sh 'npm audit --production --audit-level=high || true'
            }
        }

        stage('RMA Tests') {
            parallel {
                stage('Chromium') {
                    steps {
                        sh 'npx playwright test --project=rma'
                    }
                }
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
            archiveArtifacts artifacts: 'reports/**,test-results/**,allure-results/**', allowEmptyArchive: true
            junit 'reports/junit.xml'
        }
        failure {
            archiveArtifacts artifacts: 'test-results/**', allowEmptyArchive: true
        }
    }
}
