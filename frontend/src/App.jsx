import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import RecipeDetail from './pages/RecipeDetail';
import Login from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';

function App({ user }) {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute user={user}>
            <Home user={user} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/recipe/:id"
        element={
          <ProtectedRoute user={user}>
            <RecipeDetail user={user} />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;
