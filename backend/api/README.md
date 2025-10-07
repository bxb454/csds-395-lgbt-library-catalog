### written by boris brondz

# this is a guide on how to run the backend API

1. read DBDev.README in Database Schema and set up the tables on your local instance of MySQL if you haven't already

2. set the environment variable CATALOG_DB_DSN to ensure that the MySQL driver for golang can find the correct DSN (Data Source Name) for the MySQL DB.

note, this is specific for windows. you'd use export command on a Linux/Unix based (MacOS) system.

'setx CATALOG_DB_DSN "{username}:{password}@tcp(localhost:3306)/catalog?parseTime=true"'

username and password are your username and password (local), respectively.

3. assuming you're in the main directory, run this in the terminal:

'go run ./backend/main.go api-server --port=8081'

note:
if you don't include --port flag it will by default run on port 8081, CAS is supposed to run on port 8080. This can be changed. Code for this is in backend/main.go

if you're working on the frontend, read this part --

here's what sample calls would look like, using fetch library in js:

GET example:

In this example, we're using a GET request to list all books

```
fetch("http://localhost:8081/api/v1/books")
  .then(res => res.json())
  .then(data => console.log(data));
```

POST example:

```
fetch("http://localhost:8081/api/v1/books", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    title: "Stone Butch Blues",
    copies: 3,
    isbn: "9781555838539",
    pubdate: "1993-01-01",
    publisher: "Firebrand"
  })
}).then(res => res.json()).then(console.log);
```

PUT example:

```
fetch("http://localhost:8081/api/v1/books/1001", {
  method: "PUT",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ copies: 4 })
}).then(res => res.json()).then(console.log);
```

DELETE example: 

```
fetch("http://localhost:8081/api/v1/books/1001", { method: "DELETE" })
  .then(res => console.log(res.status));
```

i recommend you use axios instead to make your life easier.