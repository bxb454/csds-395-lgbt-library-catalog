package tests

import (
	"bytes"
	"encoding/json"
	"io"
	"log"
	"net/http"
	"strconv"
	"testing"
	"time"
)

func TestLoansGet(t *testing.T) {
	srv := newAPIServer(t)
	defer srv.Close()

	resp, err := http.Get(srv.URL + "/api/v1/loans")
	if err != nil {
		t.Fatalf("failed to make request: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		t.Fatalf("expected status 200, got %d. Body: %s", resp.StatusCode, string(bodyBytes))
	}

	bodyBytes, err := io.ReadAll(resp.Body)
	log.Printf("Loans GET response body: %s", string(bodyBytes))
	if err != nil {
		t.Fatalf("failed to read response body: %v", err)
	}

	//Should seriously just make the models public
	type Loan struct {
		LoanID      int       `json:"loanID"`
		BookID      int       `json:"bookID"`
		CaseID      *string   `json:"caseID"`
		LoanDate    time.Time `json:"loanDate"`
		DueDate     time.Time `json:"dueDate"`
		NumRenewals int       `json:"numRenewals"`
	}

	var loans []Loan
	if err := json.Unmarshal(bodyBytes, &loans); err != nil {
		t.Fatalf("failed to decode loans response: %v", err)
	}

	if len(loans) == 0 {
		t.Errorf("expected at least one loan from test data, got %d", len(loans))
	}
}

var LastCreatedLoanID int64

func TestLoansLifecycle(t *testing.T) {
	srv := newAPIServer(t)
	defer srv.Close()

	var createdLoanID int64

	t.Run("Create", func(t *testing.T) {
		payload := map[string]any{
			"bookID":      1000,
			"caseID":      "abc123",
			"loanDate":    "2024-01-17T00:00:00Z",
			"dueDate":     "2024-01-31T00:00:00Z",
			"numRenewals": 0,
		}

		jsonPayload, err := json.Marshal(payload)
		if err != nil {
			t.Fatalf("failed to marshal request payload: %v", err)
		}

		resp, err := http.Post(srv.URL+"/api/v1/loans", "application/json", bytes.NewBuffer(jsonPayload))
		if err != nil {
			t.Fatalf("failed to make request: %v", err)
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusCreated {
			bodyBytes, _ := io.ReadAll(resp.Body)
			t.Fatalf("expected status 201, got %d. Body: %s", resp.StatusCode, string(bodyBytes))
		}

		type CreateResponse struct {
			ID int64 `json:"id"`
		}

		bodyBytes, err := io.ReadAll(resp.Body)
		if err != nil {
			t.Fatalf("failed to read response body: %v", err)
		}

		response := decodeJSONResponse[CreateResponse](t, bodyBytes)

		if response.ID == 0 {
			t.Fatalf("expected non-zero loan ID in response")
		}

		createdLoanID = response.ID
		t.Logf("Created loan with ID: %d", createdLoanID)

		//Verify that loan was created in database
		var bookID int
		var caseID string
		err = testDB.QueryRow("SELECT bookID, caseID FROM loan WHERE loanID = ?", response.ID).Scan(&bookID, &caseID)
		if err != nil {
			t.Fatalf("failed to find created loan: %v", err)
		}

		if bookID != 1000 {
			t.Errorf("expected bookID 1000, got %d", bookID)
		}
		if caseID != "abc123" {
			t.Errorf("expected caseID 'abc123', got '%s'", caseID)
		}
	})

	t.Run("Delete", func(t *testing.T) {
		if createdLoanID == 0 {
			t.Fatal("No loan ID from create test")
		}

		req, err := http.NewRequest(http.MethodDelete,
			srv.URL+"/api/v1/loans/"+strconv.Itoa(int(createdLoanID)), nil)
		if err != nil {
			t.Fatalf("failed to create request: %v", err)
		}

		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			t.Fatalf("failed to make request: %v", err)
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusNoContent {
			bodyBytes, _ := io.ReadAll(resp.Body)
			t.Fatalf("expected status 204, got %d. Body: %s", resp.StatusCode, string(bodyBytes))
		}

		//Verify deletion
		var count int
		err = testDB.QueryRow("SELECT COUNT(*) FROM loan WHERE loanID = ?", createdLoanID).Scan(&count)
		if err != nil {
			t.Fatalf("failed to query for deleted loan: %v", err)
		}
		if count != 0 {
			t.Errorf("expected loanID: %d to be deleted, but found %d records", createdLoanID, count)
		}

		t.Logf("Successfully deleted loan ID: %d", createdLoanID)
	})
}
