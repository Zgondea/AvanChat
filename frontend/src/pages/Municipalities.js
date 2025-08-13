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
  Grid,
  Card,
  CardContent,
  Fab,
  Switch,
  FormControlLabel,
  Alert,
  Snackbar,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Business as BusinessIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';

import { municipalitiesAPI } from '../services/api';

function Municipalities() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMunicipality, setEditingMunicipality] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [formData, setFormData] = useState({
    name: '',
    domain: '',
    description: '',
    contact_email: '',
    contact_phone: '',
    address: '',
    is_active: true,
  });

  // Fetch municipalities
  const { data: municipalities = [], isLoading } = useQuery(
    'municipalities',
    () => municipalitiesAPI.list({ active_only: false }).then(res => res.data)
  );

  // Create mutation
  const createMutation = useMutation(municipalitiesAPI.create, {
    onSuccess: () => {
      queryClient.invalidateQueries('municipalities');
      setDialogOpen(false);
      resetForm();
      setSnackbar({ open: true, message: 'Primăria a fost creată cu succes!', severity: 'success' });
    },
    onError: (error) => {
      setSnackbar({ 
        open: true, 
        message: error.response?.data?.detail || 'Eroare la crearea primăriei', 
        severity: 'error' 
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation(
    ({ id, data }) => municipalitiesAPI.update(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('municipalities');
        setDialogOpen(false);
        resetForm();
        setEditingMunicipality(null);
        setSnackbar({ open: true, message: 'Primăria a fost actualizată cu succes!', severity: 'success' });
      },
      onError: (error) => {
        setSnackbar({ 
          open: true, 
          message: error.response?.data?.detail || 'Eroare la actualizarea primăriei', 
          severity: 'error' 
        });
      },
    }
  );

  // Delete mutation
  const deleteMutation = useMutation(municipalitiesAPI.delete, {
    onSuccess: () => {
      queryClient.invalidateQueries('municipalities');
      setSnackbar({ open: true, message: 'Primăria a fost dezactivată cu succes!', severity: 'success' });
    },
    onError: (error) => {
      setSnackbar({ 
        open: true, 
        message: error.response?.data?.detail || 'Eroare la dezactivarea primăriei', 
        severity: 'error' 
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      domain: '',
      description: '',
      contact_email: '',
      contact_phone: '',
      address: '',
      is_active: true,
    });
  };

  const handleCreate = () => {
    setEditingMunicipality(null);
    resetForm();
    setDialogOpen(true);
  };

  const handleEdit = (municipality) => {
    setEditingMunicipality(municipality);
    setFormData({
      name: municipality.name || '',
      domain: municipality.domain || '',
      description: municipality.description || '',
      contact_email: municipality.contact_email || '',
      contact_phone: municipality.contact_phone || '',
      address: municipality.address || '',
      is_active: municipality.is_active,
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    // Validate required fields
    if (!formData.name.trim()) {
      setSnackbar({ open: true, message: 'Numele primăriei este obligatoriu', severity: 'error' });
      return;
    }

    if (editingMunicipality) {
      updateMutation.mutate({ id: editingMunicipality.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (municipality) => {
    if (window.confirm(`Sigur doriți să dezactivați primăria "${municipality.name}"?`)) {
      deleteMutation.mutate(municipality.id);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const columns = [
    {
      field: 'name',
      headerName: 'Nume Primărie',
      flex: 2,
      renderCell: (params) => (
        <Box display="flex" alignItems="center">
          <BusinessIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="body2" fontWeight="medium">
            {params.value}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'domain',
      headerName: 'Domeniu',
      flex: 1,
      renderCell: (params) => (
        <Typography variant="body2" color="textSecondary">
          {params.value || '-'}
        </Typography>
      ),
    },
    {
      field: 'contact_email',
      headerName: 'Email Contact',
      flex: 1,
      renderCell: (params) => (
        <Typography variant="body2" color="textSecondary">
          {params.value || '-'}
        </Typography>
      ),
    },
    {
      field: 'contact_phone',
      headerName: 'Telefon',
      width: 130,
      renderCell: (params) => (
        <Typography variant="body2" color="textSecondary">
          {params.value || '-'}
        </Typography>
      ),
    },
    {
      field: 'is_active',
      headerName: 'Status',
      width: 120,
      renderCell: (params) => (
        <Switch
          checked={params.value}
          size="small"
          color={params.value ? 'success' : 'default'}
          disabled
        />
      ),
    },
    {
      field: 'created_at',
      headerName: 'Data Creării',
      width: 140,
      renderCell: (params) => format(new Date(params.value), 'dd.MM.yyyy'),
    },
    {
      field: 'actions',
      headerName: 'Acțiuni',
      width: 120,
      sortable: false,
      renderCell: (params) => (
        <Box>
          <Button
            size="small"
            onClick={() => handleEdit(params.row)}
            sx={{ mr: 1 }}
          >
            <EditIcon fontSize="small" />
          </Button>
          <Button
            size="small"
            color="error"
            onClick={() => handleDelete(params.row)}
            disabled={!params.row.is_active}
          >
            <DeleteIcon fontSize="small" />
          </Button>
        </Box>
      ),
    },
  ];

  const activeMunicipalities = municipalities.filter(m => m.is_active);
  const inactiveMunicipalities = municipalities.filter(m => !m.is_active);

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Primării
        </Typography>
        <Fab color="primary" aria-label="add" onClick={handleCreate}>
          <AddIcon />
        </Fab>
      </Box>

      {/* Statistics Cards */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Primării
              </Typography>
              <Typography variant="h5">
                {municipalities.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Active
              </Typography>
              <Typography variant="h5" color="success.main">
                {activeMunicipalities.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Inactive
              </Typography>
              <Typography variant="h5" color="error.main">
                {inactiveMunicipalities.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Cu Domeniu
              </Typography>
              <Typography variant="h5">
                {municipalities.filter(m => m.domain).length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Municipalities Table */}
      <Paper>
        <DataGrid
          rows={municipalities}
          columns={columns}
          pageSize={25}
          rowsPerPageOptions={[25, 50, 100]}
          autoHeight
          loading={isLoading}
          disableSelectionOnClick
        />
      </Paper>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingMunicipality ? 'Editează Primăria' : 'Creează Primărie Nouă'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Nume Primărie *"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Domeniu Web"
                value={formData.domain}
                onChange={(e) => handleInputChange('domain', e.target.value)}
                placeholder="exemple: primaria-bucuresti.ro"
                helperText="Domeniul site-ului primăriei (opțional)"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Descriere"
                multiline
                rows={3}
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Descrierea primăriei..."
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Email Contact"
                type="email"
                value={formData.contact_email}
                onChange={(e) => handleInputChange('contact_email', e.target.value)}
                placeholder="contact@primaria.ro"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Telefon Contact"
                value={formData.contact_phone}
                onChange={(e) => handleInputChange('contact_phone', e.target.value)}
                placeholder="021.123.456"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Adresă"
                multiline
                rows={2}
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                placeholder="Adresa completă a primăriei..."
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.is_active}
                    onChange={(e) => handleInputChange('is_active', e.target.checked)}
                  />
                }
                label="Primărie Activă"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>
            Anulare
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={createMutation.isLoading || updateMutation.isLoading}
          >
            {createMutation.isLoading || updateMutation.isLoading
              ? 'Se salvează...'
              : editingMunicipality
              ? 'Actualizează'
              : 'Creează'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default Municipalities;