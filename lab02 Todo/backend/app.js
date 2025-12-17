// 1. 使用Express开发一个HTTP服务器，实现5个API：获取todo列表、获取单个todo详情、新增单个todo、删除单个todo、更新单个todo
// 2. 所有接口使用MySQL或者MongoDB实现数据持久化（使用node-mysql或node-mongo连接数据库）
// 3. API测试工具（Postman/Bruno/APIfox）中添加上述5个API的测试，并添加到一个Collection中

const express = require('express')
const mysql = require('mysql2')

const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

//定义密钥
const SECRET_KEY = 'my_super_secret_key_123'

const connection = mysql.createConnection({
  host: '127.0.0.1',
  port: 3306,
  user: 'root',
  password: '123',
  database: 'Todo'
})

connection.connect(err => {
  if (err) {
    console.error('failed to connect to database, error: ', err)
    process.exit(1)
  }
})

const app = express()
app.use(express.json())
app.use(express.static('../frontend'))

// 注册新用户
app.post('/register', (req, res) => {
  const { username, password } = req.body
  //两个都是必填项，任意一个缺失则返回400(Bad Request客户端错误请求)
  if (!username || !password) return res.status(400).json({ msg: "Missing fields" })

  
  bcrypt.hash(password, 10, (err, hash) => {
    if (err) return res.status(500).json({ msg: "Encryption error" })

    const sql = 'INSERT INTO users (username, password) VALUES (?, ?)'
    connection.query(sql, [username, hash], (err, result) => {
      if (err) return res.status(500).json({ msg: "User already exists or DB error" })
      res.json({ msg: "Register success" })
    })
  })
})

// 登录接口 (验证密码 + 发放 Token)
app.post('/login', (req, res) => {
  const { username, password } = req.body
  
  const sql = 'SELECT * FROM users WHERE username = ?'
  connection.query(sql, [username], (err, results) => {
    if (err) return res.status(500).json({ msg: err })
    //401 Unauthorized 未授权
    if (results.length === 0) return res.status(401).json({ msg: "User not found" })

    const user = results[0]

    // 比较用户输入的密码和数据库里的哈希密码
    bcrypt.compare(password, user.password, (err, isMatch) => {
      if (!isMatch) return res.status(401).json({ msg: "Wrong password" })

      // 密码正确，生成 Token
      // payload: 存入 Token 的数据 (id, username)
      const payload = { id: user.id, username: user.username }
      const token = jwt.sign(payload, SECRET_KEY, { expiresIn: '24h' }) 

      res.json({ token: token })
    })
  })
})

// 中间件：验证 Token
function authenticateToken(req, res, next) {
  // 客户端通常这样传 Header: "Authorization: Bearer <token>"
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1] // 拿到 Bearer 后面的部分

  if (token == null) return res.sendStatus(401) // 没有 Token

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.sendStatus(403) // Token 无效或过期

    // [关键] 验证成功，把解密出来的用户信息 (包含id) 挂载到 req 上
    req.user = user 
    next() // 放行，进入下一个路由处理函数
  })
}

// 获取todo列表
app.get('/todos', authenticateToken, function (req, res) {
  const page = parseInt(req.query.page) || 1
  const size = parseInt(req.query.size) || 10
  const status = req.query.status
  const userId = req.user.id

  let sql = 'SELECT * FROM todos WHERE user_id = ?'
  let params = [userId]
  
  if (status !== undefined) {
    sql += ' AND status = ?'
    params.push(status)
  }
  
  sql += ' limit ?, ?'
  params.push((page - 1) * size)
  params.push(size)

  connection.query(sql, params, (err, result) => {
    if (err) {
      return res.status(500).json({ msg: err })
    }
    res.json(result)
  })
})

// 获取单个todo详情
app.get('/todos/:id', authenticateToken, function (req, res) {
  const { id } = req.params
  const userId = req.user.id

  if (isNaN(id)) {
    return res.status().json({msg: "invalid parameters"})
  }
  const sql = 'SELECt * FROM todos WHERE id = ? AND user_id = ?'
  connection.query(sql, [id, userId], (err, result) => {
    if (err) {
      return res.status(500).json({msg: err})
    }

    if (result.length <= 0) {
      return res.status(404).end()
    } else {
      res.json(result[0])
    }
  })
})

// 新增单个todo
app.post('/todos',authenticateToken, function (req, res) {
  const { content, deadline } = req.body
  const userId = req.user.id
  if (!content) {
    return res.status(400).json({ msg: "invalid parameters" })
  }
  const sql = 'INSERT INTO todos (content, deadline, user_id) VALUES (?, ?, ?)'
  connection.query(sql, [content,deadline, userId], (err, result) => {
    if (err) {
      return res.status(500).json({ msg: err })
    }
    res.status(200).json({ id: result.insertId })
  })
})

// 更新单个todo
app.put('/todos/:id', authenticateToken,function (req, res) {
  const { id } = req.params
  const { content, deadline, status } = req.body
  const userId = req.user.id

  const sql = 'UPDATE todos set content = ?, deadline = ?, status = ? WHERE id = ? AND user_id = ?'
 
  const formattedDeadline = deadline ? deadline : null;
  
  const args = [content, formattedDeadline, status, id, userId]
  connection.query(sql, args, (err, result) => {
    if (err) {
      console.error('Update error:', err);
      return res.status(500).json({msg: err})
    }

    if (result.affectedRows === 0) {
      return res.status(404).end()
    }

    res.status(200).end()
  })
})

// 删除单个todo
app.delete('/todos/:id', authenticateToken,function (req, res) {
  const { id } = req.params
  const userId = req.user.id

  if (!id) {
    return res.status(400).json({msg: "invalid parameters"})
  }
  const sql = 'DELETE FROM todos WHERE id = ? AND user_id = ?'
  connection.query(sql, [id, userId], err => {
    if (err) {
      res.status(500).send({msg: err})
    } else {
      res.status(204).end()
    }
  })
})

const server = app.listen(3000, 'localhost', function () {
  const host = server.address().address
  const port = server.address().port
  console.log("Running server at http://%s:%s", host, port)
})

