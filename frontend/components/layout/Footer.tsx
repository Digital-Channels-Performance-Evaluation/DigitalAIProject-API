"use client";
import { useState } from "react";
import { X, Shield, FileText, Database, Brain } from "lucide-react";
import AhaduLogo from "@/components/AhaduLogo";

// ── Modal content definitions ────────────────────────────────────────────────
const MODAL_CONTENT: Record<string, { title: string; icon: React.ElementType; body: React.ReactNode }> = {
  privacy: {
    title: "Privacy Policy",
    icon: Shield,
    body: (
      <div className="space-y-4 text-sm text-gray-600 leading-relaxed">
        <p className="font-semibold text-gray-900">Effective Date: January 1, 2027</p>

        <section>
          <h3 className="font-semibold text-gray-800 mb-1">1. Data We Process</h3>
          <p>The Ahadu Plus platform processes exclusively <strong>aggregated, product-level operational
          metrics</strong>. No individual customer personally identifiable information (PII) — including
          names, account numbers, transaction IDs, or biometric data — is collected, stored, or processed
          within this system.</p>
        </section>

        <section>
          <h3 className="font-semibold text-gray-800 mb-1">2. Data Sources</h3>
          <p>Data is sourced from Ahadu Bank's internal systems: Core Banking System (CBS), Digital
          Channel Middleware, Customer Relationship Management (CRM) platform, and IT Operations
          Monitoring. All data remains within Ahadu Bank's internal infrastructure.</p>
        </section>

        <section>
          <h3 className="font-semibold text-gray-800 mb-1">3. Data Retention</h3>
          <ul className="list-disc pl-4 space-y-1">
            <li>Raw ingested KPI data: retained for 24 months</li>
            <li>Processed model features: retained indefinitely for audit purposes</li>
            <li>Audit logs: retained for a minimum of 36 months</li>
          </ul>
        </section>

        <section>
          <h3 className="font-semibold text-gray-800 mb-1">4. Data Security</h3>
          <p>All data in transit is encrypted using TLS 1.2 or higher. Data at rest is encrypted using
          AES-256. Encryption keys are managed through Ahadu Bank's existing key management
          infrastructure. Backups are encrypted before transfer.</p>
        </section>

        <section>
          <h3 className="font-semibold text-gray-800 mb-1">5. Access Control</h3>
          <p>Access is governed by Role-Based Access Control (RBAC) with seven defined roles. The
          Principle of Least Privilege is enforced. Multi-Factor Authentication (MFA) is required for
          all dashboard users. Sessions expire after 30 minutes of inactivity.</p>
        </section>

        <section>
          <h3 className="font-semibold text-gray-800 mb-1">6. Regulatory Alignment</h3>
          <p>This system is designed to comply with the National Bank of Ethiopia's directives on data
          management, electronic banking, and IT risk management.</p>
        </section>
      </div>
    ),
  },

  terms: {
    title: "Terms of Use",
    icon: FileText,
    body: (
      <div className="space-y-4 text-sm text-gray-600 leading-relaxed">
        <p className="font-semibold text-gray-900">Last Updated: jun 5, 2026</p>

        <section>
          <h3 className="font-semibold text-gray-800 mb-1">1. Authorised Use</h3>
          <p>Access to Ahadu Plus is restricted to authorised Ahadu Bank employees and contractors
          with a valid user account. Credentials must not be shared, transferred, or used by
          any other person.</p>
        </section>

        <section>
          <h3 className="font-semibold text-gray-800 mb-1">2. Acceptable Use</h3>
          <ul className="list-disc pl-4 space-y-1">
            <li>Use the platform only for legitimate bank business purposes</li>
            <li>Do not attempt to access data outside your assigned role permissions</li>
            <li>Do not export, copy, or share reports with unauthorised parties</li>
            <li>Report any security vulnerabilities or access issues to the IT Security team immediately</li>
          </ul>
        </section>

        <section>
          <h3 className="font-semibold text-gray-800 mb-1">3. AI Outputs as Decision Support</h3>
          <p>All AI-generated scores, tier classifications, predictions, and recommendations are
          <strong> decision support tools only</strong>. They do not replace human judgment. All
          strategic decisions based on AI outputs must involve review and approval by qualified
          Ahadu Bank personnel.</p>
        </section>

        <section>
          <h3 className="font-semibold text-gray-800 mb-1">4. Prohibited Actions</h3>
          <ul className="list-disc pl-4 space-y-1">
            <li>Attempting to reverse-engineer, modify, or tamper with ML models or scoring algorithms</li>
            <li>Uploading false, fabricated, or manipulated data</li>
            <li>Using the platform to circumvent audit or compliance controls</li>
          </ul>
        </section>

        <section>
          <h3 className="font-semibold text-gray-800 mb-1">5. Account Suspension</h3>
          <p>Ahadu Bank reserves the right to suspend or revoke access for any user found to be in
          violation of these terms, pending investigation by the Digital Banking Department and
          IT Security team.</p>
        </section>

        <section>
          <h3 className="font-semibold text-gray-800 mb-1">6. Contact</h3>
          <p>For questions about these terms, contact the Digital Banking Department at
          <strong> digital@ahadubank.com</strong>.</p>
        </section>
      </div>
    ),
  },

  governance: {
    title: "Data Governance",
    icon: Database,
    body: (
      <div className="space-y-4 text-sm text-gray-600 leading-relaxed">
        <p className="font-semibold text-gray-900">Ahadu Bank Data Governance Framework — PULSE Platform</p>

        <section>
          <h3 className="font-semibold text-gray-800 mb-1">1. Data Ownership</h3>
          <p>The <strong>Digital Banking Department</strong> is the designated data owner and AI system
          owner for the PULSE platform. The Data Engineering team manages pipelines, preprocessing,
          and storage. Access to raw data is restricted to Data Engineering and ML Engineering roles.</p>
        </section>

        <section>
          <h3 className="font-semibold text-gray-800 mb-1">2. Data Quality Standards</h3>
          <ul className="list-disc pl-4 space-y-1">
            <li><strong>Completeness:</strong> All required KPI fields must be populated above threshold levels</li>
            <li><strong>Consistency:</strong> Derived fields must match their source calculations</li>
            <li><strong>Range validation:</strong> Values outside physically possible ranges are flagged</li>
            <li><strong>Drift detection:</strong> Current data distributions compared against training baselines weekly</li>
          </ul>
        </section>

        <section>
          <h3 className="font-semibold text-gray-800 mb-1">3. Data Versioning</h3>
          <p>All datasets are tagged with creation timestamps, source system identifiers, and version
          numbers. Model training datasets are versioned and linked to the models trained on them in
          the Model Registry.</p>
        </section>

        <section>
          <h3 className="font-semibold text-gray-800 mb-1">4. Score Challenge Process</h3>
          <p>Product teams may formally challenge a performance score through the Data Governance process.
          Challenged scores are reviewed within <strong>5 business days</strong> by the Digital Banking
          and Data Engineering teams. LOW-tier designations trigger mandatory human review before any
          strategic decision is made.</p>
        </section>

        <section>
          <h3 className="font-semibold text-gray-800 mb-1">5. Audit Trail</h3>
          <p>Every user action, data upload, model prediction, and system event is logged immutably
          in the audit_logs table. Audit records are retained for 36 months and are available to
          internal audit and compliance functions.</p>
        </section>

        <section>
          <h3 className="font-semibold text-gray-800 mb-1">6. Maintenance Schedule</h3>
          <ul className="list-disc pl-4 space-y-1">
            <li>Model retraining: Monthly or on drift detection</li>
            <li>Data pipeline health check: Daily</li>
            <li>API key rotation: Every 90 days</li>
            <li>Governance framework review: Annually</li>
          </ul>
        </section>
      </div>
    ),
  },

  ethics: {
    title: "AI Ethics",
    icon: Brain,
    body: (
      <div className="space-y-4 text-sm text-gray-600 leading-relaxed">
        <p className="font-semibold text-gray-900">Responsible AI Principles — Ahadu Bank PULSE</p>

        <section>
          <h3 className="font-semibold text-gray-800 mb-1">1. AI Augments, Not Replaces</h3>
          <p>The PULSE system is positioned as a <strong>decision support tool</strong>. All strategic
          decisions — including product investment, resource allocation, and risk actions — must involve
          human judgment. AI outputs are inputs to decisions, not decisions themselves.</p>
        </section>

        <section>
          <h3 className="font-semibold text-gray-800 mb-1">2. Transparency & Explainability</h3>
          <ul className="list-disc pl-4 space-y-1">
            <li>Every performance score includes a human-readable explanation of the top features that influenced it</li>
            <li>AI recommendations are expressed in plain language aligned to Ahadu Bank's operational terminology</li>
            <li>The Model Management section shows feature importance rankings for each trained model</li>
            <li>Model type, version, training date, and metrics are visible to authorised users</li>
          </ul>
        </section>

        <section>
          <h3 className="font-semibold text-gray-800 mb-1">3. Bias Prevention</h3>
          <p>Before every model version is deployed to production, a formal bias review is conducted to
          check for systematic scoring inequities. No digital product should receive a systematically
          lower score due solely to its operational scale or age.</p>
        </section>

        <section>
          <h3 className="font-semibold text-gray-800 mb-1">4. Fairness Standards</h3>
          <p>The scoring framework uses standardised, objective KPIs applied equally across all seven
          digital products. No product receives special weighting or preferential treatment outside
          the documented scoring methodology.</p>
        </section>

        <section>
          <h3 className="font-semibold text-gray-800 mb-1">5. Privacy by Design</h3>
          <p>No individual customer PII enters the ML pipeline at any stage. Only aggregated,
          product-level operational metrics are used. Data minimisation is enforced — only the
          minimum set of features required for inference is collected.</p>
        </section>

        <section>
          <h3 className="font-semibold text-gray-800 mb-1">6. Accountability</h3>
          <p>The Digital Banking Department is the designated AI system owner. The governance
          framework is reviewed annually and updated to reflect emerging regulatory guidance
          from the National Bank of Ethiopia.</p>
        </section>
      </div>
    ),
  },
};

