import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import {
  Box,
  Typography,
  Button,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Grid,
  Card,
  CardContent,
  LinearProgress,
  Alert,
  Fab,
  Checkbox,
  FormControlLabel,
  FormGroup,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import {
  Upload as UploadIcon,
  Delete as DeleteIcon,
  Assignment as AssignIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import { format } from 'date-fns';

import { documentsAPI, municipalitiesAPI } from '../services/api';

function Documents() {
  const queryClient = useQueryClient();
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [bulkAssignDialogOpen, setBulkAssignDialogOpen] = useState(false);
  const [selectedDocuments, setSelectedDocuments] = useState([]);
  const [selectedMunicipalities, setSelectedMunicipalities] = useState([]);

  // Fetch documents
  const { data: documents = [], isLoading: documentsLoading } = useQuery(
    'documents',
    () => documentsAPI.list().then(res => res.data),
    { refetchInterval: 10000 } // Refetch every 10 seconds to check processing status
  );

  // Fetch municipalities
  const { data: municipalities = [] } = useQuery(
    'municipalities',
    () => municipalitiesAPI.list().then(res => res.data)
  );

  // Upload mutation
  const uploadMutation = useMutation(documentsAPI.upload, {
    onSuccess: () => {
      queryClient.invalidateQueries('documents');
      setUploadDialogOpen(false);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation(documentsAPI.delete, {
    onSuccess: () => {
      queryClient.invalidateQueries('documents');
    },
  });

  // Bulk assign mutation
  const bulkAssignMutation = useMutation(documentsAPI.bulkAssign, {
    onSuccess: () => {
      queryClient.invalidateQueries('documents');
      setBulkAssignDialogOpen(false);
      setSelectedDocuments([]);
      setSelectedMunicipalities([]);
    },
  });

  const handleBulkAssign = () => {
    if (selectedDocuments.length === 0 || selectedMunicipalities.length === 0) {
      return;
    }

    bulkAssignMutation.mutate({
      document_ids: selectedDocuments,
      municipality_ids: selectedMunicipalities,
    });
  };

  const handleMunicipalityChange = (municipalityId) => {
    setSelectedMunicipalities(prev => 
      prev.includes(municipalityId)
        ? prev.filter(id => id !== municipalityId)
        : [...prev, municipalityId]
    );
  };

  const columns = [
    {
      field: 'id',
      headerName: 'ID',
      width: 100,
      renderCell: (params) => (
        <Checkbox
          checked={selectedDocuments.includes(params.value)}
          onChange={(e) => {
            if (e.target.checked) {
              setSelectedDocuments(prev => [...prev, params.value]);
            } else {
              setSelectedDocuments(prev => prev.filter(id => id !== params.value));
            }
          }}
        />
      ),
    },
    {
      field: 'original_filename',
      headerName: 'Nume Fișier',
      flex: 1,
    },
    {
      field: 'category',
      headerName: 'Categorie',
      width: 120,
      renderCell: (params) => (
        <Chip label={params.value} size="small" />
      ),
    },
    {
      field: 'file_size',
      headerName: 'Dimensiune',
      width: 120,
      renderCell: (params) => {
        if (!params.value) return '-';
        const size = params.value / 1024 / 1024; // Convert to MB
        return `${size.toFixed(2)} MB`;
      },
    },
    {
      field: 'is_processed',
      headerName: 'Status',
      width: 120,
      renderCell: (params) => (
        <Chip
          label={params.value ? 'Procesat' : 'În procesare'}
          color={params.value ? 'success' : 'warning'}
          size="small"
        />
      ),
    },
    {
      field: 'chunk_count',
      headerName: 'Chunks',
      width: 100,
    },
    {
      field: 'created_at',
      headerName: 'Data Creării',
      width: 150,
      renderCell: (params) => format(new Date(params.value), 'dd.MM.yyyy HH:mm'),
    },
    {
      field: 'actions',
      headerName: 'Acțiuni',
      width: 100,
      sortable: false,
      renderCell: (params) => (
        <Button
          size="small"
          color="error"
          onClick={() => {
            if (window.confirm('Sigur doriți să ștergeți acest document?')) {
              deleteMutation.mutate(params.row.id);
            }
          }}
        >
          <DeleteIcon />
        </Button>
      ),
    },
  ];

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Documente
        </Typography>
        <Box>
          <Button
            variant="outlined"
            startIcon={<AssignIcon />}
            onClick={() => setBulkAssignDialogOpen(true)}
            disabled={selectedDocuments.length === 0}
            sx={{ mr: 2 }}
          >
            Asociere în masă
          </Button>
          <Fab
            color="primary"
            aria-label="add"
            onClick={() => setUploadDialogOpen(true)}
          >
            <AddIcon />
          </Fab>
        </Box>
      </Box>

      {/* Statistics Cards */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Documente
              </Typography>
              <Typography variant="h5">
                {documents.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Procesate
              </Typography>
              <Typography variant="h5">
                {documents.filter(doc => doc.is_processed).length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                În Procesare
              </Typography>
              <Typography variant="h5">
                {documents.filter(doc => !doc.is_processed).length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Selectate
              </Typography>
              <Typography variant="h5">
                {selectedDocuments.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Documents Table */}
      <Paper>
        <DataGrid
          rows={documents}
          columns={columns}
          pageSize={25}
          rowsPerPageOptions={[25, 50, 100]}
          autoHeight
          loading={documentsLoading}
          disableSelectionOnClick
          checkboxSelection={false}
        />
      </Paper>

      {/* Upload Dialog */}
      <UploadDialog
        open={uploadDialogOpen}
        onClose={() => setUploadDialogOpen(false)}
        municipalities={municipalities}
        onUpload={uploadMutation.mutate}
        loading={uploadMutation.isLoading}
        error={uploadMutation.error}
      />

      {/* Bulk Assign Dialog */}
      <Dialog open={bulkAssignDialogOpen} onClose={() => setBulkAssignDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Asociere Documente în Masă</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="textSecondary" gutterBottom>
            Documentele selectate: {selectedDocuments.length}
          </Typography>
          
          <Typography variant="h6" mt={2} mb={1}>
            Selectați primăriile:
          </Typography>
          
          <FormGroup>
            {municipalities.map((municipality) => (
              <FormControlLabel
                key={municipality.id}
                control={
                  <Checkbox
                    checked={selectedMunicipalities.includes(municipality.id)}
                    onChange={() => handleMunicipalityChange(municipality.id)}
                  />
                }
                label={municipality.name}
              />
            ))}
          </FormGroup>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkAssignDialogOpen(false)}>
            Anulare
          </Button>
          <Button
            onClick={handleBulkAssign}
            variant="contained"
            disabled={selectedMunicipalities.length === 0 || bulkAssignMutation.isLoading}
          >
            {bulkAssignMutation.isLoading ? 'Se procesează...' : 'Asociază'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// Upload Dialog Component
function UploadDialog({ open, onClose, municipalities, onUpload, loading, error }) {
  const [formData, setFormData] = useState({
    municipality_id: '',
    category: 'fiscal',
    title: '',
    description: '',
  });
  const [files, setFiles] = useState([]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
    },
    multiple: true,
    onDrop: setFiles,
  });

  const handleSubmit = async () => {
    if (!formData.municipality_id || files.length === 0) return;

    for (const file of files) {
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);
      uploadFormData.append('municipality_id', formData.municipality_id);
      uploadFormData.append('category', formData.category);
      uploadFormData.append('title', formData.title || file.name);
      uploadFormData.append('description', formData.description);

      try {
        await onUpload(uploadFormData);
      } catch (err) {
        console.error('Upload failed:', err);
      }
    }

    // Reset form
    setFormData({
      municipality_id: '',
      category: 'fiscal',
      title: '',
      description: '',
    });
    setFiles([]);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Upload Documente</DialogTitle>
      <DialogContent>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <FormControl fullWidth margin="normal">
              <InputLabel>Primăria</InputLabel>
              <Select
                value={formData.municipality_id}
                label="Primăria"
                onChange={(e) => setFormData({ ...formData, municipality_id: e.target.value })}
              >
                {municipalities.map((municipality) => (
                  <MenuItem key={municipality.id} value={municipality.id}>
                    {municipality.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth margin="normal">
              <InputLabel>Categorie</InputLabel>
              <Select
                value={formData.category}
                label="Categorie"
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              >
                <MenuItem value="fiscal">Fiscal</MenuItem>
                <MenuItem value="urbanism">Urbanism</MenuItem>
                <MenuItem value="social">Asistență Socială</MenuItem>
                <MenuItem value="utilities">Utilități</MenuItem>
                <MenuItem value="other">Altele</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              margin="normal"
              label="Titlu (opțional)"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              margin="normal"
              label="Descriere (opțional)"
              multiline
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </Grid>

          <Grid item xs={12}>
            <Box
              {...getRootProps()}
              sx={{
                border: '2px dashed #ccc',
                borderRadius: 2,
                p: 3,
                textAlign: 'center',
                cursor: 'pointer',
                backgroundColor: isDragActive ? '#f5f5f5' : 'transparent',
              }}
            >
              <input {...getInputProps()} />
              <UploadIcon sx={{ fontSize: 48, color: '#ccc', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                {isDragActive ? 'Eliberează fișierele aici...' : 'Drag & drop fișiere sau click pentru a selecta'}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Formate acceptate: PDF, DOC, DOCX, TXT
              </Typography>
            </Box>
          </Grid>

          {files.length > 0 && (
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Fișiere selectate:
              </Typography>
              {files.map((file, index) => (
                <Chip
                  key={index}
                  label={`${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`}
                  onDelete={() => setFiles(files.filter((_, i) => i !== index))}
                  sx={{ m: 0.5 }}
                />
              ))}
            </Grid>
          )}
        </Grid>

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error.response?.data?.detail || 'Eroare la upload'}
          </Alert>
        )}

        {loading && <LinearProgress sx={{ mt: 2 }} />}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Anulare</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={!formData.municipality_id || files.length === 0 || loading}
        >
          {loading ? 'Se încarcă...' : 'Upload'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default Documents;