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

    if (logoEl) {
        const chars = '!<>-/_[]{}01*';
        const totalScrambleFrames = 18;
        let isAmmonite = true;

        function scrambleText(target) {
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
                }
                frame++;
            }, 70);
        }

        mainLoopInterval = setInterval(() => {
            isAmmonite = !isAmmonite;
            scrambleText(isAmmonite ? 'AMMONITE' : 'AMMO');
        }, 4000);
    }

    /* --- DATA FETCHING --- */
    async function loadData() {
        try {
            const res = await fetch('info/data.txt?t=' + new Date().getTime());
            if (!res.ok) throw new Error("Data file offline");

            const text = await res.text();
            const data = {};

            let currentKey = null;

            // Build key-value from the text file safely parsing multi-line
            text.split('\n').forEach(line => {
                const trimmed = line.trim();
                if (trimmed.startsWith('//')) return;
                // Avoid matching 'http://' or 'https://' as keys
                if (line.includes(':') && !line.startsWith('http')) {
                    const parts = line.split(':');
                    currentKey = parts[0].trim();
                    data[currentKey] = parts.slice(1).join(':').trim();
                } else if (currentKey && trimmed !== '') {
                    data[currentKey] += '<br>' + trimmed;
                }
            });

            // Populate About/Studio Info
            if (data.ABOUT) {
                document.getElementById('about-text').innerHTML = data.ABOUT;
            } else {
                document.getElementById('about-text').innerHTML = "MANIFESTO DATA UNAVAILABLE.";
            }

            // Addresses
            document.getElementById('c-hq1-title').innerHTML = "HQ-01";
            if (data.HQ_1_BODY) document.getElementById('c-hq1-body').innerHTML = data.HQ_1_BODY;

            document.getElementById('c-hq2-title').innerHTML = "HQ-02";
            if (data.HQ_2_BODY) document.getElementById('c-hq2-body').innerHTML = data.HQ_2_BODY;

            // Social/Contact
            if (data.EMAIL) {
                const e = document.getElementById('c-email');
                e.innerText = data.EMAIL.toUpperCase();
                e.href = `mailto:${data.EMAIL}`;
            }

            if (data.INSTAGRAM_LINK) {
                const is = document.getElementById('c-insta');
                is.innerText = "INSTAGRAM";
                is.href = data.INSTAGRAM_LINK;
                is.target = "_blank";
            }

            // Image setup
            // Use local fallback if explicit name isn't set in text file
            const imgEl = document.getElementById('about-img');
            if (data.ABOUT_IMG) {
                imgEl.src = 'info/' + data.ABOUT_IMG;
            } else {
                imgEl.src = 'info/1.jpg';
            }

        } catch (e) {
            console.error("Data error", e);
            document.getElementById('about-text').innerHTML = "COULD NOT LOAD INFO.";
        }
    }

    loadData();

});
