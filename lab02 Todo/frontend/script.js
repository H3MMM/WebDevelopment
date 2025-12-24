const API_URL = '/todos';

// Auth Check
function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token || token === 'undefined' || token === 'null') {
        localStorage.removeItem('token');
        window.location.href = 'login.html';
        return null;
    }
    return token;
}

function getHeaders() {
    const token = localStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
}

function handleUnauthorized(response) {
    if (response.status === 401) {
        console.log('Unauthorized! Redirecting to login...');
        localStorage.removeItem('token');
        window.location.href = 'login.html';
        return true;
    }
    return false;
}

// Theme Management
const themeToggle = document.getElementById('themeToggle');

function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
}

const savedTheme = localStorage.getItem('theme');
if (savedTheme) {
    setTheme(savedTheme);
} else {
    setTheme('amber');
}

if (themeToggle) {
    themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        setTheme(currentTheme === 'blue' ? 'amber' : 'blue');
    });
}

// Initialize Flatpickr
const fp = flatpickr("#deadline", {
    locale: "zh",
    dateFormat: "Y-m-d",
    disableMobile: "true",
    altInput: true,
    altFormat: "Y-m-d",
    placeholder: "DATE: [YYYY-MM-DD]"
});

const fpEdit = flatpickr("#editDeadline", {
    locale: "zh",
    dateFormat: "Y-m-d",
    disableMobile: "true",
    altInput: true,
    altFormat: "Y-m-d",
    placeholder: "DATE: [YYYY-MM-DD]"
});

// App Logic
document.addEventListener('DOMContentLoaded', () => {
    // 1. 优先检查权限，如果没有token，这里就会跳转
    if (!checkAuth()) return;

    fetchTodos();
    
    const userDisplay = document.getElementById('userDisplay');
    if (userDisplay) {
        userDisplay.textContent = `USER: ${localStorage.getItem('username') || 'UNKNOWN'}`;
    }

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('token');
            localStorage.removeItem('username');
            window.location.href = 'login.html';
        });
    }

    document.getElementById('todoForm').addEventListener('submit', handleAddTodo);

    // Modal Logic
    const archiveModal = document.getElementById('archiveModal');
    const archiveBtn = document.getElementById('archiveBtn');
    const closeArchiveBtn = archiveModal.querySelector('.close-btn');

    archiveBtn.addEventListener('click', () => {
        archiveModal.classList.add('show');
        fetchCompletedTodos();
    });

    closeArchiveBtn.addEventListener('click', () => {
        archiveModal.classList.remove('show');
    });

    const editModal = document.getElementById('editModal');
    const closeEditBtn = editModal.querySelector('.close-edit-btn');
    const editForm = document.getElementById('editForm');

    closeEditBtn.addEventListener('click', () => {
        editModal.classList.remove('show');
    });

    editForm.addEventListener('submit', handleEditTodo);

    window.addEventListener('click', (e) => {
        if (e.target === archiveModal) {
            archiveModal.classList.remove('show');
        }
        if (e.target === editModal) {
            editModal.classList.remove('show');
        }
    });
});

async function fetchTodos() {
    try {
        const response = await fetch(`${API_URL}?page=1&size=1000&status=0`, {
            headers: getHeaders()
        });
        if (handleUnauthorized(response)) return;
        if (!response.ok) throw new Error('Failed to fetch');
        const todos = await response.json();
        renderTodos(todos);
    } catch (error) {
        console.error('Error:', error);
    }
}

async function fetchCompletedTodos() {
    try {
        const response = await fetch(`${API_URL}?page=1&size=100&status=1`, {
            headers: getHeaders()
        });
        if (handleUnauthorized(response)) return;
        if (!response.ok) throw new Error('Failed to fetch');
        const todos = await response.json();
        renderCompletedTodos(todos);
    } catch (error) {
        console.error('Error:', error);
    }
}

function createTodoElement(todo, index = 0) {
    const li = document.createElement('li');
    li.className = `todo-item ${todo.status == 1 ? 'completed' : ''}`;
    li.id = `todo-${todo.id}`;
    li.style.animationDelay = `${index * 0.05}s`; 
    
    const dateStr = todo.deadline ? new Date(todo.deadline).toLocaleDateString() : '';

    const checkbox = document.createElement('div');
    checkbox.className = 'checkbox';
    checkbox.addEventListener('click', () => toggleStatus(todo));

    const contentWrapper = document.createElement('div');
    contentWrapper.className = 'content-wrapper';
    contentWrapper.style.cursor = 'pointer';
    contentWrapper.addEventListener('click', () => openEditModal(todo));
    
    const contentSpan = document.createElement('span');
    contentSpan.className = 'todo-content';
    contentSpan.textContent = todo.content;
    contentWrapper.appendChild(contentSpan);
    
    if (dateStr) {
        const dateSpan = document.createElement('span');
        dateSpan.className = 'todo-date';
        dateSpan.textContent = dateStr;
        contentWrapper.appendChild(dateSpan);
    }

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.innerHTML = '<svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>';
    deleteBtn.addEventListener('click', () => deleteTodo(todo.id));

    li.appendChild(checkbox);
    li.appendChild(contentWrapper);
    li.appendChild(deleteBtn);

    return li;
}

