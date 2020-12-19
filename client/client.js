/*
 * @file: websocket客户端
 * @author: huangjitao
 */
const WebSocket = require('ws')

// 创建websocket客户端
const ws = new WebSocket('ws://127.0.0.1:3000', {
  headers: {
    token: '123456'
  }
})

ws.on('open', function() {
  console.log('client is connected to server');
  // 客户端想服务端发送数据
  ws.send('this message is from client')
  ws.on('message', function(msg) {
    // 与网页端不同，服务端发给客户端的直接就是所需的msg
    console.log(msg)
  })
})