import { useState } from "react"
import "./App.css"
import BookDataTable from "./assets/BookDataTable.tsx"
import CatalogHeader from "./assets/CatalogHeader.tsx"
import type { UserData } from "./assets/Types.ts"
import type { SearchOption } from "./assets/catalogSearch.ts"

import MyLoansTable from "./assets/MyLoansTable.tsx"
import AllLoansTable from "./assets/AllLoansTable.tsx"
import LoanActionPopup from "./assets/LoanActionPopup.tsx"
import UpdateCatalogTable from "./assets/UpdateCatalogTable.tsx"
import StaffRolesTable from "./assets/StaffRolesTable.tsx"

import type { BookData, LoanRecord } from "./assets/Types.ts"
import { fakeBookData1, loans as fakeLoans } from "./assets/fake_data.tsx"
import { sampleUsers } from "./assets/sampleUsers.tsx"

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [currentUser, setCurrentUser] = useState<UserData | null>(null)

  const [books, setBooks] = useState<BookData[]>(fakeBookData1)
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

  const userRole = currentUser?.role ?? "patron"
  const canManageCatalog =
    userRole === "staff" || userRole === "admin"

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
            canManage={canManageCatalog}
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
          <UpdateCatalogTable books={books} onBooksChange={setBooks} />
        )}

        {currentPage === "staffroles" && <StaffRolesTable />}
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
