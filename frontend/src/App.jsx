// App.jsx
import { Routes, Route } from 'react-router-dom';
import { Tooltip } from 'react-tooltip';
import Home from './pages/Home';
import RecipeDetail from './pages/RecipeDetail';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import Preferences from './pages/Preferences';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

function App({ user }) {
  return (
    <>
    <Tooltip id="tooltip" />
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
      <Route
        path="/preferences"
        element={
          <ProtectedRoute user={user} allowGuest={false}>
            <Layout user={user}>
              <Preferences user={user} />
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
    </>
  );
}

export default App;
