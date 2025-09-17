import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Paper,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  LinearProgress,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  FormControlLabel,
  Switch,
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  Gavel as LawIcon,
  Description as DocumentIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';

import { lawsAPI } from '../services/api';

function LawsUpload() {
  const [mode, setMode] = useState('new'); // 'new' or 'version'
  const [selectedLaw, setSelectedLaw] = useState('');
  const [newLawTitle, setNewLawTitle] = useState('');
  const [versionNumber, setVersionNumber] = useState(1);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadResult, setUploadResult] = useState(null);
  const [uploadError, setUploadError] = useState(null);

  const queryClient = useQueryClient();

  // Fetch all laws for version upload
  const { data: lawsData } = useQuery(
    'laws-list',
    () => lawsAPI.list().then(res => res.data)
  );

  // Fetch versions for selected law to suggest next version number
  const { data: versionsData } = useQuery(
    ['law-versions', selectedLaw],
    () => lawsAPI.listVersions(selectedLaw).then(res => res.data),
    { 
      enabled: !!selectedLaw,
      onSuccess: (data) => {
        if (data && data.length > 0) {
          const maxVersion = Math.max(...data.map(v => v.version_no));
          setVersionNumber(maxVersion + 1);
        }
      }
    }
  );

  // Upload new law mutation
  const uploadNewLawMutation = useMutation(
    (formData) => lawsAPI.uploadNewLaw(formData),
    {
      onSuccess: (data) => {
        setUploadResult(data.data);
        setUploadError(null);
        queryClient.invalidateQueries('laws-list');
        resetForm();
      },
      onError: (error) => {
        setUploadError(error.response?.data?.detail || 'Upload failed');
        setUploadResult(null);
      }
    }
  );

  // Upload law version mutation
  const uploadLawVersionMutation = useMutation(
    ({ lawId, versionNo, formData }) => lawsAPI.uploadLawVersion(lawId, versionNo, formData),
    {
      onSuccess: (data) => {
        setUploadResult(data.data);
        setUploadError(null);
        queryClient.invalidateQueries(['law-versions', selectedLaw]);
        resetForm();
      },
      onError: (error) => {
        setUploadError(error.response?.data?.detail || 'Upload failed');
        setUploadResult(null);
      }
    }
  );

  const resetForm = () => {
    setSelectedFile(null);
    setNewLawTitle('');
    setSelectedLaw('');
    setVersionNumber(1);
    // Clear file input
    const fileInput = document.getElementById('file-upload');
    if (fileInput) fileInput.value = '';
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    setSelectedFile(file);
    setUploadResult(null);
    setUploadError(null);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append('file', selectedFile);

    if (mode === 'new') {
      if (!newLawTitle.trim()) return;
      formData.append('title', newLawTitle);
      formData.append('version_no', versionNumber);
      uploadNewLawMutation.mutate(formData);
    } else {
      if (!selectedLaw) return;
      formData.append('version_no', versionNumber);
      uploadLawVersionMutation.mutate({
        lawId: selectedLaw,
        versionNo: versionNumber,
        formData
      });
    }
  };

  const isUploading = uploadNewLawMutation.isLoading || uploadLawVersionMutation.isLoading;

  const canUpload = selectedFile && 
    ((mode === 'new' && newLawTitle.trim()) || (mode === 'version' && selectedLaw));

  return (
    <Box sx={{ backgroundColor: '#fafafa', minHeight: '100vh', p: 3 }}>
      {/* Header */}
      <Box sx={{ 
        backgroundColor: 'white',
        borderRadius: 2,
        border: '1px solid #e0e0e0',
        p: 3,
        mb: 3,
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      }}>
        <Box display="flex" alignItems="center" gap={2}>
          <CloudUploadIcon sx={{ fontSize: 40, color: '#9c27b0' }} />
          <Box>
            <Typography variant="h4" sx={{ color: '#212121', fontWeight: 600 }}>
              Upload Legi
            </Typography>
            <Typography variant="body1" sx={{ color: '#757575' }}>
              Încarcă documente pentru legi noi sau versiuni noi ale legilor existente
            </Typography>
          </Box>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Upload Form */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <DocumentIcon sx={{ color: '#9c27b0' }} />
              Configurare Upload
            </Typography>

            {/* Mode Selection */}
            <Box sx={{ mb: 3 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={mode === 'version'}
                    onChange={(e) => {
                      setMode(e.target.checked ? 'version' : 'new');
                      setUploadResult(null);
                      setUploadError(null);
                    }}
                    color="secondary"
                  />
                }
                label={mode === 'new' ? 'Lege Nouă' : 'Versiune Nouă'}
                sx={{ 
                  '& .MuiFormControlLabel-label': { 
                    fontWeight: 'bold',
                    color: mode === 'version' ? '#9c27b0' : '#2196f3'
                  }
                }}
              />
            </Box>

            <Grid container spacing={3}>
              {mode === 'new' ? (
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Numele Legii"
                    value={newLawTitle}
                    onChange={(e) => setNewLawTitle(e.target.value)}
                    placeholder="ex: Codul Penal Actualizat"
                    variant="outlined"
                  />
                </Grid>
              ) : (
                <Grid item xs={12} sm={8}>
                  <FormControl fullWidth>
                    <InputLabel>Selectează Legea</InputLabel>
                    <Select
                      value={selectedLaw}
                      label="Selectează Legea"
                      onChange={(e) => setSelectedLaw(e.target.value)}
                    >
                      {lawsData?.map((law) => (
                        <MenuItem key={law.id} value={law.id}>
                          {law.title}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              )}

              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Numărul Versiunii"
                  type="number"
                  value={versionNumber}
                  onChange={(e) => setVersionNumber(parseInt(e.target.value) || 1)}
                  variant="outlined"
                  inputProps={{ min: 1 }}
                />
              </Grid>
            </Grid>

            <Divider sx={{ my: 3 }} />

            {/* File Upload */}
            <Box>
              <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
                Selectează Documentul
              </Typography>
              <input
                id="file-upload"
                type="file"
                accept=".pdf,.doc,.docx,.txt"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
              <label htmlFor="file-upload">
                <Button
                  variant="outlined"
                  component="span"
                  startIcon={<DocumentIcon />}
                  sx={{ 
                    mb: 2,
                    borderColor: '#9c27b0',
                    color: '#9c27b0',
                    '&:hover': {
                      borderColor: '#7b1fa2',
                      backgroundColor: 'rgba(156, 39, 176, 0.04)'
                    }
                  }}
                >
                  Selectează Fișier
                </Button>
              </label>
              
              {selectedFile && (
                <Box sx={{ 
                  mt: 1, 
                  p: 2, 
                  backgroundColor: '#f5f5f5', 
                  borderRadius: 1,
                  border: '1px solid #e0e0e0'
                }}>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                    Fișier selectat:
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                  </Typography>
                </Box>
              )}

              <Typography variant="caption" color="textSecondary" display="block" sx={{ mt: 1 }}>
                Formate acceptate: PDF, DOC, DOCX, TXT
              </Typography>
            </Box>

            <Divider sx={{ my: 3 }} />

            {/* Upload Button */}
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Button
                variant="contained"
                onClick={handleUpload}
                disabled={!canUpload || isUploading}
                startIcon={isUploading ? null : <CloudUploadIcon />}
                sx={{ 
                  backgroundColor: '#9c27b0',
                  '&:hover': { backgroundColor: '#7b1fa2' },
                  minWidth: 150
                }}
              >
                {isUploading ? 'Se încarcă...' : 'Încarcă'}
              </Button>

              {(selectedFile || newLawTitle || selectedLaw) && (
                <Button variant="outlined" onClick={resetForm}>
                  Resetează
                </Button>
              )}
            </Box>

            {isUploading && (
              <Box sx={{ mt: 2 }}>
                <LinearProgress sx={{ 
                  '& .MuiLinearProgress-bar': { backgroundColor: '#9c27b0' } 
                }} />
                <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                  Procesare document și segmentare în secțiuni...
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Results Panel */}
        <Grid item xs={12} md={4}>
          {/* Success Result */}
          {uploadResult && (
            <Paper sx={{ p: 3, mb: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <CheckCircleIcon sx={{ color: '#4caf50' }} />
                <Typography variant="h6" sx={{ color: '#4caf50', fontWeight: 'bold' }}>
                  Upload Reușit!
                </Typography>
              </Box>
              
              <List dense>
                <ListItem sx={{ px: 0 }}>
                  <ListItemText 
                    primary="Lege ID" 
                    secondary={uploadResult.law_id}
                  />
                </ListItem>
                <ListItem sx={{ px: 0 }}>
                  <ListItemText 
                    primary="Versiunea" 
                    secondary={uploadResult.version_no}
                  />
                </ListItem>
                <ListItem sx={{ px: 0 }}>
                  <ListItemText 
                    primary="Secțiuni detectate" 
                    secondary={uploadResult.sections_count}
                  />
                </ListItem>
              </List>

              {uploadResult.sections_preview && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Preview secțiuni:
                  </Typography>
                  {uploadResult.sections_preview.map((section, index) => (
                    <Chip
                      key={index}
                      label={section.section_key}
                      size="small"
                      sx={{ 
                        mr: 1, 
                        mb: 1,
                        backgroundColor: '#e8f5e8',
                        color: '#2e7d32'
                      }}
                    />
                  ))}
                </Box>
              )}
            </Paper>
          )}

          {/* Error Result */}
          {uploadError && (
            <Alert 
              severity="error" 
              sx={{ mb: 2 }}
              icon={<ErrorIcon />}
            >
              <Typography variant="subtitle2" gutterBottom>
                Eroare la upload:
              </Typography>
              {uploadError}
            </Alert>
          )}

          {/* Help Panel */}
          <Paper sx={{ p: 3, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <LawIcon sx={{ color: '#9c27b0' }} />
              Cum funcționează?
            </Typography>
            
            <List dense>
              <ListItem sx={{ px: 0 }}>
                <ListItemText 
                  primary="1. Selectează modul"
                  secondary="Lege nouă sau versiune nouă pentru legea existentă"
                />
              </ListItem>
              <ListItem sx={{ px: 0 }}>
                <ListItemText 
                  primary="2. Încarcă documentul"
                  secondary="Sistemul va extrage textul automat din PDF/DOC"
                />
              </ListItem>
              <ListItem sx={{ px: 0 }}>
                <ListItemText 
                  primary="3. Segmentare automată"
                  secondary="Documentul va fi împărțit în articole și secțiuni"
                />
              </ListItem>
              <ListItem sx={{ px: 0 }}>
                <ListItemText 
                  primary="4. Gata pentru comparare"
                  secondary="Poți compara cu alte versiuni din sistemul de comparare"
                />
              </ListItem>
            </List>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

export default LawsUpload;