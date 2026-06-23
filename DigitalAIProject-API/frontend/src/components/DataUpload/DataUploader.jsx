import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Box, Button, Typography, Paper, LinearProgress, Alert,
  List, ListItem, ListItemText, ListItemIcon, IconButton,
  Tooltip, Chip, Divider, CircularProgress,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import RefreshIcon from '@mui/icons-material/Refresh';
import DeleteIcon from '@mui/icons-material/Delete';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import { uploadDataset, listDatasets, reprocessDataset, deleteDataset, scanFolder } from '../../api/endpoints';
import StatusBadge from '../common/StatusBadge';

const ACCEPTED_TYPES = {
  'text/csv': ['.csv'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/json': ['.json'],
};

function FileIcon({ status }) {
  if (status === 'completed') return <CheckCircleIcon sx={{ color: 'success.main' }} />;
  if (status === 'failed') return <ErrorIcon sx={{ color: 'error.main' }} />;
  if (status === 'processing') return <CircularProgress size={18} thickness={5} />;
  return <HourglassEmptyIcon sx={{ color: 'text.secondary' }} />;
}

export default function DataUploader({ onUploadComplete, onDatasetClick }) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [datasets, setDatasets] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [scanning, setScanning] = useState(false);

  const fetchDatasets = useCallback(async () => {
    setLoadingList(true);
    try {
      const res = await listDatasets();
      setDatasets(res.data.datasets || []);
    } catch {
      // silently fail
    } finally {
      setLoadingList(false);
    }
  }, []);

  React.useEffect(() => {
    fetchDatasets();
    const interval = setInterval(fetchDatasets, 8000); // poll every 8s
    return () => clearInterval(interval);
  }, [fetchDatasets]);

  const onDrop = useCallback(async (acceptedFiles) => {
    if (!acceptedFiles.length) return;
    const file = acceptedFiles[0];
    setUploading(true);
    setUploadProgress(0);
    setUploadStatus(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await uploadDataset(formData, (e) => {
        if (e.total) setUploadProgress(Math.round((e.loaded / e.total) * 100));
      });
      setUploadStatus({ success: true, message: `"${file.name}" uploaded successfully. Feature engineering started.`, data: res.data });
      fetchDatasets();
      onUploadComplete?.();
    } catch (err) {
      setUploadStatus({ success: false, message: err.message });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }, [fetchDatasets, onUploadComplete]);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxFiles: 1,
    disabled: uploading,
  });

  const handleReprocess = async (id) => {
    try {
      await reprocessDataset(id);
      fetchDatasets();
    } catch (err) {
      setUploadStatus({ success: false, message: err.message });
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteDataset(id);
      setDatasets((prev) => prev.filter((d) => d.id !== id));
    } catch (err) {
      setUploadStatus({ success: false, message: err.message });
    }
  };

  const handleScanFolder = async () => {
    setScanning(true);
    try {
      const res = await scanFolder();
      setUploadStatus({
        success: true,
        message: `Folder scan complete: ${res.data.files_processed} new file(s) processed.`,
      });
      fetchDatasets();
    } catch (err) {
      setUploadStatus({ success: false, message: err.message });
    } finally {
      setScanning(false);
    }
  };

  const dropBorderColor = isDragReject
    ? '#ef4444'
    : isDragActive
    ? '#6366f1'
    : 'rgba(255,255,255,0.12)';

  return (
    <Box>
      {/* Drop Zone */}
      <Box
        {...getRootProps()}
        sx={{
          border: `2px dashed ${dropBorderColor}`,
          borderRadius: 3,
          p: 4,
          textAlign: 'center',
          cursor: uploading ? 'not-allowed' : 'pointer',
          bgcolor: isDragActive ? 'rgba(99,102,241,0.06)' : 'rgba(255,255,255,0.02)',
          transition: 'all 0.2s ease',
          '&:hover': {
            bgcolor: 'rgba(99,102,241,0.04)',
            borderColor: '#6366f1',
          },
        }}
      >
        <input {...getInputProps()} />
        <Box
          sx={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            bgcolor: 'rgba(99,102,241,0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mx: 'auto',
            mb: 2,
          }}
        >
          <CloudUploadIcon sx={{ fontSize: 28, color: 'primary.light' }} />
        </Box>

        {isDragActive ? (
          <Typography variant="h6" sx={{ color: 'primary.light' }}>
            Drop your file here
          </Typography>
        ) : (
          <>
            <Typography variant="h6" sx={{ color: 'text.primary', mb: 0.5 }}>
              Drag & drop your dataset
            </Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              or click to browse files
            </Typography>
          </>
        )}

        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
          {['.csv', '.xlsx', '.json'].map((ext) => (
            <Chip key={ext} label={ext} size="small" variant="outlined" sx={{ fontSize: '0.7rem' }} />
          ))}
        </Box>
      </Box>

      {/* Upload progress */}
      {uploading && (
        <Box sx={{ mt: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>Uploading…</Typography>
            <Typography variant="caption" sx={{ color: 'primary.light' }}>{uploadProgress}%</Typography>
          </Box>
          <LinearProgress variant="determinate" value={uploadProgress} />
        </Box>
      )}

      {/* Status alert */}
      {uploadStatus && (
        <Alert
          severity={uploadStatus.success ? 'success' : 'error'}
          onClose={() => setUploadStatus(null)}
          sx={{ mt: 2 }}
        >
          {uploadStatus.message}
        </Alert>
      )}

      {/* Actions row */}
      <Box sx={{ display: 'flex', gap: 1, mt: 2, flexWrap: 'wrap' }}>
        <Button
          variant="outlined"
          size="small"
          startIcon={scanning ? <CircularProgress size={14} /> : <FolderOpenIcon />}
          onClick={handleScanFolder}
          disabled={scanning}
        >
          Scan Data Folder
        </Button>
        <Button
          variant="outlined"
          size="small"
          startIcon={loadingList ? <CircularProgress size={14} /> : <RefreshIcon />}
          onClick={fetchDatasets}
          disabled={loadingList}
        >
          Refresh
        </Button>
      </Box>

      {/* Dataset list */}
      <Box sx={{ mt: 3 }}>
        <Typography variant="subtitle2" sx={{ color: 'text.secondary', mb: 1.5, textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.08em' }}>
          Uploaded Datasets ({datasets.length})
        </Typography>

        {datasets.length === 0 && !loadingList && (
          <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', py: 3 }}>
            No datasets uploaded yet
          </Typography>
        )}

        <List disablePadding>
          {datasets.map((ds, idx) => (
            <React.Fragment key={ds.id}>
              {idx > 0 && <Divider sx={{ borderColor: 'divider' }} />}
              <ListItem
                disablePadding
                sx={{ py: 1.5, px: 0, cursor: onDatasetClick ? 'pointer' : 'default' }}
                onClick={() => onDatasetClick?.(ds)}
                secondaryAction={
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    {(ds.status === 'failed' || ds.status === 'completed') && (
                      <Tooltip title="Re-process">
                        <IconButton size="small" onClick={() => handleReprocess(ds.id)}>
                          <RefreshIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    <Tooltip title="Delete">
                      <IconButton size="small" onClick={() => handleDelete(ds.id)} sx={{ color: 'error.main' }}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                }
              >
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <FileIcon status={ds.status} />
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                      <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 500 }}>
                        {ds.original_filename}
                      </Typography>
                      <StatusBadge status={ds.status} />
                    </Box>
                  }
                  secondary={
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {ds.file_size_kb} KB
                      {ds.row_count ? ` · ${ds.row_count.toLocaleString()} rows` : ''}
                      {ds.features_created?.length ? ` · ${ds.features_created.length} features` : ''}
                      {' · '}
                      {new Date(ds.uploaded_at).toLocaleString()}
                    </Typography>
                  }
                />
              </ListItem>
            </React.Fragment>
          ))}
        </List>
      </Box>
    </Box>
  );
}
