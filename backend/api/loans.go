package api

import (
	"database/sql"
	"errors"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"
)

// dan handleLoans function from his branch
func (s *Server) HandleLoans() http.Handler {
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
				s.HandleLoansByLoanID(w, r, loanID, isRenewing)
				return
			}
		}

		switch r.Method {
		case http.MethodGet:
			rows, error := s.Db.QueryContext(r.Context(), `
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
				//LoanID      int       `json:"loanID"`
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

			res, err := s.Db.ExecContext(r.Context(), `
                INSERT INTO loan (bookID, caseID, loanDate, dueDate, numRenewals)
                VALUES (?, ?, ?, ?, ?)`,
				body.BookID, body.CaseID, body.LoanDate, body.DueDate, 0,
			)
			if err != nil {
				http.Error(w, "insert failed", http.StatusInternalServerError)
				log.Printf("Insert error found: %v", err)
				return
			}
			id, _ := res.LastInsertId()
			writeJSON(w, http.StatusCreated, map[string]any{"id": id})

		default:
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		}
	})
}

func (s *Server) HandleLoansByLoanID(w http.ResponseWriter, r *http.Request, loanID int, isRenewing bool) {
	switch r.Method {
	case http.MethodGet:
		var l loan
		//Found bug: loans instead of loan table was mentioned here
		err := s.Db.QueryRowContext(r.Context(), `
            SELECT loanID, bookID, caseID, loanDate, dueDate, numRenewals FROM loan WHERE loanID = ?`,
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

			log.Printf("Renewing loan %d: old due date: %v, new due date: %v, renewals: %d -> %d",
				updates.LoanID, updates.DueDate, newDueDate, updates.NumRenewals, updates.NumRenewals+1)

			result, err := s.Db.ExecContext(r.Context(), `
				UPDATE loan SET loanDate = ?, dueDate = ?, numRenewals = ? WHERE loanID = ?`,
				updates.LoanDate, newDueDate, updates.NumRenewals+1, updates.LoanID,
			)

			if err != nil {
				log.Printf("Update error: %v", err)
				http.Error(w, "update failed", http.StatusInternalServerError)
				return
			}

			rowsAffected, _ := result.RowsAffected()
			log.Printf("UPDATE query affected %d rows for loanID %d", rowsAffected, updates.LoanID)

			if rowsAffected == 0 {
				log.Printf("No rows updated, loan %d may not exist", updates.LoanID)
				http.NotFound(w, r)
				return
			}

			w.WriteHeader(http.StatusNoContent)
		}

	case http.MethodDelete:
		res, err := s.Db.ExecContext(r.Context(), `DELETE FROM loan WHERE loanID = ?`, loanID)
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
