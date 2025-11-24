

INSERT INTO books (bookID, isbn, title, pubdate, publisher, edition, copies, thumbnail, loanMetrics) VALUES (1000, '9780316015844', 'Twilight Reflections', '2005-10-05', 'Moonlight Press', '1st', 5, NULL, 7), (1001, '9780451524935', 'Voices of Pride', '2012-06-12', 'Rainbow House', '2nd', 3, NULL, 3), (1002, '9780140177398', 'Hidden Histories', '2018-03-21', 'Unity Press', '1st', 4, NULL, 1);

INSERT INTO authors (authID, lname, fname) VALUES (1000, 'Meyer', 'Cassandra'), (1001, 'Stone', 'Alex'), (1002, 'Rivera', 'Marisol');

INSERT INTO bookAuthor (bookID, authID) VALUES (1000, 1000), (1001, 1001), (1001, 1002), (1002, 1002);

INSERT INTO booktags (bookID, tag) VALUES (1000, 'fantasy'), (1000, 'young adult'), (1001, 'history'), (1001, 'lgbtq'), (1002, 'memoir'), (1002, 'activism');

INSERT INTO users (caseID, role, isRestricted) VALUES ('abc123', 'patron', 0), ('abc124', 'staff', 0), ('abc125', 'admin', 0), ('abc126', 'patron', 1);

INSERT INTO loan (loanID, bookID, caseID, loanDate, dueDate, numRenewals) VALUES (1000, 1000, 'abc123', '2024-01-10', '2024-01-24', 1), (1001, 1001, 'abc124', '2024-01-01', '2024-01-15', 0), (1002, 1002, 'abc125', '2024-01-20', '2024-02-03', 0);