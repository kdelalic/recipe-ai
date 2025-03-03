import { BrowserRouter } from 'react-router-dom';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import AuthProvider from './components/AuthProvider.jsx';

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <AuthProvider>
      {(user) => <App user={user} />}
    </AuthProvider>
  </BrowserRouter>
);
