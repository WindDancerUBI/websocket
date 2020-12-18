/*
 * @file: 文件描述
 * @author: huangjitao
 */
/*
 * @file: websocket服务端
 * @author: huangjitao
 */
const WebSocket = require('ws')

// 创建websocket服务端
const wss = new WebSocket.Server({port: 3000})

wss.on('connection', function connection(ws) {
  console.log('one client is connected');
  // 接受客户端的消息
  ws.on('message', function(msg) {
    console.log(msg);
  })
  // 主动给客户端发送消息
  ws.send('this message is from server!')
})