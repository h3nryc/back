var express = require('express');
var app = express();
var server = app.listen(process.env.OPENSHIFT_NODEJS_PORT || 8080, process.env.OPENSHIFT_NODEJS_IP);
var io = require('socket.io').listen(server);
var url = require("url");
var cookieParser = require('cookie-parser');
var fs = require('fs')
//Databse Loading
var Datastore = require('nedb')
, db = new Datastore({ filename: './db/users.json', autoload: true });
postsDB = new Datastore({ filename: './db/posts.json', autoload: true });
followDB = new Datastore({ filename: './db/follow.json', autoload: true });
likeDB = new Datastore({ filename: './db/like.json', autoload: true });
notifDB = new Datastore({ filename: './db/notif.json', autoload: true });
seshDB = new Datastore({ filename: './db/sesh.json', autoload: true });
/////////////
// Routing //
/////////////

app.use(express.static('frontend'));
app.use(express.static('frontend/uploads'));
app.use('/user', express.static(process.env.OPENSHIFT_DATA_DIR + '/public'))
app.use('/uploads', express.static('./frontend/'+'/uploads'));
//Allows user to go to /user/username to see that user.
var user = function(req,res,next) {
    db.findOne({ username: req.params.uid }, function (err, docs) {
    //error handaling
    if(err){console.log(err)}
    //check if user is real
    if(docs === null){
         res.end('404 user not found');
    }else{
        res.sendFile(process.env.OPENSHIFT_DATA_DIR + '/frontend/user.html');
        res.cookie('cuser', req.params.uid, { httpOnly: false });
        }
    });
}

app.get('/user/:uid',user);

//Routing for base pages like hompage login etc
app.get('/', function (req, res) {
  res.sendFile(process.env.OPENSHIFT_DATA_DIR + '/frontend/index.html');
});

