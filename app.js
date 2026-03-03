// --- Constants & Config ---
const STORAGE_KEY = 'adhd_trip_planner_data';
const APP_VERSION = '1.0.1';

// --- State Management ---
let appState = {
    activeTripId: null,
    trips: [],
    settings: {
        dateFormat: 'DD/MM/YYYY',
        timeFormat: '24h'
    }
};

// Initialize app
function init() {
    loadData();
    applySettingsToUI();
    registerServiceWorker();
    setupEventListeners();
    showCatalogue();
}

// Load from LocalStorage
function loadData() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            appState.trips = parsed.trips || [];
            appState.settings = parsed.settings || { dateFormat: 'DD/MM/YYYY', timeFormat: '24h' };
        } catch (e) {
            console.error("Failed to parse saved data", e);
            appState.trips = getDefaultData();
        }
    } else {
        appState.trips = getDefaultData();
        saveData();
    }
}

// Save to LocalStorage
function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
        trips: appState.trips,
        settings: appState.settings
    }));
}

function getDefaultData() {
    return [
        {
            id: '1',
            name: 'Europe Vacation',
            steps: [
                { id: 'prep-1', type: 'preparation', from: 'Pack Bags & Passports', to: '', date: '2026-04-10', time: '14:00', durHours: 2, durMins: 0 },
                { id: '1', type: 'plane', from: 'New York', to: 'London', date: '2026-04-10', time: '18:30', durHours: 7, durMins: 15 },
                { id: '2', type: 'bus', from: 'London', to: 'Oxford', date: '2026-04-11', time: '10:00', durHours: 1, durMins: 45 }
            ]
        }
    ];
}

// --- Formatters ---
function formatDate(dateString) {
    if (!dateString) return "";
    const [y, m, d] = dateString.split('-');
    const format = appState.settings.dateFormat;
    if (format === 'DD/MM/YYYY') return `${d}/${m}/${y}`;
    if (format === 'MM/DD/YYYY') return `${m}/${d}/${y}`;
    return dateString; // YYYY-MM-DD
}

function formatTime(timeString) {
    if (!timeString) return "";
    if (appState.settings.timeFormat === '24h') return timeString;

    let [h, m] = timeString.split(':');
    h = parseInt(h);
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    h = h ? h : 12;
    return `${h}:${m} ${ampm}`;
}

function getStepTimings(step) {
    const start = new Date(`${step.date}T${step.time}`);
    const end = new Date(start.getTime() + (parseInt(step.durHours) * 60 + parseInt(step.durMins)) * 60000);
    return { start, end };
}

function formatDuration(totalMins) {
    const h = Math.floor(totalMins / 60);
    const m = totalMins % 60;
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
}

// --- Navigation ---
function showCatalogue() {
    appState.activeTripId = null;
    document.getElementById('catalogue-view').classList.remove('hidden');
    document.getElementById('detail-view').classList.add('hidden');
    document.getElementById('btn-back').classList.add('hidden');
    document.getElementById('btn-edit-title').classList.add('hidden');
    document.getElementById('fab-add-trip').classList.remove('hidden');
    document.getElementById('fab-add-step').classList.add('hidden');

    // Header reset
    document.getElementById('header-title').textContent = 'ADHD Planner';

    // Drawer Close
    document.getElementById('trip-drawer').classList.remove('active');
    document.getElementById('drawer-overlay').classList.remove('active');

    renderCatalogue();
}

function showTrip(tripId) {
    appState.activeTripId = tripId;
    document.getElementById('detail-view').classList.remove('hidden');
    document.getElementById('btn-back').classList.add('hidden');
    document.getElementById('fab-add-trip').classList.add('hidden');
    document.getElementById('fab-add-step').classList.remove('hidden');

    // Drawer Open
    document.getElementById('trip-drawer').classList.add('active');
    document.getElementById('drawer-overlay').classList.add('active');

    renderTrip();
}

