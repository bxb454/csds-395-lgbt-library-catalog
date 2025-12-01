package tests

import (
	//"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"fmt"

	//"log"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"

	//"strconv"
	"testing"
	"time"

	//"strings"
	//"io"

	"github.com/bxb454/csds-395-lgbt-library-catalog/api"
	_ "github.com/go-sql-driver/mysql"

	//"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/modules/mysql"
)

var (
	testDB         *sql.DB
	mysqlContainer *mysql.MySQLContainer
)

//New things to add in future:
//t.Logf (add logging messages)

// This is our test driver. There's an exception to testing order here, this ALWAYS runs first.
// One per package
func TestMain(m *testing.M) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
	defer cancel()

	//Get the absolute path (outside of scope for this directory, couldn't use relative).
	schemaPath, err := filepath.Abs("../../Database Schema/bobbytables_integ.sql")
	if err != nil {
		panic(fmt.Sprintf("failed to get the absolute path: %v", err))
	}

	//Script is in same directory
	dummyScriptPath, err := filepath.Abs("dummyscript.sql")
	if err != nil {
		panic(fmt.Sprintf("failed to get the dummy script path: %v", err))
	}

	//Start MySQL container with DDL and test data script (DML)
	container, err := mysql.Run(ctx,
		//Use this version as mentioned in Testcontainers docs for MySQL (Go)
		"mysql:8.0.36",
		//dummy values are OK
		mysql.WithDatabase("testdb"),
		mysql.WithUsername("testuser"),
		mysql.WithPassword("testpass"),
		mysql.WithScripts(schemaPath, dummyScriptPath),
	)
	if err != nil {
		panic(fmt.Sprintf("Failed to start container: %v", err))
	}
	mysqlContainer = container

	//Get connection details to the Docker container
	host, err := container.Host(ctx)
	if err != nil {
		panic(fmt.Sprintf("Failed to get host: %v", err))
	}

	mappedPort, err := container.MappedPort(ctx, "3306/tcp")
	if err != nil {
		panic(fmt.Sprintf("Failed to get mapped port: %v", err))
	}

	//Connect to the fake DB
	//I think we should include parseTime=true to the sample DSN for README.
	dsn := fmt.Sprintf("testuser:testpass@tcp(%s:%s)/testdb?parseTime=true&multiStatements=true", host, mappedPort.Port())
	db, err := sql.Open("mysql", dsn)
	if err != nil {
		panic(fmt.Sprintf("Failed to open database: %v", err))
	}
	testDB = db

	//Wait for db to be ready
	if err := waitForDB(ctx, db); err != nil {
		panic(fmt.Sprintf("Database not ready: %v", err))
	}

	//Run tests
	code := m.Run()

	//Once tests done running, cleanup by closing connection and destroying container
	_ = db.Close()
	_ = container.Terminate(context.Background())
	os.Exit(code)
}

func waitForDB(ctx context.Context, db *sql.DB) error {
	for {
		if err := db.PingContext(ctx); err == nil {
			return nil
		}
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-time.After(500 * time.Millisecond):
			continue
		}
	}
}

// Helper to create dummy API server with test database
func newAPIServer(t *testing.T) *httptest.Server {
	t.Helper()
	srv := &api.Server{}
	srv.SetTestMode()

	//Had to make DB field public in api-server so these tests could work
	srv.Db = testDB

	//Create HTTP multiplexer and set up routes
	mainMux := http.NewServeMux()
	v1Mux := http.NewServeMux()

	//Routing (replicate core functionality from api-server.go)
	v1Mux.Handle("/users", srv.HandleUsers())
	v1Mux.Handle("/users/", srv.HandleUsers())
	v1Mux.Handle("/books", srv.HandleBooks())
	v1Mux.Handle("/books/", srv.HandleBookByID())
	v1Mux.Handle("/authors", srv.HandleAuthors())
	v1Mux.Handle("/tags", srv.HandleTags())
	v1Mux.Handle("/search", srv.HandleSearch())
	v1Mux.Handle("/loans", srv.HandleLoans())
	v1Mux.Handle("/loans/", srv.HandleLoans())

	//Rate-Limited Routes
	rateLimitedV1 := http.NewServeMux()
	rateLimitedV1.Handle("/users", srv.WrapLimiter(srv.HandleUsers()))
	rateLimitedV1.Handle("/users/", srv.WrapLimiter(srv.HandleUsers()))
	rateLimitedV1.Handle("/books", srv.WrapLimiter(srv.HandleBooks()))
	rateLimitedV1.Handle("/books/", srv.WrapLimiter(srv.HandleBookByID()))
	rateLimitedV1.Handle("/authors", srv.WrapLimiter(srv.HandleAuthors()))
	rateLimitedV1.Handle("/tags", srv.WrapLimiter(srv.HandleTags()))
	rateLimitedV1.Handle("/search", srv.WrapLimiter(srv.HandleSearch()))
	rateLimitedV1.Handle("/loans", srv.WrapLimiter(srv.HandleLoans()))
	rateLimitedV1.Handle("/loans/", srv.WrapLimiter(srv.HandleLoans()))

	mainMux.Handle("/api/v1/", http.StripPrefix("/api/v1", v1Mux))

	mainMux.HandleFunc("/healthz", func(w http.ResponseWriter, r *http.Request) {
		if err := testDB.PingContext(r.Context()); err != nil {
			http.Error(w, "db unavailable", http.StatusServiceUnavailable)
			return
		}
		w.Write([]byte("ok"))
	})

	//Create test server
	return httptest.NewServer(mainMux)
}

// Helper to decode the JSON response
func decodeJSONResponse[T any](t *testing.T, data []byte) T {
	t.Helper()
	var result T
	if err := json.Unmarshal(data, &result); err != nil {
		t.Fatalf("Failed to decode JSON response: %v", err)
	}
	return result
}
