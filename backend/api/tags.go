package api

import (
	"net/http"
	//"strings"
)

// handle tags endpoint
// sample GET: /api/v1/tags - list all tags in the system
func (s *Server) HandleTags() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}

		//select distinct to avoid duplicates
		rows, err := s.Db.QueryContext(r.Context(), `
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
