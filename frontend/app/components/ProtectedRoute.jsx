// ProtectedRoute.jsx
import { Navigate } from 'react-router-dom';

function ProtectedRoute({ user, children, allowGuest = true }) {
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // If guests are not allowed and the user is anonymous, redirect to login (or sign up)
  if (!allowGuest && user.isAnonymous) {
    return <Navigate to="/signup" replace />;
  }

  return children;
}

export default ProtectedRoute;
