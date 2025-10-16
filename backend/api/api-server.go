package api

import (
	//"context"
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

/*
type author struct {

}
*/

/* type loan struct {

} */

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

// --- end structs ---

func parseBookFilters(r *http.Request) BookFilters {
	return BookFilters{
		Title:     r.URL.Query().Get("title"),
		ISBN:      r.URL.Query().Get("isbn"),
		Publisher: r.URL.Query().Get("publisher"),
	}
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

	//10 requests per second, max 10 burst (at once)
	//unsuitable for non-monolithic
	s := &Server{
		db:           db,
		router:       http.NewServeMux(),
		limiters:     make(map[string]*rate.Limiter),
		rateInterval: 100 * time.Millisecond,
		rateBurst:    10,
	}

	v1 := http.NewServeMux()
	v1.Handle("/books", s.wrapLimiter(s.handleBooks()))
	//note: the trailing slash is important here to match /books/{id}
	v1.Handle("/books/", s.wrapLimiter(s.handleBookByID()))
	v1.Handle("/search", s.wrapLimiter(s.handleSearch()))
	/*
	   v1.Handle("/authors", s.wrapLimiter(s.handleAuthors()))
	   v1.Handle("/loans", s.wrapLimiter(s.handleLoans()))
	*/

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

func (s *Server) queryBooksWithFilters(ctx context.Context, filters BookFilters, pagination PaginationParams) ([]book, int, error) {
	whereClause, args := filters.buildWhereClause()

	//build main query, parse pagination params, and scan
	query := `SELECT bookID, isbn, title, pubdate, publisher, edition, copies, thumbnail, loanMetrics FROM books` +
		whereClause + ` ORDER BY bookID LIMIT ? OFFSET ?`
	//we can use OFFSET keyword in SQL to skip a number of rows for offset pagination method
	args = append(args, pagination.Limit, pagination.Offset)

	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var result []book
	for rows.Next() {
		var b book
		if err := rows.Scan(
			&b.ID, &b.ISBN, &b.Title, &b.PubDate,
			&b.Publisher, &b.Edition, &b.Copies, &b.Thumbnail, &b.LoanMetrics,
		); err != nil {
			return nil, 0, err
		}
		result = append(result, b)
	}

	//get the total count of books
	countQuery := `SELECT COUNT(*) FROM books` + whereClause
	//countArgs, _ := filters.buildWhereClause()
	var total int
	//exclude the limit and offset args for the count query
	err = s.db.QueryRowContext(ctx, countQuery, args[:len(args)-2]...).Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	return result, total, nil
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
			pagination := parsePagination(r)
			filters := parseBookFilters(r)

			books, total, err := s.queryBooksWithFilters(r.Context(), filters, pagination)
			if err != nil {
				http.Error(w, "query failed", http.StatusInternalServerError)
				return
			}

			response := map[string]interface{}{
				"data": books,
				"pagination": map[string]interface{}{
					"limit":   pagination.Limit,
					"offset":  pagination.Offset,
					"total":   total,
					"hasMore": pagination.Offset+pagination.Limit < total,
				},
			}

			writeJSON(w, http.StatusOK, response)

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
			//we can't have a book without a title or copies (aka the book doesn't exist)
			if body.Title == "" || body.Copies <= 0 {
				http.Error(w, "missing required fields", http.StatusBadRequest)
				return
			}

			//loan metrics will be added by 1 every time it's checked out

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

// query by ID
// no need for pagination since it's just one item
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
				log.Printf("query error: %v", err)
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

// handle search across books, authors, tags
// note: we should get authors and tags endpoints working. this works without them but we need them
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
