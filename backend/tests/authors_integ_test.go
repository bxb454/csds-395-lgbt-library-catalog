package tests

import (
	"encoding/json"
	"io"
	"net/http"
	"testing"
)

// Test Authors endpoint
func TestAuthorsGet(t *testing.T) {
	srv := newAPIServer(t)
	defer srv.Close()

	resp, err := http.Get(srv.URL + "/api/v1/authors")
	if err != nil {
		t.Fatalf("Failed to make request: %v", err)
	}
	defer resp.Body.Close()

	//Read the response body once
	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatalf("Failed to read response body: %v", err)
	}

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("Expected status 200, got %d. Body: %s", resp.StatusCode, string(bodyBytes))
	}

	//Author struct
	//Same as one found in models.go
	//We're gonna have to make those public
	type Author struct {
		AuthID int     `json:"authID"`
		LName  string  `json:"lname"`
		FName  *string `json:"fname"`
	}

	var authors []Author

	//Directly parse as array
	if err := json.Unmarshal(bodyBytes, &authors); err != nil {
		//But if that fails, try parsing as paginated response
		type AuthorsResponse struct {
			Data       []Author `json:"data"`
			Pagination struct {
				Total int `json:"total"`
			} `json:"pagination"`
		}

		var response AuthorsResponse
		if err := json.Unmarshal(bodyBytes, &response); err != nil {
			t.Fatalf("Failed to decode authors response as either array or paginated response: %v. Body: %s", err, string(bodyBytes))
		}
		authors = response.Data
	}

	if len(authors) != 3 {
		t.Fatalf("Expected 3 authors from test data, got %d", len(authors))
	}

	// Verify test data authors exist
	expectedAuthors := map[string]string{
		"Meyer":  "Cassandra",
		"Stone":  "Alex",
		"Rivera": "Marisol",
	}

	foundAuthors := make(map[string]bool)
	for _, author := range authors {
		if expectedFName, exists := expectedAuthors[author.LName]; exists {
			if author.FName == nil {
				t.Errorf("Author %s has null first name, expected '%s'", author.LName, expectedFName)
			} else if *author.FName != expectedFName {
				t.Errorf("Author %s has first name '%s', expected '%s'", author.LName, *author.FName, expectedFName)
			} else {
				foundAuthors[author.LName] = true
			}
		}
	}

	//Check that all expected authors found
	for lastName := range expectedAuthors {
		if !foundAuthors[lastName] {
			t.Errorf("Expected author '%s' not found in response", lastName)
		}
	}
}
