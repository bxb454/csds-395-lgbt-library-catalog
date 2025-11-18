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

		//path: /books/{bookID}/authors or /books/{bookID}/tags
		path := strings.TrimPrefix(r.URL.Path, "/books/")
		parts := strings.Split(path, "/")

		if len(parts) < 2 {
			http.NotFound(w, r)
			return
		}

		//parts[0] always bookID, parts[1] is relation type
		bookID := parts[0]
		relation := parts[1]

		switch relation {
		case "authors":
			s.handleBookAuthors(w, r, bookID)
		case "tags":
			s.handleBookTags(w, r, bookID)
		default:
			http.NotFound(w, r)
		}

		id := path
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
		//conflicted between patch and put for this one
		case http.MethodPut:
			type payload struct {
				ISBN      *string `json:"isbn"`
				Title     string  `json:"title"`
				PubDate   *string `json:"pubdate"`
				Publisher *string `json:"publisher"`
				Edition   *string `json:"edition"`
				Copies    int     `json:"copies"`
			}
			var body payload
			if errors := decodeJSON(r, &body); errors != nil {
				http.Error(w, "invalid json", http.StatusBadRequest)
				return
			}
			if body.Title == "" || body.Copies <= 0 {
				http.Error(w, "missing required fields", http.StatusBadRequest)
				return
			}

			res, err := s.db.ExecContext(r.Context(), ` UPDATE books SET isbn = ?, title = ?, pubdate = ?,
			publisher = ?, edition = ?, copies = ? WHERE bookID = ?`,
				body.ISBN, body.Title, body.PubDate, body.Publisher, body.Edition, body.Copies, id)
			if err != nil {
				http.Error(w, "update failed", http.StatusInternalServerError)
				return
			}
			if rows, _ := res.RowsAffected(); rows == 0 {
				http.NotFound(w, r)
				return
			}
			w.WriteHeader(http.StatusNoContent)

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

/*
func (s *Server) handleBookRelations() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		//path: /books/{bookID}/authors or /books/{bookID}/tags
		path := strings.TrimPrefix(r.URL.Path, "/books/")
		parts := strings.Split(path, "/")

		if len(parts) < 2 {
			http.NotFound(w, r)
			return
		}

		//parts[0] always bookID, parts[1] is relation type
		bookID := parts[0]
		relation := parts[1]

		switch relation {
		case "authors":
			s.handleBookAuthors(w, r, bookID)
		case "tags":
			s.handleBookTags(w, r, bookID)
		default:
			http.NotFound(w, r)
		}
	})
}
*/

func (s *Server) handleBookTags(w http.ResponseWriter, r *http.Request, bookID string) {
	switch r.Method {
	case http.MethodGet:
		// List all tags for this book
		//tags are strings
		rows, err := s.db.QueryContext(r.Context(), `
            SELECT tag FROM booktags WHERE bookID = ?`,
			bookID,
		)
		if err != nil {
			http.Error(w, "query failed", http.StatusInternalServerError)
			return
		}
		defer rows.Close()

		var tags []string
		for rows.Next() {
			var tag string
			if err := rows.Scan(&tag); err != nil {
				http.Error(w, "scan failed", http.StatusInternalServerError)
				return
			}
			tags = append(tags, tag)
		}
		writeJSON(w, http.StatusOK, tags)

	case http.MethodPost:
		type payload struct {
			Tag string `json:"tag"`
		}
		var body payload
		if err := decodeJSON(r, &body); err != nil {
			http.Error(w, "invalid json", http.StatusBadRequest)
			return
		}
		if body.Tag == "" {
			http.Error(w, "missing tag", http.StatusBadRequest)
			return
		}

		_, err := s.db.ExecContext(r.Context(), `
            INSERT INTO booktags (bookID, tag)
            VALUES (?, ?)`,
			bookID, body.Tag,
		)
		if err != nil {
			http.Error(w, "insert failed", http.StatusInternalServerError)
			return
		}
		w.WriteHeader(http.StatusCreated)

	case http.MethodDelete:
		//DELETE /books/{bookID}/tags/{tag}
		path := strings.TrimPrefix(r.URL.Path, "/books/"+bookID+"/tags/")
		tag := path
		if tag == "" {
			http.Error(w, "missing tag", http.StatusBadRequest)
			return
		}

		res, err := s.db.ExecContext(r.Context(), `
            DELETE FROM booktags WHERE bookID = ? AND tag = ?`,
			bookID, tag,
		)
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

// handle tags endpoint
// sample GET: /api/v1/tags - list all tags in the system
func (s *Server) handleTags() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}

		//select distinct to avoid duplicates
		rows, err := s.db.QueryContext(r.Context(), `
            SELECT DISTINCT tag FROM booktags ORDER BY tag`,
		)
		if err != nil {
			http.Error(w, "query failed", http.StatusInternalServerError)
			return
		}
		defer rows.Close()

		var tags []string
		for rows.Next() {
			var tag string
			if err := rows.Scan(&tag); err != nil {
				http.Error(w, "scan failed", http.StatusInternalServerError)
				return
			}
			tags = append(tags, tag)
		}
		writeJSON(w, http.StatusOK, tags)
	})
}

// GET /books/{bookID}/authors
// POST /books/{bookID}/authors
// DELETE /books/{bookID}/authors/{authID}
func (s *Server) handleBookAuthors(w http.ResponseWriter, r *http.Request, bookID string) {
	switch r.Method {
	case http.MethodGet:
		// List all authors for this book
		rows, err := s.db.QueryContext(r.Context(), `
            SELECT a.authID, a.lname, a.fname
            FROM authors a
            INNER JOIN bookAuthor ba ON a.authID = ba.authID
            WHERE ba.bookID = ?`,
			bookID,
		)
		if err != nil {
			http.Error(w, "query failed", http.StatusInternalServerError)
			return
		}
		defer rows.Close()

		type author struct {
			AuthID int     `json:"authID"`
			LName  string  `json:"lname"`
			FName  *string `json:"fname"`
		}

		var authors []author
		for rows.Next() {
			var a author
			var fname sql.NullString
			if err := rows.Scan(&a.AuthID, &a.LName, &fname); err != nil {
				http.Error(w, "scan failed", http.StatusInternalServerError)
				return
			}
			a.FName = nullString(fname)
			authors = append(authors, a)
		}
		writeJSON(w, http.StatusOK, authors)

	case http.MethodPost:
		// Add an author to this book
		type payload struct {
			AuthID int `json:"authID"`
		}
		var body payload
		if err := decodeJSON(r, &body); err != nil {
			http.Error(w, "invalid json", http.StatusBadRequest)
			return
		}
		if body.AuthID <= 0 {
			http.Error(w, "missing authID", http.StatusBadRequest)
			return
		}

		_, err := s.db.ExecContext(r.Context(), `
            INSERT INTO bookAuthor (bookID, authID)
            VALUES (?, ?)`,
			bookID, body.AuthID,
		)
		if err != nil {
			http.Error(w, "insert failed", http.StatusInternalServerError)
			return
		}
		w.WriteHeader(http.StatusCreated)

	case http.MethodDelete:
		// DELETE /books/{bookID}/authors/{authID}
		path := strings.TrimPrefix(r.URL.Path, "/books/"+bookID+"/authors/")
		authID := path
		if authID == "" {
			http.Error(w, "missing authID", http.StatusBadRequest)
			return
		}

		res, err := s.db.ExecContext(r.Context(), `
            DELETE FROM bookAuthor WHERE bookID = ? AND authID = ?`,
			bookID, authID,
		)
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

// dan wrote this
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