// ── Footer component ─────────────────────────────────────────────────────────
export default function Footer() {
  const year = new Date().getFullYear();
  const [activeModal, setActiveModal] = useState<string | null>(null);

  const links = [
    { key: "privacy",    label: "Privacy Policy"  },
    { key: "terms",      label: "Terms of Use"    },
    { key: "governance", label: "Data Governance" },
    { key: "ethics",     label: "AI Ethics"       },
  ];

  const modal = activeModal ? MODAL_CONTENT[activeModal] : null;

  return (
    <>
      <footer className="relative overflow-hidden"
              style={{ background: "linear-gradient(135deg, #5E0B1E 0%, #7A0E28 50%, #9B1535 100%)" }}>

        {/* Decorative circles only — no text watermark */}
        <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute -bottom-6 -left-6 w-32 h-32 rounded-full bg-white/5 pointer-events-none" />

        {/* ── Bottom bar ────────────────────────────────────────────────────── */}
        <div className="relative z-10 px-6 py-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3">

            {/* Brand */}
            <div className="flex items-center gap-3">
              {/* White bg container — logo visible on crimson footer */}
              <div className="w-9 h-9 rounded-lg bg-white flex-shrink-0 shadow-sm
                              flex items-center justify-center p-1">
                <AhaduLogo size={28} />
              </div>
              <div>
                <div className="flex items-end gap-2">
                  <span className="text-white font-black text-sm tracking-tight">Ahadu Bank</span>
                  <div className="w-5 h-0.5 bg-white/70 mb-0.5" />
                </div>
                <p className="text-white/50 text-[9px] tracking-widest uppercase leading-tight">
                  Performance Evaluation Platform
                </p>
              </div>
            </div>

            {/* Links — clickable */}
            <div className="flex items-center gap-1 flex-wrap justify-center">
              {links.map(({ key, label }, i) => (
                <span key={key} className="flex items-center gap-1">
                  {i > 0 && <span className="text-white/20 text-xs">·</span>}
                  <button
                    onClick={() => setActiveModal(key)}
                    className="text-[11px] text-white/60 hover:text-white transition
                               underline underline-offset-2 decoration-white/30
                               hover:decoration-white/70"
                  >
                    {label}
                  </button>
                </span>
              ))}
            </div>

            {/* Copyright */}
            <div className="text-right">
              <p className="text-white/50 text-[10px]">
                © {year} Ahadu Bank S.C. All rights reserved.
              </p>
              <p className="text-white/30 text-[9px] mt-0.5">
                Powered by AI · Built for Ahadu Bank Digital Banking
              </p>
            </div>
          </div>
        </div>
      </footer>

      {/* ── Policy Modal ────────────────────────────────────────────────────── */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
             style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
             onClick={() => setActiveModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh]
                          flex flex-col overflow-hidden"
               onClick={e => e.stopPropagation()}>

            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100"
                 style={{ background: "linear-gradient(135deg, #7A0E28, #9B1535)" }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                  <modal.icon size={16} className="text-white" />
                </div>
                <h2 className="text-white font-bold text-base">{modal.title}</h2>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex
                           items-center justify-center transition"
              >
                <X size={14} className="text-white" />
              </button>
            </div>

            {/* Modal body */}
            <div className="overflow-y-auto flex-1 px-6 py-5">
              {modal.body}
            </div>

            {/* Modal footer */}
            <div className="px-6 py-4 border-t border-gray-100 flex justify-between
                            items-center bg-gray-50">
              <p className="text-[10px] text-gray-400">
                Ahadu Bank S.C. · Digital Banking Department
              </p>
              <button
                onClick={() => setActiveModal(null)}
                className="text-xs font-semibold px-4 py-2 rounded-lg text-white transition"
                style={{ background: "#9B1535" }}
                onMouseEnter={e => (e.currentTarget.style.background = "#7A0E28")}
                onMouseLeave={e => (e.currentTarget.style.background = "#9B1535")}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
