/**
 * Maps Firebase auth error codes to user-friendly messages.
 * @param {Object} error - The error object from Firebase
 * @returns {string} A user-friendly error message
 */
export const getAuthErrorMessage = (error) => {
  if (!error || !error.code) {
    return "An unknown error occurred. Please try again.";
  }

  switch (error.code) {
    case 'auth/invalid-credential':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return "Incorrect email or password.";
    case 'auth/email-already-in-use':
      return "This email is already registered. Please log in instead.";
    case 'auth/weak-password':
      return "Password should be at least 6 characters.";
    case 'auth/invalid-email':
      return "Please enter a valid email address.";
    case 'auth/network-request-failed':
      return "Network error. Please check your internet connection.";
    case 'auth/too-many-requests':
      return "Too many failed attempts. Please try again later.";
    case 'auth/operation-not-allowed':
      return "This sign-in method is not enabled.";
    default:
      console.error("Unhandled auth error:", error.code, error.message);
      return "An error occurred. Please try again.";
  }
};
