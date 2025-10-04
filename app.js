const fileInput = document.getElementById('fileInput');
const mergeButton = document.getElementById('mergeButton');
const downloadButton = document.getElementById('downloadButton');
const mergedResult = document.getElementById('mergedResult');
const progressBar = document.getElementById('progressBar');
const progressPercent = document.getElementById('progressPercent');
const progressContainer = document.getElementById('progress-container');

let mergedData = [];

mergeButton.addEventListener('click', async () => {
    const files = Array.from(fileInput.files);

    if (!files.length) {
        alert('Please select at least one JSON file.');
        return;
    }

    // Validate all files first
    for (const file of files) {
        if (file.type !== 'application/json') {
            alert(`File ${file.name} is not a JSON file.`);
            return;
        }
    }

    // Reset
    mergedData = [];
    mergedResult.textContent = '';
    downloadButton.style.display = 'none';
    progressContainer.style.display = 'block';
    progressBar.value = 0;
    progressPercent.textContent = '0%';

    // Create single worker
    const worker = new Worker('worker.js');

    const processFile = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = function (event) {
                worker.onmessage = function (e) {
                    const { success, data, error } = e.data;
                    if (success) {
                        resolve(data);
                    } else {
                        reject(`Error parsing file "${file.name}": ${error}`);
                    }
                };

                worker.onerror = function (e) {
                    reject(`Worker error in file "${file.name}": ${e.message}`);
                };

                worker.postMessage({ fileText: event.target.result });
            };

            reader.onerror = function () {
                reject(`Error reading file "${file.name}"`);
            };

            reader.readAsText(file);
        });
    };

    try {
        for (let i = 0; i < files.length; i++) {
            const parsed = await processFile(files[i]);

            // Merge efficiently
            if (Array.isArray(parsed)) {
                mergedData.push(...parsed);
            } else {
                mergedData.push(parsed);
            }

            // Update progress
            const percent = Math.round(((i + 1) / files.length) * 100);
            progressBar.value = percent;
            progressPercent.textContent = `${percent}%`;
        }

        // Done parsing all files
        displayMergedData(mergedData);

    } catch (err) {
        alert(err);
    } finally {
        progressContainer.style.display = 'none';
        worker.terminate();
    }
});

function displayMergedData(data) {
    // Limit preview to first 1000 items
    const previewData = Array.isArray(data) ? data.slice(0, 1000) : data;
    mergedResult.textContent = JSON.stringify(previewData, null, 2);

    downloadButton.style.display = 'inline-block';

    downloadButton.onclick = () => {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'merged_data.json';
        a.click();
        URL.revokeObjectURL(url);
    };
}
