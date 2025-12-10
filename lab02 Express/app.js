// 1. 使用Express开发一个HTTP服务器，实现5个API：获取todo列表、获取单个todo详情、新增单个todo、删除单个todo、更新单个todo
// 2. 所有接口使用MySQL或者MongoDB实现数据持久化（使用node-mysql或node-mongo连接数据库）
// 3. API测试工具（Postman/Bruno/APIfox）中添加上述5个API的测试，并添加到一个Collection中

const express = require('express')
const mysql = require('mysql2')

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
app.use(express.static('public'))

// 获取todo列表
app.get('/todos', function (req, res) {
  const page = parseInt(req.query.page) || 1
  const size = parseInt(req.query.size) || 10
  const status = req.query.status
  
  let sql = 'SELECT * FROM todos'
  let params = []
  
  if (status !== undefined) {
    sql += ' WHERE status = ?'
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
  if (isNaN(id)) {
    return res.status().json({msg: "invalid parameters"})
  }
  const sql = 'SELECt * FROM todos WHERE id = ?'
  connection.query(sql, [id], (err, result) => {
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
  if (!content) {
    return res.status(400).json({ msg: "invalid parameters" })
  }
  const sql = 'INSERT INTO todos (content, deadline) VALUES (?, ?)'
  connection.query(sql, [content,deadline], (err, result) => {
    if (err) {
      return res.status(500).json({ msg: err })
    }
    res.status(200).json({ id: result.insertId })
  })
})

// 更新单个todo
app.put('/todos/:id', function (req, res) {
  const { id } = req.params
  const { content, deadline, status } = req.body
  
  const sql = 'UPDATE todos set content = ?, deadline = ?, status = ? WHERE id = ?'
 
  const formattedDeadline = deadline ? deadline : null;
  
  const args = [content, formattedDeadline, status, id]

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
  if (!id) {
    return res.status(400).json({msg: "invalid parameters"})
  }
  const sql = 'DELETE FROM todos WHERE id = ?'
  connection.query(sql, [id], err => {
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
