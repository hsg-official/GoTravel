window.addEventListener('load', () => {
            setTimeout(() => {
                document.getElementById('intro-screen').classList.add('slide-left');
                document.getElementById('home-screen').style.opacity = '1';
                setTimeout(() => { document.getElementById('hero').style.opacity = '1'; }, 500);
                initWeather();
            }, 3000);
        });

        function toggleTransport(card) {
            const menu = document.getElementById('transportMenu');
            menu.classList.toggle('active');
            const close = (e) => { 
                if (!card.contains(e.target)) { 
                    menu.classList.remove('active'); 
                    document.removeEventListener('mousedown', close); 
                } 
            };
            document.addEventListener('mousedown', close);
        }

        function startClock() {
            const now = new Date();
            document.getElementById('time').innerText = now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: false});
            document.getElementById('date').innerText = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }
        setInterval(startClock, 1000);
        startClock();

        const canvas = document.getElementById('weather-canvas');
        const ctx = canvas.getContext('2d');
        let particles = [];

        function initCanvas() {
            canvas.width = canvas.parentElement.offsetWidth;
            canvas.height = canvas.parentElement.offsetHeight;
        }

        function createWeatherParticles(type) {
            particles = [];
            const count = type === 'rain' ? 30 : 15;
            for(let i=0; i<count; i++) {
                particles.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    speed: type === 'rain' ? 4 + Math.random() * 4 : 0.5 + Math.random(),
                    size: type === 'rain' ? 1 : 2 + Math.random() * 2,
                    opacity: Math.random()
                });
            }
        }

        function drawWeather(type) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = type === 'rain' ? '#ffffff' : '#FFD60A';
            particles.forEach(p => {
                ctx.globalAlpha = p.opacity;
                ctx.beginPath();
                if(type === 'rain') ctx.rect(p.x, p.y, 1, 10);
                else ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
                p.y += p.speed;
                if(p.y > canvas.height) p.y = -10;
            });
            requestAnimationFrame(() => drawWeather(type));
        }

        async function initWeather() {
            initCanvas();
            if ("geolocation" in navigator) {
                navigator.geolocation.getCurrentPosition(async (pos) => {
                    try {
                        const { latitude, longitude } = pos.coords;
                        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`);
                        const data = await res.json();
                        const geo = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
                        const geoData = await geo.json();
                        
                        // Location Logic
                        const addr = geoData.address;
                        const finalLocation = addr.city || addr.town || addr.village || addr.suburb || "Nearby";
                        
                        document.getElementById('temp').innerText = `${Math.round(data.current_weather.temperature)}°C`;
                        document.getElementById('location-name').innerText = finalLocation;
                        
                        const type = data.current_weather.weathercode > 50 ? 'rain' : 'sun';
                        document.getElementById('w-icon').className = type === 'rain' ? "fas fa-cloud-showers-heavy" : "fas fa-sun";
                        createWeatherParticles(type);
                        drawWeather(type);
                    } catch (e) { console.log("Weather error"); }
                });
            }
        }

        const myImages = ['https://images.pexels.com/photos/35606862/pexels-photo-35606862.jpeg','https://images.pexels.com/photos/322437/pexels-photo-322437.jpeg','https://images.pexels.com/photos/1998434/pexels-photo-1998434.jpeg'];
        let currentIdx = 0;
        const layers = [document.getElementById('bg1'), document.getElementById('bg2')];
        let activeLayerIdx = 0;
        function updateSlider() {
            const nextIdx = (currentIdx + 1) % myImages.length;
            const nextLayerIdx = (activeLayerIdx + 1) % 2;
            layers[nextLayerIdx].style.backgroundImage = `url('${myImages[nextIdx]}')`;
            setTimeout(() => { layers[activeLayerIdx].classList.remove('active'); layers[nextLayerIdx].classList.add('active'); activeLayerIdx = nextLayerIdx; currentIdx = nextIdx; }, 50); 
        }
        layers[0].style.backgroundImage = `url('${myImages[0]}')`;
        setInterval(updateSlider, 6000);