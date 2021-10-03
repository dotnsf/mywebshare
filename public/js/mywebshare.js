
var local_video = null; //document.getElementById( 'local_video' );
var local_stream = null;

var peer_connections = [];
var remote_videos = [];
var MAX_CONNECTION_COUNT = 3;

var container = null; //document.getElementById( 'container' );

navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
var RTCPeerConnection = window.RTCPeerConnection || window.webkitRTCPeerConnection || window.mozRTCPeerConnection;
var RTCSessionDescription = window.RTCSessionDescription || window.webkitRTCSessionDescription || window.mozRTCSessionDescription;

//var uuid = generateUUID();
var socket = io.connect();
var room = getRoomName();

var base_url = location.origin + '/';

$(function(){
  local_video = document.getElementById( 'local_video' );
  container = document.getElementById( 'container' );

  init();
});

function init(){
  //. 初期化を通知
  /*
  var msg = {
    uuid: uuid,
    timestamp: ( new Date() ).getTime()
  };
  socket.emit( 'init_client', msg );
  socket.on( 'init_client_view', function( msg ){
    console.log( 'init_client_view', msg );
  });
  */

  socket.on( 'connect', function( evt ){
    console.log( 'socket.io connected. room = ' + room );
    socket.emit( 'enter', room );
  });
  socket.on( 'message', function( message ){
    console.log( 'message', message );
    var from_id = message.from;
    if( message.type == 'offer' ){
      console.log( 'received offer ...' );
      var offer = new RTCSessionDescription( message );
      setOffer( from_id, offer );
    }else if( message.type == 'answer' ){
      console.log( 'received answer ...' );
      var answer = new RTCSessionDescription( message );
      setAnswer( from_id, answer );
    }else if( message.type == 'candidate' ){
      console.log( 'received ICE candidate ...' );
      var candidate = new RTCIceCandidate( message );
      addIceCandidate( from_id, candidate );
    }else if( message.type == 'call me' ){
      if( !isReadyToConnect() ){
        console.log( 'Not ready to connect, so ignore' );
        return;
      }else if( !canConnectMore() ){
        console.log( 'Too many connections, so ignore' );
      }

      if( isConnectedWith( from_id ) ){
        //. already connected.
        console.log( 'Already connected, so ignore' );
      }else{
        makeOffer( from_id );
      }
    }else if( message.type == 'bye' ){
      if( isConnectedWith( from_id ) ){
        stopConnection( from_id );
      }
    }
  });
  socket.on( 'user disconnected', function( evt ){
    var id = evt.id;
    if( isConnectedWith( id ) ){
      stopConnection( id );
    }
  });
}

function emitRoom( msg ){
  socket.emit( 'message', msg );
}

function emitTo( id, msg ){
  msg.sendto = id;
  socket.emit( 'message', msg );
}

function getRoomName(){
  var url = document.location.href;
  var args = url.split( '?' );
  if( args.length > 1 ){
    var room = args[1];
    if( room != '' ){
      return room;
    }
  }
  return 'defaultroom';
}

function isReadyToConnect(){
  if( local_stream ){
    return true;
  }else{
    return false;
  }
}

function getConnectionCount(){
  return peer_connections.length;
}

function canConnectMore(){
  return ( getConnectionCount() < MAX_CONNECTION_COUNT );
}

function isConnectedWith( id ){
  if( peer_connections[id] ){
    return true;
  }else{
    return false;
  }
}

function addConnection( id, peer ){
  peer_connections[id] = peer;
}

function getConnection( id ){
  var peer = peer_connections[id];
  return peer;
}

function deleteConnection( id ){
  delete peer_connections[id];
}

function stopConnection( id ){
  detachVideo( id );
  if( isConnectedWith( id ) ){
    var peer = getConnectioN( id );
    peer.close();
    deleteConnection( id );
  }
}

function stopAllConnection(){
  for( var id in peer_connections ){
    stopConnection( id );
  }
}

