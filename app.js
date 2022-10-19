var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
let cors = require("cors");

var userRouter = require('./routes/user');
var adminRouter = require('./routes/admin');
//db
var db=require('./config/connection')
//to upload file
var fileUpload=require('express-fileupload')

//session
var session=require('express-session')
//handlebar import 
var hbs = require('express-handlebars');
const { Db } = require('mongodb');
var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');


//to set layout and partials
app.engine('hbs', hbs.engine({
  extname: 'hbs',
  defaultLayout: 'layout',
  layoutsDir: __dirname + '/views/layout/',
  partialsDir: __dirname + '/views/partials'
}))


//file upload use
app.use(fileUpload())
app.use(cors());
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

//db
db.connect((err)=>{
  if(err)
  console.log('connection error')
  else
  console.log('database connected')
})

//session
app.use(session({secret: 'key',
resave: false,
saveUninitialized: true,
cookie:{maxAge:600000}

}))

app.use('/', userRouter);
app.use('/admin', adminRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
