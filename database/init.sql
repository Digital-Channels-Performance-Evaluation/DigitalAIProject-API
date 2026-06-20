-- =============================================================================
-- Ahadu Bank Digital Banking Evaluation Platform
-- Full MySQL 8.0 Schema + Seed Data
-- =============================================================================

SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;
SET time_zone = '+03:00';  -- East Africa Time

-- Use database (created by Docker env variable / XAMPP manually)
USE ahadu_bank_eval;

-- Note: GRANT statements removed for XAMPP compatibility.
-- In Docker, privileges are set via MYSQL_USER/MYSQL_PASSWORD env vars.
-- In XAMPP, run as root which already has full access.

-- Disable FK checks during creation
SET FOREIGN_KEY_CHECKS = 0;

-- =============================================================================
-- DROP existing tables (clean re-init)
-- =============================================================================
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS recommendations;
DROP TABLE IF EXISTS alerts;
DROP TABLE IF EXISTS reports;
DROP TABLE IF EXISTS predictions;
DROP TABLE IF EXISTS similar_products;
DROP TABLE IF EXISTS scores;
DROP TABLE IF EXISTS processed_features;
DROP TABLE IF EXISTS raw_data;
DROP TABLE IF EXISTS model_registry;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS users;

SET FOREIGN_KEY_CHECKS = 1;

-- =============================================================================
-- ENUM TYPES (MySQL uses inline ENUM, declared per column)
-- Documented here for reference:
--   user_role:              super_admin | executive_management | product_manager |
--                           data_engineer | ml_engineer | risk_team | compliance_team
--   product_category:       mobile_banking | card_banking | atm | pos |
--                           qr_payment | digital_wallet | future_product
--   performance_tier:       HIGH | MEDIUM | LOW
--   alert_type:             score_drop | downtime_spike | failure_rate_increase | complaint_surge
--   alert_severity:         critical | high | medium | low
--   recommendation_priority:critical | high | medium | low
--   report_type:            weekly | monthly
--   report_format:          pdf | excel | csv
-- =============================================================================
-- =============================================================================
-- Create Database
-- =============================================================================

CREATE DATABASE IF NOT EXISTS ahadu_bank_eval
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE ahadu_bank_eval;

-- Create application user (optional)
CREATE USER IF NOT EXISTS 'ahadu_user'@'%' IDENTIFIED BY 'Ahadu@123';

GRANT ALL PRIVILEGES ON ahadu_bank_eval.* TO 'ahadu_user'@'%';

FLUSH PRIVILEGES;

-- East Africa Time
SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;
SET time_zone = '+03:00';

SET FOREIGN_KEY_CHECKS = 0;

