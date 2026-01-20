import { BrowserRouter } from 'react-router-dom';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import AuthProvider from './components/AuthProvider.jsx';
import ThemeProvider from './components/ThemeProvider.jsx';

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <ThemeProvider>
      <AuthProvider>
        {(user) => <App user={user} />}
      </AuthProvider>
    </ThemeProvider>
  </BrowserRouter>
);
