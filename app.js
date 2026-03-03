// --- Constants & Config ---
const STORAGE_KEY = 'adhd_trip_planner_data';
const APP_VERSION = '1.0.1';

// --- State Management ---
let appState = {
    activeTripId: null,
    trips: []
};

// Initialize app
function init() {
    loadData();
    registerServiceWorker();
    setupEventListeners();
    showCatalogue();
}

// Load from LocalStorage
function loadData() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        try {
            appState.trips = JSON.parse(saved);
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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appState.trips));
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
const dateFormatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', weekday: 'short' });
const timeFormatter = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

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
    document.getElementById('header-title').textContent = 'My Trips';
    document.getElementById('trip-summary').innerHTML = `${appState.trips.length} trip${appState.trips.length !== 1 ? 's' : ''}`;

    renderCatalogue();
}

function showTrip(tripId) {
    appState.activeTripId = tripId;
    document.getElementById('catalogue-view').classList.add('hidden');
    document.getElementById('detail-view').classList.remove('hidden');
    document.getElementById('btn-back').classList.remove('hidden');
    document.getElementById('btn-edit-title').classList.remove('hidden');
    document.getElementById('fab-add-trip').classList.add('hidden');
    document.getElementById('fab-add-step').classList.remove('hidden');

    const trip = appState.trips.find(t => t.id === tripId);
    document.getElementById('header-title').textContent = trip.name;

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
            dateStr = `${dateFormatter.format(start)} - ${dateFormatter.format(end)}`;
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
                    <i data-lucide="map-pin" class="icon-xs text-muted"></i>
                </div>
                <div class="card p-4">
                    <div class="flex-between mb-3">
                        <div class="flex-center gap-2">
                            <div class="mode-icon ${bgMap[step.type]}">
                                <i data-lucide="${iconMap[step.type]}" class="icon-sm"></i>
                            </div>
                            <div>
                                <h3 class="text-sm font-semibold">
                                    ${step.type === 'preparation' ? step.from : `${step.from} → ${step.to}`}
                                </h3>
                                <p class="mode-label">${step.type}</p>
                            </div>
                        </div>
                        <div class="flex-center gap-1">
                            <button onclick="editStep('${step.id}')" class="btn-icon"><i data-lucide="pencil" class="icon-xs"></i></button>
                            <button onclick="deleteStep('${step.id}')" class="btn-icon"><i data-lucide="trash-2" class="icon-xs"></i></button>
                        </div>
                    </div>
                    <div class="grid-2 text-sm bg-muted p-2 rounded">
                        <div>
                            <p class="text-xs text-muted">Arrival</p>
                            <p class="font-semibold">${timeFormatter.format(timings.start)}</p>
                        </div>
                        <div>
                            <p class="text-xs text-muted">Duration</p>
                            <p class="font-semibold">${formatDuration(parseInt(step.durHours) * 60 + parseInt(step.durMins))}</p>
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
    const summaryEl = document.getElementById('trip-summary');
    if (steps.length === 0) {
        summaryEl.innerHTML = `<span>No journey scheduled</span>`;
        return;
    }

    const start = getStepTimings(steps[0]).start;
    const end = getStepTimings(steps[steps.length - 1]).end;
    const totalMins = Math.round((end - start) / 60000);

    summaryEl.innerHTML = `
        <i data-lucide="calendar" class="icon-sm"></i> <span>${dateFormatter.format(start)}</span>
        <span class="mx-1">•</span>
        <i data-lucide="clock" class="icon-sm"></i> <span>${formatDuration(totalMins)}</span>
    `;
}

// --- Actions ---
function createNewTrip() {
    const name = prompt("Enter new trip name:", "New Trip");
    if (!name) return;

    const newTrip = {
        id: 'trip-' + Date.now(),
        name: name.trim(),
        steps: []
    };
    appState.trips.push(newTrip);
    saveData();
    showTrip(newTrip.id);
}

function deleteTrip(tripId, event) {
    event.stopPropagation();
    if (confirm("Delete this trip?")) {
        appState.trips = appState.trips.filter(t => t.id !== tripId);
        saveData();
        renderCatalogue();
    }
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

function deleteStep(id) {
    if (confirm("Remove this step?")) {
        const trip = appState.trips.find(t => t.id === appState.activeTripId);
        trip.steps = trip.steps.filter(s => s.id !== id);
        saveData();
        renderTrip();
    }
}

// --- Modal ---
const modal = document.getElementById('step-modal');
const form = document.getElementById('step-form');

function openModal(prefill = null) {
    form.reset();
    document.getElementById('step-id').value = '';
    document.getElementById('modal-title').textContent = 'Add Step';

    if (!prefill) {
        const now = new Date();
        document.getElementById('depDate').value = now.toISOString().split('T')[0];
        document.getElementById('depTime').value = now.toTimeString().slice(0, 5);
    } else {
        document.getElementById('fromLoc').value = prefill.from || '';
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
    const middleArrow = document.getElementById('middle-arrow');
    const labelFrom = document.getElementById('label-from');

    if (type === 'preparation') {
        toFieldContainer.classList.add('hidden');
        document.getElementById('toLoc').required = false;
        middleArrow.classList.add('hidden');
        labelFrom.textContent = 'Task / Prep Name';
    } else {
        toFieldContainer.classList.remove('hidden');
        document.getElementById('toLoc').required = true;
        middleArrow.classList.remove('hidden');
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
}

// Data Import/Export
function exportData() {
    const dataStr = JSON.stringify(appState.trips, null, 2);
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
                appState.trips = imported;
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
