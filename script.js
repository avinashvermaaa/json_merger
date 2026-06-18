const fileInput = document.getElementById('fileInput');
const mergeButton = document.getElementById('mergeButton');
const downloadButton = document.getElementById('downloadButton');
const mergedResult = document.getElementById('mergedResult');
const progressBar = document.getElementById('progressBar');
const progressPercent = document.getElementById('progressPercent');
const progressContainer = document.getElementById('progress-container');

let mergedDataString = "";
let hasFullData = false;

function setUIState(merging) {
    fileInput.disabled = merging;
    mergeButton.disabled = merging;
    downloadButton.disabled = merging;
}

let pendingPercent = 0;
let progressUpdateScheduled = false;
function updateProgress(percent) {
    pendingPercent = percent;
    if (progressUpdateScheduled) return;
    progressUpdateScheduled = true;
    requestAnimationFrame(() => {
        if (progressBar) progressBar.value = pendingPercent;
        if (progressPercent) progressPercent.textContent = `${pendingPercent}%`;
        progressUpdateScheduled = false;
    });
}

function createWorker() {
    const blob = new Blob([`
self.onmessage = function(e) {
    const { fileText, fileName, index, total, type } = e.data;
    if (type === 'error') {
        self.postMessage({ type: 'error', error: e.data.error });
        return;
    }
    if (index === 0 && total) {
        mergedArray = [];
        currentIndex = 0;
        totalFiles = total;
    }
    try {
        const parsed = JSON.parse(fileText);
        if (Array.isArray(parsed)) {
            mergedArray.push(...parsed);
        } else {
            mergedArray.push(parsed);
        }
        currentIndex += 1;
        const percent = Math.round((currentIndex / totalFiles) * 100);
        self.postMessage({ type: 'progress', percent: percent });
        if (currentIndex >= totalFiles) {
            const fullString = JSON.stringify(mergedArray, null, 2);
            let previewString;
            if (Array.isArray(mergedArray) && mergedArray.length > 1000) {
                previewString = JSON.stringify(mergedArray.slice(0, 1000), null, 2) +
                    \`\\n\\n// ... truncated, showing 1000 of \${mergedArray.length} total items\`;
            } else {
                previewString = fullString;
            }
            self.postMessage({ type: 'final', data: { fullString: fullString, previewString: previewString, totalCount: mergedArray.length } });
            mergedArray = []; currentIndex = 0; totalFiles = 0;
        }
    } catch (error) {
        self.postMessage({ type: 'error', error: \`Error parsing file "\${fileName}": \${error.message}\` });
        mergedArray = []; currentIndex = 0; totalFiles = 0;
    }
};
let mergedArray = []; let currentIndex = 0; let totalFiles = 0;
`], { type: 'application/javascript' });
    return new Worker(URL.createObjectURL(blob));
}

mergeButton.addEventListener('click', async () => {
    const files = Array.from(fileInput.files);
    if (!files.length) {
        alert('Please select at least one JSON file.');
        return;
    }
    for (const file of files) {
        if (!file.name.endsWith('.json')) {
            alert(`File ${file.name} is not a JSON file.`);
            return;
        }
    }

    mergedDataString = "";
    hasFullData = false;
    mergedResult.textContent = 'Processing\u2026 (this may take a moment)';
    downloadButton.classList.add('hidden');
    downloadButton.classList.remove('inline-flex');
    if (progressContainer) progressContainer.classList.remove('hidden');
    updateProgress(0);
    setUIState(true);

    const worker = createWorker();

    worker.onmessage = function (e) {
        const { type, data, error, percent } = e.data;
        if (type === 'progress') {
            updateProgress(percent);
            return;
        }
        if (type === 'error') {
            alert(`An error occurred: ${error}`);
            setUIState(false);
            if (progressContainer) progressContainer.classList.add('hidden');
            worker.terminate();
            return;
        }
        if (type === 'final') {
            mergedDataString = data.fullString;
            const previewString = data.previewString;
            hasFullData = true;
            mergedResult.textContent = previewString;
            downloadButton.classList.remove('hidden');
            downloadButton.classList.add('inline-flex');
            downloadButton.onclick = () => {
                const blob = new Blob([mergedDataString], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'merged_data.json';
                a.click();
                setTimeout(() => URL.revokeObjectURL(url), 100);
            };
            setUIState(false);
            if (progressContainer) progressContainer.classList.add('hidden');
            worker.terminate();
        }
    };

    worker.onerror = function () {
        alert('Unexpected worker error.');
        setUIState(false);
        if (progressContainer) progressContainer.classList.add('hidden');
        worker.terminate();
    };

    try {
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const text = await file.text();
            worker.postMessage({ fileText: text, fileName: file.name, index: i, total: files.length });
        }
    } catch (err) {
        alert(`File processing failed: ${err.message || err}`);
        setUIState(false);
        if (progressContainer) progressContainer.classList.add('hidden');
        worker.terminate();
    }
});

let fullShown = false;
const showMoreBtn = document.createElement('button');
showMoreBtn.textContent = 'Show full result';
showMoreBtn.className = 'mt-3 text-sm text-indigo-400 hover:text-indigo-300 hidden';
showMoreBtn.addEventListener('click', () => {
    if (!hasFullData) return;
    if (fullShown) {
        try {
            const parsed = JSON.parse(mergedDataString);
            const preview = Array.isArray(parsed)
                ? JSON.stringify(parsed.slice(0, 1000), null, 2)
                : mergedDataString.slice(0, 2000);
            mergedResult.textContent = preview + (Array.isArray(parsed) && parsed.length > 1000 ? `\n\n// ... truncated, ${parsed.length} total items` : '');
            showMoreBtn.textContent = 'Show full result';
            fullShown = false;
        } catch {
            alert('Could not generate preview.');
        }
    } else {
        mergedResult.textContent = mergedDataString;
        showMoreBtn.textContent = 'Show preview';
        fullShown = true;
    }
});
mergedResult.parentNode.appendChild(showMoreBtn);

const observer = new MutationObserver(() => {
    showMoreBtn.classList.toggle('hidden', !mergedResult.textContent.trim().length);
});
observer.observe(mergedResult, { childList: true, characterData: true, subtree: true });
