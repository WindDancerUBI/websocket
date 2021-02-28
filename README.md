<!--
 * @Descripttion: 项目说明
 * @Author: huangjitao
 * @Date: 2021-02-28 17:21:01
 * @Function: use of this file
-->

# websocket实战：多人聊天室

## 功能
* 多房间多人聊天
* 进入房间欢迎语
* 退出房间提示语
* 统计在线人数
* websocket鉴权
* 心跳检测
* 断线重连
* 离线消息缓存

## 目录结构
```
.
├── README.md     
├── client
│   ├── client.js       // node侧客户端ws
│   ├── index.html      // 浏览器侧客户端ws
│   └── package.json
└── serve
    ├── config
    │   ├── consts.js           // 配置常量
    │   └── redisConfig.js      // redis配置
    ├── index.js                // 服务器端ws
    └── package.json
```