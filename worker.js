// worker.js

// Internal state for merging
let mergedArray = []; // This holds the combined data (for array-based JSONs)
let currentIndex = 0; // tracks how many files we've processed
let totalFiles = 0;    // total number of files to merge

self.onmessage = function (e) {
    const { fileText, fileName, index, total, type } = e.data;

    // If a special command error comes through, propagate it with a structured response
    if (type === 'error') {
        self.postMessage({ type: 'error', error: e.data.error });
        return;
    }

    // Initialize counters on first file
    if (index === 0 && total) {
        mergedArray = []; // reset for a new run
        currentIndex = 0;
        totalFiles = total;
    }

    try {
        const parsed = JSON.parse(fileText);

        // Merge logic — adjust to your data shape if you need more nuance
        if (Array.isArray(parsed)) {
            mergedArray.push(...parsed);
        } else {
            // If merging non-array structures, you might want object combining instead
            mergedArray.push(parsed);
        }
        currentIndex += 1;

        // Send progress back to the main thread
        const percent = Math.round((currentIndex / totalFiles) * 100);
        self.postMessage({
            type: 'progress',
            percent: percent
        });

        // If this was the last file, send final result (full + preview)
        if (currentIndex >= totalFiles) {
            // Create the full string result (this is the download-ready version)
            const fullString = JSON.stringify(mergedArray, null, 2);

            // Create a truncated preview for the UI (to avoid massive text DOM updates)
            let previewString;
            if (Array.isArray(mergedArray) && mergedArray.length > 1000) {
                // Truncate to first 1000 items as a safe preview
                previewString = JSON.stringify(mergedArray.slice(0, 1000), null, 2) +
                    `\n\n// ... truncated, showing ${1000} of ${mergedArray.length} total items`;
            } else {
                previewString = fullString;
            }

            // Send final data to main thread
            self.postMessage({
                type: 'final',
                data: {
                    fullString: fullString,
                    previewString: previewString,
                    totalCount: mergedArray.length
                }
            });

            // Reset state so the worker is ready for a new run if needed
            mergedArray = [];
            currentIndex = 0;
            totalFiles = 0;
        }

    } catch (error) {
        // If parsing fails, report structured error back to the main thread
        self.postMessage({
            type: 'error',
            error: `Error parsing file "${fileName}": ${error.message}`
        });

        // Reset to avoid silent corruption
        mergedArray = [];
        currentIndex = 0;
        totalFiles = 0;
    }
};