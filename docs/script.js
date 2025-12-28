// docs/script.js
class AvatarManager {
    constructor() {
        this.repoOwner = 'Gabryelf';
        this.repoName = 'Daily-Avatar-Rotator';
        this.workflowFile = 'update-avatar.yml';
        this.selectedAvatar = null;
        this.avatars = [];
        this.init();
    }

    async init() {
        this.bindEvents();
        await this.loadSystemStatus();
        await this.loadAvatars();
        await this.loadHistory();
    }

    bindEvents() {
        // Основные кнопки
        document.getElementById('btn-refresh').addEventListener('click', () => this.loadAvatars());
        document.getElementById('btn-select-random').addEventListener('click', () => this.selectRandomAvatar());
        document.getElementById('btn-run-selected').addEventListener('click', () => this.runSelectedAvatar());
        document.getElementById('btn-clear-selection').addEventListener('click', () => this.clearSelection());
        document.getElementById('btn-manual-setup').addEventListener('click', () => this.showManualInstructions());
        document.getElementById('notification-close').addEventListener('click', () => this.hideNotification());
    }

    async loadSystemStatus() {
        try {
            // Загружаем статус workflow
            const response = await fetch(
                `https://api.github.com/repos/${this.repoOwner}/${this.repoName}/actions/runs?per_page=1`
            );
            
            if (response.ok) {
                const data = await response.json();
                const lastRun = data.workflow_runs[0];
                
                if (lastRun) {
                    const statusElement = document.getElementById('status');
                    const isSuccess = lastRun.conclusion === 'success';
                    
                    statusElement.className = `status-badge ${isSuccess ? 'status-success' : 'status-pending'}`;
                    statusElement.innerHTML = `
                        <i class="fas fa-${isSuccess ? 'check-circle' : 'sync-alt'}"></i>
                        ${isSuccess ? 'Работает' : 'Ожидание'}
                    `;
                    
                    // Форматируем дату
                    const lastDate = new Date(lastRun.created_at);
                    const now = new Date();
                    const diffHours = Math.floor((now - lastDate) / (1000 * 60 * 60));
                    
                    let timeText;
                    if (diffHours < 1) {
                        timeText = 'менее часа назад';
                    } else if (diffHours < 24) {
                        timeText = `${diffHours} ${this.pluralize(diffHours, ['час', 'часа', 'часов'])} назад`;
                    } else {
                        const diffDays = Math.floor(diffHours / 24);
                        timeText = `${diffDays} ${this.pluralize(diffDays, ['день', 'дня', 'дней'])} назад`;
                    }
                    
                    document.getElementById('last-update').textContent = timeText;
                    
                    // Следующее обновление (примерно через 24 часа после последнего)
                    const nextUpdate = new Date(lastDate);
                    nextUpdate.setHours(nextUpdate.getHours() + 24);
                    document.getElementById('next-update').textContent = 
                        nextUpdate.toLocaleDateString('ru-RU');
                }
            }
        } catch (error) {
            console.error('Error loading system status:', error);
        }
    }

