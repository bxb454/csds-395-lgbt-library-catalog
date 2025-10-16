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
	"strings"
	"sync"
	"time"

	_ "github.com/go-sql-driver/mysql"
	"golang.org/x/time/rate"
)

type Server struct {
	db           *sql.DB
	router       *http.ServeMux
	limiters     map[string]*rate.Limiter
	limitMu      sync.Mutex
	rateInterval time.Duration
	rateBurst    int
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

			var result []book
			for rows.Next() {
				var b book
				if err := rows.Scan(
					&b.ID, &b.ISBN, &b.Title, &b.PubDate,
					&b.Publisher, &b.Edition, &b.Copies, &b.Thumbnail, &b.LoanMetrics,
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
