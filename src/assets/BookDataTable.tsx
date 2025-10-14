import {MaterialReactTable, type MRT_ColumnDef, type MRT_Row, useMaterialReactTable,} from "material-react-table";
import {useMemo, useState} from "react";
import {Button, IconButton, Box,} from "@mui/material";
import {Delete, Edit} from '@mui/icons-material';
import type {BookData, UserData} from "./Types.ts";
import {fakeBookData1} from "./fake_data.tsx"

interface props {
    editable?: boolean;
}

function handleAddRow() {

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

        const handleDeleteRow = (row: any) => {
            if (window.confirm('Are you sure you want to delete this row?')) {
                const newData = data.filter(character => character.id !== row.original.id);
                setData(newData);
                //onChange?.(newData); // Notify parent of changes
                //deletesound.play();
            }
        };
        const handleSaveRow = ({row, values}: { row: any; values: BookData }) => {
            console.log('in handleSaveRow', row, values);
//TODO impleemnt back end wiritng and datatpye validation

            if ( isNaN(Number(values.copies)) ) {
                alert('Initmod must be a number');
                return;
            }

            //if role is not in roles, error
            const newData = data.map(character =>
                character.id === row.original.id ? {...character, ...values} : character
            );

            setData(newData);

            table.setEditingRow(null);//exit out of editing
        }

        const table = useMaterialReactTable({
            columns, data,
            // null,
            enableEditing: editable,
            renderTopToolbarCustomActions: editable
                ? ({table}) => (
                    <Button
                        onClick={() => table.setCreatingRow(true)}
                        variant="contained"
                        color="primary"
                    >
                        Add Book
                    </Button>
                )
                : undefined,
            renderRowActions: ({row, table}) => (
                <Box sx={{display: 'flex', gap: '1rem'}}>
                    <IconButton color="error" onClick={() => handleDeleteRow(row)}>
                        <Delete/>
                    </IconButton>
                    {editable && (
                        <IconButton onClick={() => table.setEditingRow(row)}>
                            <Edit/>
                        </IconButton>
                    )}
                </Box>
            ),

            editDisplayMode: "modal",
            onEditingRowSave: handleSaveRow,

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