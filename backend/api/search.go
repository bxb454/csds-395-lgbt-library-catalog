package api

import (
	"database/sql"
	"net/http"
)

// handle search across books, authors, tags
// note: we should get authors and tags endpoints working. this works without them but we need them
// EXAMPLE: GET/api/v1/search?q=Stone&limit=5&offset=10
func (s *Server) HandleSearch() http.Handler {
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
		err := s.Db.QueryRowContext(r.Context(), `
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
		rows, err := s.Db.QueryContext(r.Context(), `
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

		var results []map[string]any
		for rows.Next() {
			var resultType string
			var id sql.NullInt64
			var name string
			if err := rows.Scan(&resultType, &id, &name); err != nil {
				http.Error(w, "scan failed", http.StatusInternalServerError)
				return
			}
			results = append(results, map[string]any{
				"type": resultType,
				"id":   id.Int64,
				"name": name,
			})
		}

		//build the response with the metadata for pagination
		response := map[string]any{
			"data": results,
			"pagination": map[string]any{
				"limit":   pagination.Limit,
				"offset":  pagination.Offset,
				"total":   total,
				"hasMore": pagination.Offset+pagination.Limit < total,
			},
		}

		writeJSON(w, http.StatusOK, response)
	})
}
