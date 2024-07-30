const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 7777;

app.use(cors());
// 使用 body-parser 中间件解析 JSON 请求体
app.use(bodyParser.json());

app.post('/', (req, res) => {
  const userKey = decodeURIComponent(req.headers['userkey']); // 解码 userKey
  const action = req.headers['action']; // 获取 action
  const requestBody = req.body;
  const clientIp = (req.headers['x-forwarded-for'] || '').split(',').pop().trim();
  const userAgent = req.headers['user-agent']; // 获取 User-Agent

  // console.log('Received userkey:', userKey);
  // console.log('Received action:', action);
  // console.log('Received body:', requestBody);
  // console.log('Client IP:', clientIp);
  // console.log('User-Agent:', userAgent);

  const filePath = path.join(__dirname, 'data.json');

  if (action === 'push') {
    // 将 userKey、syncst、IP 和 User-Agent 以键对值的形式写入 JSON 文件
    const dataToWrite = {
      [userKey]: {
        syncst: requestBody.syncst,
        ip: clientIp,
        userAgent: userAgent
      }
    };

    // 读取现有的 JSON 文件内容
    fs.readFile(filePath, 'utf8', (err, data) => {
      let jsonData = {};
      if (!err && data) {
        try {
          jsonData = JSON.parse(data);
        } catch (parseErr) {
          console.error('Error parsing JSON:', parseErr);
        }
      }

      // 更新 JSON 数据
      jsonData = { ...jsonData, ...dataToWrite };

      // 写入更新后的 JSON 数据
      fs.writeFile(filePath, JSON.stringify(jsonData, null, 2), 'utf8', (writeErr) => {
        if (writeErr) {
          console.error('Error writing JSON file:', writeErr);
          return res.status(500).json({ message: 'Failed to write data' });
        }

        // 发送响应
        res.json({ message: 'Data received and written successfully' });
      });
    });
  } else if (action === 'pull') {
    // 读取现有的 JSON 文件内容
    fs.readFile(filePath, 'utf8', (err, data) => {
      let jsonData = {};
      if (err) {
        if (err.code === 'ENOENT') {
          // 文件不存在，返回 syncst = 0
          return res.json({ userKey, syncst: 0 });
        } else {
          console.error('Error reading JSON file:', err);
          return res.status(500).json({ message: 'Failed to read data' });
        }
      }

      try {
        jsonData = JSON.parse(data);
      } catch (parseErr) {
        console.error('Error parsing JSON:', parseErr);
        return res.status(500).json({ message: 'Failed to parse data' });
      }

      const userData = jsonData[userKey];

      if (userData !== undefined) {
        if (userData.ip === clientIp && userData.userAgent === userAgent) {
          // 删除键值对
          delete jsonData[userKey];

          // 写入更新后的 JSON 数据
          fs.writeFile(filePath, JSON.stringify(jsonData, null, 2), 'utf8', (writeErr) => {
            if (writeErr) {
              console.error('Error writing JSON file:', writeErr);
              return res.status(500).json({ message: 'Failed to write data' });
            }

            // 发送响应
            res.json({ userKey, syncst: 0 });
          });
        } else {
          res.status(200).json({ userKey, syncst: userData.syncst });
        }
      } else {
        // 键值不存在，返回 syncst = 0
        res.json({ userKey, syncst: 0 });
      }
    });
  } else {
    res.status(400).json({ message: 'Invalid action' });
  }
});

// 新增 GET 请求处理
app.get('/', (req, res) => {
  res.status(200).send('感知节点正常运行中');
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
