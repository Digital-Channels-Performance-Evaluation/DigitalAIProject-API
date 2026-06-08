"use client";
import { useState } from "react";
import { Upload, Database, RefreshCw, CheckCircle2, AlertTriangle, ArrowRight } from "lucide-react";
import Header from "@/components/layout/Header";
import api from "@/lib/api";
import { toast } from "sonner";
import { refreshBus } from "@/lib/refresh-bus";

type StepStatus = "pending" | "running" | "done" | "error";
type Step = { label: string; status: StepStatus; detail?: string };

export default function SettingsPage() {
  const [file, setFile]               = useState<File | null>(null);
  const [uploading, setUploading]     = useState(false);
  const [engineering, setEngineering] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [engineerResult, setEngineerResult] = useState<any>(null);
  const [uploadSteps, setUploadSteps] = useState<Step[]>([]);
  const [engineerSteps, setEngineerSteps] = useState<Step[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const updateUploadStep  = (i: number, s: StepStatus, d?: string) =>
    setUploadSteps(prev => prev.map((x, j) => j === i ? { ...x, status: s, detail: d ?? x.detail } : x));
  const updateEngineerStep = (i: number, s: StepStatus, d?: string) =>
    setEngineerSteps(prev => prev.map((x, j) => j === i ? { ...x, status: s, detail: d ?? x.detail } : x));

  const retrainModels = () => {
    const types = ["classification", "regression", "random_forest", "decision_tree", "similarity"];
    Promise.allSettled(
      types.map(t => api.post("/ml/retrain", { model_type: t, reason: "auto-retrain after pipeline" }).catch(() => {}))
    );
  };

  // ── Step 1: Upload raw data only ────────────────────────────────────────
  const uploadFile = async () => {
    if (!file) return;
    setUploading(true);
    setUploadResult(null);
    setValidationErrors([]);
    setUploadSteps([
      { label: "Reading file",                status: "pending" },
      { label: "Validating columns & values", status: "pending" },
      { label: "Importing to database",       status: "pending" },
    ]);

    try {
      updateUploadStep(0, "running");
      const form = new FormData();
      form.append("file", file);
      updateUploadStep(0, "done");

      updateUploadStep(1, "running");
      updateUploadStep(1, "done");

      updateUploadStep(2, "running");
      const res = await api.post("/data/upload", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data.status === "validation_failed") {
        updateUploadStep(1, "error");
        updateUploadStep(2, "error");
        setValidationErrors(res.data.validation?.errors || ["Validation failed"]);
        toast.error("Data validation failed — see errors below.");
        setUploadSteps([]);
        return;
      }

      updateUploadStep(2, "done", `${res.data.rows_imported} rows imported`);
      setUploadResult(res.data);
      toast.success(`✓ ${res.data.rows_imported} row(s) imported. Now click "Run Feature Engineering" to compute scores.`);
      res.data.warnings?.forEach((w: string) => toast.warning(w));

      setFile(null);
      const inp = document.getElementById("file-upload") as HTMLInputElement;
      if (inp) inp.value = "";
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Upload failed");
      setUploadSteps([]);
    } finally {
      setUploading(false);
      setTimeout(() => setUploadSteps([]), 4000);
    }
  };

  // ── Step 2: Feature engineering → score → alerts → recommendations ─────
  const runEngineering = async () => {
    setEngineering(true);
    setEngineerResult(null);
    setEngineerSteps([
      { label: "Computing 12 engineered features",         status: "pending" },
      { label: "Scoring all products (ML models)",         status: "pending" },
      { label: "Generating alerts",                        status: "pending" },
      { label: "Generating AI recommendations",            status: "pending" },
      { label: "Retraining ML models (background)",        status: "pending" },
      { label: "Refreshing all dashboard pages",           status: "pending" },
    ]);

    try {
      updateEngineerStep(0, "running");
      const res = await api.post("/data/engineer");
      updateEngineerStep(0, "done", `${res.data.features_computed} records`);
      updateEngineerStep(1, "done", `${res.data.products_scored?.length || 0} product(s)`);
      updateEngineerStep(2, "done");
      updateEngineerStep(3, "done");

      updateEngineerStep(4, "running");
      retrainModels();
      await new Promise(r => setTimeout(r, 300));
      updateEngineerStep(4, "done", "background job started");

      updateEngineerStep(5, "running");
      refreshBus.emit();
      await new Promise(r => setTimeout(r, 200));
      updateEngineerStep(5, "done");

      setEngineerResult(res.data);
      toast.success(
        `✓ ${res.data.features_computed} features computed · ` +
        `${res.data.products_scored?.length || 0} product(s) scored · ` +
        `All pages updated`
      );
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Feature engineering failed");
      setEngineerSteps([]);
    } finally {
      setEngineering(false);
      setTimeout(() => setEngineerSteps([]), 5000);
    }
  };

  const isRunning = uploading || engineering;

  const StepList = ({ steps }: { steps: Step[] }) => (
    <div className="mt-4 bg-gray-50 rounded-xl border border-gray-100 p-4 space-y-2">
      {steps.map((step, i) => (
        <div key={i} className="flex items-start gap-3">
          <div className="w-5 h-5 flex-shrink-0 flex items-center justify-center mt-0.5">
            {step.status === "done"    && <CheckCircle2 size={15} className="text-green-600" />}
            {step.status === "running" && (
              <svg className="animate-spin w-4 h-4 text-[#9B1535]" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
            )}
            {step.status === "error"   && <AlertTriangle size={14} className="text-red-500" />}
            {step.status === "pending" && <div className="w-3 h-3 rounded-full bg-gray-200 mt-0.5 ml-0.5" />}
          </div>
          <span className={`text-xs ${
            step.status === "done"    ? "text-green-700 font-medium" :
            step.status === "running" ? "text-[#9B1535] font-semibold" :
            step.status === "error"   ? "text-red-600 font-medium" : "text-gray-400"
          }`}>
            {step.label}{step.status === "running" ? "..." : ""}
            {step.detail && step.status === "done" && (
              <span className="text-gray-400 font-normal ml-1.5">({step.detail})</span>
            )}
          </span>
        </div>
      ))}
    </div>
  );

  return (
    <div>
      <Header title="Settings" subtitle="Two-step pipeline: upload data, then run feature engineering" />
      <div className="p-6 space-y-5 max-w-3xl">

        {/* Workflow hint */}
        <div className="flex items-center gap-3 text-xs text-gray-500 bg-white rounded-xl border border-gray-100 p-3 shadow-card">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-[#9B1535] text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0">1</div>
            <span className="font-medium text-gray-700">Upload CSV/XLSX</span>
          </div>
          <ArrowRight size={13} className="text-gray-300 flex-shrink-0" />
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-[#9B1535] text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0">2</div>
            <span className="font-medium text-gray-700">Run Feature Engineering</span>
          </div>
          <ArrowRight size={13} className="text-gray-300 flex-shrink-0" />
          <span className="text-gray-400">Scores · Alerts · Recommendations · Models updated automatically</span>
        </div>

        {/* Validation errors */}
        {validationErrors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-xs font-semibold text-red-700 mb-2">✗ Validation Failed</p>
            {validationErrors.map((e, i) => (
              <p key={i} className="text-xs text-red-600">• {e}</p>
            ))}
          </div>
        )}

        {/* ── STEP 1: Upload ─────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-[#9B1535] text-white flex items-center justify-center text-sm font-bold flex-shrink-0">1</div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Upload KPI Data</h3>
              <p className="text-xs text-gray-500">Import raw CSV or XLSX into the database</p>
            </div>
          </div>

          <div
            className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center mb-4
                        hover:border-[#BE1B3C] transition cursor-pointer"
            onClick={() => document.getElementById("file-upload")?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => {
              e.preventDefault();
              const f = e.dataTransfer.files[0];
              if (f) { setFile(f); setValidationErrors([]); setUploadResult(null); }
            }}
          >
            <input type="file" accept=".csv,.xlsx,.xls" id="file-upload" className="hidden"
              onChange={e => { setFile(e.target.files?.[0] || null); setValidationErrors([]); setUploadResult(null); }} />
            <Upload size={22} className="text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500 font-medium">
              {file ? file.name : "Click or drag & drop file here"}
            </p>
            <p className="text-xs text-gray-400 mt-1">CSV or XLSX · Use Upload_Ready sheet for Excel</p>
          </div>

          {file && (
            <button onClick={uploadFile} disabled={isRunning}
              className="w-full py-2.5 text-white text-sm rounded-lg font-medium transition
                         disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ background: uploading ? "#9CA3AF" : "linear-gradient(135deg,#7A0E28,#9B1535)" }}>
              {uploading ? "Uploading..." : `Import "${file.name}"`}
            </button>
          )}

          {uploadSteps.length > 0 && <StepList steps={uploadSteps} />}

          {uploadResult && !uploading && (
            <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-xl text-xs text-green-700">
              <span className="font-semibold">✓ {uploadResult.rows_imported} row(s) imported</span>
              <span className="text-green-600 ml-2">— proceed to Step 2 to compute scores</span>
            </div>
          )}

          <div className="mt-4 bg-[#FBF0F3] rounded-lg p-3 text-xs text-gray-600">
            <p className="font-semibold text-[#7A0E28] mb-1">Required columns:</p>
            <p className="font-mono text-[10px] leading-relaxed">
              product_code · period_date · total_users · active_users · total_transactions ·
              successful_transactions · failed_transactions · total_revenue · uptime_percentage ·
              downtime_hours · total_complaints · resolved_complaints
            </p>
          </div>
        </div>

        {/* ── STEP 2: Feature Engineering ───────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-card p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#9B1535] text-white flex items-center justify-center text-sm font-bold flex-shrink-0">2</div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Run Feature Engineering</h3>
                <p className="text-xs text-gray-500">
                  Compute features → score products → generate alerts & recommendations → auto-retrain all models → select best model
                </p>
              </div>
            </div>
            <button onClick={runEngineering} disabled={isRunning}
              className="flex items-center gap-1.5 text-xs text-white px-4 py-2.5 rounded-lg
                         font-semibold transition disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ background: isRunning ? "#9CA3AF" : "linear-gradient(135deg,#7A0E28,#9B1535)" }}>
              <RefreshCw size={12} className={engineering ? "animate-spin" : ""} />
              {engineering ? "Processing..." : "Run Engineering"}
            </button>
          </div>

          {engineerSteps.length > 0 && <StepList steps={engineerSteps} />}

          {engineerResult && !engineering && (
            <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-xl text-xs">
              <p className="font-semibold text-green-800 mb-1.5">
                ✓ {engineerResult.features_computed} features computed
              </p>
              {engineerResult.products_scored?.length > 0 && (
                <div className="grid grid-cols-2 gap-1.5">
                  {engineerResult.products_scored.map((p: any) => (
                    <div key={p.product_id} className="flex items-center justify-between bg-white rounded px-2.5 py-1.5 border border-green-100">
                      <span className="text-gray-600 text-[10px]">Product {p.product_id}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-[#7A0E28] text-[11px]">{p.score?.toFixed(1)}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                          p.tier === "HIGH"   ? "bg-green-100 text-green-700" :
                          p.tier === "MEDIUM" ? "bg-yellow-100 text-yellow-700" :
                          "bg-red-100 text-red-700"
                        }`}>{p.tier}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-green-600 text-[10px] mt-2">
                Dashboard · Products · Scores · Rankings · Alerts · Recommendations — all refreshed.
              </p>
            </div>
          )}

          <div className="mt-4 text-xs text-gray-500 space-y-1">
            {[
              "Recompute all 12 ML features (active user rate, downtime impact, complaint growth, etc.)",
              "Score all products using the active ML models — normalised to 0–95 range",
              "Generate dynamic threshold-based alerts (score drops, downtime spikes, failure rates, CSAT)",
              "Generate AI recommendations from actual metric values (product-specific, dataset-driven)",
              "Auto-retrain all 5 ML models (LR, RF, DT, GB, Regression) in the background",
              "Auto-select best classifier by lowest log-loss and best regressor by lowest MAE",
              "Refresh all dashboard pages: Products, Scores, Rankings, Alerts, Recommendations, Predictions",
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-[#9B1535] mt-0.5 flex-shrink-0">→</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
