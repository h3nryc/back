//Client side code
var socket = io();

if(Cookies.get('log')){
  window.location.replace('/feed');
}

function createUser(){
    if($("#first").val() == "" || $("#username").val() == "" || $("#email").val() == "" || $("#password").val() == ""){alert("Please fill out all fields.")}
    else if($("#email").val().indexOf('@') == -1 || $("#username").val().indexOf(' ') !== -1 || $("#username").val().indexOf('/') !== -1)
    {alert("Check your email or username again (usernames can only contain letters and '.')")}
    else{
        //send user data to server for processing
                var userData = {
                 first: $("#first").val()
                , username: $("#username").val()
                , email: $("#email").val()
                , password: $("#password").val()
               };
                socket.emit('Create User', userData);
    }
}


function login(){
    if($("#usernamelog").val() == "" || $("#passwordlog").val() == ""){alert("Please fill out all fields")}
    else{
        var loguserData = {
          username: $("#usernamelog").val()
        , password: $("#passwordlog").val()
        }
          socket.emit('Log User', loguserData);
    }
}

//Gets data from server (validation)
  socket.on('regSuc', function () {
    console.log("it works");
  });
  socket.on('regUnsuc', function () {
    $('.error').show();
  });
  socket.on('logSuc', function(username){
    Cookies.set( 'log' , username, { expires: 7 }, { secure: true });
     window.location.replace("/feed");
  })
  socket.on('logUnsuc', function(){
    alert('Please check your username and password again')
  })
