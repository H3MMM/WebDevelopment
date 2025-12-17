### 日历功能

引入

### 扫描线和屏幕闪烁效果

### 日期没有明显图标

### 前端和后端行为不一致

1. 前端直接使用后端发来的时间，发送回去时与sql语句格式不符
2. 后端检测太过严格，不允许部分修改

### 参数数量超过一页时翻页按钮会被挤掉





### 用户注册系统的思路是什么

#### 1. 数据库层面

目前的 `todos` 表是全局共享的。你需要引入“所有权”的概念：

- **新增一张 `users` 表**：存储用户的基本信息（如 `id`, `username`, `password` 等）。
- **修改 `todos` 表结构**：增加一个外键字段，例如 `user_id`。
  - 这样每一条待办事项都会标注它属于哪个用户。

------

#### 2. 身份验证 

你需要一套机制来识别“当前发起请求的人是谁”：

- **注册与登录**：
  1. 用户提交用户名和密码。
  2. 后端校验密码（注意：数据库应存储加密后的 Hash 值，而非明文）。
  3. 校验通过后，后端发给前端一个“通行证”。
- **令牌机制 (JWT)**：目前主流做法是使用 **JSON Web Token (JWT)**。
  - 用户登录后，服务器生成一个包含 `user_id` 的加密字符串（Token）返给前端。
  - 前端此后每次请求都在 Header（通常是 `Authorization`）中带上这个 Token。

#### 3. 鉴定与权限 

后端不再信任前端传来的任何关于身份的参数，而是通过解析 Token 来确定身份：

- **中间件 (Middleware)**：在 Express 中写一个中间件。
  - 它的工作是拦截所有 `/todos` 开头的请求。
  - 解析 Header 里的 Token，拿到该用户的 `user_id`。
  - 把这个 `user_id` 挂载到 `req` 对象上（例如 `req.user = { id: 123 }`）。
- **业务逻辑解耦**：
  - 你的 API 逻辑变为：`const userId = req.user.id;`
  - SQL 变为：`SELECT * FROM todos WHERE user_id = ?`。

#### 4. API 设计

虽然 URL 路径可能看起来没变（依然是 `GET /todos`），但含义变了：

- **以前**：获取数据库里**所有**人的 Todo。
- **以后**：获取**当前登录用户**的 Todo。
- **安全性**：即使某人知道了别人的 Todo ID，如果他尝试 `DELETE /todos/99`，你的后端会检查：`DELETE FROM todos WHERE id = 99 AND user_id = 当前用户ID`。如果受影响行数为 0，说明他没权限删除该条目。



### 数据库新建users表并且在两个表之间添加关联

```mysql
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    -- INT定义其数据类型，AUTO_INCREMENT让其自增，ID每次+1
    -- PRIMARY KEY是主键约束，让id拥有以下两条性质
    -- 唯一性：表里任何两行的 ID 不能重复。
    -- 非空性：这一列绝对不能为空（NOT NULL）。
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL, -- 实际开发中应存储加密后的哈希值
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. 为 todos 表添加 user_id 外键列
ALTER TABLE todos ADD COLUMN user_id INT;

-- 3. 设置外键约束（确保数据一致性）
ALTER TABLE todos 
-- 修改todos这张表
ADD CONSTRAINT fk_todo_user 
-- 添加约束
FOREIGN KEY (user_id) REFERENCES users(id) 
-- 添加外键约束，绑定users表中的id列
ON DELETE CASCADE;
-- 级联删除 删掉一张表里的数据，另一张表也跟着删除
```



### 为什么要自定义一个密钥 (`SECRET_KEY`)？

**通俗解释：这是“公章”或“皇帝的玉玺”。**

JWT (Token) 本质上是一串字符串，包含着用户的信息（比如 ID=1）。 如果**没有密钥**，或者密钥泄露了，任何人都可以伪造一个 Token，把里面的 ID 改成 1（管理员），然后发给服务器。服务器如果不验证签名，就会以为他是管理员。

