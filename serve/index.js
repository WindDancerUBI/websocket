/*
 * @file: websocket服务端
 * @author: huangjitao
 */
const WebSocket = require('ws')

// 创建websocket服务端
const wss = new WebSocket.Server({port: 3000})

wss.on('connection', function connection(ws) {
  console.log('a client is connected');
})