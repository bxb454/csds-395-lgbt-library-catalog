
DELIMITER //
CREATE PROCEDURE authorsOf (IN id INT)
BEGIN
	SELECT a.* FROM 
		authors a JOIN bookauthor ba 
        ON a.authID = ba.authID  
        WHERE ba.bookID = id;
END//

CREATE PROCEDURE booksOf (IN id INT)
BEGIN
	SELECT b.* FROM 
		books b JOIN bookauthor ba 
        ON b.bookID = ba.bookID
		WHERE ba.authID = id;
END//

DELIMITER //
CREATE PROCEDURE activeLoans (IN id INT)
BEGIN
	SELECT l.* FROM
		loan l JOIN users u
        ON u.caseID = l.caseID
        WHERE u.caseID = id;
END//

DROP PROCEDURE checkOutLoan
DELIMITER //
CREATE PROCEDURE checkOutLoan (IN caseID VARCHAR(8), bookID INT, loanDate date, dueDate date)
BEGIN
	START TRANSACTION;
	INSERT INTO loan VALUES (bookID, caseID, loanDate, dueDate, 0);
    UPDATE books 
		SET loanMetrics = loanMetrics + 1 
		WHERE books.bookID = bookID;
	COMMIT;
END//

DELIMITER //
CREATE PROCEDURE addPatron (IN caseID VARCHAR(8))
BEGIN
	INSERT INTO users VALUES (caseID, 'patron', false);
END//

DELIMITER //
CREATE PROCEDURE addbook (IN isbn VARCHAR(13), title VARCHAR(255), pubdate DATE, publisher VARCHAR(64), edition VARCHAR(64), copies INT, thumbnail BLOB)
BEGIN
	INSERT INTO books (isbn, title, pubdate, publisher, edition, copies, thumbnail, loanMetrics) VALUES 
    (isbn, title, pubdate, publisher, edition, copies, thumbnail, 0);
END//

DROP PROCEDURE addStaff
DELIMITER //
CREATE PROCEDURE addStaff (IN caseID VARCHAR(8))
BEGIN
	START TRANSACTION;
		IF EXISTS (SELECT * FROM users u WHERE u.caseID = caseID) THEN
			UPDATE users u
				SET u.role = 'staff', u.restricted = false
                WHERE u.caseID = caseID;
		ELSE
			INSERT INTO users VALUES (caseID, 'staff', false);
		END IF;
	COMMIT;
END//

DELIMITER //
CREATE PROCEDURE addAuthor (IN fname VARCHAR(64), lname VARCHAR(64), bookID INT)
BEGIN
	START TRANSACTION;
		IF EXISTS (SELECT * FROM authors a WHERE a.fname = fname AND a.lname = lname) THEN
			INSERT INTO bookauthor VALUES (bookID, (SELECT authID FROM authors a WHERE a.fname = fname AND a.lname = lname));
		ELSE
			INSERT INTO authors (fname, lname) VALUES (fname, lname);
		END IF;
	COMMIT;
END//

DELIMITER //
CREATE PROCEDURE demoteToPatron (IN caseID varchar(8))
BEGIN
	UPDATE users u
		SET  u.role = 'patron'
        WHERE u.caseID = caseID;
END//

DELIMITER //
CREATE PROCEDURE addAdmin (IN caseID VARCHAR(8))
BEGIN
	START TRANSACTION;
		IF EXISTS (SELECT * FROM users u WHERE u.caseID = caseID) THEN
			UPDATE users u
				SET u.role = 'admin', u.restricted = false
                WHERE u.caseID = caseID;
		ELSE
			INSERT INTO users VALUES (caseID, 'admin', false);
		END IF;
	COMMIT;
END//

DELIMITER //
CREATE PROCEDURE overdueUserLoans (IN caseID varchar(8))
BEGIN
	SELECT *, DATEDIFF(CURDATE(), duedate) AS overdue FROM loan l WHERE l.caseID = caseID AND CURDATE() > l.duedate;
END//

CREATE PROCEDURE allOverdueLoans ()
BEGIN
	SELECT *, DATEDIFF(CURDATE, duedate) AS overdue FROM loan l WHERE CURDATE() > l.duedate;
END//

DELIMITER //
CREATE PROCEDURE getBookTags (IN bookID INT)
BEGIN
	SELECT t1.tag, tagCount FROM (SELECT tag FROM booktags WHERE booktags.bookID = bookID) AS t1 JOIN (SELECT COUNT(tag) AS tagCount FROM booktags GROUP BY tag) AS t2 ON t1.tag = t2.tag;
END//

DELIMITER //
CREATE PROCEDURE addTag (IN bookID INT, tag varchar(128))
BEGIN
	INSERT INTO booktags VALUES (bookID, tag);
END//

DELIMITER //
CREATE PROCEDURE removeTag (IN bookID INT, tag VARCHAR(128))
BEGIN
	DELETE FROM booktags bt WHERE bt.bookID = bookID AND bt.tag = tag;
END//

DELIMITER //
CREATE PROCEDURE searchByAuth (IN search VARCHAR(255))
BEGIN
	SELECT books.* FROM books JOIN bookauthor ON books.bookID = bookauthor.bookID JOIN author ON author.authID = bookauthor.authID 
    WHERE author.fname LIKE CONCAT('%', CONCAT(search, '%')) OR author.lname LIKE CONCAT('%', CONCAT(search, '%')); 
END//

DELIMITER //
CREATE PROCEDURE searchByTags (IN search VARCHAR(255))
BEGIN
	SELECT books.* FROM books JOIN booktags ON books.bookID = booktags.bookID 
    WHERE booktags.tag LIKE CONCAT('%', CONCAT(search, '%'));
END//

DELIMITER //
CREATE PROCEDURE searchByTitle (IN search VARCHAR(255))
BEGIN
	SELECT * FROM books
    WHERE books.title LIKE CONCAT('%', CONCAT(search, '%'));
END//

DELIMITER //
CREATE PROCEDURE generalSearch (IN search VARCHAR(255))
BEGIN
		SELECT books.* FROM books JOIN booktags ON books.bookID = booktags.bookID 
		WHERE booktags.tag LIKE CONCAT('%', CONCAT(search, '%'))
	UNION
		SELECT books.* FROM books JOIN bookauthor ON books.bookID = bookauthor.bookID JOIN author ON author.authID = bookauthor.authID 
		WHERE author.fname LIKE CONCAT('%', CONCAT(search, '%')) OR author.lname LIKE CONCAT('%', CONCAT(search, '%'))
    UNION
    	SELECT books.* FROM books JOIN booktags ON books.bookID = booktags.bookID 
		WHERE booktags.tag LIKE CONCAT('%', CONCAT(search, '%'));
END//

