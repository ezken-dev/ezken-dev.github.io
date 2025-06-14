document.addEventListener('DOMContentLoaded', () => {
    // Service Worker Registration
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/service-worker.js')
                .then((registration) => {
                    console.log('ServiceWorker registration successful with scope: ', registration.scope);
                })
                .catch((err) => {
                    console.log('ServiceWorker registration failed: ', err);
                });
        });
    }

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

    // OS Detection
    const detectOS = () => {
        const userAgent = navigator.userAgent || navigator.vendor || window.opera;
        if (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream) {
            return 'iOS';
        }
        if (/android/i.test(userAgent)) {
            return 'Android';
        }
        return 'Desktop';
    };

    const currentOS = detectOS();
    if (currentOS === 'iOS') {
        document.body.classList.add('is-ios');
    } else if (currentOS === 'Android') {
        document.body.classList.add('is-android');
    }
    // End OS Detection

    const App = {
        settings: {}, windows: {}, touchStartY: 0, isDraggingKanbanCard: false,
        init() {
            document.querySelectorAll('.window').forEach(winEl => { 
                this.windows[winEl.id] = { el: winEl, x: 0, y: 0 }; 
            });
            
            const enterOverlay = document.getElementById('click-to-enter-overlay');
            const enterButton = enterOverlay.querySelector('button');
            
            const startApp = () => { 
                enterOverlay.classList.remove('visible'); 
                this.startBootSequence(); 
            };
            
            enterButton.addEventListener('click', startApp, { once: true });
            
            enterOverlay.addEventListener('click', (e) => {
                if (e.target === enterOverlay) {
                    startApp();
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
                spaceTheme: false, 
                accentColor: '#0a84ff',
                particleDensity: 5,
                focusPetTutorialShown: false
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
            this.initApps();
            this.applySettings();
            this.initInteractions();
            this.initClock();
            this.initWelcomeWidget();
            if (isMobile()) {
                this.initSwipeToClose();
            }
        },
        saveSettings() { 
            localStorage.setItem('ezken-os-settings', JSON.stringify(this.settings)); 
        },
        applySettings() {
            document.documentElement.style.setProperty('--accent-color', this.settings.accentColor);
            
            particleSystem.setDensity(this.settings.particleDensity);
            if(document.getElementById('particle-density')) {
                document.getElementById('particle-density').value = this.settings.particleDensity;
                document.getElementById('density-value').textContent = this.settings.particleDensity;
            }
            
            if (this.settings.spaceTheme) {
                document.body.classList.add('space-theme');
                Comet.start();
                particleSystem.stop();
                if(Settings.elements.animationToggle) Settings.elements.animationToggle.disabled = true;
            } else {
                document.body.classList.remove('space-theme');
                Comet.stop();
                if(Settings.elements.animationToggle) Settings.elements.animationToggle.disabled = false;

                if (this.settings.animatedBg) {
                    particleSystem.start();
                } else {
                    particleSystem.stop();
                }
            }
        },
        initInteractions() {
            document.querySelectorAll('[data-window], [data-link]').forEach(item => 
                item.addEventListener('click', (e) => {
                    const targetElement = e.currentTarget;

                    if (targetElement.dataset.window) {
                        sounds.open.play().catch(err => console.error(err));
                        this.openApp(targetElement);
                    } else if (targetElement.dataset.link) {
                        sounds.open.play().catch(err => console.error(err));
                        window.open(targetElement.dataset.link, '_blank');
                    }
                })
            );
            
            const powerOffBtn = document.getElementById('power-off-btn');
            if (powerOffBtn) {
                powerOffBtn.addEventListener('click', this.shutdown); 
            }
            
            Object.values(this.windows).forEach(winData => 
                this.makeWindowDraggable(winData.el)
            );
            
            document.querySelectorAll('button:not([data-window]):not([data-link])').forEach(btn => {
                btn.addEventListener('click', () => {
                    if(btn.id !== 'power-off-btn') {
                        sounds.open.play().catch(err => console.error(err));
                    }
                });
            });
        },
        initApps() {
            FocusPet.init();
            Comet.init(); 
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
            
            this.setActiveWindow(winEl);
            
            winEl.classList.add('visible');
            
            if (windowId === 'focus-pet-window' && !this.settings.focusPetTutorialShown) {
                FocusPet.tutorial.start();
                this.settings.focusPetTutorialShown = true;
                this.saveSettings();
            }
        },
        closeApp(winEl) {
            sounds.exit.play().catch(err => console.error(err));
            
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
                if(clockEl) clockEl.textContent = `${date} | ${time}`; 
            };
            updateClock(); 
            setInterval(updateClock, 1000);
        },
        initWelcomeWidget() { 
            const greetingEl = document.getElementById('welcome-greeting'); 
            const hour = new Date().getHours(); 
            const username = this.settings.username || 'User'; 
            if(greetingEl) greetingEl.textContent = `Good ${hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening'}, ${username}.`; 
        },
        setActiveWindow(winEl) {
            document.querySelectorAll('.window').forEach(w => w.classList.remove('active'));
            document.querySelectorAll('.dock-item').forEach(d => d.classList.remove('active'));
    
            if (winEl) { 
                winEl.classList.add('active'); 
                
                const dockItem = document.querySelector(`.dock-item[data-window='${winEl.id}']`);
                if (dockItem) {
                    dockItem.classList.add('active');
                }
    
                const maxZ = Array.from(document.querySelectorAll('.window.visible')).reduce((max, w) => 
                    Math.max(max, parseInt(w.style.zIndex) || 50), 50
                ); 
                winEl.style.zIndex = maxZ + 1; 
            }
        },
        makeWindowDraggable(winEl) {
            if (isMobile()) return;

            const titleBar = winEl.querySelector(".title-bar"); 
            if (!titleBar) return;

            // MODIFIED: Only target the red dot for closing on desktop.
            const closeButton = winEl.querySelector('.dot-red');
            if (closeButton) {
                closeButton.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.closeApp(winEl);
                });
            }
            
            const winData = this.windows[winEl.id];
            
            const dragStart = (e) => {
                e.preventDefault(); 
                let initialMouseX = e.clientX; 
                let initialMouseY = e.clientY;
                
                const drag = (e) => { 
                    let dx = e.clientX - initialMouseX; 
                    let dy = e.clientY - initialMouseY; 
                    winData.x += dx; 
                    winData.y += dy; 
                    winEl.style.transform = `translate(${winData.x}px, ${winData.y}px) scale(1)`; 
                    initialMouseX = e.clientX; 
                    initialMouseY = e.clientY; 
                }
                
                const dragEnd = () => { 
                    document.removeEventListener('mousemove', drag); 
                    document.removeEventListener('mouseup', dragEnd); 
                }
                
                document.addEventListener('mousemove', drag); 
                document.addEventListener('mouseup', dragEnd);
            }

            titleBar.addEventListener('mousedown', dragStart); 
            winEl.addEventListener('mousedown', () => this.setActiveWindow(winEl));
        },
        initSwipeToClose() { 
            document.querySelectorAll('.window').forEach(winEl => { 
                winEl.addEventListener('touchstart', (e) => { 
                    if (App.isDraggingKanbanCard) return;
                    // Only initiate swipe if touch starts near the top of the window
                    if (e.touches[0].clientY < winEl.offsetTop + 50) {
                        this.touchStartY = e.touches[0].clientY; 
                    } else {
                        this.touchStartY = null;
                    }
                }, { passive: false }); 

                winEl.addEventListener('touchmove', (e) => { 
                    if (App.isDraggingKanbanCard || this.touchStartY === null) return;
                    
                    const swipeDistance = e.touches[0].clientY - this.touchStartY;
                    if (swipeDistance > 50) { // Swipe down threshold
                        const target = e.target;
                        const isScrollable = target.scrollHeight > target.clientHeight;
                        const isAtTop = target.scrollTop === 0;

                        if (isScrollable && !isAtTop) {
                            // Let the browser handle scrolling within the window content
                        } else {
                            // If not scrollable, or at the top of a scrollable area, close the window
                            e.preventDefault();
                            this.closeApp(winEl); 
                            this.touchStartY = null; // Reset for next interaction
                        }
                    } 
                }, { passive: false }); 

                winEl.addEventListener('touchend', () => {
                    this.touchStartY = null;
                });
            }); 
        },
        shutdown() { 
            sounds.exit.play().catch(err => console.error(err));
            document.querySelector('.desktop').style.display = 'none'; 
            document.getElementById('intro-screen').classList.add('visible'); 
            setTimeout(() => { 
                window.location.reload(); 
            }, 1000); 
        },
        showNotification(message) {
            const notification = document.getElementById('custom-notification-overlay');
            const messageEl = document.getElementById('custom-notification-message');
            const okBtn = document.getElementById('custom-notification-ok');
            if(!notification || !messageEl || !okBtn) return;
            
            messageEl.textContent = message;
            notification.classList.add('visible');

            const closeNotif = () => {
                notification.classList.remove('visible');
                okBtn.removeEventListener('click', closeNotif);
            }
            
            okBtn.addEventListener('click', closeNotif);

            setTimeout(closeNotif, 5000);
        }
    };
    
    // Interactive Comet for the Space Theme
    const Comet = {
        canvas: null, ctx: null, animationId: null,
        mouse: { x: null, y: null }, comet: null,
        init() {
            this.canvas = document.getElementById('comet-canvas');
            if (!this.canvas) return;
            this.ctx = this.canvas.getContext('2d');
            this.resizeCanvas();
            this.comet = { x: window.innerWidth / 2, y: window.innerHeight / 2, trail: [], maxTrail: 40 };
            window.addEventListener('resize', () => this.resizeCanvas());
            document.body.addEventListener('mousemove', (e) => { this.mouse.x = e.clientX; this.mouse.y = e.clientY; });
            document.body.addEventListener('mouseleave', () => { this.mouse.x = null; this.mouse.y = null; });
        },
        resizeCanvas() { if(this.canvas) { this.canvas.width = window.innerWidth; this.canvas.height = window.innerHeight; } },
        draw() {
            if (!this.ctx || !this.canvas) return;
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            for (let i = 0; i < this.comet.trail.length; i++) {
                const pos = this.comet.trail[i]; const opacity = i / this.comet.maxTrail;
                this.ctx.fillStyle = `rgba(255, 255, 255, ${opacity * 0.4})`;
                this.ctx.beginPath(); this.ctx.arc(pos.x, pos.y, i / 15, 0, Math.PI * 2); this.ctx.fill();
            }
            this.ctx.fillStyle = '#ffffff'; this.ctx.shadowColor = '#ffffff'; this.ctx.shadowBlur = 20;
            this.ctx.beginPath(); this.ctx.arc(this.comet.x, this.comet.y, 2, 0, Math.PI * 2); this.ctx.fill();
            this.ctx.shadowBlur = 0;
        },
        update() {
            if (this.mouse.x !== null) {
                const dx = this.mouse.x - this.comet.x; const dy = this.mouse.y - this.comet.y;
                this.comet.x += dx * 0.07; this.comet.y += dy * 0.07;
            }
            this.comet.trail.push({ x: this.comet.x, y: this.comet.y });
            if (this.comet.trail.length > this.comet.maxTrail) { this.comet.trail.shift(); }
        },
        animate() { this.update(); this.draw(); this.animationId = requestAnimationFrame(() => this.animate()); },
        start() { if (!this.canvas) this.init(); if (this.animationId) return; this.resizeCanvas(); this.animate(); },
        stop() {
            if (this.animationId) {
                cancelAnimationFrame(this.animationId); this.animationId = null;
                if (this.ctx && this.canvas) { this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height); }
            }
        }
    };

    const Settings = {
        elements: {},
        init() { 
            this.elements = { 
                animationToggle: document.getElementById('animation-toggle'),
                spaceThemeToggle: document.getElementById('space-theme-toggle'), 
                pomoWork: document.getElementById('pomo-work-input'), 
                pomoBreak: document.getElementById('pomo-break-input'), 
                username: document.getElementById('username-input'), 
                resetBtn: document.getElementById('reset-settings'), 
                quoteContainer: document.getElementById('interactive-quote-container'), 
                quoteText: document.getElementById('feature-quote-text'),
                accentColorPicker: document.querySelectorAll('.color-option'),
                particleDensity: document.getElementById('particle-density'),
                densityValue: document.getElementById('density-value'),
                devInfoButton: document.getElementById('dev-info-button')
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
            if(!this.elements.pomoWork) return;
            this.elements.pomoWork.value = App.settings.pomoWork; 
            this.elements.pomoBreak.value = App.settings.pomoBreak; 
            this.elements.animationToggle.checked = App.settings.animatedBg; 
            this.elements.spaceThemeToggle.checked = App.settings.spaceTheme; 
            this.elements.username.value = App.settings.username || ''; 
            this.elements.particleDensity.value = App.settings.particleDensity;
            this.elements.densityValue.textContent = this.elements.particleDensity.value;
            
            document.querySelectorAll('.color-option').forEach(option => {
                option.classList.toggle('selected', option.dataset.color === App.settings.accentColor);
            });
        },
        addListeners() { 
            if(!this.elements.animationToggle) return;

            this.elements.animationToggle.addEventListener('change', () => {
                App.settings.animatedBg = this.elements.animationToggle.checked;
                if (App.settings.animatedBg) App.settings.spaceTheme = false;
                this.updateUI(); App.applySettings(); App.saveSettings();
            });

            this.elements.spaceThemeToggle.addEventListener('change', () => {
                App.settings.spaceTheme = this.elements.spaceThemeToggle.checked;
                if (App.settings.spaceTheme) App.settings.animatedBg = false;
                this.updateUI(); App.applySettings(); App.saveSettings();
            });
            
            this.elements.username.addEventListener('input', () => { 
                App.settings.username = this.elements.username.value.trim(); 
                App.saveSettings(); App.initWelcomeWidget(); 
            }); 
            
            this.elements.pomoWork.addEventListener('input', () => { 
                App.settings.pomoWork = parseInt(this.elements.pomoWork.value) || 25; 
                PomodoroTimer.reset(); App.saveSettings(); 
            }); 
            
            this.elements.pomoBreak.addEventListener('input', () => { 
                App.settings.pomoBreak = parseInt(this.elements.pomoBreak.value) || 5; 
                PomodoroTimer.reset(); App.saveSettings(); 
            }); 
            
            this.elements.resetBtn.addEventListener('click', () => { 
                if (confirm("This will erase all your tasks, notes, and settings. Are you sure?")) { 
                    localStorage.clear(); window.location.reload(); 
                } 
            }); 
            
            this.elements.quoteContainer.addEventListener('click', () => { 
                this.elements.quoteText.textContent = this.featureQuotes[Math.floor(Math.random() * this.featureQuotes.length)]; 
            }); 
            
            this.elements.accentColorPicker.forEach(option => {
                option.addEventListener('click', () => {
                    App.settings.accentColor = option.dataset.color;
                    App.applySettings(); App.saveSettings();
                    this.elements.accentColorPicker.forEach(opt => opt.classList.remove('selected'));
                    option.classList.add('selected');
                });
            });
            
            this.elements.particleDensity.addEventListener('input', () => {
                App.settings.particleDensity = this.elements.particleDensity.value;
                this.elements.densityValue.textContent = this.elements.particleDensity.value;
                App.applySettings(); App.saveSettings();
            });
        }
    };
    
    const TaskManager = {
        tasks: [],
        init() { 
            this.elements = { 
                listWrapper: document.getElementById('task-list-wrapper'), list: document.getElementById('task-list'), 
                progressContainer: document.getElementById('task-progress-container'), addBtn: document.getElementById('add-task-btn'), 
                textInput: document.getElementById('task-text-input'), priorityInput: document.getElementById('task-priority-input'), 
                dueDateInput: document.getElementById('task-duedate-input'), 
            }; 
            if(!this.elements.list) return;
            
            this.loadTasks(); this.render(); 
            
            this.elements.addBtn.addEventListener('click', () => this.addTask()); 
            this.elements.list.addEventListener('click', (e) => this.handleTaskClick(e)); 
        },
        loadTasks() { 
            const storedTasks = JSON.parse(localStorage.getItem('ezken-os-tasks')) || []; 
            this.tasks = storedTasks.map(task => ({ ...task })); 
        },
        save() { localStorage.setItem('ezken-os-tasks', JSON.stringify(this.tasks)); this.renderProgress(); },
        addTask() { 
            const text = this.elements.textInput.value.trim(); if (text === '') return; 
            this.tasks.unshift({ id: Date.now(), text, completed: false, priority: this.elements.priorityInput.value, dueDate: this.elements.dueDateInput.value || null, subtasks: [] }); 
            this.elements.textInput.value = ''; this.elements.dueDateInput.value = ''; 
            this.save(); this.render(); 
        },
        addSubtask(taskId) { 
            const task = this.tasks.find(t => t.id == taskId); if (!task) return; 
            const subtaskText = prompt("Enter sub-task name:"); 
            if (subtaskText && subtaskText.trim() !== '') { 
                task.subtasks.push({ id: Date.now(), text: subtaskText.trim(), completed: false }); 
                this.save(); this.render(); 
            } 
        },
        deleteTask(taskId) { this.tasks = this.tasks.filter(t => t.id != taskId); this.save(); this.render(); },
        deleteSubtask(taskId, subtaskId) { 
            const task = this.tasks.find(t => t.id == taskId); 
            if(task) { task.subtasks = task.subtasks.filter(st => st.id != subtaskId); this.save(); this.render(); } 
        },
        toggleTask(taskId) { 
            const task = this.tasks.find(t => t.id == taskId); 
            if(task) { task.completed = !task.completed; if (task.completed) FocusPet.addXP(10); this.save(); this.render(); } 
        },
        toggleSubtask(taskId, subtaskId) { 
            const task = this.tasks.find(t => t.id == taskId); 
            if(task) { 
                const subtask = task.subtasks.find(st => st.id == subtaskId); 
                if(subtask) { subtask.completed = !subtask.completed; if (subtask.completed) FocusPet.addXP(5); }
                this.save(); this.render(); 
            } 
        },
        handleTaskClick(e) {
            const li = e.target.closest('li[data-id]'); if (!li) return; 
            const taskId = li.dataset.id;
            if (e.target.closest('.task-checkbox-main')) { this.toggleTask(taskId); }
            else if (e.target.closest('.task-checkbox-sub')) { this.toggleSubtask(taskId, e.target.closest('.subtask-item').dataset.id); }
            else if (e.target.closest('.add-subtask-btn')) { this.addSubtask(taskId); }
            else if (e.target.closest('.delete-task-btn')) { this.deleteTask(taskId); }
            else if(e.target.closest('.delete-subtask-btn')) { this.deleteSubtask(taskId, e.target.closest('.subtask-item').dataset.id); }
        },
        render() { 
            this.elements.list.innerHTML = this.tasks.length === 0 ? `<div class="empty-state"><i class="fa-solid fa-check-double"></i><p>Add a task to get started!</p></div>` : this.tasks.map(task => this.renderTask(task)).join(''); 
            this.renderProgress(); 
        },
        renderTask(task) {
            const subtasksHtml = task.subtasks.map(st => `
                <li class="subtask-item ${st.completed ? 'completed' : ''}" data-id="${st.id}">
                    <label class="task-checkbox task-checkbox-sub"><input type="checkbox" ${st.completed ? 'checked' : ''}><span class="custom-checkbox"></span></label>
                    <span class="subtask-text">${st.text}</span>
                    <button class="delete-subtask-btn" style="margin-left: auto; color: var(--danger-color);"><i class="fa-solid fa-xmark"></i></button>
                </li>`).join('');
            return `
                <li data-id="${task.id}" class="${task.completed ? 'completed' : ''}">
                    <div class="task-main">
                        <label class="task-checkbox task-checkbox-main"><input type="checkbox" ${task.completed ? 'checked' : ''}><span class="custom-checkbox"></span></label>
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
                </li>`;
        },
        renderProgress() {
            const allTasks = this.tasks.reduce((acc, t) => [...acc, t, ...t.subtasks], []);
            const completed = allTasks.filter(t => t.completed).length; 
            const percent = allTasks.length === 0 ? 0 : Math.round((completed / allTasks.length) * 100);
            this.elements.progressContainer.innerHTML = `
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 0.9em;"><label>Overall Progress</label><span>${percent}%</span></div>
                <div class="progress-bar-container"><div class="progress-bar-fill" style="width: ${percent}%"></div></div>`;
        }
    };
    
    const PomodoroTimer = {
        interval: null, timeLeft: 0, mode: 'work', isRunning: false, streak: 0,
        init() { 
            this.elements = { 
                time: document.getElementById('pomodoro-time'), mode: document.getElementById('pomodoro-mode'), 
                streak: document.getElementById('pomodoro-streak'), startPauseBtn: document.getElementById('pomo-start-pause'), 
                resetBtn: document.getElementById('pomo-reset'),
            }; 
            if(!this.elements.time) return;
            this.loadStreak(); this.reset(); 
            this.elements.startPauseBtn.addEventListener('click', () => this.toggle()); 
            this.elements.resetBtn.addEventListener('click', () => this.reset(true)); 
        },
        loadStreak() { this.streak = parseInt(localStorage.getItem('ezken-os-pomo-streak')) || 0; },
        saveStreak() { localStorage.setItem('ezken-os-pomo-streak', this.streak); },
        updateDisplay() { 
            const minutes = Math.floor(this.timeLeft / 60).toString().padStart(2, '0'); 
            const seconds = (this.timeLeft % 60).toString().padStart(2, '0'); 
            const timeString = `${minutes}:${seconds}`; 
            document.title = `${this.mode === 'work' ? 'Focus' : 'Break'} - ${timeString}`; 
            this.elements.time.textContent = timeString; 
            this.elements.mode.textContent = this.mode === 'work' ? 'Time to Focus' : 'Take a Break'; 
            this.elements.startPauseBtn.textContent = this.isRunning ? 'Pause' : 'Start';
            this.elements.streak.textContent = `Streak: ${this.streak} 🔥`;
            if (this.isRunning && this.mode === 'work') { FocusPet.setAnimation('working'); } else { FocusPet.setAnimation('idle'); }
        },
        toggle() { 
            this.isRunning = !this.isRunning; 
            if (this.isRunning) { this.interval = setInterval(() => { this.timeLeft--; if (this.timeLeft < 0) this.switchMode(); else this.updateDisplay(); }, 1000); } 
            else { clearInterval(this.interval); } 
            this.updateDisplay(); 
        },
        switchMode() { 
            if (this.mode === 'work') { this.streak++; FocusPet.addXP(25); }
            this.saveStreak();
            this.mode = this.mode === 'work' ? 'break' : 'work'; 
            this.timeLeft = (this.mode === 'work' ? App.settings.pomoWork : App.settings.pomoBreak) * 60; 
            this.updateDisplay(); 
            if (this.mode === 'break') { sounds.pomoBreak.play(); App.showNotification("Time for a break!"); }
        },
        reset(isManualReset = false) { 
            clearInterval(this.interval); this.isRunning = false; this.mode = 'work'; 
            this.timeLeft = App.settings.pomoWork * 60; 
            if (isManualReset) { this.streak = 0; this.saveStreak(); }
            this.updateDisplay(); document.title = 'EzKen OS'; 
        }
    };
    
    const Notepad = {
        notes: [], activeNoteId: null,
        init() { 
            this.elements = { 
                list: document.getElementById('note-list'), newBtn: document.getElementById('new-note-btn'),
                titleInput: document.getElementById('note-title-input'), contentEditor: document.getElementById('note-content-editor'),
                contentPreview: document.getElementById('note-content-preview'), statusBar: document.querySelector('.note-status-bar'),
                creationDate: document.getElementById('note-creation-date'), editorMain: document.getElementById('note-editor-main'),
                editorEmpty: document.getElementById('note-editor-empty'), viewEditBtn: document.getElementById('note-view-edit'),
                viewSplitBtn: document.getElementById('note-view-split'), viewPreviewBtn: document.getElementById('note-view-preview'),
                notepadWindow: document.getElementById('notepad-window')
            }; 
            if(!this.elements.list) return;
            this.load(); this.renderList(); this.addListeners(); this.resetEditor();
        },
        addListeners() {
            this.elements.newBtn.addEventListener('click', () => this.createNote());
            this.elements.list.addEventListener('click', (e) => this.handleListClick(e));
            this.elements.titleInput.addEventListener('input', () => this.saveNote());
            this.elements.contentEditor.addEventListener('input', () => { this.saveNote(); this.renderMarkdown(); this.updateStatusBar(); });
            this.elements.viewEditBtn.addEventListener('click', () => this.setViewMode('edit'));
            this.elements.viewSplitBtn.addEventListener('click', () => this.setViewMode('split'));
            this.elements.viewPreviewBtn.addEventListener('click', () => this.setViewMode('preview'));
        },
        setViewMode(mode) {
            this.elements.notepadWindow.dataset.viewMode = mode;
            [this.elements.viewEditBtn, this.elements.viewSplitBtn, this.elements.viewPreviewBtn].forEach(btn => btn.classList.remove('active'));
            this.elements[`view${mode.charAt(0).toUpperCase() + mode.slice(1)}Btn`].classList.add('active');
        },
        load() { this.notes = JSON.parse(localStorage.getItem('ezken-os-notes')) || []; },
        save() { localStorage.setItem('ezken-os-notes', JSON.stringify(this.notes)); },
        handleListClick(e) {
            const listItem = e.target.closest('li'); if (!listItem) return;
            const noteId = listItem.dataset.id;
            if (e.target.closest('.delete-note-btn')) { this.deleteNote(noteId); } else { this.openNote(noteId); }
        },
        createNote() { 
            const newNote = { id: Date.now(), title: "Untitled Note", content: '# Untitled Note\n\n', createdAt: new Date().toISOString() }; 
            this.notes.unshift(newNote); this.save(); this.renderList(); this.openNote(newNote.id); 
        },
        deleteNote(noteId) {
            if (!confirm("Are you sure you want to delete this note permanently?")) return;
            this.notes = this.notes.filter(note => note.id != noteId); this.save();
            if (this.activeNoteId == noteId) this.resetEditor();
            this.renderList();
        },
        openNote(id) { 
            const note = this.notes.find(n => n.id == id); if (!note) return;
            this.activeNoteId = id; this.elements.editorEmpty.style.display = 'none'; this.elements.editorMain.style.display = 'flex';
            this.elements.titleInput.value = note.title; this.elements.contentEditor.value = note.content;
            this.renderMarkdown(); this.updateStatusBar(); this.renderList(); this.elements.contentEditor.focus();
        },
        saveNote() { 
            if (!this.activeNoteId) return;
            const note = this.notes.find(n => n.id == this.activeNoteId); 
            if (note) { 
                note.title = this.elements.titleInput.value; note.content = this.elements.contentEditor.value; 
                this.save(); this.renderList(); 
            } 
        },
        resetEditor() {
            this.activeNoteId = null; this.elements.editorEmpty.style.display = 'flex'; this.elements.editorMain.style.display = 'none';
            this.elements.titleInput.value = ''; this.elements.contentEditor.value = '';
            this.renderMarkdown(); this.updateStatusBar();
        },
        renderList() { 
            this.notes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            this.elements.list.innerHTML = this.notes.length === 0 ? `<div class="empty-state" style="padding:10px; font-size:0.9em;"><p>No notes yet.</p></div>` : 
            this.notes.map(note => `<li data-id="${note.id}" class="${note.id == this.activeNoteId ? 'active' : ''}">
                <div class="note-list-title">${note.title || 'Untitled Note'}</div>
                <div class="note-list-date">${new Date(note.createdAt).toLocaleString()}</div>
                <button class="delete-note-btn" title="Delete Note"><i class="fa-solid fa-trash-can"></i></button></li>`).join(''); 
        },
        renderMarkdown() {
            if (!this.activeNoteId) { this.elements.contentPreview.innerHTML = ''; return; }
            const note = this.notes.find(n => n.id == this.activeNoteId);
            if (note) { this.elements.contentPreview.innerHTML = DOMPurify.sanitize(marked.parse(note.content)); }
        },
        updateStatusBar() {
            if (!this.activeNoteId) { this.elements.statusBar.innerHTML = ''; return; }
            const note = this.notes.find(n => n.id == this.activeNoteId);
            if (note) {
                const content = this.elements.contentEditor.value; const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
                const charCount = content.length; const creationDate = new Date(note.createdAt).toLocaleDateString();
                this.elements.statusBar.innerHTML = `<span>Words: ${wordCount}</span> | <span>Chars: ${charCount}</span> | <span id="note-creation-date">Created: ${creationDate}</span>`;
            }
        }
    };
    
    const KanbanBoard = {
        data: { columns: [] }, draggedItem: { cardId: null, sourceColumnId: null, element: null, ghost: null },
        init() { 
            this.elements = { container: document.getElementById('kanban-container') }; 
            if(!this.elements.container) return;
            this.load(); this.render(); 
            this.elements.container.addEventListener('click', e => this.handleClick(e)); 
            this.elements.container.addEventListener('dragstart', e => this.handleDragStart(e)); 
            this.elements.container.addEventListener('dragend', e => this.handleDragEnd(e)); 
            this.elements.container.addEventListener('dragover', e => this.handleDragOver(e)); 
            this.elements.container.addEventListener('dragleave', e => this.handleDragLeave(e)); 
            this.elements.container.addEventListener('drop', e => this.handleDrop(e));
            this.elements.container.addEventListener('touchstart', e => this.handleTouchStart(e), { passive: false });
            this.elements.container.addEventListener('touchmove', e => this.handleTouchMove(e), { passive: false });
            this.elements.container.addEventListener('touchend', e => this.handleTouchEnd(e));
        },
        load() {
            this.data = JSON.parse(localStorage.getItem('ezken-os-kanban')) || { 
                columns: [ 
                    { id: 1, title: 'Backlog', cards: [] }, { id: 2, title: 'To Do', cards: [] }, 
                    { id: 3, title: 'In Progress', cards: [] }, { id: 4, title: 'Done', cards: [] } 
                ] 
            };
        },
        save() { localStorage.setItem('ezken-os-kanban', JSON.stringify(this.data)); },
        render() { 
            const scrollStates = Array.from(this.elements.container.querySelectorAll('.kanban-cards')).map(el => el.scrollTop);
            this.elements.container.innerHTML = `<div class="kanban-board">${this.data.columns.map(col => this.renderColumn(col)).join('')}</div>`; 
            this.elements.container.querySelectorAll('.kanban-cards').forEach((el, index) => { el.scrollTop = scrollStates[index] || 0; });
        },
        renderColumn(column) { 
            return `<div class="kanban-column" data-column-id="${column.id}"> 
                        <div class="kanban-column-header">${column.title}</div> 
                        <div class="kanban-cards">${column.cards.map(card => this.renderCard(card)).join('')}</div> 
                        <button class="add-card-btn primary"><i class="fa-solid fa-plus"></i> Add Card</button> 
                    </div>`; 
        },
        renderCard(card) { return `<div class="kanban-card" draggable="true" data-card-id="${card.id}">${card.text}<button class="delete-card-btn"><i class="fa-solid fa-xmark"></i></button></div>`; },
        handleClick(e) {
            if (e.target.closest('.add-card-btn')) {
                const columnId = e.target.closest('.kanban-column').dataset.columnId; const text = prompt("Enter new card text:");
                if (text && text.trim()) { 
                    const column = this.data.columns.find(c => c.id == columnId); 
                    column.cards.push({ id: Date.now(), text: text.trim() }); this.save(); this.render(); 
                }
            }
            if (e.target.closest('.delete-card-btn')) {
                e.stopPropagation(); const cardId = e.target.closest('.kanban-card').dataset.cardId; 
                this.data.columns.forEach(col => { col.cards = col.cards.filter(c => c.id != cardId); }); 
                this.save(); this.render();
            }
        },
        handleDragStart(e) { 
            if (e.target.classList.contains('kanban-card')) {
                setTimeout(() => e.target.classList.add('dragging'), 0);
                this.draggedItem.cardId = e.target.dataset.cardId;
                this.draggedItem.sourceColumnId = e.target.closest('.kanban-column').dataset.columnId;
                App.isDraggingKanbanCard = true;
            }
        },
        handleDragEnd(e) { e.target.classList.remove('dragging'); App.isDraggingKanbanCard = false; },
        handleDragOver(e) { 
            const column = e.target.closest('.kanban-column'); if (column) { e.preventDefault(); column.classList.add('drag-over'); } 
        },
        handleDragLeave(e) { const column = e.target.closest('.kanban-column'); if (column) { column.classList.remove('drag-over'); } },
        handleDrop(e) {
            const columnEl = e.target.closest('.kanban-column'); if (!columnEl) return;
            e.preventDefault(); columnEl.classList.remove('drag-over');
            this.moveCard(columnEl.dataset.columnId);
        },
        handleTouchStart(e) {
            const card = e.target.closest('.kanban-card'); if (!card || e.target.closest('.delete-card-btn')) return;
            e.preventDefault(); App.isDraggingKanbanCard = true;
            this.draggedItem = { element: card, cardId: card.dataset.cardId, sourceColumnId: card.closest('.kanban-column').dataset.columnId };
            const rect = card.getBoundingClientRect();
            this.draggedItem.ghost = card.cloneNode(true);
            this.draggedItem.ghost.classList.add('kanban-card-ghost'); document.body.appendChild(this.draggedItem.ghost);
            const touch = e.touches[0];
            this.draggedItem.offsetX = touch.clientX - rect.left; this.draggedItem.offsetY = touch.clientY - rect.top;
            this.draggedItem.ghost.style.width = `${rect.width}px`;
            this.draggedItem.ghost.style.left = `${touch.clientX - this.draggedItem.offsetX}px`;
            this.draggedItem.ghost.style.top = `${touch.clientY - this.draggedItem.offsetY}px`;
            card.classList.add('dragging');
        },
        handleTouchMove(e) {
            if (!this.draggedItem.ghost) return; e.preventDefault();
            const touch = e.touches[0];
            this.draggedItem.ghost.style.left = `${touch.clientX - this.draggedItem.offsetX}px`;
            this.draggedItem.ghost.style.top = `${touch.clientY - this.draggedItem.offsetY}px`;
            this.draggedItem.ghost.style.visibility = 'hidden';
            const elementUnder = document.elementFromPoint(touch.clientX, touch.clientY);
            this.draggedItem.ghost.style.visibility = 'visible';
            document.querySelectorAll('.kanban-column').forEach(c => c.classList.remove('drag-over'));
            const column = elementUnder ? elementUnder.closest('.kanban-column') : null;
            if (column) { column.classList.add('drag-over'); }
        },
        handleTouchEnd(e) {
            if (!this.draggedItem.ghost) return;
            App.isDraggingKanbanCard = false;
            const touch = e.changedTouches[0];
            this.draggedItem.ghost.style.visibility = 'hidden';
            const elementUnder = document.elementFromPoint(touch.clientX, touch.clientY);
            const targetColumn = elementUnder ? elementUnder.closest('.kanban-column') : null;
            if (targetColumn) { this.moveCard(targetColumn.dataset.columnId); }
            document.body.removeChild(this.draggedItem.ghost);
            this.draggedItem.element.classList.remove('dragging');
            document.querySelectorAll('.kanban-column').forEach(c => c.classList.remove('drag-over'));
            this.draggedItem = { cardId: null, sourceColumnId: null, element: null, ghost: null };
        },
        moveCard(targetColumnId) {
            if (!targetColumnId || this.draggedItem.sourceColumnId === targetColumnId) return;
            const sourceCol = this.data.columns.find(c => c.id == this.draggedItem.sourceColumnId);
            const targetCol = this.data.columns.find(c => c.id == targetColumnId); if (!sourceCol || !targetCol) return;
            const cardIndex = sourceCol.cards.findIndex(card => card.id == this.draggedItem.cardId);
            if (cardIndex > -1) {
                const [draggedCard] = sourceCol.cards.splice(cardIndex, 1);
                targetCol.cards.push(draggedCard); this.save(); this.render();
            }
        }
    };
    
    // ===== START: FOCUS PET MODULE (SVG + TUTORIAL VERSION) =====
    const FocusPet = {
        data: {},
        init() {
            this.elements = {
                sprite: document.getElementById('pet-sprite'),
                level: document.getElementById('pet-level'),
                xpBar: document.getElementById('pet-xp-bar-fill'),
                xpText: document.getElementById('pet-xp-text'),
                typeSelect: document.getElementById('pet-type-select'),
                colorSelect: document.getElementById('pet-color-select'),
                feedButton: document.getElementById('feed-pet-btn'),
                tutorialButton: document.getElementById('show-tutorial-btn'),
            };
            if(!this.elements.sprite) return;

            this.load();
            this.render();
            this.addListeners();
            this.tutorial.init(this);
        },
        
        load() {
            const defaults = { type: 'slime', color: 'default', level: 1, xp: 0 };
            this.data = JSON.parse(localStorage.getItem('ezken-os-focus-pet')) || defaults;
        },
        
        save() {
            localStorage.setItem('ezken-os-focus-pet', JSON.stringify(this.data));
        },
        
        addListeners() {
            this.elements.typeSelect.addEventListener('change', () => {
                this.data.type = this.elements.typeSelect.value;
                this.save();
                this.render();
            });

            this.elements.colorSelect.addEventListener('change', () => {
                this.data.color = this.elements.colorSelect.value;
                this.save();
                this.render();
            });
            
            this.elements.feedButton.addEventListener('click', () => this.feed());
            this.elements.tutorialButton.addEventListener('click', () => this.tutorial.start());
        },
        
        getXpForNextLevel() { return 100 * Math.pow(this.data.level, 1.5); },

        addXP(amount) {
            this.data.xp += amount;
            if (this.data.xp >= this.getXpForNextLevel()) this.levelUp();
            this.save();
            this.render();
            this.setAnimation('happy');
        },
        
        levelUp() {
            this.data.level++;
            this.data.xp = 0;
            App.showNotification(`Your pet leveled up to Level ${this.data.level}!`);
        },

        feed() {
            const cost = 10;
            if (this.data.xp >= cost) {
                this.data.xp -= cost;
                this.addXP(Math.floor(Math.random() * 5) + 1);
                App.showNotification(`You fed your pet!`);
                this.setAnimation('happy');
            } else {
                App.showNotification("Not enough XP to feed your pet!");
            }
        },

        drawPet(type = this.data.type) {
            let svg = '';
            const viewBox = "0 0 100 100";
            switch(type) {
                case 'slime':
                    svg = `<svg viewBox="${viewBox}"><path class="pet-body" d="M 95,65 C 95,85 80,95 50,95 C 20,95 5,85 5,65 C 5,45 20,25 50,25 C 80,25 95,45 95,65 Z" /><circle class="pet-eye" cx="35" cy="55" r="5" /><circle class="pet-eye" cx="65" cy="55" r="5" /></svg>`;
                    break;
                case 'ghost':
                    svg = `<svg viewBox="${viewBox}"><path class="pet-body ghost-body" d="M 10,95 L 10,50 C 10,25 30,5 50,5 C 70,5 90,25 90,50 L 90,95 L 75,80 L 60,95 L 45,80 L 30,95 L 10,95 Z" /><circle class="pet-eye" cx="38" cy="45" r="6" /><circle class="pet-eye" cx="62" cy="45" r="6" /></svg>`;
                    break;
                case 'axolotl':
                    svg = `<svg viewBox="${viewBox}"><path class="pet-feature" d="M 30,25 L 10,15 M 32,40 L 5,38 M 30,55 L 10,65" /><path class="pet-feature" d="M 70,25 L 90,15 M 68,40 L 95,38 M 70,55 L 90,65" /><path class="pet-body" d="M 50,15 C 30,15 25,40 25,50 C 25,80 35,95 50,95 C 65,95 75,80 75,50 C 75,40 70,15 50,15 Z" /><circle class="pet-eye" cx="42" cy="45" r="5" /><circle class="pet-eye" cx="58" cy="45" r="5" /></svg>`;
                    break;
            }
            return svg;
        },
        
        render() {
            this.elements.sprite.dataset.color = this.data.color;
            this.elements.sprite.innerHTML = this.drawPet();
            this.elements.typeSelect.value = this.data.type;
            this.elements.colorSelect.value = this.data.color;
            const xpNeeded = this.getXpForNextLevel();
            const xpPercent = (this.data.xp / xpNeeded) * 100;
            this.elements.level.textContent = `Level ${this.data.level}`;
            this.elements.xpBar.style.width = `${xpPercent}%`;
            this.elements.xpText.textContent = `${Math.floor(this.data.xp)} / ${Math.floor(xpNeeded)} XP`;
        },
        
        setAnimation(animation) {
            if (!this.elements.sprite) return;
            this.elements.sprite.className = '';
            this.elements.sprite.classList.add('pet-sprite');
            if (animation === 'happy') {
                this.elements.sprite.classList.add('happy');
                setTimeout(() => this.setAnimation('idle'), 800);
            } else if (animation === 'working') {
                this.elements.sprite.classList.add('working');
            }
        },

        tutorial: {
            parent: null,
            currentStep: 0,
            elements: {},
            steps: [
                "Complete tasks or Pomodoro sessions...",
                "...to earn Experience Points (XP)...",
                "...which helps your Focus Pet grow...",
                "...and eventually LEVEL UP! Happy focusing!"
            ],
            init(parent) {
                this.parent = parent;
                this.elements = {
                    overlay: document.getElementById('focus-pet-tutorial-overlay'),
                    desc: document.getElementById('tutorial-description'),
                    dots: document.getElementById('tutorial-dots'),
                    nextBtn: document.getElementById('tutorial-next-btn'),
                    backBtn: document.getElementById('tutorial-back-btn'),
                    task: document.getElementById('tut-task'),
                    xpText: document.getElementById('tut-xp-text'),
                    xpBarContainer: document.getElementById('tut-xp-bar-container'),
                    xpBarFill: document.getElementById('tut-xp-bar-fill'),
                    petContainer: document.getElementById('tut-pet-container'),
                };
                if (!this.elements.overlay) return;
                this.elements.nextBtn.addEventListener('click', () => this.next());
                this.elements.backBtn.addEventListener('click', () => this.back());
                this.elements.overlay.addEventListener('click', (e) => {
                    if (e.target === this.elements.overlay) this.close();
                });
                this.elements.dots.innerHTML = this.steps.map((_, i) => `<div class="tutorial-dot" data-step="${i}"></div>`).join('');
            },
            start() {
                this.currentStep = 0;
                this.elements.overlay.classList.add('visible');
                this.goToStep(this.currentStep);
            },
            close() { this.elements.overlay.classList.remove('visible'); },
            next() {
                if (this.currentStep < this.steps.length - 1) {
                    this.currentStep++;
                    this.goToStep(this.currentStep);
                } else {
                    this.close();
                }
            },
            back() {
                if (this.currentStep > 0) {
                    this.currentStep--;
                    this.goToStep(this.currentStep);
                }
            },
            resetAnimations() {
                Object.values(this.elements).forEach(el => {
                    if (el && el.classList && el.classList.contains('tut-element')) {
                        el.style.animation = 'none';
                        el.style.opacity = '0';
                    }
                });
                if(this.elements.xpBarFill) this.elements.xpBarFill.style.width = '0%';
            },
            goToStep(step) {
                this.resetAnimations();
                this.elements.desc.textContent = this.steps[step];
                this.elements.backBtn.style.visibility = step === 0 ? 'hidden' : 'visible';
                this.elements.nextBtn.textContent = step === this.steps.length - 1 ? "Finish" : "Next";
                
                this.elements.dots.querySelectorAll('.tutorial-dot').forEach((dot, i) => {
                    dot.classList.toggle('active', i === step);
                });

                const animate = (el, name, delay = '0s') => {
                    if(!el) return;
                    el.style.animation = 'none';
                    void el.offsetHeight;
                    el.style.animation = `${name} 0.5s ease-out ${delay} forwards`;
                };

                switch (step) {
                    case 0:
                        animate(this.elements.task, 'fadeInUp');
                        break;
                    case 1:
                        animate(this.elements.task, 'fadeInUp');
                        setTimeout(() => {
                           if(this.elements.xpText) {
                                this.elements.xpText.style.opacity = '1';
                                animate(this.elements.xpText, 'fly-to-bar', '0.2s');
                           }
                        }, 300);
                        break;
                    case 2:
                        animate(this.elements.xpBarContainer, 'fadeInUp');
                        setTimeout(() => {
                           if(this.elements.xpBarFill) this.elements.xpBarFill.style.width = '60%';
                        }, 500);
                        break;
                    case 3:
                        this.elements.petContainer.innerHTML = this.parent.drawPet('axolotl');
                        animate(this.elements.petContainer, 'fadeInUp');
                        setTimeout(() => {
                           if(this.elements.petContainer) this.elements.petContainer.style.animation = 'pulse 1.2s infinite ease-in-out';
                        }, 500);
                        break;
                }
            }
        }
    };
    
    // Initialize the OS
    App.init();
});
