import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import BookDataTable from "./assets/BookDataTable.tsx";
import LoginButton from "./assets/LoginButton.tsx";
import LoginModal from "./assets/LoginModal.tsx";
import AdminUserTable from "./assets/AdminUserTable.tsx";

function App() {
  const [count, setCount] = useState(0)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)

  const handleSignInClick = () => {
    setShowLoginModal(true)
  }

  const handleSignIn = () => {
    setIsLoggedIn(true)
    setShowLoginModal(false)
  }

  const handleSignOut = () => {
    setIsLoggedIn(false)
  }

  const handleCloseModal = () => {
    setShowLoginModal(false)
  }

  return (
    <>
      <LoginButton 
        isLoggedIn={isLoggedIn}
        onSignIn={handleSignInClick}
        onSignOut={handleSignOut}
      />
      <LoginModal 
        isOpen={showLoginModal}
        onClose={handleCloseModal}
        onSignIn={handleSignIn}
      />
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
        <h2> Catalog</h2>
        <BookDataTable></BookDataTable>

        <h2> Editable Catalog (employee only)</h2>
        Checkouts? add, and delete function here
        <BookDataTable editable={true}></BookDataTable>

        <h2> Users (admin view only)</h2>
        <AdminUserTable></AdminUserTable>

    </>
  )
}

export default App
