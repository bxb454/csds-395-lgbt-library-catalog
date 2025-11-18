import {MaterialReactTable, type MRT_ColumnDef, useMaterialReactTable,
} from "material-react-table"
import { useMemo, useState } from "react"
import { Box, Button, IconButton } from "@mui/material"
import { Delete, Edit } from "@mui/icons-material"
import type { BookData } from "./Types"
import { fakeBookData1 } from "./fake_data"
import { filterBooks, type SearchOption } from "./catalogSearch"
import BookDetailPopup from "./BookDetailPopup"

interface BookTableProps {
    editable?: boolean
    searchBy?: SearchOption
    searchText?: string
    isLoggedIn: boolean
}

const BookDataTable = ({
    editable = false,
    searchBy = "general",
    searchText = "",
    isLoggedIn,
}: BookTableProps) => {
    const [data, setData] = useState<BookData[]>(fakeBookData1)
    const [selectedBook, setSelectedBook] = useState<BookData | null>(null)

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
                        <img
                            src={cell.getValue<string>()}
                            style={{
                                width: 72,
                                height: 72,
                                borderRadius: "6px",
                                objectFit: "cover",
                            }}
                        />
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
                    const book = row.original;
                    const copiesLabel = book.copies === 1 ? "copy" : "copies";

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
        () => filterBooks(data, searchBy, searchText),
        [data, searchBy, searchText]
    );

    const handleDeleteRow = (row: any) => {
        if (window.confirm("Are you sure you want to delete this row?")) {
            const newData = data.filter((book) => book.id !== row.original.id);
            setData(newData);
        }
    }

    const handleSaveRow = ({ row, values }: { row: any; values: BookData }) => {
        if (isNaN(Number(values.copies))) {
            alert("Copies must be a number");
            return;
        }
        if (isNaN(Number(values.available))) {
            alert("Available must be a number");
            return;
        }
        if (values.available > values.copies) {
            alert("Cannot have more available than copies!");
            return;
        }

        const newData = data.map((book) =>
            book.id === row.original.id ? { ...book, ...values } : book
        )

        setData(newData);
        table.setEditingRow(null);
    }

    const table = useMaterialReactTable({
        columns,
        data: filteredData,
        enableEditing: editable,

        enableTableHead: false,
        enableColumnFilters: false,
        enableGlobalFilter: false,
        enableFilterMatchHighlighting: false,
        enableColumnActions: false,
        enableDensityToggle: false,
        enableHiding: false,
        enableFullScreenToggle: false,
        enableSorting: false,
        enableTopToolbar: !!editable,

        renderTopToolbarCustomActions: editable
            ? ({ table }) => (
                <Button
                    onClick={() => table.setCreatingRow(true)}
                    variant="contained"
                    color="primary"
                >
                    Add Book
                </Button>
            )
            : undefined,

        renderRowActions: ({ row, table }) => (
            <Box sx={{ display: "flex", gap: "0.5rem" }}>
                <IconButton size="small" color="error" onClick={() => handleDeleteRow(row)}>
                    <Delete fontSize="small" />
                </IconButton>
                {editable && (
                    <IconButton size="small" onClick={() => table.setEditingRow(row)}>
                        <Edit fontSize="small" />
                    </IconButton>
                )}
            </Box>
        ),

        editDisplayMode: "modal",
        onEditingRowSave: handleSaveRow,
        createDisplayMode: "modal",
        positionCreatingRow: "top",
        onCreatingRowSave: ({ table, values }) => {
            const newBook: BookData = {
                ...values,
                id: values.id || (data.length ? data[data.length - 1].id + 1 : 1),
                title: values.title || "Placeholder Title",
                copies: values.copies || 1,
                available: values.available || 1,
            };
            setData([...data, newBook]);
            table.setCreatingRow(null);
        },

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
    });

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
                </Box>
            </Box>

            {selectedBook && (
                <BookDetailPopup
                    book={selectedBook}
                    isLoggedIn={isLoggedIn}
                    onClose={() => setSelectedBook(null)}
                />
            )}
        </>
    )
}

export default BookDataTable
