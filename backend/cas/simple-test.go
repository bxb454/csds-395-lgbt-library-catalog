package cas

import (
	"fmt"
	"io"
	"log"
	"net/http"
	"net/http/cookiejar"
	"os"
	"strings"
)

//IGNORE ALL OF THIS FOR NOW

func TestEndpoint() {
	if len(os.Args) < 2 {
		fmt.Println("Usage: go run simple_test.go <endpoint>")
		fmt.Println("Example: go run simple_test.go /")
		fmt.Println("go run simple_test.go /healthz")
		fmt.Println("go run simple_test.go /logout")
		os.Exit(1)
	}

	endpoint := os.Args[1]
	testURL := "http://localhost:8080" + endpoint

	//create HTTP client with cookie jar to maintain session
	jar, _ := cookiejar.New(nil)
	client := &http.Client{Jar: jar}

	fmt.Printf("==================%s\n", strings.Repeat("=", len(testURL)))

	resp, err := client.Get(testURL)
	if err != nil {
		log.Fatal("Error making request:", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Fatal("Error reading response:", err)
	}

	fmt.Printf("Status Code: %d %s\n", resp.StatusCode, resp.Status)
	fmt.Printf("Final URL: %s\n", resp.Request.URL.String())
	fmt.Printf("Content-Type: %s\n", resp.Header.Get("Content-Type"))
	fmt.Println("Response Body:")
	fmt.Println("-------------")
	fmt.Println(string(body))

	// If we got redirected to CAS, inform the user
	if resp.Request.URL.Host != "localhost:8080" {
		fmt.Println("this endpoint requires authentication")
		fmt.Printf("you were redirected to: %s\n", resp.Request.URL.String())
		fmt.Println("Use the full CLI tester (test_cas_cli.go) to test with credentials.")
	}
}
