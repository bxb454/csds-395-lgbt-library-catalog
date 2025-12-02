import {
    MaterialReactTable,
    type MRT_ColumnDef,
    useMaterialReactTable,
} from "material-react-table"
import { useEffect, useMemo, useState, type MouseEvent } from "react"
import { Box, IconButton } from "@mui/material"
import { Delete, Edit } from "@mui/icons-material"
import type { BookData } from "./Types"
import { filterBooks, type SearchOption } from "./catalogSearch"
import BookDetailPopup from "./BookDetailPopup"
import {
    deleteBook,
    updateBook,
    type BookWritePayload,
    fetchBookAuthors,
    fetchBookTags,
    deleteBookAuthor,
    deleteBookTag,
    addBookAuthor,
    addBookTag,
} from "../api/books"
import { fetchAuthors, createAuthor, type Author } from "../api/authors"

type EditFormState = {
    id: number
    title: string
    author: string
    genre: string
    publisher: string
    edition: string
    image: string
    pubYear: string
    isbn: string
    tagsInput: string
    copies: string
    available: string
}

interface BookTableProps {
    books: BookData[]
    onRefreshBooks: () => Promise<void> | void
    loading?: boolean
    error?: string | null
    editable?: boolean
    searchBy?: SearchOption
    searchText?: string
    isLoggedIn: boolean
    canManage?: boolean
    onLoanCreated?: () => Promise<void> | void
    currentUserCaseID?: string | null
}

