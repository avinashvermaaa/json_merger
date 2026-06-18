const mergeButton = document.getElementById("mergeButton");
const downloadButton = document.getElementById("downloadButton");
const fileInput = document.getElementById("fileInput");

let mergedData = null;
let worker = null;

function initWorker() {
    try {
        worker = new Worker("worker.js");
        worker.onmessage = function (e) {
            const { success, data, error } = e.data;
            mergeButton.classList.remove("loading");
            if (success) {
                mergedData = data;
                displayJSON(mergedData);
                mergeButton.classList.add("success");
                mergeButton.textContent = "Merged \u2713";
                downloadButton.classList.remove("hidden");
                downloadButton.classList.add("inline-flex");
            } else {
                mergeButton.textContent = "Merge Files";
                alert(error);
            }
        };
        worker.onerror = function () {
            mergeButton.classList.remove("loading");
            mergeButton.textContent = "Merge Files";
            alert("Worker error occurred during merging.");
            worker.terminate();
            worker = null;
        };
    } catch {
        worker = null;
    }
}

mergeButton.addEventListener("click", async () => {
    const files = fileInput.files;
    if (!files || files.length === 0) {
        alert("Please select at least one JSON file!");
        return;
    }

    mergeButton.classList.remove("success");
    mergeButton.classList.add("loading");
    mergeButton.textContent = "Merging...";

    if (!worker) initWorker();
    if (!worker) {
        mergeButton.classList.remove("loading");
        mergeButton.textContent = "Merge Files";
        alert("Web Workers are not supported in this browser.");
        return;
    }

    try {
        const fileList = Array.from(files);
        const texts = await Promise.all(fileList.map((file) => {
            if (!file.name.endsWith(".json")) {
                throw new Error(`Invalid file: ${file.name}`);
            }
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.onerror = () => reject(`Error reading ${file.name}`);
                reader.readAsText(file);
            });
        }));
        worker.postMessage(texts);
    } catch (err) {
        mergeButton.classList.remove("loading");
        mergeButton.textContent = "Merge Files";
        alert(err.message || err);
    }
});

function displayJSON(data) {
    const codeBlock = document.getElementById("mergedResult");
    codeBlock.textContent = JSON.stringify(data, null, 2);
    codeBlock.removeAttribute("data-highlighted");
    hljs.highlightElement(codeBlock);
}

downloadButton.addEventListener("click", () => {
    if (!mergedData) return;
    const blob = new Blob(
        [JSON.stringify(mergedData, null, 2)],
        { type: "application/json" }
    );
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "merged_data.json";
    link.click();
});

initWorker();
