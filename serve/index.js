/*
 * @file: websocket服务端
 * @author: huangjitao
 */
const WebSocket = require('ws')
const http = require('http')
const jwt = require('jsonwebtoken')

// 创建websocket服务端
const wss = new WebSocket.Server({port: 3000})
// const server = http.createServer() 
// const wss = new WebSocket.Server({noServer: true})

let group = {} // 存放每个房间的在线人数
const timeInterval = 3000 // 设置一秒的心跳检测间隔
wss.on('connection', function connection(ws) {
  console.log('one client is connected');
  // 初识的心跳连接状态设置为在线
  ws.isAlive = true
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
    // 鉴权操作
    if (msgObj.event === 'auth') {
      jwt.verify(msgObj.message, 'secret', (err, decode) => {
        if (err) {
          // 返回前台鉴权失败消息
          msgObj.message = '鉴权失败'
          msgObj.isAuth = false
          ws.send(JSON.stringify(msgObj))
        } else {
          // 鉴权通过
          ws.isAuth = true
          msgObj.isAuth = true
          msgObj.message = '鉴权成功'
          ws.send(JSON.stringify(msgObj))
        }
      })
      return
    }
    // 判断是否鉴权成功，如果失败，不执行消息的发送
    if (!ws.isAuth) {
      return
    }
    // 心跳检测，接受到客户端信息时，将客户端状态置为在线
    if (msgObj.event === 'heartbeat' && msgObj.message === 'pong') {
      ws.isAlive = true
      return
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

setInterval(() => {
  wss.clients.forEach((ws) => {
    if (!ws.isAlive && ws.roomid) {
      // 在一定的时间内客户端的状态仍为离线时，中断与客户端的ws连接
      group[ws.roomid] --
      delete ws['roomid']
      return ws.terminate()
    }
    // 每隔一定的时间，发送心跳检测
    ws.isAlive = false
    ws.send(JSON.stringify({
      event: 'heartbeat',
      message: 'ping',
      num: group[ws.roomid]
    }))
  })
}, timeInterval);

// // 'upgrade'将http服务升级到包含websocket
// server.on('upgrade', function upgrade(request, socket, head) {
//   // console.log('request:' +  JSON.stringify(request, null, 2))
//   wss.handleUpgrade(request, socket, head, function done(ws) {
//     wss.emit('connection', ws, request);
//   });
// });

// server.listen(3000); 