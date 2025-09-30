CREATE TABLE books(
	bookID 		int auto_increment not null,
	isbn 		varchar(13) null,
    title 		varchar(255) not null,
    pubdate 	date null,
    publisher 	varchar(64) null,
    edition 	varchar(64) null,
    copies 		int not null,
    thumbnail	blob null,
    loanMetrics int not null,
    primary key(bookID)
) auto_increment = 1000;

CREATE TABLE authors(
	authID 	int auto_increment not null,
    lname 	varchar(64) not null,
    fname 	varchar(64) null,
    primary key(authID)
) AUTO_INCREMENT = 1000;

/*CREATE TABLE tags(
	tag 	varchar(128) not null,
    primary key(tag)
);*/
DROP TABLE IF EXISTS tags;

CREATE TABLE bookAuthor(
	bookID 	int not null,
    authID	int not null,
    foreign key(bookID) references books(bookID),
    foreign key(authID) references authors(authID),
    primary key(bookID, authID)
);

CREATE TABLE booktags(
	bookID 	int not null,
    tag 	varchar(128) not null,
    foreign key(bookID) references books(bookID),
    #foreign key(tag) references tags(tag),
    primary key(bookID, tag)
);

ALTER TABLE booktags DROP FOREIGN KEY tag;

CREATE TABLE users(
	caseID varchar(8) not null,
    role enum('guest', 'patron', 'staff', 'admin') not null,
    primary key(caseID),
    isRestricted boolean not null
);

CREATE TABLE loan(
	bookID int not null,
    caseID varchar(8) not null,
    loanDate date not null,
    dueDate date not null,
    numRenewals int not null,
    foreign key(bookID) references books(bookID),
    foreign key(caseID) references users(caseID),
    primary key(bookID, caseID, loanDate)
)





    