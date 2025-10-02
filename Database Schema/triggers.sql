/*
Triggers
*/

DELIMITER //
CREATE TRIGGER deleted_book  
BEFORE DELETE ON books
FOR EACH ROW
BEGIN
		DELETE FROM bookauthor WHERE OLD.bookID = bookauthor.bookID;
		DELETE FROM booktags WHERE OLD.bookID = bookauthor.bookID;
END//

DELIMITER //
CREATE TRIGGER auth_garbage_collection
AFTER DELETE ON bookauthor
FOR EACH ROW
BEGIN
	IF NOT EXISTS (SELECT * FROM bookauthor WHERE authID = OLD.authID) THEN
		DELETE FROM author WHERE authID = OLD.authID;
	END IF;
END//