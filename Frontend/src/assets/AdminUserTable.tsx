import {
  MaterialReactTable,
  type MRT_ColumnDef,
  useMaterialReactTable,
} from "material-react-table"
import { useMemo, useState } from "react"
import type { UserData } from "./Types.ts"

interface AdminUserTableProps {
  users: UserData[]
  onCreate: (payload: { caseID: string; role: string }) => Promise<void> | void
  onUpdate: (caseID: string, updates: Partial<UserData>) => Promise<void> | void
  onDelete: (caseID: string) => Promise<void> | void
}

const AdminUserTable: React.FC<AdminUserTableProps> = ({
  users,
  onCreate,
  onUpdate,
  onDelete,
}) => {
  const columns = useMemo<MRT_ColumnDef<UserData>[]>(
    () => [
      {
        accessorKey: "caseID",
        header: "CASE ID",
        enableEditing: false,
      },
      {
        accessorKey: "role",
        header: "Role",
        editVariant: "select",
        editSelectOptions: ["guest", "patron", "staff", "admin"],
      },
      {
        accessorKey: "isRestricted",
        header: "Restricted",
        Cell: ({ cell }) => (cell.getValue<boolean>() ? "Yes" : "No"),
        editVariant: "select",
        editSelectOptions: ["false", "true"],
      },
    ],
    [],
  )

  const [newCaseID, setNewCaseID] = useState("")
  const [newRole, setNewRole] = useState("patron")
  const [formError, setFormError] = useState<string | null>(null)

  const handleDelete = async (caseID: string) => {
    if (!window.confirm(`Delete user ${caseID}?`)) {
      return
    }
    try {
      await onDelete(caseID)
    } catch (err) {
      console.error(err)
      alert("Failed to delete user.")
    }
  }

  const handleCreate = async () => {
    const trimmedCase = newCaseID.trim()
    if (!trimmedCase) {
      setFormError("Enter a CASE ID (max 8 characters)")
      return
    }
    try {
      await onCreate({ caseID: trimmedCase, role: newRole })
      setNewCaseID("")
      setFormError(null)
    } catch (err) {
      console.error(err)
      setFormError("Failed to create user.")
    }
  }

  const table = useMaterialReactTable({
    columns,
    data: users,
    enableEditing: true,
    enableRowActions: true,
    editDisplayMode: "modal",
    onEditingRowSave: async ({ row, values, table }) => {
      try {
        await onUpdate(row.original.caseID, {
          role: values.role,
          isRestricted:
            typeof values.isRestricted === "string"
              ? values.isRestricted === "true"
              : values.isRestricted,
        })
        table.setEditingRow(null)
      } catch (err) {
        console.error(err)
        alert("Failed to update user. Please try again.")
      }
    },
    renderRowActions: ({ row }) => (
      <button
        style={{ color: "red", cursor: "pointer", border: "none", background: "none" }}
        onClick={() => handleDelete(row.original.caseID)}
      >
        Delete
      </button>
    ),
  })

  return (
    <div style={{ marginTop: "30px" }}>
      <h3>Admin: Manage Users</h3>
      <div style={{ marginBottom: "12px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
        <input
          placeholder="CASE ID"
          value={newCaseID}
          onChange={(e) => setNewCaseID(e.target.value.slice(0, 8))}
        />
        <select value={newRole} onChange={(e) => setNewRole(e.target.value)}>
          <option value="guest">guest</option>
          <option value="patron">patron</option>
          <option value="staff">staff</option>
          <option value="admin">admin</option>
        </select>
        <button onClick={handleCreate}>Add User</button>
        {formError && <span style={{ color: "#c62828" }}>{formError}</span>}
      </div>
      <MaterialReactTable table={table} />
    </div>
  )
}

export default AdminUserTable
