"use client";
import { useState, useEffect } from "react";
import { Upload, CheckCircle2, AlertTriangle, Settings } from "lucide-react";
import Header from "@/components/layout/Header";
import api from "@/lib/api";
import { toast } from "sonner";
import { refreshBus } from "@/lib/refresh-bus";

type StepStatus = "pending" | "running" | "done" | "error";
type Step = { label: string; status: StepStatus; detail?: string };

export default function SettingsPage() {
  const [file, setFile]             = useState<File | null>(null);
  const [uploading, setUploading]   = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [uploadSteps, setUploadSteps]   = useState<Step[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [autoTrainEnabled, setAutoTrainEnabled] = useState(false);
  const [autoTrainLoading, setAutoTrainLoading] = useState(false);

  // Fetch auto-train config on mount
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await api.get("/ml/config/auto-train");
        setAutoTrainEnabled(res.data.auto_train_on_upload);
      } catch (err) {
        // Silently fail - user might not have permission
      }
    };
    fetchConfig();
  }, []);

  const handleToggleAutoTrain = async () => {
    setAutoTrainLoading(true);
    try {
      const res = await api.post("/ml/config/auto-train", null, {
        params: { enabled: !autoTrainEnabled }
      });
      setAutoTrainEnabled(!autoTrainEnabled);
      toast.success(res.data.message);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to update auto-train setting");
    } finally {
      setAutoTrainLoading(false);
    }
  };

  const updateStep = (i: number, s: StepStatus, d?: string) =>
    setUploadSteps(prev => prev.map((x, j) => j === i ? { ...x, status: s, detail: d ?? x.detail } : x));

  // Single-step: upload → backend auto-runs feature engineering + retraining
  const uploadFile = async () => {
    if (!file) return;
    setUploading(true);
    setUploadResult(null);
    setValidationErrors([]);
    
    const steps: Step[] = [
      { label: "Reading & validating file",                       status: "pending" },
      { label: "Importing to database",                           status: "pending" },
      { label: "Feature engineering & scoring (background)",      status: "pending" },
      { label: "Alerts & AI recommendations (background)",        status: "pending" },
    ];
    
    if (autoTrainEnabled) {
      steps.push({ label: "Training ML models (background)",      status: "pending" });
    }
    
    steps.push({ label: "Refreshing all dashboard pages",         status: "pending" });
    
    setUploadSteps(steps);

    try {
      updateStep(0, "running");
      const form = new FormData();
      form.append("file", file);
      updateStep(0, "done");

      updateStep(1, "running");
      const res = await api.post("/data/upload", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data.status === "validation_failed") {
        updateStep(0, "error");
        updateStep(1, "error");
        setValidationErrors(res.data.validation?.errors || ["Validation failed"]);
        toast.error("Data validation failed — see errors below.");
        setUploadSteps([]);
        return;
      }

      if (res.data.status === "no_rows_imported") {
        updateStep(1, "error", "No rows imported");
        toast.error("No rows were imported. Check your file.");
        return;
      }

      const channelCount = res.data.products_in_upload?.length ?? 0;
      updateStep(1, "done", `${res.data.rows_imported} rows · ${channelCount} channel(s)`);

      // Background pipeline started automatically on the server
      updateStep(2, "running");
      await new Promise(r => setTimeout(r, 400));
      updateStep(2, "done", "running in background");

      updateStep(3, "running");
      await new Promise(r => setTimeout(r, 200));
      updateStep(3, "done", "running in background");

      let finalStepIndex = 4;
      if (autoTrainEnabled) {
        updateStep(4, "running");
        await new Promise(r => setTimeout(r, 200));
        updateStep(4, "done", "running in background");
        finalStepIndex = 5;
      }

      updateStep(finalStepIndex, "running");
      refreshBus.emit();
      await new Promise(r => setTimeout(r, 200));
      updateStep(finalStepIndex, "done");

      setUploadResult(res.data);
      const trainingMsg = autoTrainEnabled 
        ? "Feature engineering & model training running in background."
        : "Feature engineering running in background.";
      toast.success(
        `✓ ${res.data.rows_imported} row(s) imported for ${channelCount} channel(s). ${trainingMsg}`
      );
      res.data.warnings?.forEach((w: string) => toast.warning(w));

      setFile(null);
      const inp = document.getElementById("file-upload") as HTMLInputElement;
      if (inp) inp.value = "";
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Upload failed");
      setUploadSteps([]);
    } finally {
      setUploading(false);
      setTimeout(() => setUploadSteps([]), 6000);
    }
  };

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
      <Header
        title="Settings"
        subtitle="Upload KPI data — feature engineering, scoring and model retraining run automatically"
      />
      <div className="p-6 space-y-5 max-w-3xl">
        {/* ── Auto-Train Configuration ────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-sm font-bold flex-shrink-0">
                <Settings size={14} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Model Training Mode</h3>
                <p className="text-xs text-gray-500">
                  Control when ML models are automatically trained
                </p>
              </div>
            </div>
            <button
              onClick={handleToggleAutoTrain}
              disabled={autoTrainLoading}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                autoTrainEnabled 
                  ? "bg-amber-500 focus:ring-amber-500" 
                  : "bg-gray-200 focus:ring-gray-400"
              } ${autoTrainLoading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  autoTrainEnabled ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {autoTrainEnabled ? (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-xs font-semibold text-amber-800 mb-1.5 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                Development Mode: Auto-Training Enabled
              </p>
              <p className="text-xs text-amber-700 leading-relaxed">
                Models will automatically train on every data upload. This adds 20-30 seconds to each upload 
                but ensures models are always up-to-date. Best for development and testing.
              </p>
              <p className="text-xs text-amber-600 mt-2 font-medium">
                💡 Recommended: Disable for production to keep uploads fast.
              </p>
            </div>
          ) : (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <p className="text-xs font-semibold text-green-800 mb-1.5 flex items-center gap-2">
                <CheckCircle2 size={12} className="text-green-600" />
                Production Mode: Manual Training (Recommended)
              </p>
              <p className="text-xs text-green-700 leading-relaxed">
                Uploads are fast (~2 seconds). Models use existing training for predictions. 
                Train models manually when needed or schedule periodic retraining.
              </p>
              <p className="text-xs text-green-600 mt-2 font-medium">
                ⚡ This is the recommended setting for production environments.
              </p>
            </div>
          )}
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

        {/* ── Upload card ───────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-[#9B1535] text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
              <Upload size={14} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Upload KPI Data</h3>
              <p className="text-xs text-gray-500">
                Import CSV or XLSX — {autoTrainEnabled 
                  ? "models will train automatically (~30s per upload)" 
                  : "fast predictions with existing models (~2s)"}
              </p>
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
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              id="file-upload"
              className="hidden"
              onChange={e => {
                setFile(e.target.files?.[0] || null);
                setValidationErrors([]);
                setUploadResult(null);
              }}
            />
            <Upload size={22} className="text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500 font-medium">
              {file ? file.name : "Click or drag & drop file here"}
            </p>
            <p className="text-xs text-gray-400 mt-1">CSV or XLSX · Use Upload_Ready sheet for Excel</p>
          </div>

          {file && (
            <button
              onClick={uploadFile}
              disabled={uploading}
              className="w-full py-2.5 text-white text-sm rounded-lg font-medium transition
                         disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ background: uploading ? "#9CA3AF" : "linear-gradient(135deg,#7A0E28,#9B1535)" }}
            >
              {uploading ? "Uploading & processing..." : `Import "${file.name}"`}
            </button>
          )}

          {uploadSteps.length > 0 && <StepList steps={uploadSteps} />}

          {uploadResult && !uploading && (
            <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-xl text-xs text-green-700">
              <p className="font-semibold">
                ✓ {uploadResult.rows_imported} row(s) imported
                {uploadResult.products_in_upload?.length
                  ? ` · ${uploadResult.products_in_upload.length} channel(s) queued for processing`
                  : ""}
              </p>
              <p className="text-green-600 mt-0.5">
                Feature engineering and scoring {autoTrainEnabled ? "and model training " : ""}
                running in the background. Dashboard pages will refresh automatically when complete.
              </p>
            </div>
          )}

          <div className="mt-4 bg-[#FBF0F3] rounded-lg p-3 text-xs text-gray-600">
            <p className="font-semibold text-[#7A0E28] mb-1">Required columns:</p>
            <p className="font-mono text-[10px] leading-relaxed">
              product_code · period_date · total_users · active_users · total_transactions ·
              successful_transactions · failed_transactions · total_revenue · uptime_percentage ·
              downtime_hours · total_complaints · resolved_complaints
            </p>
            <p className="mt-2 text-gray-500">
              <span className="font-medium text-[#7A0E28]">Channels:</span> the{" "}
              <span className="font-mono">product_code</span> column identifies each channel.
              Multiple channels can be included in the same file — each is processed independently.
            </p>
          </div>
        </div>

        {/* What happens automatically */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-card p-5">
          <p className="text-xs font-semibold text-gray-700 mb-3">What happens after upload</p>
          <div className="space-y-1.5 text-xs text-gray-500">
            {[
              "Compute 12 engineered features per channel (active user rate, downtime, complaint growth, etc.)",
              "Score each uploaded channel using active ML models — normalised to 0–95 range",
              "Generate threshold-based alerts (score drops, downtime spikes, failure rates, CSAT)",
              "Generate AI recommendations from actual metric values — channel-specific",
              ...(autoTrainEnabled ? [
                "Auto-retrain all 5 ML models (LR, RF, DT, GB, Ridge) on updated dataset",
                "Auto-select best classifier (lowest log-loss) and best regressor (lowest MAE)",
              ] : [
                "Use existing trained models for predictions (manual training available)"
              ]),
              "Refresh dashboard: Products · Scores · Rankings · Alerts · Recommendations · Predictions",
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
