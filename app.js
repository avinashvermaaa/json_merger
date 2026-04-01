const fileInput = document.getElementById('fileInput');
const mergeButton = document.getElementById('mergeButton');
const downloadButton = document.getElementById('downloadButton');
const mergedResult = document.getElementById('mergedResult');
const progressBar = document.getElementById('progressBar');
const progressPercent = document.getElementById('progressPercent');
const progressContainer = document.getElementById('progress-container');

// Keep stringified data to allow downloads without re-stringifying
let mergedDataString = ""; // holds the final JSON string
let hasFullData = false;   // flag whether we have the full dataset

// Helper: Enable/disable inputs consistently
function setUIState(merging) {
    fileInput.disabled = merging;
    mergeButton.disabled = merging;
    downloadButton.disabled = merging;
}

// Helper: Update progress bars with minimal DOM work (batched)
let pendingPercent = 0;
let progressUpdateScheduled = false;
function updateProgress(percent) {
    pendingPercent = percent;
    if (progressUpdateScheduled) return; // already scheduled
    progressUpdateScheduled = true;
    requestAnimationFrame(() => {
        progressBar.value = pendingPercent;
        progressPercent.textContent = `${pendingPercent}%`;
        progressUpdateScheduled = false;
    });
}

// Main merging logic
mergeButton.addEventListener('click', async () => {
    const files = Array.from(fileInput.files);

    if (!files.length) {
        alert('Please select at least one JSON file.');
        return;
    }

    // Validate file types (simple check)
    for (const file of files) {
        if (file.type !== 'application/json') {
            alert(`File ${file.name} is not a JSON file.`);
            return;
        }
    }

    // Reset UI + data
    mergedDataString = "";
    hasFullData = false;
    mergedResult.textContent = 'Processing… (this may take a moment)';
    downloadButton.style.display = 'none';
    progressContainer.style.display = 'block';
    updateProgress(0);
    setUIState(true); // disable inputs while processing

    // Create a single worker for the whole merge operation
    const worker = new Worker('worker.js');

    // Handle worker messages: progress, final result, or error
    worker.onmessage = function (e) {
        const { type, data, error, percent } = e.data;

        if (type === 'progress') {
            updateProgress(percent);
            return;
        }

        if (type === 'error') {
            alert(`An error occurred: ${error}`);
            setUIState(false);
            progressContainer.style.display = 'none';
            worker.terminate();
            return;
        }

        if (type === 'final') {
            // Worker has returned the FINAL string with merged data + a short preview string
            mergedDataString = data.fullString; // complete data as JSON string (ready for download)
            const previewString = data.previewString; // truncated JSON string for display
            hasFullData = true;

            // Show preview in the element (truncate to avoid UI lockups)
            mergedResult.textContent = previewString;

            // Enable download
            downloadButton.style.display = 'inline-block';

            // Setup download handler: use the full string returned from the worker
            downloadButton.onclick = () => {
                const blob = new Blob([mergedDataString], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'merged_data.json';
                a.click();
                setTimeout(() => URL.revokeObjectURL(url), 100); // allow browser to release after click
            };

            // Clean up
            setUIState(false);
            progressContainer.style.display = 'none';
            worker.terminate();
            return;
        }
    };

    worker.onerror = function (e) {
        alert(`Unexpected worker error: ${e.message}`);
        setUIState(false);
        progressContainer.style.display = 'none';
        worker.terminate();
    };

    // Read files in sequence and send them to the worker
    // This avoids keeping large strings/arrays on the main thread while allowing progress updates.
    try {
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const reader = new FileReader();

            // ReadAsText is fine for JSON files; if you expect extremely large files, consider chunked reading/stream parsing
            reader.onload = function (event) {
                // Send file content to worker with index information for progress accounting
                worker.postMessage({
                    fileText: event.target.result,
                    fileName: file.name,
                    index: i,
                    total: files.length
                });
            };

            reader.onerror = function () {
                worker.postMessage({
                    type: 'error',
                    error: `Error reading file "${file.name}"`
                });
                // If reader fails, we stop—clean up happens at the worker message handler on 'error'
            };

            reader.readAsText(file);
            // Small pause to avoid flooding (helps in some browsers if files are small and many)
            await new Promise(resolve => setTimeout(resolve, 10));
        }
    } catch (err) {
        alert(`File processing failed: ${err}`);
        setUIState(false);
        progressContainer.style.display = 'none';
        worker.terminate();
    }
});

// Optional: Add a "show full result" button for large previews (helps avoid freezing even on big dumps)
let fullShown = false;
const showMoreBtn = document.createElement('button');
showMoreBtn.textContent = 'Show full result';
showMoreBtn.style.display = 'none';
showMoreBtn.addEventListener('click', () => {
    if (!hasFullData) {
        alert('Full data is not available yet.');
        return;
    }
    if (fullShown) {
        // Revert to preview string
        try {
            // If we have the JSON string, we can recreate a preview (e.g., first 1000 array items)
            const parsed = JSON.parse(mergedDataString);
            const preview = Array.isArray(parsed)
                ? JSON.stringify(parsed.slice(0, 1000), null, 2)
                : mergedDataString.slice(0, 2000); // safer fallback
            mergedResult.textContent = preview + (Array.isArray(parsed) && parsed.length > 1000 ? '\n\n// ... truncated, ' + parsed.length + ' total items' : '');
            showMoreBtn.textContent = 'Show full result';
            fullShown = false;
        } catch {
            alert('Could not generate preview from data.');
        }
    } else {
        // Show full JSON string
        mergedResult.textContent = mergedDataString;
        showMoreBtn.textContent = 'Show preview';
        fullShown = true;
    }
});
mergedResult.parentNode.appendChild(showMoreBtn);

// Listen to changes in display and enable toggle if there is content
const observer = new MutationObserver(() => {
    showMoreBtn.style.display = mergedResult.textContent.trim().length > 0 ? 'inline-block' : 'none';
});
observer.observe(mergedResult, { childList: true, characterData: true, subtree: true });