app.get('/feed', function (req, res) {
  res.sendFile(process.env.OPENSHIFT_DATA_DIR + '/frontend/feed.html');
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
            console.log("suc");
            var seshData = {
              user: username
            }
            seshDB.insert([seshData], function (err, newDocs) {
             if(err){console.log(err);}else{
               username = newDocs[0]._id
              socket.emit('logSuc', username);
             }
            })
        }
      })
    })
    socket.on('Log Out', function(sesh){
      console.log(sesh);
      seshDB.remove({ _id: sesh }, {}, function (err, numRemoved) {
        if (err) {console.log(err)}else {
        }
      });
    })
                          //End log in
    socket.on('Image Post', function(ext, buffer, location, postData) {
      seshDB.findOne({ _id: postData.user }, function (err, docs) {
        postData.user = docs.user
      console.log(ext);
      postsDB.insert([postData], function (err, newDocs) {
        if(err){console.log(err)}
        else{
          console.log(newDocs);
          var fileName = './frontend/uploads' + "/" + newDocs[0]._id + ext;
          fs.open(fileName, 'a', 0755, function(err, fd) {
            if (err) throw err;
            fs.write(fd, buffer, null, 'Binary', function(err, written, buff) {
              fs.close(fd, function() {
                console.log('File saved successful!');
                socket.emit('Post Done')
              });
            });
          });
        }
    })
  });
  });

  socket.on('Post', function(postData){
    seshDB.findOne({ _id: postData.user }, function (err, docs) {
      postData.user = docs.user
    postsDB.insert([postData], function (err, newDocs) {
     if(err){console.log(err);}else{
       console.log(newDocs);
       socket.emit('Post Done')
     }
    })
    })
  })

    socket.on('Get Feed Posts', function(username, skip){
      seshDB.findOne({ _id: username }, function (err, docs) {
        if (err) {console.log(err);}
        var username = docs.user
      followDB.find({user: username}, function(err, docs){
        if(err){console.log(err)}else {
          var requestedPosts = []
          var posts = [];
          for (var i = 0; i < docs.length; i++) {
        	 	requestedPosts.push({user: docs[i].follow});
        	 }
           postsDB.find({$or: requestedPosts})
            .skip(skip)
            .limit(12)
        		.sort({score: 1})
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
    });
  socket.on('Get Profile Posts', function(username,skip){
    postsDB.find({ user: username })
    .skip(skip)
    .limit(4)
    .sort({time: -1})
    .exec(function(err, docs){
            if (err){
              console.log(err);
            } else {
              socket.emit('Send User Post', docs)
        }
    })
  })
  socket.on('Get User Posts', function(username,skip){
    seshDB.findOne({ _id: username }, function (err, docs) {
      if (err) {console.log(err);}
      var username = docs.user
    postsDB.find({ user: username })
    .skip(skip)
    .limit(5)
    .sort({time: -1})
    .exec(function(err, docs){
            if (err){
              console.log(err);
            } else {
              socket.emit('Send Profile Post', docs)
        }
      })
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
    seshDB.findOne({ _id: cuser }, function (err, docs) {
      if (err) {console.log(err);}
      var cuser = docs.user
      likeDB.find({user: cuser, id: id}, function(err, docs){
        postsDB.find({user: user, _id: id}, function(err, docs){
          likeNum = docs[0].like + 1
          time = docs[0].time
          score = docs[0].score + 1
          scoreFinal = (likeNum + 1) / Math.pow((time+2), 1.8)
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
                postsDB.update({ user: user, _id: id }, { $set: { like: likeNum , score: scoreFinal} }, function (err, numReplaced) {
                  if(err){console.log(err)}
                    else{
                      console.log(numReplaced);
                      var time = Date.now();
                      var likeData = {
                        time: time,
                        user: cuser,
                        likedUser: user,
                        reason: "has liked your post",
                        post: id
                      };
                      notifDB.insert([likeData], function (err, newDocs) {
                       if(err){console.log(err);}else{
                         console.log(newDocs);
                       }
                    })
                  }
                });
              }
          });
        }else {
          console.log("pls");
        }
    });
  });
  })
  socket.on('Upload Profile Image', function (cuser,ext, buffer, location) {
    seshDB.findOne({ _id: cuser }, function (err, docs) {
      if (err) {console.log(err);}
      var cuser = docs.user
    var fileName = './frontend/uploads' + "/" + cuser + ext;
    fs.stat(fileName, function(err, stat) {
        if(err == null) {
            fs.unlinkSync(fileName);
            fs.open(fileName, 'a', 0755, function(err, fd) {
              if (err) throw err;
              fs.write(fd, buffer, null, 'Binary', function(err, written, buff) {
                fs.close(fd, function() {
                  console.log('File saved successful!');
                });
              });
            });
        } else if(err.code == 'ENOENT') {
          fs.open(fileName, 'a', 0755, function(err, fd) {
            if (err) throw err;
            fs.write(fd, buffer, null, 'Binary', function(err, written, buff) {
              fs.close(fd, function() {
                console.log('File saved successful!');
              });
            });
          });
        } else {
            console.log('Some other error: ', err.code);
        }
    });
  });
  });

  socket.on('Upload Cover Image', function (cuser, ext, buffer, location) {
    seshDB.findOne({ _id: cuser }, function (err, docs) {
      if (err) {console.log(err);}
      var cuser = docs.user
    var fileName = './frontend/uploads' + "/" + 'cover-' + cuser + ext;
    console.log(fileName);
    fs.stat(fileName, function(err, stat) {
        if(err == null) {
            fs.unlinkSync(fileName);
            fs.open(fileName, 'a', 0755, function(err, fd) {
              if (err) throw err;
              fs.write(fd, buffer, null, 'Binary', function(err, written, buff) {
                fs.close(fd, function() {
                  console.log('File saved successful!');
                });
              });
            });
        } else if(err.code == 'ENOENT') {
          fs.open(fileName, 'a', 0755, function(err, fd) {
            if (err) throw err;
            fs.write(fd, buffer, null, 'Binary', function(err, written, buff) {
              fs.close(fd, function() {
                console.log('File saved successful!');
              });
            });
          });
        } else {
            console.log('Some other error: ', err.code);
        }
    });
  });
  });
    socket.on('Get Notif', function (cuser,skip) {
      seshDB.findOne({ _id: cuser }, function (err, docs) {
        if (err) {console.log(err);}
        var cuser = docs.user
      notifDB.find({likedUser: cuser})
       .skip(skip)
       .limit(8)
       .sort({time: -1})
       .exec(function(err, docs){
               if (err){
                 console.log(err);
               } else {
                 socket.emit('Send Notif', docs)
           }
       })
     });
    });
    socket.on('Check Follow', function (cuser,user) {
      seshDB.findOne({ _id: cuser }, function (err, docs) {
        if (err) {console.log(err);}
        var cuser = docs.user
      followDB.findOne({user: cuser, follow: user})
       .exec(function(err, docs){
               if (err){
                 console.log(err);
               } else {
                 if (docs === null) {
                    socket.emit('Follow Result', "no")
                 }else {
                  socket.emit('Follow Result', "yes")
                 }
           }
       })
     });
    });
    socket.on('Follow User', function(cuser,user){
      seshDB.findOne({ _id: cuser }, function (err, docs) {
        if (err) {console.log(err);}
        var cuser = docs.user
      followDB.insert({user: cuser, follow: user}, function (err, newDocs) {
       if(err){console.log(err);}else{
         var time = Date.now();
         var likeData = {
           time: time,
           user: cuser,
           likedUser: user,
           reason: "started to follow you",
         };
           notifDB.insert([likeData], function (err, newDocs) {
            if(err){console.log(err);}else{
              console.log(newDocs);
            }
          })
       }
      })
    });
    })
    socket.on('Unfollow User', function(cuser,user){
      seshDB.findOne({ _id: cuser }, function (err, docs) {
        if (err) {console.log(err);}
        var cuser = docs.user
      followDB.remove({user: cuser, follow: user}, {}, function (err, numRemoved) {
       if(err){console.log(err);}else{
         var time = Date.now();
         var likeData = {
           time: time,
           user: cuser,
           likedUser: user,
           reason: "stopped following you",
         };
           notifDB.insert([likeData], function (err, newDocs) {
            if(err){console.log(err);}else{
              console.log(newDocs);
            }
          })
       }
      })
    });
    })
    socket.on('Get Username', function(cuser){
      seshDB.findOne({ _id: cuser }, function (err, docs) {
        if(err){console.log(err)}else{
          socket.emit('Return Username', docs.user)
        }
      })
    })
    socket.on('Get Like Count', function(id){
      likeDB.count({ id: id }, function (err, count) {
        socket.emit('Return Like Count', count, id)
      });
    })
});
