// 1. 使用Express开发一个HTTP服务器，实现5个API：获取todo列表、获取单个todo详情、新增单个todo、删除单个todo、更新单个todo
// 2. 所有接口使用MySQL或者MongoDB实现数据持久化（使用node-mysql或node-mongo连接数据库）
// 3. API测试工具（Postman/Bruno/APIfox）中添加上述5个API的测试，并添加到一个Collection中

const express = require('express')
const mysql = require('mysql2')

const chance = require('chance')
const crypto = require('crypto')
const jwt = require('jsonwebtoken')
const { expressjwt } = require('express-jwt')

//定义密钥
const SECRET_KEY = 'my_secret_key_0526'

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


let serverVerifyCode = null; 

app.get('/get-code', (req, res) => {
  const { phone } = req.body
  if (!phone) return res.status(400).json({ msg: "Missing phone number" })
    const code = chance.string({length: 4, pool: '0123456789' });
    serverVerifyCode = code.toString(); 
  
    console.log('当前生成的验证码是:', serverVerifyCode);

    res.json({ msg: "验证码已生成，请查看控制台" });
});



// 注册新用户
app.post('/signup', (req, res) => {
    const { username, password, verifycode } = req.body
    if (!username || !password || !verifycode) return res.status(400).json({ msg: "Missing fields" })
    
    if (!serverVerifyCode || String(verifycode) !== serverVerifyCode) {
          return res.status(400).json({ msg:"Error" })
    }
    const salt = crypto.randomBytes(16).toString('hex')
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
    if (err) return res.status(500).end() 

    const sql = 'INSERT INTO users (username, password,salt) VALUES (?, ?, ?)'
    connection.query(sql, [username, derivedKey.toString('hex'), salt], (err, result) => {
      if (err) return res.status(500).json({ msg: "Error" })
      res.json({ msg: "signup success" })
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
    crypto.scrypt(password, user.salt, 64, (err, derivedKey) => {
      if (err) return res.status(500).json({ msg: "Wrong password" })

      if (derivedKey.toString('hex') === user.password) {
        // 密码正确，生成 Token
        // payload: 存入 Token 的数据 (id, username)
        const payload = { id: user.id, username: user.username }
        const token = jwt.sign(payload, SECRET_KEY, { expiresIn: '24h' }) 

        res.json({ token: token })
      } else {
        return res.status(401).json({ msg: "Wrong password" })
      }
    })
  })
})

app.use(expressjwt({
  secret: SECRET_KEY,
  algorithms: ['sha1','RS256','HS256']
}).unless({
  path: [
    '/login',
    '/signup',
    '/get-code',
    '/',
    /^\/.*\.html$/,
    /^\/.*\.css$/,
    /^\/.*\.js$/
  ]
}))

app.use((err, req, res, next) => {
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({ msg: 'Invalid token or No token provided' })
  }
  next(err)
})

// 获取todo列表
app.get('/todos', function (req, res) {
  const page = parseInt(req.query.page) || 1
  const size = parseInt(req.query.size) || 10
  const status = req.query.status
  const userId = req.auth.id

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
app.get('/todos/:id', function (req, res) {
  const { id } = req.params
  const userId = req.auth.id

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
app.post('/todos', function (req, res) {
  const { content, deadline } = req.body
  const userId = req.auth.id
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
app.put('/todos/:id',function (req, res) {
  const { id } = req.params
  const { content, deadline, status } = req.body
  const userId = req.auth.id

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
app.delete('/todos/:id', function (req, res) {
  const { id } = req.params
  const userId = req.auth.id

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

