# Ammonite Studio - Website Architecture & CMS Guide

## 1. Overview
The Ammonite Studio website is a lightweight, fully custom, database-free (flat-file CMS) multi-page application. Rather than relying on a heavy framework (like React or Next.js) or a database backend (like SQL), the site generates its content dynamically by fetching raw `.txt` files and media directly from your folder structure.

## 2. Technical Stack
- **Frontend Core**: Vanilla HTML5, CSS3, and ES6 JavaScript. No bundlers or build steps required.
- **3D Engine**: `Three.js` (used exclusively on the `index.html` landing page to render the point cloud).
- **Backend / Dev Server**: `server.py` (a lightweight Python HTTP server that exposes a custom API).

## 3. Core Pages & Routing
The application is split into 4 distinct, stateless pages. Each page has a dedicated JavaScript file that manages its specific localized logic, preventing memory overlap or bugs on unused pages.

### A. Landing Page (`index.html` & `landing.js`)
- **Purpose**: The "Digital Twin" entry point.
- **Mechanics**: Mounts the full-screen `Three.js` canvas. It parses `info/data.txt` to grab the studio's general contact info (email, social) and overlays it centrally on the screen.

### B. Archive Page (`archive.html` & `archive.js`)
- **Purpose**: The master project index / "Data-Sheet" grid.
- **Mechanics**: Upon loading, `archive.js` fetches `/api/projects`. This returns a dynamic array of all the folders inside your `projects/` directory. It then loops through each folder, fetches their `info.txt`, grabs the thumbnail (`1.jpg`), and renders the grid rows.
- **Interactions**: Clicking `[ ARCH ]` or `[ DESIGN ]` filters the grid via CSS categorization classes and locks the header logo text to a specific state.

### C. Project Detail (`project.html` & `project.js`)
- **Purpose**: The individual project display template.
- **Mechanics**: Reads the URL parameter (e.g., `?p=casa_lc`). It looks inside `projects/casa_lc/` and fetches `info.txt`. It binds the data (NAME, LOCATION, YEAR, etc.) into the HTML header slots and generates an `<img>` gallery block based on the `IMAGES` value.
- **The "Custom Override"**: Before rendering the default project template, it actively checks if a `custom.html` file exists in the specific project folder. If it does, it aborts the default render and injects the `custom.html` code directly into the container.

### D. About Page (`about.html` & `about.js`)
- **Purpose**: The split-screen studio profile.
- **Mechanics**: Fetches `info/data.txt` and dynamically parses the multiline `MANIFESTO` and dual HQ addresses, inserting them into the right-side layout.

## 4. The Global Design System
- **`style.css`**: The sole, master stylesheet. All colors and fonts are tied to global CSS variables (`:root`). 
- **Typography**: `Inter` is strictly reserved for logos/identities. `Space Mono` is used for all dynamic CMS data, UI elements, and navigation.
- **Colors**: Strictly white, black, Ammonite Blue (`#0000FF`), and Red (`#CC0000`). The `body` class dictates whether the page renders in default light mode, `.arch-mode` (inverted black), or `.design-mode` (red).
- **Persistent Interactions**: All JavaScript files inject a common Scramble Logo logic (AMMONITE ↔ AMMO) and initialize the Blueprint Crosshair custom DOM cursor.

## 5. The CMS Data Structure (How to Publish Work)
Your site is completely decoupled from the code. Data is managed exclusively via these directories:

### A. Global Data (`info/data.txt`)
Contains absolute variables used across multiple pages:
- `MANIFESTO`: The long-form paragraph on the About page.
- `HQ-01` & `HQ-02`: Address lines.
- `EMAIL` & `IG`: Contact data.
- `SCAN_FILE`: Determines which `.ply` file is loaded by the landing page.

### B. Project Data (`projects/{folder_name}/`)
To publish a new project, create a new lowercase folder containing:
1.  **`info.txt`**: The configuration file.
    *(Requires: NAME, LOCATION, YEAR, TYPE, CATEGORY, IMAGES, DESCRIPTION)*
2.  **`1.jpg`**: Always treated as the thumbnail/main display image for the Archive.
3.  **Media Files**: Subsequent images (`2.jpg`, `3.jpg`) as dictated by the `IMAGES` count.

## 6. The Local API Server (`server.py`)
Because modern browsers strictly block local Javascript files from freely scanning your computer's hard drive for security reasons (CORS policies), the `server.py` script acts as a bridge. 
- Running `python3 server.py` spins up a local web server.
- It attaches an endpoint to `http://localhost:8000/api/projects`.
- When `archive.js` asks this endpoint what projects exist, the Python script reads the hard drive's `projects/` folder directly and returns a clean array (e.g., `["casa_lc", "primiero_georgia"]`), making your archive entirely automated without hardcoded lists!
