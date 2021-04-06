'use strict';
require('dotenv').config();
const express = require('express');
const superagent = require('superagent');
// const path= require('path');
const app = express();
const pg=require('pg');

const PORT = process.env.PORT || 5000;
const DATABASE_URL= process.env.DATABASE_URL;
app.use(express.static('./public'));
// app.use(express.static(path.join(__dirname, 'public')))
app.use(express.urlencoded({extended:true,}));

const client = new pg.Client({
  connectionString: DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// const client = new pg.Client(process.env.DATABASE_URL);

client.on('error', error => console.error(error));

app.set('view engine', 'ejs');

app.get('/', renderHomePage);
function renderHomePage(req, res) {
  const booksQuery = 'SELECT * FROM books;';
  client.query(booksQuery).then((results => {
    res.render('pages/index', { resultsNum :results.rows.length , results: results.rows });
  })).catch(error => {
    res.status(500).render('pages/error',{error :error, massage:'Oops..!Something went wrong'})
  });
}
  
app.get('/searches/new', showForm);
function showForm(req, res) {
res.render('pages/searches/new.ejs');
}
app.post('/searches', createSearch);
function createSearch(req, res) {
    const url = 'https://www.googleapis.com/books/v1/volumes';
    const searchBy = req.body.searchBy;
    const searchValue = req.body.search;
    const queryObj = {};
    if (searchBy === 'title') {
      queryObj['q'] = `+intitle:${searchValue}`;
  
    } else if (searchBy === 'author') {
      queryObj['q'] = `+inauthor:${searchValue}`;
    }
    superagent.get(url).query(queryObj).then(resultRes => {
      return resultRes.body.items.slice([0,10]).map(bookResult => new Books(bookResult))
    }).then(results => {
      res.render('pages/show', { results: results })
    }).catch((error)=>{
        res.status(500).render('pages/error',{error :error, massage:'Oops..!Something went wrong'})
    })
  }
  
  app.get('/books/:id',getSingleBook);
  function getSingleBook(req, res){
    const bookId = req.params.id;
    console.log(bookId);
    const sqlSelectQuery = 'SELECT * FROM books WHERE id=$1';
    const safeValues = [bookId];
    client.query(sqlSelectQuery, safeValues).then(results => {
      res.render('pages/books/show', { results: results.rows});
    }).catch((error)=>{
      res.status(500).render('pages/error',{error :error, massage:'Oops..!Something went wrong'})
  })
}

app.post('/books', addbook);
function addbook(req, res) {
  const { title, author, isbn, image, description, bookshelf } = req.body;
  const sqlQuery = 'INSERT INTO books (title, author, isbn, image, description,bookshelf) VALUES($1,$2,$3,$4,$5,$6);';
  const safeValues = [title, author, '',image, description, bookshelf];
  client.query(sqlQuery, safeValues).then(() => {
    res.redirect('/');
  }).catch((error)=>{
    res.status(500).render('pages/error',{error :error, massage:'Oops..!Something went wrong'})
  });
}

  
function Books(info) {
  const placeholderImage = "https://i.imgur.com/J5LVHEL.jpg";
  this.image = info.volumeInfo.imageLinks ? info.volumeInfo.imageLinks.thumbnail : placeholderImage;
  this.title = info.volumeInfo.title || "No title available";
  this.authors = info.volumeInfo.authors || "The author not provided";
  this.description = info.volumeInfo.description || info.subtitle || "The description not provided";
  this.ispn = info.id;
  this.bookshelf = info.volumeInfo.categories ? info.volumeInfo.categories[0] : 'None';
}
  
app.use('*' , function(req , res){
    res.status(404).send('noting to show here');
  });
  
  client.connect().then(() => {
    app.listen(PORT, () => {
      console.log("Connected to database:", client.connectionParameters.database) //show what database we connected to
      console.log(`Listening to Port ${PORT}`);//start point for the application"initialisation"
    });
  })