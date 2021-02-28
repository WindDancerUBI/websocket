/*
 * @file: websocket服务端
 * @author: huangjitao
 */
const WebSocket = require('ws')
const http = require('http')
const jwt = require('jsonwebtoken')
const { setValue, getValue, existKey } = require('./config/redisConfig')
const { get } = require('https')

// 创建websocket服务端
const wss = new WebSocket.Server({port: 3000})
// const server = http.createServer() 
// const wss = new WebSocket.Server({noServer: true})

let group = {} // 存放每个房间的在线人数
const prefix = 'roomid-' // 房间名前缀

const timeInterval = 3000 // 设置一秒的心跳检测间隔
wss.on('connection', function connection(ws) {
  console.log('one client is connected');
  // 初识的心跳连接状态设置为在线
  ws.isAlive = true
  // 接受客户端的消息
  ws.on('message', async function(msg) {
    const msgObj = JSON.parse(msg)
    // 刚进来时才带roomid，后续发信息不带roomid
    const roomid = prefix + '' + (msgObj.roomid ? msgObj.roomid : ws.roomid)
    // 首次进入聊天室组册信息到对应的ws上
    if (msgObj.event === 'enter') {
      // ws对应当前客户端，将当前客户端传过来的数据绑定在后台上
      ws.name = msgObj.name
      ws.roomid = msgObj.roomid
      ws.uid = msgObj.name
      
      //判断房间名是否存在
      const res = await existKey(roomid)
      if (res === 0) {
        // 创建一个新房间,将客户的姓名保存在该房间中
        await setValue(roomid, ws.uid)
      } else {
        const roomUsers = await getValue(roomid)  
        // roomid中存储的形式是为 user1,user2,user3...
        let users = roomUsers.split(',')
        // 如果用户是第一次进入该房间
        if (users.indexOf(ws.name) === -1) {
          setValue(roomid, roomUsers + ',' + ws.uid)
        }
      }

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
    const usersArr = await getValue(roomid)
    // 获取该房间的所有用户
    const users = usersArr.split(',')
    wss.clients.forEach(async (client) => {
      // 对匹配房间内的所有在线客户端发送消息
      if (client.readyState === WebSocket.OPEN && client.roomid === ws.roomid) {
        msgObj.name = ws.name
        msgObj.num = group[ws.roomid]
        client.send(JSON.stringify(msgObj))
        // 对在线客户排队发送未读的消息
        if (usersArr.indexOf(client.uid) !== -1) {
          // 排队发送。并将该用户移除队列
          users.splice(users.indexOf(client.uid), 1)
        }
        // 判断该在线客户是否有未读消息
        const res = await existKey(client.uid) 
        if (res !== 0) {
          const tempArr = await getValue(client.uid)  
          const tempObj = JSON.parse(tempArr)
          if (tempObj.length > 0) {
            let i = []
            tempObj.forEach(item => {
              if (item.roomid === client.roomid && ws.uid === client.uid) {
                // 给当前用户发送离线信息
                client.send(JSON.stringify(item))
                i.push(item)
              }
            })
            // 删除已经发送了的离线消息
            if (i.length > 0) {
              i.forEach(item => {
                tempObj.splice(tempObj.indexOf(item), 1)
              })
            }
            // 将不是这个房间里的，或不是当前用户的离线信息重新存储起来
            setValue(ws.uid, JSON.stringify(tempObj))
          }
        }
      }
    })

    // 断开了与服务器连接的用户，将当前的聊天信息存放到redis中的离线客户中
    if (users.length > 0 && msgObj.event === 'message') {
      // 此时users队列中剩余的为离线用户
      users.forEach(async (item) => {
        const res = await existKey(item) 
        if (res !== 0) {
          // 说明该离线用户之前已经有离线信息
          const userData = await getValue(item)
          const msgs = JSON.parse(userData)
          msgs.push({
            roomid: ws.roomid,
            ...msgObj
          })
          setValue(item, JSON.stringify(msgs))
        } else {
          // 说明这个用户之前一直在线，并且无离线消息
          setValue(item, JSON.stringify(
            [
              {
                roomid: ws.roomid,
                ...msgObj
              }
            ]
          ))
        }
      })
    }
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