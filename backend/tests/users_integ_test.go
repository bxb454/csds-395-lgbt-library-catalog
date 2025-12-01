package tests

import (
	"bytes"
	//"context"
	//"database/sql"
	"encoding/json"
	"io"
	"net/http"

	//"net/http/httptest"
	"testing"
	//"time"
)

// Test Users endpoint
func TestUsersGet(t *testing.T) {
	srv := newAPIServer(t)
	defer srv.Close()

	resp, err := http.Get(srv.URL + "/api/v1/users?limit=10&offset=0")
	if err != nil {
		t.Fatalf("Failed to make request: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("Expected status 200, got %d", resp.StatusCode)
	}

	type User struct {
		CaseID       string `json:"caseID"`
		Role         string `json:"role"`
		IsRestricted bool   `json:"isRestricted"`
	}

	type UsersResponse struct {
		Data       []User `json:"data"`
		Pagination struct {
			Limit   int  `json:"limit"`
			Offset  int  `json:"offset"`
			Total   int  `json:"total"`
			HasMore bool `json:"hasMore"`
		} `json:"pagination"`
	}

	//read response body
	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatalf("Failed to read response body: %v", err)
	}

	//Use helper function
	response := decodeJSONResponse[UsersResponse](t, bodyBytes)

	if len(response.Data) < 4 {
		t.Fatalf("Expected at least 4 users from test data, got %d", len(response.Data))
	}

	//Verify that the original test data users exist (from script)
	expectedUsers := map[string]string{
		"abc123": "patron",
		"abc124": "staff",
		"abc125": "admin",
		"abc126": "patron",
	}

	//Go through all of them
	for _, user := range response.Data {
		if expectedRole, exists := expectedUsers[user.CaseID]; exists {
			if user.Role != expectedRole {
				t.Errorf("User %s has role %s, expected %s", user.CaseID, user.Role, expectedRole)
			}
		}
	}
}

func TestUsersPost(t *testing.T) {
	srv := newAPIServer(t)
	defer srv.Close()

	payload := map[string]any{
		"caseID":       "xyz156",
		"role":         "patron",
		"isRestricted": false,
	}

	body, _ := json.Marshal(payload)
	resp, err := http.Post(srv.URL+"/api/v1/users", "application/json", bytes.NewReader(body))
	if err != nil {
		t.Fatalf("Failed to make request: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusCreated {
		bodyBytes, _ := io.ReadAll(resp.Body)
		t.Fatalf("Expected status 201, got %d. Body: %s", resp.StatusCode, string(bodyBytes))
	}

	//Check that it actually inserted
	var role string
	var isRestricted bool
	err = testDB.QueryRow("SELECT role, isRestricted FROM users WHERE caseID = ?", "xyz156").Scan(&role, &isRestricted)
	if err != nil {
		t.Fatalf("Failed to find created user: %v", err)
	}

	if role != "patron" {
		t.Errorf("Expected role 'patron', got '%s'", role)
	}
	if isRestricted {
		t.Errorf("Expected isRestricted false, got true")
	}
}

func TestUserGetSingle(t *testing.T) {
	srv := newAPIServer(t)
	defer srv.Close()

	resp, err := http.Get(srv.URL + "/api/v1/users/abc123")
	if err != nil {
		t.Fatalf("Failed to make request: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		t.Fatalf("Expected status 200, got %d. Body: %s", resp.StatusCode, string(bodyBytes))
	}

	type User struct {
		CaseID       string `json:"caseID"`
		Role         string `json:"role"`
		IsRestricted bool   `json:"isRestricted"`
	}

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatalf("Failed to read response body: %v", err)
	}
	user := decodeJSONResponse[User](t, bodyBytes)

	if user.CaseID != "abc123" {
		t.Errorf("Expected caseID 'abc123', got '%s'", user.CaseID)
	}
	if user.Role != "patron" {
		t.Errorf("Expected role 'patron', got '%s'", user.Role)
	}
}

func TestUserDelete(t *testing.T) {
	srv := newAPIServer(t)
	defer srv.Close()

	req, err := http.NewRequest(http.MethodDelete, srv.URL+"/api/v1/users/abc126", nil)
	if err != nil {
		t.Fatalf("Failed to create request: %v", err)
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("Failed to make request: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusNoContent {
		bodyBytes, _ := io.ReadAll(resp.Body)
		t.Fatalf("Expected status 204, got %d. Body: %s", resp.StatusCode, string(bodyBytes))
	}
}
