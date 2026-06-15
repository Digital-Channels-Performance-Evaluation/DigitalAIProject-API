"use client";
import { useEffect, useState, useCallback } from "react";
import { RefreshCw, CheckCircle, ChevronDown, ChevronUp, BarChart2, Star, Trophy, Zap } from "lucide-react";
import Header from "@/components/layout/Header";
import api from "@/lib/api";
import { useRefresh } from "@/lib/use-refresh";
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
  mse: number | null;        // log_loss for classifiers, MSE for regressors
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

// ── Model catalogue — 5 models ──────────────────────────────────────────────
const MODEL_CATALOGUE = [
  {
    type:   "classification",
    label:  "Logistic Regression",
    desc:   "Interpretable linear classifier for HIGH / MEDIUM / LOW tier prediction.",
    detail: "Multinomial solver with L2 regularisation (C=0.1). Fast inference, highly explainable coefficients.",
    icon:   "LR",
    color:  "#9B1535",
    lossLabel: "Log-Loss",
    lossField: "mse" as const,
  },
  {
    type:   "random_forest",
    label:  "Random Forest",
    desc:   "Ensemble of 20 decision trees for robust tier classification.",
    detail: "Bagging ensemble — reduces variance, provides feature importance rankings automatically.",
    icon:   "RF",
    color:  "#7A0E28",
    lossLabel: "Log-Loss",
    lossField: "mse" as const,
  },
  {
    type:   "decision_tree",
    label:  "Decision Tree",
    desc:   "Single interpretable tree — visualisable decision rules for each tier.",
    detail: "Max depth 8, Gini criterion. Every decision path can be explained to management.",
    icon:   "DT",
    color:  "#5E0B1E",
    lossLabel: "Log-Loss",
    lossField: "mse" as const,
  },
  {
    type:   "regression",
    label:  "Ridge Regression",
    desc:   "Continuous score predictor (0–100) with L2 regularisation.",
    detail: "Provides the numeric performance score. α=1.0. Paired with the classifier for full scoring pipeline.",
    icon:   "RR",
    color:  "#BE1B3C",
    lossLabel: "MSE",
    lossField: "mse" as const,
  },
  {
    type:   "gradient_boosting",
    label:  "Gradient Boosting",
    desc:   "Gradient Boosting Classifier — sequential ensemble for maximum accuracy.",
    detail: "n_estimators=50, max_depth=4, learning_rate=0.1. Often best log-loss among all classifiers.",
    icon:   "GB",
    color:  "#6B21A8",
    lossLabel: "Log-Loss",
    lossField: "mse" as const,
  },
  {
    type:   "similarity",
    label:  "KNN Similarity",
    desc:   "K-Nearest Neighbours for product peer-comparison and clustering.",
    detail: "k=3, Euclidean distance, distance-weighted. Groups similar products into performance clusters.",
    icon:   "KNN",
    color:  "#E0809A",
    lossLabel: null,
    lossField: null,
  },
];
const CLF_TYPES = new Set(["classification", "random_forest", "decision_tree"]);

