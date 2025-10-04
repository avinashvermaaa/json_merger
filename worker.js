// worker.js

self.onmessage = function (e) {
    const { fileText } = e.data;

    try {
        const parsed = JSON.parse(fileText);
        self.postMessage({ success: true, data: parsed });
    } catch (err) {
        self.postMessage({ success: false, error: err.message });
    }
};
