DROP TABLE IF EXISTS books;

CREATE TABLE IF NOT EXISTS books (
  id SERIAL PRIMARY KEY NOT NULL,
  title VARCHAR(255),  
  author VARCHAR(255),
  isbn VARCHAR(255),
  image VARCHAR(500),
  description TEXT,
  bookshelf VARCHAR(255)
);
