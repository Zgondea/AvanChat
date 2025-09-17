import React, { useState } from 'react';
import * as Diff from 'diff';
import { useQuery } from 'react-query';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Paper,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  LinearProgress,
  Alert,
  Divider,
  TextField,
  InputAdornment,
  IconButton,
  Pagination,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Compare as CompareIcon,
  Gavel as LawIcon,
  Timeline as TimelineIcon,
  Difference as DiffIcon,
  Splitscreen as SplitscreenIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  ViewCompact as CompactIcon,
  ViewStream as ExpandedIcon,
  GetApp as ExportIcon,
} from '@mui/icons-material';

import { lawsAPI } from '../services/api';
import FavoriteButton from '../components/FavoriteButton';

// Enhanced function to render text diff with better highlighting
const renderTextDiff = (fromText, toText, mode = 'words') => {
  if (!fromText && !toText) return null;
  if (!fromText) return (
    <span style={{ 
      backgroundColor: '#e8f5e8', 
      padding: '4px 6px',
      borderRadius: '3px',
      border: '1px solid #c8e6c9',
      display: 'inline-block',
      margin: '1px'
    }}>
      <strong style={{ color: '#2e7d32' }}>+ </strong>{toText}
    </span>
  );
  if (!toText) return (
    <span style={{ 
      backgroundColor: '#ffebee', 
      padding: '4px 6px',
      borderRadius: '3px',
      border: '1px solid #ffcdd2',
      textDecoration: 'line-through',
      display: 'inline-block',
      margin: '1px'
    }}>
      <strong style={{ color: '#d32f2f' }}>- </strong>{fromText}
    </span>
  );
  
  // Use different diff methods based on text length
  const isLongText = fromText.length > 500 || toText.length > 500;
  const diff = isLongText 
    ? Diff.diffSentences(fromText, toText)
    : mode === 'chars' 
      ? Diff.diffChars(fromText, toText)
      : Diff.diffWords(fromText, toText);
  
  return (
    <span>
      {diff.map((part, index) => {
        if (part.added) {
          return (
            <span 
              key={index} 
              style={{ 
                backgroundColor: '#e8f5e8', 
                padding: '2px 4px',
                borderRadius: '2px',
                border: '1px solid #c8e6c9',
                color: '#1b5e20',
                fontWeight: 'bold',
                display: 'inline',
                margin: '1px',
                position: 'relative'
              }}
              title="Adăugat în versiunea nouă"
            >
              <span style={{ fontSize: '0.8em', color: '#2e7d32', marginRight: '2px' }}>+</span>
              {part.value}
            </span>
          );
        } else if (part.removed) {
          return (
            <span 
              key={index} 
              style={{ 
                backgroundColor: '#ffebee', 
                padding: '2px 4px',
                borderRadius: '2px',
                border: '1px solid #ffcdd2',
                color: '#b71c1c',
                textDecoration: 'line-through',
                fontWeight: 'bold',
                display: 'inline',
                margin: '1px',
                position: 'relative'
              }}
              title="Eliminat din versiunea veche"
            >
              <span style={{ fontSize: '0.8em', color: '#d32f2f', marginRight: '2px' }}>-</span>
              {part.value}
            </span>
          );
        } else {
          return (
            <span 
              key={index}
              style={{
                color: '#424242',
                padding: '2px 1px',
                display: 'inline'
              }}
            >
              {part.value}
            </span>
          );
        }
      })}
    </span>
  );
};

