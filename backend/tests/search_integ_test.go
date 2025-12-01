package tests

import (
	//"bytes"
	//"encoding/json"
	"io"
	"net/http"
	"testing"
)

// Test Search endpoint
func TestSearch(t *testing.T) {
	srv := newAPIServer(t)
	defer srv.Close()

	resp, err := http.Get(srv.URL + "/api/v1/search?q=Stone&limit=5&offset=0")
	if err != nil {
		t.Fatalf("Failed to make request: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		t.Fatalf("Expected status 200, got %d. Body: %s", resp.StatusCode, string(bodyBytes))
	}

	type SearchResult struct {
		Type string `json:"type"`
		ID   any    `json:"id"`
		Name string `json:"name"`
	}

	type SearchResponse struct {
		Data       []SearchResult `json:"data"`
		Pagination struct {
			Total int `json:"total"`
		} `json:"pagination"`
	}

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatalf("Failed to read response body: %v", err)
	}
	response := decodeJSONResponse[SearchResponse](t, bodyBytes)

	//should find author "Alex Stone"
	found := false
	for _, result := range response.Data {
		if result.Type == "author" && result.Name == "Alex Stone" {
			found = true
			break
		}
	}

	if !found {
		t.Errorf("Search for 'Stone' should return author 'Alex Stone'")
	}
}
