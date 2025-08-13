import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import {
  Box,
  Typography,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Grid,
  Card,
  CardContent,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Divider,
  IconButton,
  TextField,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import {
  Person as PersonIcon,
  SmartToy as BotIcon,
  Visibility as ViewIcon,
  Delete as DeleteIcon,
  Block as BlockIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';

import { conversationsAPI, municipalitiesAPI } from '../services/api';

function Conversations() {
  const queryClient = useQueryClient();
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filters, setFilters] = useState({
    municipality_id: '',
    active_only: true,
    days: 7,
  });

  // Fetch conversations
  const { data: conversations = [], isLoading } = useQuery(
    ['conversations', filters],
    () => conversationsAPI.list(filters).then(res => res.data),
    { refetchInterval: 30000 }
  );

  // Fetch municipalities for filter
  const { data: municipalities = [] } = useQuery(
    'municipalities',
    () => municipalitiesAPI.list().then(res => res.data)
  );

  // Fetch conversation details
  const { data: conversationDetails, isLoading: detailsLoading } = useQuery(
    ['conversation-details', selectedConversation?.id],
    () => conversationsAPI.get(selectedConversation.id).then(res => res.data),
    { enabled: !!selectedConversation }
  );

  // Fetch analytics
  const { data: analytics } = useQuery(
    ['conversation-analytics', filters.municipality_id, filters.days],
    () => conversationsAPI.getAnalytics({
      municipality_id: filters.municipality_id || undefined,
      days: filters.days,
    }).then(res => res.data)
  );

  // Delete mutation
  const deleteMutation = useMutation(conversationsAPI.delete, {
    onSuccess: () => {
      queryClient.invalidateQueries('conversations');
      setDialogOpen(false);
      setSelectedConversation(null);
    },
  });

  // Deactivate mutation
  const deactivateMutation = useMutation(conversationsAPI.deactivate, {
    onSuccess: () => {
      queryClient.invalidateQueries('conversations');
    },
  });

  const handleViewConversation = (conversation) => {
    setSelectedConversation(conversation);
    setDialogOpen(true);
  };

  const handleDeleteConversation = (conversation) => {
    if (window.confirm('Sigur doriți să ștergeți această conversație?')) {
      deleteMutation.mutate(conversation.id);
    }
  };

  const handleDeactivateConversation = (conversation) => {
    if (window.confirm('Sigur doriți să dezactivați această conversație?')) {
      deactivateMutation.mutate(conversation.id);
    }
  };

  const columns = [
    {
      field: 'municipality',
      headerName: 'Primăria',
      flex: 1,
      renderCell: (params) => params.value.name,
    },
    {
      field: 'session_id',
      headerName: 'Session ID',
      width: 200,
      renderCell: (params) => (
        <Typography variant="body2" fontFamily="monospace">
          {params.value.substring(0, 8)}...
        </Typography>
      ),
    },
    {
      field: 'message_count',
      headerName: 'Mesaje',
      width: 100,
      align: 'center',
    },
    {
      field: 'last_message',
      headerName: 'Ultimul Mesaj',
      flex: 2,
      renderCell: (params) => (
        <Typography variant="body2" noWrap>
          {params.value || 'Fără mesaje'}
        </Typography>
      ),
    },
    {
      field: 'is_active',
      headerName: 'Status',
      width: 100,
      renderCell: (params) => (
        <Chip
          label={params.value ? 'Activă' : 'Inactivă'}
          color={params.value ? 'success' : 'default'}
          size="small"
        />
      ),
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
      width: 150,
      sortable: false,
      renderCell: (params) => (
        <Box>
          <IconButton
            size="small"
            onClick={() => handleViewConversation(params.row)}
          >
            <ViewIcon />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => handleDeactivateConversation(params.row)}
            disabled={!params.row.is_active}
          >
            <BlockIcon />
          </IconButton>
          <IconButton
            size="small"
            color="error"
            onClick={() => handleDeleteConversation(params.row)}
          >
            <DeleteIcon />
          </IconButton>
        </Box>
      ),
    },
  ];

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Conversații
      </Typography>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth>
              <InputLabel>Primăria</InputLabel>
              <Select
                value={filters.municipality_id}
                label="Primăria"
                onChange={(e) => setFilters({ ...filters, municipality_id: e.target.value })}
              >
                <MenuItem value="">Toate</MenuItem>
                {municipalities.map((municipality) => (
                  <MenuItem key={municipality.id} value={municipality.id}>
                    {municipality.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={3}>
            <FormControl fullWidth>
              <InputLabel>Perioada</InputLabel>
              <Select
                value={filters.days}
                label="Perioada"
                onChange={(e) => setFilters({ ...filters, days: e.target.value })}
              >
                <MenuItem value={1}>Ultimele 24 ore</MenuItem>
                <MenuItem value={7}>Ultima săptămână</MenuItem>
                <MenuItem value={30}>Ultima lună</MenuItem>
                <MenuItem value={90}>Ultimele 3 luni</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={3}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={filters.active_only}
                label="Status"
                onChange={(e) => setFilters({ ...filters, active_only: e.target.value })}
              >
                <MenuItem value={true}>Doar active</MenuItem>
                <MenuItem value={false}>Toate</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* Analytics Cards */}
      {analytics && (
        <Grid container spacing={3} mb={3}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Total Conversații
                </Typography>
                <Typography variant="h5">
                  {analytics.total_conversations}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Conversații Active
                </Typography>
                <Typography variant="h5">
                  {analytics.active_conversations}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Total Mesaje
                </Typography>
                <Typography variant="h5">
                  {analytics.total_messages}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Mesaje/Conversație
                </Typography>
                <Typography variant="h5">
                  {analytics.average_messages_per_conversation}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Conversations Table */}
      <Paper>
        <DataGrid
          rows={conversations}
          columns={columns}
          pageSize={25}
          rowsPerPageOptions={[25, 50, 100]}
          autoHeight
          loading={isLoading}
          disableSelectionOnClick
        />
      </Paper>

      {/* Conversation Details Dialog */}
      <Dialog 
        open={dialogOpen} 
        onClose={() => setDialogOpen(false)} 
        maxWidth="md" 
        fullWidth
        PaperProps={{ sx: { height: '80vh' } }}
      >
        <DialogTitle>
          Detalii Conversație
          {conversationDetails && (
            <Typography variant="body2" color="textSecondary">
              {conversationDetails.municipality.name} - Session: {conversationDetails.session_id.substring(0, 8)}...
            </Typography>
          )}
        </DialogTitle>
        <DialogContent>
          {detailsLoading ? (
            <Typography>Se încarcă...</Typography>
          ) : conversationDetails ? (
            <Box>
              {/* Conversation Info */}
              <Grid container spacing={2} mb={2}>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="IP Utilizator"
                    value={conversationDetails.user_ip || 'N/A'}
                    disabled
                    size="small"
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Data Creării"
                    value={format(new Date(conversationDetails.created_at), 'dd.MM.yyyy HH:mm:ss')}
                    disabled
                    size="small"
                  />
                </Grid>
              </Grid>

              <Divider sx={{ mb: 2 }} />

              {/* Messages */}
              <Typography variant="h6" gutterBottom>
                Mesaje ({conversationDetails.messages.length})
              </Typography>
              
              <List sx={{ maxHeight: 400, overflow: 'auto' }}>
                {conversationDetails.messages.map((message, index) => (
                  <React.Fragment key={message.id}>
                    <ListItem alignItems="flex-start">
                      <ListItemAvatar>
                        <Avatar sx={{ 
                          bgcolor: message.role === 'user' ? 'primary.main' : 'secondary.main' 
                        }}>
                          {message.role === 'user' ? <PersonIcon /> : <BotIcon />}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Box display="flex" justifyContent="space-between" alignItems="center">
                            <Typography variant="subtitle2">
                              {message.role === 'user' ? 'Utilizator' : 'Asistent AI'}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              {format(new Date(message.created_at), 'HH:mm:ss')}
                            </Typography>
                          </Box>
                        }
                        secondary={
                          <Box>
                            <Typography variant="body2" sx={{ mt: 1 }}>
                              {message.content}
                            </Typography>
                            {message.sources && message.sources.length > 0 && (
                              <Box sx={{ mt: 1 }}>
                                <Typography variant="caption" color="textSecondary">
                                  Surse:
                                </Typography>
                                {message.sources.map((source, sourceIndex) => (
                                  <Chip
                                    key={sourceIndex}
                                    label={source.document_name}
                                    size="small"
                                    sx={{ ml: 0.5, mt: 0.5 }}
                                  />
                                ))}
                              </Box>
                            )}
                          </Box>
                        }
                      />
                    </ListItem>
                    {index < conversationDetails.messages.length - 1 && <Divider variant="inset" component="li" />}
                  </React.Fragment>
                ))}
              </List>
            </Box>
          ) : (
            <Typography>Nu s-au putut încărca detaliile conversației.</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>
            Închide
          </Button>
          {conversationDetails && (
            <Button
              color="error"
              onClick={() => handleDeleteConversation(conversationDetails)}
            >
              Șterge Conversația
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Conversations;