import {
    MaterialReactTable,
    type MRT_ColumnDef,
    useMaterialReactTable,
} from "material-react-table"

import { useMemo } from "react";
import type { BookData, LoanRecord } from "./Types"

interface Props {
    loans: LoanRecord[]
    books: BookData[]
    onRenew: (loan: LoanRecord) => void
    onReturn: (loan: LoanRecord) => void
}

const MyLoansTable: React.FC<Props> = ({ loans, books, onRenew, onReturn }) => {
    const getBook = (bookId: number) =>
        books.find((b) => b.id === bookId) ?? ({} as BookData);

    const formatDate = (value: string) => {
        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) {
            return value;
        }
        return parsed.toLocaleDateString();
    };

    const columns = useMemo<MRT_ColumnDef<LoanRecord>[]>(() => [
        {
            accessorKey: "bookId",
            header: "",
            size: 70,
            Cell: ({ cell }) => {
                const book = getBook(cell.getValue<number>())
                return book?.image ? (
                    <img
                        src={book.image}
                        style={{ width: 50, height: 50, borderRadius: 6 }}
                    />
                ) : (
                    <div
                        style={{
                            width: 50,
                            height: 50,
                            borderRadius: 6,
                            backgroundColor: "#f1f1f1",
                        }}
                    />
                )
            },
        },
        {
            accessorKey: "title",
            header: "",
            size: 150,
            Cell: ({ row }) => {
                const book = getBook(row.original.bookId)
                return (
                    <div style={{ display: "flex", flexDirection: "column" }}>
                        <span style={{ fontWeight: 600, fontSize: 14 }}>
                            {book.title}
                        </span>
                        <span style={{ fontSize: 11 }}>{book.author}</span>
                    </div>
                )
            },
        },
        {
            accessorKey: "loanDate",
            header: "Loan date",
            size: 90,
            Cell: ({ cell }) => formatDate(cell.getValue<string>()),
        },
        {
            accessorKey: "dueDate",
            header: "Due date",
            size: 90,
            Cell: ({ cell }) => formatDate(cell.getValue<string>()),
        },
        {
            id: "actions",
            header: "",
            size: 80,
            Cell: ({ row }) => {
                const loan = row.original

                return (
                    <div style={{ display: "flex", flexDirection: "column" }}>
                        <span
                            style={{
                                color: "blue",
                                cursor: "pointer",
                                textDecoration: "underline",
                                marginBottom: 4,
                            }}
                            onClick={() => onRenew(loan)}
                        >
                            Renew
                        </span>

                        <span
                            style={{
                                color: "blue",
                                cursor: "pointer",
                                textDecoration: "underline",
                            }}
                            onClick={() => onReturn(loan)}
                        >
                            Return
                        </span>
                    </div>
                )
            },
        },
    ], [books])

    const table = useMaterialReactTable({
        columns,
        data: loans,

        enableSorting: false,
        enableTopToolbar: false,
        enableBottomToolbar: false,
        enableColumnActions: false,
        enableFilters: false,
        enablePagination: false,
        enableGlobalFilter: false,

        muiTableBodyCellProps: {
            sx: {
                borderRight: "1px solid #999",
                borderBottom: "1px solid #999",
                py: 0.5,
                px: 1,
                "&:last-of-type": { borderRight: "none" },
            },
        },
        muiTableHeadCellProps: {
            sx: {
                borderRight: "1px solid #999",
                borderBottom: "1px solid #999",
                py: 0.5,
                px: 1,
                "&:last-of-type": { borderRight: "none" },
            },
        },

        muiTablePaperProps: {
            elevation: 0,
            sx: { borderRadius: 0, boxShadow: "none" },
        },
    })

    return (
        <div style={{ width: "100%", display: "flex", justifyContent: "center" }}>
            <div style={{ width: "700px", border: "1px solid #999" }}>
                <MaterialReactTable table={table} />
            </div>
        </div>
    )
}

export default MyLoansTable
