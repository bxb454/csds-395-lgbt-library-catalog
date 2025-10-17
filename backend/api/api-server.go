package api

import (
	//"context"
	"database/sql"
	"encoding/json"
	"errors"
	"log"
	"net"
	"net/http"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"

	_ "github.com/go-sql-driver/mysql"
	"golang.org/x/time/rate"
)

//note a lot of this code is rly repetitive and could be abstracted better instead of just
//having switch statements everywhere and writing the same boilerplate but save that for past the demo

// --- structs to define data types/models ---

type book struct {
	ID          int     `json:"id"`
	ISBN        *string `json:"isbn"`
	Title       string  `json:"title"`
	PubDate     *string `json:"pubdate"`
	Publisher   *string `json:"publisher"`
	Edition     *string `json:"edition"`
	Copies      int     `json:"copies"`
	Thumbnail   []byte  `json:"thumbnail"`
	LoanMetrics int     `json:"loanMetrics"`
}

type author struct {
	AuthID int     `json:"authID"`
	LName  *string `json:"lname"`
	FName  *string `json:"fname"`
}

type loan struct {
	LoanID      int       `json:"loanID"`
	BookID      int       `json:"bookID"`
	CaseID      *string   `json:"caseID"`
	LoanDate    time.Time `json:"loanDate"`
	DueDate     time.Time `json:"dueDate"`
	NumRenewals int       `json:"numRenewals"`
}

/*

CREATE TABLE users(
	caseID varchar(8) not null,
    role enum('guest', 'patron', 'staff', 'admin') not null,
    primary key(caseID),
    isRestricted boolean not null
);

*/

type user struct {
	CaseID       string `json:"caseID"`
	Role         string `json:"role"`
	IsRestricted bool   `json:"isRestricted"`
}

type PaginationParams struct {
	Limit  int
	Offset int
}

type BookFilters struct {
	Title     string
	ISBN      string
	Publisher string
}

type Server struct {
	db           *sql.DB
	router       *http.ServeMux
	limiters     map[string]*rate.Limiter
	limitMu      sync.Mutex
	rateInterval time.Duration
	rateBurst    int
}

// simple pagination parser with defaults.
func parsePagination(r *http.Request) PaginationParams {
	params := PaginationParams{Limit: 10, Offset: 0}

	if l := r.URL.Query().Get("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil && parsed > 0 && parsed <= 100 {
			params.Limit = parsed
		}
	}

	if o := r.URL.Query().Get("offset"); o != "" {
		if parsed, err := strconv.Atoi(o); err == nil && parsed >= 0 {
			params.Offset = parsed
		}
	}

	return params
}

func (bf BookFilters) buildWhereClause() (string, []interface{}) {
	var conditions []string
	var args []interface{}

	if bf.Title != "" {
		conditions = append(conditions, "title LIKE ?")
		args = append(args, "%"+bf.Title+"%")
	}
	if bf.ISBN != "" {
		conditions = append(conditions, "isbn = ?")
		args = append(args, bf.ISBN)
	}
	if bf.Publisher != "" {
		conditions = append(conditions, "publisher LIKE ?")
		args = append(args, "%"+bf.Publisher+"%")
	}

	//join conditions with " AND " and prepend "WHERE" if there are any conditions
	whereClause := ""
	if len(conditions) > 0 {
		whereClause = " WHERE " + strings.Join(conditions, " AND ")
	}

	return whereClause, args
}

func New() (*Server, error) {
	//set env to get (DSN) or data source name) for mysql
	dsn := os.Getenv("CATALOG_DB_DSN")
	if dsn == "" {
		return nil, errors.New("CATALOG_DB_DSN not set")
	}

	db, err := sql.Open("mysql", dsn)
	if err != nil {
		return nil, err
	}

	s := &Server{
		db:           db,
		router:       http.NewServeMux(),
		limiters:     make(map[string]*rate.Limiter),
		rateInterval: 60 * time.Second,
		rateBurst:    100,
	}

	v1 := http.NewServeMux()
	v1.Handle("/books", s.wrapLimiter(s.handleBooks()))
	//note: the trailing slash is important here to match /books/{id}
	v1.Handle("/books/", s.wrapLimiter(s.handleBookByID()))
	v1.Handle("/users", s.wrapLimiter(s.handleUsers()))
	//same here
	v1.Handle("/users/", s.wrapLimiter(s.handleUsers()))
	//endpoints made by dan:
	v1.Handle("/authors", s.wrapLimiter(s.handleAuthors()))
	v1.Handle("/loans", s.wrapLimiter(s.handleLoans()))
	// once again, trailing '/' is important here
	// url extension will be in the form "/loans/{loanID}, or /loans/{loanID}/renew"
	v1.Handle("/loans/", s.wrapLimiter(s.handleLoans()))

	s.router.Handle("/api/v1/", http.StripPrefix("/api/v1", v1))
	s.router.HandleFunc("/healthz", func(w http.ResponseWriter, r *http.Request) {
		if err := s.db.PingContext(r.Context()); err != nil {
			//throw a 503 error if the db is unavailable
			http.Error(w, "db unavailable", http.StatusServiceUnavailable)
			return
		}
		w.Write([]byte("ok"))
	})

	return s, nil
}

