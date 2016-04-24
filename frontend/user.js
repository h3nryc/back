var socket = io();
order();
var postOrder = []

$( document ).ready(function() {
  //Sets up page according to user in profile bar
  $('head').append('<title>@'+Cookies.get('cuser')+'</title>')
  $('.userinfo').append('<h1>@'+Cookies.get('cuser')+'</h1>')
  $('.userinfo').append('<h2>110 charecters only</h2>')
  $('.userinfo').append('<h3>26666 <span>Followers</span></h3>')
  $('.userinfo').append('<a href="#">See all friends</a>')
});

socket.emit('Get Profile Posts', Cookies.get('cuser'))

socket.on('Order Posts', function(user,text ,time, likes, id){
  var post = {
    user: user
  , text: text
  , time: time
  , likes: likes
  , id: id
  }
  postOrder.push(post)
});

function order() {
    setTimeout(function () {
      for (i = 0; i < postOrder.length; i++) {
        postOrder.sort(function (a, b) {
          if (a.time > b.time) {
            return 1;
          }
          if (a.time < b.time) {
            return -1;
          }
          return 0;
        });
        displayPost(postOrder[i].user, postOrder[i].text, postOrder[i].time, postOrder[i].likes, postOrder[i].id);
      }
    }, 300);
}

function displayPost(user,text,time,likes, id) {
  if (likes == 0) {
    likes = "No"
  }
  $('.userposts').after(' <div class="textpost"> <a href="/user/'+user+'"><h2>'+user+'</h2></a> <hr> <p id="textpostinner">'+text+'</p> <a onclick="like('+"'"+user+"'"+','+"'"+id+"'"+')"class="like">'+likes+' Likes<img src="../like.png" alt="" /></a> </div>');
}

function like(user, id) {
  socket.emit("Like Post", user, id)
}
