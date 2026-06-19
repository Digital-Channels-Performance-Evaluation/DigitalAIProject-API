"use client";
import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  RefreshCw, CheckCircle, ChevronDown, ChevronUp, BarChart2,
  Star, Trophy, Zap, Lock, Play, Loader2, AlertTriangle,
} from "lucide-react";
import Header from "@/components/layout/Header";
import api from "@/lib/api";
import { useRefresh } from "@/lib/use-refresh";
import { useAuthStore } from "@/lib/auth-store";
import { toast } from "sonner";

interface Model {
  id: number;
  model_name: string;
  model_type: string;
  version: string;
  accuracy: number | null;
  f1_score: number | null;
  r2_score: number | null;
  mae: number | null;
  mse: number | null;
  training_date: string | null;
  dataset_version: string | null;
  training_samples: number | null;
  is_active: boolean;
  created_at: string;
  hyperparameters?: string | null;
}

interface DriftReport {
  model_id: number;
  model_name: string;
  model_type: string;
  weeks_since_training: number;
  drift_detected: boolean;
  recommendation: string;
}

interface BestSelection {
  category: string;
  selected_model: string;
  model_type: string;
  version: string;
  log_loss?: number | null;
  mae?: number | null;
  f1_score?: number | null;
  accuracy?: number | null;
  reason: string;
}

interface TaskStatus {
  task_id: string;
  status: "PENDING" | "PROGRESS" | "SUCCESS" | "FAILURE";
  progress?: { current: number; total: number; model_type: string };
  result?: Record<string, unknown>;
  error?: string;
}

const MODEL_CATALOGUE = [
  {
    type: "classification", label: "Logistic Regression", icon: "LR", color: "#9B1535",
    desc: "Interpretable linear classifier for HIGH / MEDIUM / LOW tier prediction.",
    detail: "Multinomial solver with L2 regularisation. Fast inference, highly explainable.",
    lossLabel: "Log-Loss", lossField: "mse" as const,
  },
  {
    type: "random_forest", label: "Random Forest", icon: "RF", color: "#7A0E28",
    desc: "Ensemble of decision trees for robust tier classification.",
    detail: "Bagging ensemble — reduces variance, provides feature importance rankings.",
    lossLabel: "Log-Loss", lossField: "mse" as const,
  },
  {
    type: "decision_tree", label: "Decision Tree", icon: "DT", color: "#5E0B1E",
    desc: "Single interpretable tree — visualisable decision rules for each tier.",
    detail: "Max depth 8, Gini criterion. Every decision path can be explained.",
    lossLabel: "Log-Loss", lossField: "mse" as const,
  },
  {
    type: "regression", label: "Ridge Regression", icon: "RR", color: "#BE1B3C",
    desc: "Continuous score predictor (0–100) with L2 regularisation.",
    detail: "Provides the numeric performance score. Paired with the classifier.",
    lossLabel: "MSE", lossField: "mse" as const,
  },
  {
    type: "gradient_boosting", label: "Gradient Boosting", icon: "GB", color: "#6B21A8",
    desc: "Sequential ensemble — often best log-loss among all classifiers.",
    detail: "n_estimators=50, max_depth=4, learning_rate=0.1.",
    lossLabel: "Log-Loss", lossField: "mse" as const,
  },
  {
    type: "similarity", label: "KNN Similarity", icon: "KNN", color: "#E0809A",
    desc: "K-Nearest Neighbours for product peer-comparison.",
    detail: "k=3, Euclidean distance. Groups similar products into clusters.",
    lossLabel: null, lossField: null,
  },
];

const CLF_TYPES = new Set(["classification", "random_forest", "decision_tree", "gradient_boosting"]);
const TRAIN_ROLES = new Set(["super_admin", "ml_engineer"]);
const POLL_INTERVAL_MS = 2500;

