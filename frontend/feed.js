check();
order();
var socket = io();
var postOrder = []
var getpost = 3;

function check() {
  if(Cookies.get('log') === undefined){
    window.location.replace('/');
  }
}

function post() {
  check();
  var postText = $('.postinput').val();
  var user = Cookies.get('log');
  var time = Date.now();
  var postData = {
      text: postText
      , user: user
      , time: time
      , like: 0
    }; 
  socket.emit('Post', postData)
  $('.postinput').val('');

}
socket.emit('Get Feed Posts', Cookies.get('log'))

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
  $('.postbox').after(' <div class="textpost"> <a href="/user/'+user+'"><h2>'+user+'</h2></a> <hr> <p id="textpostinner">'+text+'</p> <a onclick="like('+"'"+user+"'"+','+"'"+id+"'"+')" class="like"><span id="'+id+'">'+likes+'</span> Likes<img src="../like.png" alt="" /></a> </div>');
}

function like(user, id) {
  var cuser = Cookies.get('log');
    socket.emit("Like Post", user, id, cuser)
}

socket.on('Like Added', function(){
  document.getElementById(""+id+"").innerHTML =  parseInt(document.getElementById(""+id+"").innerHTML) + 1
})
