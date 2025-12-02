import React, { useEffect, useMemo, useState } from "react"
import axios from "axios"
import type { BookData } from "./Types"
import {
  addBookAuthor,
  addBookTag,
  deleteBookAuthor,
  deleteBookTag,
  fetchBookAuthors,
  fetchBookTags,
} from "../api/books"
import { fetchAuthors, createAuthor, type Author } from "../api/authors"
import { createLoan } from "../api/loans"

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
  const [availableAuthors, setAvailableAuthors] = useState<Author[]>([])
  const [selectedAuthorId, setSelectedAuthorId] = useState("")
  const [newTag, setNewTag] = useState("")
  const [newAuthorLName, setNewAuthorLName] = useState("")
  const [newAuthorFName, setNewAuthorFName] = useState("")
  const [metaError, setMetaError] = useState<string | null>(null)
  const [pendingMessage, setPendingMessage] = useState<string | null>(null)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const [checkoutLoading, setCheckoutLoading] = useState(false)

  useEffect(() => {
    let isMounted = true

    const loadMeta = async () => {
      try {
        setMetaError(null)
        const [authorResponse, tagResponse, allAuthors] = await Promise.all([
          fetchBookAuthors(book.id),
          fetchBookTags(book.id),
          fetchAuthors(),
        ])
        if (!isMounted) return
        setAuthors(
          (authorResponse ?? []).map((author) => ({
            authID: author.authID,
            name: [author.fname, author.lname].filter(Boolean).join(" ").trim(),
          })),
        )
        setTags(tagResponse ?? [])
        setAvailableAuthors(allAuthors ?? [])
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

  const authorOptions = useMemo(
    () =>
      availableAuthors.filter(
        (author) => !authors.some((a) => a.authID === author.authID),
      ),
    [availableAuthors, authors],
  )

  const handleAddTag = async () => {
    const trimmed = newTag.trim()
    if (!trimmed) return
    try {
      await addBookTag(book.id, trimmed)
      setTags((prev) => [...prev, trimmed])
      setNewTag("")
    } catch (err) {
      console.error(err)
      setMetaError("Failed to add tag.")
    }
  }

  const handleDeleteTag = async (tag: string) => {
    try {
      await deleteBookTag(book.id, tag)
      setTags((prev) => prev.filter((existing) => existing !== tag))
    } catch (err) {
      console.error(err)
      setMetaError("Failed to remove tag.")
    }
  }

  const handleAddAuthor = async () => {
    if (!selectedAuthorId) return
    try {
      await addBookAuthor(book.id, Number(selectedAuthorId))
      const newlyAdded = authorOptions.find(
        (author) => author.authID === Number(selectedAuthorId),
      )
      if (newlyAdded) {
        setAuthors((prev) => [
          ...prev,
          {
            authID: newlyAdded.authID,
            name: [newlyAdded.fname, newlyAdded.lname]
              .filter(Boolean)
              .join(" ")
              .trim(),
          },
        ])
      }
      setSelectedAuthorId("")
    } catch (err) {
      console.error(err)
      setMetaError("Failed to add author.")
    }
  }

  const handleDeleteAuthor = async (authID: number) => {
    try {
      await deleteBookAuthor(book.id, authID)
      setAuthors((prev) => prev.filter((author) => author.authID !== authID))
    } catch (err) {
      console.error(err)
      setMetaError("Failed to remove author.")
    }
  }

  const handleCreateAuthor = async () => {
    if (!newAuthorLName.trim()) return
    try {
      await createAuthor(newAuthorLName.trim(), newAuthorFName.trim() || undefined)
      setPendingMessage("Author created. Refreshing list…")
      setNewAuthorLName("")
      setNewAuthorFName("")
      const updatedAuthors = await fetchAuthors()
      setAvailableAuthors(updatedAuthors)
      setPendingMessage(null)
    } catch (err) {
      console.error(err)
      setMetaError("Failed to create author.")
    }
  }

  const canCheckout = isLoggedIn && book.available > 0

  const formatDate = (date: Date) => date.toISOString().split("T")[0]

  const handleCheckout = async () => {
    const patronCase = (patronCaseID ?? "").trim()
    if (!patronCase) {
      setCheckoutError("Log in to a patron account before checking out.")
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
          padding: "30px",
          display: "grid",
          gridTemplateColumns: "1fr 240px",
          columnGap: "25px",
        }}
      >
        <div>
          <div style={{ marginBottom: "15px" }}>
            <strong>Title:</strong>
            <br />
            {book.title}
          </div>

          <div style={{ marginBottom: "15px" }}>
            <strong>ISBN:</strong>
            <br />
            {book.isbn || "[ISBN]"}
          </div>

          <div style={{ marginBottom: "15px" }}>
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
              : book.author || ""}
          </div>

          <div style={{ marginBottom: "15px" }}>
            <strong>Publishing info:</strong>
            <br />
            {book.publisher || "[Publisher]"}
            <br />
            {book.edition || "[Edition]"}
            <br />
            {book.pubYear || "[PubYear]"}
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

          <div style={{ marginBottom: "10px" }}>
            [{book.available}/{book.copies}] available
          </div>

          <div>
            {tags.length > 0 ? (
              <ul style={{ paddingLeft: 20 }}>
                {tags.map((tag) => (
                  <li key={tag} style={{ marginBottom: 4 }}>
                    {tag}
                  </li>
                ))}
              </ul>
            ) : (
              "No tags yet"
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
              Processed by:{" "}
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
                border: "1px solid #1976d2",
                background: checkoutLoading ? "#e0e0e0" : "#1976d2",
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
