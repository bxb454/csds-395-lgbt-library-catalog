package api

import (
	"context"
	"database/sql"
	"errors"
	"log"
	"net/http"
	"strings"
)

// another helper function. move to bottom.
func (bf BookFilters) buildWhereClause() (string, []any) {
	var conditions []string
	var args []any

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

func (s *Server) queryBooksWithFilters(ctx context.Context, filters BookFilters, pagination PaginationParams) ([]book, int, error) {
	whereClause, args := filters.buildWhereClause()

	//build main query, parse pagination params, and scan
	query := `SELECT bookID, isbn, title, pubdate, publisher, edition, copies, thumbnail, loanMetrics FROM books` +
		whereClause + ` ORDER BY bookID LIMIT ? OFFSET ?`
	//we can use OFFSET keyword in SQL to skip a number of rows for offset pagination method
	args = append(args, pagination.Limit, pagination.Offset)

	rows, err := s.Db.QueryContext(ctx, query, args...)
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
	err = s.Db.QueryRowContext(ctx, countQuery, args[:len(args)-2]...).Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	return result, total, nil
}

func (s *Server) HandleBooks() http.Handler {
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

			response := map[string]any{
				"data": books,
				"pagination": map[string]any{
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

			res, err := s.Db.ExecContext(r.Context(), `
                INSERT INTO books (isbn, title, pubdate, publisher, edition, copies, thumbnail, loanMetrics)
                VALUES (?, ?, ?, ?, ?, ?, NULL, 0)`,
				body.ISBN, body.Title, body.PubDate, body.Publisher, body.Edition, body.Copies,
			)
			if err != nil {
				log.Printf("Insertion error: %v", err)
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
func (s *Server) HandleBookByID() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {

		//path: /books/{bookID}/authors or /books/{bookID}/tags
		path := strings.TrimPrefix(r.URL.Path, "/books/")
		parts := strings.Split(path, "/")

		if len(parts) == 0 || parts[0] == "" {
			http.Error(w, "missing book ID", http.StatusBadRequest)
			return
		}

		//parts[0] always bookID, parts[1] is relation type
		bookID := parts[0]
		//relation := parts[1]

		if len(parts) >= 2 {
			relation := parts[1]
			switch relation {
			case "authors":
				s.HandleBookAuthors(w, r, bookID)
				return
			case "tags":
				s.HandleBookTags(w, r, bookID)
				return //let's return after handling the relationship
			default:
				http.NotFound(w, r)
				return
			}
		}

		//GET/PUT/DELETE logic was here but unreachable because of returning early

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
			err := s.Db.QueryRowContext(r.Context(), `
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

			res, err := s.Db.ExecContext(r.Context(), ` UPDATE books SET isbn = ?, title = ?, pubdate = ?,
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
			res, err := s.Db.ExecContext(r.Context(), `DELETE FROM books WHERE bookID = ?`, id)
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

func (s *Server) HandleBookTags(w http.ResponseWriter, r *http.Request, bookID string) {
	switch r.Method {
	case http.MethodGet:
		// List all tags for this book
		//tags are strings
		rows, err := s.Db.QueryContext(r.Context(), `
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

		res, err := s.Db.ExecContext(r.Context(), `
            INSERT INTO booktags (bookID, tag)
            VALUES (?, ?)`,
			bookID, body.Tag,
		)
		if err != nil {
			log.Printf("add tag failed: bookID=%s tag=%s err=%v", bookID, body.Tag, err)
			http.Error(w, "insert failed", http.StatusInternalServerError)
			return
		}
		if rows, _ := res.RowsAffected(); rows == 0 {
			log.Printf("add tag no rows: bookID=%s tag=%s", bookID, body.Tag)
		} else {
			log.Printf("added tag: bookID=%s tag=%s rows=%d", bookID, body.Tag, rows)
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

		res, err := s.Db.ExecContext(r.Context(), `
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

// GET /books/{bookID}/authors
// POST /books/{bookID}/authors
// DELETE /books/{bookID}/authors/{authID}
func (s *Server) HandleBookAuthors(w http.ResponseWriter, r *http.Request, bookID string) {
	switch r.Method {
	case http.MethodGet:
		// List all authors for this book
		rows, err := s.Db.QueryContext(r.Context(), `
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

		res, err := s.Db.ExecContext(r.Context(), `
            INSERT INTO bookAuthor (bookID, authID)
            VALUES (?, ?)`,
			bookID, body.AuthID,
		)
		if err != nil {
			log.Printf("link author failed: bookID=%s authID=%d err=%v", bookID, body.AuthID, err)
			http.Error(w, "insert failed", http.StatusInternalServerError)
			return
		}
		if rows, _ := res.RowsAffected(); rows == 0 {
			log.Printf("link author no rows: bookID=%s authID=%d", bookID, body.AuthID)
		} else {
			log.Printf("linked author: bookID=%s authID=%d rows=%d", bookID, body.AuthID, rows)
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

		res, err := s.Db.ExecContext(r.Context(), `
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
