import {MaterialReactTable, type MRT_ColumnDef, useMaterialReactTable,} from "material-react-table";
import {useMemo, useState} from "react";
import type {BookData} from "./Types.ts";
import {fakeBookData1} from "./fake_bookdata"

const BookDataTable = () => {

    const columns = useMemo<MRT_ColumnDef<BookData>[]>(
        () => [
            {
                accessorKey: 'image',
                header: 'image',
                size: 150,
                Cell: ({ cell }) => (
                    <img
                        src={cell.getValue()}
                        style={{ width: 50, height: 50, borderRadius: '8px' }}
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
            columns,
            // null,
            data,
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