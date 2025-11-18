import { useState } from "react"
import "./App.css"
import BookDataTable from "./assets/BookDataTable"
import CatalogHeader from "./assets/CatalogHeader"
import type { UserData } from "./assets/Types"
import type { SearchOption } from "./assets/catalogSearch"

import MyLoansTable from "./assets/MyLoansTable"
import AllLoansTable from "./assets/AllLoansTable"
import LoanActionPopup from "./assets/LoanActionPopup"

import type { BookData, LoanRecord } from "./assets/Types"
import { fakeBookData1, loans as fakeLoans } from "./assets/fake_data"
import { sampleUsers } from "./assets/sampleUsers"

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [currentUser, setCurrentUser] = useState<UserData | null>(null)

  const [books] = useState<BookData[]>(fakeBookData1)
  const [loans] = useState<LoanRecord[]>(fakeLoans)

  const [currentPage, setCurrentPage] = useState<
    "catalog" | "myloans" | "allloans" | "updatecatalog" | "staffroles"
  >("catalog")

  const [searchBy, setSearchBy] = useState<SearchOption>("general")
  const [searchText, setSearchText] = useState("")

  const [popupData, setPopupData] = useState<{
    mode: "renew" | "return"
    title: string
    renewalCount?: number
  } | null>(null)

  const handleLogin = () => {
    setCurrentUser(sampleUsers[0] ?? null)
    setIsLoggedIn(true)
  };

  const handleLogout = () => {
    setCurrentUser(null)
    setIsLoggedIn(false)
  };

  return (
    <>
      <header className="app-header">
        <h1 className="app-title">LGBT Center Library Catalog</h1>
      </header>

     {/* Temp debug login */}
      <div style={{ margin: "1rem" }}>
        <label style={{ marginRight: "10px", fontWeight: 600 }}>
          Debug login:
        </label>

        <select
          value={currentUser?.id ?? ""}
          onChange={(e) => {
            const value = e.target.value;

            if (value === "") {
              setCurrentUser(null)
              setIsLoggedIn(false)
              return;
            }

            const chosen =
              sampleUsers.find((u) => u.id === Number(value)) || null

            setCurrentUser(chosen)
            setIsLoggedIn(true)
          }}
          style={{
            padding: "6px",
            fontSize: "14px",
            border: "1px solid #777",
          }}
        >
          <option value="">Log out</option>

          {sampleUsers.map((u) => (
            <option key={u.id} value={u.id}>
              {u.caseID} ({u.role})
            </option>
          ))}
        </select>
      </div>

      <CatalogHeader
        searchBy={searchBy}
        searchText={searchText}
        onSearchByChange={setSearchBy}
        onSearchTextChange={setSearchText}
        isLoggedIn={isLoggedIn}
        currentUser={currentUser}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        onLogin={handleLogin}
        onLogout={handleLogout}
      />

      <div className="catalog-main">
        {currentPage === "catalog" && (
          <BookDataTable
            searchBy={searchBy}
            searchText={searchText}
            isLoggedIn={isLoggedIn}
          />
        )}

        {currentPage === "myloans" && (
          <MyLoansTable
            loans={loans}
            books={books}
            onRenew={(loan) => {
              const book = books.find((b) => b.id === loan.bookId)
              setPopupData({
                mode: "renew",
                title: book?.title ?? "",
                renewalCount: loan.renewalCount ?? 0,
              });
            }}
            onReturn={(loan) => {
              const book = books.find((b) => b.id === loan.bookId)
              setPopupData({
                mode: "return",
                title: book?.title ?? "",
              });
            }}
          />
        )}

        {currentPage === "allloans" && (
          <AllLoansTable
            loans={loans}
            users={sampleUsers}
            books={books}
            onRenew={(loan) => {
              const book = books.find((b) => b.id === loan.bookId)
              setPopupData({
                mode: "renew",
                title: book?.title ?? "",
                renewalCount: loan.renewalCount ?? 0,
              });
            }}
            onReturn={(loan) => {
              const book = books.find((b) => b.id === loan.bookId)
              setPopupData({
                mode: "return",
                title: book?.title ?? "",
              });
            }}
            onRestrictToggle={(id, v) => {
              console.log("Restrict user", id, v)
            }}
          />
        )}

        {currentPage === "updatecatalog" && (
          <div style={{ padding: "2rem" }}>[Update Catalog Placeholder]</div>
        )}

        {currentPage === "staffroles" && (
          <div style={{ padding: "2rem" }}>[Staff Roles Placeholder]</div>
        )}
      </div>

      {popupData && (
        <LoanActionPopup
          mode={popupData.mode}
          title={popupData.title}
          renewalCount={popupData.renewalCount}
          onSubmit={() => {
            alert(`${popupData.mode} submitted for ${popupData.title}`)
            setPopupData(null);
          }}
          onClose={() => setPopupData(null)}
        />
      )}
    </>
  );
}

export default App
