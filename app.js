
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , authentication = require('./routes/authentication')
  , register = require('./routes/register')
  , user = require('./routes/user')
  , building = require('./routes/building')
  , floor = require('./routes/floor')
  , store = require('./routes/store')
  , ad = require('./routes/ad')
  , test = require('./routes/test')
  , http = require('http')
  , https = require('https')
  , path = require('path')
  , passport = require('./config/passportSetup')
  , bootstrap = require('./config/bootstrap')
  , flash = require('connect-flash')
  , log4js = require('log4js');


var app = express();

// Connect data source
require('./model/dataSource');

// Cookies and session setup
app.use(express.cookieParser());
app.use(express.session({ secret: 'salisabcdefghijksails' }));
app.use(flash());

// Passport setup for user authentication
app.use(passport.initialize());
app.use(passport.session());

// Support html by nodejs module "ejs"
app.engine('html', require('ejs').renderFile);


log4js.configure({
	  appenders: [
	    { type: 'console' },
	    { type: 'file', filename: 'logs/server.log', category: 'log' }
	  ]
});

log4js.getLogger().info("kdkddkdddjkkddk");

// all environments
app.set('port', process.env.PORT || 80);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser({uploadDir:'resource/tmp'}));
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// Support html by nodejs module "ejs"
app.engine('html', require('ejs').renderFile);

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

// Configure secured http request
app = passport.configSecureHttpRequest(app);

// URL mapping
app.sget('/', routes.index);
app.sget('/login', authentication.index);
app.sget('/logout', authentication.logout);
app.post('/auth', authentication.auth);
app.post('/authMobile', authentication.authMobile);
app.get('/register', register.index);
app.post('/register/auth', register.auth);


//---------------------------------
app.sget('/user', user.index);
app.sget('/user/profile', user.profile);
app.sget('/user/read/:_id', user.read);
app.sget('/user/all', user.all); // only use in admin
app.sget('/user/list', user.list); // only use in admin
app.spost('/user/create', user.create);  // only use in admin
app.spost('/user/update', user.update);  // only use in admin
app.spost('/user/changePassword', user.changePassword);

//----------------------------------
app.sget('/building/show/:_id', building.show);
app.sget('/building/read/:_id', building.read);
app.spost('/building/create', building.create);
app.spost('/building/update', building.update);
app.spost('/building/delete', building.del);
app.sget('/building/list', building.list);
app.sget('/building/list/public', building.listPublic);
app.spost('/building/uploadImage', building.uploadImage);
app.spost('/building/packageMapzip', building.packageMapzip);
app.sget('/building/getMapzip', building.getMapzip);

//----------------------------------
app.sget('/floor/show/:_id', floor.show);
app.sget('/floor/read/:_id', floor.read);
app.sget('/floor/list', floor.list);
app.spost('/floor/create', floor.create);
app.spost('/floor/update', floor.update);
app.spost('/floor/uploadMapAndPath', floor.uploadMapAndPath);
app.spost('/floor/uploadRenderAndRegion', floor.uploadRenderAndRegion);
app.spost('/floor/uploadMapzip', floor.uploadMapzip);
app.sget('/floor/getMap', floor.getFile);
app.sget('/floor/getPath', floor.getFile);
app.sget('/floor/getRender', floor.getFile);
app.sget('/floor/getRegion', floor.getFile);
app.sget('/floor/getMapzip', floor.getMapzip);
app.spost('/floor/delete', floor.del);

//----------------------------------
app.sget('/store/show/:_id', store.show);
app.sget('/store/read/:_id', store.read);
app.sget('/store/list', store.list);
app.spost('/store/create', store.create);
app.spost('/store/update', store.update);
app.spost('/store/uploadImage', store.uploadImage);
app.spost('/store/delete', store.del);

//----------------------------------
app.sget('/ad/show/:_id', ad.show);
app.sget('/ad/read/:_id', ad.read);
app.sget('/ad/list', ad.list);
app.spost('/ad/create', ad.create);
app.spost('/ad/update', ad.update);
app.spost('/ad/uploadImage', ad.uploadImage);
app.spost('/ad/delete', ad.del);

//----------------------------------

app.sget('/test1', test.test1);
app.spost('/test2', test.test2);


// Facebook OAuth Authentication
app.get('/auth/facebook',passport.authenticate('facebook', {
	scope: ['read_stream', 'publish_actions', 'read_friendlists', 'manage_notifications']
}) );

// Facebook OAuth Code Callback (first handshake)
app.get('/auth/facebook/callback', passport.authenticate('facebook', { successRedirect: '/user', failureRedirect: '/login' }) );


http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});

// Execute pre-process step
bootstrap();

console.log('test');