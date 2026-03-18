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


    /* --- 3D ARCHITECTURAL VIEWPORT --- */
    const container = document.getElementById('viewport');

    // Only init if viewport exists
    if (container && typeof THREE !== 'undefined') {
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0xffffff);

        // Very small Near plane (0.01) so we can be "inside" without clipping
        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.01, 5000);
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });

        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        container.appendChild(renderer.domElement);

        let points;

        function initPoints(geometry) {
            if (points) scene.remove(points);

            // Immense scale
            geometry.scale(25, 25, 25);
            geometry.center();

            const material = new THREE.PointsMaterial({
                size: 0.05,
                color: 0x000000, // Changed from BLUE to BLACK (var(--ink) logic)
                sizeAttenuation: true,
                transparent: true,
                opacity: 0.25,
                blending: THREE.NormalBlending
            });

            points = new THREE.Points(geometry, material);

            // Starting angle
            points.rotation.y = Math.PI / 1.5;
            points.rotation.x = Math.PI / 6;

            scene.add(points);
            camera.position.z = 0.5; // Inside position
        }

        // Abstract representation if load fails
        function createFallbackCloud() {
            const geo = new THREE.BufferGeometry();
            const count = 40000;
            const pos = new Float32Array(count * 3);
            for (let i = 0; i < count * 3; i += 3) {
                if (i < count * 1.5) {
                    const angle = Math.floor(Math.random() * 4) * (Math.PI / 2);
                    pos[i] = Math.cos(angle) * 45 + (Math.random() - 0.5) * 8;
                    pos[i + 1] = (Math.random() - 0.5) * 150;
                    pos[i + 2] = Math.sin(angle) * 45 + (Math.random() - 0.5) * 8;
                } else {
                    const r = Math.random() * 90;
                    const angle = Math.random() * Math.PI * 2;
                    pos[i] = Math.cos(angle) * r;
                    pos[i + 1] = Math.floor(Math.random() * 10) * 15 - 75;
                    pos[i + 2] = Math.sin(angle) * r;
                }
            }
            geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
            initPoints(geo);
        }

        let targetRotationX = Math.PI / 8;
        let targetRotationY = Math.PI / 1.5;

        // View movement based on cursor
        window.addEventListener('mousemove', (e) => {
            const mouseX = (e.clientX / window.innerWidth) - 0.5;
            const mouseY = (e.clientY / window.innerHeight) - 0.5;
            targetRotationY = (Math.PI / 1.5) + (mouseX * Math.PI * 2);
            targetRotationX = (Math.PI / 8) + (mouseY * Math.PI * 0.8);
        });

        function animate() {
            requestAnimationFrame(animate);
            if (points) {
                points.rotation.y += (targetRotationY - points.rotation.y) * 0.05;
                points.rotation.x += (targetRotationX - points.rotation.x) * 0.05;
                points.rotation.y += 0.0001; // Sambient drift
            }
            renderer.render(scene, camera);
        }
        animate();

        window.addEventListener('resize', () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        });

        // Dynamic Data Fetch
        async function loadData() {
            try {
                // cache busting
                const res = await fetch('info/data.txt?t=' + new Date().getTime());
                if (!res.ok) throw new Error("File missing");
                const text = await res.text();
                const data = {};
                let currentKey = null;

                text.split('\n').forEach(line => {
                    const trimmed = line.trim();
                    if (trimmed.startsWith('//')) return;
                    if (line.includes(':') && !line.startsWith('http')) {
                        const parts = line.split(':');
                        currentKey = parts[0].trim();
                        data[currentKey] = parts.slice(1).join(':').trim();
                    } else if (currentKey && trimmed !== '') {
                        data[currentKey] += '<br>' + trimmed;
                    }
                });

                if (data.HQ_1_BODY) document.getElementById('c-hq1-body').innerHTML = data.HQ_1_BODY.replace(/<br>/g, ', ').toUpperCase();
                if (data.HQ_2_BODY) document.getElementById('c-hq2-body').innerHTML = data.HQ_2_BODY.replace(/<br>/g, ', ').toUpperCase();
                if (data.EMAIL) {
                    const e = document.getElementById('c-email');
                    e.innerText = data.EMAIL.toUpperCase();
                    e.href = `mailto:${data.EMAIL}`;
                }

                // Cloud loading
                if (data.SCAN_FILE && typeof THREE.PLYLoader !== 'undefined') {
                    const plyLoader = new THREE.PLYLoader();
                    plyLoader.load('info/scans/' + data.SCAN_FILE, initPoints, undefined, createFallbackCloud);
                } else {
                    createFallbackCloud();
                }

            } catch (e) {
                console.log("Could not load data.txt or PLY layer", e);
                createFallbackCloud();
            }
        }

        loadData();
    }
});
