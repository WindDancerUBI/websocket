/*
 * @file: websocket服务端
 * @author: huangjitao
 */
const WebSocket = require('ws')
const http = require('http')

// 创建websocket服务端
// const wss = new WebSocket.Server({port: 3000})
const server = http.createServer() 
const wss = new WebSocket.Server({noServer: true})

let group = {} // 存放每个房间的在线人数
wss.on('connection', function connection(ws) {
  console.log('one client is connected');
  // 接受客户端的消息
  ws.on('message', function(msg) {
    const msgObj = JSON.parse(msg)
    // 首次进入聊天室组册信息到对应的ws上
    if (msgObj.event === 'enter') {
      // ws对应当前客户端，将当前客户端传过来的数据绑定在后台上
      ws.name = msgObj.name
      ws.roomid = msgObj.roomid
      if (typeof group[msgObj.roomid] === 'undefined') {
        group[ws.roomid] = 1
      } else {
        group[ws.roomid] ++ 
      }
    }
    // 广播消息
    wss.clients.forEach((client) => {
      // 对匹配房间内的所有在线客户端发送消息
      if (client.readyState === WebSocket.OPEN && client.roomid === ws.roomid) {
        msgObj.name = ws.name
        msgObj.num = group[ws.roomid]
        client.send(JSON.stringify(msgObj))
      }
    })
  })
  ws.on('close', function() {
    if (ws.name) {
      group[ws.roomid] --
    }
    let msgObj = {}
    wss.clients.forEach((client) => {
      // 对匹配房间内的所有在线客户端发送消息
      if (client.readyState === WebSocket.OPEN && client.roomid === ws.roomid) {
        msgObj.name = ws.name
        msgObj.num = group[ws.roomid]
        msgObj.event = 'out'
        client.send(JSON.stringify(msgObj))
      }
    })
  })
})

server.on('upgrade', function upgrade(request, socket, head) {
  // This function is not defined on purpose. Implement it with your own logic.
  // authenticate(request, (err, client) => {
  //   if (err || !client) {
  //     socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
  //     socket.destroy();
  //     return;
  //   }
    console.log('request:' +  JSON.stringify(request, null, 2))
    wss.handleUpgrade(request, socket, head, function done(ws) {
      wss.emit('connection', ws, request);
    });
  // });
});

server.listen(3000); 