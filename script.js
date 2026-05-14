const mergeButton = document.getElementById("mergeButton");
const downloadButton = document.getElementById("downloadButton");
const fileInput = document.getElementById("fileInput");
const outputCode = document.getElementById("mergedResult");

let mergedData = null;

mergeButton.addEventListener("click", async () => {
    const files = fileInput.files;

    if (files.length === 0) {
        alert("Please select at least one JSON file!");
        return;
    }

    // UI: Start loading
    mergeButton.classList.remove("success");
    mergeButton.classList.add("loading");
    mergeButton.textContent = "Merging...";

    try {
        const fileReadPromises = [];

        for (let file of files) {
            if (!file.name.endsWith(".json")) {
                throw new Error(`Invalid file: ${file.name}`);
            }

            const filePromise = new Promise((resolve, reject) => {
                const reader = new FileReader();

                reader.onload = (e) => {
                    try {
                        const jsonData = JSON.parse(e.target.result);
                        resolve(jsonData);
                    } catch {
                        reject(`Invalid JSON in ${file.name}`);
                    }
                };

                reader.onerror = () => reject(`Error reading ${file.name}`);

                reader.readAsText(file);
            });

            fileReadPromises.push(filePromise);
        }

        const results = await Promise.all(fileReadPromises);

        // Merge logic (arrays assumed)
        mergedData = results.flat();

        displayJSON(mergedData);

        // UI: Success
        mergeButton.classList.remove("loading");
        mergeButton.classList.add("success");
        mergeButton.textContent = "Merged ✓";

        downloadButton.classList.add("show");

    } catch (error) {
        mergeButton.classList.remove("loading");
        mergeButton.textContent = "Merge Files";
        alert(error);
    }
});

/* JSON display with syntax highlighting */
function displayJSON(data) {
    const codeBlock = document.getElementById("mergedResult");

    // Put JSON
    codeBlock.textContent = JSON.stringify(data, null, 2);

    // Reset previous highlighting (IMPORTANT)
    codeBlock.removeAttribute('data-highlighted');

    // Apply highlight AFTER inserting content
    hljs.highlightElement(codeBlock);
}

/* Download */
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