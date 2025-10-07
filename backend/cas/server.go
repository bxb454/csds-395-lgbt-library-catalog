package cas

import (
	"log"
	"net/http"
	"net/url"

	cas_auth "gopkg.in/cas.v2"
)

//ignore all of this

// RunCASServer starts the CAS authentication server
func RunCASServer(port string) {
	mux := http.NewServeMux()

	// Public healthcheck
	mux.HandleFunc("/healthz", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("auth-server ok"))
	})

	// Protected example endpoint
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if !cas_auth.IsAuthenticated(r) {
			cas_auth.RedirectToLogin(w, r)
			return
		}
		user := cas_auth.Username(r)
		w.Header().Set("Content-Type", "text/plain")
		w.Write([]byte("hello, " + user + " (from auth server)\n"))
	})

	// Validate endpoint for API server to check authentication
	mux.HandleFunc("/validate", func(w http.ResponseWriter, r *http.Request) {
		if !cas_auth.IsAuthenticated(r) {
			w.WriteHeader(http.StatusUnauthorized)
			w.Write([]byte("unauthorized"))
			return
		}
		user := cas_auth.Username(r)
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"user":"` + user + `","authenticated":true}`))
	})

	// Local logout
	mux.HandleFunc("/logout", func(w http.ResponseWriter, r *http.Request) {
		cas_auth.RedirectToLogout(w, r)
	})

	// Create CAS client middleware
	casURL, _ := url.Parse("https://login.case.edu/cas")
	client := cas_auth.NewClient(&cas_auth.Options{
		URL: casURL,
	})

	addr := ":" + port
	log.Printf("CAS auth server listening on %s", addr)
	if err := http.ListenAndServe(addr, client.Handle(mux)); err != nil {
		log.Fatal(err)
	}
}
