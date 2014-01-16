
/**
 * Module dependencies.
 */

 var express = require('express-streamline');
 var routes = require('./routes');
 var user = require('./routes/user');
 var http = require('http');
 var path = require('path');
 var graph = require('fbgraph');
 var neo4j = require('neo4j');
 var db = new neo4j.GraphDatabase('http://localhost:7474');
 var fbgraph = require('fbgraphapi');


 var passport = require('passport');
 var FacebookStrategy = require('passport-facebook').Strategy;

 var app = express.createServer();

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

app.configure(function() {
  app.use(express.static('public'));
  app.use(express.cookieParser());
  app.use(express.bodyParser());
  app.use(express.session({ secret: 'keyboard cat' }));
  app.use(passport.initialize());
  app.use(passport.session());
  app.use(app.router);
});


app.set("clientID", "appid");
app.set("clientSecret", "appsecret");

// dxlopment only
if ('development' == app.get('env')) {
	app.use(express.errorHandler());
}

app.get('/', routes.index);
app.get('/welcome', routes.welcome);
app.get('/search', routes.search);
app.get('/friends', function(req, res, _){
  		var options = {
			timeout:  3000
			, pool:     { maxSockets:  Infinity }
			, headers:  { connection:  "keep-alive" }
		};
		graph.setAccessToken(app.get("accessToken"));
		console.log("tokem = "+app.get("accessToken"));
		var user = graph
			.setOptions(options)
			.get("/me?fields=friends,about,birthday,email,id,username,name",{limit: 5000} ,_);


		if (user)
		{

			var friends = user.friends;
        	delete user.friends;
        	delete user.pagination;
			console.log(JSON.stringify(user));		
			
			var userNode = db.createNode(user);
			//console.log(user);
			userNode.save(_);
			
			var depth = 1;
			if (friends)
			friends = friends.data;


			if (friends)
			{
				for (var i in friends)
				{
					var friend = friends[i];
					addUser( depth, friend,userNode);
				}
			}	

			console.log(friends.length);
							
		}
		else
		{
			console.log("json not found");
		}	
		

		res.send("respond with a resource");

	
});
var count = 1;

function addUser(depth, friend, userNode)
{
	friend.depth = depth;
	var friendNode = db.createNode(friend);
	friendNode.save( function (err, newFriend){
		console.log("err = ? " + err);
		if (err)
			return ;
		userNode.createRelationshipTo(newFriend, 'friends', {}, function (err, relationship1){
		
		if (err)
				relationship1.save(function(){}); 	
		});
		
		
		if (depth == 6)
			return ;
		//console.log("going to get facebook   " + "/" + newFriend.id + "?fields=friends,id" + "  acc=" + app.get("accessToken"));
		
		console.log('select uid,username,name,email,about_me,friend_count from user where uid in (select uid2 from friend where uid1 = ' + friend.id + ')');

		var fb = new  fbgraph.Facebook(app.get('accessToken'));

		fb.fql('select uid,username,name,email,about_me,friend_count from user where uid in (select uid2 from friend where uid1 = ' + friend.id + ')', function(err, data) {
			console.log(err);
			
		    if (!err) {
		       return ;
		    }
		    //console.log(newFriend);
			
			if (err && user && user.friend)
			{	
				console.log("no errs");
				var friends = user.friend;
				console.log("found friend");
				if (friends)
					friends = friends.data;
				console.log("found friend2");
				
				console.log("found friend" + friends);
				
				if (friends && friends.length > 0)
				{
					for (var i in friends)
					{
						friend = friends[i];
						addUser(depth+1, friend, newFriend);
					}
				}	
			}	
		});

	});

	
	
};

app.get('/auth/facebook/callback', 
	passport.authenticate('facebook',{ scope: ['user_status', 'user_checkins'] ,failureRedirect: '/welcome' }),
	function(req, res) {
		console.log("authenticated" + app.get("accessToken"))
		res.redirect('/?message=success');
	});



passport.use(new FacebookStrategy({
	clientID: app.get("clientID"),
	clientSecret: app.get("clientSecret"),
	callbackURL: "http://localhost:3000/auth/facebook/callback"
},
function(accessToken, refreshToken, profile, done) {

	app.set('accessToken', accessToken);
	graph.setAccessToken(accessToken);

	/*
	graph.extendAccessToken({
		"access_token":    accessToken
		, "client_id":      app.get("clientID")
		, "client_secret":  app.get("clientSecret")
	}, function (err, facebookRes) {
		console.log(facebookRes);
	});
	*/
	console.log("test");
	/*var user = {
                    name: profile.displayName,
                    username: profile.username,
                    provider: 'facebook',
                    //now in the future searching on User.findOne({'facebook.id': profile.id } will match because of this next line
                    facebook: profile._json
                };
                */
    return done(null, null);            


})
);


app.get('/all', function (req, res, _){

	var query = " MATCH  n RETURN n";
	var params = {};	 
	var results= db.query(query, params , _);
	if (!results  || results.length == 0 )
	{
		res.send( '{}');
	}
	else
	{
		for(var i in results)
		{
			var node = results[i];
			console.log(node.n._data);
		}
		res.send( '{}');
	}
	//console.log(results);

});

http.createServer(app).listen(app.get('port'), function(){
	console.log('Express server listening on port ' + app.get('port'));
});


