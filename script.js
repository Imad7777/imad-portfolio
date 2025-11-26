// Main Application Logic
// This script runs after constants.js, so it has access to PROFILE, PROJECTS, etc.

document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

function initApp() {
    renderNavbar();
    renderHero();
    renderPortfolio();
    renderAbout();
    renderContact();
    
    // Initialize Icons
    lucide.createIcons();

    // Scroll Effect for Navbar
    window.addEventListener('scroll', () => {
        const nav = document.getElementById('navbar');
        if (window.scrollY > 20) {
            nav.classList.add('bg-white/90', 'backdrop-blur-md', 'shadow-sm', 'border-b', 'border-gray-100');
            nav.classList.remove('bg-transparent');
        } else {
            nav.classList.remove('bg-white/90', 'backdrop-blur-md', 'shadow-sm', 'border-b', 'border-gray-100');
            nav.classList.add('bg-transparent');
        }
    });
}

function renderNavbar() {
    document.getElementById('nav-logo').textContent = PROFILE.name.toUpperCase();
    
    const linksContainer = document.getElementById('desktop-menu');
    const mobileLinksContainer = document.getElementById('mobile-menu-links');
    
    NAV_LINKS.forEach(link => {
        // Desktop
        const a = document.createElement('a');
        a.href = link.href;
        a.textContent = link.label;
        a.className = "text-sm font-medium text-secondary hover:text-primary transition-colors";
        linksContainer.appendChild(a);

        // Mobile
        const ma = document.createElement('a');
        ma.href = link.href;
        ma.textContent = link.label;
        ma.className = "block px-3 py-4 rounded-md text-base font-medium text-primary hover:bg-gray-50 text-center";
        ma.addEventListener('click', () => {
             document.getElementById('mobile-menu').classList.add('hidden');
        });
        mobileLinksContainer.appendChild(ma);
    });

    // Mobile Menu Toggle
    const btn = document.getElementById('mobile-menu-btn');
    const menu = document.getElementById('mobile-menu');
    btn.addEventListener('click', () => {
        menu.classList.toggle('hidden');
    });
}

function renderHero() {
    document.getElementById('hero-role').textContent = PROFILE.role;
    document.getElementById('hero-tagline').textContent = PROFILE.tagline;
    document.getElementById('hero-bio').textContent = PROFILE.bio;
}

function renderPortfolio() {
    const grid = document.getElementById('projects-grid');
    const filterContainer = document.getElementById('portfolio-filters');
    const categories = ['All', ...new Set(PROJECTS.map(p => p.category))];
    let activeCategory = 'All';

    // Render Filters
    categories.forEach(cat => {
        const btn = document.createElement('button');
        btn.textContent = cat;
        btn.className = `px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${cat === activeCategory ? 'bg-primary text-white shadow-lg' : 'bg-white text-secondary hover:bg-gray-100'}`;
        
        btn.addEventListener('click', () => {
            activeCategory = cat;
            // Update buttons style
            Array.from(filterContainer.children).forEach(b => {
                if (b.textContent === activeCategory) {
                    b.className = 'px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 bg-primary text-white shadow-lg';
                } else {
                    b.className = 'px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 bg-white text-secondary hover:bg-gray-100';
                }
            });
            renderProjects(activeCategory);
        });
        filterContainer.appendChild(btn);
    });

    // Render Projects Function
    function renderProjects(category) {
        grid.innerHTML = '';
        const filtered = category === 'All' ? PROJECTS : PROJECTS.filter(p => p.category === category);
        
        if (filtered.length === 0) {
            grid.innerHTML = '<div class="col-span-full text-center py-20 text-secondary">No projects found in this category.</div>';
            return;
        }

        filtered.forEach(project => {
            const card = document.createElement('a');
            card.href = project.link || '#';
            card.className = "group block h-full project-card";
            card.innerHTML = `
                <div class="relative overflow-hidden rounded-2xl bg-white shadow-sm hover:shadow-xl transition-all duration-500 h-full flex flex-col">
                    <div class="aspect-[4/3] overflow-hidden bg-gray-200">
                        <img src="${project.imageUrl}" alt="${project.title}" loading="lazy" class="project-image w-full h-full object-cover transition-transform duration-700">
                    </div>
                    <div class="p-6 flex-1 flex flex-col relative">
                        <div class="flex justify-between items-start mb-2">
                            <div>
                                <span class="text-xs font-semibold tracking-wider text-accent uppercase mb-2 block">${project.category}</span>
                                <h3 class="text-xl font-bold text-primary group-hover:text-accent transition-colors">${project.title}</h3>
                            </div>
                            <div class="arrow-icon bg-primary text-white p-2 rounded-full opacity-0 transform translate-y-4 transition-all duration-300">
                                <i data-lucide="arrow-up-right" class="w-4 h-4"></i>
                            </div>
                        </div>
                        <p class="text-sm text-secondary leading-relaxed mt-2">${project.description}</p>
                    </div>
                </div>
            `;
            grid.appendChild(card);
        });
        lucide.createIcons(); // Refresh icons for new elements
    }

    // Initial Render
    renderProjects('All');
}

function renderAbout() {
    const textContainer = document.getElementById('about-text');
    textContainer.innerHTML = `
        <p>I'm a ${PROFILE.role} based in ${PROFILE.location}. ${PROFILE.bio}</p>
        <p>Currently, I am ${PROFILE.availability.toLowerCase()}. I'm always excited to collaborate with individuals and companies who share a passion for creating exceptional digital experiences.</p>
        <p>When I'm not designing, you can find me exploring new coffee shops, hiking in nature, or experimenting with new technologies.</p>
    `;

    const skillsContainer = document.getElementById('skills-container');
    SKILLS.forEach(group => {
        const div = document.createElement('div');
        div.innerHTML = `
            <h4 class="text-sm font-bold text-accent uppercase tracking-wider mb-4">${group.category}</h4>
            <div class="flex flex-wrap gap-3">
                ${group.items.map(item => `<span class="px-4 py-2 bg-white text-primary text-sm font-medium rounded-lg shadow-sm border border-gray-100">${item}</span>`).join('')}
            </div>
        `;
        skillsContainer.appendChild(div);
    });
}

function renderContact() {
    document.getElementById('contact-email').href = `mailto:${PROFILE.email}`;
    document.getElementById('contact-email').textContent = PROFILE.email;
    document.getElementById('contact-location').textContent = PROFILE.location;
    document.getElementById('copyright').innerHTML = `&copy; ${new Date().getFullYear()} ${PROFILE.name}. All rights reserved.`;

    const socialContainer = document.getElementById('social-links');
    SOCIAL_LINKS.forEach(link => {
        const a = document.createElement('a');
        a.href = link.url;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.className = "w-14 h-14 bg-white/10 rounded-full flex items-center justify-center hover:bg-accent hover:text-white transition-all duration-300";
        a.innerHTML = `<i data-lucide="${link.icon}" class="w-6 h-6"></i>`;
        socialContainer.appendChild(a);
    });
}