-- =============================================================================
-- TABLE: users
-- =============================================================================
CREATE TABLE users (
    id              INT             NOT NULL AUTO_INCREMENT,
    full_name       VARCHAR(255)    NOT NULL,
    email           VARCHAR(255)    NOT NULL,
    hashed_password VARCHAR(255)    NOT NULL,
    role            ENUM(
                        'super_admin','executive_management','product_manager',
                        'data_engineer','ml_engineer','risk_team','compliance_team'
                    ) NOT NULL DEFAULT 'product_manager',
    is_active       TINYINT(1)      NOT NULL DEFAULT 1,
    is_mfa_enabled  TINYINT(1)      NOT NULL DEFAULT 0,
    mfa_secret      VARCHAR(255)    NULL,
    last_login      DATETIME        NULL,
    created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME        NULL ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_users_email (email),
    KEY idx_users_role (role),
    KEY idx_users_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Platform users with role-based access control';

-- =============================================================================
-- TABLE: products
-- =============================================================================
CREATE TABLE products (
    id          INT             NOT NULL AUTO_INCREMENT,
    name        VARCHAR(255)    NOT NULL,
    code        VARCHAR(100)    NOT NULL,
    category    ENUM(
                    'mobile_banking','card_banking','atm','pos',
                    'qr_payment','digital_wallet','future_product'
                ) NOT NULL,
    description TEXT            NULL,
    is_active   TINYINT(1)      NOT NULL DEFAULT 1,
    launch_date DATETIME        NULL,
    created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME        NULL ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_products_name (name),
    UNIQUE KEY uq_products_code (code),
    KEY idx_products_category (category),
    KEY idx_products_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Digital banking products being evaluated';


-- =============================================================================
-- TABLE: raw_data
-- Covers ALL primary input features from the BRD/SRS feature list (Section 3.1.2)
-- =============================================================================
CREATE TABLE raw_data (
    id                      INT             NOT NULL AUTO_INCREMENT,
    product_id              INT             NOT NULL,
    period_date             DATE            NOT NULL,

    -- ── User metrics ────────────────────────────────────────────────────────
    total_users             DOUBLE          NULL    COMMENT 'Total registered users on the platform',
    active_users            DOUBLE          NULL    COMMENT 'Monthly active users (logged in and transacted)',
    new_users               DOUBLE          NULL    COMMENT 'Net new registrations in the period',
    churned_users           DOUBLE          NULL    COMMENT 'Users who became inactive in the period',

    -- ── Transaction metrics ─────────────────────────────────────────────────
    total_transactions      DOUBLE          NULL    COMMENT 'Total number of transactions (monthly_txn_count)',
    successful_transactions DOUBLE          NULL    COMMENT 'Successfully completed transactions',
    failed_transactions     DOUBLE          NULL    COMMENT 'Failed/declined transactions',
    failed_txn_rate         DOUBLE          NULL    COMMENT 'failed_transactions / total_transactions * 100  (%)',
    transaction_volume      DOUBLE          NULL    COMMENT 'Total transaction value in ETB (txn_value_etb)',

    -- ── Revenue metrics ─────────────────────────────────────────────────────
    total_revenue           DOUBLE          NULL    COMMENT 'Revenue generated by the product in ETB (revenue_etb)',
    fee_revenue             DOUBLE          NULL    COMMENT 'Fee/commission component of total_revenue in ETB',

    -- ── Operational metrics ─────────────────────────────────────────────────
    uptime_percentage       DOUBLE          NULL    COMMENT 'System uptime % for the period',
    downtime_minutes        DOUBLE          NULL    COMMENT 'Total system downtime in MINUTES (primary BRD field)',
    downtime_hours          DOUBLE          NULL    COMMENT 'downtime_minutes / 60 — convenience alias',
    avg_response_time_ms    DOUBLE          NULL    COMMENT 'Average API/system response time in milliseconds',
    api_error_rate          DOUBLE          NULL    COMMENT 'API error rate % from Digital Channel Middleware',

    -- ── Complaint / CRM metrics ─────────────────────────────────────────────
    total_complaints        DOUBLE          NULL    COMMENT 'Total customer complaints received (complaint_volume)',
    resolved_complaints     DOUBLE          NULL    COMMENT 'Complaints resolved within the period',
    csat_score              DOUBLE          NULL    COMMENT 'Customer Satisfaction Score (0–100) from CRM',

    -- ── Risk / Security metrics (IT Incident Management) ────────────────────
    fraud_event_count       INT             NULL    COMMENT 'Number of fraud detection events in the period',
    security_incident_count INT             NULL    COMMENT 'Number of IT security incidents in the period',

    -- ── Source / upload metadata ─────────────────────────────────────────────
    source                  VARCHAR(100)    NULL    COMMENT 'csv | excel | api | manual | seed',
    upload_batch_id         VARCHAR(100)    NULL,
    is_validated            TINYINT(1)      NOT NULL DEFAULT 0,
    validation_errors       TEXT            NULL,
    uploaded_by             INT             NULL,
    created_at              DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    KEY idx_raw_product_id (product_id),
    KEY idx_raw_period_date (period_date),
    KEY idx_raw_product_period (product_id, period_date),
    KEY idx_raw_batch (upload_batch_id),
    CONSTRAINT fk_raw_product  FOREIGN KEY (product_id)  REFERENCES products(id) ON DELETE CASCADE,
    CONSTRAINT fk_raw_uploader FOREIGN KEY (uploaded_by) REFERENCES users(id)    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Monthly raw KPI data — all primary input features per BRD Section 3.1.2';

-- =============================================================================
-- TABLE: processed_features
-- Covers ALL engineered/derived features from the BRD/SRS feature list (Section 3.1.2)
-- =============================================================================
CREATE TABLE processed_features (
    id                              INT             NOT NULL AUTO_INCREMENT,
    raw_data_id                     INT             NOT NULL,
    product_id                      INT             NOT NULL,
    period_date                     DATE            NOT NULL,

    -- ── Engineered features (BRD Section 3.1.2 — Derived Features) ──────────
    active_user_rate                DOUBLE          NULL    COMMENT 'active_users / total_users',
    revenue_per_transaction         DOUBLE          NULL    COMMENT 'total_revenue / total_transactions  (ETB)',
    revenue_per_active_user         DOUBLE          NULL    COMMENT 'total_revenue / active_users  (ETB)',
    transaction_success_rate        DOUBLE          NULL    COMMENT '1 - failed_txn_rate  (fraction 0-1)',
    failed_txn_rate_pct             DOUBLE          NULL    COMMENT 'failed_txn_rate direct from raw_data  (%)',
    user_engagement_index           DOUBLE          NULL    COMMENT 'active_user_rate * total_transactions — combined engagement depth',
    complaint_growth_rate           DOUBLE          NULL    COMMENT 'MoM % change in complaint_volume — early attrition signal',
    prev_complaint_volume           DOUBLE          NULL    COMMENT 'Prior period complaint_volume used for MoM delta',
    downtime_impact_score           DOUBLE          NULL    COMMENT 'downtime_minutes / (30*24*60) * 100 — % of available minutes lost',
    operational_efficiency_score    DOUBLE          NULL    COMMENT 'Composite: (uptime/100)*0.5 + (1-failed_txn_rate/100)*0.3 + (resolved/complaints)*0.2',

    -- ── Normalised / scaled versions (Min-Max, range 0-1) ───────────────────
    norm_active_user_rate           DOUBLE          NULL    COMMENT 'Min-Max normalised active_user_rate',
    norm_revenue_per_active_user    DOUBLE          NULL    COMMENT 'Min-Max normalised revenue_per_active_user',
    norm_transaction_success_rate   DOUBLE          NULL    COMMENT 'Min-Max normalised transaction_success_rate',
    norm_operational_efficiency     DOUBLE          NULL    COMMENT 'Min-Max normalised operational_efficiency_score',
    norm_complaint_growth_rate      DOUBLE          NULL    COMMENT 'Min-Max normalised complaint_growth_rate (inverted: lower=better)',
    norm_downtime_impact            DOUBLE          NULL    COMMENT 'Min-Max normalised downtime_impact_score (inverted)',
    norm_user_engagement_index      DOUBLE          NULL    COMMENT 'Min-Max normalised user_engagement_index',
    norm_revenue_per_transaction    DOUBLE          NULL    COMMENT 'Min-Max normalised revenue_per_transaction',

    -- ── CSAT / risk pass-through ─────────────────────────────────────────────
    csat_score                      DOUBLE          NULL    COMMENT 'Raw CSAT score passed through from raw_data',
    fraud_event_count               INT             NULL    COMMENT 'Fraud event count passed through from raw_data',
    security_incident_count         INT             NULL    COMMENT 'Security incident count from raw_data',
    api_error_rate                  DOUBLE          NULL    COMMENT 'API error rate % from raw_data',

    -- ── Metadata ────────────────────────────────────────────────────────────
    data_quality_flag               TINYINT(1)      NOT NULL DEFAULT 0 COMMENT '1 = record has quality warnings',
    data_quality_notes              TEXT            NULL,
    engineering_version             VARCHAR(50)     NOT NULL DEFAULT '1.0.0',
    created_at                      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    KEY idx_pf_raw_data_id (raw_data_id),
    KEY idx_pf_product_id (product_id),
    KEY idx_pf_period_date (period_date),
    KEY idx_pf_product_period (product_id, period_date),
    CONSTRAINT fk_pf_raw     FOREIGN KEY (raw_data_id) REFERENCES raw_data(id) ON DELETE CASCADE,
    CONSTRAINT fk_pf_product FOREIGN KEY (product_id)  REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='All engineered & normalised features derived from raw_data — BRD Section 3.1.2';


-- =============================================================================
-- TABLE: model_registry
-- =============================================================================
CREATE TABLE model_registry (
    id                  INT             NOT NULL AUTO_INCREMENT,
    model_name          VARCHAR(255)    NOT NULL,
    model_type          VARCHAR(100)    NOT NULL COMMENT 'classification | regression | similarity',
    version             VARCHAR(50)     NOT NULL,
    -- Performance metrics
    accuracy            DOUBLE          NULL,
    f1_score            DOUBLE          NULL,
    r2_score            DOUBLE          NULL,
    mae                 DOUBLE          NULL,
    mse                 DOUBLE          NULL,
    -- Metadata
    training_date       DATETIME        NULL,
    dataset_version     VARCHAR(100)    NULL,
    training_samples    INT             NULL,
    feature_count       INT             NULL,
    hyperparameters     TEXT            NULL COMMENT 'JSON blob of hyperparameters',
    -- Status
    is_active           TINYINT(1)      NOT NULL DEFAULT 0,
    file_path           VARCHAR(500)    NULL,
    created_by          INT             NULL,
    created_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_mr_is_active (is_active),
    KEY idx_mr_model_type (model_type),
    KEY idx_mr_version (version),
    CONSTRAINT fk_mr_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Registry of trained ML models with performance metrics';

-- =============================================================================
-- TABLE: scores
-- =============================================================================
CREATE TABLE scores (
    id                      INT             NOT NULL AUTO_INCREMENT,
    product_id              INT             NOT NULL,
    processed_features_id   INT             NULL,
    period_date             DATE            NOT NULL,
    performance_score       DOUBLE          NOT NULL COMMENT '0-100 composite score',
    previous_score          DOUBLE          NULL,
    score_change            DOUBLE          NULL,
    performance_tier        ENUM('HIGH','MEDIUM','LOW') NOT NULL,
    previous_tier           VARCHAR(20)     NULL,
    tier_changed            TINYINT(1)      NOT NULL DEFAULT 0,
    model_version           VARCHAR(50)     NULL,
    confidence              DOUBLE          NULL,
    created_at              DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_scores_product_id (product_id),
    KEY idx_scores_period_date (period_date),
    KEY idx_scores_product_period (product_id, period_date),
    KEY idx_scores_tier (performance_tier),
    KEY idx_scores_pf (processed_features_id),
    CONSTRAINT fk_scores_product  FOREIGN KEY (product_id)            REFERENCES products(id)           ON DELETE CASCADE,
    CONSTRAINT fk_scores_features FOREIGN KEY (processed_features_id) REFERENCES processed_features(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='ML-computed performance scores per product per period';

-- =============================================================================
-- TABLE: predictions
-- =============================================================================
CREATE TABLE predictions (
    id                          INT             NOT NULL AUTO_INCREMENT,
    product_id                  INT             NOT NULL,
    period_date                 DATE            NOT NULL,
    predicted_score             DOUBLE          NULL,
    predicted_tier              VARCHAR(20)     NULL,
    prediction_horizon_days     INT             NOT NULL DEFAULT 30,
    confidence                  DOUBLE          NULL,
    model_version               VARCHAR(50)     NULL,
    created_at                  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_pred_product_id (product_id),
    KEY idx_pred_period_date (period_date),
    KEY idx_pred_product_period (product_id, period_date),
    CONSTRAINT fk_pred_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Forward-looking ML predictions for product performance';


-- =============================================================================
-- TABLE: similar_products
-- =============================================================================
CREATE TABLE similar_products (
    id                  INT             NOT NULL AUTO_INCREMENT,
    product_id          INT             NOT NULL,
    similar_product_id  INT             NOT NULL,
    similarity_score    DOUBLE          NOT NULL,
    cluster_id          INT             NULL,
    model_version       VARCHAR(50)     NULL,
    computed_at         DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_sp_product_id (product_id),
    KEY idx_sp_similar (similar_product_id),
    CONSTRAINT fk_sp_product         FOREIGN KEY (product_id)         REFERENCES products(id) ON DELETE CASCADE,
    CONSTRAINT fk_sp_similar_product FOREIGN KEY (similar_product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Product similarity pairs computed by clustering model';

-- =============================================================================
-- TABLE: alerts
-- =============================================================================
CREATE TABLE alerts (
    id                  INT             NOT NULL AUTO_INCREMENT,
    product_id          INT             NOT NULL,
    alert_type          ENUM('score_drop','downtime_spike','failure_rate_increase','complaint_surge') NOT NULL,
    severity            ENUM('critical','high','medium','low') NOT NULL,
    title               VARCHAR(500)    NOT NULL,
    message             TEXT            NOT NULL,
    metric_name         VARCHAR(100)    NULL,
    metric_value        DOUBLE          NULL,
    threshold_value     DOUBLE          NULL,
    previous_value      DOUBLE          NULL,
    is_resolved         TINYINT(1)      NOT NULL DEFAULT 0,
    resolved_by         INT             NULL,
    resolved_at         DATETIME        NULL,
    resolution_notes    TEXT            NULL,
    period_date         DATE            NOT NULL,
    created_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_alerts_product_id (product_id),
    KEY idx_alerts_period_date (period_date),
    KEY idx_alerts_severity (severity),
    KEY idx_alerts_is_resolved (is_resolved),
    KEY idx_alerts_type (alert_type),
    CONSTRAINT fk_alerts_product  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    CONSTRAINT fk_alerts_resolver FOREIGN KEY (resolved_by) REFERENCES users(id)   ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Automated threshold-based alerts for product KPI anomalies';

-- =============================================================================
-- TABLE: recommendations
-- =============================================================================
CREATE TABLE recommendations (
    id                  INT             NOT NULL AUTO_INCREMENT,
    product_id          INT             NOT NULL,
    score_id            INT             NULL,
    period_date         DATE            NOT NULL,
    category            VARCHAR(100)    NOT NULL COMMENT 'infrastructure | user_adoption | transactions | revenue | compliance',
    priority            ENUM('critical','high','medium','low') NOT NULL DEFAULT 'medium',
    title               VARCHAR(500)    NOT NULL,
    description         TEXT            NOT NULL,
    trigger_metric      VARCHAR(100)    NULL,
    trigger_value       DOUBLE          NULL,
    threshold_value     DOUBLE          NULL,
    ai_explanation      TEXT            NULL,
    is_acknowledged     TINYINT(1)      NOT NULL DEFAULT 0,
    acknowledged_by     INT             NULL,
    acknowledged_at     DATETIME        NULL,
    created_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_rec_product_id (product_id),
    KEY idx_rec_period_date (period_date),
    KEY idx_rec_priority (priority),
    KEY idx_rec_is_ack (is_acknowledged),
    KEY idx_rec_score_id (score_id),
    CONSTRAINT fk_rec_product   FOREIGN KEY (product_id)     REFERENCES products(id) ON DELETE CASCADE,
    CONSTRAINT fk_rec_score     FOREIGN KEY (score_id)       REFERENCES scores(id)   ON DELETE SET NULL,
    CONSTRAINT fk_rec_ack_by    FOREIGN KEY (acknowledged_by) REFERENCES users(id)   ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='AI-generated action recommendations linked to product scores';


-- =============================================================================
-- TABLE: reports
-- =============================================================================
CREATE TABLE reports (
    id                  INT             NOT NULL AUTO_INCREMENT,
    report_type         ENUM('weekly','monthly') NOT NULL,
    format              ENUM('pdf','excel','csv') NOT NULL,
    title               VARCHAR(500)    NOT NULL,
    period_start        DATE            NOT NULL,
    period_end          DATE            NOT NULL,
    file_path           VARCHAR(500)    NULL,
    file_size_bytes     INT             NULL,
    is_ready            TINYINT(1)      NOT NULL DEFAULT 0,
    generated_by        INT             NULL,
    generated_at        DATETIME        NULL,
    created_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_reports_type (report_type),
    KEY idx_reports_is_ready (is_ready),
    KEY idx_reports_period (period_start, period_end),
    CONSTRAINT fk_reports_generator FOREIGN KEY (generated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Generated evaluation reports (PDF / Excel / CSV)';

-- =============================================================================
-- TABLE: audit_logs
-- =============================================================================
CREATE TABLE audit_logs (
    id          INT             NOT NULL AUTO_INCREMENT,
    user_id     INT             NULL,
    action      VARCHAR(255)    NOT NULL,
    resource    VARCHAR(255)    NULL,
    resource_id VARCHAR(100)    NULL,
    details     TEXT            NULL,
    ip_address  VARCHAR(50)     NULL,
    user_agent  VARCHAR(500)    NULL,
    status      VARCHAR(50)     NOT NULL DEFAULT 'success',
    created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_audit_user_id (user_id),
    KEY idx_audit_action (action),
    KEY idx_audit_resource (resource),
    KEY idx_audit_created_at (created_at),
    CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Immutable audit trail for all user and system actions';


-- =============================================================================
-- SEED DATA
-- =============================================================================

-- ---------------------------------------------------------------------------
-- users  (passwords are bcrypt hashes — see seed.py for plain-text values)
--   admin@ahadubank.com       → Admin@123
--   exec@ahadubank.com        → Exec@123
--   pm@ahadubank.com          → PM@12345
--   de@ahadubank.com          → DE@12345
--   ml@ahadubank.com          → ML@12345
--   risk@ahadubank.com        → Risk@123
--   compliance@ahadubank.com  → Comp@123
-- ---------------------------------------------------------------------------
INSERT INTO users (full_name, email, hashed_password, role, is_active, is_mfa_enabled, created_at) VALUES
('Abebe Girma', 'admin@ahadubank.com', '$2b$12$KpcRnzi4q.H4LJvZiNbTPeGYUfm3gW26w.0zWCMDz3YYdlZn8ID7u', 'super_admin', 1, 1, NOW()),
('Tigist Alemu', 'exec@ahadubank.com', '$2b$12$a8E6Tfjv.3zYcU3YNQOKJ.T4lXxz.jbW315atljEoFxf9sP767RLS', 'executive_management', 1, 0, NOW()),
('Dawit Bekele', 'pm@ahadubank.com', '$2b$12$7OEO8B9432myl2dVI10kO.l26mik20/.SyfeAtWVA76Hp4NVNsDai', 'product_manager', 1, 0, NOW()),
('Hana Tesfaye', 'de@ahadubank.com', '$2b$12$wjCCZLsilCoCGm4DLsz5t.HS4/s134JKD2sd.VnbkosFGYZ3jkx8.', 'data_engineer', 1, 0, NOW()),
('Yonas Haile', 'ml@ahadubank.com', '$2b$12$wcEjSIhygaRhymeIpgVPz.Ss09CY7DrUpBwtJJ91IBOnWkyod6KUC', 'ml_engineer', 1, 0, NOW()),
('Selamawit Tadesse', 'risk@ahadubank.com', '$2b$12$opM.fMonZcdLIPWOe2clx.InJU5YrBviHuIwduP4k2K6sTxqfJk6K', 'risk_team', 1, 0, NOW()),
('Bereket Mulugeta', 'compliance@ahadubank.com', '$2b$12$LJfyX8oSGoP3noTfRSrY6ujlAfx8JM29RwV1S9FDgMsAUw5AtakD.', 'compliance_team', 1, 0, NOW());

-- ---------------------------------------------------------------------------
-- products
-- ---------------------------------------------------------------------------
INSERT INTO products (name, code, category, description, is_active, launch_date, created_at) VALUES
('Ahadu Mobile Banking', 'MOBILE_01', 'mobile_banking',  'Full-featured mobile banking application for retail and corporate customers', 1, '2020-03-01 00:00:00', NOW()),
('Ahadu Card Banking',   'CARD_01',   'card_banking',    'Debit and credit card management platform',                                   1, '2019-06-15 00:00:00', NOW()),
('Ahadu ATM Network',    'ATM_01',    'atm',             'Nationwide ATM deployment and management system',                             1, '2018-01-10 00:00:00', NOW()),
('Ahadu POS System',     'POS_01',    'pos',             'Point-of-sale terminal network for merchants',                                1, '2019-11-01 00:00:00', NOW()),
('Ahadu QR Pay',         'QR_01',     'qr_payment',      'QR code-based payment solution for retail transactions',                     1, '2022-05-20 00:00:00', NOW()),
('Ahadu Digital Wallet', 'WALLET_01', 'digital_wallet',  'E-wallet for peer-to-peer transfers and digital payments',                   1, '2021-08-01 00:00:00', NOW());


-- ---------------------------------------------------------------------------
-- model_registry  (one active rule-based model + one trained classifier)
-- ---------------------------------------------------------------------------
INSERT INTO model_registry
    (model_name, model_type, version, accuracy, f1_score, r2_score, mae, mse,
     training_date, dataset_version, training_samples, feature_count,
     hyperparameters, is_active, file_path, created_by, created_at)
VALUES
(
  'AhaduPulse Rule-Based Scorer', 'classification', 'rule_based_v1.0',
  0.87, 0.85, NULL, NULL, NULL,
  '2025-01-15 08:00:00', 'v1.0', 500, 8,
  '{"type":"weighted_composite","weights":{"transaction_success_rate":0.30,"active_user_rate":0.20,"operational_efficiency_score":0.20,"revenue_per_active_user":0.15,"complaint_growth_rate":0.15}}',
  1, '/app/ml_models/rule_based_v1.pkl', 5, NOW()
),
(
  'AhaduPulse RandomForest Classifier', 'classification', 'rf_v1.0',
  0.91, 0.90, NULL, NULL, NULL,
  '2025-03-10 09:30:00', 'v1.2', 1200, 8,
  '{"n_estimators":200,"max_depth":12,"min_samples_split":5,"random_state":42}',
  0, '/app/ml_models/rf_classifier_v1.pkl', 5, NOW()
),
(
  'AhaduPulse Score Predictor', 'regression', 'reg_v1.0',
  NULL, NULL, 0.89, 3.21, 15.80,
  '2025-03-10 10:00:00', 'v1.2', 1200, 8,
  '{"n_estimators":150,"max_depth":8,"learning_rate":0.05,"random_state":42}',
  1, '/app/ml_models/score_predictor_v1.pkl', 5, NOW()
),
(
  'AhaduPulse Product Similarity', 'similarity', 'sim_v1.0',
  NULL, NULL, NULL, NULL, NULL,
  '2025-04-01 11:00:00', 'v1.3', 72, 8,
  '{"algorithm":"kmeans","n_clusters":3,"metric":"euclidean"}',
  1, '/app/ml_models/similarity_v1.pkl', 5, NOW()
);


-- ---------------------------------------------------------------------------
-- raw_data  (12 months × 6 products = 72 records, Jan 2025 – Dec 2025)
-- product_id: 1=MOBILE_01  2=CARD_01  3=ATM_01  4=POS_01  5=QR_01  6=WALLET_01
-- ---------------------------------------------------------------------------
-- Column order:
--  product_id, period_date,
--  total_users, active_users, new_users, churned_users,
--  total_transactions, successful_transactions, failed_transactions, failed_txn_rate, transaction_volume,
--  total_revenue, fee_revenue,
--  uptime_percentage, downtime_minutes, downtime_hours, avg_response_time_ms, api_error_rate,
--  total_complaints, resolved_complaints, csat_score,
--  fraud_event_count, security_incident_count,
--  source, is_validated, uploaded_by, created_at
--
--  failed_txn_rate  = failed / total * 100  (%)
--  downtime_minutes = downtime_hours * 60
--  api_error_rate   = representative % for channel middleware errors
--  csat_score       = 0-100 satisfaction from CRM
INSERT INTO raw_data
  (product_id, period_date,
   total_users, active_users, new_users, churned_users,
   total_transactions, successful_transactions, failed_transactions, failed_txn_rate, transaction_volume,
   total_revenue, fee_revenue,
   uptime_percentage, downtime_minutes, downtime_hours, avg_response_time_ms, api_error_rate,
   total_complaints, resolved_complaints, csat_score,
   fraud_event_count, security_incident_count,
   source, is_validated, uploaded_by, created_at)
VALUES
-- ── MOBILE_01 (product_id=1) ──────────────────────────────────────────────
(1,'2025-01-31', 850000,544000,44200, 8670, 1974000,1867518, 106482,  5.39, 49350000, 1453500,174420, 98.5, 130.2, 2.17, 435, 1.8, 301,259, 74.2,  2, 0, 'seed',1,4,NOW()),
(1,'2025-02-28', 863000,559000,46100, 9010, 2028000,1920564, 107436,  5.30, 50700000, 1494000,179280, 98.9, 111.0, 1.85, 412, 1.6, 287,248, 75.1,  1, 0, 'seed',1,4,NOW()),
(1,'2025-03-31', 879000,574000,48300, 9200, 2087000,1975843, 111157,  5.33, 52175000, 1538250,184590, 99.0, 103.8, 1.73, 408, 1.5, 274,240, 75.8,  2, 0, 'seed',1,4,NOW()),
(1,'2025-04-30', 892000,585000,49000, 9400, 2125000,2012375, 112625,  5.30, 53125000, 1567500,188100, 98.7, 124.8, 2.08, 421, 1.7, 269,237, 76.3,  1, 0, 'seed',1,4,NOW()),
(1,'2025-05-31', 907000,598000,51000, 9550, 2180000,2063060, 116940,  5.37, 54500000, 1606500,192780, 99.1,  98.4, 1.64, 403, 1.4, 261,230, 76.9,  2, 0, 'seed',1,4,NOW()),
(1,'2025-06-30', 919000,608000,52200, 9680, 2210000,2093870, 116130,  5.25, 55250000, 1628250,195390, 99.3,  88.2, 1.47, 397, 1.3, 255,226, 77.4,  1, 0, 'seed',1,4,NOW()),
(1,'2025-07-31', 934000,621000,53800, 9800, 2255000,2132225, 122775,  5.44, 56375000, 1660500,199260, 98.8, 118.8, 1.98, 419, 1.6, 248,220, 77.8,  2, 0, 'seed',1,4,NOW()),
(1,'2025-08-31', 948000,635000,55100, 9950, 2298000,2175108, 122892,  5.35, 57450000, 1692750,203130, 99.2,  92.4, 1.54, 401, 1.4, 241,214, 78.2,  1, 0, 'seed',1,4,NOW()),
(1,'2025-09-30', 961000,647000,56300,10100, 2338000,2213366, 124634,  5.33, 58450000, 1722000,206640, 99.0, 103.2, 1.72, 409, 1.5, 236,210, 78.6,  2, 0, 'seed',1,4,NOW()),
(1,'2025-10-31', 975000,660000,57800,10250, 2380000,2253580, 126420,  5.31, 59500000, 1753500,210420, 98.6, 133.8, 2.23, 428, 1.8, 230,205, 79.0,  1, 0, 'seed',1,4,NOW()),
(1,'2025-11-30', 989000,673000,59200,10380, 2418000,2288646, 129354,  5.35, 60450000, 1782000,213840, 99.1,  94.8, 1.58, 406, 1.4, 224,200, 79.3,  2, 0, 'seed',1,4,NOW()),
(1,'2025-12-31',1004000,688000,61000,10500, 2462000,2330334, 131666,  5.35, 61550000, 1813500,217620, 98.7, 128.4, 2.14, 424, 1.7, 218,195, 79.7,  1, 0, 'seed',1,4,NOW()),
-- ── CARD_01 (product_id=2) ────────────────────────────────────────────────
(2,'2025-01-31', 610000,394000,28500, 6280, 1258000,1220460,  37540,  2.98, 62900000, 3774000,452880, 97.8, 224.4, 3.74, 514, 2.4, 178,161, 78.5,  5, 1, 'seed',1,4,NOW()),
(2,'2025-02-28', 621000,403000,29800, 6440, 1290000,1252290,  37710,  2.92, 64500000, 3870000,464400, 98.1, 196.8, 3.28, 498, 2.1, 171,155, 79.2,  4, 1, 'seed',1,4,NOW()),
(2,'2025-03-31', 633000,412000,30500, 6560, 1320000,1280880,  39120,  2.96, 66000000, 3960000,475200, 98.3, 178.8, 2.98, 487, 1.9, 165,150, 79.8,  4, 0, 'seed',1,4,NOW()),
(2,'2025-04-30', 644000,420000,31200, 6670, 1348000,1308244,  39756,  2.95, 67400000, 4044000,485280, 97.9, 212.4, 3.54, 505, 2.3, 161,146, 80.1,  5, 1, 'seed',1,4,NOW()),
(2,'2025-05-31', 656000,430000,32100, 6780, 1378000,1337460,  40540,  2.94, 68900000, 4134000,496080, 98.5, 165.0, 2.75, 481, 1.8, 155,141, 80.6,  3, 0, 'seed',1,4,NOW()),
(2,'2025-06-30', 667000,439000,32800, 6860, 1402000,1361342,  40658,  2.90, 70100000, 4206000,504720, 98.7, 148.2, 2.47, 474, 1.7, 150,137, 81.0,  3, 0, 'seed',1,4,NOW()),
(2,'2025-07-31', 679000,449000,33700, 6960, 1430000,1388570,  41430,  2.90, 71500000, 4290000,514800, 98.2, 187.2, 3.12, 492, 2.0, 146,133, 81.4,  4, 1, 'seed',1,4,NOW()),
(2,'2025-08-31', 691000,458000,34400, 7060, 1456000,1413264,  42736,  2.94, 72800000, 4368000,524160, 98.6, 157.8, 2.63, 480, 1.8, 141,128, 81.8,  3, 0, 'seed',1,4,NOW()),
(2,'2025-09-30', 703000,467000,35100, 7160, 1482000,1438260,  43740,  2.95, 74100000, 4446000,533520, 98.4, 172.2, 2.87, 485, 1.9, 137,125, 82.1,  4, 0, 'seed',1,4,NOW()),
(2,'2025-10-31', 715000,477000,36000, 7270, 1510000,1465210,  44790,  2.96, 75500000, 4530000,543600, 97.7, 230.4, 3.84, 511, 2.5, 133,121, 82.3,  5, 1, 'seed',1,4,NOW()),
(2,'2025-11-30', 727000,487000,37000, 7380, 1538000,1492786,  45214,  2.94, 76900000, 4614000,553680, 98.3, 177.6, 2.96, 489, 2.0, 129,118, 82.7,  3, 0, 'seed',1,4,NOW()),
(2,'2025-12-31', 740000,498000,38200, 7490, 1569000,1522431,  46569,  2.97, 78450000, 4707000,564840, 98.0, 201.6, 3.36, 501, 2.2, 125,114, 83.0,  4, 1, 'seed',1,4,NOW()),
-- ── ATM_01 (product_id=3) ─────────────────────────────────────────────────
(3,'2025-01-31', 467000,287000,18200, 5540,  878000, 826428,  51572,  5.87, 43900000, 2107200,252864, 96.1, 395.4, 6.59, 684, 4.2, 416,354, 63.5,  8, 2, 'seed',1,4,NOW()),
(3,'2025-02-28', 473000,291000,18600, 5710,  893000, 840074,  52926,  5.93, 44650000, 2142000,257040, 96.4, 366.6, 6.11, 665, 4.0, 401,346, 64.1,  7, 2, 'seed',1,4,NOW()),
(3,'2025-03-31', 480000,296000,19000, 5820,  909000, 855873,  53127,  5.85, 45450000, 2181600,261792, 96.7, 343.2, 5.72, 651, 3.8, 387,337, 64.7,  7, 1, 'seed',1,4,NOW()),
(3,'2025-04-30', 487000,300000,19300, 5900,  923000, 870028,  52972,  5.74, 46150000, 2214000,265680, 96.3, 378.6, 6.31, 669, 4.1, 376,328, 65.1,  8, 2, 'seed',1,4,NOW()),
(3,'2025-05-31', 494000,305000,19700, 5980,  938000, 884452,  53548,  5.71, 46900000, 2250000,270000, 96.9, 328.2, 5.47, 642, 3.7, 364,318, 65.7,  6, 1, 'seed',1,4,NOW()),
(3,'2025-06-30', 500000,309000,20000, 6050,  951000, 896043,  54957,  5.78, 47550000, 2281200,273744, 97.1, 310.2, 5.17, 634, 3.5, 355,311, 66.2,  6, 1, 'seed',1,4,NOW()),
(3,'2025-07-31', 507000,314000,20400, 6130,  965000, 909195,  55805,  5.78, 48250000, 2314800,277776, 96.5, 355.8, 5.93, 658, 3.9, 346,303, 66.7,  7, 2, 'seed',1,4,NOW()),
(3,'2025-08-31', 514000,319000,20800, 6210,  979000, 922317,  56683,  5.79, 48950000, 2349600,281952, 96.8, 337.8, 5.63, 647, 3.7, 338,296, 67.1,  7, 1, 'seed',1,4,NOW()),
(3,'2025-09-30', 521000,324000,21200, 6290,  993000, 935547,  57453,  5.78, 49650000, 2383200,285984, 97.0, 318.0, 5.30, 638, 3.6, 330,289, 67.6,  6, 1, 'seed',1,4,NOW()),
(3,'2025-10-31', 528000,330000,21700, 6370, 1008000, 950040,  57960,  5.75, 50400000, 2419200,290304, 96.2, 386.4, 6.44, 672, 4.1, 323,283, 68.0,  8, 2, 'seed',1,4,NOW()),
(3,'2025-11-30', 535000,335000,22100, 6450, 1021000, 962141,  58859,  5.77, 51050000, 2450400,294048, 96.6, 350.4, 5.84, 655, 3.8, 316,276, 68.4,  7, 1, 'seed',1,4,NOW()),
(3,'2025-12-31', 543000,341000,22600, 6530, 1036000, 976180,  59820,  5.77, 51800000, 2486400,298368, 96.4, 366.0, 6.10, 663, 3.9, 309,270, 68.8,  7, 2, 'seed',1,4,NOW()),
-- ── POS_01 (product_id=4) ─────────────────────────────────────────────────
(4,'2025-01-31', 313000,219000,15100, 4220,  687000, 661266,  25734,  3.75,103050000, 6183000,741960, 97.2, 283.8, 4.73, 592, 2.8, 141,127, 80.2,  4, 1, 'seed',1,4,NOW()),
(4,'2025-02-28', 320000,225000,15800, 4360,  706000, 680484,  25516,  3.61,105900000, 6354000,762480, 97.5, 250.8, 4.18, 577, 2.5, 136,123, 80.8,  3, 1, 'seed',1,4,NOW()),
(4,'2025-03-31', 328000,231000,16400, 4470,  726000, 699912,  26088,  3.59,108900000, 6534000,784080, 97.7, 235.2, 3.92, 568, 2.4, 131,119, 81.3,  3, 0, 'seed',1,4,NOW()),
(4,'2025-04-30', 336000,237000,16900, 4560,  745000, 718220,  26780,  3.60,111750000, 6705000,804600, 97.4, 262.2, 4.37, 579, 2.6, 127,115, 81.8,  4, 1, 'seed',1,4,NOW()),
(4,'2025-05-31', 344000,243000,17400, 4650,  764000, 737248,  26752,  3.50,114600000, 6876000,825120, 97.8, 226.8, 3.78, 563, 2.3, 123,112, 82.3,  3, 0, 'seed',1,4,NOW()),
(4,'2025-06-30', 351000,248000,17800, 4720,  780000, 752400,  27600,  3.54,117000000, 7020000,842400, 98.0, 208.2, 3.47, 555, 2.2, 120,109, 82.7,  3, 0, 'seed',1,4,NOW()),
(4,'2025-07-31', 359000,254000,18300, 4800,  798000, 769770,  28230,  3.54,119700000, 7182000,861840, 97.6, 241.8, 4.03, 573, 2.5, 116,106, 83.1,  4, 1, 'seed',1,4,NOW()),
(4,'2025-08-31', 367000,260000,18800, 4880,  816000, 787248,  28752,  3.52,122400000, 7344000,881280, 97.9, 217.2, 3.62, 561, 2.3, 113,103, 83.5,  3, 0, 'seed',1,4,NOW()),
(4,'2025-09-30', 375000,265000,19200, 4960,  833000, 803401,  29599,  3.55,124950000, 7497000,899640, 98.1, 196.2, 3.27, 552, 2.2, 110,100, 83.9,  3, 0, 'seed',1,4,NOW()),
(4,'2025-10-31', 383000,271000,19700, 5040,  851000, 820764,  30236,  3.55,127650000, 7659000,919080, 97.5, 253.8, 4.23, 575, 2.5, 107, 98, 84.2,  4, 1, 'seed',1,4,NOW()),
(4,'2025-11-30', 391000,277000,20200, 5120,  869000, 838361,  30639,  3.53,130350000, 7821000,938520, 97.7, 233.4, 3.89, 565, 2.4, 104, 95, 84.6,  3, 0, 'seed',1,4,NOW()),
(4,'2025-12-31', 400000,284000,20800, 5210,  889000, 857737,  31263,  3.52,133350000, 8001000,960120, 98.0, 208.2, 3.47, 554, 2.2, 101, 93, 85.0,  3, 0, 'seed',1,4,NOW()),
-- ── QR_01 (product_id=5) ──────────────────────────────────────────────────
(5,'2025-01-31', 207000,163000,22200, 3120,  427000, 418460,   8540,  2.00, 42700000, 1281000,153720, 98.8, 120.6, 2.01, 382, 1.2,  94, 87, 73.5,  1, 0, 'seed',1,4,NOW()),
(5,'2025-02-28', 219000,173000,24200, 3310,  457000, 448060,   8940,  1.96, 45700000, 1371000,164520, 99.0, 106.8, 1.78, 367, 1.1,  88, 82, 74.2,  1, 0, 'seed',1,4,NOW()),
(5,'2025-03-31', 232000,184000,26000, 3480,  488000, 478736,   9264,  1.90, 48800000, 1464000,175680, 99.1,  97.8, 1.63, 358, 1.0,  83, 77, 74.8,  1, 0, 'seed',1,4,NOW()),
(5,'2025-04-30', 244000,194000,27500, 3630,  516000, 506196,   9804,  1.90, 51600000, 1548000,185760, 99.2,  89.4, 1.49, 351, 0.9,  79, 74, 75.3,  1, 0, 'seed',1,4,NOW()),
(5,'2025-05-31', 257000,204000,29100, 3790,  545000, 534595,  10405,  1.91, 54500000, 1635000,196200, 99.3,  82.2, 1.37, 344, 0.9,  75, 70, 75.9,  1, 0, 'seed',1,4,NOW()),
(5,'2025-06-30', 269000,214000,30500, 3930,  572000, 561256,  10744,  1.88, 57200000, 1716000,205920, 99.4,  72.0, 1.20, 337, 0.8,  71, 67, 76.4,  0, 0, 'seed',1,4,NOW()),
(5,'2025-07-31', 282000,225000,32200, 4080,  601000, 589581,  11419,  1.90, 60100000, 1803000,216360, 99.1,  95.4, 1.59, 348, 1.0,  68, 64, 76.9,  1, 0, 'seed',1,4,NOW()),
(5,'2025-08-31', 295000,236000,33800, 4220,  630000, 618120,  11880,  1.89, 63000000, 1890000,226800, 99.3,  83.4, 1.39, 341, 0.9,  65, 61, 77.4,  1, 0, 'seed',1,4,NOW()),
(5,'2025-09-30', 308000,247000,35500, 4360,  659000, 646618,  12382,  1.88, 65900000, 1977000,237240, 99.5,  63.6, 1.06, 332, 0.8,  62, 58, 77.9,  0, 0, 'seed',1,4,NOW()),
(5,'2025-10-31', 322000,259000,37400, 4500,  691000, 677681,  13319,  1.93, 69100000, 2073000,248760, 99.2,  91.2, 1.52, 343, 1.0,  59, 55, 78.3,  1, 0, 'seed',1,4,NOW()),
(5,'2025-11-30', 336000,271000,39200, 4650,  723000, 709299,  13701,  1.90, 72300000, 2169000,260280, 99.4,  74.4, 1.24, 336, 0.8,  56, 53, 78.7,  0, 0, 'seed',1,4,NOW()),
(5,'2025-12-31', 351000,284000,41400, 4810,  758000, 743318,  14682,  1.94, 75800000, 2274000,272880, 99.3,  82.8, 1.38, 339, 0.9,  53, 50, 79.1,  1, 0, 'seed',1,4,NOW()),
-- ── WALLET_01 (product_id=6) ──────────────────────────────────────────────
(6,'2025-01-31', 380000,265000,28200, 5120,  828000, 805884,  22116,  2.67, 41400000, 1656000,198720, 99.0, 103.2, 1.72, 352, 1.1, 124,114, 72.8,  2, 0, 'seed',1,4,NOW()),
(6,'2025-02-28', 391000,274000,29700, 5290,  857000, 834491,  22509,  2.63, 42850000, 1714000,205680, 99.2,  91.2, 1.52, 342, 1.0, 119,110, 73.5,  2, 0, 'seed',1,4,NOW()),
(6,'2025-03-31', 403000,284000,31000, 5440,  888000, 865224,  22776,  2.56, 44400000, 1776000,213120, 99.3,  83.4, 1.39, 336, 0.9, 114,106, 74.1,  1, 0, 'seed',1,4,NOW()),
(6,'2025-04-30', 415000,293000,32200, 5580,  917000, 893709,  23291,  2.54, 45850000, 1834000,220080, 99.1,  96.0, 1.60, 344, 1.0, 109,101, 74.7,  2, 0, 'seed',1,4,NOW()),
(6,'2025-05-31', 428000,304000,33800, 5720,  949000, 924726,  24274,  2.56, 47450000, 1898000,227760, 99.4,  73.2, 1.22, 333, 0.8, 105, 97, 75.2,  1, 0, 'seed',1,4,NOW()),
(6,'2025-06-30', 441000,314000,35300, 5870,  979000, 954123,  24877,  2.54, 48950000, 1958000,234960, 99.5,  63.0, 1.05, 327, 0.7, 101, 94, 75.8,  1, 0, 'seed',1,4,NOW()),
(6,'2025-07-31', 454000,324000,36800, 6010, 1010000, 985760,  24240,  2.40, 50500000, 2020000,242400, 99.3,  82.8, 1.38, 334, 0.9,  97, 90, 76.3,  1, 0, 'seed',1,4,NOW()),
(6,'2025-08-31', 467000,335000,38400, 6150, 1042000,1016550,  25450,  2.44, 52100000, 2084000,250080, 99.4,  71.4, 1.19, 329, 0.8,  93, 87, 76.8,  1, 0, 'seed',1,4,NOW()),
(6,'2025-09-30', 481000,346000,40000, 6300, 1075000,1048825,  26175,  2.44, 53750000, 2150000,258000, 99.5,  63.0, 1.05, 323, 0.7,  90, 84, 77.3,  1, 0, 'seed',1,4,NOW()),
(6,'2025-10-31', 495000,358000,41800, 6450, 1110000,1083150,  26850,  2.42, 55500000, 2220000,266400, 99.2,  90.0, 1.50, 331, 0.9,  86, 80, 77.7,  1, 0, 'seed',1,4,NOW()),
(6,'2025-11-30', 509000,370000,43700, 6600, 1145000,1117325,  27675,  2.42, 57250000, 2290000,274800, 99.4,  73.2, 1.22, 325, 0.8,  83, 77, 78.2,  1, 0, 'seed',1,4,NOW()),
(6,'2025-12-31', 524000,383000,45800, 6760, 1183000,1154127,  28873,  2.44, 59150000, 2366000,283920, 99.3,  82.8, 1.38, 328, 0.8,  80, 75, 78.6,  1, 0, 'seed',1,4,NOW());


-- ---------------------------------------------------------------------------
-- processed_features  (one row per raw_data row, raw_data_id 1-72)
-- Formulas:
--   active_user_rate            = active_users / total_users
--   revenue_per_transaction     = total_revenue / total_transactions
--   revenue_per_active_user     = total_revenue / active_users
--   transaction_success_rate    = successful_transactions / total_transactions
--   user_engagement_index       = (active_users/total_users)*0.5 + (1 - failed/total)*0.5
--   complaint_growth_rate       = total_complaints / total_users * 100
--   downtime_impact_score       = downtime_hours / 168 * 100   (168h/month)
--   operational_efficiency_score= (uptime/100)*0.5 + (1-avg_rt/2000)*0.3 + (resolved/total_complaints)*0.2
-- ---------------------------------------------------------------------------
INSERT INTO processed_features
  (raw_data_id, product_id, period_date,
   active_user_rate, revenue_per_transaction, revenue_per_active_user,
   transaction_success_rate, user_engagement_index,
   complaint_growth_rate, downtime_impact_score, operational_efficiency_score,
   engineering_version, created_at)
VALUES
-- MOBILE_01 (raw_data_id 1-12)
(1, 1,'2025-01-31', 0.6400, 0.7363, 2.6711, 0.9460, 0.7230, 0.0354, 1.2917, 0.8724, '1.0.0',NOW()),
(2, 1,'2025-02-28', 0.6477, 0.7368, 2.6726, 0.9471, 0.7274, 0.0333, 1.1012, 0.8762, '1.0.0',NOW()),
(3, 1,'2025-03-31', 0.6530, 0.7371, 2.6799, 0.9467, 0.7298, 0.0312, 1.0298, 0.8788, '1.0.0',NOW()),
(4, 1,'2025-04-30', 0.6558, 0.7376, 2.6795, 0.9471, 0.7314, 0.0301, 1.2381, 0.8773, '1.0.0',NOW()),
(5, 1,'2025-05-31', 0.6593, 0.7369, 2.6865, 0.9465, 0.7329, 0.0288, 0.9762, 0.8803, '1.0.0',NOW()),
(6, 1,'2025-06-30', 0.6616, 0.7368, 2.6779, 0.9474, 0.7345, 0.0277, 0.8750, 0.8822, '1.0.0',NOW()),
(7, 1,'2025-07-31', 0.6650, 0.7364, 2.6739, 0.9455, 0.7352, 0.0266, 1.1786, 0.8792, '1.0.0',NOW()),
(8, 1,'2025-08-31', 0.6698, 0.7366, 2.6657, 0.9469, 0.7383, 0.0254, 0.9167, 0.8831, '1.0.0',NOW()),
(9, 1,'2025-09-30', 0.6733, 0.7365, 2.6617, 0.9468, 0.7400, 0.0246, 1.0238, 0.8820, '1.0.0',NOW()),
(10,1,'2025-10-31', 0.6769, 0.7368, 2.6568, 0.9469, 0.7419, 0.0236, 1.3274, 0.8799, '1.0.0',NOW()),
(11,1,'2025-11-30', 0.6805, 0.7370, 2.6479, 0.9468, 0.7436, 0.0226, 0.9405, 0.8832, '1.0.0',NOW()),
(12,1,'2025-12-31', 0.6853, 0.7365, 2.6359, 0.9465, 0.7459, 0.0217, 1.2738, 0.8809, '1.0.0',NOW()),
-- CARD_01 (raw_data_id 13-24)
(13,2,'2025-01-31', 0.6459, 2.9999, 9.5787, 0.9702, 0.8080, 0.0292, 2.2262, 0.8812, '1.0.0',NOW()),
(14,2,'2025-02-28', 0.6490, 3.0000, 9.6013, 0.9707, 0.8099, 0.0275, 1.9524, 0.8851, '1.0.0',NOW()),
(15,2,'2025-03-31', 0.6509, 3.0000, 9.6117, 0.9704, 0.8106, 0.0261, 1.7738, 0.8875, '1.0.0',NOW()),
(16,2,'2025-04-30', 0.6522, 2.9999, 9.6286, 0.9705, 0.8113, 0.0250, 2.1071, 0.8844, '1.0.0',NOW()),
(17,2,'2025-05-31', 0.6555, 3.0000, 9.6140, 0.9706, 0.8128, 0.0236, 1.6369, 0.8882, '1.0.0',NOW()),
(18,2,'2025-06-30', 0.6582, 3.0000, 9.5809, 0.9710, 0.8145, 0.0225, 1.4702, 0.8903, '1.0.0',NOW()),
(19,2,'2025-07-31', 0.6613, 3.0000, 9.5546, 0.9710, 0.8157, 0.0215, 1.8571, 0.8878, '1.0.0',NOW()),
(20,2,'2025-08-31', 0.6628, 2.9999, 9.5371, 0.9707, 0.8163, 0.0204, 1.5655, 0.8898, '1.0.0',NOW()),
(21,2,'2025-09-30', 0.6643, 2.9999, 9.5182, 0.9705, 0.8174, 0.0195, 1.7083, 0.8888, '1.0.0',NOW()),
(22,2,'2025-10-31', 0.6671, 2.9999, 9.4968, 0.9704, 0.8187, 0.0186, 2.2857, 0.8851, '1.0.0',NOW()),
(23,2,'2025-11-30', 0.6699, 2.9999, 9.4744, 0.9706, 0.8202, 0.0177, 1.7619, 0.8882, '1.0.0',NOW()),
(24,2,'2025-12-31', 0.6730, 3.0000, 9.4518, 0.9704, 0.8215, 0.0169, 2.0000, 0.8862, '1.0.0',NOW()),
-- ATM_01 (raw_data_id 25-36)
(25,3,'2025-01-31', 0.6145, 2.3999, 7.3429, 0.9413, 0.7779, 0.0891, 3.9226, 0.8267, '1.0.0',NOW()),
(26,3,'2025-02-28', 0.6152, 2.3989, 7.3608, 0.9407, 0.7780, 0.0848, 3.6369, 0.8302, '1.0.0',NOW()),
(27,3,'2025-03-31', 0.6167, 2.3999, 7.3703, 0.9417, 0.7792, 0.0806, 3.4048, 0.8336, '1.0.0',NOW()),
(28,3,'2025-04-30', 0.6160, 2.3988, 7.3800, 0.9426, 0.7793, 0.0772, 3.7560, 0.8311, '1.0.0',NOW()),
(29,3,'2025-05-31', 0.6173, 2.3988, 7.3770, 0.9429, 0.7801, 0.0737, 3.2560, 0.8352, '1.0.0',NOW()),
(30,3,'2025-06-30', 0.6180, 2.3993, 7.3844, 0.9422, 0.7801, 0.0710, 3.0774, 0.8369, '1.0.0',NOW()),
(31,3,'2025-07-31', 0.6194, 2.3988, 7.3720, 0.9424, 0.7809, 0.0682, 3.5298, 0.8344, '1.0.0',NOW()),
(32,3,'2025-08-31', 0.6206, 2.3999, 7.3654, 0.9420, 0.7813, 0.0658, 3.3512, 0.8360, '1.0.0',NOW()),
(33,3,'2025-09-30', 0.6219, 2.3997, 7.3556, 0.9420, 0.7819, 0.0634, 3.1548, 0.8376, '1.0.0',NOW()),
(34,3,'2025-10-31', 0.6250, 2.3988, 7.3309, 0.9425, 0.7838, 0.0612, 3.8333, 0.8336, '1.0.0',NOW()),
(35,3,'2025-11-30', 0.6262, 2.3999, 7.3145, 0.9423, 0.7842, 0.0591, 3.4762, 0.8354, '1.0.0',NOW()),
(36,3,'2025-12-31', 0.6280, 2.3999, 7.2904, 0.9423, 0.7851, 0.0569, 3.6310, 0.8347, '1.0.0',NOW()),
-- POS_01 (raw_data_id 37-48)
(37,4,'2025-01-31', 0.6997, 8.9999, 28.2329, 0.9625, 0.8311, 0.0451, 2.8155, 0.8780, '1.0.0',NOW()),
(38,4,'2025-02-28', 0.7031, 9.0014, 28.2400, 0.9632, 0.8316, 0.0425, 2.4881, 0.8817, '1.0.0',NOW()),
(39,4,'2025-03-31', 0.7043, 8.9998, 28.2857, 0.9641, 0.8322, 0.0399, 2.3333, 0.8841, '1.0.0',NOW()),
(40,4,'2025-04-30', 0.7054, 8.9999, 28.2911, 0.9640, 0.8327, 0.0378, 2.6012, 0.8822, '1.0.0',NOW()),
(41,4,'2025-05-31', 0.7064, 8.9973, 28.3127, 0.9649, 0.8357, 0.0358, 2.2500, 0.8861, '1.0.0',NOW()),
(42,4,'2025-06-30', 0.7066, 9.0000, 28.3065, 0.9646, 0.8333, 0.0342, 2.0655, 0.8873, '1.0.0',NOW()),
(43,4,'2025-07-31', 0.7075, 9.0000, 28.2677, 0.9646, 0.8360, 0.0323, 2.3988, 0.8849, '1.0.0',NOW()),
(44,4,'2025-08-31', 0.7085, 9.0000, 28.2462, 0.9645, 0.8365, 0.0308, 2.1548, 0.8866, '1.0.0',NOW()),
(45,4,'2025-09-30', 0.7067, 9.0000, 28.2906, 0.9645, 0.8356, 0.0293, 1.9464, 0.8879, '1.0.0',NOW()),
(46,4,'2025-10-31', 0.7076, 8.9999, 28.2621, 0.9644, 0.8360, 0.0279, 2.5179, 0.8851, '1.0.0',NOW()),
(47,4,'2025-11-30', 0.7084, 8.9999, 28.2094, 0.9648, 0.8369, 0.0266, 2.3155, 0.8867, '1.0.0',NOW()),
(48,4,'2025-12-31', 0.7100, 9.0003, 28.1725, 0.9649, 0.8375, 0.0253, 2.0655, 0.8882, '1.0.0',NOW()),
-- QR_01 (raw_data_id 49-60)
(49,5,'2025-01-31', 0.7874, 2.9997, 7.8590, 0.9800, 0.8837, 0.0454, 1.1964, 0.9186, '1.0.0',NOW()),
(50,5,'2025-02-28', 0.7945, 2.9999, 7.9249, 0.9804, 0.8874, 0.0402, 1.0595, 0.9218, '1.0.0',NOW()),
(51,5,'2025-03-31', 0.7931, 2.9999, 7.9565, 0.9810, 0.8870, 0.0358, 0.9702, 0.9246, '1.0.0',NOW()),
(52,5,'2025-04-30', 0.7951, 2.9993, 7.9794, 0.9810, 0.8880, 0.0324, 0.8869, 0.9265, '1.0.0',NOW()),
(53,5,'2025-05-31', 0.7938, 2.9982, 8.0147, 0.9809, 0.8873, 0.0292, 0.8155, 0.9284, '1.0.0',NOW()),
(54,5,'2025-06-30', 0.7956, 2.9999, 8.0187, 0.9812, 0.8883, 0.0264, 0.7143, 0.9307, '1.0.0',NOW()),
(55,5,'2025-07-31', 0.7979, 3.0000, 8.0133, 0.9810, 0.8890, 0.0241, 0.9464, 0.9291, '1.0.0',NOW()),
(56,5,'2025-08-31', 0.8000, 2.9997, 8.0085, 0.9811, 0.8906, 0.0220, 0.8274, 0.9310, '1.0.0',NOW()),
(57,5,'2025-09-30', 0.8019, 2.9984, 8.0040, 0.9812, 0.8916, 0.0201, 0.6310, 0.9328, '1.0.0',NOW()),
(58,5,'2025-10-31', 0.8043, 2.9986, 8.0039, 0.9807, 0.8926, 0.0183, 0.9048, 0.9307, '1.0.0',NOW()),
(59,5,'2025-11-30', 0.8065, 2.9999, 8.0000, 0.9810, 0.8933, 0.0167, 0.7381, 0.9326, '1.0.0',NOW()),
(60,5,'2025-12-31', 0.8091, 2.9997, 8.0070, 0.9807, 0.8949, 0.0151, 0.8214, 0.9322, '1.0.0',NOW()),
-- WALLET_01 (raw_data_id 61-72)
(61,6,'2025-01-31', 0.6974, 2.0000, 6.2491, 0.9733, 0.8353, 0.0326, 1.0238, 0.9014, '1.0.0',NOW()),
(62,6,'2025-02-28', 0.7007, 2.0000, 6.2555, 0.9737, 0.8371, 0.0304, 0.9048, 0.9043, '1.0.0',NOW()),
(63,6,'2025-03-31', 0.7047, 1.9999, 6.2535, 0.9743, 0.8394, 0.0283, 0.8274, 0.9068, '1.0.0',NOW()),
(64,6,'2025-04-30', 0.7060, 1.9978, 6.2594, 0.9746, 0.8403, 0.0263, 0.9524, 0.9058, '1.0.0',NOW()),
(65,6,'2025-05-31', 0.7103, 1.9999, 6.2434, 0.9744, 0.8422, 0.0245, 0.7262, 0.9087, '1.0.0',NOW()),
(66,6,'2025-06-30', 0.7120, 2.0000, 6.2420, 0.9746, 0.8430, 0.0229, 0.6250, 0.9102, '1.0.0',NOW()),
(67,6,'2025-07-31', 0.7137, 2.0000, 6.2346, 0.9760, 0.8449, 0.0214, 0.8214, 0.9090, '1.0.0',NOW()),
(68,6,'2025-08-31', 0.7174, 2.0000, 6.2254, 0.9756, 0.8465, 0.0199, 0.7083, 0.9106, '1.0.0',NOW()),
(69,6,'2025-09-30', 0.7193, 1.9999, 6.2139, 0.9757, 0.8476, 0.0187, 0.6250, 0.9118, '1.0.0',NOW()),
(70,6,'2025-10-31', 0.7232, 2.0000, 6.2011, 0.9758, 0.8495, 0.0174, 0.8929, 0.9099, '1.0.0',NOW()),
(71,6,'2025-11-30', 0.7270, 1.9999, 6.1892, 0.9758, 0.8515, 0.0163, 0.7262, 0.9115, '1.0.0',NOW()),
(72,6,'2025-12-31', 0.7309, 2.0000, 6.1779, 0.9761, 0.8535, 0.0153, 0.8214, 0.9118, '1.0.0',NOW());


-- ---------------------------------------------------------------------------
-- scores  (one per raw_data row; tier thresholds: HIGH>=75, MEDIUM>=50, LOW<50)
-- processed_features_id mirrors raw_data_id ordering (pf rows were inserted 1-72)
-- ---------------------------------------------------------------------------
INSERT INTO scores
  (product_id, processed_features_id, period_date,
   performance_score, previous_score, score_change,
   performance_tier, previous_tier, tier_changed,
   model_version, confidence, created_at)
VALUES
-- MOBILE_01
(1,  1,'2025-01-31', 71.42, NULL,   NULL,   'MEDIUM', NULL,     0, 'rule_based_v1.0', 0.75, NOW()),
(1,  2,'2025-02-28', 72.18, 71.42,  0.76,   'MEDIUM', 'MEDIUM', 0, 'rule_based_v1.0', 0.75, NOW()),
(1,  3,'2025-03-31', 73.05, 72.18,  0.87,   'MEDIUM', 'MEDIUM', 0, 'rule_based_v1.0', 0.76, NOW()),
(1,  4,'2025-04-30', 73.64, 73.05,  0.59,   'MEDIUM', 'MEDIUM', 0, 'rule_based_v1.0', 0.76, NOW()),
(1,  5,'2025-05-31', 74.21, 73.64,  0.57,   'MEDIUM', 'MEDIUM', 0, 'rule_based_v1.0', 0.77, NOW()),
(1,  6,'2025-06-30', 74.89, 74.21,  0.68,   'MEDIUM', 'MEDIUM', 0, 'rule_based_v1.0', 0.77, NOW()),
(1,  7,'2025-07-31', 75.10, 74.89,  0.21,   'HIGH',   'MEDIUM', 1, 'rule_based_v1.0', 0.78, NOW()),
(1,  8,'2025-08-31', 75.83, 75.10,  0.73,   'HIGH',   'HIGH',   0, 'rule_based_v1.0', 0.78, NOW()),
(1,  9,'2025-09-30', 76.42, 75.83,  0.59,   'HIGH',   'HIGH',   0, 'rule_based_v1.0', 0.79, NOW()),
(1, 10,'2025-10-31', 76.91, 76.42,  0.49,   'HIGH',   'HIGH',   0, 'rule_based_v1.0', 0.79, NOW()),
(1, 11,'2025-11-30', 77.38, 76.91,  0.47,   'HIGH',   'HIGH',   0, 'rule_based_v1.0', 0.80, NOW()),
(1, 12,'2025-12-31', 77.85, 77.38,  0.47,   'HIGH',   'HIGH',   0, 'rule_based_v1.0', 0.80, NOW()),
-- CARD_01
(2, 13,'2025-01-31', 80.15, NULL,   NULL,   'HIGH',   NULL,     0, 'rule_based_v1.0', 0.78, NOW()),
(2, 14,'2025-02-28', 80.74, 80.15,  0.59,   'HIGH',   'HIGH',   0, 'rule_based_v1.0', 0.79, NOW()),
(2, 15,'2025-03-31', 81.20, 80.74,  0.46,   'HIGH',   'HIGH',   0, 'rule_based_v1.0', 0.79, NOW()),
(2, 16,'2025-04-30', 81.55, 81.20,  0.35,   'HIGH',   'HIGH',   0, 'rule_based_v1.0', 0.80, NOW()),
(2, 17,'2025-05-31', 82.03, 81.55,  0.48,   'HIGH',   'HIGH',   0, 'rule_based_v1.0', 0.80, NOW()),
(2, 18,'2025-06-30', 82.47, 82.03,  0.44,   'HIGH',   'HIGH',   0, 'rule_based_v1.0', 0.81, NOW()),
(2, 19,'2025-07-31', 82.81, 82.47,  0.34,   'HIGH',   'HIGH',   0, 'rule_based_v1.0', 0.81, NOW()),
(2, 20,'2025-08-31', 83.19, 82.81,  0.38,   'HIGH',   'HIGH',   0, 'rule_based_v1.0', 0.82, NOW()),
(2, 21,'2025-09-30', 83.52, 83.19,  0.33,   'HIGH',   'HIGH',   0, 'rule_based_v1.0', 0.82, NOW()),
(2, 22,'2025-10-31', 83.78, 83.52,  0.26,   'HIGH',   'HIGH',   0, 'rule_based_v1.0', 0.83, NOW()),
(2, 23,'2025-11-30', 84.10, 83.78,  0.32,   'HIGH',   'HIGH',   0, 'rule_based_v1.0', 0.83, NOW()),
(2, 24,'2025-12-31', 84.38, 84.10,  0.28,   'HIGH',   'HIGH',   0, 'rule_based_v1.0', 0.84, NOW()),
-- ATM_01
(3, 25,'2025-01-31', 58.32, NULL,   NULL,   'MEDIUM', NULL,     0, 'rule_based_v1.0', 0.74, NOW()),
(3, 26,'2025-02-28', 59.01, 58.32,  0.69,   'MEDIUM', 'MEDIUM', 0, 'rule_based_v1.0', 0.74, NOW()),
(3, 27,'2025-03-31', 59.78, 59.01,  0.77,   'MEDIUM', 'MEDIUM', 0, 'rule_based_v1.0', 0.75, NOW()),
(3, 28,'2025-04-30', 60.22, 59.78,  0.44,   'MEDIUM', 'MEDIUM', 0, 'rule_based_v1.0', 0.75, NOW()),
(3, 29,'2025-05-31', 60.87, 60.22,  0.65,   'MEDIUM', 'MEDIUM', 0, 'rule_based_v1.0', 0.75, NOW()),
(3, 30,'2025-06-30', 61.45, 60.87,  0.58,   'MEDIUM', 'MEDIUM', 0, 'rule_based_v1.0', 0.76, NOW()),
(3, 31,'2025-07-31', 61.98, 61.45,  0.53,   'MEDIUM', 'MEDIUM', 0, 'rule_based_v1.0', 0.76, NOW()),
(3, 32,'2025-08-31', 62.54, 61.98,  0.56,   'MEDIUM', 'MEDIUM', 0, 'rule_based_v1.0', 0.77, NOW()),
(3, 33,'2025-09-30', 63.10, 62.54,  0.56,   'MEDIUM', 'MEDIUM', 0, 'rule_based_v1.0', 0.77, NOW()),
(3, 34,'2025-10-31', 63.58, 63.10,  0.48,   'MEDIUM', 'MEDIUM', 0, 'rule_based_v1.0', 0.77, NOW()),
(3, 35,'2025-11-30', 64.12, 63.58,  0.54,   'MEDIUM', 'MEDIUM', 0, 'rule_based_v1.0', 0.78, NOW()),
(3, 36,'2025-12-31', 64.63, 64.12,  0.51,   'MEDIUM', 'MEDIUM', 0, 'rule_based_v1.0', 0.78, NOW()),
-- POS_01
(4, 37,'2025-01-31', 85.22, NULL,   NULL,   'HIGH',   NULL,     0, 'rule_based_v1.0', 0.80, NOW()),
(4, 38,'2025-02-28', 85.68, 85.22,  0.46,   'HIGH',   'HIGH',   0, 'rule_based_v1.0', 0.80, NOW()),
(4, 39,'2025-03-31', 86.10, 85.68,  0.42,   'HIGH',   'HIGH',   0, 'rule_based_v1.0', 0.81, NOW()),
(4, 40,'2025-04-30', 86.45, 86.10,  0.35,   'HIGH',   'HIGH',   0, 'rule_based_v1.0', 0.81, NOW()),
(4, 41,'2025-05-31', 86.89, 86.45,  0.44,   'HIGH',   'HIGH',   0, 'rule_based_v1.0', 0.82, NOW()),
(4, 42,'2025-06-30', 87.22, 86.89,  0.33,   'HIGH',   'HIGH',   0, 'rule_based_v1.0', 0.82, NOW()),
(4, 43,'2025-07-31', 87.55, 87.22,  0.33,   'HIGH',   'HIGH',   0, 'rule_based_v1.0', 0.83, NOW()),
(4, 44,'2025-08-31', 87.88, 87.55,  0.33,   'HIGH',   'HIGH',   0, 'rule_based_v1.0', 0.83, NOW()),
(4, 45,'2025-09-30', 88.15, 87.88,  0.27,   'HIGH',   'HIGH',   0, 'rule_based_v1.0', 0.84, NOW()),
(4, 46,'2025-10-31', 88.43, 88.15,  0.28,   'HIGH',   'HIGH',   0, 'rule_based_v1.0', 0.84, NOW()),
(4, 47,'2025-11-30', 88.74, 88.43,  0.31,   'HIGH',   'HIGH',   0, 'rule_based_v1.0', 0.85, NOW()),
(4, 48,'2025-12-31', 89.01, 88.74,  0.27,   'HIGH',   'HIGH',   0, 'rule_based_v1.0', 0.85, NOW()),
-- QR_01
(5, 49,'2025-01-31', 78.55, NULL,   NULL,   'HIGH',   NULL,     0, 'rule_based_v1.0', 0.77, NOW()),
(5, 50,'2025-02-28', 79.42, 78.55,  0.87,   'HIGH',   'HIGH',   0, 'rule_based_v1.0', 0.77, NOW()),
(5, 51,'2025-03-31', 80.18, 79.42,  0.76,   'HIGH',   'HIGH',   0, 'rule_based_v1.0', 0.78, NOW()),
(5, 52,'2025-04-30', 80.85, 80.18,  0.67,   'HIGH',   'HIGH',   0, 'rule_based_v1.0', 0.79, NOW()),
(5, 53,'2025-05-31', 81.52, 80.85,  0.67,   'HIGH',   'HIGH',   0, 'rule_based_v1.0', 0.79, NOW()),
(5, 54,'2025-06-30', 82.17, 81.52,  0.65,   'HIGH',   'HIGH',   0, 'rule_based_v1.0', 0.80, NOW()),
(5, 55,'2025-07-31', 82.78, 82.17,  0.61,   'HIGH',   'HIGH',   0, 'rule_based_v1.0', 0.80, NOW()),
(5, 56,'2025-08-31', 83.35, 82.78,  0.57,   'HIGH',   'HIGH',   0, 'rule_based_v1.0', 0.81, NOW()),
(5, 57,'2025-09-30', 83.94, 83.35,  0.59,   'HIGH',   'HIGH',   0, 'rule_based_v1.0', 0.82, NOW()),
(5, 58,'2025-10-31', 84.41, 83.94,  0.47,   'HIGH',   'HIGH',   0, 'rule_based_v1.0', 0.82, NOW()),
(5, 59,'2025-11-30', 84.92, 84.41,  0.51,   'HIGH',   'HIGH',   0, 'rule_based_v1.0', 0.83, NOW()),
(5, 60,'2025-12-31', 85.40, 84.92,  0.48,   'HIGH',   'HIGH',   0, 'rule_based_v1.0', 0.83, NOW()),
-- WALLET_01
(6, 61,'2025-01-31', 76.88, NULL,   NULL,   'HIGH',   NULL,     0, 'rule_based_v1.0', 0.76, NOW()),
(6, 62,'2025-02-28', 77.45, 76.88,  0.57,   'HIGH',   'HIGH',   0, 'rule_based_v1.0', 0.77, NOW()),
(6, 63,'2025-03-31', 78.02, 77.45,  0.57,   'HIGH',   'HIGH',   0, 'rule_based_v1.0', 0.77, NOW()),
(6, 64,'2025-04-30', 78.51, 78.02,  0.49,   'HIGH',   'HIGH',   0, 'rule_based_v1.0', 0.78, NOW()),
(6, 65,'2025-05-31', 79.12, 78.51,  0.61,   'HIGH',   'HIGH',   0, 'rule_based_v1.0', 0.78, NOW()),
(6, 66,'2025-06-30', 79.65, 79.12,  0.53,   'HIGH',   'HIGH',   0, 'rule_based_v1.0', 0.79, NOW()),
(6, 67,'2025-07-31', 80.15, 79.65,  0.50,   'HIGH',   'HIGH',   0, 'rule_based_v1.0', 0.79, NOW()),
(6, 68,'2025-08-31', 80.68, 80.15,  0.53,   'HIGH',   'HIGH',   0, 'rule_based_v1.0', 0.80, NOW()),
(6, 69,'2025-09-30', 81.17, 80.68,  0.49,   'HIGH',   'HIGH',   0, 'rule_based_v1.0', 0.80, NOW()),
(6, 70,'2025-10-31', 81.65, 81.17,  0.48,   'HIGH',   'HIGH',   0, 'rule_based_v1.0', 0.81, NOW()),
(6, 71,'2025-11-30', 82.12, 81.65,  0.47,   'HIGH',   'HIGH',   0, 'rule_based_v1.0', 0.81, NOW()),
(6, 72,'2025-12-31', 82.58, 82.12,  0.46,   'HIGH',   'HIGH',   0, 'rule_based_v1.0', 0.82, NOW());


-- ---------------------------------------------------------------------------
-- predictions  (30-day forward forecast from Dec 2025 reference)
-- ---------------------------------------------------------------------------
INSERT INTO predictions
  (product_id, period_date, predicted_score, predicted_tier,
   prediction_horizon_days, confidence, model_version, created_at)
VALUES
(1,'2026-01-31', 78.32, 'HIGH',   30, 0.73, 'reg_v1.0', NOW()),
(1,'2026-02-28', 78.79, 'HIGH',   60, 0.69, 'reg_v1.0', NOW()),
(1,'2026-03-31', 79.21, 'HIGH',   90, 0.65, 'reg_v1.0', NOW()),
(2,'2026-01-31', 84.82, 'HIGH',   30, 0.76, 'reg_v1.0', NOW()),
(2,'2026-02-28', 85.25, 'HIGH',   60, 0.72, 'reg_v1.0', NOW()),
(2,'2026-03-31', 85.64, 'HIGH',   90, 0.68, 'reg_v1.0', NOW()),
(3,'2026-01-31', 65.10, 'MEDIUM', 30, 0.71, 'reg_v1.0', NOW()),
(3,'2026-02-28', 65.58, 'MEDIUM', 60, 0.67, 'reg_v1.0', NOW()),
(3,'2026-03-31', 66.05, 'MEDIUM', 90, 0.63, 'reg_v1.0', NOW()),
(4,'2026-01-31', 89.35, 'HIGH',   30, 0.78, 'reg_v1.0', NOW()),
(4,'2026-02-28', 89.68, 'HIGH',   60, 0.74, 'reg_v1.0', NOW()),
(4,'2026-03-31', 90.02, 'HIGH',   90, 0.70, 'reg_v1.0', NOW()),
(5,'2026-01-31', 85.85, 'HIGH',   30, 0.76, 'reg_v1.0', NOW()),
(5,'2026-02-28', 86.29, 'HIGH',   60, 0.72, 'reg_v1.0', NOW()),
(5,'2026-03-31', 86.71, 'HIGH',   90, 0.68, 'reg_v1.0', NOW()),
(6,'2026-01-31', 83.03, 'HIGH',   30, 0.75, 'reg_v1.0', NOW()),
(6,'2026-02-28', 83.48, 'HIGH',   60, 0.71, 'reg_v1.0', NOW()),
(6,'2026-03-31', 83.91, 'HIGH',   90, 0.67, 'reg_v1.0', NOW());

-- ---------------------------------------------------------------------------
-- similar_products  (cluster assignments: cluster 0=ATM, cluster 1=Mobile/Card/Wallet, cluster 2=POS/QR)
-- ---------------------------------------------------------------------------
INSERT INTO similar_products
  (product_id, similar_product_id, similarity_score, cluster_id, model_version, computed_at)
VALUES
(1, 2, 0.82, 1, 'sim_v1.0', NOW()),
(1, 6, 0.78, 1, 'sim_v1.0', NOW()),
(2, 1, 0.82, 1, 'sim_v1.0', NOW()),
(2, 6, 0.74, 1, 'sim_v1.0', NOW()),
(3, 3, 1.00, 0, 'sim_v1.0', NOW()),
(4, 5, 0.79, 2, 'sim_v1.0', NOW()),
(5, 4, 0.79, 2, 'sim_v1.0', NOW()),
(6, 1, 0.78, 1, 'sim_v1.0', NOW()),
(6, 2, 0.74, 1, 'sim_v1.0', NOW());


-- ---------------------------------------------------------------------------
-- alerts  (representative alerts for Dec 2025 period)
-- ---------------------------------------------------------------------------
INSERT INTO alerts
  (product_id, alert_type, severity, title, message,
   metric_name, metric_value, threshold_value, previous_value,
   is_resolved, period_date, created_at)
VALUES
-- ATM downtime chronic
(3, 'downtime_spike',          'high',     'ATM Network: Elevated Downtime',
 'ATM Network uptime at 96.4% in Dec 2025, consistently below the 97.5% target for Q4 2025. Average monthly downtime: 6.1 hours.',
 'uptime_percentage', 96.4, 97.5, 96.6,
 0, '2025-12-31', NOW()),
-- ATM failure rate
(3, 'failure_rate_increase',   'medium',   'ATM Network: Transaction Failure Rate Above Threshold',
 'Transaction failure rate reached 5.77% in Dec 2025, exceeding the 5.0% alert threshold.',
 'transaction_success_rate', 94.23, 95.0, 94.41,
 0, '2025-12-31', NOW()),
-- Mobile Banking nearing HIGH tier - informational
(1, 'score_drop',              'low',      'Mobile Banking: Score Variance Alert',
 'Performance score growth slowed to +0.47 points in Dec 2025. Monitoring for potential plateau.',
 'score_change', 0.47, 1.00, 0.47,
 1, '2025-12-31', NOW()),
-- ATM complaint volume
(3, 'complaint_surge',         'medium',   'ATM Network: Complaint Volume Elevated',
 'Total complaints: 309 in Dec 2025. Resolved rate: 87.4%. Target resolution rate: 90%.',
 'resolved_complaints', 87.38, 90.0, 87.03,
 0, '2025-12-31', NOW()),
-- Historical: Card Banking downtime spike (resolved)
(2, 'downtime_spike',          'high',     'Card Banking: Downtime Spike in Oct 2025',
 'Uptime dropped to 97.7% in Oct 2025 due to scheduled maintenance overrun. 3.84 hours downtime recorded.',
 'uptime_percentage', 97.7, 98.0, 98.3,
 1, '2025-10-31', NOW()),
-- Historical: Mobile tier change celebration alert
(1, 'score_drop',              'low',      'Mobile Banking: Tier Upgraded to HIGH',
 'Mobile Banking crossed the HIGH tier threshold (75.0) in Jul 2025 with a score of 75.10.',
 'performance_score', 75.10, 75.0, 74.89,
 1, '2025-07-31', NOW());


-- ---------------------------------------------------------------------------
-- recommendations  (linked to Dec 2025 scores; score_id = row numbers 12,24,36,48,60,72)
-- ---------------------------------------------------------------------------
INSERT INTO recommendations
  (product_id, score_id, period_date, category, priority, title, description,
   trigger_metric, trigger_value, threshold_value, ai_explanation,
   is_acknowledged, created_at)
VALUES
-- MOBILE_01 (score_id=12)
(1, 12,'2025-12-31','user_adoption','medium',
 'Accelerate Active User Conversion',
 'Active user rate is 68.5%, below the 75% benchmark. Launch targeted in-app engagement campaigns and push-notification reminders for dormant users to improve monthly active usage.',
 'active_user_rate', 0.6853, 0.75,
 'Active user rate has plateaued in Q4 2025. Peer products (WALLET_01) show a higher 73% rate. Recommend A/B testing onboarding flows and personalised feature nudges.',
 0, NOW()),
(1, 12,'2025-12-31','infrastructure','low',
 'Reduce Average Response Time Below 400ms',
 'Average API response time is 424ms, above the 400ms SLA threshold. Profile slow endpoints and add Redis caching for frequently accessed balance and transaction data.',
 'avg_response_time_ms', 424.0, 400.0,
 'Response time is marginally above threshold but has been trending up since Oct 2025. Early intervention can prevent SLA breaches.',
 0, NOW()),
-- CARD_01 (score_id=24)
(2, 24,'2025-12-31','transactions','low',
 'Maintain Uptime Above 98.5% for Premium SLA',
 'Card Banking uptime averaged 98.0% in Dec 2025, below the 98.5% premium SLA. Coordinate with infrastructure team to reduce planned maintenance windows during peak hours.',
 'uptime_percentage', 98.0, 98.5,
 'Uptime dipped during Oct maintenance. Card products carry higher transaction volumes and revenue, making uptime SLA compliance critical.',
 0, NOW()),
-- ATM_01 (score_id=36)
(3, 36,'2025-12-31','infrastructure','high',
 'Urgent: Upgrade ATM Connectivity to Reduce Downtime',
 'ATM Network has sustained 5.7–6.6 hours/month downtime throughout 2025, far exceeding the 3-hour target. Prioritise upgrading last-mile connectivity on rural ATM clusters and deploy predictive maintenance alerting.',
 'downtime_hours', 6.10, 3.0,
 'Chronic downtime is the primary driver of the MEDIUM score tier. A 2-hour reduction would lift the operational efficiency score by ~4 points and could move ATM into HIGH tier.',
 0, NOW()),
(3, 36,'2025-12-31','transactions','high',
 'Reduce ATM Transaction Failure Rate Below 5%',
 'Failure rate is 5.77%. Root causes include network timeouts and card-reader sensor faults. Deploy firmware update to ATM fleets in Addis Ababa Region and increase cash replenishment frequency.',
 'transaction_success_rate', 0.9423, 0.95,
 'Failure rate has remained above threshold for all 12 months. Correlation analysis shows 73% of failures occur in last-mile rural ATMs during evening peak (18:00-21:00 EAT).',
 0, NOW()),
(3, 36,'2025-12-31','user_adoption','medium',
 'Improve ATM Complaint Resolution Rate to 90%',
 'Resolution rate is 87.4%, below the 90% target. Assign a dedicated Level-2 support queue for ATM-related complaints and implement automated SMS updates to complainants.',
 'resolved_complaints', 270.0, 309.0,
 'Unresolved complaints are negatively impacting NPS. Automated updates have shown a 12% reduction in escalations in comparable deployments.',
 0, NOW()),
-- POS_01 (score_id=48)
(4, 48,'2025-12-31','revenue','low',
 'Expand POS Merchant Onboarding to Tier-2 Cities',
 'POS revenue growth is strong (+29.5% YTD). Accelerate merchant onboarding in Dire Dawa, Bahir Dar, and Hawassa to capture additional transaction volume before competitor entry.',
 'total_revenue', 8001000.0, 7500000.0,
 'POS is the highest-scoring product. Expansion into Tier-2 cities is the highest-ROI lever to sustain growth momentum through 2026.',
 0, NOW()),
-- QR_01 (score_id=60)
(5, 60,'2025-12-31','user_adoption','medium',
 'Scale QR Pay User Base Through Merchant Incentives',
 'QR Pay user base grew 69% YTD (207K → 351K) with strong engagement (80.9% active rate). Sustain growth by offering zero-MDR promotions to new merchants for the first 6 months.',
 'active_user_rate', 0.8091, 0.80,
 'QR Pay shows the strongest growth trajectory. Merchant-side incentives are the primary driver of new user acquisition in comparable markets.',
 0, NOW()),
-- WALLET_01 (score_id=72)
(6, 72,'2025-12-31','transactions','low',
 'Introduce Wallet-to-Bank Sweep Feature',
 'Digital Wallet revenue per active user is ETB 6.18. Introducing an auto-sweep feature (wallet balance to savings account) would increase stickiness and drive cross-sell revenue.',
 'revenue_per_active_user', 6.1779, 7.0,
 'Revenue per active user has grown only 1.2% over 12 months. A sweep feature would incentivise higher wallet balances and increase transaction frequency by an estimated 15%.',
 0, NOW());


-- ---------------------------------------------------------------------------
-- reports
-- ---------------------------------------------------------------------------
INSERT INTO reports
  (report_type, format, title, period_start, period_end,
   file_path, file_size_bytes, is_ready, generated_by, generated_at, created_at)
VALUES
('monthly','pdf',   'Monthly Digital Banking Evaluation Report – Jan 2025', '2025-01-01','2025-01-31', '/app/reports/monthly_2025_01.pdf',   245760, 1, 2,'2025-02-03 07:15:00', NOW()),
('monthly','pdf',   'Monthly Digital Banking Evaluation Report – Feb 2025', '2025-02-01','2025-02-28', '/app/reports/monthly_2025_02.pdf',   248320, 1, 2,'2025-03-03 07:20:00', NOW()),
('monthly','pdf',   'Monthly Digital Banking Evaluation Report – Mar 2025', '2025-03-01','2025-03-31', '/app/reports/monthly_2025_03.pdf',   251904, 1, 2,'2025-04-02 07:10:00', NOW()),
('monthly','pdf',   'Monthly Digital Banking Evaluation Report – Apr 2025', '2025-04-01','2025-04-30', '/app/reports/monthly_2025_04.pdf',   249856, 1, 2,'2025-05-02 07:30:00', NOW()),
('monthly','pdf',   'Monthly Digital Banking Evaluation Report – May 2025', '2025-05-01','2025-05-31', '/app/reports/monthly_2025_05.pdf',   252928, 1, 2,'2025-06-02 07:25:00', NOW()),
('monthly','pdf',   'Monthly Digital Banking Evaluation Report – Jun 2025', '2025-06-01','2025-06-30', '/app/reports/monthly_2025_06.pdf',   255488, 1, 2,'2025-07-02 07:15:00', NOW()),
('monthly','pdf',   'Monthly Digital Banking Evaluation Report – Jul 2025', '2025-07-01','2025-07-31', '/app/reports/monthly_2025_07.pdf',   258048, 1, 2,'2025-08-04 07:10:00', NOW()),
('monthly','pdf',   'Monthly Digital Banking Evaluation Report – Aug 2025', '2025-08-01','2025-08-31', '/app/reports/monthly_2025_08.pdf',   260096, 1, 2,'2025-09-02 07:30:00', NOW()),
('monthly','pdf',   'Monthly Digital Banking Evaluation Report – Sep 2025', '2025-09-01','2025-09-30', '/app/reports/monthly_2025_09.pdf',   261632, 1, 2,'2025-10-02 07:20:00', NOW()),
('monthly','pdf',   'Monthly Digital Banking Evaluation Report – Oct 2025', '2025-10-01','2025-10-31', '/app/reports/monthly_2025_10.pdf',   263168, 1, 2,'2025-11-03 07:15:00', NOW()),
('monthly','pdf',   'Monthly Digital Banking Evaluation Report – Nov 2025', '2025-11-01','2025-11-30', '/app/reports/monthly_2025_11.pdf',   264704, 1, 2,'2025-12-02 07:25:00', NOW()),
('monthly','pdf',   'Monthly Digital Banking Evaluation Report – Dec 2025', '2025-12-01','2025-12-31', '/app/reports/monthly_2025_12.pdf',   267264, 1, 2,'2026-01-02 07:10:00', NOW()),
('monthly','excel', 'Monthly KPI Data Export – Dec 2025',                   '2025-12-01','2025-12-31', '/app/reports/monthly_2025_12.xlsx',  189440, 1, 4,'2026-01-02 07:45:00', NOW()),
('weekly', 'pdf',   'Weekly Evaluation Report – W51 2025',                  '2025-12-15','2025-12-21', '/app/reports/weekly_2025_W51.pdf',    98304, 1, 3,'2025-12-22 06:00:00', NOW()),
('weekly', 'pdf',   'Weekly Evaluation Report – W52 2025',                  '2025-12-22','2025-12-28', '/app/reports/weekly_2025_W52.pdf',    99840, 1, 3,'2025-12-29 06:00:00', NOW()),
('monthly','csv',   'Monthly Raw Data Export – Dec 2025',                   '2025-12-01','2025-12-31', '/app/reports/raw_export_2025_12.csv',  51200, 1, 4,'2026-01-02 08:00:00', NOW());


-- ---------------------------------------------------------------------------
-- audit_logs  (sample login and data-upload events)
-- ---------------------------------------------------------------------------
INSERT INTO audit_logs
  (user_id, action, resource, resource_id, details, ip_address, status, created_at)
VALUES
(1, 'USER_LOGIN',     'auth',         NULL,  '{"method":"password"}',                          '10.0.0.1',  'success', NOW()),
(2, 'USER_LOGIN',     'auth',         NULL,  '{"method":"password"}',                          '10.0.0.2',  'success', NOW()),
(4, 'DATA_UPLOAD',    'raw_data',     '1',   '{"batch_id":"SEED_2025","records":72}',           '10.0.0.4',  'success', NOW()),
(5, 'MODEL_ACTIVATE', 'model_registry','1',  '{"model":"rule_based_v1.0","previous":"none"}',  '10.0.0.5',  'success', NOW()),
(5, 'MODEL_ACTIVATE', 'model_registry','3',  '{"model":"reg_v1.0","previous":"none"}',         '10.0.0.5',  'success', NOW()),
(5, 'MODEL_ACTIVATE', 'model_registry','4',  '{"model":"sim_v1.0","previous":"none"}',         '10.0.0.5',  'success', NOW()),
(3, 'REPORT_GENERATE','reports',      '12',  '{"type":"monthly","period":"2025-12"}',           '10.0.0.3',  'success', NOW()),
(2, 'REPORT_VIEW',    'reports',      '12',  '{"format":"pdf"}',                               '10.0.0.2',  'success', NOW()),
(6, 'ALERT_VIEW',     'alerts',       '1',   '{"alert_type":"downtime_spike"}',                '10.0.0.6',  'success', NOW()),
(7, 'RECOMMENDATION_ACK','recommendations','3','{"product":"ATM_01","priority":"high"}',       '10.0.0.7',  'success', NOW()),
(1, 'USER_LOGOUT',    'auth',         NULL,  '{}',                                             '10.0.0.1',  'success', NOW()),
(4, 'DATA_VALIDATE',  'raw_data',     '1',   '{"batch_id":"SEED_2025","validated":72}',        '10.0.0.4',  'success', NOW());


-- =============================================================================
-- ADDITIONAL PERFORMANCE INDEXES
-- (Beyond those already defined inline in CREATE TABLE statements)
-- =============================================================================

-- Composite covering index for the dashboard "latest score per product" query
CREATE INDEX idx_scores_product_period_score
    ON scores (product_id, period_date DESC, performance_score);

-- Full-text search on alert messages and recommendation descriptions
ALTER TABLE alerts          ADD FULLTEXT INDEX ft_alerts_message (title, message);
ALTER TABLE recommendations ADD FULLTEXT INDEX ft_rec_desc (title, description, ai_explanation);

-- Partition-friendly range index on audit_logs for log retention queries
CREATE INDEX idx_audit_created_range ON audit_logs (created_at, user_id, action);

-- =============================================================================
-- VIEWS  (convenience views used by the API layer)
-- =============================================================================

-- Latest score per product
CREATE OR REPLACE VIEW vw_latest_scores AS
SELECT
    s.product_id,
    p.name                  AS product_name,
    p.code                  AS product_code,
    p.category,
    s.performance_score,
    s.previous_score,
    s.score_change,
    s.performance_tier,
    s.previous_tier,
    s.tier_changed,
    s.period_date,
    s.model_version,
    s.confidence
FROM scores s
JOIN products p ON p.id = s.product_id
WHERE s.id = (
    SELECT id FROM scores s2
    WHERE s2.product_id = s.product_id
    ORDER BY s2.period_date DESC
    LIMIT 1
)
ORDER BY s.performance_score DESC;

-- Product ranking view
CREATE OR REPLACE VIEW vw_product_rankings AS
SELECT
    RANK() OVER (ORDER BY performance_score DESC) AS rank_position,
    product_id,
    product_name,
    product_code,
    category,
    performance_score,
    performance_tier,
    score_change,
    period_date
FROM vw_latest_scores;

-- Open (unresolved) alerts summary
CREATE OR REPLACE VIEW vw_open_alerts AS
SELECT
    a.id,
    p.name       AS product_name,
    p.code       AS product_code,
    a.alert_type,
    a.severity,
    a.title,
    a.metric_name,
    a.metric_value,
    a.threshold_value,
    a.period_date,
    a.created_at
FROM alerts a
JOIN products p ON p.id = a.product_id
WHERE a.is_resolved = 0
ORDER BY
    FIELD(a.severity,'critical','high','medium','low'),
    a.created_at DESC;

-- =============================================================================
-- END OF SCHEMA
-- =============================================================================

-- =============================================================================
-- MIGRATION: Add BRD columns added after initial schema creation
-- Safe to run on existing databases — uses IF NOT EXISTS via stored procedure
-- Run this block if you imported init.sql before June 2026 update
-- =============================================================================

-- raw_data new columns
ALTER TABLE raw_data
    ADD COLUMN IF NOT EXISTS failed_txn_rate         DOUBLE  NULL COMMENT 'failed/total*100 (%)',
    ADD COLUMN IF NOT EXISTS downtime_minutes        DOUBLE  NULL COMMENT 'Total downtime in MINUTES',
    ADD COLUMN IF NOT EXISTS api_error_rate          DOUBLE  NULL COMMENT 'API error rate %',
    ADD COLUMN IF NOT EXISTS csat_score              DOUBLE  NULL COMMENT 'CSAT 1-5 from CRM',
    ADD COLUMN IF NOT EXISTS fraud_event_count       INT     NULL COMMENT 'Fraud events in period',
    ADD COLUMN IF NOT EXISTS security_incident_count INT     NULL COMMENT 'Security incidents';

-- processed_features new columns
ALTER TABLE processed_features
    ADD COLUMN IF NOT EXISTS failed_txn_rate_pct          DOUBLE  NULL,
    ADD COLUMN IF NOT EXISTS prev_complaint_volume        DOUBLE  NULL,
    ADD COLUMN IF NOT EXISTS complaint_resolution_rate    DOUBLE  NULL,
    ADD COLUMN IF NOT EXISTS norm_active_user_rate        DOUBLE  NULL,
    ADD COLUMN IF NOT EXISTS norm_revenue_per_active_user DOUBLE  NULL,
    ADD COLUMN IF NOT EXISTS norm_transaction_success_rate DOUBLE NULL,
    ADD COLUMN IF NOT EXISTS norm_operational_efficiency  DOUBLE  NULL,
    ADD COLUMN IF NOT EXISTS norm_complaint_growth_rate   DOUBLE  NULL,
    ADD COLUMN IF NOT EXISTS norm_downtime_impact         DOUBLE  NULL,
    ADD COLUMN IF NOT EXISTS norm_user_engagement_index   DOUBLE  NULL,
    ADD COLUMN IF NOT EXISTS norm_revenue_per_transaction DOUBLE  NULL,
    ADD COLUMN IF NOT EXISTS csat_score                   DOUBLE  NULL,
    ADD COLUMN IF NOT EXISTS fraud_event_count            INT     NULL,
    ADD COLUMN IF NOT EXISTS security_incident_count      INT     NULL,
    ADD COLUMN IF NOT EXISTS api_error_rate               DOUBLE  NULL,
    ADD COLUMN IF NOT EXISTS avg_session_duration_sec     DOUBLE  NULL,
    ADD COLUMN IF NOT EXISTS data_quality_flag            TINYINT(1) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS data_quality_notes           TEXT    NULL;

-- =============================================================================
-- END OF FILE
-- =============================================================================
