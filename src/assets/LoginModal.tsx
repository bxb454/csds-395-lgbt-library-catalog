import React from 'react';
import { UserData } from './Types';
import { sampleUsers } from './sampleUsers';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSignIn: (user: UserData) => void;
}

//Placeholder for redirect to CWRU login portal
const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onSignIn }) => {
  if (!isOpen) return null;

  const handleUserSelect = (user: UserData) => {
    onSignIn(user);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Sign In</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        <div className="modal-content">
          <p>Select a sample user:</p>
          {sampleUsers.map((user) => (
            <button
              key={user.id}
              className="signin-button"
              onClick={() => handleUserSelect(user)}
            >
              {user.caseID} ({user.role})
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LoginModal;
