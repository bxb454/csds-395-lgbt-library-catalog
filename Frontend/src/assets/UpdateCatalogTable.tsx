import {
  MaterialReactTable,
  type MRT_ColumnDef,
  useMaterialReactTable,
} from "material-react-table"
import { Box, Button } from "@mui/material"
import { useEffect, useMemo, useState } from "react"
import type { BookData } from "./Types"
import { fakeBookData1 } from "./fake_data"

type UpdateCatalogTableProps = {
  books?: BookData[]
  onBooksChange?: (updated: BookData[]) => void
}

const parseTags = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value
      .map((tag: string) => tag.trim())
      .filter((tag: string) => tag.length > 0)
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0)
  }

  return []
}

const numberOrDefault = (value: unknown, fallback: number) => {
  const parsed = Number(value)
  return Number.isNaN(parsed) ? fallback : parsed
}

const UpdateCatalogTable: React.FC<UpdateCatalogTableProps> = ({
  books = fakeBookData1,
  onBooksChange,
}) => {
  const [data, setData] = useState<BookData[]>(books)

  useEffect(() => {
    setData(books)
  }, [books])

  const updateData = (next: BookData[]) => {
    setData(next)
    onBooksChange?.(next)
  }

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
      accessorKey: "isbn",
      header: "ISBN",
    },
    {
      accessorFn: (row) => row.tags?.join(", ") ?? "",
      id: "tags",
      header: "Tags",
      muiTableBodyCellEditTextFieldProps: {
        placeholder: "comma separated",
      },
    },
  ], [])

  const table = useMaterialReactTable({
    columns,
    data,
    enableEditing: false,
    renderTopToolbarCustomActions: ({ table }) => (
      <Button
        variant="contained"
        color="primary"
        onClick={() => table.setCreatingRow(true)}
      >
        Add Book
      </Button>
    ),
    editDisplayMode: "modal",
    createDisplayMode: "modal",
    onCreatingRowSave: async ({ values, table }) => {
      const newBook: BookData = {
        id: data.length ? Math.max(...data.map((book) => book.id)) + 1 : 1,
        title: values.title || "Untitled",
        copies: numberOrDefault(values.copies, 0),
        available: numberOrDefault(values.available, 0),
        author: values.author,
        genre: values.genre,
        publisher: values.publisher,
        isbn: values.isbn,
        tags: parseTags(values.tags),
      }

      if (newBook.available > newBook.copies) {
        newBook.available = newBook.copies
      }

      updateData([...data, newBook])
      table.setCreatingRow(null)
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
      </Box>
    </Box>
  )
}

export default UpdateCatalogTable
