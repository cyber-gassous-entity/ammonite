document.addEventListener('DOMContentLoaded', () => {

    /* --- CURSOR LOGIC --- */
    const cursor = document.getElementById('cursor');

    function bindHover() {
        const hoverTriggers = document.querySelectorAll('a, button, .hover-trig');
        hoverTriggers.forEach(trigger => {
            trigger.addEventListener('mouseenter', () => { if (cursor) cursor.classList.add('hovered'); });
            trigger.addEventListener('mouseleave', () => { if (cursor) cursor.classList.remove('hovered'); });
        });
    }

    document.addEventListener('mousemove', (e) => {
        if (cursor) {
            cursor.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
        }
    });

    bindHover();

    /* --- AMMONITE <-> AMMO SCRAMBLE LOGIC --- */
    const logoEl = document.getElementById('logo-text');
    const modeEl = document.getElementById('mode-text');
    let logoScrambleInterval = null;
    let modeScrambleInterval = null;
    let mainLoopInterval = null;
    let lockLogoState = null;

    if (logoEl || modeEl) {
        const chars = '!<>-/_[]{}01*';
        const totalScrambleFrames = 18;
        let isAmmonite = true;

        function scrambleText(el, target, onComplete = null) {
            if (!el) return;
            let frame = 0;
            let interval = setInterval(() => {
                el.innerText = target.split("").map((letter, index) => {
                    const settleFrame = (index + 1) * (totalScrambleFrames / target.length);
                    if (frame > settleFrame) return target[index];
                    return chars[Math.floor(Math.random() * chars.length)];
                }).join("");

                if (frame >= totalScrambleFrames) {
                    clearInterval(interval);
                    el.innerText = target;
                    if (onComplete) onComplete();
                }
                frame++;
            }, 70);
            return interval;
        }

        lockLogoState = function (targetLogo, targetMode) {
            if (mainLoopInterval) {
                clearInterval(mainLoopInterval);
                mainLoopInterval = null;
            }
            if (logoScrambleInterval) clearInterval(logoScrambleInterval);
            if (modeScrambleInterval) clearInterval(modeScrambleInterval);
            
            if (logoEl) scrambleText(logoEl, targetLogo, () => { logoEl.innerText = targetLogo; });
            if (modeEl) scrambleText(modeEl, targetMode, () => { modeEl.innerText = targetMode; });
        };

        mainLoopInterval = setInterval(() => {
            isAmmonite = !isAmmonite;
            if (logoEl) {
                if (logoScrambleInterval) clearInterval(logoScrambleInterval);
                logoScrambleInterval = scrambleText(logoEl, isAmmonite ? 'AMMONITE' : 'AMMO');
            }
            if (modeEl) {
                if (modeScrambleInterval) clearInterval(modeScrambleInterval);
                modeScrambleInterval = scrambleText(modeEl, isAmmonite ? 'ARCHITECTURE' : 'DESIGN');
            }
        }, 4000);
    }

    /* --- PROJECT LOGIC --- */
    const params = new URLSearchParams(window.location.search);
    const folder = params.get('p');
    const mainContainer = document.getElementById('project-main-content');
    const defaultTemplate = document.getElementById('default-template');

    if (!folder) {
        if (document.getElementById('p-name')) document.getElementById('p-name').innerHTML = "ERROR: NO PROJECT FOLDER SPECIFIED";
        return;
    }

    async function loadProject() {
        try {
            // --- 1. CHECK FOR CUSTOM.HTML OVERRIDE ---
            const customRes = await fetch(`projects/${folder}/custom.html?t=${Date.now()}`);
            if (customRes.ok) {
                const customHtml = await customRes.text();

                // Inject custom content, completely replacing the default template inside <main>
                mainContainer.innerHTML = customHtml;
                bindHover(); // Re-bind hover for the new elements

                return; // Exit early, we rely entirely on custom page structure
            }

            // --- 2. LOAD DEFAULT FLAT-FILE DATA ---
            const res = await fetch(`projects/${folder}/info.txt?t=${Date.now()}`);
            if (!res.ok) throw new Error("File missing");
            const text = await res.text();

            const meta = {};
            const descLines = [];
            let inDesc = false;

            text.split('\n').forEach(line => {
                if (line.startsWith('DESCRIPTION:')) {
                    inDesc = true;
                    descLines.push(line.replace('DESCRIPTION:', '').trim());
                } else if (inDesc && !line.includes(':')) {
                    // Continuation of description
                    descLines.push(line.trim());
                } else {
                    inDesc = false;
                    const parts = line.split(':');
                    if (parts.length >= 2) meta[parts[0].trim()] = parts.slice(1).join(':').trim();
                }
            });

            // Populate text fields
            if (meta.NAME) document.getElementById('p-name').innerText = meta.NAME;
            if (meta.ID) document.getElementById('p-id').innerText = meta.ID;
            if (meta.LOCATION) document.getElementById('p-loc').innerText = meta.LOCATION;
            if (meta.YEAR) document.getElementById('p-year').innerText = meta.YEAR;
            if (meta.TYPE) document.getElementById('p-status').innerText = meta.TYPE;

            if (descLines.length > 0) {
                document.getElementById('p-desc').innerHTML = descLines.join('<br><br>');
            } else {
                document.getElementById('p-desc').innerText = "---";
            }

            // Check mode styling based on category
            if (meta.CATEGORY === 'arch') {
                if (lockLogoState) lockLogoState('AMMONITE', 'ARCHITECTURE');
            } else if (meta.CATEGORY === 'design' || meta.CATEGORY === 'photo' || meta.CATEGORY === 'research') {
                if (lockLogoState) lockLogoState('AMMO', 'DESIGN');
            }

            const gallery = document.getElementById('p-gallery');

            // Image generation logic
            const rawImages = meta.IMAGES || "1";
            let imageFiles = [];

            if (rawImages.includes(',') || rawImages.includes('.')) {
                imageFiles = rawImages.split(',').map(s => s.trim());
            } else {
                const count = parseInt(rawImages) || 1;
                for (let i = 1; i <= count; i++) {
                    imageFiles.push(`${i}.jpg`);
                }
            }

            // Set the main image 
            if (imageFiles.length > 0) {
                // If the layout has a main image holder, we'd set it. Here we just append all to gallery sequentially.
                imageFiles.forEach(img => {
                    const el = document.createElement('img');
                    el.src = `projects/${folder}/${img}`;
                    el.loading = "lazy";
                    gallery.appendChild(el);
                });
            }

        } catch (e) {
            console.error("Error loading project info: ", e);
            if (defaultTemplate) defaultTemplate.innerHTML = "<h1 style='padding: 40px;'>PROJECT DATA UNAVAILABLE</h1>";
        }
    }

    loadProject();

});
