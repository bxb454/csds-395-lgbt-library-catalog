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
import { fetchAuthors, type Author } from "../api/authors"

type UpdateCatalogTableProps = {
  books: BookData[]
  onRefreshBooks: () => Promise<void> | void
}

const numberOrDefault = (value: unknown, fallback: number) => {
  const parsed = Number(value)
  return Number.isNaN(parsed) ? fallback : parsed
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
      accessorKey: "available",
      header: "Available",
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
      header: "Publication Date",
      muiTableBodyCellEditTextFieldProps: {
        type: "date",
      },
    },
    {
      accessorKey: "isbn",
      header: "ISBN",
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
      const payload: BookWritePayload = {
        title: values.title || "Untitled",
        copies,
        isbn: values.isbn ? String(values.isbn) : undefined,
        publisher: values.publisher,
        edition: values.edition,
        pubdate: values.pubdate,
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
        const newId = await createBook(payload)
        table.setCreatingRow(null)
        let unmatchedAuthors: string[] = []
        if (newId) {
          await Promise.all([
            ...tagInput.map((tag) => addBookTag(newId, tag)),
            ...authorNames.map(async (name) => {
              const match = authors.find((author) => {
                const fullName = [author.fname, author.lname]
                  .filter(Boolean)
                  .join(" ")
                  .trim()
                  .toLowerCase()
                return fullName === name.toLowerCase()
              })
              if (match) {
                await addBookAuthor(newId, match.authID)
              } else {
                unmatchedAuthors.push(name)
              }
            }),
          ])
        }
        await onRefreshBooks()
        if (unmatchedAuthors.length > 0) {
          setError(`Unable to match authors: ${unmatchedAuthors.join(", ")}`)
        } else {
          setError(null)
        }
      } catch (err) {
        console.error(err)
        setError("Failed to add book. Please try again.")
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
