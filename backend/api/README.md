### written by boris brondz


# This is a guide on how to run the backend API.


**I. Read DBDev.README in Database Schema and set up the tables on your local instance of MySQL if you haven't already**


**II. Set the environment variable CATALOG_DB_DSN to ensure that the MySQL driver for golang can find the correct DSN (Data Source Name) for the MySQL DB.**

Note, this is specific for windows. you'd use export command on a Linux/Unix based (MacOS) system. Also, port 3306 is usually the default port for MySQL.

**Windows (on PowerShell)**
```powershell
setx CATALOG_DB_DSN "{username}:{password}@tcp(localhost:3306)/catalog?parseTime=true"
```
**Linux/Unix (macOS) (bash/zsh shell)**

```bash
export CATALOG_DB_DSN="{username}:{password}@tcp(localhost:3306)/catalog?parseTime=true"
```

username and password are your username and password (local), respectively.


**III. assuming you're in the main directory, run this in the terminal:**

```bash
go run ./backend/main.go api-server --port=8081
```


**note:**
if you don't include --port flag it will by default run on port 8081, CAS is supposed to run on port 8080. This can be changed. Code for this is in backend/main.go

#### Optionally, you can utilize the Makefile instead (if you are on Unix/Linux-based system): ####

the project includes a Makefile for simplified execution of commands:

```bash

#run api server with default commands
make run-api

#clean up Go module dependencies
make tidy
```

# if you're working on the frontend, read this part --

## API Endpoints Reference

Base URL: `http://localhost:8081/api/v1`

### **Books**

#### List/Search Books
```http
GET /books?limit=10&offset=0&title=Stone&publisher=Firebrand
```

**Query Parameters:**
- `limit` (optional): Number of results per page (default: 10, max: 100)
- `offset` (optional): Pagination offset (default: 0)
- `title` (optional): Filter by book title (partial match)
- `isbn` (optional): Filter by ISBN (exact match)
- `publisher` (optional): Filter by publisher (partial match)

**Response:**
```json
{
  "data": [
    {
      "id": 1000,
      "isbn": "9781555838539",
      "title": "Stone Butch Blues",
      "pubdate": "1993-01-01",
      "publisher": "Firebrand Books",
      "edition": "1st Edition",
      "copies": 3,
      "loanMetrics": 0
    }
  ],
  "pagination": {
    "limit": 10,
    "offset": 0,
    "total": 1,
    "hasMore": false
  }
}
```

#### Create Book
```http
POST /books
Content-Type: application/json

{
  "isbn": "9781555838539",
  "title": "Stone Butch Blues",
  "pubdate": "1993-01-01",
  "publisher": "Firebrand Books",
  "edition": "1st Edition",
  "copies": 3
}
```

#### Get Book by ID
```http
GET /books/{bookID}
```

#### Update Book
```http
PUT /books/{bookID}
Content-Type: application/json

{
  "isbn": "9781555838539",
  "title": "Stone Butch Blues (Updated)",
  "pubdate": "1993-01-01",
  "publisher": "Firebrand Books",
  "edition": "2nd Edition",
  "copies": 5
}
```

#### Delete Book
```http
DELETE /books/{bookID}
```

### **Book-Author Relationships**

#### List Authors for a Book
```http
GET /books/{bookID}/authors
```

**Response:**
```json
[
  {
    "authID": 1000,
    "lname": "Feinberg",
    "fname": "Leslie"
  }
]
```

#### Add Author to Book
```http
POST /books/{bookID}/authors
Content-Type: application/json

{
  "authID": 1000
}
```

#### Remove Author from Book
```http
DELETE /books/{bookID}/authors/{authID}
```


### **Book-Tag Relationships**

#### List Tags for a Book
```http
GET /books/{bookID}/tags
```

**Response:**
```json
["LGBTQ", "Fiction", "Coming of Age"]
```

#### Add Tag to Book
```http
POST /books/{bookID}/tags
Content-Type: application/json

{
  "tag": "LGBTQ"
}
```

#### Remove Tag from Book
```http
DELETE /books/{bookID}/tags/{tag}
```


### **Authors**

#### List All Authors
```http
GET /authors
```

**Response:**
```json
[
  {
    "authID": 1000,
    "lname": "Feinberg",
    "fname": "Leslie"
  }
]
```

