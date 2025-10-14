import {MaterialReactTable, type MRT_ColumnDef, type MRT_Row, useMaterialReactTable,} from "material-react-table";
import {useMemo, useState} from "react";
import {Button, IconButton, Box,} from "@mui/material";
import {Delete, Edit} from '@mui/icons-material';
import type {BookData, UserData} from "./Types.ts";
import {fakeBookData1} from "./fake_data.tsx"

interface props {
    editable?: boolean;
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
                    header: 'available copies',
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
                alert('Copies must be a number');
                return;
            }
            if ( isNaN(Number(values.available)) ) {
                alert('Available copies must be a number');
                return;
            }
            if (values.available > values.copies) {
                alert('Cannot have more available copies than existing copies!');
                return;
            }

            const newData = data.map(book =>
                book.id === row.original.id ? {...book, ...values} : book
            );

            setData(newData);

            table.setEditingRow(null);//exit out of editing
        }

        const handleAddRow =({}: { row: any; values: BookData }) => {
            //todo: move code here
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
           //onCreatingRowSave: handleAddRow,
            onCreatingRowSave: ({table, values}) => {
                // Generate a new ID (simple increment for demo - use UUID in production)
                //const isValid = !isNaN(values.turns ) && values.turns  >= 1 && Number.isInteger(values.turns );

                const newBook: BookData = {
                    ...values,
                    //defaults if not there? todo conect to back
                    id: values.id || data.length ? data[data.length - 1].id + 1 : 1,
                    title: values.title || "Placeholder Title",
                    copies: values.copies || 1,
                    available: values.available || 1,
                    //...values

                };//TODO data validation

                const newData = [...data, newBook];
                setData(newData);
                console.log("new book added")
                table.setCreatingRow(null);

            },
            onCreatingRowCancel: () => {
                //clear any validation errors
            },

        });

        return (
            <>
                <MaterialReactTable table={table}/>
            </>
        )
    }
;

export default BookDataTable;