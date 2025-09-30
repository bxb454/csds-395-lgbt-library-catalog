import {MaterialReactTable, type MRT_ColumnDef, type MRT_Row, useMaterialReactTable,} from "material-react-table";
import {useMemo, useState} from "react";
import {Button, IconButton, Box, } from "@mui/material";
import { Delete, Edit } from '@mui/icons-material';
import type {BookData} from "./Types.ts";
import {fakeBookData1} from "./fake_bookdata"

interface props {
    editable?: boolean;
}

function handleUpdateRow() {

}

function handleAddRow() {

}

function handleDeleteRow(row: MRT_Row<BookData>) {

}

const BookDataTable = (
        {editable = false}: props
    ) => {

        const columns = useMemo<MRT_ColumnDef<BookData>[]>(
            () => [
                {
                    accessorKey: 'image',
                    header: 'image',
                    size: 150,
                    Cell: ({cell}) => (
                        <img
                            src={cell.getValue()}
                            style={{width: 50, height: 50, borderRadius: '8px'}}
                        />)
                },
                {
                    accessorKey: 'title',
                    header: 'title',
                    size: 150,
                },
                {
                    accessorKey: 'author',
                    header: 'author',
                    size: 150,
                },
                {
                    accessorKey: 'genre',
                    header: 'genre',
                    size: 200,
                },
                {
                    accessorKey: 'copies',
                    header: 'copies',
                    size: 50,
                },
                {
                    accessorKey: 'available',
                    header: 'available',
                    size: 50,
                }

            ],
            [],
        );

        const [data, setData] = useState<BookData[]>(fakeBookData1);

        const table = useMaterialReactTable({
            columns, data,
            // null,
            enableEditing: editable,
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
                <Box sx={{ display: 'flex', gap: '1rem' }}>
                    <IconButton color="error" onClick={() => handleDeleteRow(row)}>
                        <Delete />
                    </IconButton>
                    {editable && (
                        <IconButton onClick={() => table.setEditingRow(row)}>
                            <Edit />
                        </IconButton>
                    )}
                </Box>
            ),

            editDisplayMode: "modal",
            onEditingRowSave: handleUpdateRow,

            createDisplayMode: "modal",
            positionCreatingRow: "top",
            onCreatingRowSave: handleAddRow,


//            muiRowDragHandleProps: ({table}) => ({

            // 2. Then add row styling that won't interfere with dragging
            // muiTableBodyRowProps: ({row}) => ({}),
        });

        return (
            <>
                <MaterialReactTable table={table}/>
            </>
        )
    }
;

export default BookDataTable;