// docs/script.js
class AvatarManager {
    constructor() {
        this.apiBase = 'https://api.github.com';
        this.repo = window.location.pathname.split('/')[1] || 'Daily-Avatar-Rotator';
        this.currentUser = null;
        this.avatars = [];
        this.selectedAvatar = null;
        
        this.init();
    }

    async init() {
        this.bindEvents();
        await this.checkAuth();
        await this.loadStatus();
        await this.loadAvatars();
        await this.loadHistory();
    }

    bindEvents() {
        // Кнопки действий
        document.getElementById('btn-manual-update').addEventListener('click', () => this.manualUpdate());
        document.getElementById('btn-select-random').addEventListener('click', () => this.selectRandom());
        document.getElementById('btn-test-selected').addEventListener('click', () => this.testSelected());
        document.getElementById('btn-refresh-list').addEventListener('click', () => this.loadAvatars());
        document.getElementById('btn-upload').addEventListener('click', () => this.triggerUpload());
        document.getElementById('btn-save-schedule').addEventListener('click', () => this.saveSchedule());
        
        // Загрузка файлов
        document.getElementById('avatar-upload').addEventListener('change', (e) => this.handleUpload(e));
        
        // Модальное окно
        document.querySelector('.modal-close').addEventListener('click', () => this.closeModal());
        document.getElementById('btn-set-avatar').addEventListener('click', () => this.setAvatar());
        document.getElementById('btn-delete-avatar').addEventListener('click', () => this.deleteAvatar());
        document.getElementById('notification-close').addEventListener('click', () => this.hideNotification());
        
        // Закрытие модального окна по клику вне его
        document.getElementById('preview-modal').addEventListener('click', (e) => {
            if (e.target.id === 'preview-modal') this.closeModal();
        });
    }

    async checkAuth() {
        try {
            // Пытаемся получить информацию о пользователе через GitHub API
            const response = await fetch(`${this.apiBase}/user`);
            if (response.ok) {
                this.currentUser = await response.json();
                return true;
            }
            return false;
        } catch (error) {
            console.error('Auth check failed:', error);
            return false;
        }
    }

    async loadStatus() {
        try {
            // Получаем статус workflow
            const response = await fetch(
                `https://api.github.com/repos/${this.currentUser.login}/${this.repo}/actions/runs?event=schedule`,
                {
                    headers: {
                        'Accept': 'application/vnd.github.v3+json'
                    }
                }
            );
            
            if (response.ok) {
                const data = await response.json();
                const lastRun = data.workflow_runs[0];
                
                if (lastRun) {
                    document.getElementById('last-update').textContent = 
                        new Date(lastRun.updated_at).toLocaleString('ru-RU');
                    
                    const statusElement = document.getElementById('status');
                    statusElement.className = `status ${lastRun.conclusion === 'success' ? 'success' : 'error'}`;
                    statusElement.innerHTML = `
                        <i class="fas fa-${lastRun.conclusion === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
                        Последнее обновление: ${lastRun.conclusion === 'success' ? '✅ Успешно' : '❌ Ошибка'}
                    `;
                }
            }
        } catch (error) {
            console.error('Failed to load status:', error);
        }
    }

    async loadAvatars() {
        try {
            // Получаем список файлов из репозитория
            const response = await fetch(
                `https://api.github.com/repos/${this.currentUser.login}/${this.repo}/contents/avatars`,
                {
                    headers: {
                        'Accept': 'application/vnd.github.v3+json'
                    }
                }
            );
            
            if (response.ok) {
                const files = await response.json();
                this.avatars = files.filter(file => 
                    file.type === 'file' && 
                    /\.(png|jpg|jpeg)$/i.test(file.name)
                );
                
                this.renderGallery();
                document.getElementById('avatar-count').textContent = this.avatars.length;
            }
        } catch (error) {
            console.error('Failed to load avatars:', error);
            this.showNotification('Не удалось загрузить список аватаров', 'error');
        }
    }

