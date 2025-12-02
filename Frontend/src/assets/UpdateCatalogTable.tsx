import {
  MaterialReactTable,
  type MRT_ColumnDef,
  useMaterialReactTable,
} from "material-react-table"
import { Box, Button } from "@mui/material"
import { useEffect, useMemo, useState } from "react"
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
  //forcing YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    throw new Error("Publication date must be in YYYY-MM-DD format.")
  }
  return dateStr
}

const parseAuthorName = (raw: string): { fname?: string; lname: string } => {
  const parts = raw.split(/\s+/).filter(Boolean)
  if (parts.length <= 1) {
    return { lname: parts[0] ?? raw }
  }
  const lname = parts.pop() ?? ""
  const fname = parts.join(" ")
  return { fname: fname || undefined, lname }
}

const UpdateCatalogTable: React.FC<UpdateCatalogTableProps> = ({
  books,
  onRefreshBooks,
}) => {
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [authors, setAuthors] = useState<Author[]>([])

  useEffect(() => {
    fetchAuthors()
      .then((list) => setAuthors(list))
      .catch((err) => {
        console.error(err)
      })
  }, [])

  const columns = useMemo<MRT_ColumnDef<BookData>[]>(() => [
    {
      accessorKey: "title",
      header: "Title",
      size: 250,
    },
    {
      accessorKey: "author",
      header: "Author",
      muiTableBodyCellEditTextFieldProps: {
        placeholder: "Author name",
      },
    },
    {
      accessorKey: "genre",
      header: "Genre",
    },
    {
      accessorKey: "copies",
      header: "Copies",
      muiTableBodyCellEditTextFieldProps: {
        type: "number",
        inputProps: { min: 0 },
      },
    },
    {
      accessorKey: "loanMetrics",
      header: "Checked Out",
      muiTableBodyCellEditTextFieldProps: {
        type: "number",
        inputProps: { min: 0 },
      },
    },
    {
      accessorKey: "publisher",
      header: "Publisher",
    },
    {
      accessorKey: "edition",
      header: "Edition",
    },
    {
      accessorKey: "pubdate",
      header: "Publication Date (YYYY-MM-DD)",
      muiTableBodyCellEditTextFieldProps: {
        type: "text",
        helperText: "Format: YYYY-MM-DD (e.g., 1993-01-01)",
        inputProps: {
          placeholder: "YYYY-MM-DD (e.g., 1993-01-01)",
          inputMode: "numeric",
          pattern: "\\d{4}-\\d{2}-\\d{2}",
        },
        InputLabelProps: { shrink: true },
      },
    },
    {
      accessorKey: "isbn",
      header: "ISBN",
    },
    {
      accessorFn: (row) =>
        Array.isArray(row.tags)
          ? row.tags.join(", ")
          : typeof row.tags === "string"
            ? row.tags
            : "",
      id: "tags",
      header: "Tags",
      muiTableBodyCellEditTextFieldProps: {
        placeholder: "comma separated",
      },
    },
  ], [])

  const table = useMaterialReactTable({
    columns,
    data: books,
    enableEditing: false,
    renderTopToolbarCustomActions: ({ table }) => (
      <Button
        variant="contained"
        color="primary"
        onClick={() => table.setCreatingRow(true)}
        disabled={isSaving}
      >
        Add Book
      </Button>
    ),
    editDisplayMode: "modal",
    createDisplayMode: "modal",
    onCreatingRowSave: async ({ values, table }) => {
      setError(null)
      const copies = numberOrDefault(values.copies, 0)
      if (copies <= 0) {
        setError("Copies must be greater than 0.")
        return
      }
      let normalizedPubdate: string | undefined
      try {
        normalizedPubdate = normalizeDate(values.pubdate)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Invalid publication date.")
        return
      }
      const payload: BookWritePayload = {
        title: values.title || "Untitled",
        copies,
        isbn: values.isbn ? String(values.isbn) : undefined,
        publisher: values.publisher,
        edition: values.edition,
        pubdate: normalizedPubdate,
      }

      const authorNames = values.author
        ? String(values.author)
            .split(",")
            .map((name) => name.trim())
            .filter((name) => name.length > 0)
        : []
      const tagInput = values.tags
        ? String(values.tags)
            .split(",")
            .map((tag) => tag.trim())
            .filter((tag) => tag.length > 0)
        : []
      if (values.genre) {
        tagInput.push(String(values.genre).trim())
      }

      try {
        setIsSaving(true)
        let latestAuthors = authors

        // Ensure authors exist before creating the book
        const matchedAuthors: Author[] = []
        const unmatchedAuthors: string[] = []

        for (const name of authorNames) {
          const findMatch = (list: Author[]) =>
            list.find((author) => {
              const fullName = [author.fname, author.lname]
                .filter(Boolean)
                .join(" ")
                .trim()
                .toLowerCase()
              return fullName === name.toLowerCase()
            })

          let match = findMatch(latestAuthors)
          if (!match) {
            try {
              const parsed = parseAuthorName(name)
              await createAuthor(parsed.lname, parsed.fname)
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
            unmatchedAuthors.push(name)
          }
        }

        if (unmatchedAuthors.length > 0) {
          setError(`Unable to match authors: ${unmatchedAuthors.join(", ")}`)
          setIsSaving(false)
          return
        }

        const newId = await createBook(payload)
        table.setCreatingRow(null)

        if (newId) {
          await Promise.all([
            ...tagInput.map((tag) =>
              addBookTag(newId, tag).catch((err) => {
                console.error("Failed to add tag", err)
                throw new Error(`Failed to add tag "${tag}"`)
              }),
            ),
            ...matchedAuthors.map((author) =>
              addBookAuthor(newId, author.authID).catch((err) => {
                console.error("Failed to link author", err)
                throw new Error(
                  `Failed to link author ${[author.fname, author.lname]
                    .filter(Boolean)
                    .join(" ")
                    .trim()}`,
                )
              }),
            ),
          ])
        }
        await onRefreshBooks()
        setError(null)
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
    },
    muiTableBodyRowProps: { sx: { height: 72 } },
    muiTableBodyCellProps: {
      sx: {
        borderRight: "1px solid #999",
        borderBottom: "1px solid #999",
        "&:last-of-type": { borderRight: "none" },
      },
    },
    muiTableHeadCellProps: {
      sx: {
        borderRight: "1px solid #999",
        borderBottom: "1px solid #999",
        "&:last-of-type": { borderRight: "none" },
      },
    },
    muiTablePaperProps: {
      elevation: 0,
      sx: { borderRadius: 0, boxShadow: "none" },
    },
  })

  return (
    <Box sx={{ width: "100%", display: "flex", justifyContent: "center" }}>
      <Box sx={{ width: "900px", border: "1px solid #999" }}>
        <MaterialReactTable table={table} />
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
