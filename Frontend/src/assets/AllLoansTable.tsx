import {
    MaterialReactTable,
    type MRT_ColumnDef,
    useMaterialReactTable,
} from "material-react-table"

import { useMemo } from "react"
import type { LoanRecord, UserData, BookData } from "./Types"

interface Props {
    loans: LoanRecord[]
    users: UserData[]
    books: BookData[]

    onRenew: (loan: LoanRecord) => void
    onReturn: (loan: LoanRecord) => void

    //from admin-only check
    onRestrictToggle: (userId: number, newValue: boolean) => void
}

const AllLoansTable: React.FC<Props> = ({
    loans,
    users,
    books,
    onRenew,
    onReturn,
    onRestrictToggle,
}) => {
    /** Lookup helpers */
    const getUser = (userId: number) =>
        users.find((u) => u.id === userId) ?? ({} as UserData)

    const getBook = (bookId: number) =>
        books.find((b) => b.id === bookId) ?? ({} as BookData)

    /** DEFINE COLUMNS */
    const columns = useMemo<MRT_ColumnDef<LoanRecord>[]>(() => [
        // PATRON NAME
        {
            accessorKey: "userId",
            header: "Patron",
            size: 110,
            Cell: ({ cell }) => {
                const user = getUser(cell.getValue<number>());
                return <span>{user.caseID}</span>;
            },
        },

        // BOOK DETAILS COLUMN
        {
            id: "book",
            header: "Book",
            size: 220,
            Cell: ({ row }) => {
                const book = getBook(row.original.bookId);
                return (
                    <div style={{ display: "flex", flexDirection: "column" }}>
                        <span style={{ fontWeight: 600, fontSize: 15 }}>
                            {book.title}
                        </span>
                        <span style={{ fontSize: 12 }}>
                            {book.available}/{book.copies} copies available
                        </span>
                    </div>
                );
            },
        },

        // Loan detail column
        {
            id: "loanDetails",
            header: "Loan details",
            size: 170,
            Cell: ({ row }) => {
                const loan = row.original;
                return (
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        <span>Loan date: {loan.loanDate}</span>
                        <span>Due date: {loan.dueDate}</span>
                        <span>numRenewals: {loan.renewalCount ?? 0}</span>
                    </div>
                );
            },
        },

        //actions column
        {
            id: "actions",
            header: "Actions",
            size: 150,
            Cell: ({ row }) => {
                const loan = row.original;
                const user = getUser(loan.userId);

                return (
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 6,
                        }}
                    >
                        {/* Renewal */}
                        <span
                            style={{
                                color: "blue",
                                cursor: "pointer",
                                textDecoration: "underline",
                            }}
                            onClick={() => onRenew(loan)}
                        >
                            Renew
                        </span>

                        {/* Return */}
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

                        {/* RESTRICT USER */}
                        <label style={{ fontSize: 13, marginTop: 4 }}>
                            <input
                                type="checkbox"
                                checked={user.isRestricted}
                                onChange={(e) =>
                                    onRestrictToggle(user.id, e.target.checked)
                                }
                            />{" "}
                            Restrict User
                        </label>
                    </div>
                );
            },
        },
    ], [books, users]);

    /** INIT TABLE */
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
                py: 0.8,
                px: 1,
                "&:last-of-type": { borderRight: "none" },
            },
        },
        muiTableHeadCellProps: {
            sx: {
                borderRight: "1px solid #999",
                borderBottom: "1px solid #999",
                py: 0.8,
                px: 1,
                "&:last-of-type": { borderRight: "none" },
                fontWeight: 700,
                fontSize: "16px",
            },
        },

        muiTablePaperProps: {
            elevation: 0,
            sx: { borderRadius: 0, boxShadow: "none" },
        },
    })

    return (
        <div style={{ width: "100%", display: "flex", justifyContent: "center" }}>
            <div style={{ width: "950px", border: "1px solid #999" }}>
                <MaterialReactTable table={table} />
            </div>
        </div>
    )
}

export default AllLoansTable
