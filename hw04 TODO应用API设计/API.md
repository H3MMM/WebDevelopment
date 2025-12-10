## 显示已经创建的待办事项列表

#### **URL**：GET/todos

#### **HTTP动作**：GET

#### **请求参数**：无

#### **响应码**

- 200 OK
- 404 Not Found(当前列表为空/资源不存在)

#### 返回数据

```json
{
  "code": 200,
  "message": "操作成功",
  "data": [
    {
      "id": 1,
      "detail": "完成API设计作业",
      "deadline": "2025-11-12",
      "status": "done"
    },
    {
      "id": 2,
      "detail": "出去玩",
      "deadline": "2025-11-13",
      "status": "todo"
    }
  ]
}

```



## 显示代办事项详情

#### **URL**：GET/todos/{id}

#### **HTTP动作**：GET

#### **请求参数**：id(int型) 用户点击的事项ID  

#### **响应码**

- 200 OK
- 404 Not Found

#### 返回数据

```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
      "detail": "完成API设计作业",
      "deadline": "2025-11-12",
      "status": "done"
  }
}
```



## 新建一个待办事项信息

#### **URL**：POST/todos

#### **HTTP动作**：POST

#### **请求参数**：

- "detail": "学习RESTful API",
- "deadline": "2025-11-12",
- "status": "todo" 

#### **响应码**

- 201 Created
- 405 Invalid input

#### 返回数据

```json
{
  "code": 201,
  "message": "新事项已创建",
  "data": {
    "id": 3
  }
}
```



## 更新某个待办事项信息

#### **URL**：PUT/todos/{id}

#### **HTTP动作**：PUT/PATCH

#### **请求参数**：

- "detail": "修改后的内容",
- "deadline": "2025-11-20",
- "status": "done" 

#### **响应码**

- 200 OK
- 404 Not Found
- 405 Invalid input

#### 返回数据

```json
{
  "code": 200,
  "message": "事项已成功更新"
}
```



## 删除某个待办事项

#### **URL**：DELETE/todos/{id}

#### **HTTP动作**：DELETE

#### **请求参数**：id(int型)  用户点击的事项ID  

#### **响应码**

- 204 No Content
- 404 Not Found

#### 返回数据

```json
{
  "code": 204,
  "message": "该事项已成功删除"
}
```

