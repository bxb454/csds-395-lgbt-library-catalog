import { useCallback, useEffect, useState } from "react"
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
//import AdminUserTable from "./assets/AdminUserTable.tsx"

import type { BookData, LoanRecord } from "./assets/Types.ts"
import { sampleUsers } from "./assets/sampleUsers.tsx"
import { fetchBooks, fetchBookById, fetchBookAuthors, fetchBookTags, type BookFilters } from "./api/books"
import { fetchLoans, deleteLoan, renewLoan } from "./api/loans"
import { createUser, deleteUser, fetchUsers, updateUser } from "./api/users"
import { searchCatalog } from "./api/search"

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [currentUser, setCurrentUser] = useState<UserData | null>(null)

  const [books, setBooks] = useState<BookData[]>([])
  const [booksLoading, setBooksLoading] = useState(false)
  const [booksError, setBooksError] = useState<string | null>(null)
  const [loans, setLoans] = useState<LoanRecord[]>([])
  const [loansLoading, setLoansLoading] = useState(false)
  const [loansError, setLoansError] = useState<string | null>(null)
  const [users, setUsers] = useState<UserData[]>([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [usersError, setUsersError] = useState<string | null>(null)

  const [currentPage, setCurrentPage] = useState<
    "catalog" | "myloans" | "allloans" | "updatecatalog" | "staffroles"
  >("catalog")

  const [searchBy, setSearchBy] = useState<SearchOption>("general")
  const [searchText, setSearchText] = useState("")

  const [loanAction, setLoanAction] = useState<{
    mode: "renew" | "return"
    loan: LoanRecord
  } | null>(null)

  const userRole = currentUser?.role ?? "patron"
  const canManageCatalog =
    userRole === "staff" || userRole === "admin"

  type LoanRecordWithCase = LoanRecord & { caseID?: string | null }

  const myLoans = currentUser
    ? loans.filter(
        (loan: LoanRecordWithCase) => loan.caseID === currentUser.caseID,
      )
    : []

  const loadBooks = useCallback(async (filters?: BookFilters) => {
    setBooksLoading(true)
    setBooksError(null)
    try {
      const response = await fetchBooks(filters)
      const hydrated = await Promise.all(
        response.books.map(async (book) => {
          try {
            const [authors, tags] = await Promise.all([
              fetchBookAuthors(book.id).catch(() => []),
              fetchBookTags(book.id).catch(() => []),
            ])
            const authorNames = Array.isArray(authors)
              ? authors
                  .map((a) => [a.fname, a.lname].filter(Boolean).join(" ").trim())
                  .filter((name) => name.length > 0)
              : []
            return {
              ...book,
              author: authorNames.join(", "),
              tags: Array.isArray(tags) ? tags : [],
            }
          } catch {
            return book
          }
        }),
      )
      setBooks(hydrated)
    } catch (err) {
      console.error(err)
      setBooksError("Failed to load catalog data.")
    } finally {
      setBooksLoading(false)
    }
  }, [])

  const loadLoans = useCallback(async () => {
    setLoansLoading(true)
    setLoansError(null)
    try {
      const response = await fetchLoans()
      setLoans(response)
    } catch (err) {
      console.error(err)
      setLoansError("Failed to load loan data.")
    } finally {
      setLoansLoading(false)
    }
  }, [])

  const loadUsers = useCallback(async () => {
    setUsersLoading(true)
    setUsersError(null)
    try {
      const response = await fetchUsers()
      setUsers(response)
    } catch (err) {
      console.error(err)
      setUsersError("Failed to load user data.")
    } finally {
      setUsersLoading(false)
    }
  }, [])

  const handleGeneralSearch = useCallback(async (query: string) => {
    setBooksLoading(true)
    setBooksError(null)
    try {
      const results = await searchCatalog(query)
      const bookIds = results
        .filter((result) => result.type === "book" && result.id !== null)
        .map((result) => result.id as number)

      if (bookIds.length === 0) {
        setBooks([])
      } else {
        const fetched = await Promise.all(bookIds.map((id) => fetchBookById(id)))
        setBooks(fetched)
      }
    } catch (err) {
      console.error(err)
      setBooksError("Failed to run catalog search.")
    } finally {
      setBooksLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadLoans()
    void loadUsers()
  }, [loadLoans, loadUsers])

  const runSearch = useCallback(() => {
    const query = searchText.trim()

    if (!query) {
      void loadBooks()
      return
    }

    switch (searchBy) {
      case "title":
        void loadBooks({ title: query })
        return
      case "isbn":
        void loadBooks({ isbn: query })
        return
      case "keyword":
        void loadBooks({ publisher: query })
        return
      case "general":
        void handleGeneralSearch(query)
        return
      default:
        void loadBooks()
        return
    }
  }, [searchBy, searchText, loadBooks, handleGeneralSearch])

  useEffect(() => {
    runSearch()
  }, [runSearch])

  const availableUsers = users.length > 0 ? users : sampleUsers

  useEffect(() => {
    if (
      currentUser &&
      !availableUsers.some((user) => user.caseID === currentUser.caseID)
    ) {
      setCurrentUser(null)
      setIsLoggedIn(false)
    }
  }, [availableUsers, currentUser])

  const handleLogin = () => {
    window.location.replace(
      "https://login.case.edu/cas/login?service=http://lgbt-cat.case.edu",
    )
  };

  const handleLogout = () => {
    setCurrentUser(null)
    setIsLoggedIn(false)
  };

  const actionBook = loanAction
    ? books.find((b) => b.id === loanAction.loan.bookId)
    : undefined

  const handleLoanActionSubmit = async () => {
    if (!loanAction) {
      return
    }
    try {
      if (loanAction.mode === "renew") {
        await renewLoan(loanAction.loan)
      } else {
        await deleteLoan(loanAction.loan.loanId)
      }
      await loadLoans()
      setLoanAction(null)
    } catch (err) {
      console.error(err)
      alert("Loan action failed. Please try again.")
    }
  }

  const handleLoanCreated = useCallback(async () => {
    await loadLoans()
    runSearch()
  }, [loadLoans, runSearch])

  const handleCreateUserRecord = useCallback(
    async ({ caseID, role }: { caseID: string; role: string }) => {
      try {
        await createUser({ caseID, role, isRestricted: false })
        await loadUsers()
      } catch (err) {
        console.error(err)
        throw err
      }
    },
    [loadUsers],
  )

  const handleUpdateUserRecord = useCallback(
    async (caseID: string, updates: Partial<UserData>) => {
      try {
        await updateUser(caseID, updates)
        await loadUsers()
      } catch (err) {
        console.error(err)
        throw err
      }
    },
    [loadUsers],
  )

  const handleDeleteUserRecord = useCallback(
    async (caseID: string) => {
      try {
        await deleteUser(caseID)
        await loadUsers()
      } catch (err) {
        console.error(err)
        throw err
      }
    },
    [loadUsers],
  )

  const handleRestrictToggle = useCallback(
    async (caseID: string, value: boolean) => {
      try {
        const current = users.find((u) => u.caseID === caseID)
        const role = current?.role ?? "patron"
        await updateUser(caseID, { role, isRestricted: value })
        await loadUsers()
      } catch (err) {
        console.error(err)
        alert("Failed to update user restrictions.")
      }
    },
    [loadUsers, users],
  )

  const handleSetUserRole = useCallback(
    async (caseID: string, role: string) => {
      const exists = users.some((u) => u.caseID === caseID)
      if (exists) {
        await updateUser(caseID, { role })
      } else {
        await createUser({ caseID, role, isRestricted: false })
      }
      await loadUsers()
    },
    [users, loadUsers],
  )

  return (
    <>
      <header className="app-header" style={{ padding: "24px 16px" }}>
        <h1 className="app-title">LGBT Center Library Catalog</h1>
      </header>

     {/* Temp debug login */}
      <div style={{ margin: "1rem", display: "none" }}>
        <label style={{ marginRight: "10px", fontWeight: 600 }}>
          Debug login:
        </label>

        <select
          value={currentUser?.caseID ?? ""}
          onChange={(e) => {
            const value = e.target.value;

            if (value === "") {
              setCurrentUser(null)
              setIsLoggedIn(false)
              return;
            }

            const chosen =
              availableUsers.find((u) => u.caseID === value) || null
            setCurrentUser(chosen)
            setIsLoggedIn(Boolean(chosen))
          }}
          style={{
            padding: "6px",
            fontSize: "14px",
            border: "1px solid #777",
          }}
        >
          <option value="">Log out</option>

          {availableUsers.map((u) => (
            <option key={u.caseID} value={u.caseID}>
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
            books={books}
            onRefreshBooks={runSearch}
            loading={booksLoading}
            error={booksError}
            searchBy={searchBy}
            searchText={searchText}
            isLoggedIn={isLoggedIn}
            canManage={canManageCatalog}
            onLoanCreated={handleLoanCreated}
            currentUserCaseID={currentUser?.caseID}
          />
        )}

        {currentPage === "myloans" && (
          <>
            {(loansLoading || booksLoading) && (
              <div style={{ textAlign: "center" }}>Loading...</div>
            )}
            {loansError && (
              <div style={{ textAlign: "center", color: "#c62828" }}>
                {loansError}
              </div>
            )}
            <MyLoansTable
              loans={myLoans}
              books={books}
              onRenew={(loan) => {
                setLoanAction({ mode: "renew", loan })
              }}
              onReturn={(loan) => {
                setLoanAction({ mode: "return", loan })
              }}
            />
          </>
        )}

        {currentPage === "allloans" && (
          <>
            {(loansLoading || usersLoading) && (
              <div style={{ textAlign: "center" }}>Loading...</div>
            )}
            {(loansError || usersError) && (
              <div style={{ textAlign: "center", color: "#c62828" }}>
                {loansError || usersError}
              </div>
            )}
            <AllLoansTable
              loans={loans}
              users={availableUsers}
              books={books}
              onRenew={(loan) => {
                setLoanAction({ mode: "renew", loan })
              }}
              onReturn={(loan) => {
                setLoanAction({ mode: "return", loan })
              }}
              onRestrictToggle={handleRestrictToggle}
            />
          </>
        )}

        {currentPage === "updatecatalog" && (
          <UpdateCatalogTable books={books} onRefreshBooks={loadBooks} />
        )}

        {currentPage === "staffroles" && (
          <>
            {usersError && (
              <div style={{ textAlign: "center", color: "#c62828" }}>
                {usersError}
              </div>
            )}
            <StaffRolesTable
              users={availableUsers}
              onSetRole={(caseID, role) => handleSetUserRole(caseID, role)}
            />
          </>
        )}
      </div>

      {loanAction && (
        <LoanActionPopup
          mode={loanAction.mode}
          title={actionBook?.title ?? `Book #${loanAction.loan.bookId}`}
          renewalCount={loanAction.loan.renewalCount}
          onSubmit={handleLoanActionSubmit}
          onClose={() => setLoanAction(null)}
        />
      )}
    </>
  );
}

export default App
