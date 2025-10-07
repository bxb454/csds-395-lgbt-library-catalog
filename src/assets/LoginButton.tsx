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
