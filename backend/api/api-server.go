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

	//"strings"
	"time"

	_ "github.com/go-sql-driver/mysql"
	"github.com/rs/cors"
	"golang.org/x/time/rate"
)

//note a lot of this code is rly repetitive and could be abstracted better instead of just
//having switch statements everywhere and writing the same boilerplate but save that for past the demo

//note 2: this has been done and all endpoints moved to their own specific file

//structs moved into models.go

// parsing book filters for /books endpoint for filtering
func parseBookFilters(r *http.Request) BookFilters {
	return BookFilters{
		Title:     r.URL.Query().Get("title"),
		ISBN:      r.URL.Query().Get("isbn"),
		Publisher: r.URL.Query().Get("publisher"),
	}
}

// simple pagination parser with defaults.
// this is helper function. move to bottom.
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
	//unsuitable for non-monolithic?
	//It's ok, monolithic architecture ok for now
	s := &Server{
		Db:           db,
		router:       http.NewServeMux(),
		limiters:     make(map[string]*rate.Limiter),
		rateInterval: 100 * time.Millisecond,
		rateBurst:    10,
	}

	//use multiplexing with a router so we can have a single connection to serve multiple requests (handle different functions)
	v1 := http.NewServeMux()
	//boris endpoints
	v1.Handle("/books", s.WrapLimiter(s.HandleBooks()))
	//note: the trailing slash is important here to match /books/{id}
	v1.Handle("/books/", s.WrapLimiter(s.HandleBookByID()))
	//extra endpoint for getting book-author relationships (totally forgot about this)
	//NOTE: ONE ENDPOINT PER FUNCTION OR ELSE THERE WILL BE CONFLICTS
	//v1.Handle("/books/", s.wrapLimiter(s.handleBookRelations()))
	v1.Handle("/search", s.WrapLimiter(s.HandleSearch()))
	v1.Handle("/users", s.WrapLimiter(s.HandleUsers()))
	//same here
	v1.Handle("/users/", s.WrapLimiter(s.HandleUsers()))
	v1.Handle("/tags", s.WrapLimiter(s.HandleTags()))
	//endpoints made by dan:
	v1.Handle("/authors", s.WrapLimiter(s.HandleAuthors()))
	v1.Handle("/loans", s.WrapLimiter(s.HandleLoans()))
	// once again, trailing '/' is important here
	// url extension will be in the form "/loans/{loanID}, or /loans/{loanID}/renew"
	v1.Handle("/loans/", s.WrapLimiter(s.HandleLoans()))

	s.router.Handle("/api/v1/", http.StripPrefix("/api/v1", v1))
	s.router.HandleFunc("/healthz", func(w http.ResponseWriter, r *http.Request) {
		if err := s.Db.PingContext(r.Context()); err != nil {
			//throw a 503 error if the db is unavailable
			http.Error(w, "db unavailable", http.StatusServiceUnavailable)
			return
		}
		w.Write([]byte("ok"))
	})

	return s, nil
}

func (s *Server) Serve(addr string) error {
	defer s.Db.Close()
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

func (s *Server) WrapLimiter(next http.Handler) http.Handler {
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
