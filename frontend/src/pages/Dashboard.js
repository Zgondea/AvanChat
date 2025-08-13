import React from 'react';
import { useQuery } from 'react-query';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Paper,
  LinearProgress,
  Chip,
} from '@mui/material';
import {
  Business as BusinessIcon,
  Description as DocumentIcon,
  Chat as ChatIcon,
  TrendingUp as TrendingIcon,
} from '@mui/icons-material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

import { adminAPI, chatAPI } from '../services/api';

function Dashboard() {
  // Fetch dashboard statistics
  const { data: stats, isLoading: statsLoading } = useQuery(
    'dashboard-stats',
    () => adminAPI.getDashboardStats().then(res => res.data),
    { refetchInterval: 30000 } // Refresh every 30 seconds
  );

  // Fetch chat health
  const { data: chatHealth } = useQuery(
    'chat-health',
    () => chatAPI.health().then(res => res.data),
    { refetchInterval: 10000 } // Refresh every 10 seconds
  );

  // Mock data for charts (in a real app, this would come from API)
  const conversationsData = [
    { name: 'Luni', conversations: 12 },
    { name: 'Marți', conversations: 19 },
    { name: 'Miercuri', conversations: 15 },
    { name: 'Joi', conversations: 25 },
    { name: 'Vineri', conversations: 18 },
    { name: 'Sâmbătă', conversations: 8 },
    { name: 'Duminică', conversations: 5 },
  ];

  const documentsData = [
    { name: 'Fiscal', count: stats?.processed_documents || 0 },
    { name: 'Urbanism', count: Math.floor((stats?.processed_documents || 0) * 0.3) },
    { name: 'Social', count: Math.floor((stats?.processed_documents || 0) * 0.2) },
    { name: 'Utilități', count: Math.floor((stats?.processed_documents || 0) * 0.15) },
  ];

  if (statsLoading) {
    return (
      <Box>
        <Typography variant="h4" component="h1" gutterBottom>
          Dashboard
        </Typography>
        <LinearProgress />
      </Box>
    );
  }

  const processingPercentage = stats?.total_documents > 0 
    ? (stats.processed_documents / stats.total_documents) * 100 
    : 0;

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Dashboard
      </Typography>

      {/* Status Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Primării Active
                  </Typography>
                  <Typography variant="h4">
                    {stats?.active_municipalities || 0}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    din {stats?.total_municipalities || 0} total
                  </Typography>
                </Box>
                <BusinessIcon sx={{ fontSize: 40, color: 'primary.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Documente Procesate
                  </Typography>
                  <Typography variant="h4">
                    {stats?.processed_documents || 0}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    din {stats?.total_documents || 0} total
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={processingPercentage} 
                    sx={{ mt: 1 }}
                  />
                </Box>
                <DocumentIcon sx={{ fontSize: 40, color: 'success.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Conversații Astăzi
                  </Typography>
                  <Typography variant="h4">
                    {stats?.conversations_today || 0}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {stats?.total_conversations || 0} total
                  </Typography>
                </Box>
                <ChatIcon sx={{ fontSize: 40, color: 'info.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Status Sistem
                  </Typography>
                  <Box display="flex" flexDirection="column" gap={1}>
                    <Chip
                      label={chatHealth?.ollama_ready ? 'Ollama OK' : 'Ollama Offline'}
                      color={chatHealth?.ollama_ready ? 'success' : 'error'}
                      size="small"
                    />
                    <Chip
                      label={chatHealth?.embedding_ready ? 'Embeddings OK' : 'Embeddings Offline'}
                      color={chatHealth?.embedding_ready ? 'success' : 'error'}
                      size="small"
                    />
                  </Box>
                </Box>
                <TrendingIcon sx={{ fontSize: 40, color: 'warning.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Conversații pe Zile (Ultima Săptămână)
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={conversationsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="conversations" stroke="#1976d2" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Documente pe Categorii
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={documentsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#1976d2" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>

      {/* System Status */}
      <Grid container spacing={3} mt={2}>
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Status Sistem Chat AI
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Typography>Model Ollama</Typography>
                  <Chip
                    label={chatHealth?.ollama_ready ? 'Online' : 'Offline'}
                    color={chatHealth?.ollama_ready ? 'success' : 'error'}
                  />
                </Box>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Typography>Serviciu Embeddings</Typography>
                  <Chip
                    label={chatHealth?.embedding_ready ? 'Ready' : 'Not Ready'}
                    color={chatHealth?.embedding_ready ? 'success' : 'error'}
                  />
                </Box>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Typography>Status General</Typography>
                  <Chip
                    label={chatHealth?.status || 'Unknown'}
                    color={
                      chatHealth?.status === 'healthy' ? 'success' :
                      chatHealth?.status === 'degraded' ? 'warning' : 'error'
                    }
                  />
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

export default Dashboard;