import React from 'react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSignIn: () => void;
}

//Placeholder for redirect to CWRU login portal
const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onSignIn }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Sign In</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        <div className="modal-content">
          <button className="signin-button" onClick={onSignIn}>
            Sign In
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginModal;
