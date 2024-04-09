import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import '@fontsource/roboto/300.css';
import * as serviceWorker from './serviceWorker';
import { ThemeProvider } from '@emotion/react';
import { createTheme } from '@mui/material';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    background: {
      default: '#232323'
    }
  },
  components: {
    MuiInputLabel: {
      styleOverrides: {
        root: {
          background: '#000',
          color: '#fff',
          padding: '0 6px',
          borderRadius: '4px'
        }
      }
    }
  }
});

ReactDOM.render(
  <React.StrictMode>
    <ThemeProvider theme={darkTheme}>
      <App />
    </ThemeProvider>
  </React.StrictMode>,
  document.getElementById('root')
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
