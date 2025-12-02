import React from "react"

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
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        backgroundColor: "black",
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
          {mode === "renew" ? "Renewal for" : "Return for"} {title}
        </h2>

        {mode === "renew" ? (
          <p style={{ fontSize: "18px", marginBottom: "25px" }}>
            This is your <strong>{renewalCount + 1}</strong> renewal on this loan
          </p>
        ) : (
          <p style={{ fontSize: "18px", marginBottom: "25px" }}>
            Please place book on return shelf
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
            defaultValue="abc123"
            style={{
              display: "inline-block",
              marginLeft: "8px",
              fontSize: "16px",
              padding: "2px 4px",
              width: "150px",
            }}
          />
        </div>

        <div
          style={{
            marginTop: "30px",
            display: "flex",
            justifyContent: "space-evenly",
          }}
        >
          <span
            onClick={onClose}
            style={{
              color: "red",
              fontSize: "22px",
              cursor: "pointer",
              textDecoration: "underline",
            }}
          >
            Cancel
          </span>

          <span
            onClick={onSubmit}
            style={{
              color: "blue",
              fontSize: "22px",
              cursor: "pointer",
              textDecoration: "underline",
            }}
          >
            Submit
          </span>
        </div>
      </div>
    </div>
  )
}

export default LoanActionPopup
