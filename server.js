'use strict';
const express = require('express');
const superagent = require('superagent');
// const path= require('path');
const app = express();
const PORT = process.env.PORT || 5000;
app.use(express.static('./public'));
// app.use(express.static(path.join(__dirname, 'public')))
app.use(express.urlencoded());
app.set('view engine', 'ejs');

app.get('/', renderHomePage);

function renderHomePage(req, res) {
    res.render('pages/index');
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
        res.status(404).render('pages/error',{error :error, massage:'Oops..!Something went wrong'})
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
  
app.listen(PORT, () => console.log(`Listening to Port ${PORT}`));