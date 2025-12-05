import { Box, Button } from "@mui/material"
import { useEffect, useState } from "react"
import type { BookData } from "./Types"
import {
  addBookAuthor,
  addBookTag,
  createBook,
  type BookWritePayload,
} from "../api/books"
import { createAuthor, fetchAuthors, type Author } from "../api/authors"

type UpdateCatalogTableProps = {
  books: BookData[]
  onRefreshBooks: () => Promise<void> | void
}

const numberOrDefault = (value: unknown, fallback: number) => {
  const parsed = Number(value)
  return Number.isNaN(parsed) ? fallback : parsed
}

const normalizeDate = (value: unknown) => {
  const dateStr = String(value ?? "").trim()
  if (!dateStr) return undefined
  // forcing YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    throw new Error("Publication date must be in YYYY-MM-DD format.")
  }
  return dateStr
}

const UpdateCatalogTable: React.FC<UpdateCatalogTableProps> = ({
  onRefreshBooks,
}) => {
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<{
    title?: boolean
    copies?: boolean
    authors?: boolean
  }>({})
  const [authors, setAuthors] = useState<Author[]>([])
  const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms))
  const [newBook, setNewBook] = useState({
    title: "",
    authors: [{ fname: "", lname: "" }],
    genre: "",
    copies: "",
    publisher: "",
    edition: "",
    pubdate: "",
    isbn: "",
    tags: "",
  })

  useEffect(() => {
    fetchAuthors()
      .then((list) => setAuthors(list))
      .catch((err) => {
        console.error(err)
      })
  }, [])

  const handleCreate = async () => {
    setError(null)
    setFieldErrors({})
    const title = newBook.title.trim()
    if (!title) {
      setError("Title is required.")
      setFieldErrors({ title: true })
      return
    }
    const copies = numberOrDefault(newBook.copies, 0)
    if (copies <= 0) {
      setError("Copies must be greater than 0.")
      setFieldErrors({ copies: true })
      return
    }

    let normalizedPubdate: string | undefined
    try {
      normalizedPubdate = normalizeDate(newBook.pubdate)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid publication date.")
      return
    }

    const payload: BookWritePayload = {
      title,
      copies,
      isbn: newBook.isbn ? String(newBook.isbn) : undefined,
      publisher: newBook.publisher,
      edition: newBook.edition,
      pubdate: normalizedPubdate,
    }

    const authorEntries = newBook.authors
      .map((a) => ({
        fname: a.fname.trim(),
        lname: a.lname.trim(),
      }))
      .filter((a) => a.fname || a.lname)

    if (authorEntries.some((a) => !a.lname)) {
      setError("Each author needs a last name.")
      setFieldErrors((prev) => ({ ...prev, authors: true }))
      return
    }

    const tagInput = newBook.tags
      ? newBook.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter((tag) => tag.length > 0)
      : []
    if (newBook.genre) {
      tagInput.push(newBook.genre.trim())
    }

    try {
      setIsSaving(true)
      let latestAuthors = authors

      const matchedAuthors: Author[] = []
      const unmatchedAuthors: string[] = []

      for (const entry of authorEntries) {
        const targetName = [entry.fname, entry.lname]
          .filter(Boolean)
          .join(" ")
          .trim()
          .toLowerCase()
        const findMatch = (list: Author[]) =>
          list.find((author) => {
            const fullName = [author.fname, author.lname]
              .filter(Boolean)
              .join(" ")
              .trim()
              .toLowerCase()
            return fullName === targetName
          })

        let match = findMatch(latestAuthors)
        if (!match) {
          try {
            await createAuthor(entry.lname, entry.fname)
            const refreshed = await fetchAuthors()
            latestAuthors = refreshed
            setAuthors(refreshed)
            match = findMatch(refreshed)
          } catch (err) {
            console.error("Failed to auto-create author", err)
            const message =
              err instanceof Error && err.message
                ? err.message
                : "Author creation failed. Please retry with a valid name."
            setError(message)
            setIsSaving(false)
            return
          }
        }

        if (match) {
          matchedAuthors.push(match)
        } else {
          unmatchedAuthors.push(
            [entry.fname, entry.lname].filter(Boolean).join(" ").trim() ||
              "Unknown author",
          )
        }
      }

      if (unmatchedAuthors.length > 0) {
        setError(`Unable to match authors: ${unmatchedAuthors.join(", ")}`)
        setIsSaving(false)
        return
      }

      const newId = await createBook(payload)

      if (newId) {
        for (const tag of tagInput) {
          await addBookTag(newId, tag).catch((err) => {
            console.error("Failed to add tag", err)
            throw new Error(`Failed to add tag "${tag}"`)
          })
          await sleep(50)
        }
        for (const author of matchedAuthors) {
          await addBookAuthor(newId, author.authID).catch((err) => {
            console.error("Failed to link author", err)
            throw new Error(
              `Failed to link author ${[author.fname, author.lname]
                .filter(Boolean)
                .join(" ")
                .trim()}`,
            )
          })
          await sleep(50)
        }
      }
      await onRefreshBooks()
      setError(null)
      setNewBook({
        title: "",
        authors: [{ fname: "", lname: "" }],
        genre: "",
        copies: "",
        publisher: "",
        edition: "",
        pubdate: "",
        isbn: "",
        tags: "",
      })
    } catch (err) {
      console.error(err)
      const message =
        err instanceof Error && err.message
          ? err.message
          : "Failed to add book. Please try again."
      setError(message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Box sx={{ width: "100%", display: "flex", justifyContent: "center" }}>
      <Box sx={{ width: "900px", border: "2px solid #999", p: 2 }}>
        <h3 style={{ marginTop: 0 }}>Add a New Book</h3>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: "16px 20px",
            marginBottom: "20px",
          }}
        >
          {/* Title – full width */}
          <label
            style={{
              gridColumn: "1 / -1",
              display: "flex",
              flexDirection: "column",
              fontSize: 12,
              gap: 4,
            }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
              Title
              <span style={{ color: "red" }}>*</span>
            </span>
            <input
              style={{
                padding: "6px 8px",
                border: "2px solid #ccc",
                borderColor: fieldErrors.title ? "red" : "#ccc",
              }}
              value={newBook.title}
              onChange={(e) =>
                setNewBook({ ...newBook, title: e.target.value })
              }
              required
            />
          </label>

          {/* Authors – full width row, inner grid matches 3 columns */}
          <div
            style={{
              gridColumn: "1 / -1",
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 600 }}>Author(s)</div>
              <Button
                variant="outlined"
                size="small"
                onClick={() =>
                  setNewBook({
                    ...newBook,
                    authors: [...newBook.authors, { fname: "", lname: "" }],
                  })
                }
                sx={{
                  whiteSpace: "nowrap",
                  minWidth: 32,
                  maxWidth: 32,
                  height: 32,
                  px: 0,
                  lineHeight: 1.1,
                  fontSize: 12,
                  borderRadius: "50%",
                }}
              >
                +
              </Button>
            </div>
            {newBook.authors.map((author, idx) => (
              <div
                key={idx}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 48px",
                  gap: "16px 20px",
                  alignItems: "center",
                  width: "calc((100% - 40px) / 2.9)",
                }}
              >
                <input
                  style={{ width: "100%", padding: "6px 8px", border: "2px solid #ccc" }}
                  placeholder="First name"
                  value={author.fname}
                  onChange={(e) => {
                    const next = [...newBook.authors]
                    next[idx] = { ...next[idx], fname: e.target.value }
                    setNewBook({ ...newBook, authors: next })
                  }}
                />
                <input
                  style={{
                    width: "100%",
                    padding: "6px 8px",
                    border: "2px solid #ccc",
                    borderColor:
                      fieldErrors.authors && !author.lname.trim()
                        ? "red"
                        : "#ccc",
                  }}
                  placeholder="Last name"
                  value={author.lname}
                  onChange={(e) => {
                    const next = [...newBook.authors]
                    next[idx] = { ...next[idx], lname: e.target.value }
                    setNewBook({ ...newBook, authors: next })
                  }}
                />
                <div style={{ display: "flex", gap: 8 }}>
                  <Button
                    variant="outlined"
                    size="small"
                    color="error"
                    disabled={newBook.authors.length <= 1}
                    onClick={() => {
                      if (newBook.authors.length <= 1) return
                      const next = [...newBook.authors]
                      next.splice(idx, 1)
 	     			 setNewBook({ ...newBook, authors: next })
                    }}
                    sx={{
                      whiteSpace: "nowrap",
                      minWidth: 36,
                      maxWidth: 36,
                      height: 32,
                      px: 0,
                      lineHeight: 1.1,
                      fontSize: 12,
                      borderRadius: 0,
                    }}
                  >
                    –
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <label
            style={{
              display: "flex",
              flexDirection: "column",
              fontSize: 12,
              gap: 4,
            }}
          >
            Genre
            <input
              style={{ padding: "6px 8px", border: "2px solid #ccc" }}
              value={newBook.genre}
              onChange={(e) =>
                setNewBook({ ...newBook, genre: e.target.value })
              }
            />
          </label>
          <label
            style={{
              display: "flex",
              flexDirection: "column",
              fontSize: 12,
              gap: 4,
            }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
              Copies
              <span style={{ color: "red" }}>*</span>
            </span>
            <input
              style={{
                padding: "6px 8px",
                border: "2px solid #ccc",
                borderColor: fieldErrors.copies ? "red" : "#ccc",
              }}
              type="number"
              min={0}
              value={newBook.copies}
              onChange={(e) =>
                setNewBook({ ...newBook, copies: e.target.value })
              }
            />
          </label>
          <label
            style={{
              display: "flex",
              flexDirection: "column",
              fontSize: 12,
              gap: 4,
            }}
          >
            Publisher
            <input
              style={{ padding: "6px 8px", border: "2px solid #ccc" }}
              value={newBook.publisher}
              onChange={(e) =>
                setNewBook({ ...newBook, publisher: e.target.value })
              }
            />
          </label>
          <label
            style={{
              display: "flex",
              flexDirection: "column",
              fontSize: 12,
              gap: 4,
            }}
          >
            Edition
            <input
              style={{ padding: "6px 8px", border: "2px solid #ccc" }}
              value={newBook.edition}
              onChange={(e) =>
                setNewBook({ ...newBook, edition: e.target.value })
              }
            />
          </label>
          <label
            style={{
              display: "flex",
              flexDirection: "column",
              fontSize: 12,
              gap: 4,
            }}
          >
            Publication Date
            <input
              style={{ padding: "6px 8px", border: "2px solid #ccc" }}
              placeholder="YYYY-MM-DD"
              value={newBook.pubdate}
              onChange={(e) =>
                setNewBook({ ...newBook, pubdate: e.target.value })
              }
            />
          </label>
          <label
            style={{
              display: "flex",
              flexDirection: "column",
              fontSize: 12,
              gap: 4,
            }}
          >
            ISBN
            <input
              style={{ padding: "6px 8px", border: "2px solid #ccc" }}
              value={newBook.isbn}
              onChange={(e) =>
                setNewBook({ ...newBook, isbn: e.target.value })
              }
            />
          </label>
          <label
            style={{
              display: "flex",
              flexDirection: "column",
              fontSize: 12,
              gap: 4,
            }}
          >
            Tags (comma separated)
            <input
              style={{ padding: "6px 8px", border: "2px solid #ccc" }}
              value={newBook.tags}
              onChange={(e) =>
                setNewBook({ ...newBook, tags: e.target.value })
              }
            />
          </label>
        </div>
        <Button
          className="staff-roles-submit"
          variant="contained"
          onClick={handleCreate}
          disabled={isSaving}
          sx={{
            textTransform: "none",
            fontWeight: 600,
            padding: "10px 18px",
            borderRadius: "6px",
            backgroundColor: "#003071",
            color: "#fff",
            "&:hover": { backgroundColor: "#0046a6" },
          }}
        >
          {isSaving ? "Saving..." : "Add Book"}
        </Button>
        {error && (
          <Box
            sx={{
              p: 2,
              textAlign: "center",
              color: "#c62828",
              fontWeight: 600,
            }}
          >
            {error}
          </Box>
        )}
      </Box>
    </Box>
  )
}

export default UpdateCatalogTable
