/*
Triggers
*/

DELIMITER //
CREATE TRIGGER deleted_book  
BEFORE DELETE ON books
FOR EACH ROW
BEGIN
		DELETE FROM bookauthor WHERE bookID = OLD.bookID;
		DELETE FROM booktags WHERE bookID = OLD.bookID;
END//

DELIMITER //
CREATE TRIGGER auth_garbage_collection
AFTER DELETE ON bookauthor
FOR EACH ROW
BEGIN
	IF NOT EXISTS (SELECT * FROM bookauthor WHERE authID = OLD.authID) THEN
		DELETE FROM authors WHERE authID = OLD.authID;
	END IF;
END//
