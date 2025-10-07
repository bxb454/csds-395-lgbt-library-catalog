package main

import (
	"bufio"
	"flag"
	"fmt"
	"log"
	"os"
	"strings"

	//"./cas"
	cas_test "github.com/bxb454/csds-395-lgbt-library-catalog/cas"
)

func main() {
	if len(os.Args) < 2 {
		fmt.Println("Usage: go run main.go <command> [options]")
		fmt.Println("Commands:")
		fmt.Println("  auth-server    - Start the CAS authentication server")
		fmt.Println("  api-server     - Start the main API server (with DB)")
		fmt.Println("  test-cas       - Test CAS authentication")
		fmt.Println("  test-simple    - Test endpoints without auth")
		os.Exit(1)
	}

	command := os.Args[1]
	os.Args = append(os.Args[:1], os.Args[2:]...)

	switch command {
	case "auth-server":
		startAuthServer()
	case "api-server":
		startAPIServer()
	case "test-cas":
		cas_test.RunCASTest()
	case "test-simple":
		runSimpleTest()
	default:
		log.Fatalf("Unknown command: %s", command)
	}
}

func startAuthServer() {
	var port = flag.String("port", "8080", "Port for auth server")
	flag.Parse()

	fmt.Printf("Starting CAS authentication server on port %s...\n", *port)
	cas_test.RunCASServer(*port)
}

func startAPIServer() {
	var port = flag.String("port", "8081", "Port for API server")
	var dbURL = flag.String("db", "localhost:5432", "Database URL")
	flag.Parse()

	fmt.Printf("Starting API server on port %s, connecting to DB at %s...\n", *port, *dbURL)
	//runAPIServer(*port, *dbURL)
}

func runSimpleTest() {
	if len(os.Args) < 2 {
		fmt.Println("Usage: go run main.go test-simple <endpoint>")
		fmt.Println("Example: go run main.go test-simple /healthz")
		os.Exit(1)
	}
	endpoint := os.Args[1]
	fmt.Printf("Testing endpoint: %s\n", endpoint)

	// Prompt for credentials
	reader := bufio.NewReader(os.Stdin)
	fmt.Print("Enter CWRU username: ")
	username, err := reader.ReadString('\n')
	if err != nil {
		log.Fatal("Error reading username:", err)
	}
	username = strings.TrimSpace(username)

	fmt.Print("Enter CWRU password: ")
	passwordBytes, err := cas_test.ReadPassword("")
	if err != nil {
		log.Fatal("Error reading password:", err)
	}
	password := strings.TrimSpace(string(passwordBytes))

	// Instantiate CASClient and test endpoint
	client := cas_test.NewCASClient(username, password)
	if err := client.TestEndPoint(endpoint); err != nil {
		log.Fatalf("Error testing endpoint: %v", err)
	}
}
