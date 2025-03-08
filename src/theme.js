import { createTheme } from '@mui/material';

// Create theme configurations for both light and dark modes
export const createAppTheme = (mode) => createTheme({
  palette: {
    mode: mode, // 'light' or 'dark'
    primary: {
      main: '#1976d2', // GoLogin's blue
      light: '#42a5f5',
      dark: '#1565c0'
    },
    secondary: {
      main: '#dc004e', // For important actions
    },
    background: {
      default: mode === 'light' ? '#f8fafd' : '#121212', // Light or dark background
      paper: mode === 'light' ? '#ffffff' : '#1e1e1e'
    },
    text: {
      primary: mode === 'light' ? 'rgba(0, 0, 0, 0.87)' : 'rgba(255, 255, 255, 0.87)',
      secondary: mode === 'light' ? 'rgba(0, 0, 0, 0.6)' : 'rgba(255, 255, 255, 0.6)'
    }
  },
  typography: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    fontSize: 14,
    button: {
      textTransform: 'none',
      fontWeight: 500
    },
    h4: {
      fontWeight: 500,
      fontSize: '1.75rem'
    },
    h5: {
      fontWeight: 500,
      fontSize: '1.25rem'
    }
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 4,
          fontSize: '0.8125rem',
          padding: '4px 10px',
          minWidth: '60px'
        },
        outlined: {
          borderWidth: 1,
          '&:hover': {
            borderWidth: 1
          }
        }
      }
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          padding: '12px 16px',
          fontSize: '0.875rem',
          borderBottom: '1px solid #f0f0f0'
        },
        head: {
          fontWeight: 600,
          backgroundColor: '#ffffff',
          color: '#666666'
        }
      }
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:hover': {
            backgroundColor: '#f8fafd'
          }
        }
      }
    },
    MuiChip: {
      styleOverrides: {
        root: {
          height: 22,
          borderRadius: 4,
          fontSize: '0.75rem',
          fontWeight: 500
        }
      }
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 4,
            fontSize: '0.875rem'
          }
        }
      }
    }
  }
}); 