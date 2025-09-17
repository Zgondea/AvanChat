import React, { useState, useEffect, useCallback } from 'react';
import {
  IconButton,
  Badge,
  Menu,
  Typography,
  Box,
  Divider,
  Button,
  List,
  ListItem,
  Chip,
  Alert,
  CircularProgress,
  Tooltip
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  NotificationsNone as NotificationsNoneIcon,
  Delete as DeleteIcon,
  DoneAll as DoneAllIcon,
  NewReleases as NewIcon,
  Update as UpdateIcon
} from '@mui/icons-material';
import { notificationsAPI } from '../services/api';

const NotificationBell = ({ userId }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Generate user ID if not provided
  const effectiveUserId = userId || (() => {
    let sessionId = localStorage.getItem('law_session_id');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
      localStorage.setItem('law_session_id', sessionId);
    }
    return sessionId;
  })();

  // Load notifications count
  const loadNotificationsCount = useCallback(async () => {
    try {
      const response = await notificationsAPI.getCount(effectiveUserId, true);
      setUnreadCount(response.data.count);
    } catch (error) {
      console.error('Error loading notifications count:', error);
    }
  }, [effectiveUserId]);

  // Load notifications list
  const loadNotifications = async () => {
    if (loading) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await notificationsAPI.list(effectiveUserId, false, 10, 0);
      setNotifications(response.data);
    } catch (error) {
      console.error('Error loading notifications:', error);
      setError('Nu s-au putut încărca notificările');
    } finally {
      setLoading(false);
    }
  };

  // Mark notification as read
  const markAsRead = async (notificationId) => {
    try {
      await notificationsAPI.markRead(notificationId, effectiveUserId);
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      await notificationsAPI.markAllRead(effectiveUserId);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  // Delete notification
  const deleteNotification = async (notificationId) => {
    try {
      await notificationsAPI.delete(notificationId, effectiveUserId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      if (!notifications.find(n => n.id === notificationId)?.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  // Handle menu open
  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
    loadNotifications();
  };

  // Handle menu close
  const handleClose = () => {
    setAnchorEl(null);
  };

  // Load count on mount and set interval for updates
  useEffect(() => {
    loadNotificationsCount();
    
    // Update count every 30 seconds
    const interval = setInterval(loadNotificationsCount, 30000);
    
    return () => clearInterval(interval);
  }, [loadNotificationsCount]);

  // Get notification icon based on type
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'new_version':
        return <NewIcon sx={{ color: '#2e7d32', fontSize: '1rem' }} />;
      case 'content_change':
        return <UpdateIcon sx={{ color: '#ff9800', fontSize: '1rem' }} />;
      default:
        return <NotificationsIcon sx={{ color: '#9c27b0', fontSize: '1rem' }} />;
    }
  };

  // Format notification time
  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Acum';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    return `${diffDays}z`;
  };

  const open = Boolean(anchorEl);

  return (
    <>
      <Tooltip title="Notificări">
        <IconButton
          onClick={handleClick}
          sx={{
            color: unreadCount > 0 ? '#e91e63' : '#757575',
            transition: 'all 0.2s ease',
            '&:hover': {
              color: '#e91e63',
              transform: 'scale(1.05)',
            }
          }}
        >
          <Badge 
            badgeContent={unreadCount} 
            color="error"
            max={99}
            sx={{
              '& .MuiBadge-badge': {
                animation: unreadCount > 0 ? 'pulse 2s infinite' : 'none',
                '@keyframes pulse': {
                  '0%': { transform: 'scale(1)' },
                  '50%': { transform: 'scale(1.1)' },
                  '100%': { transform: 'scale(1)' }
                }
              }
            }}
          >
            {unreadCount > 0 ? <NotificationsIcon /> : <NotificationsNoneIcon />}
          </Badge>
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        PaperProps={{
          sx: {
            width: 400,
            maxHeight: 500,
            mt: 1,
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          }
        }}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        {/* Header */}
        <Box sx={{ p: 2, borderBottom: '1px solid #e0e0e0' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              Notificări
            </Typography>
            {unreadCount > 0 && (
              <Button
                size="small"
                onClick={markAllAsRead}
                startIcon={<DoneAllIcon />}
                sx={{ color: '#9c27b0' }}
              >
                Marchează toate
              </Button>
            )}
          </Box>
          {unreadCount > 0 && (
            <Typography variant="body2" sx={{ color: '#757575', mt: 0.5 }}>
              {unreadCount} notificări necitite
            </Typography>
          )}
        </Box>

        {/* Content */}
        {loading ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <CircularProgress size={24} />
            <Typography variant="body2" sx={{ mt: 1, color: '#757575' }}>
              Se încarcă notificările...
            </Typography>
          </Box>
        ) : error ? (
          <Box sx={{ p: 2 }}>
            <Alert severity="error" size="small">
              {error}
            </Alert>
          </Box>
        ) : notifications.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <NotificationsNoneIcon sx={{ fontSize: '3rem', color: '#ccc', mb: 1 }} />
            <Typography variant="body2" sx={{ color: '#757575' }}>
              Nu ai notificări
            </Typography>
            <Typography variant="caption" sx={{ color: '#999' }}>
              Vei primi notificări când se modifică legile favorite
            </Typography>
          </Box>
        ) : (
          <List sx={{ p: 0, maxHeight: 300, overflow: 'auto' }}>
            {notifications.map((notification, index) => (
              <React.Fragment key={notification.id}>
                <ListItem
                  sx={{
                    backgroundColor: notification.is_read ? 'transparent' : 'rgba(233, 30, 99, 0.04)',
                    cursor: 'pointer',
                    '&:hover': { backgroundColor: 'rgba(0,0,0,0.04)' }
                  }}
                  onClick={() => !notification.is_read && markAsRead(notification.id)}
                >
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', width: '100%', gap: 1 }}>
                    {getNotificationIcon(notification.notification_type)}
                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: notification.is_read ? 'normal' : 'bold',
                          color: notification.is_read ? '#757575' : '#212121',
                          lineHeight: 1.4
                        }}
                      >
                        {notification.law_title}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          color: '#666',
                          display: 'block',
                          mt: 0.5,
                          lineHeight: 1.3
                        }}
                      >
                        {notification.message}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                        <Typography variant="caption" sx={{ color: '#999' }}>
                          {formatTime(notification.created_at)}
                        </Typography>
                        {notification.version_from && notification.version_to && (
                          <Chip
                            label={`V${notification.version_from} → V${notification.version_to}`}
                            size="small"
                            sx={{
                              height: 18,
                              fontSize: '0.6rem',
                              backgroundColor: '#f0f0f0',
                              color: '#666'
                            }}
                          />
                        )}
                      </Box>
                    </Box>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(notification.id);
                      }}
                      sx={{ opacity: 0.6, '&:hover': { opacity: 1 } }}
                    >
                      <DeleteIcon sx={{ fontSize: '1rem' }} />
                    </IconButton>
                  </Box>
                </ListItem>
                {index < notifications.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        )}

        {/* Footer */}
        {notifications.length > 0 && (
          <Box sx={{ p: 1.5, borderTop: '1px solid #e0e0e0', textAlign: 'center' }}>
            <Button
              size="small"
              sx={{ color: '#9c27b0' }}
              onClick={() => {
                handleClose();
                // Aici poți naviga către o pagină dedicată notificărilor
                console.log('Navigate to notifications page');
              }}
            >
              Vezi toate notificările
            </Button>
          </Box>
        )}
      </Menu>
    </>
  );
};

export default NotificationBell;