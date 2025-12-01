package tests

import (
	//"bytes"
	"encoding/json"
	"io"
	"net/http"
	"testing"
)

// Test the tags endpoint
func TestTagsGet(t *testing.T) {
	srv := newAPIServer(t)
	defer srv.Close()

	resp, err := http.Get(srv.URL + "/api/v1/tags")
	if err != nil {
		t.Fatalf("Failed to make request: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		t.Fatalf("Expected status 200, got %d. Body: %s", resp.StatusCode, string(bodyBytes))
	}

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatalf("Failed to read response body: %v", err)
	}

	var tags []string
	if err := json.Unmarshal(bodyBytes, &tags); err != nil {
		t.Fatalf("Failed to decode tags response: %v", err)
	}

	// Verify that test data tags exist
	expectedTags := map[string]bool{
		"fantasy":     false,
		"young adult": false,
		"history":     false,
		"lgbtq":       false,
		"memoir":      false,
		"activism":    false,
	}

	for _, tag := range tags {
		if _, exists := expectedTags[tag]; exists {
			expectedTags[tag] = true
		}
	}

	for tag, found := range expectedTags {
		if !found {
			t.Errorf("Expected tag '%s' not found in response: %v", tag, tags)
		}
	}
}
