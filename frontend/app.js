var socket = io();
//search
function search (){
  var query = $('#searchinput').val();
  socket.emit('Search', query)
}


socket.on('Search Result', function(user){
  $('.searchresult').empty();
  $('.searchresult').show();
  $('.searchresult').append('<div class="result"> <img src="../profilePic/5.png" alt=""/><a href="/user/'+user+'"><h3>@'+user+'</h3></a> <hr> </div>');
});

function searchHide() {
  $('.searchresult').hide();
}
