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

//note a lot of this code is rly repetitive and could be abstracted better instead of just
//having switch statements everywhere and writing the same boilerplate but save that for past the demo

//structs moved into models.go

func New() (*Server, error) {
	//set env to get (DSN) or data source name) for mysql
	dsn := os.Getenv("CATALOG_DB_DSN")
	log.Printf("DEBUG: Using DSN: %s", dsn)
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

	//use multiplexing with a router so we can have a single connection to serve multiple requests
	v1 := http.NewServeMux()
	//boris endpoints
	v1.Handle("/books", s.wrapLimiter(s.handleBooks()))
	//note: the trailing slash is important here to match /books/{id}
	v1.Handle("/books/", s.wrapLimiter(s.handleBookByID()))
	//extra endpoint for getting book-author relationships (totally forgot about this)
	//NOTE: ONE ENDPOINT PER FUNCTION OR ELSE THERE WILL BE CONFLICTS
	//v1.Handle("/books/", s.wrapLimiter(s.handleBookRelations()))
	v1.Handle("/search", s.wrapLimiter(s.handleSearch()))
	v1.Handle("/users", s.wrapLimiter(s.handleUsers()))
	//same here
	v1.Handle("/users/", s.wrapLimiter(s.handleUsers()))
	v1.Handle("/tags", s.wrapLimiter(s.handleTags()))
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

	//CORS middleware so it can run on multiple ports (frontend and backend)
	corsOptions := cors.New(cors.Options{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Content-Type", "Authorization"},
		AllowCredentials: true,
	})

	return http.ListenAndServe(addr, corsOptions.Handler(s.router))
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
