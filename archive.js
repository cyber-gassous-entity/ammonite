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
    let scrambleInterval = null;
    let mainLoopInterval = null;
    let isAmmonite = true;
    const chars = '!<>-/_[]{}01*';
    const totalScrambleFrames = 18;

    function scrambleText(target, onComplete = null) {
        if (!logoEl) return;
        let frame = 0;
        if (scrambleInterval) clearInterval(scrambleInterval);

        scrambleInterval = setInterval(() => {
            logoEl.innerText = target.split("").map((letter, index) => {
                const settleFrame = (index + 1) * (totalScrambleFrames / target.length);
                if (frame > settleFrame) return target[index];
                return chars[Math.floor(Math.random() * chars.length)];
            }).join("");

            if (frame >= totalScrambleFrames) {
                clearInterval(scrambleInterval);
                logoEl.innerText = target;
                if (onComplete) onComplete();
            }
            frame++;
        }, 70);
    }

    function startScrambleCycle() {
        if (mainLoopInterval) clearInterval(mainLoopInterval);
        mainLoopInterval = setInterval(() => {
            isAmmonite = !isAmmonite;
            scrambleText(isAmmonite ? 'AMMONITE' : 'AMMO');
        }, 4000);
    }

    function lockLogoState(target) {
        if (mainLoopInterval) {
            clearInterval(mainLoopInterval);
            mainLoopInterval = null;
        }
        if (scrambleInterval) {
            clearInterval(scrambleInterval);
            scrambleInterval = null;
        }
        // Force text directly after final tiny scramble to guarantee it isn't overridden
        scrambleText(target, () => {
            logoEl.innerText = target;
        });
    }

    if (logoEl && !document.body.classList.contains('arch-mode') && !document.body.classList.contains('design-mode')) {
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

    // Logo click resets everything
    if (logoEl) {
        logoEl.addEventListener('click', (e) => {
            const hasMode = document.body.classList.contains('arch-mode') || document.body.classList.contains('design-mode');
            if (hasMode) {
                e.preventDefault();
                typeButtons.forEach(b => b.classList.remove('active'));
                document.body.classList.remove('arch-mode');
                document.body.classList.remove('design-mode');
                startScrambleCycle();
            }
        });
    }

    /* --- PROJECT FETCHING LOGIC --- */
    const projectsContainer = document.getElementById('projects-container');
    const sharedPreview = document.getElementById('shared-preview');
    let swiperInstance = null;
    let mobileObserver = null;
    const isMobile = window.innerWidth <= 768;

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

        renderProjects(projects);
    }

    function renderProjects(projects) {
        if (!projectsContainer) return;
        projectsContainer.innerHTML = '';

        // Sort descending by YEAR then ID
        projects.sort((a, b) => (b.YEAR || '0000').localeCompare(a.YEAR || '0000'));

        projects.forEach((p, index) => {
            const catClass = p.CATEGORY ? `category-${p.CATEGORY.toLowerCase()}` : 'category-arch';
            const imgPath = p.IMG_MAIN ? `projects/${p.FOLDER}/${p.IMG_MAIN}` : '';

            // Assign a fake ID if missing since they don't seem to have one in info.txt
            const pId = p.ID || `AMM-${(index + 1).toString().padStart(2, '0')}`;

            // Layout
            const html = `
                <div class="project-row-container ${catClass} ${isMobile ? 'swiper-slide' : ''}" data-img="${imgPath}">
                    <a href="project.html?p=${p.FOLDER}" class="row" style="display: grid; color: inherit;">
                        <div class="col-id mono">${pId}</div>
                        <div class="col-name inter bold">${p.NAME || 'UNTITLED'}</div>
                        <div class="col-meta mono">${p.LOCATION || '---'}</div>
                        <div class="col-meta mono">${p.YEAR || '---'}</div>
                        <div class="col-meta mono">${p.TYPE || '---'}</div>
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

        if (swiperInstance) {
            swiperInstance.destroy(true, true);
            swiperInstance = null;
        }

        const swiperContainer = document.getElementById('mobile-swiper-container');

        if (isMobile && typeof Swiper !== 'undefined') {
            // Apply Swiper classes dynamically only for mobile
            if (swiperContainer && projectsContainer) {
                swiperContainer.classList.add('swiper');
                projectsContainer.classList.add('swiper-wrapper');
            }

            // Initialize Swiper for mobile infinite scrolling
            swiperInstance = new Swiper('#mobile-swiper-container', {
                direction: 'vertical',
                loop: true,
                centeredSlides: false, // Start from the top
                slidesPerView: 'auto',
                speed: 600, // Slightly slower fluid speed
                touchRatio: 1.5, // Make dragging feel more responsive
                resistanceRatio: 0.65, // Add mild resistance on drag limits
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
        } else {
            // Desktop: Clean up Swiper DOM additions to prevent flexbox layouts from breaking the grid
            if (swiperContainer && projectsContainer) {
                swiperContainer.classList.remove('swiper');
                projectsContainer.classList.remove('swiper-wrapper');
            }
        }

        rows.forEach(row => {
            const imgPath = row.getAttribute('data-img');
            const innerRow = row.querySelector('.row'); // Target the actual <a> tag for hover

            if (!isMobile && imgPath && innerRow) {
                innerRow.addEventListener('mouseenter', () => {
                    sharedPreview.style.backgroundImage = `url('${imgPath}')`;
                    sharedPreview.classList.add('active');
                });

                innerRow.addEventListener('mouseleave', () => {
                    sharedPreview.classList.remove('active');
                });
            }
        });

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
