package api

import (
	"net/http"
	"strings"
)

// dan wrote this
func (s *Server) HandleAuthors() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			rows, error := s.Db.QueryContext(r.Context(), `
			SELECT authID, lname, fname FROM authors`)
			if error != nil {
				http.Error(w, "query failed", http.StatusInternalServerError)
				return
			}
			defer rows.Close()

			var result []author

			for rows.Next() {
				var a author
				if error := rows.Scan(
					&a.AuthID, &a.LName, &a.FName,
				); error != nil {
					http.Error(w, "Scan failed", http.StatusInternalServerError)
					return
				}
				result = append(result, a)
			}
			writeJSON(w, http.StatusOK, result)

		case http.MethodPost:
			type payload struct {
				LName string  `json:"lname"`
				FName *string `json:"fname"`
			}
			var body payload
			if err := decodeJSON(r, &body); err != nil {
				http.Error(w, "invalid json", http.StatusBadRequest)
				return
			}
			if strings.TrimSpace(body.LName) == "" {
				http.Error(w, "missing required fields", http.StatusBadRequest)
				return
			}

			res, err := s.Db.ExecContext(r.Context(), `
                INSERT INTO authors (lname, fname)
                VALUES (?, ?)`,
				body.LName, body.FName,
			)
			if err != nil {
				http.Error(w, "insert failed", http.StatusInternalServerError)
				return
			}
			id, _ := res.LastInsertId()
			writeJSON(w, http.StatusCreated, map[string]any{"id": id})

		default:
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		}
	})
}
