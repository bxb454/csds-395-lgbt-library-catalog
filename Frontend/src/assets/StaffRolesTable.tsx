import { useMemo, useState, type FC, type FormEvent } from "react"
import { sampleUsers } from "./sampleUsers"

type RoleOption = "patron" | "staff" | "admin"

interface RoleAssignment {
  id: number
  caseID: string
  role: RoleOption
}

const ROLE_OPTIONS: RoleOption[] = ["patron", "staff", "admin"]

const mapRole = (role?: string): RoleOption | null => {
  if (role === "staff") return "staff"
  if (role === "admin") return "admin"
  return null
}

const DEFAULT_ASSIGNMENTS: RoleAssignment[] = sampleUsers
  .map((user, idx) => {
    const parsed = mapRole(user.role)
    if (!parsed) {
      return null
    }
    return {
      id: user.id ?? idx + 1,
      caseID: user.caseID,
      role: parsed,
    }
  })
  .filter((entry): entry is RoleAssignment => entry !== null)

const StaffRolesTable: FC = () => {
  const [assignments, setAssignments] = useState<RoleAssignment[]>(
    DEFAULT_ASSIGNMENTS,
  )
  const [caseIdInput, setCaseIdInput] = useState("")
  const [roleInput, setRoleInput] = useState<RoleOption>("patron")
  const [message, setMessage] = useState<string | null>(null)

  const sortedAssignments = useMemo(() => {
    return [...assignments]
      .filter((assignment) => assignment.role !== "patron")
      .sort((a, b) =>
        a.caseID.localeCompare(b.caseID, undefined, { sensitivity: "base" }),
      )
  }, [assignments])

  const handleAssignRole = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedCase = caseIdInput.trim()

    if (!trimmedCase) {
      setMessage("Enter a CASE ID before assigning a role.")
      return
    }

    let feedback = ""
    setAssignments((prevAssignments) => {
      const existingIndex = prevAssignments.findIndex(
        (entry) => entry.caseID.toLowerCase() === trimmedCase.toLowerCase(),
      )

      if (existingIndex >= 0) {
        if (roleInput === "patron") {
          feedback = `${trimmedCase} now uses default patron access.`
          return prevAssignments.filter((_, idx) => idx !== existingIndex)
        }

        const updated = [...prevAssignments]
        updated[existingIndex] = {
          ...updated[existingIndex],
          caseID: trimmedCase,
          role: roleInput,
        }
        feedback = `Updated ${trimmedCase} to ${roleInput}.`
        return updated
      }

      if (roleInput === "patron") {
        feedback = `${trimmedCase} already has patron access by default.`
        return prevAssignments
      }

      const nextId =
        prevAssignments.reduce(
          (max, entry) => (entry.id > max ? entry.id : max),
          0,
        ) + 1

      const created: RoleAssignment = {
        id: nextId,
        caseID: trimmedCase,
        role: roleInput,
      }
      feedback = `Assigned ${trimmedCase} the ${roleInput} role.`
      return [...prevAssignments, created]
    })

    setMessage(feedback)
    setCaseIdInput("")
    setRoleInput("patron")
  }

  const updateRole = (id: number, role: RoleOption) => {
    let feedback = ""
    setAssignments((prev) => {
      if (role === "patron") {
        return prev.filter((entry) => {
          if (entry.id === id) {
            feedback = `${entry.caseID} now uses default patron access.`
            return false
          }
          return true
        })
      }

      return prev.map((entry) => {
        if (entry.id === id) {
          feedback = `Updated ${entry.caseID} to ${role}.`
          return { ...entry, role }
        }
        return entry
      })
    })

    if (feedback) {
      setMessage(feedback)
    }
  }

  const resetRole = (id: number) => {
    updateRole(id, "patron")
  }

  return (
    <div className="staff-roles-container">
      <section className="staff-roles-card">

        <form className="staff-roles-form" onSubmit={handleAssignRole}>
          <input
            aria-label="Case ID"
            className="staff-roles-input"
            placeholder="Enter CASE ID"
            value={caseIdInput}
            onChange={(e) => setCaseIdInput(e.target.value)}
          />

          <select
            aria-label="Role"
            className="staff-roles-select"
            value={roleInput}
            onChange={(e) => setRoleInput(e.target.value as RoleOption)}
          >
            {ROLE_OPTIONS.map((role) => (
              <option key={role} value={role}>
                {role.charAt(0).toUpperCase() + role.slice(1)}
              </option>
            ))}
          </select>

          <button className="staff-roles-submit" type="submit">
            Assign Role
          </button>
        </form>

        {message && <p className="staff-roles-message">{message}</p>}

        <div className="staff-roles-table-wrapper">
          <table className="staff-roles-table">
            <thead>
              <tr>
                <th>Case ID</th>
                <th>Role</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedAssignments.length > 0 ? (
                sortedAssignments.map((entry) => (
                  <tr key={entry.id}>
                    <td>{entry.caseID}</td>
                    <td>
                      <select
                        value={entry.role}
                        onChange={(e) =>
                          updateRole(entry.id, e.target.value as RoleOption)
                        }
                      >
                        {ROLE_OPTIONS.map((role) => (
                          <option key={role} value={role}>
                            {role.charAt(0).toUpperCase() + role.slice(1)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <button
                        className="staff-roles-reset"
                        type="button"
                        onClick={() => resetRole(entry.id)}
                      >
                        Reset to Patron
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} style={{ textAlign: "center" }}>
                    No assignments yet. Add a CASE ID to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

export default StaffRolesTable
