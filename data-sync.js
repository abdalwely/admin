// Data synchronization between Firebase and main website
import { db } from './firebase-config.js';
import { collection, getDocs, query, orderBy, doc, getDoc } from 'firebase/firestore';

// Sync data from Firebase to main website
export async function syncDataToWebsite() {
    try {
        // Get data from Firebase
        const [teamData, projectsData, servicesData, settingsData, designData, titlesData] = await Promise.all([
            getTeamData(),
            getProjectsData(),
            getServicesData(),
            getSettingsData(),
            getDesignData(),
            getTitlesData()
        ]);
        
        // Update main website
        updateMainWebsite(teamData, projectsData, servicesData, settingsData, designData, titlesData);
        
        console.log('Data synced successfully');
    } catch (error) {
        console.error('Error syncing data:', error);
    }
}

async function getTeamData() {
    const q = query(collection(db, 'team'), orderBy('name'));
    const querySnapshot = await getDocs(q);
    const teamMembers = [];
    
    querySnapshot.forEach((doc) => {
        teamMembers.push({ id: doc.id, ...doc.data() });
    });
    
    return teamMembers;
}

async function getProjectsData() {
    const q = query(collection(db, 'projects'), orderBy('name'));
    const querySnapshot = await getDocs(q);
    const projects = [];
    
    querySnapshot.forEach((doc) => {
        projects.push({ id: doc.id, ...doc.data() });
    });
    
    return projects;
}

async function getServicesData() {
    const q = query(collection(db, 'services'), orderBy('name'));
    const querySnapshot = await getDocs(q);
    const services = [];
    
    querySnapshot.forEach((doc) => {
        services.push({ id: doc.id, ...doc.data() });
    });
    
    return services;
}

async function getSettingsData() {
    try {
        const docRef = doc(db, 'settings', 'site');
        const docSnap = await getDoc(docRef);
        return docSnap.exists() ? docSnap.data() : {};
    } catch (error) {
        console.error('Error getting settings:', error);
        return {};
    }
}

async function getDesignData() {
    try {
        const docRef = doc(db, 'settings', 'design');
        const docSnap = await getDoc(docRef);
        return docSnap.exists() ? docSnap.data() : {};
    } catch (error) {
        console.error('Error getting design settings:', error);
        return {};
    }
}

async function getTitlesData() {
    try {
        const docRef = doc(db, 'settings', 'titles');
        const docSnap = await getDoc(docRef);
        return docSnap.exists() ? docSnap.data() : {};
    } catch (error) {
        console.error('Error getting titles:', error);
        return {};
    }
}

function updateMainWebsite(teamData, projectsData, servicesData, settingsData, designData, titlesData) {
    // Update team section
    updateTeamSection(teamData);
    
    // Update projects section
    updateProjectsSection(projectsData);
    
    // Update services section
    updateServicesSection(servicesData);
    
    // Update settings
    updateSiteSettings(settingsData);
    
    // Update design
    updateSiteDesign(designData);
    
    // Update titles
    updateSiteTitles(titlesData);
}

function updateTeamSection(teamData) {
    const teamGrid = document.querySelector('#team .team-grid');
    if (!teamGrid) return;
    
    teamGrid.innerHTML = teamData.map(member => `
        <div class="team-card" data-aos="zoom-in" data-aos-delay="100">
            <div class="team-image">
                <img src="${member.image}" alt="${member.name}">
                <div class="team-overlay">
                    <div class="social-links">
                        ${member.linkedin ? `<a href="${member.linkedin}" class="social-link"><i class="fab fa-linkedin"></i></a>` : ''}
                        ${member.github ? `<a href="${member.github}" class="social-link"><i class="fab fa-github"></i></a>` : ''}
                        <a href="#" class="social-link"><i class="fab fa-twitter"></i></a>
                    </div>
                </div>
            </div>
            <div class="team-info">
                <h3>${member.name}</h3>
                <p class="role">${member.role}</p>
                <p class="description">${member.description}</p>
                ${member.skills ? `
                    <div class="team-skills">
                        ${member.skills.split(',').map(skill => 
                            `<span>${skill.trim()}</span>`
                        ).join('')}
                    </div>
                ` : ''}
            </div>
        </div>
    `).join('');
}

function updateProjectsSection(projectsData) {
    const projectsGrid = document.querySelector('#projects .projects-grid');
    if (!projectsGrid) return;
    
    projectsGrid.innerHTML = projectsData.map(project => `
        <div class="project-card" data-category="${project.category}" data-aos="fade-up" data-aos-delay="100">
            <div class="project-image">
                <img src="${project.image}" alt="${project.name}">
                <div class="project-overlay">
                    <div class="project-actions">
                        ${project.demoUrl ? `<a href="${project.demoUrl}" class="btn btn-small" target="_blank">معاينة</a>` : ''}
                        ${project.githubUrl ? `<a href="${project.githubUrl}" class="btn btn-small btn-outline" target="_blank">GitHub</a>` : ''}
                    </div>
                </div>
            </div>
            <div class="project-info">
                <div class="project-category">${getCategoryName(project.category)}</div>
                <h3>${project.name}</h3>
                <p>${project.description}</p>
                ${project.technologies ? `
                    <div class="project-tech">
                        ${project.technologies.split(',').map(tech => 
                            `<span class="tech-tag">${tech.trim()}</span>`
                        ).join('')}
                    </div>
                ` : ''}
            </div>
        </div>
    `).join('');
}

