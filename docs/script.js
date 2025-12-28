// docs/script.js
class AvatarTester {
    constructor() {
        this.repoOwner = 'Gabryelf';
        this.repoName = 'Daily-Avatar-Rotator';
        this.selectedAvatar = null;
        this.avatars = [];
        
        this.init();
    }

    async init() {
        await this.loadAvatars();
        this.bindEvents();
    }

    bindEvents() {
        // Кнопка тестирования
        document.getElementById('test-btn').addEventListener('click', () => this.testSelectedAvatar());
    }

    async loadAvatars() {
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
                
                // Автоматически выбираем первый аватар
                if (this.avatars.length > 0) {
                    this.selectAvatar(this.avatars[0].name, this.avatars[0].download_url);
                }
            }
        } catch (error) {
            this.showError('Не удалось загрузить аватары');
        }
    }

    renderGallery() {
        const grid = document.getElementById('avatar-grid');
        
        grid.innerHTML = this.avatars.map(avatar => {
            const isSelected = this.selectedAvatar && this.selectedAvatar.name === avatar.name;
            return `
                <div class="avatar-item ${isSelected ? 'selected' : ''}" 
                     data-name="${avatar.name}" 
                     data-url="${avatar.download_url}">
                    <img src="${avatar.download_url}" 
                         alt="${avatar.name}"
                         loading="lazy"
                         onerror="this.src='https://via.placeholder.com/120?text=Ошибка'">
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
        document.getElementById('selected-avatar-img').src = url;
        document.getElementById('test-btn').disabled = false;
        
        // Обновляем галерею
        this.renderGallery();
    }

    async testSelectedAvatar() {
        if (!this.selectedAvatar) return;
        
        const avatarName = this.selectedAvatar.name;
        
        // Показываем уведомление о начале тестирования
        this.showNotification(`
            <h3>🧪 Тестирование аватара</h3>
            <p>Аватар: <strong>${avatarName}</strong></p>
            <p><i class="fas fa-spinner fa-spin"></i> Подготавливаю тестовый файл...</p>
        `, false);
        
        try {
            // Создаем тестовый файл через GitHub API
            await this.createTestFile(avatarName);
            
            // Показываем успешное сообщение
            this.showNotification(`
                <h3>✅ Аватар протестирован!</h3>
                <p>Аватар <strong>${avatarName}</strong> готов к использованию.</p>
                <p>Он будет применен автоматически в 00:00 UTC.</p>
                <p><em>Тестовый файл будет автоматически удален.</em></p>
            `, true);
            
        } catch (error) {
            this.showNotification(`
                <h3>❌ Ошибка тестирования</h3>
                <p>Не удалось протестировать аватар.</p>
                <p>Ошибка: ${error.message}</p>
            `, true);
        }
    }

    async createTestFile(avatarName) {
        // Создаем файл конфигурации для тестирования
        const config = {
            avatar: avatarName,
            timestamp: new Date().toISOString(),
            test: true
        };
        
        // Показываем пользователю инструкции для ручного создания файла
        const instructions = `
            <h3>📝 Инструкция для тестирования</h3>
            <p>Чтобы протестировать аватар <strong>${avatarName}</strong>:</p>
            
            <div style="background: rgba(0,0,0,0.2); padding: 15px; border-radius: 8px; margin: 15px 0;">
                <h4>Способ 1: Через GitHub UI (проще)</h4>
                <ol style="margin-left: 20px; margin-top: 10px;">
                    <li>Откройте ваш репозиторий на GitHub</li>
                    <li>Нажмите "Add file" → "Create new file"</li>
                    <li>Введите имя файла: <code>selected_avatar.json</code></li>
                    <li>Вставьте этот код:
                        <pre style="background: rgba(0,0,0,0.3); padding: 10px; border-radius: 5px; overflow: auto; margin: 10px 0;">
{
  "avatar": "${avatarName}",
  "test": true
}</pre>
                    </li>
                    <li>Нажмите "Commit changes"</li>
                </ol>
            </div>
            
            <div style="background: rgba(0,0,0,0.2); padding: 15px; border-radius: 8px; margin: 15px 0;">
                <h4>Способ 2: Через терминал</h4>
                <pre style="background: rgba(0,0,0,0.3); padding: 10px; border-radius: 5px; overflow: auto;">
echo '{
  "avatar": "${avatarName}",
  "test": true
}' > selected_avatar.json

git add selected_avatar.json
git commit -m "test avatar: ${avatarName}"
git push</pre>
            </div>
            
            <p><strong>После создания файла:</strong></p>
            <ul style="margin-left: 20px; margin-top: 10px;">
                <li>GitHub Actions автоматически протестирует аватар</li>
                <li>Тестовый файл будет автоматически удален</li>
                <li>Аватар будет готов к автоматическому применению</li>
            </ul>
        `;
        
        this.showNotification(instructions, false);
        
        // Создаем ссылку для быстрого создания файла
        const fileContent = encodeURIComponent(JSON.stringify(config, null, 2));
        const repoUrl = `https://github.com/${this.repoOwner}/${this.repoName}`;
        const createFileUrl = `${repoUrl}/new/main?filename=selected_avatar.json&value=${fileContent}`;
        
        // Добавляем кнопку для быстрого создания
        setTimeout(() => {
            const notification = document.getElementById('notification');
            const button = document.createElement('a');
            button.href = createFileUrl;
            button.target = '_blank';
            button.className = 'test-btn';
            button.style.marginTop = '15px';
            button.innerHTML = '<i class="fas fa-external-link-alt"></i> Быстро создать тестовый файл';
            notification.querySelector('#notification-content').appendChild(button);
        }, 100);
    }

    showNotification(content, autoClose = true) {
        const notification = document.getElementById('notification');
        const contentDiv = document.getElementById('notification-content');
        
        contentDiv.innerHTML = content;
        notification.classList.remove('hidden');
        
        if (autoClose) {
            setTimeout(() => {
                notification.classList.add('hidden');
            }, 8000);
        }
    }

    showError(message) {
        this.showNotification(`
            <h3><i class="fas fa-exclamation-triangle"></i> Ошибка</h3>
            <p>${message}</p>
        `, true);
    }
}

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
    window.avatarTester = new AvatarTester();
    
    // Автоматическое закрытие уведомлений при клике вне их
    document.addEventListener('click', (e) => {
        const notification = document.getElementById('notification');
        if (!notification.contains(e.target) && !notification.classList.contains('hidden')) {
            notification.classList.add('hidden');
        }
    });
});
