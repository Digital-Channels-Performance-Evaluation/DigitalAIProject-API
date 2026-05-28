import api from './axiosConfig';

// ── Auth ─────────────────────────────────────────────────────────────────────

export const loginJson = (email, password) =>
  api.post('/auth/login/json', { email, password });

export const getMe = () => api.get('/auth/me');

export const changeMyPassword = (current_password, new_password) =>
  api.put('/auth/me/password', { current_password, new_password });

// ── Users (admin) ─────────────────────────────────────────────────────────────

export const listUsers = () => api.get('/users');

export const createUser = (payload) => api.post('/users', payload);

export const updateUser = (id, payload) => api.put(`/users/${id}`, payload);

export const resetUserPassword = (id, new_password) =>
  api.put(`/users/${id}/reset-password`, null, { params: { new_password } });

export const deleteUser = (id) => api.delete(`/users/${id}`);

// ── Upload / Dataset ─────────────────────────────────────────────────────────

export const uploadDataset = (formData, onProgress) =>
  api.post('/upload/dataset', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    params: { auto_process: true },
    onUploadProgress: onProgress,
  });

export const listDatasets = (skip = 0, limit = 50) =>
  api.get('/upload/list', { params: { skip, limit } });

export const getDataset = (id) => api.get(`/upload/dataset/${id}`);

export const reprocessDataset = (id) => api.post(`/upload/process/${id}`);

export const scanFolder = () => api.post('/upload/scan-folder');

export const deleteDataset = (id) => api.delete(`/upload/dataset/${id}`);

// ── ML ───────────────────────────────────────────────────────────────────────

export const trainModel = (payload) => api.post('/ml/train', payload);

export const listModels = () => api.get('/ml/models');

export const getModel = (id) => api.get(`/ml/models/${id}`);

export const runPredictions = (modelId, datasetId) =>
  api.post(`/ml/predict/${modelId}/${datasetId}`);

export const getPredictions = (modelId) => api.get(`/ml/predictions/${modelId}`);

export const deleteModel = (id) => api.delete(`/ml/models/${id}`);

// ── Dashboard ────────────────────────────────────────────────────────────────

export const getKPIs = () => api.get('/dashboard/kpis');

export const getChannelPerformance = (modelId) =>
  api.get('/dashboard/channel-performance', { params: modelId ? { model_id: modelId } : {} });

export const getPredictionDistribution = (modelId) =>
  api.get('/dashboard/prediction-distribution', { params: modelId ? { model_id: modelId } : {} });

export const getModelComparison = () => api.get('/dashboard/model-comparison');

export const getRecentActivity = (limit = 10) =>
  api.get('/dashboard/recent-activity', { params: { limit } });

export const getChannelRanking = (modelId) =>
  api.get('/dashboard/channel-ranking', { params: modelId ? { model_id: modelId } : {} });

// ── Analytics ────────────────────────────────────────────────────────────────

export const getConfusionMatrix   = (modelId)    => api.get(`/analytics/confusion-matrix/${modelId}`);
export const getDataProfile       = (datasetId)  => api.get(`/analytics/data-profile/${datasetId}`);
export const getChannelTrend      = (productId, modelId) =>
  api.get('/analytics/channel-trend', { params: { product_id: productId, ...(modelId ? { model_id: modelId } : {}) } });
export const getChannelsOverview  = (modelId)    =>
  api.get('/analytics/channels-overview', { params: modelId ? { model_id: modelId } : {} });
export const getAuditLog = (page = 1, pageSize = 20, actionFilter = null) =>
  api.get('/analytics/audit-log', {
    params: {
      page,
      page_size: pageSize,
      ...(actionFilter && actionFilter !== 'all' ? { action_filter: actionFilter } : {}),
    },
  });
export const updateModelNotes     = (modelId, notes) =>
  api.put(`/analytics/model-notes/${modelId}`, null, { params: { notes } });
export const exportPredictions    = (modelId)    =>
  `${api.defaults.baseURL}/analytics/export/predictions/${modelId}`;
export const exportDataset        = (datasetId)  =>
  `${api.defaults.baseURL}/analytics/export/dataset/${datasetId}`;

// ── Smart Report ──────────────────────────────────────────────────────────────

export const getReportData     = (modelId) =>
  api.get('/report/data', { params: modelId ? { model_id: modelId } : {} });

export const downloadReport    = (modelId) =>
  `${api.defaults.baseURL}/report/download${modelId ? `?model_id=${modelId}` : ''}`;
