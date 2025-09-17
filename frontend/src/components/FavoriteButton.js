import React, { useState, useEffect } from 'react';
import { IconButton, Tooltip, CircularProgress } from '@mui/material';
import { Favorite, FavoriteBorder } from '@mui/icons-material';
import { favoritesAPI } from '../services/api';

const FavoriteButton = ({ lawId, userId, size = 'medium', onToggle }) => {
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Generate user ID if not provided (for anonymous users)
  const effectiveUserId = userId || (() => {
    let sessionId = localStorage.getItem('law_session_id');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('law_session_id', sessionId);
    }
    return sessionId;
  })();

  // Check if law is favorite on mount
  useEffect(() => {
    const checkFavoriteStatus = async () => {
      try {
        const response = await favoritesAPI.check(lawId, effectiveUserId);
        setIsFavorite(response.data.is_favorite);
      } catch (error) {
        console.error('Error checking favorite status:', error);
      } finally {
        setInitialLoading(false);
      }
    };

    if (lawId && effectiveUserId) {
      checkFavoriteStatus();
    }
  }, [lawId, effectiveUserId]);

  const handleToggleFavorite = async (event) => {
    event.stopPropagation(); // Prevent triggering parent click events
    
    if (loading) return;

    setLoading(true);
    
    try {
      if (isFavorite) {
        // Remove from favorites
        await favoritesAPI.remove(lawId, effectiveUserId);
        setIsFavorite(false);
        if (onToggle) onToggle(false);
      } else {
        // Add to favorites
        await favoritesAPI.add(lawId, effectiveUserId);
        setIsFavorite(true);
        if (onToggle) onToggle(true);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      // Show error feedback to user
      if (error.response?.status === 400 && error.response?.data?.detail?.includes('already in favorites')) {
        setIsFavorite(true); // Already favorite, update state
      }
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <IconButton size={size} disabled>
        <CircularProgress size={size === 'small' ? 16 : 20} />
      </IconButton>
    );
  }

  return (
    <Tooltip title={isFavorite ? 'Elimină din favorite' : 'Adaugă la favorite'}>
      <IconButton
        onClick={handleToggleFavorite}
        disabled={loading}
        size={size}
        sx={{
          color: isFavorite ? '#e91e63' : '#757575',
          transition: 'all 0.2s ease',
          '&:hover': {
            color: isFavorite ? '#ad1457' : '#e91e63',
            transform: 'scale(1.1)',
          },
          position: 'relative'
        }}
      >
        {loading ? (
          <CircularProgress 
            size={size === 'small' ? 16 : 20} 
            sx={{ color: 'inherit' }}
          />
        ) : isFavorite ? (
          <Favorite 
            sx={{ 
              fontSize: size === 'small' ? '1rem' : '1.5rem',
              filter: 'drop-shadow(0 0 4px rgba(233, 30, 99, 0.3))'
            }} 
          />
        ) : (
          <FavoriteBorder 
            sx={{ 
              fontSize: size === 'small' ? '1rem' : '1.5rem' 
            }} 
          />
        )}
      </IconButton>
    </Tooltip>
  );
};

export default FavoriteButton;