    async loadAvatars() {
        const gallery = document.getElementById('avatar-gallery');
        gallery.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Загрузка аватаров...</div>';
        
        try {
            const response = await fetch(
                `https://api.github.com/repos/${this.repoOwner}/${this.repoName}/contents/avatars`
            );
            
            if (response.ok) {
                const files = await response.json();
                this.avatars = files.filter(file => 
                    file.type === 'file' && 
                    /\.(png|jpg|jpeg)$/i.test(file.name)
                );
                
                this.renderGallery();
                document.getElementById('avatar-count').textContent = this.avatars.length;
                
                if (this.avatars.length === 0) {
                    gallery.innerHTML = `
                        <div class="empty-state">
                            <i class="fas fa-image"></i>
                            <p>Нет доступных аватаров</p>
                            <p style="font-size: 0.9rem; margin-top: 10px;">
                                Добавьте изображения в папку <code>avatars/</code> репозитория
                            </p>
                        </div>
                    `;
                }
            } else {
                throw new Error(`HTTP ${response.status}`);
            }
        } catch (error) {
            console.error('Error loading avatars:', error);
            gallery.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Не удалось загрузить аватары</p>
                    <p style="font-size: 0.9rem; margin-top: 10px;">
                        Ошибка: ${error.message}
                    </p>
                </div>
            `;
        }
    }

    renderGallery() {
        const gallery = document.getElementById('avatar-gallery');
        
        gallery.innerHTML = this.avatars.map(avatar => {
            const isSelected = this.selectedAvatar && this.selectedAvatar.name === avatar.name;
            return `
                <div class="avatar-item ${isSelected ? 'selected' : ''}" 
                     data-name="${avatar.name}" 
                     data-url="${avatar.download_url}">
                    <img src="${avatar.download_url}" 
                         alt="${avatar.name}"
                         loading="lazy"
                         onerror="this.src='https://via.placeholder.com/150?text=Ошибка'">
                    <div class="avatar-name">${avatar.name}</div>
                </div>
            `;
        }).join('');
        
        // Добавляем обработчики кликов
        document.querySelectorAll('.avatar-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const name = item.dataset.name;
                const url = item.dataset.url;
                this.selectAvatar(name, url);
            });
        });
    }

    selectAvatar(name, url) {
        this.selectedAvatar = { name, url };
        
        // Обновляем UI
        document.getElementById('selected-name').textContent = name;
        document.getElementById('selected-info').style.display = 'block';
        document.getElementById('btn-run-selected').disabled = false;
        
        // Обновляем галерею
        this.renderGallery();
        
        // Обновляем предпросмотр
        document.getElementById('current-avatar').src = url;
        
        this.showNotification(`Выбран аватар: ${name}`, 'success');
    }

    selectRandomAvatar() {
        if (this.avatars.length === 0) {
            this.showNotification('Нет доступных аватаров', 'error');
            return;
        }
        
        const randomIndex = Math.floor(Math.random() * this.avatars.length);
        const randomAvatar = this.avatars[randomIndex];
        this.selectAvatar(randomAvatar.name, randomAvatar.download_url);
    }

    clearSelection() {
        this.selectedAvatar = null;
        document.getElementById('selected-info').style.display = 'none';
        document.getElementById('btn-run-selected').disabled = true;
        this.renderGallery();
        this.showNotification('Выбор сброшен', 'info');
    }

    runSelectedAvatar() {
        if (!this.selectedAvatar) {
            this.showNotification('Сначала выберите аватар', 'warning');
            return;
        }
        
        this.showWorkflowInstructions(this.selectedAvatar.name);
    }

    showWorkflowInstructions(avatarName) {
        const instructions = `
            <h3>🚀 Применение аватара "${avatarName}"</h3>
            
            <p>Для применения аватара через GitHub Actions:</p>
            
            <div style="background: rgba(0,0,0,0.2); padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h4>📝 Способ 1: Через GitHub Actions (рекомендуется)</h4>
                <ol style="margin-top: 10px;">
                    <li>Перейдите по <a href="https://github.com/Gabryelf/Daily-Avatar-Rotator/actions/workflows/update-avatar.yml" target="_blank">ссылке</a></li>
                    <li>Нажмите <strong>"Run workflow"</strong> справа</li>
                    <li>В поле <code>avatar_name</code> введите: <code>${avatarName}</code></li>
                    <li>Нажмите <strong>"Run workflow"</strong></li>
                </ol>
            </div>
            
            <div style="background: rgba(0,0,0,0.2); padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h4>⚡ Способ 2: Через конфигурационный файл</h4>
                <p>Создайте файл <code>selected_avatar.json</code> в корне репозитория:</p>
                <pre style="background: rgba(0,0,0,0.3); padding: 15px; border-radius: 6px; overflow: auto; margin: 10px 0;">
{
  "selectedAvatar": "${avatarName}",
  "timestamp": "${new Date().toISOString()}"
}</pre>
                <p>Затем закоммитьте и запушьте изменения. Workflow автоматически применит аватар.</p>
            </div>
            
            <p><strong>⏱️ Аватар обновится в течение 1-2 минут после запуска workflow.</strong></p>
        `;
        
        this.showNotification(instructions, 'info', true);
    }

    showManualInstructions() {
        const instructions = `
            <h3>📖 Ручная настройка аватара</h3>
            
            <p>Если вы хотите вручную обновить аватар без интерфейса:</p>
            
            <div style="background: rgba(0,0,0,0.2); padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h4>1. Через терминал</h4>
                <pre style="background: rgba(0,0,0,0.3); padding: 15px; border-radius: 6px; overflow: auto;">
# Клонируйте репозиторий
git clone https://github.com/Gabryelf/Daily-Avatar-Rotator.git
cd Daily-Avatar-Rotator

# Добавьте аватар в папку avatars/
cp /путь/к/изображению.png avatars/

# Создайте конфигурационный файл
echo '{
  "selectedAvatar": "изображение.png",
  "timestamp": "${new Date().toISOString()}"
}' > selected_avatar.json

# Закоммитьте изменения
git add .
git commit -m "Add new avatar"
git push</pre>
            </div>
            
            <div style="background: rgba(0,0,0,0.2); padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h4>2. Через GitHub UI</h4>
                <ol>
                    <li>Перейдите в ваш репозиторий на GitHub</li>
                    <li>Добавьте файл в папку <code>avatars/</code></li>
                    <li>Создайте файл <code>selected_avatar.json</code> в корне</li>
                    <li>Дождитесь запуска workflow</li>
                </ol>
            </div>
        `;
        
        this.showNotification(instructions, 'info', true);
    }

    async loadHistory() {
        try {
            const response = await fetch(
                `https://api.github.com/repos/${this.repoOwner}/${this.repoName}/contents/avatar_history.json`
            );
            