// --- Rendering ---
function renderCatalogue() {
    const container = document.getElementById('trip-list');
    const emptyState = document.getElementById('empty-catalogue');
    container.innerHTML = '';

    if (appState.trips.length === 0) {
        emptyState.classList.remove('hidden');
        return;
    } else {
        emptyState.classList.add('hidden');
    }

    appState.trips.forEach(trip => {
        let dateStr = "No dates set";
        if (trip.steps.length > 0) {
            const sorted = [...trip.steps].sort((a, b) => getStepTimings(a).start - getStepTimings(b).start);
            const start = getStepTimings(sorted[0]).start;
            const end = getStepTimings(sorted[sorted.length - 1]).end;
            const startStr = sorted[0].date;
            const endStr = sorted[sorted.length - 1].date;
            dateStr = `${formatDate(startStr)} - ${formatDate(endStr)}`;
        }

        const html = `
            <div onclick="showTrip('${trip.id}')" class="card group">
                <div class="flex-between">
                    <div>
                        <h3 class="card-title">${trip.name}</h3>
                        <div class="trip-summary">
                            <i data-lucide="calendar" class="icon-xs"></i> ${dateStr}
                            <span class="mx-1">•</span>
                            <i data-lucide="map-pin" class="icon-xs"></i> ${trip.steps.length} steps
                        </div>
                    </div>
                    <button onclick="deleteTrip('${trip.id}', event)" class="btn-icon text-muted hover-red" title="Delete">
                        <i data-lucide="trash-2" class="icon-sm"></i>
                    </button>
                </div>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', html);
    });
    lucide.createIcons();
}

function renderTrip() {
    const trip = appState.trips.find(t => t.id === appState.activeTripId);
    if (!trip) return;

    // Update Drawer Header
    document.getElementById('drawer-title').textContent = trip.name;
    updateTripSummary(trip.steps);

    let steps = [...trip.steps].sort((a, b) => getStepTimings(a).start - getStepTimings(b).start);

    const container = document.getElementById('timeline');
    const emptyState = document.getElementById('empty-state');
    container.innerHTML = '';

    if (steps.length === 0) {
        emptyState.classList.remove('hidden');
        updateTripSummary(steps);
        return;
    } else {
        emptyState.classList.add('hidden');
    }

    steps.forEach((step, index) => {
        const timings = getStepTimings(step);
        const isLast = index === steps.length - 1;

        let waitHtml = '';
        if (!isLast) {
            const nextStep = steps[index + 1];
            const nextTimings = getStepTimings(nextStep);
            const waitMins = Math.round((nextTimings.start - timings.end) / 60000);

            if (waitMins >= 0) {
                waitHtml = `
                    <div class="layover-badge">
                        <i data-lucide="clock" class="icon-xs"></i> ${formatDuration(waitMins)} layover
                    </div>
                `;
            } else {
                waitHtml = `
                    <div class="overlap-badge">
                        <i data-lucide="alert-triangle" class="icon-xs"></i> Overlap
                    </div>
                `;
            }
        }

        const iconMap = { bus: 'bus', plane: 'plane', taxi: 'car', minibus: 'truck', preparation: 'clipboard-check' };
        const bgMap = {
            bus: 'bg-blue', plane: 'bg-purple', taxi: 'bg-amber',
            minibus: 'bg-emerald', preparation: 'bg-indigo'
        };

        const html = `
            <div class="timeline-item">
                ${!isLast ? '<div class="timeline-line"></div>' : ''}
                <div class="timeline-node">
                    <div class="w-1.5 h-1.5 rounded-full bg-border"></div>
                </div>
                <div class="card p-3 hover:border-muted-foreground/30 shadow-sm">
                    <div class="flex items-center justify-between mb-2.5">
                        <div class="flex items-center gap-2.5 min-w-0">
                            <div class="mode-icon ${bgMap[step.type]} !w-8 !h-8 rounded-md shrink-0">
                                <i data-lucide="${iconMap[step.type]}" class="!w-4 !h-4 text-primary-foreground"></i>
                            </div>
                            <h3 class="text-sm font-semibold tracking-tight leading-tight truncate">
                                ${step.type === 'preparation' ? step.from : `${step.from} → ${step.to}`}
                            </h3>
                        </div>
                        <div class="flex items-center gap-0.5 shrink-0 -mr-1">
                            <button onclick="editStep('${step.id}')" class="btn-icon w-8 h-8 rounded-md hover:bg-muted transition-colors">
                                <i data-lucide="pencil" class="!w-3.5 !h-3.5 text-muted-foreground"></i>
                            </button>
                            <button onclick="deleteStep('${step.id}')" class="btn-icon w-8 h-8 rounded-md hover:bg-destructive/10 hover:text-destructive transition-colors">
                                <i data-lucide="trash-2" class="!w-3.5 !h-3.5"></i>
                            </button>
                        </div>
                    </div>
                    
                    <div class="flex items-center flex-wrap gap-x-4 gap-y-2 pt-2 border-t border-border/40">
                        <div class="flex items-center gap-1.5">
                            <i data-lucide="clock" class="!w-3 !h-3 text-muted-foreground"></i>
                            <span class="text-[11px] font-bold text-foreground/90">${formatTime(step.time)}</span>
                        </div>
                        <div class="flex items-center gap-1.5">
                            <i data-lucide="calendar" class="!w-3 !h-3 text-muted-foreground"></i>
                            <span class="text-[11px] text-muted-foreground">${formatDate(step.date)}</span>
                        </div>
                        <div class="flex items-center gap-1.5">
                            <i data-lucide="timer" class="!w-3 !h-3 text-muted-foreground"></i>
                            <span class="text-[11px] text-muted-foreground">${formatDuration(parseInt(step.durHours) * 60 + parseInt(step.durMins))}</span>
                        </div>
                        <div class="flex items-center gap-1.5 border-l border-border/40 pl-3 ml-auto">
                            <i data-lucide="check" class="!w-3 !h-3 text-primary"></i>
                            <span class="text-[11px] font-bold text-foreground">${formatTime(timings.end.toTimeString().slice(0, 5))}</span>
                        </div>
                    </div>
                </div>
                ${!isLast ? `<div class="insert-btn-container"><button onclick="insertAfter(${index})" class="btn-insert"><i data-lucide="plus" class="icon-xs"></i></button></div>` : ''}
            </div>
            ${waitHtml}
        `;
        container.insertAdjacentHTML('beforeend', html);
    });

    updateTripSummary(steps);
    lucide.createIcons();
}

function updateTripSummary(steps) {
    const summaryEl = document.getElementById('drawer-summary');
    if (steps.length === 0) {
        summaryEl.innerHTML = `<span>No journey scheduled</span>`;
        return;
    }

    const start = getStepTimings(steps[0]).start;
    const end = getStepTimings(steps[steps.length - 1]).end;
    const totalMins = Math.round((end - start) / 60000);

    summaryEl.innerHTML = `
        <i data-lucide="calendar" class="icon-sm"></i> <span>${formatDate(steps[0].date)}</span>
        <span class="mx-1">•</span>
        <i data-lucide="clock" class="icon-sm"></i> <span>${formatDuration(totalMins)}</span>
    `;
}

// --- Actions ---
const tripModal = document.getElementById('trip-modal');
const tripForm = document.getElementById('trip-form');
let tripEditId = null;

function createNewTrip() {
    tripEditId = null;
    tripForm.reset();
    document.querySelector('#trip-modal .modal-title').textContent = 'Create New Trip';
    document.querySelector('#trip-modal .modal-description').textContent = 'Give your journey a name to get started.';
    tripModal.showModal();
}

function editTripName() {
    const trip = appState.trips.find(t => t.id === appState.activeTripId);
    if (!trip) return;

    tripEditId = trip.id;
    document.getElementById('trip-name-input').value = trip.name;
    document.querySelector('#trip-modal .modal-title').textContent = 'Rename Trip';
    document.querySelector('#trip-modal .modal-description').textContent = 'Enter a new name for your journey.';
    tripModal.showModal();
}

function handleTripSubmit(event) {
    event.preventDefault();
    const name = document.getElementById('trip-name-input').value.trim();
    if (!name) return;

    if (tripEditId) {
        // Edit existing
        const trip = appState.trips.find(t => t.id === tripEditId);
        if (trip) {
            trip.name = name;
            if (appState.activeTripId === trip.id) {
                document.getElementById('drawer-title').textContent = name;
            }
            saveData();
            renderCatalogue();
        }
    } else {
        // Create new
        const newTrip = {
            id: 'trip-' + Date.now(),
            name: name,
            steps: []
        };
        appState.trips.push(newTrip);
        saveData();
        showTrip(newTrip.id);
    }
    closeTripModal();
}

function closeTripModal() {
    tripModal.close();
}

// --- Deletion Dialog ---
const confirmModal = document.getElementById('confirm-modal');
let deleteContext = { type: null, id: null };

function deleteTrip(tripId, event) {
    if (event) event.stopPropagation();
    deleteContext = { type: 'trip', id: tripId };
    document.getElementById('confirm-title').textContent = 'Delete Trip?';
    document.getElementById('confirm-description').textContent = 'This will permanently remove the trip and all its steps.';
    confirmModal.showModal();
}

function deleteStep(id) {
    deleteContext = { type: 'step', id: id };
    document.getElementById('confirm-title').textContent = 'Remove Step?';
    document.getElementById('confirm-description').textContent = 'This will permanently remove this step from your itinerary.';
    confirmModal.showModal();
}

function closeConfirmModal() {
    confirmModal.close();
}

function handleConfirmDelete() {
    if (deleteContext.type === 'trip') {
        appState.trips = appState.trips.filter(t => t.id !== deleteContext.id);
        saveData();
        renderCatalogue();
    } else if (deleteContext.type === 'step') {
        const trip = appState.trips.find(t => t.id === appState.activeTripId);
        if (trip) {
            trip.steps = trip.steps.filter(s => s.id !== deleteContext.id);
            saveData();
            renderTrip();
        }
    }
    closeConfirmModal();
}

function saveStep(e) {
    e.preventDefault();
    const trip = appState.trips.find(t => t.id === appState.activeTripId);
    if (!trip) return;

    const id = document.getElementById('step-id').value || Date.now().toString();
    const type = document.querySelector('input[name="type"]:checked').value;
    const from = document.getElementById('fromLoc').value;
    const to = document.getElementById('toLoc').value;
    const date = document.getElementById('depDate').value;
    const time = document.getElementById('depTime').value;
    const durHours = document.getElementById('durHours').value;
    const durMins = document.getElementById('durMins').value;

    const newStep = { id, type, from, to, date, time, durHours, durMins };
    const idx = trip.steps.findIndex(s => s.id === id);
    if (idx > -1) trip.steps[idx] = newStep;
    else trip.steps.push(newStep);

    saveData();
    closeModal();
    renderTrip();
}

// Function removed, handled by handleConfirmDelete

// --- Modal ---
const modal = document.getElementById('step-modal');
const form = document.getElementById('step-form');

function openModal(prefill = null) {
    form.reset();
    document.getElementById('step-id').value = '';
    document.getElementById('modal-title').textContent = 'Add Step';

    if (!prefill) {
        let lastStep = null;
        if (appState.activeTripId) {
            const trip = appState.trips.find(t => t.id === appState.activeTripId);
            if (trip && trip.steps.length > 0) {
                // Get chronologically last step
                const sorted = [...trip.steps].sort((a, b) => getStepTimings(a).start - getStepTimings(b).start);
                lastStep = sorted[sorted.length - 1];
            }
        }

        if (lastStep) {
            const timings = getStepTimings(lastStep);
            document.getElementById('fromLoc').value = lastStep.to;
            document.getElementById('depDate').value = timings.end.toISOString().split('T')[0];
            document.getElementById('depTime').value = timings.end.toTimeString().slice(0, 5);
        } else {
            const now = new Date();
            document.getElementById('depDate').value = now.toISOString().split('T')[0];
            document.getElementById('depTime').value = now.toTimeString().slice(0, 5);
        }
    } else {
        document.getElementById('fromLoc').value = prefill.from || '';
        document.getElementById('toLoc').value = prefill.to || '';
        document.getElementById('depDate').value = prefill.date || '';
        document.getElementById('depTime').value = prefill.time || '';
    }

    toggleToField();
    modal.showModal();
}

function closeModal() { modal.close(); }

function toggleToField() {
    const type = document.querySelector('input[name="type"]:checked').value;
    const toFieldContainer = document.getElementById('to-field-container');
    const middleArrow = document.getElementById('center-icon-loc');
    const middleTimeIcon = document.getElementById('center-icon-time');
    const labelFrom = document.getElementById('label-from');

    if (type === 'preparation') {
        toFieldContainer.classList.add('hidden');
        document.getElementById('toLoc').required = false;
        if (middleArrow) middleArrow.classList.add('hidden');
        labelFrom.textContent = 'Task / Prep Name';
    } else {
        toFieldContainer.classList.remove('hidden');
        document.getElementById('toLoc').required = true;
        if (middleArrow) middleArrow.classList.remove('hidden');
        labelFrom.textContent = 'From';
    }
}

function editStep(id) {
    const trip = appState.trips.find(t => t.id === appState.activeTripId);
    const step = trip.steps.find(s => s.id === id);
    if (!step) return;

    document.getElementById('step-id').value = step.id;
    document.getElementById('fromLoc').value = step.from;
    document.getElementById('toLoc').value = step.to;
    document.getElementById('depDate').value = step.date;
    document.getElementById('depTime').value = step.time;
    document.getElementById('durHours').value = step.durHours;
    document.getElementById('durMins').value = step.durMins;
    document.querySelector(`input[name="type"][value="${step.type}"]`).checked = true;

    toggleToField();
    modal.showModal();
}

function insertAfter(index) {
    const trip = appState.trips.find(t => t.id === appState.activeTripId);
    const prev = trip.steps[index];
    const timings = getStepTimings(prev);
    openModal({
        from: prev.to,
        date: timings.end.toISOString().split('T')[0],
        time: timings.end.toTimeString().slice(0, 5)
    });
}

// --- Settings ---
const settingsModal = document.getElementById('settings-modal');

function openSettings() {
    document.getElementById('setting-date-format').value = appState.settings.dateFormat;
    document.getElementById('setting-time-format').value = appState.settings.timeFormat;
    settingsModal.showModal();
}

function closeSettings() {
    settingsModal.close();
}

function saveSettings() {
    appState.settings.dateFormat = document.getElementById('setting-date-format').value;
    appState.settings.timeFormat = document.getElementById('setting-time-format').value;
    saveData();
    closeSettings();
    if (appState.activeTripId) renderTrip();
    else renderCatalogue();
}

function applySettingsToUI() {
    // This could handle theme-specific logic if needed
}

// --- Service Worker & PWA ---
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('SW Registered', reg))
            .catch(err => console.log('SW Failed', err));
    }
}

// --- Global Events ---
function setupEventListeners() {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });
    settingsModal.addEventListener('click', (e) => {
        if (e.target === settingsModal) closeSettings();
    });
    tripModal.addEventListener('click', (e) => {
        if (e.target === tripModal) closeTripModal();
    });
    confirmModal.addEventListener('click', (e) => {
        if (e.target === confirmModal) closeConfirmModal();
    });
}

// Data Import/Export (Fixed Format: dd/mm/yyyy 24h)
function exportData() {
    // Map trips to requested export format
    const exportTrips = appState.trips.map(trip => ({
        ...trip,
        steps: trip.steps.map(step => {
            const [y, m, d] = step.date.split('-');
            return {
                ...step,
                date: `${d}/${m}/${y}`, // dd/mm/yyyy
                time: step.time // 24h (already stored as HH:mm)
            };
        })
    }));

    const dataStr = JSON.stringify(exportTrips, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trips-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const imported = JSON.parse(e.target.result);
            if (Array.isArray(imported)) {
                // Map back to internal format (yyyy-mm-dd)
                appState.trips = imported.map(trip => ({
                    ...trip,
                    steps: (trip.steps || []).map(step => {
                        if (step.date.includes('/')) {
                            const [d, m, y] = step.date.split('/');
                            return { ...step, date: `${y}-${m}-${d}` };
                        }
                        return step;
                    })
                }));
                saveData();
                showCatalogue();
            }
        } catch (error) {
            alert("Error parsing file.");
        }
    };
    reader.readAsText(file);
}

// Start
init();