#### Create Author
```http
POST /authors
Content-Type: application/json

{
  "lname": "Feinberg",
  "fname": "Leslie"
}
```


### **Tags**

#### List All Unique Tags
```http
GET /tags
```

**Response:**
```json
["Coming of Age", "Fiction", "LGBTQ", "Transgender"]
```


### **Users**

#### List Users
```http
GET /users?limit=10&offset=0
```

**Response:**
```json
{
  "data": [
    {
      "caseID": "U1234567",
      "role": "patron",
      "isRestricted": false
    }
  ],
  "pagination": {
    "limit": 10,
    "offset": 0,
    "total": 1,
    "hasMore": false
  }
}
```

#### Create User
```http
POST /users
Content-Type: application/json

{
  "caseID": "U1234567",
  "role": "patron",
  "isRestricted": false
}
```

**Valid Roles:** `guest`, `patron`, `staff`, `admin`

#### Get User by Case ID
```http
GET /users/{caseID}
```

#### Update User
```http
PATCH /users/{caseID}
Content-Type: application/json

{
  "role": "staff",
  "isRestricted": false
}
```

#### Delete User
```http
DELETE /users/{caseID}
```


### **Loans**

#### List All Loans
```http
GET /loans
```

**Response:**
```json
[
  {
    "loanID": 1000,
    "bookID": 1001,
    "caseID": "U1234567",
    "loanDate": "2025-10-17",
    "dueDate": "2025-10-31",
    "numRenewals": 0
  }
]
```

#### Create Loan (Checkout)
```http
POST /loans
Content-Type: application/json

{
  "bookID": 1001,
  "caseID": "U1234567",
  "loanDate": "2025-10-17",
  "dueDate": "2025-10-31",
  "numRenewals": 0
}
```

#### get Loan by ID
```http
GET /loans/{loanID}
```

#### renew Loan
```http
PATCH /loans/{loanID}/renew
```

**Note:** The server automatically extends the due date by 14 days and increments `numRenewals`.

#### return book (Delete Loan)
```http
DELETE /loans/{loanID}
```


### **search**

search across books, authors, and tags with a single query.

```http
GET /search?q=Stone&limit=5&offset=0
```

**Response:**
```json
{
  "data": [
    {
      "type": "book",
      "id": 1000,
      "name": "Stone Butch Blues"
    },
    {
      "type": "author",
      "id": 1001,
      "name": "Leslie Feinberg"
    },
    {
      "type": "tag",
      "id": null,
      "name": "Stonewall"
    }
  ],
  "pagination": {
    "limit": 5,
    "offset": 0,
    "total": 3,
    "hasMore": false
  }
}
```


### **health check**

```http
GET /healthz
```

**response (success):**
```
ok
```

**response (DB Down (you didn't set it up or it's down)):**
```
503 Service Unavailable
db unavailable
```

## Frontend Integration Examples

### Using Axios (Recommended)

```javascript
import axios from 'axios';

//this is the local connection
const API_BASE = 'http://localhost:8081/api/v1';

//listing books with filters
const books = await axios.get(`${API_BASE}/books`, {
  params: {
    limit: 10,
    offset: 0,
    title: 'Stone'
  }
});

//create a book
const newBook = await axios.post(`${API_BASE}/books`, {
  title: "Stone Butch Blues",
  copies: 3,
  isbn: "9781555838539",
  pubdate: "1993-01-01",
  publisher: "Firebrand Books"
});

//update a book
await axios.put(`${API_BASE}/books/1000`, {
  title: "Stone Butch Blues (Updated)",
  copies: 5
});

//delete a book
await axios.delete(`${API_BASE}/books/1000`);

//checkout a book
await axios.post(`${API_BASE}/loans`, {
  bookID: 1001,
  caseID: "U1234567",
  loanDate: "2025-10-17",
  dueDate: "2025-10-31",
  numRenewals: 0
});

//renew a loan
await axios.patch(`${API_BASE}/loans/1000/renew`);

//search
const results = await axios.get(`${API_BASE}/search`, {
  params: { q: "Stone", limit: 5 }
});

//add tag to book
await axios.post(`${API_BASE}/books/1000/tags`, {
  tag: "LGBT"
});

//add author to book
await axios.post(`${API_BASE}/books/1000/authors`, {
  authID: 1001
});
```