func (s *Server) Serve(addr string) error {
	defer s.db.Close()
	log.Printf("API server listening on %s", addr)
	return http.ListenAndServe(addr, s.router)
}

// --- handlers (trimmed for brevity) ---

func (s *Server) handleBooks() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			rows, err := s.db.QueryContext(r.Context(), `
                SELECT bookID, isbn, title, pubdate, publisher, edition, copies, loanMetrics
                FROM books`,
			)
			if err != nil {
				http.Error(w, "query failed", http.StatusInternalServerError)
				return
			}
			defer rows.Close()

			var result []book
			for rows.Next() {
				var b book
				if err := rows.Scan(
					&b.ID, &b.ISBN, &b.Title, &b.PubDate,
					&b.Publisher, &b.Edition, &b.Copies, &b.LoanMetrics,
				); err != nil {
					http.Error(w, "scan failed", http.StatusInternalServerError)
					return
				}
				result = append(result, b)
			}

			writeJSON(w, http.StatusOK, result)

		case http.MethodPost:
			type payload struct {
				ISBN      *string `json:"isbn"`
				Title     string  `json:"title"`
				PubDate   *string `json:"pubdate"`
				Publisher *string `json:"publisher"`
				Edition   *string `json:"edition"`
				Copies    int     `json:"copies"`
			}
			var body payload
			if err := decodeJSON(r, &body); err != nil {
				http.Error(w, "invalid json", http.StatusBadRequest)
				return
			}
			if body.Title == "" || body.Copies <= 0 {
				http.Error(w, "missing required fields", http.StatusBadRequest)
				return
			}

			res, err := s.db.ExecContext(r.Context(), `
                INSERT INTO books (isbn, title, pubdate, publisher, edition, copies, thumbnail, loanMetrics)
                VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
				body.ISBN, body.Title, body.PubDate, body.Publisher, body.Edition, body.Copies,
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

func (s *Server) handleBookByID() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		id := strings.TrimPrefix(r.URL.Path, "/books/")
		if id == "" {
			http.Error(w, "missing id", http.StatusBadRequest)
			return
		}
		switch r.Method {
		case http.MethodGet:
			var (
				bookID      int
				isbn        sql.NullString
				title       string
				pubdate     sql.NullString
				publisher   sql.NullString
				edition     sql.NullString
				copies      int
				loanMetrics int
			)
			err := s.db.QueryRowContext(r.Context(), `
                SELECT bookID, isbn, title, pubdate, publisher, edition, copies, loanMetrics
                FROM books WHERE bookID = ?`, id,
			).Scan(&bookID, &isbn, &title, &pubdate, &publisher, &edition, &copies, &loanMetrics)
			if errors.Is(err, sql.ErrNoRows) {
				http.NotFound(w, r)
				return
			}
			if err != nil {
				http.Error(w, "query failed", http.StatusInternalServerError)
				return
			}
			writeJSON(w, http.StatusOK, map[string]any{
				"id":          bookID,
				"isbn":        nullString(isbn),
				"title":       title,
				"pubdate":     nullString(pubdate),
				"publisher":   nullString(publisher),
				"edition":     nullString(edition),
				"copies":      copies,
				"loanMetrics": loanMetrics,
			})

		case http.MethodDelete:
			res, err := s.db.ExecContext(r.Context(), `DELETE FROM books WHERE bookID = ?`, id)
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
	})
}

func (s *Server) handleUsers() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Extract caseID from path if present
		caseID := strings.TrimPrefix(r.URL.Path, "/users/")

		// If there's a caseID, handle single user operations
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

// handle search across books, authors, tags
// note: we should get authors and tags endpoints working. this works without them but we need them
// EXAMPLE: GET/api/v1/search?q=Stone&limit=5&offset=10
func (s *Server) handleSearch() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		query := r.URL.Query().Get("q")
		if query == "" {
			http.Error(w, "missing search query", http.StatusBadRequest)
			return
		}

		pagination := parsePagination(r)

		//get total count of results
		//this might be awful for performance but it works for now
		var total int
		err := s.db.QueryRowContext(r.Context(), `
            SELECT COUNT(*) FROM (
                SELECT bookID FROM books WHERE title LIKE ?
                UNION
                SELECT authID FROM authors WHERE fname LIKE ? OR lname LIKE ?
                UNION
                SELECT NULL FROM booktags WHERE tag LIKE ?
            ) AS totalResults`,
			"%"+query+"%", "%"+query+"%", "%"+query+"%", "%"+query+"%",
		).Scan(&total)
		if err != nil {
			http.Error(w, "failed to count search results", http.StatusInternalServerError)
			return
		}

		//get paginated results
		rows, err := s.db.QueryContext(r.Context(), `
            SELECT 'book' AS type, bookID AS id, title AS name FROM books WHERE title LIKE ?
            UNION
            SELECT 'author', authID, CONCAT(fname, ' ', lname) FROM authors WHERE fname LIKE ? OR lname LIKE ?
            UNION
            SELECT 'tag', NULL, tag FROM booktags WHERE tag LIKE ?
            LIMIT ? OFFSET ?`,
			"%"+query+"%", "%"+query+"%", "%"+query+"%", "%"+query+"%",
			pagination.Limit, pagination.Offset,
		)
		if err != nil {
			http.Error(w, "search query failed", http.StatusInternalServerError)
			return
		}
		defer rows.Close()

		var results []map[string]interface{}
		for rows.Next() {
			var resultType string
			var id sql.NullInt64
			var name string
			if err := rows.Scan(&resultType, &id, &name); err != nil {
				http.Error(w, "scan failed", http.StatusInternalServerError)
				return
			}
			results = append(results, map[string]interface{}{
				"type": resultType,
				"id":   id.Int64,
				"name": name,
			})
		}

		//build the response with the metadata for pagination
		response := map[string]interface{}{
			"data": results,
			"pagination": map[string]interface{}{
				"limit":   pagination.Limit,
				"offset":  pagination.Offset,
				"total":   total,
				"hasMore": pagination.Offset+pagination.Limit < total,
			},
		}

		writeJSON(w, http.StatusOK, response)
	})
}

func (s *Server) handleAuthors() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			rows, error := s.db.QueryContext(r.Context(), `
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
				AuthID int     `json:"authID"`
				LName  *string `json:"lname"`
				FName  *string `json:"fname"`
			}
			var body payload
			if err := decodeJSON(r, &body); err != nil {
				http.Error(w, "invalid json", http.StatusBadRequest)
				return
			}
			if body.AuthID == 0 || *body.LName == "" || *body.FName == "" {
				http.Error(w, "missing required fields", http.StatusBadRequest)
				return
			}

			res, err := s.db.ExecContext(r.Context(), `
                INSERT INTO loan (authID, lname, fname)
                VALUES (?, ?, 0)`,
				body.AuthID, body.LName, body.FName,
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

			_, err := s.db.ExecContext(r.Context(), `
				UPDATE loan SET loanDate = ?, dueDate = ?, numRenewals = ? WHERE loanID = ?`,
				updates.LoanDate, updates.DueDate, updates.NumRenewals+1, updates.LoanID,
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

//add the other functions for authors and loans....

// --- helpers ---

func (s *Server) wrapLimiter(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ip, _, _ := net.SplitHostPort(r.RemoteAddr)
		if ip == "" {
			ip = r.RemoteAddr
		}
		lim := s.getLimiter(ip)
		//t/f statement to check if allowed or not
		if !lim.Allow() {
			//return a 429 error here if rate limit exceeded
			http.Error(w, "too many requests", http.StatusTooManyRequests)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func (s *Server) getLimiter(ip string) *rate.Limiter {
	s.limitMu.Lock()
	defer s.limitMu.Unlock()

	if lim, ok := s.limiters[ip]; ok {
		return lim
	}

	lim := rate.NewLimiter(rate.Every(s.rateInterval), s.rateBurst)
	s.limiters[ip] = lim
	return lim
}

func writeJSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(data)
}

func decodeJSON(r *http.Request, out any) error {
	defer r.Body.Close()
	return json.NewDecoder(r.Body).Decode(out)
}

func nullString(ns sql.NullString) *string {
	if ns.Valid {
		return &ns.String
	}
	return nil
}
