import React from 'react'

const CAS_LOGIN_URL =
  "https://login.case.edu/cas/login?service=http://lgbt-cat.case.edu"

type LoginButtonProps = {
  isLoggedIn: boolean
  onLogin: () => void
  onLogout: () => void
};

//const LoginButton: React.FC = () => {
const LoginButton: React.FC<LoginButtonProps> = ({
  isLoggedIn,
  onLogin,
  onLogout,
}) => {
  const handleLogin = () => {
    window.location.replace(CAS_LOGIN_URL)
  };

  return (
    <button
      onClick={isLoggedIn ? onLogout : handleLogin}
      className="login-button"
    >
      {isLoggedIn ? "Logout" : "Login"}
    </button>
  )
}

export default LoginButton


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
