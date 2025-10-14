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
                    editVariant: 'select',
                    editSelectOptions: ['user', 'employee', 'admin'],
                    size: 50,
                },
                {
                    accessorKey: 'isRestricted',
                    header: 'overdues',
                    editVariant: 'select',
                    editSelectOptions: ["false", "true"],//TODO turn into checkbox
                    size: 50,
                }

            ],
            [],
        );

        const [data, setData] = useState<UserData[]>(fakeUserData1);

        const handleSaveRow = ({row, values}: { row: any; values: UserData }) => {
            console.log('in handleSaveRow', row, values);
//TODO impleemnt back end wiritng and datatpye validation
            //if role is not in roles, error
            const newData = data.map(character =>
                character.id === row.original.id ? {...character, ...values} : character
            );

            setData(newData);

            table.setEditingRow(null);//exit out of editing
        }

        const table = useMaterialReactTable({
            columns,
            enableEditing: true,

            onEditingRowSave: handleSaveRow,

            editDisplayMode: "modal",
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