// App.jsx
import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import RecipeDetail from './pages/RecipeDetail';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

function App({ user }) {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<SignUp />} />
      <Route
        path="/"
        element={
          <ProtectedRoute user={user}>
            <Layout user={user}>
              <Home />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/recipe/:id"
        element={
          <Layout user={user}>
            <RecipeDetail user={user} />
          </Layout>
        }
      />
    </Routes>
  );
}

export default App;
