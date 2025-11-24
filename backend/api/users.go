package api

import (
	"database/sql"
	"errors"
	"net/http"
	"strings"
)

func (s *Server) HandleUsers() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {

		path := r.URL.Path

		// Extract caseID from path if present
		// Apparently this incorrectly handles it as a single user operation
		//caseID := strings.TrimPrefix(r.URL.Path, "/users/")

		//If there's a caseID, handle single user operations
		if strings.HasPrefix(path, "/users/") {
			caseID := strings.TrimPrefix(path, "/users/")
			if caseID != "" {
				s.HandleSingleUser(w, r, caseID)
				return
			}
		}

		// Otherwise, handle collection operations
		switch r.Method {
		case http.MethodGet:
			// List all users (with pagination)
			pagination := parsePagination(r)
			rows, err := s.Db.QueryContext(r.Context(), `
                SELECT caseID, role, isRestricted FROM users
                ORDER BY caseID LIMIT ? OFFSET ?`,
				pagination.Limit, pagination.Offset,
			)
			if err != nil {
				http.Error(w, "query failed", http.StatusInternalServerError)
				return
			}
			defer rows.Close()

			var users []user
			for rows.Next() {
				var u user
				if err := rows.Scan(&u.CaseID, &u.Role, &u.IsRestricted); err != nil {
					http.Error(w, "scan failed", http.StatusInternalServerError)
					return
				}
				users = append(users, u)
			}

			var total int
			s.Db.QueryRowContext(r.Context(), `SELECT COUNT(*) FROM users`).Scan(&total)

			response := map[string]any{
				"data": users,
				"pagination": map[string]any{
					"limit":   pagination.Limit,
					"offset":  pagination.Offset,
					"total":   total,
					"hasMore": pagination.Offset+pagination.Limit < total,
				},
			}
			writeJSON(w, http.StatusOK, response)

		case http.MethodPost:
			var u user
			if err := decodeJSON(r, &u); err != nil {
				http.Error(w, "invalid json", http.StatusBadRequest)
				return
			}
			if u.CaseID == "" || u.Role == "" {
				http.Error(w, "missing required fields", http.StatusBadRequest)
				return
			}

			_, err := s.Db.ExecContext(r.Context(), `
                INSERT INTO users (caseID, role, isRestricted)
                VALUES (?, ?, ?)`,
				u.CaseID, u.Role, u.IsRestricted,
			)
			if err != nil {
				http.Error(w, "insert failed", http.StatusInternalServerError)
				return
			}
			writeJSON(w, http.StatusCreated, map[string]string{"caseID": u.CaseID})

		default:
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		}
	})
}

func (s *Server) HandleSingleUser(w http.ResponseWriter, r *http.Request, caseID string) {
	switch r.Method {
	case http.MethodGet:
		var u user
		err := s.Db.QueryRowContext(r.Context(), `
            SELECT caseID, role, isRestricted FROM users WHERE caseID = ?`,
			caseID,
		).Scan(&u.CaseID, &u.Role, &u.IsRestricted)
		if errors.Is(err, sql.ErrNoRows) {
			http.NotFound(w, r)
			return
		}
		if err != nil {
			http.Error(w, "query failed", http.StatusInternalServerError)
			return
		}
		writeJSON(w, http.StatusOK, u)

	case http.MethodPatch:
		var updates user
		if err := decodeJSON(r, &updates); err != nil {
			http.Error(w, "invalid json", http.StatusBadRequest)
			return
		}
		_, err := s.Db.ExecContext(r.Context(), `
            UPDATE users SET role = ?, isRestricted = ? WHERE caseID = ?`,
			updates.Role, updates.IsRestricted, caseID,
		)
		if err != nil {
			http.Error(w, "update failed", http.StatusInternalServerError)
			return
		}
		w.WriteHeader(http.StatusNoContent)

	case http.MethodDelete:
		res, err := s.Db.ExecContext(r.Context(), `DELETE FROM users WHERE caseID = ?`, caseID)
		if err != nil {
			http.Error(w, "delete failed", http.StatusInternalServerError)
			return
		}
		if rows, _ := res.RowsAffected(); rows == 0 {
			http.NotFound(w, r)
			return
		}
		w.WriteHeader(http.StatusNoContent)

	default:
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}
