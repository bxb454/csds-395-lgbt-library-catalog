import React, { useEffect, useState } from "react"
import axios from "axios"
import type { BookData } from "./Types"
import type { UserData } from "./Types"
import {
  fetchBookAuthors,
  fetchBookTags,
} from "../api/books"
import { createLoan } from "../api/loans"
import { fetchUsers } from "../api/users"

interface BookDetailPopupProps {
  book: BookData
  onClose: () => void
  isLoggedIn: boolean
  patronCaseID?: string | null
  onLoanCreated?: () => Promise<void> | void
}

const BookDetailPopup: React.FC<BookDetailPopupProps> = ({
  book,
  onClose,
  isLoggedIn,
  patronCaseID,
  onLoanCreated,
}) => {
  const [staffID, setStaffID] = useState("")
  const [authors, setAuthors] = useState<{ authID: number; name: string }[]>([])
  const [tags, setTags] = useState<string[]>(book.tags ?? [])
  const [metaError, setMetaError] = useState<string | null>(null)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [staffAccounts, setStaffAccounts] = useState<UserData[]>([])

  const displayOrNA = (value?: string | number | null) => {
    if (value === null || value === undefined) return "N/A"
    const str = typeof value === "number" ? String(value) : String(value)
    const trimmed = str.trim()
    return trimmed.length > 0 ? trimmed : "N/A"
  }

  const displayDate = (value?: string | null) => {
    if (!value) return "N/A"
    const parsed = new Date(value)
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString().split("T")[0]
    }
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : "N/A"
  }

  useEffect(() => {
    let isMounted = true

    const loadMeta = async () => {
      try {
        setMetaError(null)
        const [authorResponse, tagResponse] = await Promise.all([
          fetchBookAuthors(book.id),
          fetchBookTags(book.id),
        ])
        if (!isMounted) return
        setAuthors(
          (authorResponse ?? []).map((author) => ({
            authID: author.authID,
            name: [author.fname, author.lname].filter(Boolean).join(" ").trim(),
          })),
        )
        setTags(tagResponse ?? [])
      } catch (err) {
        console.error(err)
        if (isMounted) {
          setMetaError("Failed to load book metadata.")
        }
      }
    }

    void loadMeta()
    return () => {
      isMounted = false
    }
  }, [book.id])

  useEffect(() => {
    let isMounted = true
    const loadStaff = async () => {
      try {
        const users = await fetchUsers()
        if (!isMounted) return
        setStaffAccounts(users.filter((u) => u.role === "staff" || u.role === "admin"))
      } catch (err) {
        console.error(err)
      }
    }
    void loadStaff()
    return () => {
      isMounted = false
    }
  }, [])

  const canCheckout = isLoggedIn && book.available > 0

  const formatDate = (date: Date) => date.toISOString().split("T")[0]

  const handleCheckout = async () => {
    const patronCase = (patronCaseID ?? "").trim()
    if (!patronCase) {
      setCheckoutError("Log in to an account with a valid CASE ID before checking out.")
      return
    }
    const staffCase = staffID.trim()
    const staffEntry = staffAccounts.find(
      (u) => u.caseID.toLowerCase() === staffCase.toLowerCase(),
    )
    if (!staffCase || !staffEntry || !["staff", "admin"].includes(staffEntry.role)) {
      setCheckoutError("Checkout must be processed by a LGBT Center employee.")
      return
    }
    setCheckoutError(null)
    try {
      setCheckoutLoading(true)
      const today = new Date()
      const due = new Date()
      due.setDate(today.getDate() + 14)
      await createLoan({
        bookID: book.id,
        caseID: patronCase,
        loanDate: formatDate(today),
        dueDate: formatDate(due),
        numRenewals: 0,
      })
      await onLoanCreated?.()
      onClose()
    } catch (err) {
      console.error(err)
      if (axios.isAxiosError(err)) {
        const data = err.response?.data
        const serverMsg =
          typeof data === "string"
            ? data
            : typeof data?.error === "string"
              ? data.error
              : null
        setCheckoutError(
          serverMsg ??
            "Checkout failed. Ensure the patron exists and has permission.",
        )
      } else {
        setCheckoutError("Checkout failed. Verify the CASE ID and try again.")
      }
    } finally {
      setCheckoutLoading(false)
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 2000,
      }}
    >
      <div
        style={{
          width: "750px",
          backgroundColor: "white",
          border: "2px solid #777",
          color: "black",
          padding: "30px",
          display: "grid",
          gridTemplateColumns: "1fr 240px",
          columnGap: "25px",
        }}
      >
        <div>
          <div style={{ marginBottom: "15px", fontSize: "20px" }}>
            <strong>Title:</strong>
            <br />
            {book.title}
          </div>

          <div style={{ marginBottom: "15px", fontSize: "20px" }}>
            <strong>Author(s):</strong>
            <br />
            {authors.length > 0
              ? authors.map((author) => (
                  <div
                    key={author.authID}
                    style={{ display: "flex", gap: 8, alignItems: "center" }}
                  >
                    <span>{author.name}</span>
                  </div>
                ))
              : "N/A"}
          </div>

          <div style={{ marginBottom: "15px", fontSize: "20px" }}>
            <strong>Details:</strong>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "160px 1fr",
                rowGap: 10,
                columnGap: 12,
                marginTop: 8,
                alignItems: "center",
              }}
            >
              <span
                style={{
                  fontWeight: 600,
                  color: "#444",
                  fontSize: "16px",
                  textAlign: "right",
                }}
              >
                Publisher
              </span>
              <span>{displayOrNA(book.publisher)}</span>

              <span
                style={{
                  fontWeight: 600,
                  color: "#444",
                  fontSize: "16px",
                  textAlign: "right",
                }}
              >
                Edition
              </span>
              <span>{displayOrNA(book.edition)}</span>

              <span
                style={{
                  fontWeight: 600,
                  color: "#444",
                  fontSize: "16px",
                  textAlign: "right",
                }}
              >
                Publication date
              </span>
              <span>{displayDate(book.pubdate)}</span>

              <span
                style={{
                  fontWeight: 600,
                  color: "#444",
                  fontSize: "16px",
                  textAlign: "right",
                }}
              >
                ISBN
              </span>
              <span>{displayOrNA(book.isbn)}</span>

              <span
                style={{
                  fontWeight: 600,
                  color: "#444",
                  fontSize: "16px",
                  textAlign: "right",
                }}
              >
                Copies
              </span>
              <span>
                {book.available}/{book.copies} available
              </span>
            </div>
          </div>
        </div>

        <div>
          <div
            style={{
              width: "100%",
              height: "150px",
              backgroundColor: "#d0d0d0",
              border: "1px solid #999",
              marginBottom: "10px",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            Thumbnail
          </div>

          <div>
            <div style={{ fontWeight: 600, marginBottom: 4, fontSize: 20 }}>Tags:</div>
            {tags.length > 0 ? (
              <ul style={{ paddingLeft: 20 }}>
                {tags.map((tag) => (
                  <li key={tag} style={{ marginBottom: 4 }}>
                    {tag}
                  </li>
                ))}
              </ul>
            ) : (
              <span>N/A</span>
            )}
          </div>
          {metaError && (
            <div style={{ color: "#c62828", marginTop: "8px" }}>{metaError}</div>
          )}
        </div>

        {canCheckout && (
          <div
            style={{
              gridColumn: "1 / span 2",
              marginTop: "20px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
            }}
          >
            <strong>Check out item?</strong>

            <div style={{ marginTop: "6px" }}>
              Staff member on desk:{" "}
              <input
                value={staffID}
                onChange={(e) => setStaffID(e.target.value)}
                placeholder="Staff CASE ID"
                style={{
                  border: "1px solid #777",
                  padding: "2px 4px",
                  width: "140px",
                }}
              />
            </div>
            {checkoutError && (
              <div style={{ color: "#c62828", marginTop: 8 }}>{checkoutError}</div>
            )}
          </div>
        )}

        <div
          style={{
            gridColumn: "1 / span 2",
            display: "flex",
            justifyContent: "center",
            gap: "80px",
            marginTop: "30px",
          }}
        >
          <button
            onClick={onClose}
            style={{
              fontSize: "16px",
              padding: "10px 18px",
              borderRadius: "8px",
              border: "1px solid #c62828",
              background: "white",
              color: "#c62828",
              cursor: "pointer",
              minWidth: "120px",
            }}
          >
            Cancel
          </button>

          {canCheckout && (
            <button
              onClick={handleCheckout}
              disabled={checkoutLoading}
              style={{
                fontSize: "16px",
                padding: "10px 18px",
                borderRadius: "8px",
                border: "2px solid #003071",
                background: checkoutLoading ? "#e0e0e0" : "#003071",
                color: checkoutLoading ? "#666" : "white",
                cursor: checkoutLoading ? "not-allowed" : "pointer",
                minWidth: "120px",
              }}
            >
              {checkoutLoading ? "Submitting..." : "Submit"}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default BookDetailPopup