### Using Fetch API (not recommended)

```javascript
//GET request
fetch('http://localhost:8081/api/v1/books')
  .then(res => res.json())
  .then(data => console.log(data));

//POST request
fetch('http://localhost:8081/api/v1/books', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: "Stone Butch Blues",
    copies: 3,
    isbn: "9781555838539",
    pubdate: "1993-01-01",
    publisher: "Firebrand Books"
  })
}).then(res => res.json()).then(console.log);

//PUT request
fetch('http://localhost:8081/api/v1/books/1000', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ copies: 5 })
}).then(res => res.json()).then(console.log);

//DELETE request
fetch('http://localhost:8081/api/v1/books/1000', {
  method: 'DELETE'
}).then(res => console.log(res.status));
```


## Testing with cURL (Local API testing)

note: Before doing this, insert some dummy values into your DB.

### Books
```bash
#list books
curl "http://localhost:8081/api/v1/books?limit=10&offset=0"

#create book
curl -X POST http://localhost:8081/api/v1/books \
  -H "Content-Type: application/json" \
  -d '{
    "isbn": "9781555838539",
    "title": "Stone Butch Blues",
    "pubdate": "1993-01-01",
    "publisher": "Firebrand Books",
    "copies": 3
  }'

#get book by ID
curl http://localhost:8081/api/v1/books/1000

#update book
curl -X PUT http://localhost:8081/api/v1/books/1000 \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Stone Butch Blues",
    "copies": 5
  }'

#delete book
curl -X DELETE http://localhost:8081/api/v1/books/1000
```

### Users
```bash
#create a user
curl -X POST http://localhost:8081/api/v1/users \
  -H "Content-Type: application/json" \
  -d '{
    "caseID": "U1234567",
    "role": "patron",
    "isRestricted": false
  }'

#get a user
curl http://localhost:8081/api/v1/users/U1234567

#update a user
curl -X PATCH http://localhost:8081/api/v1/users/U1234567 \
  -H "Content-Type: application/json" \
  -d '{
    "role": "staff",
    "isRestricted": false
  }'
```

### Loans
```bash
#create a new loan (checkout)
curl -X POST http://localhost:8081/api/v1/loans \
  -H "Content-Type: application/json" \
  -d '{
    "bookID": 1000,
    "caseID": "U1234567",
    "loanDate": "2025-10-17",
    "dueDate": "2025-10-31",
    "numRenewals": 0
  }'

#renew a loan
curl -X PATCH http://localhost:8081/api/v1/loans/1000/renew

#return a book (delete loan)
curl -X DELETE http://localhost:8081/api/v1/loans/1000
```

### Tags and Authors
```bash
#get all tags
curl http://localhost:8081/api/v1/tags

#add tag to book
curl -X POST http://localhost:8081/api/v1/books/1000/tags \
  -H "Content-Type: application/json" \
  -d '{"tag": "LGBTQ"}'

#get authors for book
curl http://localhost:8081/api/v1/books/1000/authors

#add author to book
curl -X POST http://localhost:8081/api/v1/books/1000/authors \
  -H "Content-Type: application/json" \
  -d '{"authID": 1001}'
```

### Search Function
```bash
curl "http://localhost:8081/api/v1/search?q=Stone&limit=5&offset=0"
```


## Important Notes

### Rate Limiting
The API enforces rate limiting per IP address:
- **10 requests per second**
- **Burst capacity: 10 requests**

If you exceed the rate limit, you will receive a `429 Too Many Requests` error.

### Pagination Rules
Most of the collection endpoints (books, users, loans) support pagination with:
- `limit`: Results per page (default: 10, max: 100)
- `offset`: Number of records to skip (default: 0)

### Error Responses
Common HTTP status codes, if you aren't familiar with them:
- `200 OK`: Successful GET request
- `201 Created`: Successful POST request
- `204 No Content`: Successful PUT/PATCH/DELETE request
- `400 Bad Request`: Invalid request body or parameters
- `404 Not Found`: Resource doesn't exist
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Database or server error


### CORS
If you're running the frontend on a different port, you may need to configure CORS headers in the API server.


## Contributors
- Boris Brondz (Books, Users, Search, Tags)
- Daniel Burwell (Authors, Loans)