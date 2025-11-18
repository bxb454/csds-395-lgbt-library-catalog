package api

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"log"
	"net"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	_ "github.com/go-sql-driver/mysql"
	"github.com/rs/cors"
	"golang.org/x/time/rate"
)

func (s *Server) handleUsers() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Extract caseID from path if present
		caseID := strings.TrimPrefix(r.URL.Path, "/users/")

		//If there's a caseID, handle single user operations
		if caseID != "" {
			s.handleSingleUser(w, r, caseID)
			return
		}

		// Otherwise, handle collection operations
		switch r.Method {
		case http.MethodGet:
			// List all users (with pagination)
			pagination := parsePagination(r)
			rows, err := s.db.QueryContext(r.Context(), `
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
			s.db.QueryRowContext(r.Context(), `SELECT COUNT(*) FROM users`).Scan(&total)

			response := map[string]interface{}{
				"data": users,
				"pagination": map[string]interface{}{
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

			_, err := s.db.ExecContext(r.Context(), `
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

func (s *Server) handleSingleUser(w http.ResponseWriter, r *http.Request, caseID string) {
	switch r.Method {
	case http.MethodGet:
		var u user
		err := s.db.QueryRowContext(r.Context(), `
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
		_, err := s.db.ExecContext(r.Context(), `
            UPDATE users SET role = ?, isRestricted = ? WHERE caseID = ?`,
			updates.Role, updates.IsRestricted, caseID,
		)
		if err != nil {
			http.Error(w, "update failed", http.StatusInternalServerError)
			return
		}
		w.WriteHeader(http.StatusNoContent)

	case http.MethodDelete:
		res, err := s.db.ExecContext(r.Context(), `DELETE FROM users WHERE caseID = ?`, caseID)
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

// dan handleLoans function from his branch
func (s *Server) handleLoans() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		id := strings.TrimPrefix(r.URL.Path, "/loans/")
		if id != "" {
			// splitID[0] will hold the loanID, splitID[1] will hold "renew" if the user is renewing, should be empty otherwise
			splitID := strings.Split(id, "/")
			isRenewing := false

			if len(splitID) > 1 && splitID[1] == "renew" {
				isRenewing = true
			}

			if loanID, err := strconv.Atoi(splitID[0]); err == nil {
				s.handleLoansByLoanID(w, r, loanID, isRenewing)
				return
			}
		}

		switch r.Method {
		case http.MethodGet:
			rows, error := s.db.QueryContext(r.Context(), `
			SELECT loanID, bookID, caseID, loanDate, dueDate, numRenewals FROM loan`)
			if error != nil {
				http.Error(w, "query failed", http.StatusInternalServerError)
				return
			}
			defer rows.Close()

			var result []loan

			for rows.Next() {
				var l loan
				if error := rows.Scan(
					&l.LoanID, &l.BookID, &l.CaseID, &l.LoanDate, &l.DueDate, &l.NumRenewals,
				); error != nil {
					http.Error(w, "Scan failed", http.StatusInternalServerError)
					return
				}
				result = append(result, l)
			}
			writeJSON(w, http.StatusOK, result)

		case http.MethodPost:
			type payload struct {
				LoanID      int       `json:"loanID"`
				BookID      int       `json:"bookID"`
				CaseID      *string   `json:"caseID"`
				LoanDate    time.Time `json:"loanDate"`
				DueDate     time.Time `json:"dueDate"`
				NumRenewals int       `json:"numRenewals"`
			}
			var body payload
			if err := decodeJSON(r, &body); err != nil {
				http.Error(w, "invalid json", http.StatusBadRequest)
				return
			}
			if body.BookID <= 0 || *body.CaseID == "" || body.NumRenewals < 0 {
				http.Error(w, "missing required fields", http.StatusBadRequest)
				return
			}

			res, err := s.db.ExecContext(r.Context(), `
                INSERT INTO loan (loanID, bookID, caseID, loanDate, dueDate, numRenewals)
                VALUES (?, ?, ?, ?, ?, 0)`,
				body.LoanID, body.BookID, body.CaseID, body.LoanDate, body.DueDate, body.NumRenewals,
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

func (s *Server) handleLoansByLoanID(w http.ResponseWriter, r *http.Request, loanID int, isRenewing bool) {
	switch r.Method {
	case http.MethodGet:
		var l loan
		err := s.db.QueryRowContext(r.Context(), `
            SELECT loanID, bookID, caseID, loanDate, dueDate, numRenewals FROM loans WHERE loanID = ?`,
			loanID,
		).Scan(&l.LoanID, &l.BookID, &l.CaseID, &l.LoanDate, &l.DueDate, &l.NumRenewals)
		if errors.Is(err, sql.ErrNoRows) {
			http.NotFound(w, r)
			return
		}
		if err != nil {
			http.Error(w, "query failed", http.StatusInternalServerError)
			return
		}
		writeJSON(w, http.StatusOK, l)

	case http.MethodPatch:
		if isRenewing {
			var updates loan
			if err := decodeJSON(r, &updates); err != nil {
				http.Error(w, "invalid json", http.StatusBadRequest)
				return
			}

			//AddDate (years, months, days)
			//extend due date by 14 days automatically
			newDueDate := updates.DueDate.AddDate(0, 0, 14)

			_, err := s.db.ExecContext(r.Context(), `
				UPDATE loan SET loanDate = ?, dueDate = ?, numRenewals = ? WHERE loanID = ?`,
				updates.LoanDate, newDueDate, updates.NumRenewals+1, updates.LoanID,
			)

			if err != nil {
				http.Error(w, "update failed", http.StatusInternalServerError)
				return
			}

			w.WriteHeader(http.StatusNoContent)
		}

	case http.MethodDelete:
		res, err := s.db.ExecContext(r.Context(), `DELETE FROM loan WHERE loanID = ?`, loanID)
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