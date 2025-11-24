package api

import (
	"database/sql"
	"net/http"
	"sync"
	"time"

	"golang.org/x/time/rate"
)

// Set the test rate limit bursts/intervals for the rate limiter. I might've thought that some errors caused during testing
// Were caused by
func (s *Server) SetTestMode() {
	s.rateInterval = time.Second
	s.rateBurst = 100
}

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

// dan structs
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
	Db           *sql.DB
	router       *http.ServeMux
	limiters     map[string]*rate.Limiter
	limitMu      sync.Mutex
	rateInterval time.Duration
	rateBurst    int
}
