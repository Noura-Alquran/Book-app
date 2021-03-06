'use strict';
require('dotenv').config();
const express = require('express');
const superagent = require('superagent');
const methodOverride = require('method-override');

// const path= require('path');
const app = express();
const pg = require('pg');

const PORT = process.env.PORT || 5000;
const DATABASE_URL = process.env.DATABASE_URL;

app.use(express.static('./public'));
// app.use(express.static(path.join(__dirname, 'public')))
app.use(express.urlencoded({ extended: true, }));

app.use(methodOverride('_method'));

const client = new pg.Client(process.env.DATABASE_URL);

// const client = new pg.Client({
//     connectionString: DATABASE_URL,
//     ssl: {
//         rejectUnauthorized: false
//     }
// });

app.set('view engine', 'ejs');
app.get('/', renderHomePage);
app.get('/searches/new', showForm);
app.post('/searches', createSearch);
app.get('/books/:id', getSingleBook);
app.post('/books', addbook);
app.get('/edit/:id', handleData);
app.put('/edit/:id', handleUpdate);
app.delete('/books/:id', handleDelete);

client.on('error', error => console.error(error));

function handleError(error, res) {
    res.status(500).render('pages/error', { error: error, massage: 'Oops..!Something went wrong' })
}

function renderHomePage(req, res) {
    const booksQuery = 'SELECT * FROM books;';
    client.query(booksQuery).then((results => {
        res.render('pages/index', { resultsNum: results.rows.length, results: results.rows });
    })).catch(error => { handleError(error, res) });
}


function showForm(req, res) {
    res.render('pages/searches/new.ejs');
}

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
        return resultRes.body.items.slice([0, 10]).map(bookResult => new Books(bookResult))
    }).then(results => {
        res.render('pages/show', { results: results })
    }).catch(error => { handleError(error, res) });
}


function getSingleBook(req, res) {
    const bookId = req.params.id;
    console.log(bookId);
    const sqlSelectQuery = 'SELECT * FROM books WHERE id=$1;';
    const safeValues = [bookId];
    client.query(sqlSelectQuery, safeValues).then(results => {
        res.render('pages/books/show', { results: results.rows });
    }).catch(error => { handleError(error, res) });
}

function addbook(req, res) {
    const { title, author, isbn, image, description, bookshelf } = req.body;
    const sqlQuery = 'INSERT INTO books (title, author, isbn, image, description , bookshelf) VALUES($1,$2,$3,$4,$5,$6) RETURNING id;';
    const safeValues = [title, author, isbn, image, description, bookshelf];
    client.query(sqlQuery, safeValues).then(result => {
        // const getSqlData='SELECT id FROM books WHERE isbn=$1';
        // const safeValues=[isbn];
        // client.query(getSqlData,safeValues).then(result=>{
        //   console.log(result.rows);
        res.redirect(`/books/${result.rows[0].id}`);

    }).catch(error => { handleError(error, res) });
}

function handleData(req, res) {
    const bookId = req.params.id;
    const sqlSelectQuery = 'SELECT * FROM books WHERE id=$1;';
    const safeValues = [bookId];
    client.query(sqlSelectQuery, safeValues).then(results => {
        res.render('pages/books/edit', { results: results.rows[0] });
    }).catch(error => { handleError(error, res) });


}

function handleUpdate(req, res) {
    const bookId = req.params.id;
    console.log(bookId);
    const { title, author, isbn, image, description, bookshelf } = req.body;
    const safeValues = [title, author, isbn, image, description, bookshelf, bookId];
    const updateQuery = 'UPDATE books SET title=$1, author=$2, isbn=$3, image=$4, description=$5, bookshelf=$6 WHERE id=$7;';
    client.query(updateQuery, safeValues).then(() => {
        res.redirect(`/books/${bookId}`);
    }).catch(error => { handleError(error, res) });
}

function handleDelete(req, res) {
    const bookId = req.params.id;
    const deleteQuery = 'DELETE FROM books WHERE id=$1;';
    const safeValues = [bookId];
    client.query(deleteQuery, safeValues).then(() => {
        res.redirect('/');
    }).catch(error => { handleError(error, res) });
}

function Books(info) {
    const placeholderImage = "https://i.imgur.com/J5LVHEL.jpg";
    this.image = info.volumeInfo.imageLinks ? info.volumeInfo.imageLinks.thumbnail : placeholderImage;
    this.title = info.volumeInfo.title || "No title available";
    this.author = info.volumeInfo.authors || "The author not provided";
    this.description = info.volumeInfo.description || info.subtitle || "The description not provided";
    this.isbn = info.volumeInfo.industryIdentifiers ? info.volumeInfo.industryIdentifiers.identifier : "The isbn not provided";
    this.bookshelf = info.volumeInfo.categories ? info.volumeInfo.categories : 'None';
}

app.use('*', function(req, res) {
    res.status(404).send('noting to show here');
});

client.connect().then(() => {
    app.listen(PORT, () => {
        console.log("Connected to database:", client.connectionParameters.database) //show what database we connected to
        console.log(`Listening to Port ${PORT}`); //start point for the application"initialisation"
    });
});