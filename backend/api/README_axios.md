### EXAMPLE CALLS WITH AXIOS YOU CAN UTILIZE

```javascript
import axios from 'axios';

//USE AXIOS because it has automatic JSON parsing, promise-based, etc...

/*would it just be https://lgbt-cat.case.edu:8081/api/v1/?*/
const API_BASE = 'http://localhost:8081/api/v1';

//Here are some sample calls you can make with Axios for frontend integration

//Listing books with pagination
async function getBooks(page = 1, pageSize = 10) {
  const offset = (page - 1) * pageSize;
  
  const response = await axios.get(`${API_BASE}/books`, {
    params: {
      limit: pageSize,
      offset: offset
    }
  });
  
  return {
    books: response.data.data,
    pagination: response.data.pagination,
    currentPage: page,
    totalPages: Math.ceil(response.data.pagination.total / pageSize)
  };
}

/*
    What an example response would look like:

    GET http://localhost:8081/api/v1/books?limit=10&offset=0

    {
      "data": [
        {
          "bookID": 1000,
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
     "total": 45,
     "hasMore": true
     }
   }

*/

//Search books with filters and pagination
async function searchBooks(filters, page = 1, pageSize = 10) {
  const offset = (page - 1) * pageSize;
  
  const response = await axios.get(`${API_BASE}/books`, {
    params: {
      title: filters.title,        // Optional: partial match
      isbn: filters.isbn,          // Optional: exact match
      publisher: filters.publisher, // Optional: partial match
      limit: pageSize,
      offset: offset
    }
  });
  
  return response.data;
}

/*
  What examples responses could look like:
  
  REST Call: GET /books?title=Stone&publisher=Firebrand&limit=10&offset=0
  
  PARTIAL MATCHING EXPLAINED:
 * - title: CASE-INSENSITIVE partial match using SQL LIKE '%value%'
 *   Examples:
 * 
 *     - "stone" matches all "Stone Butch Blues", "Stonewall", "The Stone Reader"
 * 
 *     - "blues" matches all "Stone Butch Blues", "Jazz Blues Collection"
 * 
 *     - "but" matches all "Stone Butch Blues", "Butterfly Effect"
 * 
 * - publisher: CASE-INSENSITIVE partial match using SQL LIKE '%value%'
 *   Examples:
 * 
 *     - "fire" matches "Firebrand Books", "Fireside Publishing"
 * 
 *     - "books" matches "Firebrand Books", "Penguin Books", 
 * "Random House Books"
 * 
 * - isbn: exact match (must match complete ISBN)
 *   Examples:
 * 
 *     - "9781555838539" matches only that exact ISBN
 * 
 *     - "978155" does NOT match anything (must be complete)
 * 
 * Multiple filters are combined with and logic (all conditions must match)
 * 
 *
 * 
 * Sample REST calls:
 *   1. Search by title only:
 *      GET http://localhost:8081/api/v1/books?title=stone&limit=10&offset=0
 * 
 *   2. Search by publisher only:
 *      GET http://localhost:8081/api/v1/books?publisher=firebrand&limit=10&offset=0
 * 
 *   3. Search by exact ISBN:
 *      GET http://localhost:8081/api/v1/books?isbn=9781555838539
 * 
 *   4. Combine title and publisher filters:
 *      GET http://localhost:8081/api/v1/books?title=stone&publisher=fire&limit=5&offset=0
 * 
 *   5. 2nd page of search results:
 *      GET http://localhost:8081/api/v1/books?title=stone&limit=10&offset=10
*/


//Get one book by ID
async function getBook(bookID) {
  const response = await axios.get(`${API_BASE}/books/${bookID}`);
  return response.data;
}

//Create a new book
async function createBook(bookData) {
  const response = await axios.post(`${API_BASE}/books`, {
    isbn: bookData.isbn,
    title: bookData.title,
    //Format is in: "YYYY-MM-DD"
    pubdate: bookData.pubdate, 
    publisher: bookData.publisher,
    edition: bookData.edition,
    copies: bookData.copies
  });
  
  return response.data; 
}

//Update existing book (PUT)
async function updateBook(bookID, updates) {
  await axios.put(`${API_BASE}/books/${bookID}`, {
    isbn: updates.isbn,
    title: updates.title,
    pubdate: updates.pubdate,
    publisher: updates.publisher,
    edition: updates.edition,
    copies: updates.copies
  });
  //should return a 204 response (no content)
}

//Delete book
async function deleteBook(bookID) {
  await axios.delete(`${API_BASE}/books/${bookID}`);
  //should return a 204 response (no content)
}

/*Some more examples for /search/ and /loans/ */


async function loanWorkflowDemo() {
  //Checkout a book
  const checkout = await axios.post(`${API_BASE}/loans`, {
    bookID: 1000,
    caseID: 'abc123',
    loanDate: '2025-11-22',
    dueDate: '2025-12-06',
    numRenewals: 0
  });
  /*REST: POST /loans
     Response: { "id": 1000 } */

  //Renew the loan (extends due date by 14 days automatically)
  await axios.patch(`${API_BASE}/loans/${checkout.data.id}/renew`);
  /*REST: PATCH /loans/1000/renew
     date calculation automatically handled
     returns 204 No Content */

  //Return the book
  await axios.delete(`${API_BASE}/loans/${checkout.data.id}`);
  /*REST: DELETE /loans/1000
     returns 204 No Content */
}

//Global search across books, authors, and tags
async function globalSearch(query) {
  const response = await axios.get(`${API_BASE}/search`, {
    params: { q: query, limit: 10, offset: 0 }
  });
  /* REST: GET /search?q=Stone&limit=10&offset=0 */
  return response.data;
}
