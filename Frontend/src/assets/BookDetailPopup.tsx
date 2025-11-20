import React, { useState } from "react"
import type { BookData } from "./Types"

interface BookDetailPopupProps {
    book: BookData
    onClose: () => void
    isLoggedIn: boolean
}

const BookDetailPopup: React.FC<BookDetailPopupProps> = ({
    book,
    onClose,
    isLoggedIn,
}) => {
    const [staffID, setStaffID] = useState("");

    const canCheckout = isLoggedIn && book.available > 0

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
                    width: "750px",
                    backgroundColor: "white",
                    border: "2px solid #777",
                    padding: "30px",
                    display: "grid",
                    gridTemplateColumns: "1fr 240px",
                    columnGap: "25px",
                }}
            >
                <div>
                    <div style={{ marginBottom: "15px" }}>
                        <strong>Title:</strong><br />
                        {book.title}
                    </div>

                    <div style={{ marginBottom: "15px" }}>
                        <strong>ISBN:</strong><br />
                        {book.isbn || "[ISBN]"}
                    </div>

                    <div style={{ marginBottom: "15px" }}>
                        <strong>Author(s):</strong><br />
                        {book.author || ""}
                    </div>

                    <div style={{ marginBottom: "15px" }}>
                        <strong>Publishing info:</strong><br />
                        {book.publisher || "[Publisher]"}<br />
                        {book.edition || "[Edition]"}<br />
                        {book.pubYear || "[PubYear]"}
                    </div>

                </div>

                <div>
                    <div
                        style={{
                            width: "100%",
                            height: "150px",
                            backgroundColor: "#d0d0d0",
                            border: "1px solid #999",
                            marginBottom: "10px",
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                        }}
                    >
                        Thumbnail
                    </div>

                    <div style={{ marginBottom: "10px" }}>
                        [{book.available}/{book.copies}] available
                    </div>

                    <div>{book.tags?.join(", ")}</div>
                </div>

                {canCheckout && (
                    <div
                        style={{
                            gridColumn: "1 / span 2",
                            marginTop: "20px",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            textAlign: "center",
                        }}
                    >
                        <strong>Check out item?</strong>

                        <div style={{ marginTop: "6px" }}>
                            Staff member on desk:{" "}
                            <input
                                value={staffID}
                                onChange={(e) => setStaffID(e.target.value)}
                                placeholder="Enter Case ID"
                                style={{
                                    border: "1px solid #777",
                                    padding: "2px 4px",
                                    width: "140px",
                                }}
                            />
                        </div>
                    </div>
                )}

                {/* FOOTER BUTTONS */}
                <div
                    style={{
                        gridColumn: "1 / span 2",
                        display: "flex",
                        justifyContent: "center",
                        gap: "80px",
                        marginTop: "30px",
                    }}
                >
                    <button
                        onClick={onClose}
                        style={{
                            fontSize: "20px",
                            color: "red",
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            textDecoration: "underline",
                        }}
                    >
                        Cancel
                    </button>

                    {canCheckout && (
                        <button
                            onClick={() => {
                                alert(
                                    `Submitted checkout for "${book.title}" by staff: ${staffID}`
                                );
                                onClose()
                            }}
                            style={{
                                fontSize: "20px",
                                color: "blue",
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                textDecoration: "underline",
                            }}
                        >
                            Submit
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BookDetailPopup
