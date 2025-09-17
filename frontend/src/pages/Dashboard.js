import React, { useState } from 'react';
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
  Fab,
  Button,
} from '@mui/material';
import {
  Business as BusinessIcon,
  Description as DocumentIcon,
  Chat as ChatIcon,
  TrendingUp as TrendingIcon,
  Refresh as RefreshIcon,
  Gavel as LawIcon,
  Compare as CompareIcon,
  CloudUpload as CloudUploadIcon,
} from '@mui/icons-material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

import { adminAPI, chatAPI, lawsAPI } from '../services/api';
import { useNavigate } from 'react-router-dom';

function Dashboard() {
  const [refreshAnimation, setRefreshAnimation] = useState(false);
  const navigate = useNavigate();

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

  // Fetch laws data
  const { data: lawsData } = useQuery(
    'laws-list',
    () => lawsAPI.list().then(res => res.data),
    { refetchInterval: 60000 } // Refresh every minute
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
      <Box sx={{ p: 3 }}>
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

  const handleRefresh = () => {
    setRefreshAnimation(true);
    setTimeout(() => setRefreshAnimation(false), 1000);
  };

  return (
    <Box sx={{ 
      backgroundColor: '#fafafa',
      minHeight: '100vh',
      p: 3,
    }}>
      {/* Header */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        mb: 4,
        backgroundColor: 'white',
        borderRadius: 2,
        border: '1px solid #e0e0e0',
        p: 3,
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      }}>
        <Box>
          <Typography 
            variant="h4" 
            component="h1" 
            sx={{ 
              color: '#212121',
              fontWeight: 600,
              mb: 0.5,
            }}
          >
            Dashboard Administrativ
          </Typography>
          <Typography 
            variant="body1" 
            sx={{ 
              color: '#757575',
              fontWeight: 400,
            }}
          >
            Panou de control pentru sistemul AvanChat
          </Typography>
        </Box>
        <Fab
          color="primary"
          size="medium"
          onClick={handleRefresh}
          sx={{
            backgroundColor: '#1976d2',
            color: 'white',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            transform: refreshAnimation ? 'rotate(360deg)' : 'rotate(0deg)',
            transition: 'transform 1s ease-in-out',
            '&:hover': {
              backgroundColor: '#1565c0',
              transform: 'scale(1.05)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            }
          }}
        >
          <RefreshIcon />
        </Fab>
      </Box>

      {/* Status Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{
            backgroundColor: 'white',
            border: '1px solid #e0e0e0',
            borderRadius: 2,
            transition: 'all 0.2s ease',
            '&:hover': {
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
              transform: 'translateY(-2px)',
            },
          }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography 
                    variant="overline"
                    sx={{ 
                      color: '#757575',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      mb: 1,
                      display: 'block',
                    }}
                  >
                    Primării Active
                  </Typography>
                  <Typography 
                    variant="h3" 
                    sx={{ 
                      color: '#212121',
                      fontWeight: 700,
                      mb: 1,
                    }}
                  >
                    {stats?.active_municipalities || 0}
                  </Typography>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      color: '#757575',
                      fontSize: '0.875rem',
                    }}
                  >
                    din {stats?.total_municipalities || 0} total
                  </Typography>
                </Box>
                <Box sx={{
                  backgroundColor: 'rgba(25, 118, 210, 0.1)',
                  borderRadius: '50%',
                  p: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <BusinessIcon sx={{ 
                    fontSize: 40, 
                    color: '#1976d2',
                  }} />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{
            backgroundColor: 'white',
            border: '1px solid #e0e0e0',
            borderRadius: 2,
            transition: 'all 0.2s ease',
            '&:hover': {
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
              transform: 'translateY(-2px)',
            },
          }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box sx={{ width: '70%' }}>
                  <Typography 
                    variant="overline"
                    sx={{ 
                      color: '#757575',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      mb: 1,
                      display: 'block',
                    }}
                  >
                    Documente Procesate
                  </Typography>
                  <Typography 
                    variant="h3" 
                    sx={{ 
                      color: '#212121',
                      fontWeight: 700,
                      mb: 1,
                    }}
                  >
                    {stats?.processed_documents || 0}
                  </Typography>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      color: '#757575',
                      fontSize: '0.875rem',
                      mb: 2,
                    }}
                  >
                    din {stats?.total_documents || 0} total
                  </Typography>
                  <Box sx={{
                    backgroundColor: '#f5f5f5',
                    borderRadius: '8px',
                    p: 1,
                    border: '1px solid #e0e0e0',
                  }}>
                    <LinearProgress 
                      variant="determinate" 
                      value={processingPercentage}
                      sx={{ 
                        height: 6,
                        borderRadius: '3px',
                        backgroundColor: '#e0e0e0',
                        '& .MuiLinearProgress-bar': {
                          backgroundColor: '#4caf50',
                          borderRadius: '3px',
                        }
                      }}
                    />
                    <Typography variant="caption" sx={{ 
                      color: '#757575',
                      fontSize: '0.7rem',
                      mt: 0.5,
                      display: 'block',
                    }}>
                      {processingPercentage.toFixed(1)}% Completat
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{
                  backgroundColor: 'rgba(76, 175, 80, 0.1)',
                  borderRadius: '50%',
                  p: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <DocumentIcon sx={{ 
                    fontSize: 40, 
                    color: '#4caf50',
                  }} />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{
            backgroundColor: 'white',
            border: '1px solid #e0e0e0',
            borderRadius: 2,
            transition: 'all 0.2s ease',
            '&:hover': {
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
              transform: 'translateY(-2px)',
            },
          }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography 
                    variant="overline"
                    sx={{ 
                      color: '#757575',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      mb: 1,
                      display: 'block',
                    }}
                  >
                    Conversații Astăzi
                  </Typography>
                  <Typography 
                    variant="h3" 
                    sx={{ 
                      color: '#212121',
                      fontWeight: 700,
                      mb: 1,
                    }}
                  >
                    {stats?.conversations_today || 0}
                  </Typography>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      color: '#757575',
                      fontSize: '0.875rem',
                    }}
                  >
                    {stats?.total_conversations || 0} total
                  </Typography>
                </Box>
                <Box sx={{
                  backgroundColor: 'rgba(33, 150, 243, 0.1)',
                  borderRadius: '50%',
                  p: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <ChatIcon sx={{ 
                    fontSize: 40, 
                    color: '#2196f3',
                  }} />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{
            backgroundColor: 'white',
            border: '1px solid #e0e0e0',
            borderRadius: 2,
            transition: 'all 0.2s ease',
            '&:hover': {
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
              transform: 'translateY(-2px)',
            },
          }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box sx={{ width: '70%' }}>
                  <Typography 
                    variant="overline"
                    sx={{ 
                      color: '#757575',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      mb: 1,
                      display: 'block',
                    }}
                  >
                    Status Sistem
                  </Typography>
                  <Box display="flex" flexDirection="column" gap={1}>
                    <Chip
                      label={chatHealth?.ollama_ready ? 'Ollama Online' : 'Ollama Offline'}
                      sx={{
                        backgroundColor: chatHealth?.ollama_ready ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)',
                        color: chatHealth?.ollama_ready ? '#4caf50' : '#f44336',
                        border: `1px solid ${chatHealth?.ollama_ready ? '#4caf50' : '#f44336'}30`,
                        fontSize: '0.75rem',
                        height: '28px',
                        fontWeight: 500,
                      }}
                      size="small"
                    />
                    <Chip
                      label={chatHealth?.embedding_ready ? 'Embeddings Ready' : 'Embeddings Down'}
                      sx={{
                        backgroundColor: chatHealth?.embedding_ready ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)',
                        color: chatHealth?.embedding_ready ? '#4caf50' : '#f44336',
                        border: `1px solid ${chatHealth?.embedding_ready ? '#4caf50' : '#f44336'}30`,
                        fontSize: '0.75rem',
                        height: '28px',
                        fontWeight: 500,
                      }}
                      size="small"
                    />
                  </Box>
                </Box>
                <Box sx={{
                  backgroundColor: 'rgba(255, 152, 0, 0.1)',
                  borderRadius: '50%',
                  p: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <TrendingIcon sx={{ 
                    fontSize: 40, 
                    color: '#ff9800',
                  }} />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper sx={{
            backgroundColor: 'white',
            border: '1px solid #e0e0e0',
            borderRadius: 2,
            p: 3,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}>
            <Typography 
              variant="h6" 
              gutterBottom
              sx={{
                color: '#212121',
                fontWeight: 600,
                mb: 3,
              }}
            >
              Conversații pe Zile (Ultima Săptămână)
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={conversationsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#757575', fontSize: 12 }}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#757575', fontSize: 12 }}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e0e0e0',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="conversations" 
                  stroke="#1976d2"
                  strokeWidth={3}
                  dot={{ fill: '#1976d2', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, fill: '#1976d2', stroke: 'white', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{
            backgroundColor: 'white',
            border: '1px solid #e0e0e0',
            borderRadius: 2,
            p: 3,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}>
            <Typography 
              variant="h6" 
              gutterBottom
              sx={{
                color: '#212121',
                fontWeight: 600,
                mb: 3,
              }}
            >
              Documente pe Categorii
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={documentsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#757575', fontSize: 11 }}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#757575', fontSize: 12 }}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e0e0e0',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  }}
                />
                <Bar 
                  dataKey="count" 
                  fill="#1976d2"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>

      {/* Laws Management Section */}
      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid item xs={12}>
          <Paper sx={{
            backgroundColor: 'white',
            border: '1px solid #e0e0e0',
            borderRadius: 2,
            p: 3,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}>
            <Typography 
              variant="h6" 
              gutterBottom
              sx={{
                color: '#212121',
                fontWeight: 600,
                mb: 3,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
              }}
            >
              <LawIcon sx={{ color: '#9c27b0' }} />
              Management Legi & Versiuni
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{
                  backgroundColor: '#f5f5f5',
                  borderRadius: '12px',
                  p: 2,
                  border: '1px solid #e0e0e0',
                  textAlign: 'center',
                }}>
                  <LawIcon sx={{ 
                    fontSize: 40, 
                    color: '#9c27b0', 
                    mb: 1 
                  }} />
                  <Typography variant="h4" sx={{ 
                    color: '#212121', 
                    fontWeight: 700,
                    mb: 0.5,
                  }}>
                    {lawsData?.length || 0}
                  </Typography>
                  <Typography sx={{ 
                    color: '#757575', 
                    fontSize: '0.875rem',
                    fontWeight: 500,
                  }}>
                    Legi Gestionate
                  </Typography>
                </Box>
              </Grid>
              
              <Grid item xs={12} sm={6} md={9}>
                <Box sx={{
                  backgroundColor: '#f8f9fa',
                  borderRadius: '12px',
                  p: 2,
                  border: '1px solid #e0e0e0',
                  minHeight: 120,
                }}>
                  <Typography variant="subtitle2" sx={{ 
                    color: '#212121', 
                    fontWeight: 600,
                    mb: 2,
                  }}>
                    Legi Recente
                  </Typography>
                  
                  {lawsData && lawsData.length > 0 ? (
                    <>
                    <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => navigate('/laws-upload')}
                        startIcon={<CloudUploadIcon />}
                        sx={{ 
                          borderColor: '#2196f3',
                          color: '#2196f3',
                          '&:hover': {
                            borderColor: '#1976d2',
                            backgroundColor: 'rgba(33, 150, 243, 0.04)'
                          }
                        }}
                      >
                        Upload Legi
                      </Button>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => navigate('/laws-comparison')}
                        startIcon={<CompareIcon />}
                        sx={{ 
                          borderColor: '#9c27b0',
                          color: '#9c27b0',
                          '&:hover': {
                            borderColor: '#7b1fa2',
                            backgroundColor: 'rgba(156, 39, 176, 0.04)'
                          }
                        }}
                      >
                        Compară Versiuni
                      </Button>
                    </Box>
                    <Grid container spacing={2}>
                      {lawsData.slice(0, 3).map((law) => (
                        <Grid item xs={12} sm={4} key={law.id}>
                          <Box sx={{
                            backgroundColor: 'white',
                            borderRadius: '8px',
                            p: 1.5,
                            border: '1px solid #e0e0e0',
                            transition: 'all 0.2s ease',
                            '&:hover': {
                              borderColor: '#9c27b0',
                              boxShadow: '0 2px 8px rgba(156, 39, 176, 0.1)',
                            },
                          }}>
                            <Typography sx={{ 
                              color: '#212121', 
                              fontWeight: 600,
                              fontSize: '0.85rem',
                              mb: 0.5,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}>
                              {law.title}
                            </Typography>
                            <Typography sx={{ 
                              color: '#757575', 
                              fontSize: '0.7rem',
                            }}>
                              {new Date(law.created_at).toLocaleDateString('ro-RO')}
                            </Typography>
                          </Box>
                        </Grid>
                      ))}
                    </Grid>
                    </>
                  ) : (
                    <Box sx={{ 
                      textAlign: 'center', 
                      py: 2,
                      color: '#757575',
                    }}>
                      <CompareIcon sx={{ fontSize: 32, mb: 1, opacity: 0.3 }} />
                      <Typography fontSize="0.875rem">
                        Nu sunt legi gestionate încă
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>

      {/* System Status */}
      <Grid container spacing={3} mt={2}>
        <Grid item xs={12}>
          <Paper sx={{
            backgroundColor: 'white',
            border: '1px solid #e0e0e0',
            borderRadius: 2,
            p: 3,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}>
            <Typography 
              variant="h6" 
              gutterBottom
              sx={{
                color: '#212121',
                fontWeight: 600,
                mb: 3,
              }}
            >
              Status Sistem Chat AI
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={4}>
                <Box sx={{
                  backgroundColor: '#f5f5f5',
                  borderRadius: '12px',
                  p: 2,
                  border: '1px solid #e0e0e0',
                }}>
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Typography sx={{ color: '#212121', fontWeight: 500 }}>Model Ollama</Typography>
                    <Chip
                      label={chatHealth?.ollama_ready ? 'Online' : 'Offline'}
                      sx={{
                        backgroundColor: chatHealth?.ollama_ready ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)',
                        color: chatHealth?.ollama_ready ? '#4caf50' : '#f44336',
                        border: `1px solid ${chatHealth?.ollama_ready ? '#4caf50' : '#f44336'}40`,
                        fontWeight: 600,
                      }}
                    />
                  </Box>
                </Box>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Box sx={{
                  backgroundColor: '#f5f5f5',
                  borderRadius: '12px',
                  p: 2,
                  border: '1px solid #e0e0e0',
                }}>
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Typography sx={{ color: '#212121', fontWeight: 500 }}>Serviciu Embeddings</Typography>
                    <Chip
                      label={chatHealth?.embedding_ready ? 'Ready' : 'Not Ready'}
                      sx={{
                        backgroundColor: chatHealth?.embedding_ready ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)',
                        color: chatHealth?.embedding_ready ? '#4caf50' : '#f44336',
                        border: `1px solid ${chatHealth?.embedding_ready ? '#4caf50' : '#f44336'}40`,
                        fontWeight: 600,
                      }}
                    />
                  </Box>
                </Box>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Box sx={{
                  backgroundColor: '#f5f5f5',
                  borderRadius: '12px',
                  p: 2,
                  border: '1px solid #e0e0e0',
                }}>
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Typography sx={{ color: '#212121', fontWeight: 500 }}>Status General</Typography>
                    <Chip
                      label={chatHealth?.status || 'Unknown'}
                      sx={{
                        backgroundColor: chatHealth?.status === 'healthy' ? 'rgba(76, 175, 80, 0.1)' : chatHealth?.status === 'degraded' ? 'rgba(255, 152, 0, 0.1)' : 'rgba(244, 67, 54, 0.1)',
                        color: chatHealth?.status === 'healthy' ? '#4caf50' : chatHealth?.status === 'degraded' ? '#ff9800' : '#f44336',
                        border: `1px solid ${chatHealth?.status === 'healthy' ? '#4caf50' : chatHealth?.status === 'degraded' ? '#ff9800' : '#f44336'}40`,
                        fontWeight: 600,
                      }}
                    />
                  </Box>
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