function attachVideo( id, stream ){
  var video = addRemoteVideoElement( id );
  playVideo( video, stream );
  video.volume = 1.0;
}

function detachVideo( id ){
  var video = getRemoteVideoElement( id );
  pauseVideo( video );
  deleteRemoteVideoElement( id );
}

function isRemoteVideoAttached( id ){
  if( remote_videos[id] ){
    return true;
  }else{
    return false;
  }
}

function addRemoteVideoElement( id ){
  var video = createVideoElement( 'remove_video_' + id );
  remote_videos[id] = video;

  return video;
}

function getRemoteVideoElement( id ){
  var video = remote_videos[id];
  return video;
}

function deleteRemoteVideoElement( id ){
  removeVideoElement( 'remote_video_' + id );
  delete remote_videos[id];
}

function createVideoElement( element_id ){
  var video = document.createElement( 'video' );
  video.width = '240';
  video.height = '180';
  video.id = element_id;
  video.style.border = 'solid black 1px';
  video.style.margin = '2px';
  container.appendChild( video );

  return video;
}

function removeVideoElement( element_id ){
  var video = document.getElementById( element_id );
  container.removeChild( video );

  return video;
}

function startVideo(){
  getDeviceStream( { video: true, audio: true } ).then( function( stream ){
    local_stream = stream;
    playVideo( local_video, stream );
  }).catch( function( err ){
    console.log( 'getUserMedia error', err );
    return;
  });
}

function stopVideo(){
  pauseVideo( local_video );
  stopLocalStream( local_stream );
  local_stream = null;
}

function stopLocalStream( stream ){
  var tracks = stream.getTracks();
  if( !tracks ){
    console.log( 'NO tracks' );
      return;
  }
  for( var track of tracks ){
    track.stop();
  }
}

function getDeviceStream( option ){
  if( 'getUserMedia' in navigator.mediaDevices ){
    console.log( 'navigator.mediaDevices.getUserMedia' );
    return navigator.mediaDevices.getUserMedia( option );
  }else{
    console.log( 'wrap navigator.getUserMedia with Promise' );
    return new Promise( function( resolve, reject ){
      navigator.getUserMedia( option, resolve, reject );
    });
  }
}

function playVideo( element, stream ){
  if( element && 'srcObject' in element ){
    element.srcObject = stream;
  }else{
    element.src = window.URL.createObjectURL( stream ); //. Failed to execute 'createObjectURL' on 'URL': Overload resolution failed.
  }

  element.play();
  element.volume = 0;
}

function pauseVideo( element ){
  element.pause();
  if( 'srcObject' in element ){
    element.srcObject = null;
  }else{
    if( element.src && ( element.src !== '' ) ){
      window.URL.revokeObjectURL( element.src );
    }
    element.src = '';
  }
}

function sendSdp( id, session_description ){
  console.log( '--sending sdp--' );

  var message = { type: session_description.type, sdp: session_description.sdp };
  console.log( 'sending SDP=' + message );
    emitTo( id, message );
}

function sendIceCandidate( id, candidate ){
  console.log( '--sending ICE candidate--' );
  var obj = { type: 'candidate', ice: candidate };
  if( isConnectedWith( id ) ){
    emitTo( id, obj );
  }else{
    console.log( 'connection NOT exist or already close, so skip candidate' );
  }
}

