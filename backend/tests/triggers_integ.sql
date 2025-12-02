/* This was Torture for some reason */

DELIMITER //

DROP TRIGGER IF EXISTS deleted_book//
CREATE TRIGGER deleted_book
BEFORE DELETE ON books
FOR EACH ROW
BEGIN
    DELETE FROM bookAuthor WHERE bookAuthor.bookID = OLD.bookID;
    DELETE FROM booktags WHERE booktags.bookID = OLD.bookID;
END//

DROP TRIGGER IF EXISTS auth_garbage_collection//
CREATE TRIGGER auth_garbage_collection
AFTER DELETE ON bookAuthor
FOR EACH ROW
BEGIN
    IF NOT EXISTS (SELECT * FROM bookAuthor WHERE authID = OLD.authID) THEN
        DELETE FROM authors WHERE authID = OLD.authID;
    END IF;
END//

DELIMITER ;