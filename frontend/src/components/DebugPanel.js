import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Collapse
} from '@mui/material';
import { 
  ExpandMore as ExpandMoreIcon, 
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Delete as DeleteIcon 
} from '@mui/icons-material';
import { debugLogger } from '../utils/debugLogger';
import { getAuthToken } from '../services/api';
import { useAuth } from '../hooks/useAuth';

function DebugPanel() {
  const [logs, setLogs] = useState([]);
  const [isVisible, setIsVisible] = useState(false);
  const { user, isAuthenticated, loading } = useAuth();

  useEffect(() => {
    const interval = setInterval(() => {
      setLogs(debugLogger.getLogs());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const getChipColor = (type) => {
    switch (type) {
      case 'error': return 'error';
      case 'warning': return 'warning';
      case 'success': return 'success';
      default: return 'info';
    }
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  if (!isVisible) {
    return (
      <Box
        sx={{
          position: 'fixed',
          bottom: 20,
          right: 20,
          zIndex: 9999
        }}
      >
        <Button
          variant="contained"
          color="secondary"
          startIcon={<VisibilityIcon />}
          onClick={() => setIsVisible(true)}
          size="small"
        >
          Debug
        </Button>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 20,
        right: 20,
        width: 400,
        maxHeight: 600,
        zIndex: 9999
      }}
    >
      <Paper elevation={8} sx={{ p: 2, maxHeight: '100%', overflow: 'auto' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">🔍 Debug Panel</Typography>
          <Box>
            <IconButton size="small" onClick={() => debugLogger.clearLogs()}>
              <DeleteIcon />
            </IconButton>
            <IconButton size="small" onClick={() => setIsVisible(false)}>
              <VisibilityOffIcon />
            </IconButton>
          </Box>
        </Box>

        {/* Current Auth State */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle1">Current Auth State</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Chip
                label={`Authenticated: ${isAuthenticated ? 'YES' : 'NO'}`}
                color={isAuthenticated ? 'success' : 'error'}
                size="small"
              />
              <Chip
                label={`Loading: ${loading ? 'YES' : 'NO'}`}
                color={loading ? 'warning' : 'default'}
                size="small"
              />
              <Chip
                label={`Has User: ${user ? 'YES' : 'NO'}`}
                color={user ? 'success' : 'error'}
                size="small"
              />
              <Chip
                label={`Has Token: ${getAuthToken() ? 'YES' : 'NO'}`}
                color={getAuthToken() ? 'success' : 'error'}
                size="small"
              />
              {user && (
                <Typography variant="body2" sx={{ mt: 1 }}>
                  User: {user.email}
                </Typography>
              )}
            </Box>
          </AccordionDetails>
        </Accordion>

        {/* Debug Logs */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle1">Debug Logs ({logs.length})</Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ p: 0 }}>
            <List dense>
              {logs.slice(-20).reverse().map((log) => (
                <ListItem key={log.id} divider>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip
                          label={log.type}
                          color={getChipColor(log.type)}
                          size="small"
                        />
                        <Typography variant="body2">
                          {formatTimestamp(log.timestamp)}
                        </Typography>
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          {log.message}
                        </Typography>
                        {log.data && (
                          <Typography variant="caption" sx={{ 
                            wordBreak: 'break-all',
                            display: 'block',
                            mt: 0.5,
                            fontFamily: 'monospace',
                            backgroundColor: 'rgba(0,0,0,0.05)',
                            p: 0.5,
                            borderRadius: 1
                          }}>
                            {log.data}
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                </ListItem>
              ))}
              {logs.length === 0 && (
                <ListItem>
                  <ListItemText primary="No logs yet..." />
                </ListItem>
              )}
            </List>
          </AccordionDetails>
        </Accordion>
      </Paper>
    </Box>
  );
}

export default DebugPanel;