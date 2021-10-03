//. app.js
var express = require( 'express' ),
    bodyParser = require( 'body-parser' ),
    ejs = require( 'ejs' ),
    fs = require( 'fs' ),
    app = express();

var settings = require( './settings' );

app.use( bodyParser.urlencoded( { extended: true } ) );
app.use( bodyParser.json() );
app.use( express.Router() );
app.use( express.static( __dirname + '/public' ) );

app.set( 'views', __dirname + '/views' );
app.set( 'view engine', 'ejs' );

//.  HTTP server
var http = require( 'http' ).createServer( app );
var io = require( 'socket.io' )( http );

//. Page for main
app.get( '/', function( req, res ){
  res.render( 'index', {} );
});

//. Page for client
app.get( '/client', function( req, res ){
  res.render( 'client', {} );
});

//. Page for server
app.get( '/server', function( req, res ){
  res.render( 'server', {} );
});

app.post( '/setcookie', function( req, res ){
  res.contentType( 'application/json; charset=utf-8' );

  var value = req.body.value;
  //console.log( 'value = ' + value );
  res.setHeader( 'Set-Cookie', value );

  res.write( JSON.stringify( { status: true }, 2, null ) );
  res.end();
});


//. socket.io
io.sockets.on( 'connection', function( socket ){
  console.log( 'connected.' );

  //. rooms
  socket.on( 'enter', function( roomname ){
    socket.join( roomname );
    console.log( socket.id + ' enter room: ' + roomname );
    setRoomname( roomname );
  });

  function setRoomname( roomname ){
    socket.roomname = roomname;
  }

  function getRoomname(){
    return socket.roomname;
  }

  function emitMessage( type, message ){
    var roomname = getRoomname();
    if( roomname ){
      socket.broadcast.to( roomname ).emit( type, message );
    }else{
      socket.broadcast.emit( type, message );
    }
  }

  //. 初期化時（ロード後の最初の resized 時）
  socket.on( 'init_client', function( msg ){
    //console.log( 'init_client', msg );

    //io.to( room ).emit( 'init_client', msg );
    io.sockets.emit( 'init_client_view', msg ); //. 本人含めて全員に通知
  });

  socket.on( 'message', function( message ){
    var date = new Date();
    message.from = socket.id;
    var target = message.sendto;
    if( target ){
      socket.to( target ).emit( 'message', message );
      return;
    }

    emitMessage( 'message', message );
  });

  socket.on( 'disconnect', function(){
    console.log( ( new Date() ) + ' Peer disconnected. id = ' + socket.id );
    emitMessage( 'user disconnected', { id: socket.id } );

    var roomname = getRoomname();
    if( roomname ){
      socket.leave( roomname);
    }
  });

  /*
  socket.on( 'mic_start', function( b ){
    console.log( 'mic_start' );
  });
  socket.on( 'mic_rate', function( rate ){
    console.log( 'mic_rate', rate );  //. rate = 48000
  });
  socket.on( 'mic_input', function( data ){
    //. ここは１秒に数回実行される（データは送信されてきている）
    io.emit( 'mic_input_view', data ); //. 全員に通知
  });
  socket.on( 'mic_stop', function( b ){
    console.log( 'mic_stop' );
    socket.broadcast.emit( 'mic_stop_view', {} );  //. 本人以外にブロードキャスト送信
  });
  socket.on( 'video_input', function( data ){
    console.log( 'video_input' );
    socket.broadcast.emit( 'video_input_view', data );  //. 本人以外にブロードキャスト送信
  });
  */
});


var port = process.env.PORT || 8080;
http.listen( port );
console.log( "server starting on " + port + " ..." );