function LawsComparison() {
  const [selectedLaw, setSelectedLaw] = useState('');
  const [selectedVersionFrom, setSelectedVersionFrom] = useState('');
  const [selectedVersionTo, setSelectedVersionTo] = useState('');
  const [showComparison, setShowComparison] = useState(false);
  const [diffViewMode, setDiffViewMode] = useState('inline'); // 'inline', 'split', 'diff', or 'full'
  const [fullDocViewMode, setFullDocViewMode] = useState('split'); // 'split' or 'diff' for full document
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all', 'added', 'removed', 'modified'
  const [currentPage, setCurrentPage] = useState(1);
  const [resultsPerPage, setResultsPerPage] = useState(10);
  const [compactMode, setCompactMode] = useState(false);

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

  // Fetch comparison data
  const { data: comparisonData, isLoading: comparisonLoading } = useQuery(
    ['law-comparison', selectedLaw, selectedVersionFrom, selectedVersionTo],
    () => lawsAPI.compareVersions(selectedLaw, selectedVersionFrom, selectedVersionTo).then(res => res.data),
    { 
      enabled: !!(selectedLaw && selectedVersionFrom && selectedVersionTo && showComparison),
      refetchOnWindowFocus: false,
    }
  );

  // Fetch section diffs for modified sections
  const { data: sectionDiffs } = useQuery(
    ['section-diffs', selectedLaw, selectedVersionFrom, selectedVersionTo, comparisonData?.modified],
    async () => {
      if (!comparisonData?.modified?.length) return {};
      
      const diffs = {};
      for (const item of comparisonData.modified) {
        try {
          const response = await lawsAPI.getSectionDiff(
            selectedLaw, 
            item.section_key, 
            selectedVersionFrom, 
            selectedVersionTo, 
            'inline'
          );
          diffs[item.section_key] = response.data;
        } catch (error) {
          console.error(`Error fetching diff for ${item.section_key}:`, error);
        }
      }
      return diffs;
    },
    { 
      enabled: !!(comparisonData?.modified?.length && showComparison && diffViewMode !== 'full'),
      refetchOnWindowFocus: false,
    }
  );

  // Fetch full version sections for full diff mode
  const { data: sectionsFrom, isLoading: sectionsFromLoading, error: sectionsFromError } = useQuery(
    ['law-sections-from', selectedLaw, selectedVersionFrom, versionsData],
    async () => {
      // Find version by version_no to get the UUID
      const version = versionsData?.find(v => v.version_no === selectedVersionFrom);
      if (!version) throw new Error(`Version ${selectedVersionFrom} not found`);
      return lawsAPI.listSections(selectedLaw, version.id).then(res => res.data);
    },
    { 
      enabled: !!(selectedLaw && selectedVersionFrom && versionsData && diffViewMode === 'full'),
      refetchOnWindowFocus: false,
    }
  );

  const { data: sectionsTo, isLoading: sectionsToLoading, error: sectionsToError } = useQuery(
    ['law-sections-to', selectedLaw, selectedVersionTo, versionsData],
    async () => {
      // Find version by version_no to get the UUID
      const version = versionsData?.find(v => v.version_no === selectedVersionTo);
      if (!version) throw new Error(`Version ${selectedVersionTo} not found`);
      return lawsAPI.listSections(selectedLaw, version.id).then(res => res.data);
    },
    { 
      enabled: !!(selectedLaw && selectedVersionTo && versionsData && diffViewMode === 'full'),
      refetchOnWindowFocus: false,
    }
  );

  // Advanced search query
  const { data: searchResults, isLoading: searchLoading } = useQuery(
    ['law-search', selectedLaw, selectedVersionFrom, selectedVersionTo, searchTerm, filterType],
    () => {
      return lawsAPI.searchDifferences(
        selectedLaw,
        selectedVersionFrom,
        selectedVersionTo,
        {
          search_term: searchTerm.trim() || null,
          modification_type: filterType
        }
      ).then(res => res.data);
    },
    {
      enabled: !!(
        selectedLaw && 
        selectedVersionFrom && 
        selectedVersionTo && 
        diffViewMode === 'full' && 
        fullDocViewMode === 'diff'
      ),
      refetchOnWindowFocus: false,
    }
  );

  const handleCompare = () => {
    if (selectedLaw && selectedVersionFrom && selectedVersionTo) {
      setShowComparison(true);
    }
  };


  const handleExportComparison = () => {
    if (!searchResults || !comparisonData) return;
    
    // Create exportable content
    const lawTitle = lawsData?.find(law => law.id === selectedLaw)?.title || 'Lege necunoscută';
    const exportData = {
      lawTitle,
      fromVersion: selectedVersionFrom,
      toVersion: selectedVersionTo,
      exportDate: new Date().toLocaleString('ro-RO'),
      summary: comparisonData.summary,
      results: searchResults,
      searchTerm,
      filterType
    };
    
    // Generate text content
    let content = `COMPARARE VERSIUNI LEGI\n`;
    content += `=============================\n\n`;
    content += `Lege: ${lawTitle}\n`;
    content += `De la versiunea: ${selectedVersionFrom}\n`;
    content += `Către versiunea: ${selectedVersionTo}\n`;
    content += `Data export: ${exportData.exportDate}\n`;
    if (searchTerm) content += `Termen căutat: "${searchTerm}"\n`;
    content += `Filtru: ${filterType}\n\n`;
    
    content += `SUMAR:\n`;
    content += `- Secțiuni adăugate: ${comparisonData.summary.added_count}\n`;
    content += `- Secțiuni eliminate: ${comparisonData.summary.removed_count}\n`;
    content += `- Secțiuni modificate: ${comparisonData.summary.modified_count}\n`;
    content += `- Schimbare totală: ${comparisonData.summary.changed_pct.toFixed(1)}%\n\n`;
    
    content += `REZULTATE CĂUTARE (${searchResults.length} găsite):\n`;
    content += `=====================================\n\n`;
    
    searchResults.forEach((section, index) => {
      content += `${index + 1}. ${section.section_key} [${section.status.toUpperCase()}]\n`;
      content += `-`.repeat(50) + `\n`;
      
      if (section.status === 'modified' && section.from_content && section.to_content) {
        content += `VERSIUNEA ${selectedVersionFrom}:\n${section.from_content}\n\n`;
        content += `VERSIUNEA ${selectedVersionTo}:\n${section.to_content}\n\n`;
      } else {
        content += `${section.raw_text || 'Conținut indisponibil'}\n\n`;
      }
    });
    
    // Download as text file
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `comparare_legi_v${selectedVersionFrom}_v${selectedVersionTo}_${Date.now()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Create section map for full diff mode
  const createSectionMap = () => {
    if (!sectionsFrom || !sectionsTo) return [];
    
    console.log('sectionsFrom:', sectionsFrom);
    console.log('sectionsTo:', sectionsTo);
    
    const allSections = new Set([
      ...sectionsFrom.map(s => s.section_key),
      ...sectionsTo.map(s => s.section_key)
    ]);
    
    const sortedSections = Array.from(allSections).sort((a, b) => {
      const numA = parseInt(a.match(/\d+/)?.[0] || '999');
      const numB = parseInt(b.match(/\d+/)?.[0] || '999');
      return numA - numB;
    });
    
    const result = sortedSections.map(sectionKey => {
      const fromSection = sectionsFrom.find(s => s.section_key === sectionKey);
      const toSection = sectionsTo.find(s => s.section_key === sectionKey);
      
      let status = 'equal';
      if (!fromSection && toSection) status = 'added';
      else if (fromSection && !toSection) status = 'removed';
      else if (fromSection && toSection && fromSection.raw_text !== toSection.raw_text) status = 'modified';
      
      const sectionData = {
        section_key: sectionKey,
        from_content: fromSection?.raw_text || '',
        to_content: toSection?.raw_text || '',
        status
      };
      
      console.log('Section data:', sectionData);
      return sectionData;
    });
    
    console.log('Final result:', result);
    return result;
  };

  const renderDiffText = (ops) => {
    if (!ops) return null;
    
    return ops.map((op, index) => {
      let style = {};
      let prefix = '';
      
      switch (op.type) {
        case 'ins':
          style = { backgroundColor: '#e8f5e8', color: '#2e7d32', fontWeight: 'bold' };
          prefix = '+ ';
          break;
        case 'del':
          style = { backgroundColor: '#ffebee', color: '#c62828', textDecoration: 'line-through' };
          prefix = '- ';
          break;
        case 'equal':
          style = { color: '#424242' };
          break;
        default:
          break;
      }
      
      return (
        <span key={index} style={style}>
          {prefix}{op.text}
        </span>
      );
    });
  };

  const renderSideBySideDiff = (ops, sectionKey) => {
    if (!ops) return null;

    const leftSide = [];
    const rightSide = [];
    
    ops.forEach((op) => {
      switch (op.type) {
        case 'equal':
          leftSide.push({ type: 'equal', text: op.text });
          rightSide.push({ type: 'equal', text: op.text });
          break;
        case 'del':
          leftSide.push({ type: 'del', text: op.text });
          rightSide.push({ type: 'empty', text: '' });
          break;
        case 'ins':
          leftSide.push({ type: 'empty', text: '' });
          rightSide.push({ type: 'ins', text: op.text });
          break;
        default:
          break;
      }
    });

    return (
      <Grid container spacing={0} sx={{ border: '1px solid #e0e0e0', borderRadius: 1 }}>
        {/* Left side - From Version */}
        <Grid item xs={6} sx={{ borderRight: '1px solid #e0e0e0' }}>
          <Box sx={{ 
            backgroundColor: '#f8f9fa', 
            p: 1, 
            borderBottom: '1px solid #e0e0e0',
            fontWeight: 'bold',
            fontSize: '0.875rem',
            color: '#c62828'
          }}>
            Versiunea {comparisonData.from_version}
          </Box>
          <Box sx={{ 
            p: 2, 
            fontFamily: 'monospace', 
            fontSize: '0.9rem',
            lineHeight: 1.6,
            minHeight: '100px',
            backgroundColor: 'white'
          }}>
            {leftSide.map((part, index) => (
              <span key={index} style={{
                backgroundColor: part.type === 'del' ? '#ffebee' : 'transparent',
                color: part.type === 'del' ? '#c62828' : '#424242',
                textDecoration: part.type === 'del' ? 'line-through' : 'none'
              }}>
                {part.text}
              </span>
            ))}
          </Box>
        </Grid>

        {/* Right side - To Version */}
        <Grid item xs={6}>
          <Box sx={{ 
            backgroundColor: '#f8f9fa', 
            p: 1, 
            borderBottom: '1px solid #e0e0e0',
            fontWeight: 'bold',
            fontSize: '0.875rem',
            color: '#2e7d32'
          }}>
            Versiunea {comparisonData.to_version}
          </Box>
          <Box sx={{ 
            p: 2, 
            fontFamily: 'monospace', 
            fontSize: '0.9rem',
            lineHeight: 1.6,
            minHeight: '100px',
            backgroundColor: 'white'
          }}>
            {rightSide.map((part, index) => (
              <span key={index} style={{
                backgroundColor: part.type === 'ins' ? '#e8f5e8' : 'transparent',
                color: part.type === 'ins' ? '#2e7d32' : '#424242',
                fontWeight: part.type === 'ins' ? 'bold' : 'normal'
              }}>
                {part.text}
              </span>
            ))}
          </Box>
        </Grid>
      </Grid>
    );
  };

  if (lawsLoading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>Comparare Legi</Typography>
        <LinearProgress />
      </Box>
    );
  }

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
        <Box display="flex" alignItems="center" gap={2} mb={2}>
          <CompareIcon sx={{ fontSize: 40, color: '#9c27b0' }} />
          <Box>
            <Typography variant="h4" sx={{ color: '#212121', fontWeight: 600 }}>
              Comparare Versiuni Legi
            </Typography>
            <Typography variant="body1" sx={{ color: '#757575' }}>
              Selectează o lege și două versiuni pentru a vedea diferențele
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Laws Gallery */}
      {!selectedLaw ? (
        <Box>
          <Paper sx={{ p: 3, mb: 3, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <LawIcon sx={{ color: '#9c27b0' }} />
              Selectează o Lege pentru Comparare
            </Typography>
          </Paper>
          
          <Grid container spacing={3}>
            {lawsData?.map((law) => (
              <Grid item xs={12} sm={6} md={4} key={law.id}>
                <Card 
                  sx={{ 
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    border: '2px solid transparent',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: '0 8px 25px rgba(156, 39, 176, 0.15)',
                      borderColor: '#9c27b0'
                    }
                  }}
                  onClick={() => {
                    setSelectedLaw(law.id);
                    setSelectedVersionFrom('');
                    setSelectedVersionTo('');
                    setShowComparison(false);
                  }}
                >
                  <CardContent sx={{ flexGrow: 1, p: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                      <LawIcon sx={{ color: '#9c27b0', fontSize: '2rem', mr: 2, mt: 0.5 }} />
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography 
                          variant="h6" 
                          sx={{ 
                            fontWeight: 'bold',
                            color: '#212121',
                            lineHeight: 1.3,
                            mb: 1
                          }}
                        >
                          {law.title}
                        </Typography>
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            color: '#757575',
                            fontSize: '0.875rem'
                          }}
                        >
                          Creată: {new Date(law.created_at).toLocaleDateString('ro-RO')}
                        </Typography>
                      </Box>
                      <FavoriteButton 
                        lawId={law.id} 
                        size="medium"
                        onToggle={(isFavorite) => {
                          // Aici poți adăuga feedback visual sau notificări
                          console.log(`Law ${law.title} ${isFavorite ? 'added to' : 'removed from'} favorites`);
                        }}
                      />
                    </Box>
                    
                    <Divider sx={{ my: 2 }} />
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Chip 
                        label="Analizează Versiuni"
                        size="small"
                        sx={{
                          backgroundColor: '#f3e5f5',
                          color: '#9c27b0',
                          fontWeight: 'bold'
                        }}
                      />
                      <DiffIcon sx={{ color: '#9c27b0', fontSize: '1.5rem' }} />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
          
          {(!lawsData || lawsData.length === 0) && (
            <Paper sx={{ p: 6, textAlign: 'center', backgroundColor: '#f8f9fa' }}>
              <LawIcon sx={{ fontSize: '4rem', color: '#ccc', mb: 2 }} />
              <Typography variant="h6" sx={{ color: '#757575', mb: 1 }}>
                Nu sunt legi disponibile
              </Typography>
              <Typography variant="body2" sx={{ color: '#999' }}>
                Contactează administratorul pentru a adăuga legi în sistem
              </Typography>
            </Paper>
          )}
        </Box>
      ) : (
        // Version Selection Panel (shown after law is selected)
        <Paper sx={{ p: 3, mb: 3, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <LawIcon sx={{ color: '#9c27b0' }} />
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                  {lawsData?.find(law => law.id === selectedLaw)?.title}
                </Typography>
                <Typography variant="body2" sx={{ color: '#757575' }}>
                  Selectează versiunile pentru comparare
                </Typography>
              </Box>
            </Box>
            <Button 
              variant="outlined" 
              size="small"
              onClick={() => {
                setSelectedLaw('');
                setSelectedVersionFrom('');
                setSelectedVersionTo('');
                setShowComparison(false);
              }}
              sx={{ 
                borderColor: '#9c27b0',
                color: '#9c27b0',
                '&:hover': { backgroundColor: 'rgba(156, 39, 176, 0.04)' }
              }}
            >
              ← Înapoi la Legi
            </Button>
          </Box>
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth disabled={versionsLoading}>
                <InputLabel>Versiunea De La</InputLabel>
                <Select
                  value={selectedVersionFrom}
                  label="Versiunea De La"
                  onChange={(e) => {
                    setSelectedVersionFrom(e.target.value);
                    setShowComparison(false);
                  }}
                >
                  {versionsData?.map((version) => (
                    <MenuItem key={version.id} value={version.version_no}>
                      Versiunea {version.version_no} ({new Date(version.created_at).toLocaleDateString('ro-RO')})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={4}>
              <FormControl fullWidth disabled={versionsLoading}>
                <InputLabel>Versiunea Către</InputLabel>
                <Select
                  value={selectedVersionTo}
                  label="Versiunea Către"
                  onChange={(e) => {
                    setSelectedVersionTo(e.target.value);
                    setShowComparison(false);
                  }}
                >
                  {versionsData?.map((version) => (
                    <MenuItem key={version.id} value={version.version_no}>
                      Versiunea {version.version_no} ({new Date(version.created_at).toLocaleDateString('ro-RO')})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={4}>
              <Button
                variant="contained"
                fullWidth
                sx={{ 
                  height: '56px',
                  backgroundColor: '#9c27b0',
                  '&:hover': { backgroundColor: '#7b1fa2' }
                }}
                disabled={!selectedVersionFrom || !selectedVersionTo || selectedVersionFrom === selectedVersionTo}
                onClick={handleCompare}
                startIcon={<DiffIcon />}
              >
                Compară Versiuni
              </Button>
            </Grid>
          </Grid>

          {selectedVersionFrom === selectedVersionTo && selectedVersionFrom && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              Selectează versiuni diferite pentru comparare
            </Alert>
          )}
        </Paper>
      )}
      
      {/* View Mode Controls */}
      {showComparison && (
        <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center', justifyContent: 'center' }}>
          <Typography variant="body2" sx={{ color: '#757575' }}>
            Mod vizualizare:
          </Typography>
          <Button
            variant={diffViewMode === 'inline' ? 'contained' : 'outlined'}
            size="small"
            onClick={() => setDiffViewMode('inline')}
            sx={{ 
              backgroundColor: diffViewMode === 'inline' ? '#9c27b0' : 'transparent',
              borderColor: '#9c27b0',
              color: diffViewMode === 'inline' ? 'white' : '#9c27b0',
              '&:hover': {
                backgroundColor: diffViewMode === 'inline' ? '#7b1fa2' : 'rgba(156, 39, 176, 0.04)'
              }
            }}
          >
            Inline
          </Button>
          <Button
            variant={diffViewMode === 'split' ? 'contained' : 'outlined'}
            size="small"
            onClick={() => setDiffViewMode('split')}
            sx={{ 
              backgroundColor: diffViewMode === 'split' ? '#9c27b0' : 'transparent',
              borderColor: '#9c27b0',
              color: diffViewMode === 'split' ? 'white' : '#9c27b0',
              '&:hover': {
                backgroundColor: diffViewMode === 'split' ? '#7b1fa2' : 'rgba(156, 39, 176, 0.04)'
              }
            }}
          >
            Side-by-side
          </Button>
          <Button
            variant={diffViewMode === 'diff' ? 'contained' : 'outlined'}
            size="small"
            onClick={() => setDiffViewMode('diff')}
            startIcon={<DiffIcon />}
            sx={{ 
              backgroundColor: diffViewMode === 'diff' ? '#ff9800' : 'transparent',
              borderColor: '#ff9800',
              color: diffViewMode === 'diff' ? 'white' : '#ff9800',
              '&:hover': {
                backgroundColor: diffViewMode === 'diff' ? '#f57c00' : 'rgba(255, 152, 0, 0.04)'
              }
            }}
          >
            Diff
          </Button>
          <Button
            variant={diffViewMode === 'full' ? 'contained' : 'outlined'}
            size="small"
            onClick={() => setDiffViewMode('full')}
            startIcon={<SplitscreenIcon />}
            sx={{ 
              backgroundColor: diffViewMode === 'full' ? '#2e7d32' : 'transparent',
              borderColor: '#2e7d32',
              color: diffViewMode === 'full' ? 'white' : '#2e7d32',
              '&:hover': {
                backgroundColor: diffViewMode === 'full' ? '#1b5e20' : 'rgba(46, 125, 50, 0.04)'
              }
            }}
          >
            Document Complet
          </Button>
        </Box>
      )}

      {/* Comparison Results */}
      {showComparison && comparisonLoading && (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <LinearProgress sx={{ mb: 2 }} />
          <Typography>Se încarcă compararea...</Typography>
        </Paper>
      )}

      {showComparison && comparisonData && (
        <Box>
          {/* Summary */}
          <Paper sx={{ p: 3, mb: 3, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TimelineIcon sx={{ color: '#9c27b0' }} />
              Sumar Comparare: Versiunea {comparisonData.from_version} → Versiunea {comparisonData.to_version}
            </Typography>
            
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={6} sm={3}>
                <Box textAlign="center">
                  <Typography variant="h4" sx={{ color: '#4caf50', fontWeight: 'bold' }}>
                    {comparisonData.summary.added_count}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Secțiuni Adăugate
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Box textAlign="center">
                  <Typography variant="h4" sx={{ color: '#f44336', fontWeight: 'bold' }}>
                    {comparisonData.summary.removed_count}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Secțiuni Eliminate
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Box textAlign="center">
                  <Typography variant="h4" sx={{ color: '#ff9800', fontWeight: 'bold' }}>
                    {comparisonData.summary.modified_count}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Secțiuni Modificate
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Box textAlign="center">
                  <Typography variant="h4" sx={{ color: '#9c27b0', fontWeight: 'bold' }}>
                    {comparisonData.summary.changed_pct.toFixed(1)}%
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Schimbare Totală
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>
          
          
          {/* Diff View Mode */}
          {diffViewMode === 'diff' && comparisonData.modified?.length > 0 && (
            <Paper sx={{ p: 3, mb: 3, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <DiffIcon sx={{ color: '#ff9800' }} />
                Vizualizare Diferențe ({comparisonData.modified.length} modificări)
              </Typography>
              <Box sx={{ mt: 3 }}>
                {comparisonData.modified.map((item, index) => {
                  const fromSection = sectionsFromError ? null : sectionsFrom?.find(s => s.section_key === item.section_key);
                  const toSection = sectionsToError ? null : sectionsTo?.find(s => s.section_key === item.section_key);
                  
                  if (!fromSection || !toSection) return null;
                  
                  return (
                    <Card key={index} sx={{ mb: 3, border: '2px solid #ff9800' }}>
                      <CardContent>
                        <Typography variant="h6" sx={{ mb: 2, color: '#ff9800', fontWeight: 'bold' }}>
                          {item.section_key}
                        </Typography>
                        <Box sx={{ 
                          p: 2, 
                          backgroundColor: '#fafafa',
                          borderRadius: 1,
                          fontFamily: 'monospace',
                          fontSize: '0.9rem',
                          lineHeight: 1.6,
                          whiteSpace: 'pre-wrap'
                        }}>
                          {renderTextDiff(fromSection.raw_text, toSection.raw_text)}
                        </Box>
                      </CardContent>
                    </Card>
                  );
                })}
              </Box>
            </Paper>
          )}

          {/* Added Sections */}
          {comparisonData.added?.length > 0 && (
            <Accordion sx={{ mb: 2 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ backgroundColor: '#e8f5e8' }}>
                <Typography sx={{ fontWeight: 'bold', color: '#2e7d32' }}>
                  ➕ Secțiuni Adăugate ({comparisonData.added.length})
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Box>
                  {comparisonData.added.map((section, index) => (
                    <Chip
                      key={index}
                      label={section}
                      sx={{ 
                        mr: 1, 
                        mb: 1, 
                        backgroundColor: '#c8e6c9',
                        color: '#2e7d32' 
                      }}
                    />
                  ))}
                </Box>
              </AccordionDetails>
            </Accordion>
          )}

          {/* Removed Sections */}
          {comparisonData.removed?.length > 0 && (
            <Accordion sx={{ mb: 2 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ backgroundColor: '#ffebee' }}>
                <Typography sx={{ fontWeight: 'bold', color: '#c62828' }}>
                  ➖ Secțiuni Eliminate ({comparisonData.removed.length})
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Box>
                  {comparisonData.removed.map((section, index) => (
                    <Chip
                      key={index}
                      label={section}
                      sx={{ 
                        mr: 1, 
                        mb: 1, 
                        backgroundColor: '#ffcdd2',
                        color: '#c62828' 
                      }}
                    />
                  ))}
                </Box>
              </AccordionDetails>
            </Accordion>
          )}

          {/* Modified Sections */}
          {comparisonData.modified?.length > 0 && (
            <Accordion sx={{ mb: 2 }} defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ backgroundColor: '#fff3e0' }}>
                <Typography sx={{ fontWeight: 'bold', color: '#ef6c00' }}>
                  🔄 Secțiuni Modificate ({comparisonData.modified.length})
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Box>
                  {comparisonData.modified.map((item, index) => (
                    <Card key={index} sx={{ mb: 2, border: '1px solid #ffcc02' }}>
                      <CardContent>
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                            {item.section_key}
                          </Typography>
                          <Box display="flex" gap={1}>
                            <Chip 
                              label={`${item.change_pct}% schimbare`}
                              size="small"
                              sx={{ 
                                backgroundColor: item.change_pct > 50 ? '#ffcdd2' : '#fff3e0',
                                color: item.change_pct > 50 ? '#c62828' : '#ef6c00'
                              }}
                            />
                            <Chip 
                              label={`${item.from_len} → ${item.to_len} caractere`}
                              size="small"
                              variant="outlined"
                            />
                          </Box>
                        </Box>
                        
                        <Divider sx={{ mb: 2 }} />
                        
                        {sectionDiffs?.[item.section_key] ? (
                          diffViewMode === 'split' ? 
                            renderSideBySideDiff(sectionDiffs[item.section_key].ops, item.section_key) :
                            <Box sx={{ 
                              backgroundColor: '#f9f9f9',
                              p: 2,
                              borderRadius: 1,
                              fontFamily: 'monospace',
                              fontSize: '0.9rem',
                              lineHeight: 1.6,
                              border: '1px solid #e0e0e0'
                            }}>
                              {renderDiffText(sectionDiffs[item.section_key].ops)}
                            </Box>
                        ) : (
                          <Box sx={{ textAlign: 'center', p: 2, color: '#757575' }}>
                            <LinearProgress sx={{ mb: 1 }} />
                            Se încarcă diferențele...
                          </Box>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              </AccordionDetails>
            </Accordion>
          )}

          {comparisonData.summary.added_count === 0 && 
           comparisonData.summary.removed_count === 0 && 
           comparisonData.summary.modified_count === 0 && (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="h6" color="textSecondary">
                Nu s-au găsit diferențe între aceste versiuni
              </Typography>
            </Paper>
          )}
        </Box>
      )}

      {/* Full Document Comparison */}
      {showComparison && diffViewMode === 'full' && (
        <Paper sx={{ p: 0, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', borderRadius: 2 }}>
          {/* Header */}
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column',
            backgroundColor: '#f5f5f5', 
            borderBottom: '2px solid #e0e0e0',
            borderRadius: '8px 8px 0 0'
          }}>
            {/* Control Buttons */}
            <Box sx={{ 
              p: 2, 
              display: 'flex', 
              justifyContent: 'center', 
              gap: 1, 
              borderBottom: '1px solid #e0e0e0',
              backgroundColor: '#fafafa'
            }}>
              <Button
                variant={fullDocViewMode === 'split' ? 'contained' : 'outlined'}
                size="small"
                onClick={() => setFullDocViewMode('split')}
                sx={{ 
                  backgroundColor: fullDocViewMode === 'split' ? '#2e7d32' : 'transparent',
                  borderColor: '#2e7d32',
                  color: fullDocViewMode === 'split' ? 'white' : '#2e7d32',
                  '&:hover': {
                    backgroundColor: fullDocViewMode === 'split' ? '#1b5e20' : 'rgba(46, 125, 50, 0.04)'
                  }
                }}
              >
                Side-by-side
              </Button>
              <Button
                variant={fullDocViewMode === 'diff' ? 'contained' : 'outlined'}
                size="small"
                onClick={() => setFullDocViewMode('diff')}
                startIcon={<DiffIcon />}
                sx={{ 
                  backgroundColor: fullDocViewMode === 'diff' ? '#ff9800' : 'transparent',
                  borderColor: '#ff9800',
                  color: fullDocViewMode === 'diff' ? 'white' : '#ff9800',
                  '&:hover': {
                    backgroundColor: fullDocViewMode === 'diff' ? '#f57c00' : 'rgba(255, 152, 0, 0.04)'
                  }
                }}
              >
                Diff
              </Button>
            </Box>
            
            {/* Version Headers */}
            <Box sx={{ display: 'flex' }}>
              <Box sx={{ 
                flex: 1, 
                p: 2, 
                borderRight: fullDocViewMode === 'split' ? '1px solid #e0e0e0' : 'none',
                backgroundColor: '#ffebee',
                display: fullDocViewMode === 'diff' ? 'none' : 'block'
              }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#c62828' }}>
                  Versiunea {selectedVersionFrom}
                </Typography>
              </Box>
              <Box sx={{ 
                flex: 1, 
                p: 2,
                backgroundColor: '#e8f5e8',
                display: fullDocViewMode === 'diff' ? 'none' : 'block'
              }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#2e7d32' }}>
                  Versiunea {selectedVersionTo}
                </Typography>
              </Box>
              
              {/* Diff Mode Header */}
              {fullDocViewMode === 'diff' && (
                <Box sx={{ 
                  flex: 1, 
                  p: 2, 
                  backgroundColor: '#fff3e0'
                }}>
                  <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#ff9800' }}>
                    Diferențe: V{selectedVersionFrom} → V{selectedVersionTo}
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>

          {/* Content */}
          <Box sx={{ 
            display: fullDocViewMode === 'diff' ? 'block' : 'flex', 
            minHeight: '70vh', 
            maxHeight: '80vh', 
            overflow: 'auto' 
          }}>
            {/* Diff Mode View */}
            {fullDocViewMode === 'diff' && (
              <Box>
                {/* Search Bar for Full Document Diff */}
                <Box sx={{ p: 2, borderBottom: '1px solid #e0e0e0' }}>
                  <TextField
                    fullWidth
                    variant="outlined"
                    placeholder="Caută în modificări..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon sx={{ color: '#ff9800' }} />
                        </InputAdornment>
                      ),
                      endAdornment: searchTerm && (
                        <InputAdornment position="end">
                          <IconButton onClick={() => setSearchTerm('')} size="small">
                            <ClearIcon />
                          </IconButton>
                        </InputAdornment>
                      )
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        '&.Mui-focused fieldset': {
                          borderColor: '#ff9800',
                        },
                      },
                    }}
                  />
                </Box>
                
                {/* Filter Buttons */}
                <Box sx={{ 
                  p: 2, 
                  borderBottom: '1px solid #e0e0e0',
                  display: 'flex',
                  gap: 1,
                  flexWrap: 'wrap',
                  justifyContent: 'center',
                  alignItems: 'center'
                }}>
                  {/* View Mode Toggle */}
                  <ToggleButtonGroup
                    value={compactMode ? 'compact' : 'expanded'}
                    exclusive
                    onChange={(event, newMode) => {
                      if (newMode !== null) {
                        setCompactMode(newMode === 'compact');
                      }
                    }}
                    size="small"
                    sx={{ mr: 2 }}
                  >
                    <ToggleButton value="expanded" aria-label="expanded view">
                      <ExpandedIcon sx={{ fontSize: '1rem' }} />
                    </ToggleButton>
                    <ToggleButton value="compact" aria-label="compact view">
                      <CompactIcon sx={{ fontSize: '1rem' }} />
                    </ToggleButton>
                  </ToggleButtonGroup>
                  
                  <Divider orientation="vertical" flexItem sx={{ mr: 1 }} />
                  <Button
                    variant={filterType === 'all' ? 'contained' : 'outlined'}
                    size="small"
                    onClick={() => {
                      setFilterType('all');
                      setCurrentPage(1);
                    }}
                    sx={{
                      backgroundColor: filterType === 'all' ? '#757575' : 'transparent',
                      borderColor: '#757575',
                      color: filterType === 'all' ? 'white' : '#757575',
                    }}
                  >
                    Toate
                  </Button>
                  <Button
                    variant={filterType === 'added' ? 'contained' : 'outlined'}
                    size="small"
                    onClick={() => {
                      setFilterType('added');
                      setCurrentPage(1);
                    }}
                    sx={{
                      backgroundColor: filterType === 'added' ? '#2e7d32' : 'transparent',
                      borderColor: '#2e7d32',
                      color: filterType === 'added' ? 'white' : '#2e7d32',
                    }}
                  >
                    ➕ Adăugate
                  </Button>
                  <Button
                    variant={filterType === 'removed' ? 'contained' : 'outlined'}
                    size="small"
                    onClick={() => {
                      setFilterType('removed');
                      setCurrentPage(1);
                    }}
                    sx={{
                      backgroundColor: filterType === 'removed' ? '#d32f2f' : 'transparent',
                      borderColor: '#d32f2f',
                      color: filterType === 'removed' ? 'white' : '#d32f2f',
                    }}
                  >
                    ➖ Eliminate
                  </Button>
                  <Button
                    variant={filterType === 'modified' ? 'contained' : 'outlined'}
                    size="small"
                    onClick={() => {
                      setFilterType('modified');
                      setCurrentPage(1);
                    }}
                    sx={{
                      backgroundColor: filterType === 'modified' ? '#ff9800' : 'transparent',
                      borderColor: '#ff9800',
                      color: filterType === 'modified' ? 'white' : '#ff9800',
                    }}
                  >
                    🔄 Modificate
                  </Button>
                </Box>
                
                <Box sx={{ p: 3 }}>
                {searchLoading ? (
                  <Box sx={{ p: 3, textAlign: 'center', color: '#757575' }}>
                    <LinearProgress sx={{ mb: 2 }} />
                    Se caută diferențele...
                  </Box>
                ) : searchResults ? (
                  searchResults.length > 0 ? (
                    <>
                      {/* Results Summary and Controls */}
                      <Box sx={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        mb: 3,
                        p: 2,
                        backgroundColor: '#f8f9fa',
                        borderRadius: 1,
                        border: '1px solid #e0e0e0'
                      }}>
                        <Typography variant="body2" sx={{ color: '#666' }}>
                          {searchResults.length} rezultate găsite
                          {searchTerm && ` pentru "${searchTerm}"`}
                        </Typography>
                        
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <FormControl size="small" sx={{ minWidth: 120 }}>
                            <InputLabel>Per pagină</InputLabel>
                            <Select
                              value={resultsPerPage}
                              label="Per pagină"
                              onChange={(e) => {
                                setResultsPerPage(e.target.value);
                                setCurrentPage(1);
                              }}
                            >
                              <MenuItem value={5}>5</MenuItem>
                              <MenuItem value={10}>10</MenuItem>
                              <MenuItem value={20}>20</MenuItem>
                              <MenuItem value={50}>50</MenuItem>
                            </Select>
                          </FormControl>
                          
                          <Button
                            variant="outlined"
                            size="small"
                            startIcon={<ExportIcon />}
                            sx={{ 
                              borderColor: '#2e7d32',
                              color: '#2e7d32',
                              '&:hover': { backgroundColor: 'rgba(46, 125, 50, 0.04)' }
                            }}
                            onClick={() => handleExportComparison()}
                          >
                            Export
                          </Button>
                        </Box>
                      </Box>
                      
                      {/* Paginated Results */}
                      {(() => {
                        const startIndex = (currentPage - 1) * resultsPerPage;
                        const endIndex = startIndex + resultsPerPage;
                        const paginatedResults = searchResults.slice(startIndex, endIndex);
                        const totalPages = Math.ceil(searchResults.length / resultsPerPage);
                        
                        return (
                          <>
                            {paginatedResults.map((section, index) => (
                              <Card 
                                key={startIndex + index} 
                                sx={{ 
                                  mb: compactMode ? 1 : 3, 
                                  border: '2px solid #ff9800',
                                  minHeight: compactMode ? 'auto' : '200px'
                                }}
                              >
                                <CardContent sx={{ p: compactMode ? 1 : 2 }}>
                                  <Typography 
                                    variant={compactMode ? "subtitle2" : "h6"} 
                                    sx={{ 
                                      mb: compactMode ? 1 : 2, 
                                      color: '#ff9800', 
                                      fontWeight: 'bold', 
                                      display: 'flex', 
                                      alignItems: 'center', 
                                      gap: 1 
                                    }}
                                  >
                                    {section.section_key}
                                    {section.status === 'added' && <Chip label="ADĂUGAT" size="small" sx={{ backgroundColor: '#c8e6c9', color: '#2e7d32' }} />}
                                    {section.status === 'removed' && <Chip label="ELIMINAT" size="small" sx={{ backgroundColor: '#ffcdd2', color: '#d32f2f' }} />}
                                    {section.status === 'modified' && <Chip label="MODIFICAT" size="small" sx={{ backgroundColor: '#ffe0b2', color: '#ef6c00' }} />}
                                  </Typography>
                                  <Box sx={{ 
                                    p: compactMode ? 1 : 2, 
                                    backgroundColor: '#fafafa',
                                    borderRadius: 1,
                                    fontFamily: 'monospace',
                                    fontSize: compactMode ? '0.75rem' : '0.9rem',
                                    lineHeight: 1.6,
                                    whiteSpace: 'pre-wrap',
                                    maxHeight: compactMode ? '100px' : 'none',
                                    overflow: compactMode ? 'hidden' : 'visible',
                                    position: 'relative'
                                  }}>
                                    {section.status === 'added' ? (
                                      <span style={{ backgroundColor: '#c8e6c9', padding: '2px' }}>
                                        {compactMode && section.raw_text.length > 200 
                                          ? section.raw_text.substring(0, 200) + '...' 
                                          : section.raw_text}
                                      </span>
                                    ) : section.status === 'removed' ? (
                                      <span style={{ backgroundColor: '#ffcdd2', padding: '2px', textDecoration: 'line-through' }}>
                                        {compactMode && section.raw_text.length > 200 
                                          ? section.raw_text.substring(0, 200) + '...' 
                                          : section.raw_text}
                                      </span>
                                    ) : section.status === 'modified' && section.from_content && section.to_content ? (
                                      renderTextDiff(section.from_content, section.to_content)
                                    ) : (
                                      compactMode && section.raw_text && section.raw_text.length > 200 
                                        ? section.raw_text.substring(0, 200) + '...' 
                                        : section.raw_text
                                    )}
                                  </Box>
                                </CardContent>
                              </Card>
                            ))}
                            
                            {/* Pagination */}
                            {totalPages > 1 && (
                              <Box sx={{ 
                                display: 'flex', 
                                justifyContent: 'center', 
                                mt: 3,
                                p: 2,
                                backgroundColor: '#f8f9fa',
                                borderRadius: 1,
                                border: '1px solid #e0e0e0'
                              }}>
                                <Pagination
                                  count={totalPages}
                                  page={currentPage}
                                  onChange={(event, value) => setCurrentPage(value)}
                                  color="primary"
                                  size="medium"
                                  showFirstButton
                                  showLastButton
                                  sx={{
                                    '& .MuiPaginationItem-root': {
                                      color: '#ff9800',
                                    },
                                    '& .Mui-selected': {
                                      backgroundColor: '#ff9800 !important',
                                      color: 'white !important',
                                    },
                                  }}
                                />
                              </Box>
                            )}
                          </>
                        );
                      })()}
                    </>
                  ) : (
                    <Box sx={{ p: 3, textAlign: 'center', color: '#757575' }}>
                      {searchTerm || filterType !== 'all' ? 
                        'Nu s-au găsit rezultate pentru criteriile de căutare' :
                        'Nu s-au găsit diferențe'
                      }
                    </Box>
                  )
                ) : (
                  <Box sx={{ p: 3, textAlign: 'center', color: '#757575' }}>
                    Selectează parametrii pentru căutare
                  </Box>
                )}
                </Box>
              </Box>
            )}
            
            {/* Side-by-side Mode View */}
            {fullDocViewMode === 'split' && (
              <>
                {/* Left Panel */}
                <Box sx={{ 
                  flex: 1, 
                  borderRight: '1px solid #e0e0e0',
                  backgroundColor: 'white'
                }}>
              {sectionsFromError ? (
                <Box sx={{ p: 3, textAlign: 'center', color: '#f44336' }}>
                  <Alert severity="error" sx={{ mb: 2 }}>
                    Eroare la încărcarea versiunii {selectedVersionFrom}: {sectionsFromError.message}
                  </Alert>
                </Box>
              ) : sectionsFromLoading ? (
                <Box sx={{ p: 3, textAlign: 'center', color: '#757575' }}>
                  <LinearProgress sx={{ mb: 2 }} />
                  Se încarcă versiunea {selectedVersionFrom}...
                </Box>
              ) : sectionsFrom ? createSectionMap().map((section, index) => (
                <Box key={`left-${index}`} sx={{ 
                  borderBottom: '1px solid #f0f0f0',
                  backgroundColor: section.status === 'removed' ? '#ffebee' : 
                                  section.status === 'added' ? '#fafafa' :
                                  section.status === 'modified' ? '#fff3e0' : 'white'
                }}>
                  <Box sx={{ 
                    p: 1, 
                    backgroundColor: '#f8f9fa', 
                    borderBottom: '1px solid #e9ecef',
                    fontSize: '0.75rem',
                    fontWeight: 'bold',
                    color: section.status === 'removed' ? '#c62828' :
                           section.status === 'modified' ? '#ef6c00' : '#666'
                  }}>
                    {section.section_key}
                    {section.status === 'removed' && <Chip label="ELIMINAT" size="small" sx={{ ml: 1, backgroundColor: '#ffcdd2', color: '#c62828', height: 18, fontSize: '0.6rem' }} />}
                    {section.status === 'modified' && <Chip label="MODIFICAT" size="small" sx={{ ml: 1, backgroundColor: '#ffe0b2', color: '#ef6c00', height: 18, fontSize: '0.6rem' }} />}
                  </Box>
                  <Box sx={{ 
                    p: 2, 
                    fontFamily: 'monospace', 
                    fontSize: '0.85rem',
                    lineHeight: 1.6,
                    whiteSpace: 'pre-wrap',
                    minHeight: '40px'
                  }}>
                    {section.from_content || ''}
                  </Box>
                </Box>
              )) : (
                <Box sx={{ p: 3, textAlign: 'center', color: '#757575' }}>
                  Nu s-au găsit secțiuni pentru versiunea {selectedVersionFrom}
                </Box>
              )}
            </Box>

            {/* Right Panel */}
            <Box sx={{ 
              flex: 1,
              backgroundColor: 'white'
            }}>
              {sectionsToError ? (
                <Box sx={{ p: 3, textAlign: 'center', color: '#f44336' }}>
                  <Alert severity="error" sx={{ mb: 2 }}>
                    Eroare la încărcarea versiunii {selectedVersionTo}: {sectionsToError.message}
                  </Alert>
                </Box>
              ) : sectionsToLoading ? (
                <Box sx={{ p: 3, textAlign: 'center', color: '#757575' }}>
                  <LinearProgress sx={{ mb: 2 }} />
                  Se încarcă versiunea {selectedVersionTo}...
                </Box>
              ) : sectionsTo ? createSectionMap().map((section, index) => (
                <Box key={`right-${index}`} sx={{ 
                  borderBottom: '1px solid #f0f0f0',
                  backgroundColor: section.status === 'added' ? '#e8f5e8' : 
                                  section.status === 'removed' ? '#fafafa' :
                                  section.status === 'modified' ? '#fff3e0' : 'white'
                }}>
                  <Box sx={{ 
                    p: 1, 
                    backgroundColor: '#f8f9fa', 
                    borderBottom: '1px solid #e9ecef',
                    fontSize: '0.75rem',
                    fontWeight: 'bold',
                    color: section.status === 'added' ? '#2e7d32' :
                           section.status === 'modified' ? '#ef6c00' : '#666'
                  }}>
                    {section.section_key}
                    {section.status === 'added' && <Chip label="ADĂUGAT" size="small" sx={{ ml: 1, backgroundColor: '#c8e6c9', color: '#2e7d32', height: 18, fontSize: '0.6rem' }} />}
                    {section.status === 'modified' && <Chip label="MODIFICAT" size="small" sx={{ ml: 1, backgroundColor: '#ffe0b2', color: '#ef6c00', height: 18, fontSize: '0.6rem' }} />}
                  </Box>
                  <Box sx={{ 
                    p: 2, 
                    fontFamily: 'monospace', 
                    fontSize: '0.85rem',
                    lineHeight: 1.6,
                    whiteSpace: 'pre-wrap',
                    minHeight: '40px'
                  }}>
                    {section.to_content || ''}
                  </Box>
                </Box>
              )) : (
                <Box sx={{ p: 3, textAlign: 'center', color: '#757575' }}>
                  Nu s-au găsit secțiuni pentru versiunea {selectedVersionTo}
                </Box>
              )}
            </Box>
            </>
            )}
          </Box>
        </Paper>
      )}
    </Box>
  );
}

export default LawsComparison;