export default function ModelsPage() {
  const [models,      setModels]      = useState<Model[]>([]);
  const [drift,       setDrift]       = useState<DriftReport[]>([]);
  const [training,    setTraining]    = useState<string | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [expanded,    setExpanded]    = useState<number | null>(null);
  const [selectingBest, setSelectingBest] = useState(false);
  const [bestResult,  setBestResult]  = useState<BestSelection[] | null>(null);

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
  useRefresh(() => load(true));

  const train = async (modelType: string, label: string) => {
    setTraining(modelType);
    let success = false;
    try {
      const res = await api.post("/ml/train", {
        model_type:      modelType,
        dataset_version: `v${new Date().toISOString().slice(0, 10)}`,
      });
      toast.success(res.data.message);
      // Show loss info if available
      if (res.data.log_loss != null) {
        toast.info(`Log-Loss: ${res.data.log_loss.toFixed(6)} (lower is better)`);
      }
      if (res.data.mse != null && modelType === "regression") {
        toast.info(`MSE: ${res.data.mse.toFixed(4)}`);
      }
      success = true;
    } catch (e: any) {
      const msg = e?.response?.data?.detail || e?.message || `Training ${label} failed`;
      toast.error(msg);
    } finally {
      setTraining(null);
      if (success) await load(true);
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
    } catch (e: any) {
      const msg = e?.response?.data?.detail || "Auto-select failed";
      toast.error(msg);
    } finally {
      setSelectingBest(false);
    }
  };

  // Parse feature importance from hyperparameters JSON
  const getFeatureImportance = (m: Model): [string, number][] => {
    try {
      const hp = JSON.parse(m.hyperparameters || "{}");
      const fi = hp.feature_importance as Record<string, number> | undefined;
      if (!fi) return [];
      return Object.entries(fi)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8);
    } catch { return []; }
  };

  // Determine the best classifier by lowest log_loss for highlighting
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

  return (
    <div>
      <Header
        title="Model Management"
        subtitle="Train, compare and auto-select the best ML model by loss"
      />
      <div className="p-6 space-y-6">

        {/* ── Best Model Selection banner ───────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-card p-5">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                   style={{ background: "linear-gradient(135deg,#7A0E28,#9B1535)" }}>
                <Trophy size={18} className="text-white" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Auto-Select Best Model</h3>
                <p className="text-xs text-gray-500">
                  Picks the best classifier (lowest log-loss) and best regressor (lowest MAE) from all trained versions
                </p>
              </div>
            </div>
            <button
              onClick={selectBestModel}
              disabled={selectingBest || training !== null}
              className="flex items-center gap-2 text-sm text-white px-5 py-2.5 rounded-lg
                         font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: selectingBest ? "#9CA3AF" : "linear-gradient(135deg,#7A0E28,#9B1535)" }}
            >
              {selectingBest ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Evaluating...
                </>
              ) : (
                <><Zap size={14} /> Select Best by Loss</>
              )}
            </button>
          </div>

          {/* Best selection result */}
          {bestResult && bestResult.length > 0 && (
            <div className="mt-4 space-y-2">
              {bestResult.map((sel, i) => (
                <div key={i} className="p-3 rounded-xl bg-green-50 border border-green-100 text-xs">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle size={13} className="text-green-600" />
                    <span className="font-bold text-green-800 capitalize">{sel.category}</span>
                    <span className="font-semibold text-gray-700">→ {sel.selected_model}</span>
                    <span className="text-gray-400 font-mono">{sel.version}</span>
                  </div>
                  <p className="text-green-700 ml-5">{sel.reason}</p>
                  <div className="flex gap-4 mt-1.5 ml-5 text-gray-500">
                    {sel.log_loss != null && <span>Log-Loss: <b className="text-green-800">{sel.log_loss.toFixed(6)}</b></span>}
                    {sel.mae != null && <span>MAE: <b className="text-green-800">{sel.mae.toFixed(4)}</b></span>}
                    {sel.f1_score != null && <span>F1: <b>{sel.f1_score.toFixed(3)}</b></span>}
                    {sel.accuracy != null && <span>Acc: <b>{(sel.accuracy * 100).toFixed(1)}%</b></span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Model cards grid ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {MODEL_CATALOGUE.map(({ type, label, desc, detail, icon, color, lossLabel, lossField }) => {
            const active = models.find(m => m.model_type === type && m.is_active);
            const isTraining = training === type;

            return (
              <div key={type}
                   className="bg-white rounded-xl border border-gray-100 shadow-card p-5
                              hover:shadow-card-hover transition-shadow">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center
                                    text-white text-xs font-bold flex-shrink-0"
                         style={{ background: color }}>
                      {icon}
                    </div>
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

                {/* Metrics strip */}
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
                        <div className="text-xs font-bold" style={{ color }}>
                          {active.f1_score.toFixed(3)}
                        </div>
                        <div className="text-[9px] text-gray-400">F1</div>
                      </div>
                    )}
                    {/* Loss metric — most important */}
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
                        <div className="text-xs font-bold" style={{ color }}>
                          {active.r2_score.toFixed(3)}
                        </div>
                        <div className="text-[9px] text-gray-400">R²</div>
                      </div>
                    )}
                    {active.mae != null && (
                      <div className="text-center">
                        <div className="text-xs font-bold text-orange-700">
                          {active.mae.toFixed(2)}
                        </div>
                        <div className="text-[9px] text-orange-500 font-medium">MAE ↓</div>
                      </div>
                    )}
                    {active.training_samples != null && (
                      <div className="text-center">
                        <div className="text-xs font-bold text-gray-600">
                          {(active.training_samples / 1000).toFixed(0)}k
                        </div>
                        <div className="text-[9px] text-gray-400">Samples</div>
                      </div>
                    )}
                  </div>
                )}

                {/* Train button */}
                <button
                  onClick={() => train(type, label)}
                  disabled={isTraining || training !== null}
                  className="w-full flex items-center justify-center gap-2 text-xs py-2.5
                             text-white rounded-lg transition-all duration-150
                             disabled:opacity-50 disabled:cursor-not-allowed
                             hover:opacity-90 active:scale-[0.98]"
                  style={{ background: isTraining ? color : `linear-gradient(135deg, ${color}, #9B1535)` }}
                >
                  {isTraining ? (
                    <>
                      <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10"
                                stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                      </svg>
                      Training {label}...
                    </>
                  ) : (
                    <><RefreshCw size={12} /> Train {label}</>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* ── Drift Detection ───────────────────────────────────────────────── */}
        {drift.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-card">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-orange-500" />
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
                      <span className="text-gray-500 ml-2">
                        {d.weeks_since_training}w since training
                      </span>
                    </div>
                  </div>
                  <span className={`font-semibold text-xs px-2 py-0.5 rounded-full
                                    ${d.drift_detected
                                      ? "text-orange-700 bg-orange-100"
                                      : "text-green-700 bg-green-100"}`}>
                    {d.recommendation}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Model Registry Table ──────────────────────────────────────────── */}
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
                  {["", "Model", "Type", "Version", "Accuracy", "F1",
                    "R²", "MAE ↓", "Loss ↓", "Samples", "Trained", "Status"].map((h) => (
                    <th key={h}
                        className={`px-4 py-3 text-left text-[10px] font-semibold uppercase
                                   tracking-wide whitespace-nowrap
                                   ${(h === "MAE ↓" || h === "Loss ↓") ? "text-orange-600" : ""}`}
                        style={{ color: (h === "MAE ↓" || h === "Loss ↓") ? "#C2410C" : "#7A0E28" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  Array(5).fill(0).map((_, i) => (
                    <tr key={i}>
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
                      No models trained yet. Use the cards above to train your first model.
                    </td>
                  </tr>
                ) : models.map((m) => {
                  const fi = getFeatureImportance(m);
                  const isExpanded = expanded === m.id;
                  const catalogue = MODEL_CATALOGUE.find(c => c.type === m.model_type);
                  const isBestClf = m.id === bestClfId && CLF_TYPES.has(m.model_type);
                  const isBestReg = m.id === bestRegId && m.model_type === "regression";
                  const isBest = isBestClf || isBestReg;

                  // For classifiers: loss = mse (log_loss); for regression: loss = mse (actual MSE)
                  const lossVal = m.mse;
                  const isClassifier = CLF_TYPES.has(m.model_type);

                  return (
                    <>
                      <tr key={m.id}
                          className={`cursor-pointer transition ${
                            isBest ? "bg-green-50 hover:bg-green-100" : "hover:bg-gray-50"
                          }`}
                          onClick={() => setExpanded(isExpanded ? null : m.id)}>
                        {/* Best indicator */}
                        <td className="px-3 py-3 text-gray-400 w-8">
                          {isBest ? (
                            <Trophy size={13} className="text-green-600" />
                          ) : fi.length > 0 ? (
                            isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />
                          ) : null}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded flex items-center justify-center
                                            text-white text-[9px] font-bold flex-shrink-0"
                                 style={{ background: catalogue?.color || "#9B1535" }}>
                              {catalogue?.icon || "M"}
                            </div>
                            <span className="text-xs font-medium text-gray-900 whitespace-nowrap">
                              {m.model_name}
                            </span>
                            {isBest && (
                              <span className="text-[9px] font-bold text-green-700 bg-green-100
                                               px-1.5 py-0.5 rounded-full">BEST</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 capitalize whitespace-nowrap">
                          {m.model_type.replace(/_/g, " ")}
                        </td>
                        <td className="px-4 py-3 text-xs font-mono text-gray-500 whitespace-nowrap">
                          {m.version}
                        </td>
                        <td className="px-4 py-3 text-xs font-semibold"
                            style={{ color: m.accuracy ? "#9B1535" : undefined }}>
                          {m.accuracy != null ? `${(m.accuracy * 100).toFixed(1)}%` : "—"}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-700">
                          {m.f1_score != null ? m.f1_score.toFixed(3) : "—"}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-700">
                          {m.r2_score != null ? m.r2_score.toFixed(3) : "—"}
                        </td>
                        {/* MAE — lower is better */}
                        <td className="px-4 py-3 text-xs font-semibold text-orange-700">
                          {m.mae != null ? m.mae.toFixed(4) : "—"}
                        </td>
                        {/* Loss — log_loss for classifiers, MSE for regression */}
                        <td className="px-4 py-3 text-xs font-semibold text-orange-700">
                          {lossVal != null ? (
                            <span title={isClassifier ? "Log-Loss (cross-entropy)" : "MSE"}>
                              {lossVal.toFixed(isClassifier ? 6 : 4)}
                            </span>
                          ) : "—"}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-700">
                          {m.training_samples?.toLocaleString() || "—"}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                          {m.training_date?.slice(0, 10) || "—"}
                        </td>
                        <td className="px-4 py-3">
                          {m.is_active ? (
                            <span className="text-[10px] font-bold text-green-700
                                             bg-green-50 px-2 py-0.5 rounded-full">
                              ACTIVE
                            </span>
                          ) : (
                            <span className="text-[10px] text-gray-400
                                             bg-gray-100 px-2 py-0.5 rounded-full">
                              Archived
                            </span>
                          )}
                        </td>
                      </tr>

                      {/* Feature importance expandable row */}
                      {isExpanded && fi.length > 0 && (
                        <tr key={`fi-${m.id}`} className="bg-gray-50">
                          <td colSpan={12} className="px-6 py-4">
                            <p className="text-[10px] font-semibold text-gray-500 uppercase
                                          tracking-wide mb-3">
                              Feature Importance — {m.model_name}
                            </p>
                            <div className="space-y-1.5 max-w-lg">
                              {fi.map(([feat, imp]) => (
                                <div key={feat} className="flex items-center gap-3">
                                  <span className="text-[10px] text-gray-500 w-44 truncate flex-shrink-0">
                                    {feat}
                                  </span>
                                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                    <div
                                      className="h-full rounded-full transition-all"
                                      style={{
                                        width: `${(imp / (fi[0]?.[1] || 1)) * 100}%`,
                                        background: catalogue?.color || "#9B1535",
                                      }}
                                    />
                                  </div>
                                  <span className="text-[10px] font-semibold text-gray-600 w-12 text-right">
                                    {(imp * 100).toFixed(1)}%
                                  </span>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Loss legend */}
          <div className="px-5 py-3 border-t border-gray-50 bg-gray-50 text-[10px] text-gray-400 flex gap-6">
            <span><b className="text-orange-600">Log-Loss</b> (classifiers): cross-entropy — lower = more confident correct predictions</span>
            <span><b className="text-orange-600">MAE</b> (regression): mean absolute error in score points — lower = more precise</span>
            <span><b className="text-orange-600">MSE</b> (regression): mean squared error — penalises large errors more</span>
          </div>
        </div>

      </div>
    </div>
  );
}
