document.addEventListener('DOMContentLoaded', () => {

    /* --- CURSOR LOGIC --- */
    const cursor = document.getElementById('cursor');
    const hoverTriggers = document.querySelectorAll('a, button, .hover-trig');

    document.addEventListener('mousemove', (e) => {
        if (cursor) {
            cursor.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
        }
    });

    hoverTriggers.forEach(trigger => {
        trigger.addEventListener('mouseenter', () => { if (cursor) cursor.classList.add('hovered'); });
        trigger.addEventListener('mouseleave', () => { if (cursor) cursor.classList.remove('hovered'); });
    });

    /* --- AMMONITE <-> AMMO SCRAMBLE LOGIC --- */
    const logoEl = document.getElementById('logo-text');
    const modeEl = document.getElementById('mode-text');
    let logoScrambleInterval = null;
    let modeScrambleInterval = null;
    let mainLoopInterval = null;
    let isAmmonite = true;
    const chars = '!<>-/_[]{}01*';
    const totalScrambleFrames = 18;

    function scrambleText(el, target, onComplete = null) {
        if (!el) return null;
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

    function startScrambleCycle() {
        if (mainLoopInterval) clearInterval(mainLoopInterval);
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

    function lockLogoState(targetLogo, targetMode) {
        if (mainLoopInterval) {
            clearInterval(mainLoopInterval);
            mainLoopInterval = null;
        }
        if (logoScrambleInterval) clearInterval(logoScrambleInterval);
        if (modeScrambleInterval) clearInterval(modeScrambleInterval);
        
        if (logoEl) scrambleText(logoEl, targetLogo, () => { logoEl.innerText = targetLogo; });
        if (modeEl) scrambleText(modeEl, targetMode, () => { modeEl.innerText = targetMode; });
    }

    if ((logoEl || modeEl) && !document.body.classList.contains('arch-mode') && !document.body.classList.contains('design-mode')) {
        startScrambleCycle();
    }


    /* --- MODE SWITCHING & FILTERING --- */
    const typeButtons = document.querySelectorAll('.mode-btn');
    typeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const cat = btn.getAttribute('data-category');

            // Toggle filter on/off. If active, turn off.
            if (btn.classList.contains('active')) {
                btn.classList.remove('active');
                document.body.classList.remove('design-mode');
                document.body.classList.remove('arch-mode');
                startScrambleCycle();
            } else {
                typeButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                if (cat === 'arch') {
                    document.body.classList.remove('design-mode');
                    document.body.classList.add('arch-mode');
                    lockLogoState('AMMONITE');
                } else if (cat === 'design') {
                    document.body.classList.remove('arch-mode');
                    document.body.classList.add('design-mode');
                    lockLogoState('AMMO');
                }
            }

            rebindHover();
        });
    });

    // Mode text click cycles through modes
    if (modeEl) {
        modeEl.addEventListener('click', (e) => {
            e.preventDefault();
            const isArch = document.body.classList.contains('arch-mode');
            const isDesign = document.body.classList.contains('design-mode');

            if (!isArch && !isDesign) {
                // Default -> Arch Mode
                document.body.classList.add('arch-mode');
                lockLogoState('AMMONITE', 'ARCHITECTURE');
                if (globalProjectsCache && globalProjectsCache.length > 0) {
                    renderProjects(globalProjectsCache.filter(p => {
                        const cat = (p.CATEGORY || 'arch').toLowerCase();
                        return cat.includes('arch');
                    }));
                }
            } else if (isArch) {
                // Arch Mode -> Design Mode
                document.body.classList.remove('arch-mode');
                document.body.classList.add('design-mode');
                lockLogoState('AMMO', 'DESIGN');
                if (globalProjectsCache && globalProjectsCache.length > 0) {
                    renderProjects(globalProjectsCache.filter(p => {
                        const cat = (p.CATEGORY || 'arch').toLowerCase();
                        return cat.includes('design') || cat.includes('photo') || cat.includes('art') || cat.includes('research');
                    }));
                }
            } else {
                // Design Mode -> Default
                document.body.classList.remove('design-mode');
                startScrambleCycle();
                if (globalProjectsCache && globalProjectsCache.length > 0) {
                    renderProjects(globalProjectsCache);
                }
            }
        });
    }

    /* --- PROJECT FETCHING LOGIC --- */
    const projectsContainer = document.getElementById('projects-container');
    const sharedPreview = document.getElementById('shared-preview');
    let swiperInstance = null;
    let globalProjectsCache = [];

    async function loadProjects() {
        const projectFolders = window.AMMONITE_PROJECTS || [];
        let projects = [];

        for (const folder of projectFolders) {
            try {
                const res = await fetch(`projects/${folder}/info.txt?t=${Date.now()}`);
                if (!res.ok) continue;
                const text = await res.text();

                const meta = { FOLDER: folder };
                text.split('\n').forEach(line => {
                    const parts = line.split(':');
                    if (parts.length >= 2) meta[parts[0].trim()] = parts.slice(1).join(':').trim();
                });

                // Parse thumbnail
                const rawImages = meta.IMAGES || "1";
                if (rawImages.includes(',') || rawImages.includes('.')) {
                    meta.IMG_MAIN = meta.IMAGES.split(',')[0].trim();
                } else {
                    meta.IMG_MAIN = '1.jpg';
                }

                projects.push(meta);

            } catch (e) { console.error("Error loading project: ", folder, e); }
        }

        globalProjectsCache = projects;
        renderProjects(projects);
    }

    function renderProjects(projects) {
        if (!projectsContainer) return;

        // Destroy Swiper cleanly BEFORE removing DOM elements
        if (swiperInstance) {
            swiperInstance.destroy(true, true);
            swiperInstance = null;
        }

        projectsContainer.innerHTML = '';

        // Sort descending by YEAR then ID
        projects.sort((a, b) => (b.YEAR || '0000').localeCompare(a.YEAR || '0000'));

        const preloadCache = [];

        projects.forEach((p, index) => {
            const catClass = p.CATEGORY ? `category-${p.CATEGORY.toLowerCase()}` : 'category-arch';
            const imgPath = p.IMG_MAIN ? `projects/${p.FOLDER}/${p.IMG_MAIN}` : '';

            // Preload image to prevent white flash
            if (imgPath) {
                const img = new Image();
                img.src = imgPath;
                preloadCache.push(img);
            }

            // Assign a fake ID if missing since they don't seem to have one in info.txt
            const pId = p.ID || `AMM-${(index + 1).toString().padStart(2, '0')}`;

            // Layout
            const html = `
                <div class="project-row-container ${catClass} swiper-slide" data-img="${imgPath}">
                    <a href="project.html?p=${p.FOLDER}" class="row" style="color: inherit;">
                        <div class="col-name inter bold">${p.NAME || 'UNTITLED'}</div>
                        <div class="info-row mono">
                            <span class="col-id hide-mobile">${pId}</span>
                            <span class="col-meta">${p.LOCATION || '---'}</span>
                            <span class="col-meta hide-mobile">${p.YEAR || '---'}</span>
                            <span class="col-meta hide-mobile">${p.TYPE || '---'}</span>
                        </div>
                    </a>
                </div>
            `;

            projectsContainer.insertAdjacentHTML('beforeend', html);
        });

        rebindEvents();
    }


    /* --- ROW INTERACTIONS (PREVIEW HOVER & SCROLL SYNC) --- */
    function rebindEvents() {
        const rows = document.querySelectorAll('.project-row-container');

        const swiperContainer = document.getElementById('mobile-swiper-container');

        if (typeof Swiper !== 'undefined') {
            // Apply Swiper classes dynamically
            if (swiperContainer && projectsContainer) {
                swiperContainer.classList.add('swiper');
                projectsContainer.classList.add('swiper-wrapper');
            }

            // Initialize Swiper for infinite scrolling
            swiperInstance = new Swiper('#mobile-swiper-container', {
                direction: 'vertical',
                loop: true,
                mousewheel: true, // Allow scrolling with mouse wheel on desktop
                centeredSlides: true, 
                slidesPerView: 'auto', // Allow elements above and below to peek
                speed: 600, // Smooth transition speed
                on: {
                    slideChangeTransitionStart: function () {
                        // Regular loop triggers on active index
                        const activeSlide = this.slides[this.activeIndex];
                        if (activeSlide) {
                            const imgPath = activeSlide.getAttribute('data-img');
                            if (imgPath && sharedPreview) {
                                sharedPreview.style.backgroundImage = `url('${imgPath}')`;
                            }
                        }
                    },
                    init: function () {
                        // Set initial background image
                        const activeSlide = this.slides[this.activeIndex];
                        if (activeSlide) {
                            const imgPath = activeSlide.getAttribute('data-img');
                            if (imgPath && sharedPreview) {
                                sharedPreview.style.backgroundImage = `url('${imgPath}')`;
                            }
                        }
                    }
                }
            });
        }

        rebindHover();
    }

    function rebindHover() {
        if (!cursor) return;
        const hoverTriggers = document.querySelectorAll('.project-row-container, a, button');
        hoverTriggers.forEach(t => {
            t.removeEventListener('mouseenter', hoverIn);
            t.removeEventListener('mouseleave', hoverOut);

            t.addEventListener('mouseenter', hoverIn);
            t.addEventListener('mouseleave', hoverOut);
        });
    }

    function hoverIn() { if (cursor) cursor.classList.add('hovered'); }
    function hoverOut() { if (cursor) cursor.classList.remove('hovered'); }

    // INIT
    if (projectsContainer) loadProjects();

});
