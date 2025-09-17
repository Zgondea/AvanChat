import React, { useState, useEffect } from 'react';
import { useQuery } from 'react-query';
import {
  Box,
  Typography,
  Grid,
  Paper,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  LinearProgress,
  Alert,
  Divider,
  IconButton,
  Chip,
} from '@mui/material';
import {
  Compare as CompareIcon,
  Gavel as LawIcon,
  Fullscreen as FullscreenIcon,
  FullscreenExit as FullscreenExitIcon,
  Sync as SyncIcon,
} from '@mui/icons-material';

import { lawsAPI } from '../services/api';

function LawsFullDiff() {
  const [selectedLaw, setSelectedLaw] = useState('');
  const [selectedVersionFrom, setSelectedVersionFrom] = useState('');
  const [selectedVersionTo, setSelectedVersionTo] = useState('');
  const [showComparison, setShowComparison] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [syncScroll, setSyncScroll] = useState(true);

  // Fetch all laws
  const { data: lawsData, isLoading: lawsLoading } = useQuery(
    'laws-list',
    () => lawsAPI.list().then(res => res.data)
  );

  // Fetch versions for selected law
  const { data: versionsData, isLoading: versionsLoading } = useQuery(
    ['law-versions', selectedLaw],
    () => lawsAPI.listVersions(selectedLaw).then(res => res.data),
    { enabled: !!selectedLaw }
  );

  // Fetch sections for FROM version
  const { data: sectionsFrom } = useQuery(
    ['law-sections-from', selectedLaw, selectedVersionFrom],
    async () => {
      const versionData = versionsData?.find(v => v.version_no == selectedVersionFrom);
      if (!versionData) return null;
      return lawsAPI.listSections(selectedLaw, versionData.id).then(res => res.data);
    },
    { enabled: !!(selectedLaw && selectedVersionFrom && versionsData && showComparison) }
  );

  // Fetch sections for TO version  
  const { data: sectionsTo } = useQuery(
    ['law-sections-to', selectedLaw, selectedVersionTo],
    async () => {
      const versionData = versionsData?.find(v => v.version_no == selectedVersionTo);
      if (!versionData) return null;
      return lawsAPI.listSections(selectedLaw, versionData.id).then(res => res.data);
    },
    { enabled: !!(selectedLaw && selectedVersionTo && versionsData && showComparison) }
  );

  // Fetch comparison data for highlighting differences
  const { data: comparisonData } = useQuery(
    ['law-comparison', selectedLaw, selectedVersionFrom, selectedVersionTo],
    () => lawsAPI.compareVersions(selectedLaw, selectedVersionFrom, selectedVersionTo).then(res => res.data),
    { 
      enabled: !!(selectedLaw && selectedVersionFrom && selectedVersionTo && showComparison),
      refetchOnWindowFocus: false,
    }
  );

  // Create a map of all sections with their status
  const createSectionMap = () => {
    if (!sectionsFrom || !sectionsTo || !comparisonData) return { leftSections: [], rightSections: [] };

    const leftSections = [];
    const rightSections = [];

    // Get all unique section keys
    const allSections = new Set([
      ...sectionsFrom.map(s => s.section_key),
      ...sectionsTo.map(s => s.section_key)
    ]);

    // Sort sections by order or alphabetically
    const sortedSections = Array.from(allSections).sort((a, b) => {
      const numA = parseInt(a.match(/\d+/)?.[0] || '999');
      const numB = parseInt(b.match(/\d+/)?.[0] || '999');
      return numA - numB;
    });

    for (const sectionKey of sortedSections) {
      const fromSection = sectionsFrom.find(s => s.section_key === sectionKey);
      const toSection = sectionsTo.find(s => s.section_key === sectionKey);

      let status = 'equal';
      if (!fromSection && toSection) status = 'added';
      else if (fromSection && !toSection) status = 'removed';
      else if (comparisonData.modified?.find(m => m.section_key === sectionKey)) status = 'modified';

      leftSections.push({
        section_key: sectionKey,
        text: fromSection?.raw_text || '',
        status: fromSection ? status : 'removed',
        exists: !!fromSection
      });

      rightSections.push({
        section_key: sectionKey,
        text: toSection?.raw_text || '',
        status: toSection ? status : 'added',
        exists: !!toSection
      });
    }

    return { leftSections, rightSections };
  };

  const { leftSections, rightSections } = createSectionMap();

  const handleCompare = () => {
    if (selectedLaw && selectedVersionFrom && selectedVersionTo) {
      setShowComparison(true);
    }
  };

  const handleReset = () => {
    setSelectedLaw('');
    setSelectedVersionFrom('');
    setSelectedVersionTo('');
    setShowComparison(false);
  };

  const handleSyncScroll = (event) => {
    if (!syncScroll) return;
    
    const sourceElement = event.target;
    const isLeftPanel = sourceElement.closest('#left-panel');
    const targetPanel = isLeftPanel ? 
      document.getElementById('right-panel').querySelector('.scrollable-content') :
      document.getElementById('left-panel').querySelector('.scrollable-content');
    
    if (targetPanel) {
      const scrollPercentage = sourceElement.scrollTop / (sourceElement.scrollHeight - sourceElement.clientHeight);
      targetPanel.scrollTop = scrollPercentage * (targetPanel.scrollHeight - targetPanel.clientHeight);
    }
  };

  useEffect(() => {
    if (showComparison && syncScroll) {
      const leftPanel = document.getElementById('left-panel')?.querySelector('.scrollable-content');
      const rightPanel = document.getElementById('right-panel')?.querySelector('.scrollable-content');
      
      if (leftPanel && rightPanel) {
        leftPanel.addEventListener('scroll', handleSyncScroll);
        rightPanel.addEventListener('scroll', handleSyncScroll);
        
        return () => {
          leftPanel.removeEventListener('scroll', handleSyncScroll);
          rightPanel.removeEventListener('scroll', handleSyncScroll);
        };
      }
    }
  }, [showComparison, syncScroll]);

  const renderSection = (section, isLeftSide) => {
    if (!section.exists) {
      return (
        <Box
          key={section.section_key}
          sx={{
            minHeight: '80px',
            backgroundColor: '#f5f5f5',
            border: '1px dashed #ccc',
            borderRadius: 1,
            mb: 2,
            p: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: 0.5
          }}
        >
          <Typography variant="body2" color="textSecondary">
            {section.section_key} - {isLeftSide ? 'Nu există în versiunea anterioară' : 'Nu există în versiunea nouă'}
          </Typography>
        </Box>
      );
    }

    let backgroundColor = 'white';
    let borderColor = '#e0e0e0';
    let textColor = '#424242';

    switch (section.status) {
      case 'added':
        backgroundColor = '#e8f5e8';
        borderColor = '#4caf50';
        textColor = '#2e7d32';
        break;
      case 'removed':
        backgroundColor = '#ffebee';
        borderColor = '#f44336';
        textColor = '#c62828';
        break;
      case 'modified':
        backgroundColor = '#fff3e0';
        borderColor = '#ff9800';
        textColor = '#ef6c00';
        break;
      default:
        break;
    }

    return (
      <Box
        key={section.section_key}
        sx={{
          backgroundColor,
          border: `2px solid ${borderColor}`,
          borderRadius: 1,
          mb: 2,
          transition: 'all 0.2s ease'
        }}
      >
        {/* Section Header */}
        <Box sx={{
          backgroundColor: borderColor + '20',
          p: 1.5,
          borderBottom: `1px solid ${borderColor}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <Typography
            variant="subtitle2"
            sx={{ 
              fontWeight: 'bold',
              color: textColor,
              fontFamily: 'monospace'
            }}
          >
            {section.section_key}
          </Typography>
          {section.status !== 'equal' && (
            <Chip
              label={
                section.status === 'added' ? '+ ADĂUGAT' :
                section.status === 'removed' ? '- ELIMINAT' : '~ MODIFICAT'
              }
              size="small"
              sx={{
                backgroundColor: borderColor,
                color: 'white',
                fontWeight: 'bold',
                fontSize: '0.7rem'
              }}
            />
          )}
        </Box>
        
        {/* Section Content */}
        <Box sx={{ p: 2 }}>
          <Typography
            variant="body2"
            sx={{
              color: textColor,
              fontFamily: 'monospace',
              fontSize: '0.9rem',
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap'
            }}
          >
            {section.text}
          </Typography>
        </Box>
      </Box>
    );
  };

  const containerSx = isFullscreen ? {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#fafafa',
    zIndex: 9999,
    p: 2
  } : {
    backgroundColor: '#fafafa',
    minHeight: '100vh',
    p: 3
  };

  if (lawsLoading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>Full Document Diff</Typography>
        <LinearProgress />
      </Box>
    );
  }

  return (
    <Box sx={containerSx}>
      {/* Header */}
      <Box sx={{ 
        backgroundColor: 'white',
        borderRadius: 2,
        border: '1px solid #e0e0e0',
        p: 3,
        mb: 3,
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      }}>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={2}>
            <CompareIcon sx={{ fontSize: 40, color: '#9c27b0' }} />
            <Box>
              <Typography variant="h4" sx={{ color: '#212121', fontWeight: 600 }}>
                Full Document Diff
              </Typography>
              <Typography variant="body1" sx={{ color: '#757575' }}>
                Compară versiuni complete side-by-side
              </Typography>
            </Box>
          </Box>
          
          {showComparison && (
            <Box display="flex" gap={1}>
              <IconButton
                onClick={() => setSyncScroll(!syncScroll)}
                color={syncScroll ? 'primary' : 'default'}
                title={syncScroll ? 'Dezactivează scroll sincronizat' : 'Activează scroll sincronizat'}
              >
                <SyncIcon />
              </IconButton>
              <IconButton
                onClick={() => setIsFullscreen(!isFullscreen)}
                title={isFullscreen ? 'Ieși din fullscreen' : 'Fullscreen'}
              >
                {isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
              </IconButton>
            </Box>
          )}
        </Box>
      </Box>

      {/* Selection Panel */}
      {!isFullscreen && (
        <Paper sx={{ p: 3, mb: 3, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LawIcon sx={{ color: '#9c27b0' }} />
            Selectare Lege și Versiuni
          </Typography>
          
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Selectează Legea</InputLabel>
                <Select
                  value={selectedLaw}
                  label="Selectează Legea"
                  onChange={(e) => {
                    setSelectedLaw(e.target.value);
                    setSelectedVersionFrom('');
                    setSelectedVersionTo('');
                    setShowComparison(false);
                  }}
                >
                  {lawsData?.map((law) => (
                    <MenuItem key={law.id} value={law.id}>
                      {law.title}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={3}>
              <FormControl fullWidth disabled={!selectedLaw || versionsLoading}>
                <InputLabel>Versiunea Stânga</InputLabel>
                <Select
                  value={selectedVersionFrom}
                  label="Versiunea Stânga"
                  onChange={(e) => {
                    setSelectedVersionFrom(e.target.value);
                    setShowComparison(false);
                  }}
                >
                  {versionsData?.map((version) => (
                    <MenuItem key={version.id} value={version.version_no}>
                      V{version.version_no} ({new Date(version.created_at).toLocaleDateString('ro-RO')})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={3}>
              <FormControl fullWidth disabled={!selectedLaw || versionsLoading}>
                <InputLabel>Versiunea Dreapta</InputLabel>
                <Select
                  value={selectedVersionTo}
                  label="Versiunea Dreapta"
                  onChange={(e) => {
                    setSelectedVersionTo(e.target.value);
                    setShowComparison(false);
                  }}
                >
                  {versionsData?.map((version) => (
                    <MenuItem key={version.id} value={version.version_no}>
                      V{version.version_no} ({new Date(version.created_at).toLocaleDateString('ro-RO')})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={2}>
              <Button
                variant="contained"
                fullWidth
                sx={{ 
                  height: '56px',
                  backgroundColor: '#9c27b0',
                  '&:hover': { backgroundColor: '#7b1fa2' }
                }}
                disabled={!selectedLaw || !selectedVersionFrom || !selectedVersionTo}
                onClick={handleCompare}
              >
                Compară
              </Button>
            </Grid>
          </Grid>

          {showComparison && (
            <Box sx={{ mt: 2 }}>
              <Button variant="outlined" onClick={handleReset}>
                Resetează Selecția
              </Button>
            </Box>
          )}
        </Paper>
      )}

      {/* Full Document Comparison */}
      {showComparison && leftSections && rightSections && (
        <Box sx={{ flexGrow: 1, height: isFullscreen ? 'calc(100vh - 200px)' : '80vh' }}>
          <Grid container spacing={0} sx={{ height: '100%', border: '1px solid #e0e0e0', borderRadius: 1 }}>
            {/* Left Panel - FROM Version */}
            <Grid item xs={6} id="left-panel" sx={{ borderRight: '1px solid #e0e0e0' }}>
              <Box sx={{ 
                backgroundColor: '#f8f9fa', 
                p: 2, 
                borderBottom: '1px solid #e0e0e0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#c62828' }}>
                  Versiunea {selectedVersionFrom}
                </Typography>
                <Chip 
                  label={`${leftSections.filter(s => s.exists).length} secțiuni`}
                  size="small"
                  variant="outlined"
                />
              </Box>
              <Box 
                className="scrollable-content"
                sx={{ 
                  height: 'calc(100% - 73px)',
                  overflowY: 'auto',
                  p: 2,
                  backgroundColor: 'white'
                }}
              >
                {leftSections.map((section) => renderSection(section, true))}
              </Box>
            </Grid>

            {/* Right Panel - TO Version */}
            <Grid item xs={6} id="right-panel">
              <Box sx={{ 
                backgroundColor: '#f8f9fa', 
                p: 2, 
                borderBottom: '1px solid #e0e0e0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#2e7d32' }}>
                  Versiunea {selectedVersionTo}
                </Typography>
                <Chip 
                  label={`${rightSections.filter(s => s.exists).length} secțiuni`}
                  size="small"
                  variant="outlined"
                />
              </Box>
              <Box 
                className="scrollable-content"
                sx={{ 
                  height: 'calc(100% - 73px)',
                  overflowY: 'auto',
                  p: 2,
                  backgroundColor: 'white'
                }}
              >
                {rightSections.map((section) => renderSection(section, false))}
              </Box>
            </Grid>
          </Grid>
        </Box>
      )}

      {showComparison && (!leftSections || !rightSections) && (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <LinearProgress sx={{ mb: 2 }} />
          <Typography>Se încarcă documentele...</Typography>
        </Paper>
      )}
    </Box>
  );
}

export default LawsFullDiff;