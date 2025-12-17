const API_URL = '/todos';

// Theme Management
const themeToggle = document.getElementById('themeToggle');
// 默认主题 'amber' (CSS中默认), 另一个是 'green'

function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    // 这里其实不需要改图标了，因为我们在HTML里把图标换成了电源指示灯
}

// Initialize Theme
const savedTheme = localStorage.getItem('theme');
if (savedTheme) {
    setTheme(savedTheme);
} else {
    setTheme('amber'); // Default
}

themeToggle.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    // 切换 琥珀色 / 绿色 终端
    setTheme(currentTheme === 'green' ? 'amber' : 'green');
});

// Initialize Flatpickr (保持不变，但 CSS 会覆盖样式)
const fp = flatpickr("#deadline", {
    locale: "zh",
    dateFormat: "Y-m-d",
    disableMobile: "true", // 强制在手机上也使用自定义样式
    altInput: true,
    altFormat: "Y-m-d", // 保持格式复古
    placeholder: "DATE: [YYYY-MM-DD]"
});

// Initialize Flatpickr for Edit Form
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
    fetchTodos(); // Fetch active todos by default

    document.getElementById('todoForm').addEventListener('submit', handleAddTodo);

    // Archive Modal Logic
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

    // Edit Modal Logic
    const editModal = document.getElementById('editModal');
    const closeEditBtn = editModal.querySelector('.close-edit-btn');
    const editForm = document.getElementById('editForm');

    closeEditBtn.addEventListener('click', () => {
        editModal.classList.remove('show');
    });

    editForm.addEventListener('submit', handleEditTodo);

    //点击模态框外的任意区域关闭模态框
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
        // Fetch only active todos (status=0)
        const response = await fetch(`${API_URL}?page=1&size=1000&status=0`);
        if (!response.ok) throw new Error('Failed to fetch');
        const todos = await response.json();
        renderTodos(todos);
    } catch (error) {
        console.error('Error:', error);
    }
}

async function fetchCompletedTodos() {
    try {
        // Fetch completed todos (status=1)
        const response = await fetch(`${API_URL}?page=1&size=100&status=1`);
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

    // Checkbox
    const checkbox = document.createElement('div');
    checkbox.className = 'checkbox';
    checkbox.addEventListener('click', () => toggleStatus(todo));

    // Content
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

    // Delete Button
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
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            const result = await response.json();
            contentInput.value = '';
            fp.clear();
            
            const detailResponse = await fetch(`${API_URL}/${result.id}`);
            if (detailResponse.ok) {
                const newTodo = await detailResponse.json();
                const list = document.getElementById('todoList');
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

async function deleteTodo(id) {
    if (!confirm('CONFIRM_DELETION?')) return;

    const element = document.getElementById(`todo-${id}`);
    if (element) {
        element.classList.add('removing');
        await new Promise(resolve => setTimeout(resolve, 400));
    }

    try {
        const response = await fetch(`${API_URL}/${id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            if (element) element.remove();
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

async function toggleStatus(todo) {
    const newStatus = todo.status == 1 ? 0 : 1;
    
    // Visual feedback
    const element = document.getElementById(`todo-${todo.id}`);
    if (element) {
        element.classList.add('removing');
        await new Promise(resolve => setTimeout(resolve, 400));
        element.remove();
    }

    // Format date to YYYY-MM-DD to avoid MySQL errors
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
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            if (newStatus === 0) {
                fetchTodos(); // Refresh main list
            }
        } else {
            console.error('Update failed:', await response.text());
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

async function handleEditTodo(e) {
    e.preventDefault();
    const id = document.getElementById('editId').value;
    const content = document.getElementById('editContent').value;
    const deadline = document.getElementById('editDeadline').value;

    const data = {
        content: content,
        deadline: deadline || null,
        status: 0 // Assuming we are editing active todos
    };

    try {
        const response = await fetch(`${API_URL}/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

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

function escapeHtml(text) {
    if (!text) return '';
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
