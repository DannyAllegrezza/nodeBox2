//Example adapted from passport-box's login example. (https://github.com/bluedge/passport-box/tree/master/examples/login)
//This example requires express-4.x.

var express = require('express'),
  passport = require('passport'),
  morgan = require('morgan'),
  bodyParser = require('body-parser'),
  cookieParser = require('cookie-parser'),
  session = require('express-session'),
  methodOverride = require('method-override'),
  BoxStrategy = require('passport-box').Strategy,
  box_sdk = require('box-sdk');

var BOX_CLIENT_ID = "6bb9qxlgv8czyth8d9vy1v73z1v1k2qv"
var BOX_CLIENT_SECRET = "h2eZb1Rj6vtp1mqjDXFXoNgwr0scjaVk";

var box = box_sdk.Box();

// Passport session setup.
//   To support persistent login sessions, Passport needs to be able to
//   serialize users into and deserialize users out of the session.  Typically,
//   this will be as simple as storing the user ID when serializing, and finding
//   the user by ID when deserializing.  However, since this example does not
//   have a database of user records, the complete Box profile is
//   serialized and deserialized.
passport.serializeUser(function (user, done) {
  done(null, user);
});

passport.deserializeUser(function (obj, done) {
  done(null, obj);
});

// Use the BoxStrategy within Passport.
//   Strategies in Passport require a `verify` function, which accept
//   credentials (in this case, an accessToken, refreshToken, and 37signals
//   profile), and invoke a callback with a user object.
passport.use(new BoxStrategy({
    clientID: BOX_CLIENT_ID,
    clientSecret: BOX_CLIENT_SECRET,
    callbackURL: "http://127.0.0.1:3000/auth/box/callback"
  }, box.authenticate()));

var app = express();
var router = express.Router();

// configure Express
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(morgan());
app.use(cookieParser());
app.use(bodyParser());
app.use(methodOverride());
app.use(session({
  secret: 'keyboard cat'
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(router);
app.use(express.static(__dirname + '/public'));


app.get('/', passport.authenticate('box'), function (req, res) {});

// GET /auth/box/callback
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  If authentication fails, the user will be redirected back to the
//   login page.  Otherwise, the primary route function function will be called,
//   which, in this example, will redirect the user to the home page.
app.get('/auth/box/callback',
  passport.authenticate('box', {
    failureRedirect: '/login'
  }),
  function (req, res) {
    res.redirect('/bundy-query');
  });

app.get('/logout', function (req, res) {
  req.logout();
  res.redirect('/');
});

app.use(function (req, res, next){
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/')
});

app.get('/bundy-query', function (req, res) {
  var bundyQuery = "Project Status Report";
  var searchParams = {
    limit: 200,
    type: "file",
    sort: "relevance",
    file_extensions: "pdf, pptx"
  };

  var opts = {
    user: req.user
  };
  if (req.user) {
    var connection = box.getConnection(req.user.login);
    connection.ready(function () {
      connection.search(bundyQuery, searchParams, function (err, result) {
        if (err) {
          opts.body = JSON.stringify(err);
        } else {
          opts.body = result;
        }
        res.render('bundy-query', opts);
      });
    });
  } else {
    res.render('bundy-query', opts);
  }
});


app.listen(3000);