- **它的作用**：服务器用这个密钥给 Token **“盖章”（签名）**。
- **验证逻辑**：当 Token 传回来时，服务器用同样的密钥检查这个“章”是不是自己盖的。如果黑客篡改了 Token 里的数据，或者不知道密钥，他是盖不出正确的章的，服务器就会拒绝请求。



### `bcrypt` 和 `jwt` 分别是做什么的？

虽然它们都跟安全有关，但分工完全不同：

- **`bcryptjs` (保安)**：**负责密码存储安全**。
  - **场景**：注册和登录。
  - **作用**：它把用户输入的密码（如 "123456"）变成一堆乱码（如 `$2a$10$X8...`）。这样即使数据库被盗，黑客也看不出原始密码是什么。它具有“不可逆”的特性。
- **`jsonwebtoken` (签证官)**：**负责身份传输安全**。
  - **场景**：登录成功后的每一次请求。
  - **作用**：它把用户的身份信息打包成一个加密的字符串（Token）。用户拿着这个 Token，就像拿着签证一样，服务器看到签证就知道他是谁，不用每次都输密码。



### `app.post` 是什么意思？

这是 **Express 框架** 定义路由（URL）的一种语法。

- **含义**：它告诉服务器，“当有人向这个 URL 发送 **HTTP POST** 请求时，请运行后面的函数”。
- **类比**：
  - `app.get` 就像去信箱**取信**（获取数据）。
  - `app.post` 就像往邮筒里**投信**（提交/新增数据）。
- **使用场景**：因为登录（传递密码）、注册（传递用户信息）、新增 Todo 都需要向服务器提交敏感或大量数据，所以通常使用 POST 方法，而不是 GET。



### 为什么 `bcrypt.compare` 不需要去数据库里面取值吗？

**这是个非常敏锐的观察！** 答案是：**取值的动作已经在上一行代码做完了。**

请看这段代码的执行顺序：

JavaScript

```
// 第一步：先去数据库查！
const sql = 'SELECT * FROM users WHERE username = ?'
connection.query(sql, [username], (err, results) => {
    // ...
    // 第二步：拿到数据库里的整行数据，存到了 user 变量里
    const user = results[0] 

    // 第三步：直接对比
    // password 是用户刚才输入的 "123"
    // user.password 是刚才从数据库里取出来的乱码 "$2a$10$..."
    bcrypt.compare(password, user.password, ...) 
})
```

- `bcrypt.compare` 是一个纯计算过程（数学运算）。
- 它不需要连接数据库，它只需要两个参数：**明文**（用户输的）和 **密文**（内存里已经取到的）。



### `res.json({ token: token })` 是什么意思？

这是服务器对客户端的 **“回信”**。

- `res`：Response（响应对象）。

- `.json(...)`：告诉客户端（浏览器/Postman），我发给你的是 **JSON 格式** 的数据。

- `{ token: token }`：这是 JS 的对象写法。

  - 前面的 `token` 是 **Key**（数据的名字）。
  - 后面的 `token` 是 **Value**（刚才生成的那个长长的字符串变量）。

- **结果**：Postman 会收到类似这样的响应：

  JSON

  ```
  {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
  ```

  客户端拿到这个 Token 后，就会把它存起来（比如存到 LocalStorage），下次请求时带上。



### 为什么要全部加上中间件 (`authenticateToken`)？

**为了构建“安检门”。**

- **如果不加**：
  - 一旦你的 API 上线，世界上的任何人（不需要账号）都可以直接用 Postman 发送 `DELETE http://你的IP/todos/5`，把 ID 为 5 的待办事项删掉。这太可怕了！
- **加上之后**：
  - 这个中间件就像站在门口的安检员。
  - **每一次** 请求（查、增、删、改），请求必须先经过安检员。
  - 安检员检查 Header 里有没有合法的 Token。
  - **只有** 有合法 Token 的人，安检员才会放行（调用 `next()`），让你进入真正的业务函数。

**注意**：只有 `/login` 和 `/register` **不需要** 加中间件，因为那是“办证大厅”，还没证的人当然也要能进。