function updateServicesSection(servicesData) {
    const servicesGrid = document.querySelector('#services .services-grid');
    if (!servicesGrid) return;
    
    servicesGrid.innerHTML = servicesData.map(service => `
        <div class="service-card" data-aos="fade-up" data-aos-delay="100">
            <div class="service-icon">
                <i class="${service.icon}"></i>
            </div>
            <h3>${service.name}</h3>
            <p>${service.description}</p>
            ${service.features ? `
                <div class="service-features">
                    ${service.features.split(',').map(feature => 
                        `<span>${feature.trim()}</span>`
                    ).join('')}
                </div>
            ` : ''}
        </div>
    `).join('');
}

function getCategoryName(category) {
    const categories = {
        web: 'مواقع إلكترونية',
        mobile: 'تطبيقات موبايل',
        ai: 'ذكاء اصطناعي',
        other: 'أخرى'
    };
    return categories[category] || category;
}

function updateSiteSettings(settingsData) {
    if (!settingsData) return;
    
    // Update hero section
    const heroTitle = document.querySelector('.hero-title');
    const heroSubtitle = document.querySelector('.hero-subtitle');
    
    if (heroTitle && settingsData.heroTitle) {
        heroTitle.innerHTML = settingsData.heroTitle.replace('DevMasters Team', '<span class="highlight">DevMasters Team</span>');
    }
    
    if (heroSubtitle && settingsData.heroSubtitle) {
        heroSubtitle.textContent = settingsData.heroSubtitle;
    }
    
    // Update contact information
    const contactEmail = document.querySelector('.contact-item p');
    const contactPhone = document.querySelectorAll('.contact-item p')[1];
    
    if (contactEmail && settingsData.contactEmail) {
        contactEmail.textContent = settingsData.contactEmail;
    }
    
    if (contactPhone && settingsData.contactPhone) {
        contactPhone.textContent = settingsData.contactPhone;
    }
    
    // Update footer
    const footerDescription = document.querySelector('.footer-brand p');
    if (footerDescription && settingsData.siteDescription) {
        footerDescription.textContent = settingsData.siteDescription;
    }
}

function updateSiteDesign(designData) {
    if (!designData) return;
    
    const root = document.documentElement;
    
    if (designData.primaryColor) {
        root.style.setProperty('--primary-color', designData.primaryColor);
        // Update all primary color references
        updateColorReferences('.btn-primary, .nav-brand, .section-title', 'background', designData.primaryColor);
    }
    
    if (designData.secondaryColor) {
        root.style.setProperty('--secondary-color', designData.secondaryColor);
    }
    
    if (designData.accentColor) {
        root.style.setProperty('--accent-color', designData.accentColor);
        updateColorReferences('.highlight, .stat-number', 'color', designData.accentColor);
    }
    
    if (designData.backgroundColor) {
        root.style.setProperty('--background-color', designData.backgroundColor);
        document.body.style.backgroundColor = designData.backgroundColor;
    }
    
    if (designData.fontFamily) {
        document.body.style.fontFamily = `'${designData.fontFamily}', sans-serif`;
        
        // Load font if not already loaded
        if (!document.querySelector(`link[href*="${designData.fontFamily}"]`)) {
            const link = document.createElement('link');
            link.href = `https://fonts.googleapis.com/css2?family=${designData.fontFamily.replace(' ', '+')}:wght@300;400;600;700&display=swap`;
            link.rel = 'stylesheet';
            document.head.appendChild(link);
        }
    }
}

function updateColorReferences(selector, property, color) {
    const elements = document.querySelectorAll(selector);
    elements.forEach(element => {
        if (property === 'background') {
            element.style.background = color;
        } else {
            element.style[property] = color;
        }
    });
}

function updateSiteTitles(titlesData) {
    if (!titlesData) return;
    
    const titleMappings = {
        aboutTitle: '#about .section-title',
        servicesTitle: '#services .section-title',
        teamTitle: '#team .section-title',
        projectsTitle: '#projects .section-title',
        whyUsTitle: '#why-us .section-title',
        contactTitle: '#contact .section-title'
    };
    
    Object.keys(titleMappings).forEach(key => {
        if (titlesData[key]) {
            const element = document.querySelector(titleMappings[key]);
            if (element) {
                element.textContent = titlesData[key];
            }
        }
    });
}

// Listen for messages from admin panel
window.addEventListener('message', (event) => {
    if (event.data.type === 'designUpdate') {
        updateSiteDesign(event.data.data);
    } else if (event.data.type === 'settingsUpdate') {
        updateSiteSettings(event.data.data);
    } else if (event.data.type === 'titlesUpdate') {
        updateSiteTitles(event.data.data);
    }
});
// Auto-sync every 30 seconds when on main website
if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
    setInterval(syncDataToWebsite, 30000);
    
    // Initial sync
    document.addEventListener('DOMContentLoaded', syncDataToWebsite);
}