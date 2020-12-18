/*
 * @file: websocket客户端
 * @author: huangjitao
 */
const WebSocket = require('ws')

// 创建websocket客户端
const ws = new WebSocket('ws://127.0.0.1:3000')

ws.on('open', function() {
  console.log('client is connected to server');
})