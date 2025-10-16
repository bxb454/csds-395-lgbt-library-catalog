package main

import (
	//"bufio"
	"flag"
	"fmt"
	"log"
	"os"
	//"strings"

	//"./cas"
	api "github.com/bxb454/csds-395-lgbt-library-catalog/backend/api"
	cas_test "github.com/bxb454/csds-395-lgbt-library-catalog/backend/cas"
)

func main() {
	if len(os.Args) < 2 {
		fmt.Println("Usage: go run main.go <command> [options]")
		fmt.Println("Commands:")
		fmt.Println("auth-server    - Start the CAS authentication server")
		fmt.Println("api-server     - Start the main API server (with DB)")
		fmt.Println("test-cas       - Test CAS authentication")
		fmt.Println("test-simple    - Test endpoints without auth")
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
		//cas_test.RunCASTest()
	case "test-simple":
		//runSimpleTest()
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
	flag.Parse()

	srv, err := api.New()
	if err != nil {
		log.Fatalf("failed to start API server: %v", err)
	}

	addr := ":" + *port
	fmt.Printf("Starting the API server on %s...\n", addr)
	if err := srv.Serve(addr); err != nil {
		log.Fatalf("API server exited: %v", err)
	}
}

/*
func runSimpleTest() {
	if len(os.Args) < 2 {
		fmt.Println("Usage: go run main.go test-simple <endpoint>")
		fmt.Println("Example: go run main.go test-simple /healthz")
		os.Exit(1)
	}
	endpoint := os.Args[1]
	fmt.Printf("Testing endpoint: %s\n", endpoint)

	//this doesn't work but you prompt for credentials
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

	//instantiate CASClient and test endpoint
	client := cas_test.NewCASClient(username, password)
	if err := client.TestEndPoint(endpoint); err != nil {
		log.Fatalf("Error testing endpoint: %v", err)
	}
}
*/