export default function ModelsPage() {
  const { user, _hasHydrated } = useAuthStore();
  // Wait for localStorage hydration before evaluating role — prevents the
  // button from being hidden because user was null on the first render tick.
  const canTrain = _hasHydrated && user ? TRAIN_ROLES.has(user.role) : false;

  const [models,        setModels]        = useState<Model[]>([]);
  const [drift,         setDrift]         = useState<DriftReport[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [expanded,      setExpanded]      = useState<number | null>(null);
  const [selectingBest, setSelectingBest] = useState(false);
  const [bestResult,    setBestResult]    = useState<BestSelection[] | null>(null);

  // Training task state — one active task at a time
  const [activeTask,    setActiveTask]    = useState<TaskStatus | null>(null);
  const [trainingType,  setTrainingType]  = useState<string | null>(null); // "all" | model_type
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async (silent = false) => {
    try {
      const [modelsRes, driftRes] = await Promise.all([
        api.get("/ml/models"),
        api.get("/ml/drift"),
      ]);
      setModels(modelsRes.data);
      setDrift(driftRes.data);
    } catch {
      if (!silent) toast.error("Failed to load model data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useRefresh(load);

  // ── Task polling ────────────────────────────────────────────────────────
  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const startPolling = useCallback((taskId: string, mode: "celery" | "thread") => {
    stopPolling();
    let threadCheckCount = 0;

    pollRef.current = setInterval(async () => {
      try {
        if (mode === "thread") {
          // Thread mode: no Celery worker — poll model list for a version change instead
          threadCheckCount++;
          const res = await api.get("/ml/models");
          const latest: Model[] = res.data;
          // After 5s minimum, check if any model was trained after the task started
          if (threadCheckCount >= 2) {
            const recentlyTrained = latest.some(m => {
              if (!m.training_date) return false;
              const t = new Date(m.training_date).getTime();
              return Date.now() - t < 120_000; // trained within last 2 minutes
            });
            if (recentlyTrained || threadCheckCount > 40) { // max ~100s
              stopPolling();
              setTrainingType(null);
              setActiveTask({ task_id: taskId, status: "SUCCESS" });
              toast.success("Training complete — models updated");
              setModels(latest);
            }
          }
        } else {
          // Celery mode: poll task status endpoint
          const res = await api.get<TaskStatus>(`/ml/task/${taskId}`);
          setActiveTask(res.data);
          if (res.data.status === "SUCCESS") {
            stopPolling();
            setTrainingType(null);
            toast.success("Training complete — models updated");
            await load(true);
          } else if (res.data.status === "FAILURE") {
            stopPolling();
            setTrainingType(null);
            toast.error(`Training failed: ${res.data.error || "unknown error"}`);
          }
        }
      } catch {
        stopPolling();
        setTrainingType(null);
      }
    }, POLL_INTERVAL_MS);
  }, [stopPolling, load]);

  useEffect(() => () => stopPolling(), [stopPolling]);

  // ── Dispatch retrain (single model or all) ──────────────────────────────
  const dispatchTrain = async (modelType: string) => {
    if (!canTrain) return;
    setTrainingType(modelType);
    setActiveTask(null);
    try {
      const isAll = modelType === "all";
      const res = isAll
        ? await api.post("/ml/train-all")
        : await api.post("/ml/retrain", {
            model_type: modelType,
            reason: "Manual retrain via UI",
          });
      const taskId: string = res.data.task_id;
      const mode: "celery" | "thread" = res.data.mode === "celery" ? "celery" : "thread";
      setActiveTask({ task_id: taskId, status: "PENDING" });
      toast.info(
        mode === "celery"
          ? (isAll ? "Full retrain queued via Celery…" : `Retraining ${modelType} via Celery…`)
          : (isAll ? "Full retrain started in background…" : `Retraining ${modelType} in background…`)
      );
      startPolling(taskId, mode);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } }; message?: string };
      toast.error(err?.response?.data?.detail || err?.message || "Failed to start training");
      setTrainingType(null);
    }
  };

  const selectBestModel = async () => {
    setSelectingBest(true);
    setBestResult(null);
    try {
      const res = await api.post("/ml/select-best");
      setBestResult(res.data.selections || []);
      toast.success(res.data.message || "Best model selected");
      await load(true);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } };
      toast.error(err?.response?.data?.detail || "Auto-select failed");
    } finally {
      setSelectingBest(false);
    }
  };

  const getFeatureImportance = (m: Model): [string, number][] => {
    try {
      const hp = JSON.parse(m.hyperparameters || "{}");
      const fi = hp.feature_importance as Record<string, number> | undefined;
      if (!fi) return [];
      return Object.entries(fi).sort((a, b) => b[1] - a[1]).slice(0, 8);
    } catch { return []; }
  };

  const bestClfId = (() => {
    const clfs = models.filter(m => CLF_TYPES.has(m.model_type) && m.mse != null);
    if (!clfs.length) return null;
    return clfs.reduce((best, m) => (m.mse! < best.mse! ? m : best), clfs[0]).id;
  })();
  const bestRegId = (() => {
    const regs = models.filter(m => m.model_type === "regression" && m.mae != null);
    if (!regs.length) return null;
    return regs.reduce((best, m) => (m.mae! < best.mae! ? m : best), regs[0]).id;
  })();

  const isBusy = trainingType !== null;
  const taskProgress = activeTask?.progress;

  return (
    <div>
      <Header
        title="Model Management"
        subtitle="Train, compare and auto-select the best ML model"
      />
      <div className="p-6 space-y-6">

        {/* ── Role notice for read-only users ──────────────────────────────── */}
        {_hasHydrated && !canTrain && (
          <div className="flex items-center gap-3 bg-amber-50 border border-amber-200
                          rounded-xl px-5 py-3 text-sm text-amber-800">
            <Lock size={15} className="flex-shrink-0 text-amber-500" />
            <span>
              You have <strong>read-only</strong> access to model metrics.
              Training requires the <strong>ml_engineer</strong> or <strong>super_admin</strong> role.
            </span>
          </div>
        )}

        {/* ── Active training progress bar ──────────────────────────────────── */}
        {isBusy && activeTask && (
          <div className="bg-white rounded-xl border border-blue-100 shadow-card p-5">
            <div className="flex items-center gap-3 mb-3">
              <Loader2 size={16} className="text-blue-600 animate-spin flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {trainingType === "all" ? "Training all models…" : `Training ${trainingType}…`}
                </p>
                <p className="text-xs text-gray-500">
                  Status: <span className="font-mono">{activeTask.status}</span>
                  {taskProgress && (
                    <> — {taskProgress.model_type} ({taskProgress.current + 1}/{taskProgress.total})</>
                  )}
                </p>
              </div>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  background: "linear-gradient(90deg,#9B1535,#BE1B3C)",
                  width: taskProgress
                    ? `${Math.round(((taskProgress.current + 1) / taskProgress.total) * 100)}%`
                    : activeTask.status === "PENDING" ? "5%" : "100%",
                }}
              />
            </div>
          </div>
        )}

        {/* ── Retrain All + Auto-Select row (privileged only) ──────────────── */}
        {canTrain && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Retrain All */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-card p-5">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                     style={{ background: "linear-gradient(135deg,#9B1535,#BE1B3C)" }}>
                  <Play size={16} className="text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Retrain All Models</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Trains all 6 model types on the full dataset, then promotes the best.
                    Use when you have significant new training data.
                  </p>
                </div>
              </div>
              <button
                onClick={() => dispatchTrain("all")}
                disabled={isBusy}
                className="w-full flex items-center justify-center gap-2 text-sm text-white
                           py-2.5 rounded-lg font-semibold transition disabled:opacity-50
                           disabled:cursor-not-allowed hover:opacity-90 active:scale-[0.98]"
                style={{ background: "linear-gradient(135deg,#9B1535,#7A0E28)" }}
              >
                {isBusy && trainingType === "all" ? (
                  <><Loader2 size={14} className="animate-spin" /> Training…</>
                ) : (
                  <><RefreshCw size={14} /> Retrain All Models</>
                )}
              </button>
            </div>

            {/* Auto-Select Best */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-card p-5">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                     style={{ background: "linear-gradient(135deg,#7A0E28,#9B1535)" }}>
                  <Trophy size={16} className="text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Auto-Select Best Model</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Picks the best classifier (lowest log-loss) and regressor (lowest MAE)
                    from all trained versions and promotes them to active.
                  </p>
                </div>
              </div>
              <button
                onClick={selectBestModel}
                disabled={selectingBest || isBusy}
                className="w-full flex items-center justify-center gap-2 text-sm text-white
                           py-2.5 rounded-lg font-semibold transition disabled:opacity-50
                           disabled:cursor-not-allowed hover:opacity-90 active:scale-[0.98]"
                style={{ background: selectingBest ? "#9CA3AF" : "linear-gradient(135deg,#7A0E28,#9B1535)" }}
              >
                {selectingBest ? (
                  <><Loader2 size={14} className="animate-spin" /> Evaluating…</>
                ) : (
                  <><Zap size={14} /> Select Best by Loss</>
                )}
              </button>
              {bestResult && bestResult.length > 0 && (
                <div className="mt-3 space-y-2">
                  {bestResult.map((sel, i) => (
                    <div key={i} className="p-2.5 rounded-lg bg-green-50 border border-green-100 text-xs">
                      <div className="flex items-center gap-2 mb-0.5">
                        <CheckCircle size={11} className="text-green-600" />
                        <span className="font-bold text-green-800 capitalize">{sel.category}</span>
                        <span className="font-medium text-gray-700">{sel.selected_model}</span>
                      </div>
                      <p className="text-green-700 ml-4">{sel.reason}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}


        {/* ── Per-model cards ───────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {MODEL_CATALOGUE.map(({ type, label, desc, detail, icon, color, lossLabel, lossField }) => {
            const active     = models.find(m => m.model_type === type && m.is_active);
            const isTraining = isBusy && (trainingType === type || trainingType === "all");

            return (
              <div key={type}
                   className="bg-white rounded-xl border border-gray-100 shadow-card p-5
                              hover:shadow-card-hover transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center
                                    text-white text-xs font-bold flex-shrink-0"
                         style={{ background: color }}>{icon}</div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">{label}</h3>
                      <p className="text-[10px] text-gray-400 capitalize">{type.replace(/_/g, " ")}</p>
                    </div>
                  </div>
                  {active && (
                    <span className="text-[10px] font-bold text-green-700 bg-green-50
                                     px-2 py-0.5 rounded-full flex items-center gap-1 flex-shrink-0">
                      <CheckCircle size={9} /> Active
                    </span>
                  )}
                </div>

                <p className="text-xs text-gray-500 mb-1">{desc}</p>
                <p className="text-[10px] text-gray-400 leading-relaxed mb-3">{detail}</p>

                {active && (
                  <div className="grid grid-cols-3 gap-2 mb-3 bg-gray-50 rounded-lg p-2">
                    {active.accuracy != null && (
                      <div className="text-center">
                        <div className="text-xs font-bold" style={{ color }}>
                          {(active.accuracy * 100).toFixed(1)}%
                        </div>
                        <div className="text-[9px] text-gray-400">Accuracy</div>
                      </div>
                    )}
                    {active.f1_score != null && (
                      <div className="text-center">
                        <div className="text-xs font-bold" style={{ color }}>{active.f1_score.toFixed(3)}</div>
                        <div className="text-[9px] text-gray-400">F1</div>
                      </div>
                    )}
                    {lossField && active[lossField] != null && (
                      <div className="text-center">
                        <div className="text-xs font-bold text-orange-700">
                          {active[lossField]!.toFixed(4)}
                        </div>
                        <div className="text-[9px] text-orange-500 font-medium">{lossLabel} ↓</div>
                      </div>
                    )}
                    {active.r2_score != null && (
                      <div className="text-center">
                        <div className="text-xs font-bold" style={{ color }}>{active.r2_score.toFixed(3)}</div>
                        <div className="text-[9px] text-gray-400">R²</div>
                      </div>
                    )}
                    {active.mae != null && (
                      <div className="text-center">
                        <div className="text-xs font-bold text-orange-700">{active.mae.toFixed(2)}</div>
                        <div className="text-[9px] text-orange-500 font-medium">MAE ↓</div>
                      </div>
                    )}
                    {active.training_samples != null && (
                      <div className="text-center">
                        <div className="text-xs font-bold text-gray-600">
                          {active.training_samples >= 1000
                            ? `${(active.training_samples / 1000).toFixed(0)}k`
                            : active.training_samples}
                        </div>
                        <div className="text-[9px] text-gray-400">Samples</div>
                      </div>
                    )}
                  </div>
                )}

                {/* Train button — privileged only */}
                {canTrain ? (
                  <button
                    onClick={() => dispatchTrain(type)}
                    disabled={isBusy}
                    className="w-full flex items-center justify-center gap-2 text-xs py-2.5
                               text-white rounded-lg transition-all disabled:opacity-50
                               disabled:cursor-not-allowed hover:opacity-90 active:scale-[0.98]"
                    style={{ background: `linear-gradient(135deg, ${color}, #9B1535)` }}
                  >
                    {isTraining ? (
                      <><Loader2 size={12} className="animate-spin" /> Training…</>
                    ) : (
                      <><RefreshCw size={12} /> Retrain {label}</>
                    )}
                  </button>
                ) : (
                  <div className="w-full flex items-center justify-center gap-2 text-xs py-2.5
                                  text-gray-400 bg-gray-100 rounded-lg cursor-not-allowed">
                    <Lock size={12} /> Training restricted
                  </div>
                )}
              </div>
            );
          })}
        </div>


        {/* ── Drift Detection ───────────────────────────────────────────────── */}
        {drift.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-card">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
              <AlertTriangle size={14} className="text-orange-500" />
              <h3 className="text-sm font-semibold text-gray-800">Drift Detection Report</h3>
            </div>
            <div className="p-5 space-y-2">
              {drift.map((d) => (
                <div key={d.model_id}
                     className={`p-3.5 rounded-xl text-xs flex items-center justify-between
                                 ${d.drift_detected
                                   ? "bg-orange-50 border border-orange-100"
                                   : "bg-green-50 border border-green-100"}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0
                                     ${d.drift_detected ? "bg-orange-500" : "bg-green-500"}`} />
                    <div>
                      <span className="font-semibold text-gray-800">{d.model_name}</span>
                      <span className="text-gray-500 ml-2">{d.weeks_since_training}w since training</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`font-semibold text-xs px-2 py-0.5 rounded-full
                                      ${d.drift_detected
                                        ? "text-orange-700 bg-orange-100"
                                        : "text-green-700 bg-green-100"}`}>
                      {d.recommendation}
                    </span>
                    {/* Quick retrain from drift report — privileged only */}
                    {canTrain && d.drift_detected && (
                      <button
                        onClick={() => dispatchTrain(d.model_type)}
                        disabled={isBusy}
                        className="text-[10px] font-semibold text-white px-2.5 py-1 rounded-lg
                                   transition disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ background: "#9B1535" }}
                      >
                        Retrain now
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Model Registry Table ─────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-card overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <BarChart2 size={15} style={{ color: "#9B1535" }} />
            <h3 className="text-sm font-semibold text-gray-800">Model Registry</h3>
            <span className="ml-auto text-xs text-gray-400">{models.length} versions</span>
            <span className="text-[10px] text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full ml-1">
              ↓ = lower loss is better
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ background: "#FBF0F3" }}>
                  {["", "Model", "Type", "Version", "Accuracy", "F1", "R²", "MAE ↓", "Loss ↓", "Samples", "Trained", "Status"].map((h) => (
                    <th key={h}
                        className="px-4 py-3 text-left text-[10px] font-semibold uppercase
                                   tracking-wide whitespace-nowrap"
                        style={{ color: (h === "MAE ↓" || h === "Loss ↓") ? "#C2410C" : "#7A0E28" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  Array(5).fill(0).map((_, i) => (
                    <tr key={`skel-${i}`}>
                      {Array(12).fill(0).map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-3 bg-gray-100 rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : models.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="px-4 py-8 text-center text-sm text-gray-400">
                      No models trained yet.{" "}
                      {canTrain ? "Use the cards above to train your first model." : "Contact an ML Engineer to train models."}
                    </td>
                  </tr>
                ) : models.map((m) => {
                  const fi         = getFeatureImportance(m);
                  const isExpanded = expanded === m.id;
                  const catalogue  = MODEL_CATALOGUE.find(c => c.type === m.model_type);
                  const isBest     = m.id === bestClfId || m.id === bestRegId;
                  const isClassifier = CLF_TYPES.has(m.model_type);
                  return (
                    <React.Fragment key={m.id}>
                      <tr
                        className={`cursor-pointer transition ${isBest ? "bg-green-50 hover:bg-green-100" : "hover:bg-gray-50"}`}
                        onClick={() => setExpanded(isExpanded ? null : m.id)}>
                        <td className="px-3 py-3 w-8">
                          {isBest ? <Trophy size={13} className="text-green-600" />
                            : fi.length > 0 ? (isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />) : null}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded flex items-center justify-center
                                            text-white text-[9px] font-bold flex-shrink-0"
                                 style={{ background: catalogue?.color || "#9B1535" }}>
                              {catalogue?.icon || "M"}
                            </div>
                            <span className="text-xs font-medium text-gray-900 whitespace-nowrap">{m.model_name}</span>
                            {isBest && <span className="text-[9px] font-bold text-green-700 bg-green-100 px-1.5 py-0.5 rounded-full">BEST</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 capitalize whitespace-nowrap">{m.model_type.replace(/_/g, " ")}</td>
                        <td className="px-4 py-3 text-xs font-mono text-gray-500 whitespace-nowrap">{m.version}</td>
                        <td className="px-4 py-3 text-xs font-semibold" style={{ color: m.accuracy ? "#9B1535" : undefined }}>
                          {m.accuracy != null ? `${(m.accuracy * 100).toFixed(1)}%` : "—"}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-700">{m.f1_score != null ? m.f1_score.toFixed(3) : "—"}</td>
                        <td className="px-4 py-3 text-xs text-gray-700">{m.r2_score != null ? m.r2_score.toFixed(3) : "—"}</td>
                        <td className="px-4 py-3 text-xs font-semibold text-orange-700">{m.mae != null ? m.mae.toFixed(4) : "—"}</td>
                        <td className="px-4 py-3 text-xs font-semibold text-orange-700">
                          {m.mse != null ? <span title={isClassifier ? "Log-Loss" : "MSE"}>{m.mse.toFixed(isClassifier ? 6 : 4)}</span> : "—"}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-700">{m.training_samples?.toLocaleString() || "—"}</td>
                        <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{m.training_date?.slice(0, 10) || "—"}</td>
                        <td className="px-4 py-3">
                          {m.is_active
                            ? <span className="text-[10px] font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded-full">ACTIVE</span>
                            : <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Archived</span>}
                        </td>
                      </tr>
                      {isExpanded && fi.length > 0 && (
                        <tr key={`fi-${m.id}`} className="bg-gray-50">
                          <td colSpan={12} className="px-6 py-4">
                            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-3">
                              Feature Importance — {m.model_name}
                            </p>
                            <div className="space-y-1.5 max-w-lg">
                              {fi.map(([feat, imp]) => (
                                <div key={feat} className="flex items-center gap-3">
                                  <span className="text-[10px] text-gray-500 w-44 truncate flex-shrink-0">{feat}</span>
                                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                    <div className="h-full rounded-full"
                                         style={{ width: `${(imp / (fi[0]?.[1] || 1)) * 100}%`, background: catalogue?.color || "#9B1535" }} />
                                  </div>
                                  <span className="text-[10px] font-semibold text-gray-600 w-12 text-right">{(imp * 100).toFixed(1)}%</span>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 border-t border-gray-50 bg-gray-50 text-[10px] text-gray-400 flex gap-6 flex-wrap">
            <span><b className="text-orange-600">Log-Loss</b> (classifiers): lower = more confident correct predictions</span>
            <span><b className="text-orange-600">MAE</b> (regression): mean absolute error in score points</span>
          </div>
        </div>

      </div>
    </div>
  );
}
