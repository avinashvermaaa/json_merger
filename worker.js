self.onmessage = function (e) {
    const fileContents = e.data;
    try {
        const parsed = fileContents.map((content) => JSON.parse(content));
        self.postMessage({ success: true, data: parsed.flat() });
    } catch (error) {
        self.postMessage({ success: false, error: error.message || error });
    }
};
