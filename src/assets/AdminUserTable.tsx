import {MaterialReactTable, type MRT_ColumnDef, useMaterialReactTable,} from "material-react-table";
import {useMemo, useState} from "react";
import type {BookData} from "./Types.ts";

const AdminUserTable = () => {

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
                    accessorKey: 'name',
                    header: 'User Name',
                    size: 150,
                },
                {
                    accessorKey: 'role',
                    header: 'role', //user, employee, admin
                    size: 50,
                },
                {
                    accessorKey: 'isRestricted',
                    header: 'overdues',
                    size: 50,
                }

            ],
            [],
        );

       // const [data, setData] = useState<BookData[]>(fakeBookData1);

        const table = useMaterialReactTable({
            columns,
            enableEditing: true,
            editDisplayMode:"modal",

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

export default AdminUserTable;