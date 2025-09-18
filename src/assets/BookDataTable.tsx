import {MaterialReactTable, type MRT_ColumnDef, useMaterialReactTable,} from "material-react-table";
import {useMemo, useState} from "react";
import type {BookData} from "./Types.ts";
import {fakeBookData1} from "./fake_bookdata"

const BookDataTable = () => {

    const columns = useMemo<MRT_ColumnDef<BookData>[]>(
        () => [
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