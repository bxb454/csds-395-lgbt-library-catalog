package tests

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"testing"
)

// Test Books endpoint
func TestBooksGet(t *testing.T) {
	srv := newAPIServer(t)
	defer srv.Close()

	resp, err := http.Get(srv.URL + "/api/v1/books?limit=10&offset=0")
	if err != nil {
		t.Fatalf("Failed to make request: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		t.Fatalf("Expected status 200, got %d. Body: %s", resp.StatusCode, string(bodyBytes))
	}

	type Book struct {
		BookID      int     `json:"bookID"`
		ISBN        *string `json:"isbn"`
		Title       string  `json:"title"`
		Publisher   *string `json:"publisher"`
		Edition     *string `json:"edition"`
		Copies      int     `json:"copies"`
		LoanMetrics int     `json:"loanMetrics"`
	}

	type BooksResponse struct {
		Data       []Book `json:"data"`
		Pagination struct {
			Limit   int  `json:"limit"`
			Offset  int  `json:"offset"`
			Total   int  `json:"total"`
			HasMore bool `json:"hasMore"`
		} `json:"pagination"`
	}

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatalf("Failed to read response body: %v", err)
	}
	response := decodeJSONResponse[BooksResponse](t, bodyBytes)

	if len(response.Data) != 3 {
		t.Fatalf("Expected 3 books from test data, got %d", len(response.Data))
	}

	//Verify test data books exist
	expectedTitles := map[string]bool{
		"Twilight Reflections": false,
		"Voices of Pride":      false,
		"Hidden Histories":     false,
	}

	for _, book := range response.Data {
		if _, exists := expectedTitles[book.Title]; exists {
			expectedTitles[book.Title] = true
		}
	}

	for title, found := range expectedTitles {
		if !found {
			t.Errorf("Expected book '%s' not found in response", title)
		}
	}
}

func TestBooksPost(t *testing.T) {
	srv := newAPIServer(t)
	defer srv.Close()

	payload := map[string]any{
		"isbn":        "9781234567890",
		"title":       "Test Book Title",
		"pubdate":     "2023-01-01",
		"publisher":   "Test Publisher",
		"edition":     "1st",
		"copies":      5,
		"loanMetrics": 0,
		"thumbnail":   nil,
		//loanMetrics is set to 0 automatically in the INSERT statement
		//thumbnail can be omitted
	}

	body, _ := json.Marshal(payload)
	resp, err := http.Post(srv.URL+"/api/v1/books", "application/json", bytes.NewReader(body))
	if err != nil {
		t.Fatalf("Failed to make request: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusCreated {
		bodyBytes, _ := io.ReadAll(resp.Body)
		t.Fatalf("Expected status 201, got %d. Body: %s", resp.StatusCode, string(bodyBytes))
	}

	type CreateResponse struct {
		ID int64 `json:"id"`
	}

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatalf("Failed to read response body: %v", err)
	}
	response := decodeJSONResponse[CreateResponse](t, bodyBytes)

	if response.ID == 0 {
		t.Fatalf("Expected non-zero book ID in response")
	}

	//Verify that book was created in database
	var title string
	var copies int
	err = testDB.QueryRow("SELECT title, copies FROM books WHERE bookID = ?", response.ID).Scan(&title, &copies)
	if err != nil {
		t.Fatalf("Failed to find created book: %v", err)
	}

	if title != "Test Book Title" {
		t.Errorf("Expected title 'Test Book Title', got '%s'", title)
	}
	if copies != 5 {
		t.Errorf("Expected 5 copies, got %d", copies)
	}

}

func TestBooksGetSingle(t *testing.T) {
	srv := newAPIServer(t)
	defer srv.Close()

	resp, err := http.Get(srv.URL + "/api/v1/books/1000")
	if err != nil {
		t.Fatalf("Failed to make request: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		//t.Logf("Response Body: %s", string(bodyBytes))
		t.Fatalf("Expected status 200, got %d. Body: %s", resp.StatusCode, string(bodyBytes))
	}

	type Book struct {
		BookID    int    `json:"id"`
		Title     string `json:"title"`
		Copies    int    `json:"copies"`
		Publisher string `json:"publisher"`
	}

	bodyBytes, err := io.ReadAll(resp.Body)
	t.Logf("Book Single Response Body: %s", string(bodyBytes))
	if err != nil {
		t.Fatalf("Failed to read response body: %v", err)
	}
	book := decodeJSONResponse[Book](t, bodyBytes)
	t.Logf("Specific Book Response: %+v", book)

	if book.BookID != 1000 {
		t.Errorf("Expected bookID 1000, got %d", book.BookID)
	}
	if book.Title != "Twilight Reflections" {
		t.Errorf("Expected title 'Twilight Reflections', got '%s'", book.Title)
	}
}