function renderTodos(todos) {
    const list = document.getElementById('todoList');
    list.innerHTML = '';

    if (todos.length === 0) {
        list.innerHTML = '<li style="text-align:center; color:var(--text-secondary); padding: 20px;">NO_DATA_FOUND</li>';
        return;
    }
    todos.forEach((todo, index) => {
        list.appendChild(createTodoElement(todo, index));
    });
}

function renderCompletedTodos(todos) {
    const list = document.getElementById('completedList');
    list.innerHTML = '';
    if (todos.length === 0) {
        list.innerHTML = '<li style="text-align:center; color:var(--text-secondary); padding: 20px;">EMPTY_ARCHIVE</li>';
        return;
    }
    todos.forEach((todo, index) => {
        list.appendChild(createTodoElement(todo, index));
    });
}

// 【修复点】 之前这里的 fetch 语法全乱了
async function handleAddTodo(e) {
    e.preventDefault();
    const contentInput = document.getElementById('content');
    const deadlineInput = document.getElementById('deadline');

    const data = {
        content: contentInput.value,
        deadline: deadlineInput.value || null
    };

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(data)
        });
        
        if (handleUnauthorized(response)) return;

        if (response.ok) {
            const result = await response.json();
            contentInput.value = '';
            fp.clear();
            
            const detailResponse = await fetch(`${API_URL}/${result.id}`, {
                headers: getHeaders()
            });
            if (detailResponse.ok) {
                const newTodo = await detailResponse.json();
                const list = document.getElementById('todoList');
                // 简单的检查：如果当前列表里是"NO_DATA_FOUND"，则清空
                if (list.firstElementChild && list.firstElementChild.innerText.includes('NO_DATA')) {
                    list.innerHTML = '';
                }
                list.appendChild(createTodoElement(newTodo));
            }
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

// 【修复点】 这里的 fetch 之前也断开了
async function deleteTodo(id) {
    if (!confirm('CONFIRM_DELETION?')) return;

    const element = document.getElementById(`todo-${id}`);
    if (element) {
        element.classList.add('removing');
        // 等待动画
        await new Promise(resolve => setTimeout(resolve, 400));
    }

    try {
        const response = await fetch(`${API_URL}/${id}`, {
            method: 'DELETE',
            headers: getHeaders()
        });
        if (handleUnauthorized(response)) return;

        if (response.ok) {
            if (element) element.remove();
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

// 【修复点】 这里的 fetch 也是
async function toggleStatus(todo) {
    const newStatus = todo.status == 1 ? 0 : 1;
    
    const element = document.getElementById(`todo-${todo.id}`);
    if (element) {
        element.classList.add('removing');
        await new Promise(resolve => setTimeout(resolve, 400));
        element.remove();
    }

    let formattedDeadline = null;
    if (todo.deadline) {
        const dateObj = new Date(todo.deadline);
        if (!isNaN(dateObj.getTime())) {
            formattedDeadline = dateObj.toISOString().split('T')[0];
        }
    }

    const data = {
        content: todo.content,
        deadline: formattedDeadline,
        status: newStatus
    };

    try {
        const response = await fetch(`${API_URL}/${todo.id}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(data)
        });
        
        if (handleUnauthorized(response)) return;

        if (response.ok) {
            if (newStatus === 0) {
                fetchTodos(); // Refresh main list
            }
        } else {
            console.error('Update failed');
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

function openEditModal(todo) {
    const editModal = document.getElementById('editModal');
    const editId = document.getElementById('editId');
    const editContent = document.getElementById('editContent');
    
    editId.value = todo.id;
    editContent.value = todo.content;
    
    if (todo.deadline) {
        fpEdit.setDate(new Date(todo.deadline));
    } else {
        fpEdit.clear();
    }

    editModal.classList.add('show');
}

// 【修复点】 修复 PUT 请求语法
async function handleEditTodo(e) {
    e.preventDefault();
    const id = document.getElementById('editId').value;
    const content = document.getElementById('editContent').value;
    const deadline = document.getElementById('editDeadline').value;

    const data = {
        content: content,
        deadline: deadline || null,
        status: 0 
    };
    
    try {
        const response = await fetch(`${API_URL}/${id}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(data)
        });
        
        if (handleUnauthorized(response)) return;

        if (response.ok) {
            document.getElementById('editModal').classList.remove('show');
            fetchTodos();
        } else {
            console.error('Update failed');
        }
    } catch (error) {
        console.error('Error:', error);
    }
}