            if (response.ok) {
                const file = await response.json();
                const content = atob(file.content);
                const history = JSON.parse(content);
                
                this.renderHistory(history);
            }
        } catch (error) {
            // Если файла нет - показываем пустую историю
            this.renderHistory([]);
        }
    }

    renderHistory(history) {
        const container = document.getElementById('history-list');
        
        if (!history || history.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-history"></i>
                    <p>История обновлений пока пуста</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = history.map(item => `
            <div class="history-item">
                <div>
                    <strong>${item.avatar}</strong>
                    <div style="font-size: 0.9rem; color: #8b949e; margin-top: 5px;">
                        ${new Date(item.timestamp || item.time).toLocaleDateString('ru-RU')}
                        • ${item.mode === 'manual_input' ? 'Ручной' : item.mode === 'config_file' ? 'Конфиг' : 'Случайный'}
                    </div>
                </div>
                <div>
                    <span style="color: ${item.status === 'success' ? '#3fb950' : '#f85149'};">
                        ${item.status === 'success' ? '✅' : '❌'}
                    </span>
                </div>
            </div>
        `).join('');
    }

    showNotification(message, type = 'info', isHtml = false) {
        const notification = document.getElementById('notification');
        const text = document.getElementById('notification-text');
        
        if (isHtml) {
            text.innerHTML = message;
        } else {
            text.textContent = message;
        }
        
        notification.className = 'notification';
        notification.style.borderLeftColor = {
            'success': '#238636',
            'error': '#f85149',
            'warning': '#d29922',
            'info': '#1f6feb'
        }[type] || '#1f6feb';
        
        // Автоматическое скрытие через 8 секунд
        setTimeout(() => {
            if (!notification.classList.contains('hidden')) {
                this.hideNotification();
            }
        }, 8000);
    }

    hideNotification() {
        document.getElementById('notification').classList.add('hidden');
    }

    pluralize(number, words) {
        const cases = [2, 0, 1, 1, 1, 2];
        return words[(number % 100 > 4 && number % 100 < 20) ? 2 : cases[Math.min(number % 10, 5)]];
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    window.avatarManager = new AvatarManager();
});
