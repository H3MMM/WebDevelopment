var mysql = require('mysql2');

var connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '123',
  database: 'test'
});

// 连接数据库
connection.connect(function (err) {
  if (err) {
    console.error('连接失败: ' + err.stack);
    return;
  }
  console.log('连接成功，ID: ' + connection.threadId);
});

// 查询表中数据
connection.query('SELECT * FROM websites', function (error, results, fields) {
  if (error) throw error;

  console.log('查询结果如下：');
  console.log(results);
});

// 关闭连接
connection.end();
