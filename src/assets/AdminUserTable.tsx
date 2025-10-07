import {MaterialReactTable, type MRT_ColumnDef, useMaterialReactTable,} from "material-react-table";
import {useMemo, useState} from "react";
import type {UserData} from "./Types.ts";
import {fakeUserData1} from "./fake_data.tsx";

const AdminUserTable = () => {

        const columns = useMemo<MRT_ColumnDef<UserData>[]>(
            () => [
                {
                    accessorKey: 'caseID',
                    header: 'CASE ID',
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

       const [data, setData] = useState<UserData[]>(fakeUserData1);

        const table = useMaterialReactTable({
            columns,
            enableEditing: true,



            editDisplayMode:"modal",
            data,
        });

        return (
            <>
                <MaterialReactTable table={table}/>
            </>
        )
    }
;

export default AdminUserTable;