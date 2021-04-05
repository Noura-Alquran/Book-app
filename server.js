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

// const client = new pg.Client({
//   connectionString: DATABASE_URL,
//   ssl: {
//     rejectUnauthorized: false
//   }
// });

const client = new pg.Client(process.env.DATABASE_URL);

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
      return resultRes.body.items.slice([0,10]).map(bookResult => new Books(bookResult.volumeInfo))
    }).then(results => {
      res.render('pages/show', { searchResults: results })
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
      res.render('pages/books/detail', { results: results.rows });
    }).catch((error)=>{
      res.status(500).render('pages/error',{error :error, massage:'Oops..!Something went wrong'})
  })
}

function Books(book) {
    const placeholderImage = 'https://i.imgur.com/J5LVHEL.jpg';
    this.image = book.imageLinks ? book.imageLinks.thumbnail : placeholderImage;
    this.title = book.title || 'No title available';
    this.author= book.authors || 'No author avaliable';
    this.description = book.description ||book.subtitle || 'Description not Found for this book';

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