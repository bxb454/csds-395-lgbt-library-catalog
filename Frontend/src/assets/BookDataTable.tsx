import {
    MaterialReactTable,
    type MRT_ColumnDef,
    useMaterialReactTable,
} from "material-react-table"
import { useMemo, useState, type MouseEvent } from "react"
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
} from "../api/books"

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
}: BookTableProps) => {
    const [selectedBook, setSelectedBook] = useState<BookData | null>(null)
    const allowManagement = editable || canManage
    const [editForm, setEditForm] = useState<EditFormState | null>(null)

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
                            <div style={{ fontSize: 11 }}>{book.author}</div>
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

                    const tagsText =
                        (book.tags && book.tags.length > 0
                            ? book.tags.join(", ")
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
        []
    )

    const filteredData = useMemo(
        () => filterBooks(books, searchBy, searchText),
        [books, searchBy, searchText],
    )

    const createEditState = (book: BookData): EditFormState => ({
        id: book.id,
        title: book.title ?? "",
        author: book.author ?? "",
        genre: book.genre ?? "",
        publisher: book.publisher ?? "",
        edition: book.edition ?? "",
        image: book.image ?? "",
        pubYear: book.pubYear ? String(book.pubYear) : "",
        isbn: book.isbn ? String(book.isbn) : "",
        tagsInput: book.tags?.join(", ") ?? "",
        copies: String(book.copies ?? 0),
        available: String(book.available ?? 0),
    })

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

    const handleDeleteRow = async (row: any, event?: MouseEvent) => {
        event?.stopPropagation()
        if (!window.confirm("Are you sure you want to delete this book?")) {
            return
        }
        try {
            const bookId = row.original.id
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
                    onClose={() => setSelectedBook(null)}
                    onLoanCreated={onLoanCreated}
                />
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
                                Image URL
                                <input
                                    value={editForm.image}
                                    onChange={(e) => updateEditField("image", e.target.value)}
                                />
                                <span style={{ fontSize: 11, marginTop: 6 }}>
                                    or upload a PNG/JPEG:
                                </span>
                                <input
                                    type="file"
                                    accept="image/png,image/jpeg,image/webp"
                                    onChange={handleImageUpload}
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
