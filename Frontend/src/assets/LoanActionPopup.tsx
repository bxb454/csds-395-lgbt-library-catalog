import React, { useEffect, useState } from "react"
import { fetchUsers } from "../api/users"
import type { UserData } from "./Types"

interface LoanActionPopupProps {
  mode: "renew" | "return"
  title: string;
  renewalCount?: number
  onClose: () => void
  onSubmit: () => void
}

const LoanActionPopup: React.FC<LoanActionPopupProps> = ({
  mode,
  title,
  renewalCount = 0,
  onClose,
  onSubmit,
}) => {
  const displayTitle = title.trim()
  const [staffCaseId, setStaffCaseId] = useState("")
  const [staffAccounts, setStaffAccounts] = useState<UserData[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    const loadStaff = async () => {
      try {
        const users = await fetchUsers()
        if (!mounted) return
        setStaffAccounts(users.filter((u) => u.role === "staff" || u.role === "admin"))
      } catch (err) {
        console.error(err)
      }
    }
    void loadStaff()
    return () => {
      mounted = false
    }
  }, [])

  const handleSubmit = () => {
    const trimmed = staffCaseId.trim()
    const staffEntry = staffAccounts.find(
      (u) => u.caseID.toLowerCase() === trimmed.toLowerCase(),
    )
    if (!trimmed || !staffEntry) {
      setError("Enter a valid staff/admin CASE ID.")
      return
    }
    setError(null)
    onSubmit()
  }

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        backgroundColor: "rgba(0, 0, 0, 0.3)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 2000,
      }}
    >
      <div
        style={{
          width: "600px",
          backgroundColor: "white",
          border: "1px solid #777",
          padding: "30px",
          textAlign: "center",
          boxShadow: "0px 4px 8px rgba(0,0,0,0.2)",
        }}
        >
          <h2 style={{ marginTop: 0, marginBottom: "20px" }}>
          {mode === "renew" ? "Renewal for" : "Return for"} '{displayTitle}'
          </h2>

        {mode === "renew" ? (
          <p style={{ fontSize: "18px", marginBottom: "25px" }}>
            This is your <strong>{renewalCount + 1}</strong> renewal on this loan
          </p>
        ) : (
          <p style={{ fontSize: "18px", marginBottom: "25px" }}>
            Please place book on return shelf.
          </p>
        )}

        <div
          style={{
            borderTop: "1px solid #aaa",
            paddingTop: "25px",
            marginTop: "25px",
            fontSize: "18px",
          }}
        >
          Staff member on desk:{" "}
          <input
            type="text"
            value={staffCaseId}
            onChange={(e) => setStaffCaseId(e.target.value)}
            style={{
              display: "inline-block",
              marginLeft: "8px",
              fontSize: "16px",
              padding: "2px 4px",
              width: "150px",
            }}
          />
          {error && (
            <div style={{ color: "#c62828", marginTop: 8, fontSize: 14 }}>{error}</div>
          )}
        </div>

        <div
          style={{
            marginTop: "30px",
            display: "flex",
            justifyContent: "center",
            gap: 24,
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: "10px 18px",
              fontSize: "16px",
              borderRadius: 6,
              border: "2px solid #c62828",
              background: "white",
              color: "#c62828",
              cursor: "pointer",
              minWidth: 120,
            }}
          >
            Cancel
          </button>

          <button
            onClick={handleSubmit}
            style={{
              padding: "10px 18px",
              fontSize: "16px",
              borderRadius: 6,
              border: "2px solid #003071",
              background: "#003071",
              color: "white",
              cursor: "pointer",
              minWidth: 120,
            }}
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  )
}

export default LoanActionPopup
