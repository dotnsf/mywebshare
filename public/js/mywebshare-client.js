
var uuid = generateUUID();
var socketio = null;

var base_url = location.origin + '/';

$(function(){
  socketio = io.connect();
  init();
});

function init(){
  //. video
  var video = document.createElement( 'video' );
  video.id = 'video';
  video.width = 500;
  video.height = 400;
  video.setAttribute( 'autoplay', true );  //. #1
  video.setAttribute( 'muted', '' );       //. #1
  video.setAttribute( 'playsinline', '' ); //. #1
  document.getElementById( 'video_container' ).appendChild( video );

  //. 初期化を通知
  var msg = {
    uuid: uuid,
    timestamp: ( new Date() ).getTime()
  };
  socketio.emit( 'init_client', msg );
  socketio.on( 'init_client_view', function( msg ){
    console.log( 'init_client_view', msg );
  });

  socketio.on( 'mic_input_view', function( voicedata ){
    //console.log( 'mic_input_view', voicedata );
  });

  socketio.on( 'video_input_view', function( stream ){
    console.log( 'video_input_view', stream );
    video.srcObject = stream;
  });
}

function generateUUID(){
  //. Cookie の値を調べて、有効ならその値で、空だった場合は生成する
  var did = null;
  cookies = document.cookie.split(";");
  for( var i = 0; i < cookies.length; i ++ ){
    var str = cookies[i].split("=");
    var une = unescape( str[0] );
    if( une == " deviceid" || une == "deviceid" ){
      did = unescape( unescape( str[1] ) );
    }
  }

  if( did == null ){
    var s = 1000;
    did = ( new Date().getTime().toString(16) ) + Math.floor( s * Math.random() ).toString(16);
  }

  var dt = ( new Date() );
  var ts = dt.getTime();
  ts += 1000 * 60 * 60 * 24 * 365 * 100; //. 100 years
  dt.setTime( ts );
  var value = ( "deviceid=" + did + '; expires=' + dt.toUTCString() + '; path=/' );
  if( isMobileSafari() ){
    $.ajax({
      url: '/setcookie',
      type: 'POST',
      data: { value: value },
      success: function( r ){
        //console.log( 'success: ', r );
      },
      error: function( e0, e1, e2 ){
        //console.log( 'error: ', e1, e2 );
      }
    });
  }else{
    document.cookie = ( value );
    //console.log( 'value: ', value );
  }

  return did;
}

function isMobileSafari(){
  return ( navigator.userAgent.indexOf( 'Safari' ) > 0 && navigator.userAgent.indexOf( 'Mobile' ) > 0 );
}