const BookDataTable = ({
    books,
    onRefreshBooks,
    loading = false,
    error = null,
    editable = false,
    searchBy = "general",
    searchText = "",
    isLoggedIn,
    canManage = false,
    onLoanCreated = () => {},
    currentUserCaseID,
}: BookTableProps) => {
    const [selectedBook, setSelectedBook] = useState<BookData | null>(null)
    const allowManagement = editable || canManage
    const [editForm, setEditForm] = useState<EditFormState | null>(null)
    const [authorsByBook, setAuthorsByBook] = useState<Record<number, string>>({})
    const [tagsByBook, setTagsByBook] = useState<Record<number, string[]>>({})
    const [pendingDelete, setPendingDelete] = useState<BookData | null>(null)
    const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms))
    const parseAuthorName = (raw: string): { fname?: string; lname: string } => {
        const parts = raw.split(/\s+/).filter(Boolean)
        if (parts.length <= 1) {
            return { lname: parts[0] ?? raw }
        }
        const lname = parts.pop() ?? ""
        const fname = parts.join(" ")
        return { fname: fname || undefined, lname }
    }
    const columns = useMemo<MRT_ColumnDef<BookData>[]>(
        () => [
            {
                accessorKey: "image",
                header: "",
                size: 90,
                Cell: ({ cell }) => (
                    <div
                        style={{
                            width: "100%",
                            height: "100%",
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                        }}
                    >
                        {cell.getValue<string>() ? (
                            <img
                                src={cell.getValue<string>()}
                                style={{
                                    width: 72,
                                    height: 72,
                                    borderRadius: "6px",
                                    objectFit: "cover",
                                }}
                            />
                        ) : (
                            <div
                                style={{
                                    width: 60,
                                    height: 72,
                                    borderRadius: "6px",
                                    backgroundColor: "#f1f1f1",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    color: "#999",
                                    fontSize: 10,
                                }}
                            >
                                No Image
                            </div>
                        )}
                    </div>
                ),
            },
            {
                accessorKey: "title",
                header: "",
                size: 260,
                Cell: ({ row }) => {
                    const book = row.original
                    const authorLine =
                        authorsByBook[book.id] ??
                        book.author ??
                        ""
                    return (
                        <div style={{ display: "flex", flexDirection: "column" }}>
                            <div
                                style={{
                                    fontWeight: 600,
                                    fontSize: 14,
                                    marginBottom: 4,
                                }}
                            >
                                {book.title}
                            </div>
                            <div style={{ fontSize: 11 }}>{authorLine}</div>
                        </div>
                    )
                },
            },
            {
                id: "copiesAvailableTags",
                header: "",
                size: 200,
                Cell: ({ row }) => {
                    const book = row.original
                    const copiesLabel = book.copies === 1 ? "copy" : "copies"

                    const tagsList =
                        tagsByBook[book.id] && tagsByBook[book.id].length > 0
                            ? tagsByBook[book.id]
                            : book.tags
                    const tagsText =
                        (tagsList && tagsList.length > 0
                            ? tagsList.join(", ")
                            : book.genre) || ""

                    return (
                        <div style={{ display: "flex", flexDirection: "column" }}>
                            <div
                                style={{
                                    fontWeight: 600,
                                    fontSize: 14,
                                    marginBottom: 4,
                                }}
                            >
                                {book.copies} {copiesLabel}, {book.available} available
                            </div>
                            <div style={{ fontSize: 11 }}>{tagsText}</div>
                        </div>
                    )
                },
            },
        ],
        [authorsByBook]
    )

    const filteredData = useMemo(
        () => filterBooks(books, searchBy, searchText),
        [books, searchBy, searchText],
    )

    useEffect(() => {
        const missing = books.filter(
            (b) => !authorsByBook[b.id] && (!b.author || b.author.length === 0),
        )
        if (missing.length === 0) return

        const fetchAll = async () => {
            const entries: Array<[number, string]> = []
            for (const book of missing) {
                try {
                    const authors = await fetchBookAuthors(book.id)
                    const names = Array.isArray(authors)
                        ? authors
                              .map((a: { fname?: string | null; lname?: string | null }) =>
                                  [a.fname, a.lname].filter(Boolean).join(" ").trim(),
                              )
                              .filter((name: string) => name.length > 0)
                        : []
                    entries.push([book.id, names.join(", ")])
                } catch {
                    entries.push([book.id, ""])
                }
                await sleep(50)
            }
            setAuthorsByBook((prev) => {
                const next = { ...prev }
                for (const [id, names] of entries) {
                    if (names) next[id] = names
                }
                return next
            })
        }

        void fetchAll()
    }, [books, authorsByBook])

    useEffect(() => {
        const missing = books.filter(
            (b) =>
                !tagsByBook[b.id] &&
                (!b.tags || b.tags.length === 0) &&
                b.id !== undefined,
        )
        if (missing.length === 0) return

        const fetchAll = async () => {
            const entries: Array<[number, string[]]> = []
            for (const book of missing) {
                try {
                    const tags = await fetchBookTags(book.id)
                    const safeTags = Array.isArray(tags) ? [...tags] : []
                    entries.push([book.id, safeTags])
                } catch {
                    entries.push([book.id, []])
                }
                await sleep(50)
            }
            setTagsByBook((prev) => {
                const next: Record<number, string[]> = { ...prev }
                for (const [id, tags] of entries) {
                    if (tags.length > 0) next[id] = [...tags]
                }
                return next
            })
        }

        void fetchAll()
    }, [books, tagsByBook])

    const createEditState = (book: BookData): EditFormState => {
        const authorName = authorsByBook[book.id] ?? book.author ?? ""
        const tagsList = tagsByBook[book.id] ?? book.tags ?? []
        const genreValue = book.genre ?? (tagsList.length > 0 ? tagsList[0] : "")

        return {
            id: book.id,
            title: book.title ?? "",
            author: authorName,
            genre: genreValue,
            publisher: book.publisher ?? "",
            edition: book.edition ?? "",
            image: book.image ?? "",
            pubYear: book.pubYear ? String(book.pubYear) : "",
            isbn: book.isbn ? String(book.isbn) : "",
            tagsInput: tagsList.join(", "),
            copies: String(book.copies ?? 0),
            available: String(book.available ?? 0),
        }
    }

    const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return

        if (!file.type.startsWith("image/")) {
            alert("Please choose an image file.")
            return
        }

        const reader = new FileReader()
        reader.onload = () => {
            const result = reader.result
            if (typeof result === "string") {
                updateEditField("image", result)
            }
        }
        reader.readAsDataURL(file)
    }

    const handleDeleteRow = (row: any, event?: MouseEvent) => {
        event?.stopPropagation()
        setPendingDelete(row.original)
    }

    const confirmDelete = async () => {
        if (!pendingDelete) return
        try {
            const bookId = pendingDelete.id
            try {
                const [authorsRaw, tagsRaw] = await Promise.all([
                    fetchBookAuthors(bookId).catch(() => null),
                    fetchBookTags(bookId).catch(() => null),
                ])

                const authors = Array.isArray(authorsRaw) ? authorsRaw : []
                const tags = Array.isArray(tagsRaw) ? tagsRaw : []

                await Promise.all([
                    ...tags.map((tag: string) =>
                        deleteBookTag(bookId, tag).catch((err) => console.error(err)),
                    ),
                    ...authors.map((author: { authID: number }) =>
                        deleteBookAuthor(bookId, author.authID).catch((err) =>
                            console.error(err),
                        ),
                    ),
                ])
            } catch (cleanupErr) {
                console.error("Failed to remove book metadata before delete", cleanupErr)
            }

            await deleteBook(bookId)
            await onRefreshBooks()
            setPendingDelete(null)
        } catch (err) {
            console.error(err)
            alert("Failed to delete book. Please try again.")
        }
    }

    const handleEditRow = (book: BookData, event: MouseEvent) => {
        event.stopPropagation()
        setEditForm(createEditState(book))
    }

    const updateEditField = (field: keyof EditFormState, value: string) => {
        setEditForm((prev) => (prev ? { ...prev, [field]: value } : prev))
    }

    const buildWritePayload = (form: EditFormState, copies: number): BookWritePayload => ({
        title: form.title || "Untitled",
        copies,
        isbn: form.isbn || undefined,
        pubdate: form.pubYear ? `${form.pubYear}-01-01` : undefined,
        publisher: form.publisher || undefined,
        edition: form.edition || undefined,
    })

    const reconcileAuthors = async (bookId: number, authorInput: string) => {
        const desiredNames = authorInput
            .split(",")
            .map((name) => name.trim())
            .filter((name) => name.length > 0)

        const allAuthors = await fetchAuthors().catch(() => [] as Author[])
        const desiredIds: number[] = []

        for (const name of desiredNames) {
            const match = allAuthors.find((a) => {
                const full = [a.fname, a.lname].filter(Boolean).join(" ").trim().toLowerCase()
                return full === name.toLowerCase()
            })
            if (match) {
                desiredIds.push(match.authID)
                continue
            }
            try {
                const parsed = parseAuthorName(name)
                await createAuthor(parsed.lname, parsed.fname)
                const refreshed = await fetchAuthors().catch(() => [] as Author[])
                const created = refreshed.find((a) => {
                    const full = [a.fname, a.lname].filter(Boolean).join(" ").trim().toLowerCase()
                    return full === name.toLowerCase()
                })
                if (created) {
                    desiredIds.push(created.authID)
                }
            } catch (err) {
                console.error("Failed to create author", err)
            }
        }

        const current = await fetchBookAuthors(bookId).catch(() => [] as any[])
        const currentIds = current.map((a: any) => a.authID)

        for (const id of currentIds) {
            if (!desiredIds.includes(id)) {
                await deleteBookAuthor(bookId, id).catch(() => {})
                await sleep(30)
            }
        }
        for (const id of desiredIds) {
            if (!currentIds.includes(id)) {
                await addBookAuthor(bookId, id).catch(() => {})
                await sleep(30)
            }
        }
    }

    const reconcileTags = async (bookId: number, tagsInput: string, genre: string) => {
        const desired = [
            ...tagsInput
                .split(",")
                .map((tag) => tag.trim())
                .filter((tag) => tag.length > 0),
        ]
        if (genre) {
            desired.push(genre.trim())
        }

        const current = await fetchBookTags(bookId).catch(() => [] as string[])

        for (const tag of current) {
            if (!desired.includes(tag)) {
                await deleteBookTag(bookId, tag).catch(() => {})
                await sleep(30)
            }
        }
        for (const tag of desired) {
            if (!current.includes(tag)) {
                await addBookTag(bookId, tag).catch(() => {})
                await sleep(30)
            }
        }
    }

    const handleEditSave = async () => {
        if (!editForm) return

        const copies = Number(editForm.copies)
        const available = Number(editForm.available)

        if (Number.isNaN(copies) || copies < 0) {
            alert("Copies must be a non-negative number.")
            return
        }

        if (Number.isNaN(available) || available < 0) {
            alert("Available must be a non-negative number.")
            return
        }

        if (available > copies) {
            alert("Available copies cannot exceed total copies.")
            return
        }

        try {
            await updateBook(editForm.id, buildWritePayload(editForm, copies))
            await reconcileAuthors(editForm.id, editForm.author)
            await reconcileTags(editForm.id, editForm.tagsInput, editForm.genre)
            await onRefreshBooks()
            setEditForm(null)
        } catch (err) {
            console.error(err)
            alert("Failed to save changes. Please try again.")
        }
    }

    const closeEditForm = () => setEditForm(null)

    const table = useMaterialReactTable({
        columns,
        data: filteredData,
        enableEditing: false,
        enableTableHead: false,
        positionActionsColumn: allowManagement ? "last" : undefined,
        enableColumnFilters: false,
        enableGlobalFilter: false,
        enableFilterMatchHighlighting: false,
        enableColumnActions: false,
        enableDensityToggle: false,
        enableHiding: false,
        enableFullScreenToggle: false,
        enableSorting: false,
        enableTopToolbar: false,
        enableRowActions: allowManagement,
        renderRowActions: allowManagement
            ? ({ row }) => (
                <Box sx={{ display: "flex", gap: "0.5rem" }}>
                    <IconButton
                        size="small"
                        onClick={(event) => handleEditRow(row.original, event)}
                    >
                        <Edit fontSize="small" />
                    </IconButton>
                    <IconButton
                        size="small"
                        color="error"
                        onClick={(event) => handleDeleteRow(row, event)}
                    >
                        <Delete fontSize="small" />
                    </IconButton>
                </Box>
            )
            : undefined,
        muiTableBodyRowProps: ({ row }) => ({
            sx: { height: 90 },
            onClick: () => setSelectedBook(row.original),
            style: { cursor: "pointer" },
        }),
        muiTableBodyCellProps: {
            sx: {
                py: 0.5,
                px: 1,
                borderRight: "1px solid #999",
                borderBottom: "1px solid #999",
                "&:last-of-type": { borderRight: "none" },
            },
        },
        muiTableHeadCellProps: {
            sx: {
                py: 0.5,
                px: 1,
                borderRight: "1px solid #999",
                borderBottom: "1px solid #999",
                "&:last-of-type": { borderRight: "none" },
            },
        },
        muiTablePaperProps: {
            elevation: 0,
            sx: { boxShadow: "none", borderRadius: 0 },
        },
    })

    return (
        <>
            <Box sx={{ width: "100%", display: "flex", justifyContent: "center" }}>
                <Box
                    sx={{
                        width: "700px",
                        border: "1px solid #999",
                    }}
                >
                    <MaterialReactTable table={table} />
                    {loading && (
                        <div style={{ padding: "12px", textAlign: "center" }}>
                            Loading books...
                        </div>
                    )}
                    {error && (
                        <div
                            style={{
                                padding: "12px",
                                textAlign: "center",
                                color: "#c62828",
                                fontWeight: 600,
                            }}
                        >
                            {error}
                        </div>
                    )}
                </Box>
            </Box>

            {selectedBook && (
                <BookDetailPopup
                    book={selectedBook}
                    isLoggedIn={isLoggedIn}
                    patronCaseID={currentUserCaseID}
                    onClose={() => setSelectedBook(null)}
                    onLoanCreated={onLoanCreated}
                />
            )}

            {pendingDelete && (
                <div className="modal-overlay">
                    <div className="modal" style={{ maxWidth: 420 }}>
                        <h3 style={{ marginTop: 0 }}>Delete Book</h3>
                        <p style={{ marginBottom: 20 }}>
                            Are you sure you want to delete{" "}
                            <strong>{pendingDelete.title}</strong>?
                        </p>
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
                            <button
                                className="staff-roles-reset"
                                onClick={() => setPendingDelete(null)}
                            >
                                Cancel
                            </button>
                            <button className="staff-roles-submit" onClick={confirmDelete}>
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {editForm && (
                <div className="modal-overlay">
                    <div className="modal" style={{ maxWidth: 520 }}>
                        <button className="close-button" onClick={closeEditForm}>
                            ×
                        </button>
                        <h2 style={{ marginTop: 0 }}>Edit Book Details</h2>
                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                                gap: "12px",
                            }}
                        >
                            <label style={{ display: "flex", flexDirection: "column", fontSize: 12 }}>
                                Title
                                <input
                                    value={editForm.title}
                                    onChange={(e) => updateEditField("title", e.target.value)}
                                />
                            </label>
                            <label style={{ display: "flex", flexDirection: "column", fontSize: 12 }}>
                                Author
                                <input
                                    value={editForm.author}
                                    onChange={(e) => updateEditField("author", e.target.value)}
                                />
                            </label>
                            <label style={{ display: "flex", flexDirection: "column", fontSize: 12 }}>
                                Genre
                                <input
                                    value={editForm.genre}
                                    onChange={(e) => updateEditField("genre", e.target.value)}
                                />
                            </label>
                            <label style={{ display: "flex", flexDirection: "column", fontSize: 12 }}>
                                Publisher
                                <input
                                    value={editForm.publisher}
                                    onChange={(e) => updateEditField("publisher", e.target.value)}
                                />
                            </label>
                            <label style={{ display: "flex", flexDirection: "column", fontSize: 12 }}>
                                Edition
                                <input
                                    value={editForm.edition}
                                    onChange={(e) => updateEditField("edition", e.target.value)}
                                />
                            </label>
                            <label style={{ display: "flex", flexDirection: "column", fontSize: 12 }}>
                                Publication Year
                                <input
                                    type="number"
                                    value={editForm.pubYear}
                                    onChange={(e) => updateEditField("pubYear", e.target.value)}
                                />
                            </label>
                            <label style={{ display: "flex", flexDirection: "column", fontSize: 12 }}>
                                ISBN
                                <input
                                    value={editForm.isbn}
                                    onChange={(e) => updateEditField("isbn", e.target.value)}
                                />
                            </label>
                            <label style={{ display: "flex", flexDirection: "column", fontSize: 12 }}>
                                Copies
                                <input
                                    type="number"
                                    min={0}
                                    value={editForm.copies}
                                    onChange={(e) => updateEditField("copies", e.target.value)}
                                />
                            </label>
                            <label style={{ display: "flex", flexDirection: "column", fontSize: 12 }}>
                                Available
                                <input
                                    type="number"
                                    min={0}
                                    value={editForm.available}
                                    onChange={(e) => updateEditField("available", e.target.value)}
                                />
                            </label>
                            <label style={{ display: "flex", flexDirection: "column", fontSize: 12 }}>
                                Tags (comma separated)
                                <input
                                    value={editForm.tagsInput}
                                    onChange={(e) => updateEditField("tagsInput", e.target.value)}
                                />
                            </label>
                        </div>
                        <div
                            style={{
                                marginTop: "18px",
                                display: "flex",
                                justifyContent: "flex-end",
                                gap: "12px",
                            }}
                        >
                            <button className="staff-roles-reset" onClick={closeEditForm}>
                                Cancel
                            </button>
                            <button className="staff-roles-submit" onClick={handleEditSave}>
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}

export default BookDataTable