    renderGallery() {
        const gallery = document.getElementById('avatar-gallery');
        
        if (this.avatars.length === 0) {
            gallery.innerHTML = `
                <div class="empty-gallery">
                    <i class="fas fa-image" style="font-size: 48px; color: #8b949e; margin-bottom: 20px;"></i>
                    <p>Нет доступных аватаров</p>
                    <p class="text-muted">Загрузите изображения в папку avatars/</p>
                </div>
            `;
            return;
        }
        
        gallery.innerHTML = this.avatars.map(avatar => `
            <div class="avatar-item" data-name="${avatar.name}" data-url="${avatar.download_url}">
                <img src="${avatar.download_url}" alt="${avatar.name}" 
                     loading="lazy" onerror="this.src='https://via.placeholder.com/150?text=Error'">
                <div class="avatar-name">${avatar.name}</div>
            </div>
        `).join('');
        
        // Добавляем обработчики кликов
        document.querySelectorAll('.avatar-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const name = item.dataset.name;
                const url = item.dataset.url;
                this.previewAvatar(name, url);
            });
        });
    }

    previewAvatar(name, url) {
        this.selectedAvatar = { name, url };
        
        // Обновляем модальное окно
        document.getElementById('modal-preview').src = url;
        document.getElementById('modal-filename').textContent = name;
        
        // Получаем размер файла
        fetch(url).then(res => {
            const size = res.headers.get('content-length');
            document.getElementById('modal-size').textContent = 
                size ? `${(size / 1024).toFixed(2)} KB` : 'Неизвестно';
        });
        
        // Открываем модальное окно
        document.getElementById('preview-modal').classList.remove('hidden');
        
        // Обновляем текущий аватар в интерфейсе
        document.getElementById('current-avatar').src = url;
        document.getElementById('current-filename').textContent = name;
    }

    async manualUpdate() {
        try {
            this.showNotification('Запуск обновления аватара...', 'info');
            
            // Здесь должен быть вызов GitHub API для запуска workflow
            // Это требует специального токена с правами на запуск workflow
            
            const response = await fetch(
                `https://api.github.com/repos/${this.currentUser.login}/${this.repo}/actions/workflows/update-avatar.yml/dispatches`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `token ${this.getToken()}`,
                        'Accept': 'application/vnd.github.v3+json'
                    },
                    body: JSON.stringify({
                        ref: 'main'
                    })
                }
            );
            
            if (response.ok) {
                this.showNotification('Обновление запущено успешно!', 'success');
                setTimeout(() => this.loadStatus(), 5000);
            } else {
                throw new Error(`HTTP ${response.status}`);
            }
        } catch (error) {
            console.error('Manual update failed:', error);
            this.showNotification('Не удалось запустить обновление', 'error');
        }
    }

    selectRandom() {
        if (this.avatars.length === 0) {
            this.showNotification('Нет доступных аватаров', 'warning');
            return;
        }
        
        const randomIndex = Math.floor(Math.random() * this.avatars.length);
        const randomAvatar = this.avatars[randomIndex];
        this.previewAvatar(randomAvatar.name, randomAvatar.download_url);
        this.showNotification(`Выбран аватар: ${randomAvatar.name}`, 'success');
    }

    async testSelected() {
        if (!this.selectedAvatar) {
            this.showNotification('Сначала выберите аватар', 'warning');
            return;
        }
        
        this.showNotification('Тестирование аватара...', 'info');
        // Здесь можно добавить предпросмотр или другие тесты
        setTimeout(() => {
            this.showNotification('Аватар готов к использованию!', 'success');
        }, 1000);
    }

    triggerUpload() {
        document.getElementById('avatar-upload').click();
    }

    async handleUpload(event) {
        const files = Array.from(event.target.files);
        
        if (files.length === 0) return;
        
        this.showNotification(`Загрузка ${files.length} файлов...`, 'info');
        
        // В реальном приложении здесь будет загрузка через GitHub API
        // Для демо просто добавляем в список
        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const newAvatar = {
                    name: file.name,
                    download_url: e.target.result,
                    size: file.size
                };
                this.avatars.push(newAvatar);
                this.renderGallery();
            };
            reader.readAsDataURL(file);
        });
        
        this.showNotification(`Загружено ${files.length} файлов`, 'success');
        event.target.value = ''; // Сбрасываем input
    }

    async saveSchedule() {
        const schedule = document.getElementById('schedule-select').value;
        
        // Здесь будет сохранение расписания в workflow файл через GitHub API
        this.showNotification('Расписание сохранено', 'success');
        
        // Обновляем информацию о следующем обновлении
        this.updateNextScheduleTime(schedule);
    }

    updateNextScheduleTime(schedule) {
        const nextUpdate = this.calculateNextCron(schedule);
        document.getElementById('next-update').textContent = 
            nextUpdate ? nextUpdate.toLocaleString('ru-RU') : 'Вручную';
    }

    calculateNextCron(cronExpression) {
        if (cronExpression === 'manual') return null;
        
        // Простая реализация расчета следующего времени
        // В реальном приложении используйте библиотеку типа cron-parser
        const now = new Date();
        const next = new Date(now);
        next.setHours(next.getHours() + 24); // Просто для примера
        return next;
    }

    async setAvatar() {
        if (!this.selectedAvatar) return;
        
        this.showNotification('Установка аватара...', 'info');
        
        // Здесь будет вызов GitHub API для установки аватара
        // Требуется токен с правами user
        
        try {
            // Это примерный код, требуется настройка CORS и токена
            const response = await fetch(`${this.apiBase}/user`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `token ${this.getToken()}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/vnd.github.v3+json'
                },
                body: JSON.stringify({
                    // Нужно преобразовать изображение в base64
                })
            });
            
            if (response.ok) {
                this.showNotification('Аватар успешно установлен!', 'success');
                this.closeModal();
                this.loadStatus();
            }
        } catch (error) {
            this.showNotification('Ошибка при установке аватара', 'error');
        }
    }

    async deleteAvatar() {
        if (!this.selectedAvatar || !confirm('Удалить этот аватар?')) return;
        
        // Удаление через GitHub API
        this.showNotification('Аватар удалён (демо)', 'success');
        this.closeModal();
        setTimeout(() => this.loadAvatars(), 1000);
    }

    async loadHistory() {
        try {
            // Получаем историю workflow runs
            const response = await fetch(
                `https://api.github.com/repos/${this.currentUser.login}/${this.repo}/actions/runs`,
                {
                    headers: {
                        'Accept': 'application/vnd.github.v3+json'
                    }
                }
            );
            
            if (response.ok) {
                const data = await response.json();
                this.renderHistory(data.workflow_runs.slice(0, 10));
            }
        } catch (error) {
            console.error('Failed to load history:', error);
        }
    }

    renderHistory(runs) {
        const tbody = document.getElementById('history-body');
        
        if (!runs || runs.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" class="text-center">Нет данных об обновлениях</td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = runs.map(run => `
            <tr>
                <td>${new Date(run.created_at).toLocaleString('ru-RU')}</td>
                <td>${run.display_title || 'Обновление аватара'}</td>
                <td>
                    <span class="badge ${run.conclusion === 'success' ? 'badge-success' : 'badge-danger'}">
                        ${run.conclusion === 'success' ? '✅ Успешно' : '❌ Ошибка'}
                    </span>
                </td>
                <td>
                    <a href="${run.html_url}" target="_blank" class="btn-link">
                        <i class="fas fa-external-link-alt"></i> Подробности
                    </a>
                </td>
            </tr>
        `).join('');
    }

    showNotification(message, type = 'info') {
        const notification = document.getElementById('notification');
        const text = document.getElementById('notification-text');
        
        text.textContent = message;
        notification.className = `notification ${type}`;
        notification.classList.remove('hidden');
        
        // Автоматическое скрытие через 5 секунд
        setTimeout(() => this.hideNotification(), 5000);
    }

    hideNotification() {
        document.getElementById('notification').classList.add('hidden');
    }

    closeModal() {
        document.getElementById('preview-modal').classList.add('hidden');
    }

    getToken() {
        // В реальном приложении токен должен храниться безопасно
        // Это демо-версия
        return localStorage.getItem('github_token') || '';
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    window.avatarManager = new AvatarManager();
    
    // Обновляем время следующего обновления
    const scheduleSelect = document.getElementById('schedule-select');
    if (scheduleSelect) {
        scheduleSelect.addEventListener('change', (e) => {
            avatarManager.updateNextScheduleTime(e.target.value);
        });
        avatarManager.updateNextScheduleTime(scheduleSelect.value);
    }
});

// Вспомогательные функции
function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
