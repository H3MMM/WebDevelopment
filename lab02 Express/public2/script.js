const API_URL = '/todos';
let currentPage = 1;
const pageSize = 10;

// Theme Management
const themeToggle = document.getElementById('themeToggle');
const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');

function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
}

// Initialize Theme
const savedTheme = localStorage.getItem('theme');
if (savedTheme) {
    setTheme(savedTheme);
} else if (prefersDarkScheme.matches) {
    setTheme('dark');
}

themeToggle.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    setTheme(currentTheme === 'dark' ? 'light' : 'dark');
});

// Initialize Flatpickr
const fp = flatpickr("#deadline", {
    locale: "zh",
    dateFormat: "Y-m-d",
    disableMobile: "true",
    altInput: true,
    altFormat: "Y年m月d日",
    placeholder: "选择日期"
});

// App Logic
document.addEventListener('DOMContentLoaded', () => {
    fetchTodos(); // Fetch active todos by default

    document.getElementById('todoForm').addEventListener('submit', handleAddTodo);
    document.getElementById('prevBtn').addEventListener('click', () => changePage(-1));
    document.getElementById('nextBtn').addEventListener('click', () => changePage(1));

    // Modal Logic
    const modal = document.getElementById('archiveModal');
    const archiveBtn = document.getElementById('archiveBtn');
    const closeBtn = document.querySelector('.close-btn');

    archiveBtn.addEventListener('click', () => {
        modal.classList.add('show');
        fetchCompletedTodos();
    });

    closeBtn.addEventListener('click', () => {
        modal.classList.remove('show');
    });

    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('show');
        }
    });
});

async function fetchTodos() {
    try {
        // Fetch only active todos (status=0)
        const response = await fetch(`${API_URL}?page=${currentPage}&size=${pageSize}&status=0`);
        if (!response.ok) throw new Error('Failed to fetch');
        const todos = await response.json();
        renderTodos(todos);
        document.getElementById('pageInfo').textContent = currentPage;
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

    li.innerHTML = `
        <div class="checkbox" onclick="toggleStatus(${todo.id}, '${escapeHtml(todo.content)}', '${todo.deadline}', ${todo.status})"></div>
        <div class="content-wrapper">
            <span class="todo-content">${escapeHtml(todo.content)}</span>
            ${dateStr ? `<span class="todo-date">${dateStr}</span>` : ''}
        </div>
        <button class="delete-btn" onclick="deleteTodo(${todo.id})">
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
        </button>
    `;
    return li;
}

function renderTodos(todos) {
    const list = document.getElementById('todoList');
    list.innerHTML = '';

    if (todos.length === 0) {
        list.innerHTML = '<li style="text-align:center; color:var(--text-secondary); padding: 20px;">暂无任务，享受生活吧 ☕</li>';
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
        list.innerHTML = '<li style="text-align:center; color:var(--text-secondary); padding: 20px;">空空如也</li>';
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
                if (list.firstElementChild && list.firstElementChild.innerText.includes('暂无任务')) {
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
    if (!confirm('确定要删除吗？')) return;

    const element = document.getElementById(`todo-${id}`);
    if (element) {
        element.classList.add('removing');
        // Wait for animation to finish
        await new Promise(resolve => setTimeout(resolve, 400));
    }

    try {
        const response = await fetch(`${API_URL}/${id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            if (element) element.remove();
            // Refresh lists if needed, but removing element is enough for visual feedback
            // fetchTodos(); 
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

async function toggleStatus(id, content, deadline, currentStatus) {
    const newStatus = currentStatus == 1 ? 0 : 1;
    
    // Visual feedback: animate removal from current list
    const element = document.getElementById(`todo-${id}`);
    if (element) {
        element.classList.add('removing');
        await new Promise(resolve => setTimeout(resolve, 400));
        element.remove();
    }

    const data = {
        content: content,
        deadline: deadline === 'null' ? null : deadline,
        status: newStatus
    };

    try {
        const response = await fetch(`${API_URL}/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            // If we are in the modal (viewing completed), and we just unchecked an item,
            // it should disappear from modal (handled above) and appear in main list.
            // If we are in main list, and checked an item, it disappears (handled above).
            // To keep it simple, we can just re-fetch the active list if we are on the main page.
            if (newStatus === 0) {
                fetchTodos(); // Refresh main list to show the restored item
            } else {
                // Item moved to completed, no need to refresh main list as we removed it visually
                // But if modal is open, we might want to refresh it? 
                // Usually modal is closed when doing this action from main list.
            }
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

function changePage(delta) {
    if (currentPage + delta < 1) return;
    currentPage += delta;
    fetchTodos();
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
