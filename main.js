document.addEventListener('DOMContentLoaded', () => {
    // Initialize the particle system
    const particleSystem = new ParticleSystem();
    particleSystem.start();

    // Initialize audio elements
    const sounds = {
        intro: document.getElementById('logo-intro-sound'),
        open: document.getElementById('ui-open-sound'),
        exit: document.getElementById('ui-exit-sound'),
        pomoBreak: document.getElementById('pomodoro-break-sound')
    };
    
    // Set audio sources
    sounds.intro.src = 'https://github.com/ezken-dev/ezken-dev.github.io/raw/refs/heads/main/assets/logo-intro.mp3';
    sounds.open.src = 'https://github.com/ezken-dev/ezken-dev.github.io/raw/refs/heads/main/assets/ui-open.mp3';
    sounds.exit.src = 'https://github.com/ezken-dev/ezken-dev.github.io/raw/refs/heads/main/assets/ui-exit.mp3';
    sounds.pomoBreak.src = 'https://github.com/ezken-dev/ezken-dev.github.io/raw/refs/heads/main/assets/pomodoro-break.mp3';
    
    // OS Functionality
    const isMobile = () => window.matchMedia("(max-width: 768px)").matches;
    const App = {
        settings: {}, windows: {}, touchStartY: 0, isDraggingKanbanCard: false,
        init() {
            document.querySelectorAll('.window').forEach(winEl => { 
                this.windows[winEl.id] = { el: winEl, x: 0, y: 0 }; 
            });
            
            const enterOverlay = document.getElementById('click-to-enter-overlay');
            const enterButton = enterOverlay.querySelector('button');
            
            enterButton.addEventListener('click', () => { 
                enterOverlay.classList.remove('visible'); 
                this.startBootSequence(); 
            }, { once: true });
            
            enterOverlay.addEventListener('click', (e) => {
                if (e.target === enterOverlay) {
                    enterOverlay.classList.remove('visible');
                    this.startBootSequence();
                }
            }, { once: true });
        },
        startBootSequence() {
            const introScreen = document.getElementById('intro-screen');
            const introContent = introScreen.querySelector('.intro-content');
            
            // Play intro sound
            sounds.intro.play().catch(e => console.log("Audio play error:", e));
            
            introScreen.classList.add('visible');
            
            // After animations complete, fade out the intro content
            setTimeout(() => { 
                introContent.classList.add('exiting');
                
                // After fade animation, hide the overlay
                setTimeout(() => { 
                    introScreen.classList.remove('visible'); 
                    this.loadSettings(); 
                }, 800);
            }, 3000);
        },
        loadSettings() {
            const defaults = { 
                username: null, 
                pomoWork: 25, 
                pomoBreak: 5, 
                animatedBg: true,
                accentColor: '#0a84ff',
                particleDensity: 5
            };
            this.settings = JSON.parse(localStorage.getItem('ezken-os-settings')) || defaults;
            
            if (!this.settings.username || this.settings.username.trim() === '') { 
                this.promptForName(); 
            } else { 
                this.continueBoot(); 
            }
        },
        promptForName() {
            const namePrompt = document.getElementById('name-prompt-overlay');
            namePrompt.classList.add('visible');
            const input = document.getElementById('name-input');
            const saveBtn = document.getElementById('save-name-btn');
            input.focus();
            
            const saveName = () => {
                let name = input.value.trim();
                this.settings.username = (name === '') ? 'User' : name;
                this.saveSettings();
                namePrompt.classList.remove('visible');
                namePrompt.addEventListener('transitionend', () => { 
                    this.continueBoot(); 
                }, { once: true });
            };
            
            saveBtn.addEventListener('click', saveName);
            input.addEventListener('keypress', (e) => { 
                if (e.key === 'Enter') saveName(); 
            });
        },
        continueBoot() {
            document.querySelector('.desktop').style.display = 'block';
            this.applySettings(); 
            this.initInteractions(); 
            this.initClock(); 
            this.initWelcomeWidget();
            this.initApps();
            
            if (isMobile()) { 
                this.initSwipeToClose(); 
            }
        },
        saveSettings() { 
            localStorage.setItem('ezken-os-settings', JSON.stringify(this.settings)); 
        },
        applySettings() { 
            if (this.settings.animatedBg) { 
                particleSystem.start(); 
            } else { 
                particleSystem.stop(); 
            }
            
            // Apply accent color
            document.documentElement.style.setProperty('--accent-color', this.settings.accentColor);
            
            // Apply particle density
            particleSystem.setDensity(this.settings.particleDensity);
            document.getElementById('particle-density').value = this.settings.particleDensity;
            document.getElementById('density-value').textContent = this.settings.particleDensity;
        },
        initInteractions() {
            document.querySelectorAll('[data-window]').forEach(item => 
                item.addEventListener('click', (e) => {
                    // Play UI open sound
                    sounds.open.play();
                    this.openApp(e.currentTarget);
                })
            );
            
            document.getElementById('power-off-btn')?.addEventListener('click', this.shutdown);
            
            Object.values(this.windows).forEach(winData => 
                this.makeWindowDraggable(winData.el)
            );
            
            // Add click sounds to all buttons
            document.querySelectorAll('button').forEach(btn => {
                btn.addEventListener('click', () => {
                    if(btn.id !== 'power-off-btn') {
                        sounds.open.play();
                    }
                });
            });
        },
        initApps() {
            // Initialize app modules
            TaskManager.init(); 
            PomodoroTimer.init(); 
            Settings.init(); 
            Notepad.init(); 
            KanbanBoard.init();
        },
        openApp(element) {
            const windowId = element.dataset.window; 
            if (!windowId || !this.windows[windowId]) return;
            
            const winEl = this.windows[windowId].el; 
            const dockItem = document.querySelector(`.dock-item[data-window='${windowId}']`);
            
            this.setActiveWindow(winEl);
            
            if (dockItem) dockItem.classList.add('active');
            
            winEl.classList.add('visible');
            
            if (isMobile()) { 
                winEl.querySelector('.window-swipe-indicator').style.display = 'block'; 
            }
        },
        closeApp(winEl) {
            // Play UI exit sound
            sounds.exit.play();
            
            const dockItem = document.querySelector(`.dock-item[data-window='${winEl.id}']`);
            if (dockItem) dockItem.classList.remove('active');
            
            winEl.classList.remove('visible');
        },
        initClock() {
            const clockEl = document.getElementById('live-clock');
            const updateClock = () => { 
                const now = new Date(); 
                const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); 
                const date = now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }); 
                clockEl.textContent = `${date} | ${time}`; 
            };
            updateClock(); 
            setInterval(updateClock, 1000);
        },
        initWelcomeWidget() { 
            const greetingEl = document.getElementById('welcome-greeting'); 
            const hour = new Date().getHours(); 
            const username = this.settings.username || 'User'; 
            greetingEl.textContent = `Good ${hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening'}, ${username}.`; 
        },
        setActiveWindow(winEl) {
            document.querySelectorAll('.window').forEach(w => w.classList.remove('active'));
            
            if (winEl) { 
                winEl.classList.add('active'); 
                const maxZ = Array.from(document.querySelectorAll('.window')).reduce((max, w) => 
                    Math.max(max, parseInt(w.style.zIndex) || 50), 50
                ); 
                winEl.style.zIndex = maxZ + 1; 
            }
        },
        makeWindowDraggable(winEl) {
            if (isMobile()) return;
            
            const titleBar = winEl.querySelector(".title-bar"); 
            const closeButtons = winEl.querySelectorAll('.dot-red, .mobile-close-btn'); 
            const winData = this.windows[winEl.id];
            
            closeButtons.forEach(btn => btn.addEventListener('click', (e) => { 
                e.stopPropagation(); 
                this.closeApp(winEl); 
            }));
            
            titleBar.addEventListener('mousedown', dragStart); 
            winEl.addEventListener('mousedown', () => this.setActiveWindow(winEl));
            
            function dragStart(e) {
                e.preventDefault(); 
                let initialMouseX = e.clientX; 
                let initialMouseY = e.clientY;
                
                function drag(e) { 
                    let dx = e.clientX - initialMouseX; 
                    let dy = e.clientY - initialMouseY; 
                    winData.x += dx; 
                    winData.y += dy; 
                    winEl.style.transform = `translate(${winData.x}px, ${winData.y}px) scale(1)`; 
                    initialMouseX = e.clientX; 
                    initialMouseY = e.clientY; 
                }
                
                function dragEnd() { 
                    document.removeEventListener('mousemove', drag); 
                    document.removeEventListener('mouseup', dragEnd); 
                }
                
                document.addEventListener('mousemove', drag); 
                document.addEventListener('mouseup', dragEnd);
            }
        },
        initSwipeToClose() { 
            document.querySelectorAll('.window').forEach(winEl => { 
                winEl.addEventListener('touchstart', (e) => { 
                    if (App.isDraggingKanbanCard) return;
                    this.touchStartY = e.touches[0].clientY; 
                }); 
                winEl.addEventListener('touchmove', (e) => { 
                    if (App.isDraggingKanbanCard) return;
                    if (e.touches[0].clientY - this.touchStartY > 50) { 
                        this.closeApp(winEl); 
                    } 
                }); 
            }); 
        },
        shutdown() { 
            sounds.exit.play();
            document.querySelector('.desktop').style.display = 'none'; 
            document.getElementById('intro-screen').classList.add('visible'); 
            setTimeout(() => { 
                window.location.reload(); 
            }, 1000); 
        }
    };
    
    const Settings = {
        init() { 
            this.elements = { 
                animationToggle: document.getElementById('animation-toggle'), 
                pomoWork: document.getElementById('pomo-work-input'), 
                pomoBreak: document.getElementById('pomo-break-input'), 
                username: document.getElementById('username-input'), 
                resetBtn: document.getElementById('reset-settings'), 
                quoteContainer: document.getElementById('interactive-quote-container'), 
                quoteText: document.getElementById('feature-quote-text'),
                accentColorPicker: document.querySelectorAll('.color-option'),
                particleDensity: document.getElementById('particle-density'),
                densityValue: document.getElementById('density-value')
            }; 
            
            this.featureQuotes = [
                "Measuring programming progress by lines of code is like measuring aircraft building progress by weight.",
                "The best error message is the one that never appears.",
                "Code is like a joke. If you have to explain it, it’s bad.",
                "Working on a few secret upgrades...",
                "Good things come to those who wait.",
                "Stay tuned for more awesomeness!",
                "There are 10 types of people in the world: those who understand binary, and those who don't.",
                "Compiling... just kidding, it's JavaScript."
            ]; 
            
            this.updateUI(); 
            this.addListeners(); 
        },
        updateUI() { 
            this.elements.pomoWork.value = App.settings.pomoWork; 
            this.elements.pomoBreak.value = App.settings.pomoBreak; 
            this.elements.animationToggle.checked = App.settings.animatedBg; 
            this.elements.username.value = App.settings.username || ''; 
            this.elements.particleDensity.value = App.settings.particleDensity;
            this.elements.densityValue.textContent = App.settings.particleDensity;
            
            // Highlight current accent color
            document.querySelectorAll('.color-option').forEach(option => {
                if (option.dataset.color === App.settings.accentColor) {
                    option.classList.add('selected');
                } else {
                    option.classList.remove('selected');
                }
            });
        },
        addListeners() { 
            this.elements.animationToggle.addEventListener('change', () => { 
                App.settings.animatedBg = this.elements.animationToggle.checked; 
                App.applySettings(); 
                App.saveSettings(); 
            }); 
            
            this.elements.username.addEventListener('input', () => { 
                App.settings.username = this.elements.username.value.trim(); 
                App.saveSettings(); 
                App.initWelcomeWidget(); 
            }); 
            
            this.elements.pomoWork.addEventListener('input', () => { 
                App.settings.pomoWork = parseInt(this.elements.pomoWork.value) || 25; 
                PomodoroTimer.reset(); 
                App.saveSettings(); 
            }); 
            
            this.elements.pomoBreak.addEventListener('input', () => { 
                App.settings.pomoBreak = parseInt(this.elements.pomoBreak.value) || 5; 
                PomodoroTimer.reset(); 
                App.saveSettings(); 
            }); 
            
            this.elements.resetBtn.addEventListener('click', () => { 
                if (confirm("This will erase all your tasks, notes, and settings. Are you sure?")) { 
                    localStorage.clear(); 
                    window.location.reload(); 
                } 
            }); 
            
            this.elements.quoteContainer.addEventListener('click', () => { 
                this.elements.quoteText.textContent = this.featureQuotes[Math.floor(Math.random() * this.featureQuotes.length)]; 
            }); 
            
            // Accent color picker
            this.elements.accentColorPicker.forEach(option => {
                option.addEventListener('click', () => {
                    const color = option.dataset.color;
                    App.settings.accentColor = color;
                    App.applySettings();
                    App.saveSettings();
                    
                    // Update selected state
                    this.elements.accentColorPicker.forEach(opt => opt.classList.remove('selected'));
                    option.classList.add('selected');
                });
            });
            
            // Particle density slider
            this.elements.particleDensity.addEventListener('input', () => {
                App.settings.particleDensity = this.elements.particleDensity.value;
                this.elements.densityValue.textContent = this.elements.particleDensity.value;
                App.applySettings();
                App.saveSettings();
            });
        }
    };
    
    const TaskManager = {
        tasks: [],
        init() { 
            this.elements = { 
                listWrapper: document.getElementById('task-list-wrapper'), 
                list: document.getElementById('task-list'), 
                progressContainer: document.getElementById('task-progress-container'), 
                addBtn: document.getElementById('add-task-btn'), 
                textInput: document.getElementById('task-text-input'), 
                priorityInput: document.getElementById('task-priority-input'), 
                dueDateInput: document.getElementById('task-duedate-input'), 
            }; 
            
            this.loadTasks(); 
            this.render(); 
            
            this.elements.addBtn.addEventListener('click', () => this.addTask()); 
            this.elements.list.addEventListener('click', (e) => this.handleTaskClick(e)); 
        },
        loadTasks() { 
            const storedTasks = JSON.parse(localStorage.getItem('ezken-os-tasks')) || []; 
            this.tasks = storedTasks.map(task => ({ 
                id: task.id, 
                text: task.text, 
                completed: task.completed || false, 
                priority: task.priority || 'medium', 
                dueDate: task.dueDate || null, 
                subtasks: task.subtasks || [] 
            })); 
        },
        save() { 
            localStorage.setItem('ezken-os-tasks', JSON.stringify(this.tasks)); 
            this.renderProgress(); 
        },
        addTask() { 
            const text = this.elements.textInput.value.trim(); 
            if (text === '') return; 
            
            const newTask = { 
                id: Date.now(), 
                text: text, 
                completed: false, 
                priority: this.elements.priorityInput.value, 
                dueDate: this.elements.dueDateInput.value || null, 
                subtasks: [] 
            }; 
            
            this.tasks.unshift(newTask); 
            this.elements.textInput.value = ''; 
            this.elements.dueDateInput.value = ''; 
            this.save(); 
            this.render(); 
        },
        addSubtask(taskId) { 
            const task = this.tasks.find(t => t.id == taskId); 
            if (!task) return; 
            
            const subtaskText = prompt("Enter sub-task name:"); 
            if (subtaskText && subtaskText.trim() !== '') { 
                task.subtasks.push({ 
                    id: Date.now(), 
                    text: subtaskText.trim(), 
                    completed: false 
                }); 
                this.save(); 
                this.render(); 
            } 
        },
        deleteTask(taskId) { 
            this.tasks = this.tasks.filter(t => t.id != taskId); 
            this.save(); 
            this.render(); 
        },
        deleteSubtask(taskId, subtaskId) { 
            const task = this.tasks.find(t => t.id == taskId); 
            if(task) { 
                task.subtasks = task.subtasks.filter(st => st.id != subtaskId); 
                this.save(); 
                this.render(); 
            } 
        },
        toggleTask(taskId) { 
            const task = this.tasks.find(t => t.id == taskId); 
            if(task) { 
                task.completed = !task.completed; 
                this.save(); 
                this.render(); 
            } 
        },
        toggleSubtask(taskId, subtaskId) { 
            const task = this.tasks.find(t => t.id == taskId); 
            if(task) { 
                const subtask = task.subtasks.find(st => st.id == subtaskId); 
                if(subtask) subtask.completed = !subtask.completed; 
                this.save(); 
                this.render(); 
            } 
        },
        handleTaskClick(e) {
            const target = e.target; 
            const li = target.closest('li'); 
            if (!li) return; 
            
            const taskId = li.dataset.id;
            
            if (target.closest('.task-checkbox-main')) { 
                this.toggleTask(taskId); 
            }
            else if (target.closest('.task-checkbox-sub')) { 
                const subtaskId = target.closest('.subtask-item').dataset.id; 
                this.toggleSubtask(taskId, subtaskId); 
            }
            else if (target.closest('.add-subtask-btn')) { 
                this.addSubtask(taskId); 
            }
            else if (target.closest('.delete-task-btn')) { 
                this.deleteTask(taskId); 
            }
            else if(target.closest('.delete-subtask-btn')) { 
                const subtaskId = target.closest('.subtask-item').dataset.id; 
                this.deleteSubtask(taskId, subtaskId); 
            }
        },
        render() { 
            if (this.tasks.length === 0) { 
                this.elements.list.innerHTML = `<div class="empty-state"><i class="fa-solid fa-check-double"></i><p>Add a task to get started!</p></div>`; 
            } else { 
                this.elements.list.innerHTML = this.tasks.map(task => this.renderTask(task)).join(''); 
            } 
            
            this.renderProgress(); 
        },
        renderTask(task) {
            const subtasksHtml = task.subtasks.map(st => `
                <li class="subtask-item ${st.completed ? 'completed' : ''}" data-id="${st.id}">
                    <label class="task-checkbox task-checkbox-sub">
                        <input type="checkbox" ${st.completed ? 'checked' : ''}>
                        <span class="custom-checkbox"></span>
                    </label>
                    <span class="subtask-text">${st.text}</span>
                    <button class="delete-subtask-btn" style="margin-left: auto; color: var(--danger-color);">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </li>
            `).join('');
            
            return `
                <li data-id="${task.id}" class="${task.completed ? 'completed' : ''}">
                    <div class="task-main">
                        <label class="task-checkbox task-checkbox-main">
                            <input type="checkbox" ${task.completed ? 'checked' : ''}>
                            <span class="custom-checkbox"></span>
                        </label>
                        <span class="task-text">${task.text}</span>
                        <div class="task-details">
                            <span class="priority-tag priority-${task.priority}">${task.priority}</span>
                            ${task.dueDate ? `<span class="due-date"><i class="fa-solid fa-calendar-day"></i> ${task.dueDate}</span>` : ''}
                        </div>
                        <div class="task-actions">
                            <button class="add-subtask-btn" title="Add Sub-task"><i class="fa-solid fa-plus"></i></button>
                            <button class="delete-task-btn" title="Delete Task"><i class="fa-solid fa-trash"></i></button>
                        </div>
                    </div>
                    ${task.subtasks.length > 0 ? `<ul class="subtask-list">${subtasksHtml}</ul>` : ''}
                </li>
            `;
        },
        renderProgress() {
            const allTasks = []; 
            this.tasks.forEach(t => { 
                allTasks.push(t); 
                t.subtasks.forEach(st => allTasks.push(st)); 
            });
            
            const completed = allTasks.filter(t => t.completed).length; 
            const total = allTasks.length;
            const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
            
            this.elements.progressContainer.innerHTML = `
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 0.9em;">
                    <label>Overall Progress</label>
                    <span>${percent}%</span>
                </div>
                <div class="progress-bar-container">
                    <div class="progress-bar-fill" style="width: ${percent}%"></div>
                </div>
            `;
        }
    };
    
    const PomodoroTimer = {
        interval: null, 
        timeLeft: 0, 
        mode: 'work', 
        isRunning: false,
        init() { 
            this.elements = { 
                time: document.getElementById('pomodoro-time'), 
                mode: document.getElementById('pomodoro-mode'), 
                startPauseBtn: document.getElementById('pomo-start-pause'), 
                resetBtn: document.getElementById('pomo-reset'),
            }; 
            
            this.reset(); 
            
            this.elements.startPauseBtn.addEventListener('click', () => this.toggle()); 
            this.elements.resetBtn.addEventListener('click', () => this.reset()); 
        },
        updateDisplay() { 
            const minutes = Math.floor(this.timeLeft / 60).toString().padStart(2, '0'); 
            const seconds = (this.timeLeft % 60).toString().padStart(2, '0'); 
            const timeString = `${minutes}:${seconds}`; 
            document.title = `${this.mode === 'work' ? 'Focus' : 'Break'} - ${timeString}`; 
            this.elements.time.textContent = timeString; 
            this.elements.mode.textContent = this.mode === 'work' ? 'Time to Focus' : 'Take a Break'; 
            this.elements.startPauseBtn.textContent = this.isRunning ? 'Pause' : 'Start'; 
        },
        toggle() { 
            this.isRunning = !this.isRunning; 
            
            if (this.isRunning) { 
                this.interval = setInterval(() => { 
                    this.timeLeft--; 
                    
                    if (this.timeLeft < 0) { 
                        this.switchMode(); 
                    } else { 
                        this.updateDisplay(); 
                    } 
                }, 1000); 
            } else { 
                clearInterval(this.interval); 
            } 
            
            this.updateDisplay(); 
        },
        switchMode() { 
            this.mode = this.mode === 'work' ? 'break' : 'work'; 
            this.timeLeft = (this.mode === 'work' ? App.settings.pomoWork : App.settings.pomoBreak) * 60; 
            this.updateDisplay(); 
            
            if (this.mode === 'break') { 
                sounds.pomoBreak.play();
                this.showNotification("Time for a break!"); 
            }
        },
        reset() { 
            clearInterval(this.interval); 
            this.isRunning = false; 
            this.mode = 'work'; 
            this.timeLeft = App.settings.pomoWork * 60; 
            this.updateDisplay(); 
            document.title = 'EzKen OS'; 
        },
        showNotification(message) {
            const notification = document.getElementById('custom-notification-overlay');
            const messageEl = document.getElementById('custom-notification-message');
            
            messageEl.textContent = message;
            notification.classList.add('visible');
            
            setTimeout(() => {
                notification.classList.remove('visible');
            }, 3000);
        }
    };
    
    const Notepad = {
        notes: [], 
        activeNoteId: null,
        init() { 
            this.elements = { 
                list: document.getElementById('note-list'), 
                content: document.getElementById('note-content'), 
                newBtn: document.getElementById('new-note-btn') 
            }; 
            
            this.notes = JSON.parse(localStorage.getItem('ezken-os-notes')) || []; 
            this.renderList(); 
            
            this.elements.newBtn.addEventListener('click', () => this.createNote()); 
            this.elements.list.addEventListener('click', (e) => { 
                if (e.target.tagName === 'LI') this.openNote(e.target.dataset.id); 
            }); 
            
            this.elements.content.addEventListener('input', () => this.saveNote()); 
        },
        save() { 
            localStorage.setItem('ezken-os-notes', JSON.stringify(this.notes)); 
        },
        renderList() { 
            if (this.notes.length === 0) { 
                this.elements.list.innerHTML = `<div class="empty-state" style="padding:0; font-size:0.9em;"><p>No notes yet.</p></div>`; 
            } else { 
                this.elements.list.innerHTML = this.notes.map(note => 
                    `<li data-id="${note.id}" class="${note.id == this.activeNoteId ? 'active' : ''}">
                        ${note.content.split('\n')[0] || 'Untitled Note'}
                    </li>`
                ).join(''); 
            } 
        },
        createNote() { 
            const newNote = { 
                id: Date.now(), 
                content: '' 
            }; 
            
            this.notes.unshift(newNote); 
            this.activeNoteId = newNote.id; 
            this.save(); 
            this.renderList(); 
            this.openNote(newNote.id); 
            this.elements.content.focus(); 
        },
        openNote(id) { 
            this.activeNoteId = id; 
            const note = this.notes.find(n => n.id == id); 
            if (note) { 
                this.elements.content.value = note.content; 
            } 
            this.renderList(); 
        },
        saveNote() { 
            const note = this.notes.find(n => n.id == this.activeNoteId); 
            if (note) { 
                note.content = this.elements.content.value; 
                this.save(); 
                this.renderList(); 
            } 
        }
    };
    
    const KanbanBoard = {
        data: { columns: [] },
        draggedItem: { cardId: null, sourceColumnId: null },
        init() { 
            this.elements = { container: document.getElementById('kanban-container') }; 
            this.load(); 
            this.render(); 
            
            this.elements.container.addEventListener('click', e => this.handleClick(e)); 
            this.elements.container.addEventListener('dragstart', e => this.handleDragStart(e)); 
            this.elements.container.addEventListener('dragend', e => this.handleDragEnd(e)); 
            this.elements.container.addEventListener('dragover', e => this.handleDragOver(e)); 
            this.elements.container.addEventListener('dragleave', e => this.handleDragLeave(e)); 
            this.elements.container.addEventListener('drop', e => this.handleDrop(e)); 
        },
        load() {
            const savedData = JSON.parse(localStorage.getItem('ezken-os-kanban'));
            if (savedData && savedData.columns) { 
                this.data = savedData; 
            } else { 
                this.data = { 
                    columns: [ 
                        { id: 1, title: 'Backlog', cards: [] }, 
                        { id: 2, title: 'To Do', cards: [] }, 
                        { id: 3, title: 'In Progress', cards: [] }, 
                        { id: 4, title: 'Done', cards: [] } 
                    ] 
                }; 
            }
        },
        save() { 
            localStorage.setItem('ezken-os-kanban', JSON.stringify(this.data)); 
        },
        render() { 
            this.elements.container.innerHTML = ` 
                <div class="kanban-board"> 
                    ${this.data.columns.map(col => this.renderColumn(col)).join('')} 
                </div> 
            `; 
        },
        renderColumn(column) { 
            return ` 
                <div class="kanban-column" data-column-id="${column.id}"> 
                    <div class="kanban-column-header">${column.title}</div> 
                    <div class="kanban-cards"> 
                        ${column.cards.map(card => this.renderCard(card)).join('')} 
                    </div> 
                    <button class="add-card-btn primary"><i class="fa-solid fa-plus"></i> Add Card</button> 
                </div> 
            `; 
        },
        renderCard(card) { 
            return ` 
                <div class="kanban-card" draggable="true" data-card-id="${card.id}"> 
                    ${card.text} 
                    <button class="delete-card-btn"><i class="fa-solid fa-xmark"></i></button> 
                </div> 
            `; 
        },
        handleClick(e) {
            if (e.target.closest('.add-card-btn')) {
                const columnId = e.target.closest('.kanban-column').dataset.columnId; 
                const text = prompt("Enter new card text:");
                
                if (text && text.trim()) { 
                    const column = this.data.columns.find(c => c.id == columnId); 
                    column.cards.push({ 
                        id: Date.now(), 
                        text: text.trim() 
                    }); 
                    this.save(); 
                    this.render(); 
                }
            }
            
            if (e.target.closest('.delete-card-btn')) {
                const cardId = e.target.closest('.kanban-card').dataset.cardId; 
                this.data.columns.forEach(col => { 
                    col.cards = col.cards.filter(c => c.id != cardId); 
                }); 
                this.save(); 
                this.render();
            }
        },
        handleDragStart(e) {
            if (e.target.classList.contains('kanban-card')) {
                setTimeout(() => e.target.classList.add('dragging'), 0);
                this.draggedItem.cardId = e.target.dataset.cardId;
                this.draggedItem.sourceColumnId = e.target.closest('.kanban-column').dataset.columnId;
                App.isDraggingKanbanCard = true; // Set flag for mobile
            }
        },
        handleDragEnd(e) { 
            e.target.classList.remove('dragging'); 
            App.isDraggingKanbanCard = false; // Clear flag
        },
        handleDragOver(e) { 
            const column = e.target.closest('.kanban-column'); 
            if (column) { 
                e.preventDefault(); 
                column.classList.add('drag-over'); 
            } 
        },
        handleDragLeave(e) { 
            const column = e.target.closest('.kanban-column'); 
            if (column) { 
                column.classList.remove('drag-over'); 
            } 
        },
        handleDrop(e) {
            const columnEl = e.target.closest('.kanban-column'); 
            if (!columnEl) return;
            
            e.preventDefault(); 
            columnEl.classList.remove('drag-over');
            
            const targetColumnId = columnEl.dataset.columnId;
            if (this.draggedItem.sourceColumnId === targetColumnId) return;
            
            const sourceCol = this.data.columns.find(c => c.id == this.draggedItem.sourceColumnId);
            const targetCol = this.data.columns.find(c => c.id == targetColumnId);
            const draggedCard = sourceCol.cards.find(c => c.id == this.draggedItem.cardId);
            
            sourceCol.cards = sourceCol.cards.filter(c => c.id != this.draggedItem.cardId);
            targetCol.cards.push(draggedCard);
            
            this.save(); 
            this.render();
        }
    };

    // Initialize the OS
    App.init();
});