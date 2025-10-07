import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import BookDataTable from "./assets/BookDataTable.tsx";
import LoginButton from "./assets/LoginButton.tsx";
import LoginModal from "./assets/LoginModal.tsx";
import AdminUserTable from "./assets/AdminUserTable.tsx";
import { UserData } from "./assets/Types";
import { sampleUsers, hasManagerAuth, hasEmployeeAuth, hasPatronAuth } from "./assets/sampleUsers";

function App() {
  const [count, setCount] = useState(0)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [currentUser, setCurrentUser] = useState<UserData | null>(null)



  const handleSignInClick = () => {
    setShowLoginModal(true)
  }

  const handleSignIn = (user: UserData) => {
    setCurrentUser(user)
    setIsLoggedIn(true)
    setShowLoginModal(false)
  }

  const handleSignOut = () => {
    setCurrentUser(null)
    setIsLoggedIn(false)
  }

  const handleCloseModal = () => {
    setShowLoginModal(false)
  }

  return (

    <>
      <header className="app-header">
        <h1 className="app-title">LGBT Center Library Catalog</h1>
        <LoginButton
          isLoggedIn={isLoggedIn}
          onSignIn={handleSignInClick}
          onSignOut={handleSignOut}
        />
      </header>

      <LoginModal
        isOpen={showLoginModal}
        onClose={handleCloseModal}
        onSignIn={handleSignIn}
      />


      {/* Replace the above <LoginButton /> and <LoginModal /> w/
      
      <LoginButton isLoggedIn={isLoggedIn} />
  
      const SERVICE_URL = encodeURIComponent('http://localhost:3000/auth/cas/callback')
      const CAS_LOGIN = `https://login.case.edu/cas/login?service=${SERVICE_URL}`
      const CAS_LOGOUT = 'https://login.case.edu/cas/logout'

    */}

      {currentUser && (
        <div style={{ margin: '1rem 0', padding: '1rem', backgroundColor: '#f0f0f0', borderRadius: '4px' }}>
          <strong>Logged in as:</strong> {currentUser.caseID} ({currentUser.role})
        </div>
      )}


      <h2>Catalog</h2>
      <p>Browse available books (public access)</p>
      <BookDataTable></BookDataTable>

      {hasEmployeeAuth(currentUser) && (
        <>
          <h2> Editable Catalog (employee only)</h2>
          Checkouts? add, and delete function here
          <BookDataTable editable={true}></BookDataTable>
        </>
      )}


      {hasManagerAuth(currentUser) && (
        <>
          <h2>Users (admin view only)</h2>
          <AdminUserTable></AdminUserTable>
        </>
      )}


    </>
  )
}

export default App
