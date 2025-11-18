import React from "react"

const NavigationMenu: React.FC<{ onClick: () => void }> = ({ onClick }) => {
    return (
        <div
            onClick={onClick}
            style={{
                cursor: "pointer",
                padding: "4px 6px",
                border: "1px solid #777",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                gap: "3px",
                background: "white",
                width: "28px",
                height: "26px",
            }}
        >
            <div style={{ height: "2px", background: "#000" }} />
            <div style={{ height: "2px", background: "#000" }} />
            <div style={{ height: "2px", background: "#000" }} />
        </div>
    )
}

export default NavigationMenu
