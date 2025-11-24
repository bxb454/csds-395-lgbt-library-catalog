build:
	go build -o api-server ./api

run-api:
	go run ./main.go api-server --port=8081

test:
	cd tests && go test -v ./...

tidy:
	go mod tidy
