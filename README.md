# JSON Merger

Merge multiple JSON files into a single JSON file directly in your browser. No uploads to any server — everything runs client-side.

**Live:** [https://jsonmergers.netlify.app](https://jsonmergers.netlify.app)

## Features

- Select multiple `.json` files and merge them into one
- Handles arrays (concatenates) and objects (appends) seamlessly
- Uses a **Web Worker** to keep the UI responsive even with large files (5MB+)
- Progress bar shows merge status in real time
- Preview the merged result (truncated for performance) with a toggle to view the full output
- Download the merged result as a `.json` file
- Dark themed UI built with **Tailwind CSS**
- Syntax highlighting via **Highlight.js**

## How to Use

1. Open the [live site](https://jsonmergers.netlify.app)
2. Click the file input and select one or more `.json` files
3. Click **Merge Files**
4. Wait for the progress bar to complete
5. Preview the result and click **Download Merged JSON** to save

## Tech Stack

- Vanilla JavaScript (no frameworks)
- Web Worker (inline Blob) for background processing
- Tailwind CSS via CDN
- Highlight.js for JSON syntax highlighting
- Deployed on Netlify

## Project Structure

```
index.html   — Main HTML with Tailwind UI
script.js    — App logic with inline Web Worker
public/      — Favicon, manifest, and PWA icons
```

## Local Development

Just open `index.html` in a browser — no build step required.

## 👤 Author

**Avinash**