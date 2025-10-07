import React from 'react';

interface LoginButtonProps {
  isLoggedIn: boolean;
  onSignIn: () => void;
  onSignOut: () => void;
}

const LoginButton: React.FC<LoginButtonProps> = ({ isLoggedIn, onSignIn, onSignOut }) => {
  return (
    <button 
      onClick={isLoggedIn ? onSignOut : onSignIn}
      className="login-button"
    >
      {isLoggedIn ? 'Sign Out' : 'Sign In'}
    </button>
  );
};

export default LoginButton;

/*Future CAS SSO implementation
import React from 'react';
  const LoginButton: React.FC<{ isLoggedIn: boolean }> = ({ isLoggedIn }) => {
  const SERVICE_URL = encodeURIComponent('http://localhost:3000/auth/cas/callback');
  const CAS_LOGIN = `https://login.case.edu/cas/login?service=${SERVICE_URL}`;
  const CAS_LOGOUT = 'https://login.case.edu/cas/logout';

  const handleSignIn = () => {
     window.location.href = CAS_LOGIN;
    };

  const handleSignOut = () => {
    window.location.href = CAS_LOGOUT;
      };
 return (
     <button
       onClick={isLoggedIn ? handleSignOut : handleSignIn}
       className="login-button"
     >
       {isLoggedIn ? 'Sign Out' : 'Sign In with CWRU'}
     </button>
   );
 };

 export default LoginButton;
*/
