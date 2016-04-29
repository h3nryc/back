var express = require('express');
var app = express();
var server = app.listen(3000);
var io = require('socket.io').listen(server);
var url = require("url");
var cookieParser = require('cookie-parser');
app.use(cookieParser());
//Databse Loading
var Datastore = require('nedb')
, db = new Datastore({ filename: './db/users.json', autoload: true });
postsDB = new Datastore({ filename: './db/posts.json', autoload: true });
followDB = new Datastore({ filename: './db/follow.json', autoload: true });
likeDB = new Datastore({ filename: './db/like.json', autoload: true });


/////////////
// Routing //
/////////////

app.use(express.static('frontend'));
app.use('/user', express.static(__dirname + '/public'))

//Allows user to go to /user/username to see that user.
var user = function(req,res,next) {
    db.findOne({ username: req.params.uid }, function (err, docs) {
    //error handaling
    if(err){console.log(err)}
    //check if user is real
    if(docs === null){
         res.end('404 user not found');
    }else{
        res.sendFile(__dirname + '/frontend/user.html');
        res.cookie('cuser', req.params.uid, { httpOnly: false });
        }
    });
}

app.get('/user/:uid',user);

//Routing for base pages like hompage login etc
app.get('/', function (req, res) {
  res.sendFile(__dirname + '/frontend/index.html');
});

app.get('/feed', function (req, res) {
  res.sendFile(__dirname + '/frontend/feed.html');
});

//SETS UP SOCKET IO For Client -> Server
io.on('connection', function (socket) {
    //Get incoming user data
  socket.on('Create User', function (userData) {
      db.findOne({ username: userData.username }, function (err, docs) {
        if(err){console.log(err)}
            if(docs !== null){
                socket.emit('regUnsuc');
            }else{
                 db.findOne({ email: userData.email }, function (err, docs) {
                     if(docs !== null){
                        socket.emit('regUnsuc');
                        }else{
                         db.insert([userData], function (err, newDocs) {
                        if(err){console.log(err)}
                        else{console.log(newDocs)}
                        socket.emit('regSuc');
                      });
                    }
                  });
                }
              });
            });
                            //End user Register
    socket.on('Log User', function (loguserData){
      db.findOne({ username: loguserData.username, password: loguserData.password }, function (err, docs) {
            if(err){console.log(err)}
          if(docs === null){
              socket.emit('logUnsuc');
          }else{
            var username = loguserData.username
           socket.emit('logSuc', username);
        }
      })
    })
                          //End log in
    socket.on('Post', function(postData) {
      postsDB.insert([postData], function (err, newDocs) {
        if(err){console.log(err)}
        else{console.log(newDocs);}
    })
  });

    socket.on('Get Feed Posts', function(username){
      followDB.find({user: username}, function(err, docs){
        if(err){console.log(err)}else {
          var requestedPosts = []
          var posts = [];
          for (var i = 0; i < docs.length; i++) {
        	 	requestedPosts.push({user: docs[i].follow});
        	 }
           postsDB.find({$or: requestedPosts})
        		.sort({time: -1})
        		.exec(function(err, docs){
        						if (err){
        							console.log(err);
        						} else {
        							socket.emit('Send Post', docs)
        				}
						})
        }
      })
    });
  socket.on('Get Profile Posts', function(username){
    postsDB.find({ user: username }, function (err, docs) {
        if(err){console.log(err)}
        else{
          for (var i = 0; i < docs.length; i++) {
            var user = docs[i].user
            var text = docs[i].text
            var time = docs[i].time
            var likes = docs[i].like
            var id = docs[i]._id
            socket.emit('Order Posts', user, text, time, likes, id)
          }
        }
    });
  })
  socket.on('Search', function(query){
    db.find({username: query}, function(err, docs){
      if(err){console.log(err)}else{
        for (var i = 0; i < docs.length; i++) {
          var user = docs[i].username
          socket.emit('Search Result', user)
        }
      }
    });
  })
  socket.on('Like Post', function(user, id, cuser){
      likeDB.find({user: cuser, id: id}, function(err, docs){
        postsDB.find({user: user, _id: id}, function(err, docs){
          likeNum = docs[0].like + 1
        });
        console.log(docs);
          if (docs.length === 0) {
            var LikeDATA = {
              user: cuser,
              id: id
            }
            likeDB.insert([LikeDATA], function (err, newDocs) {
              if(err){console.log(err)}
              else{
                postsDB.update({ user: user, _id: id }, { $set: { like: likeNum } }, function (err, numReplaced) {
                  if(err){console.log(err)}
                  socket.emit('Like ');
                });
              }
          });
        }else {
          console.log("pls");
        }
    });
  })
});
