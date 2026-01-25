import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import AuthProvider from './components/AuthProvider';
import ThemeProvider from './components/ThemeProvider';
import './styles/variables.css';

ReactDOM.hydrateRoot(
  document.getElementById('root'),
  <BrowserRouter>
    <ThemeProvider>
      <AuthProvider>
        {(user) => <App user={user} />}
      </AuthProvider>
    </ThemeProvider>
  </BrowserRouter>
);