function prepareNewConnection( id ){
  var pc_config = { iceServers: [] };
  var peer = new RTCPeerConnection( pc_config );
  if( 'ontrack' in peer ){
    peer.ontrack = function( evt ){
      var stream = evt.streams[0];
      console.log( 'peer.ontrack() stream.id = ' + stream.id );
      if( isRemoteVideoAttached( id ) ){
        console.log( 'stream already attached, so ignore' );
      }else{
        attachVideo( id, stream );
      }
    };
  }else{
    peer.onaddstream = function( evt ){
      var stream = evt.stream;
      console.log( 'peer.onaddstream() stream.id = ' + stream.id );
      attachVideo( id, stream );
    };
  }

  peer.onicecandidate = function( evt ){
    if( evt.candidate ){
      console.log( evt.candidate );
      sendIceCandidate( id, evt.candidate );
    }else{
      console.log( 'empty ice event' );
    }
  };

  peer.onnegotiationneeded = function( evt ){
    console.log( 'onnegotiationneeded()' );
  };

  peer.onicecandidateerror = function( evt ){
    console.log( 'ICE candidate ERROR:', evt );
  };

  peer.onsignalingstatechange = function(){
    console.log( 'signaling status: ' + peer.signalingState );
  };

  peer.oniceconnectionstatechange = function(){
    console.log( 'ICE connection status:' + peer.iceConnectionState );
    if( peer.iceConnectionState === 'disconnected' ){
      stopConnection( id );
    }
  };

  peer.onicegatheringstatechange = function(){
    console.log( 'ICE gathering state: ' + peer.iceGatheringState );
  };

  peer.onconnectionstatechange = function(){
    console.log( 'connection state: ' + peer.connectionState );
  };

  peer.onremovestream = function( evt ){
    console.log( 'peer.onremovestream()' );
    deleteRemoteStream( id );
    detachVideo( id );
  };


  if( local_stream ){
    console.log( 'Adding local stream ...' );
    peer.addStream( local_stream );
  }else{
    console.log( 'No local stream, but continue.' );
  }

  return peer;
}

function makeOffer( id ){
  var peer_connection = prepareNewConnection( id );
  addConnection( id, peer_connection );

  peer_connection.createOffer().then( function( session_description ){
    console.log( 'createOffer() success in promise' );
    return peer_connection.setLocalDescription( session_description );
  }).then( function(){
    console.log( 'setLocalDescription() success in promise' );
    sendSdp( id, peer_connection.localDescription );
  }).catch( function( err ){
    console.log( err );
  });
}

function setOffer( id, session_description ){
  var peer_connection = prepareNewConnection( id );
  addConnection( id, peer_connection );

  peer_connection.setRemoteDescription( session_description ).then( function(){
    console.log( 'setRemoteDescription( offer ) success in promise.' );
    makeAnswer( id );
  }).catch( function( err ){
    console.log( 'setRemoteDescription( offer ) ERROR: ', err );
  });
}

function makeAnswer( id ){
  console.log( 'sending Answer. Creating remote session description...' );
  var peer_connection = getConnection( id );
  if( !peer_connection ){
    console.log( 'peer_connection NOT exist!' );
    return ;
  }

  peer_connection.createAnswer().then( function( session_description ){
    console.log( 'createAnswer() success in promise' );
    return peer_connection.setLocalDescription( session_description );
  }).then( function(){
    console.log( 'setLocalDescription() success in promise.' );
    sendSdp( id, peer_connection.localDescription );
  }).catch( function( err ){
    console.log( err );
  });
}

function setAnswer( id, session_description ){
  var peer_connection = getConnection( id );
  if( !peer_connection ){
    console.log( 'peer_connection NOT exist!' );
    return ;
  }

  peer_connection.setRemoteDescription( session_description ).then( function(){
    console.log( 'setRemoteDescription(answer) success in promise' );
  }).catch( function( err ){
    console.log( 'setRemoteDescription(answer) ERROR:', err );
  });
}

function addIceCandidate( id, candidate ){
  if( !isConnectedWith( id ) ){
    console.log( 'NOT connected or already closed with id = ' + id );
    return ;
  }

  var peer_connection = getConnection( id );
  if( peer_connection ){
    peer_connection.addIceCandidate( candidate );
  }else{
    console.log( 'peer_connection not exist!' );
    return;
  }
}

function connect(){
  if( !isReadyToConnect() ){
    console.log( 'NOT ready to connect' );
  }else if( !canConnectMore() ){
    console.log( 'Too many connections' );
  }else{
    callMe();
  }
}

function hangUp(){
    emitRoom( { type: 'bye' } );
  stopAllConnection();
}

function callMe(){
  emitRoom( { type: 'call me' } );
}
