// Firebase imports
import { db } from './firebase-config.js';
import { 
    collection, 
    addDoc, 
    setDoc,
    getDocs, 
    doc, 
    updateDoc, 
    deleteDoc,
    onSnapshot,
    query,
    orderBy 
} from 'https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js';
import { 
    auth,
    storage
} from './firebase-config.js';
import { 
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged 
} from 'https://www.gstatic.com/firebasejs/10.5.0/firebase-auth.js';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'https://www.gstatic.com/firebasejs/10.5.0/firebase-storage.js';

// Global variables
let currentUser = null;
let teamMembers = [];
let projects = [];
let services = [];

// DOM Elements
const loader = document.getElementById('loader');
const loginContainer = document.getElementById('loginContainer');
const adminContainer = document.getElementById('adminContainer');
const loginForm = document.getElementById('loginForm');

// ---------------- Visits counter ----------------
const visitCountEl = document.getElementById('visitCount');
if (visitCountEl) {
    const statsRef = doc(db, 'stats', 'site');
    onSnapshot(statsRef, (snap) => {
        const data = snap.data();
        visitCountEl.textContent = data?.visits ?? 0;
    });
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    // Hide loader after 1.5 seconds
    setTimeout(() => {
        loader.style.opacity = '0';
        setTimeout(() => {
            loader.style.display = 'none';
        }, 500);
    }, 1500);

    // Check authentication state
    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUser = user;
            showAdminDashboard();
            loadData();
        } else {
            showLoginScreen();
        }
    });

    // Initialize event listeners
    initializeEventListeners();
});

// Event Listeners
function initializeEventListeners() {
    // Login form
    loginForm.addEventListener('submit', handleLogin);
    
    // Navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', handleNavigation);
    });
    
    // Sidebar toggle
    const sidebarToggle = document.getElementById('sidebarToggle');
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', toggleSidebar);
    }
    
    // Forms
    const teamFormEl = document.getElementById('teamForm');
    if (teamFormEl) teamFormEl.addEventListener('submit', handleTeamSubmit);
    const projectFormEl = document.getElementById('projectForm');
    if (projectFormEl) projectFormEl.addEventListener('submit', handleProjectSubmit);
    const serviceFormEl = document.getElementById('serviceForm');
    if (serviceFormEl) serviceFormEl.addEventListener('submit', handleServiceSubmit);
    const siteSettingsFormEl = document.getElementById('siteSettingsForm');
    if (siteSettingsFormEl) siteSettingsFormEl.addEventListener('submit', handleSettingsSubmit);
    
    // Modal close events
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            closeAllModals();
        }
    });
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeAllModals();
        }
    });
}

// Authentication
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    try {
        await signInWithEmailAndPassword(auth, email, password);
        showNotification('تم تسجيل الدخول بنجاح', 'success');
    } catch (error) {
        console.error('Login error:', error);
        showNotification('خطأ في تسجيل الدخول: ' + error.message, 'error');
    }
}

async function logout() {
    try {
        await signOut(auth);
        showNotification('تم تسجيل الخروج بنجاح', 'success');
    } catch (error) {
        console.error('Logout error:', error);
        showNotification('خطأ في تسجيل الخروج', 'error');
    }
}

// UI Functions
function showLoginScreen() {
    loginContainer.style.display = 'flex';
    adminContainer.style.display = 'none';
}

function showAdminDashboard() {
    loginContainer.style.display = 'none';
    adminContainer.style.display = 'flex';
}

function togglePassword() {
    const passwordInput = document.getElementById('password');
    const toggleBtn = document.querySelector('.toggle-password i');
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        toggleBtn.classList.remove('fa-eye');
        toggleBtn.classList.add('fa-eye-slash');
    } else {
        passwordInput.type = 'password';
        toggleBtn.classList.remove('fa-eye-slash');
        toggleBtn.classList.add('fa-eye');
    }
}

function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    sidebar.classList.toggle('active');
}

// Navigation
function handleNavigation(e) {
    e.preventDefault();
    const targetSection = e.target.getAttribute('data-section');
    if(!targetSection) return;
    
    // Update active nav item
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    e.target.closest('.nav-item').classList.add('active');
    
    // Show target section
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    document.getElementById(targetSection + '-section').classList.add('active');
    
    // Update page title
    updatePageTitle(targetSection);
    
    // Close sidebar on mobile
    if (window.innerWidth <= 1024) {
        document.querySelector('.sidebar').classList.remove('active');
    }
}

function updatePageTitle(section) {
    const titles = {
        dashboard: { title: 'لوحة المعلومات', subtitle: 'مرحباً بك في لوحة تحكم DevMasters Team' },
        team: { title: 'إدارة الفريق', subtitle: 'إضافة وتعديل أعضاء الفريق' },
        projects: { title: 'إدارة المشاريع', subtitle: 'إضافة وتعديل المشاريع' },
        services: { title: 'إدارة الخدمات', subtitle: 'إضافة وتعديل الخدمات' },
        settings: { title: 'الإعدادات', subtitle: 'إعدادات الموقع والنظام' }
    };
    
    const pageTitle = document.getElementById('pageTitle');
    const pageSubtitle = document.getElementById('pageSubtitle');
    
    if (titles[section]) {
        pageTitle.textContent = titles[section].title;
        pageSubtitle.textContent = titles[section].subtitle;
    }
}

// Data Loading
async function loadData() {
    try {
        await Promise.all([
            loadTeamMembers(),
            loadProjects(),
            loadServices()
        ]);
        
        updateDashboardStats();
        renderDashboard();
    } catch (error) {
        console.error('Error loading data:', error);
        showNotification('خطأ في تحميل البيانات', 'error');
    }
}

async function loadTeamMembers() {
    try {
        const q = query(collection(db, 'team'), orderBy('name'));
        const querySnapshot = await getDocs(q);
        teamMembers = [];
        
        querySnapshot.forEach((doc) => {
            teamMembers.push({ id: doc.id, ...doc.data() });
        });
        
        renderTeamGrid();
    } catch (error) {
        console.error('Error loading team members:', error);
    }
}

async function loadProjects() {
    try {
        const q = query(collection(db, 'projects'), orderBy('name'));
        const querySnapshot = await getDocs(q);
        projects = [];
        
        querySnapshot.forEach((doc) => {
            projects.push({ id: doc.id, ...doc.data() });
        });
        
        renderProjectsGrid();
    } catch (error) {
        console.error('Error loading projects:', error);
    }
}

async function loadServices() {
    try {
        const q = query(collection(db, 'services'), orderBy('name'));
        const querySnapshot = await getDocs(q);
        services = [];
        
        querySnapshot.forEach((doc) => {
            services.push({ id: doc.id, ...doc.data() });
        });
        
        renderServicesGrid();
    } catch (error) {
        console.error('Error loading services:', error);
    }
}

// Dashboard Rendering
function updateDashboardStats() {
    document.getElementById('teamCount').textContent = teamMembers.length;
    document.getElementById('projectCount').textContent = projects.length;
    document.getElementById('serviceCount').textContent = services.length;
}

function renderDashboard() {
    renderRecentProjects();
    renderRecentTeam();
}

function renderRecentProjects() {
    const container = document.getElementById('recentProjects');
    const recentProjects = projects.slice(0, 3);
    
    container.innerHTML = recentProjects.map(project => `
        <div class="recent-item">
            <div class="recent-item-icon">
                <i class="fas fa-project-diagram"></i>
            </div>
            <div class="recent-item-info">
                <h4>${project.name}</h4>
                <p>${project.category}</p>
            </div>
        </div>
    `).join('');
}

function renderRecentTeam() {
    const container = document.getElementById('recentTeam');
    const recentTeam = teamMembers.slice(0, 3);
    
    container.innerHTML = recentTeam.map(member => `
        <div class="recent-item">
            <div class="recent-item-icon">
                <i class="fas fa-user"></i>
            </div>
            <div class="recent-item-info">
                <h4>${member.name}</h4>
                <p>${member.role}</p>
            </div>
        </div>
    `).join('');
}

// Team Management
function renderTeamGrid() {
    const container = document.getElementById('teamGrid');
    
    container.innerHTML = teamMembers.map(member => `
        <div class="team-member-card">
            <div class="member-image">
                <img src="${member.image}" alt="${member.name}">
                <div class="member-overlay">
                    <div class="member-actions">
                        <button class="btn btn-small btn-primary" onclick="editTeamMember('${member.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-small btn-danger" onclick="deleteTeamMember('${member.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
            <div class="member-info">
                <h3>${member.name}</h3>
                <p class="member-role">${member.role}</p>
                <p class="member-description">${member.description}</p>
                <div class="member-skills">
                    ${member.skills ? member.skills.split(',').map(skill => 
                        `<span class="skill-tag">${skill.trim()}</span>`
                    ).join('') : ''}
                </div>
            </div>
        </div>
    `).join('');
}

function openTeamModal(memberId = null) {
    const modal = document.getElementById('teamModal');
    const form = document.getElementById('teamForm');
    const title = document.getElementById('teamModalTitle');
    
    if (memberId) {
        const member = teamMembers.find(m => m.id === memberId);
        title.textContent = 'تعديل عضو الفريق';
        
        document.getElementById('teamMemberId').value = member.id;
        document.getElementById('memberName').value = member.name;
        document.getElementById('memberRole').value = member.role;
        document.getElementById('memberDescription').value = member.description;
        document.getElementById('memberPrevImage').value = member.image; // store previous url
        document.getElementById('memberSkills').value = member.skills || '';
        document.getElementById('memberLinkedin').value = member.linkedin || '';
        document.getElementById('memberGithub').value = member.github || '';
    } else {
        title.textContent = 'إضافة عضو جديد';
        form.reset();
        document.getElementById('teamMemberId').value = '';
    }
    
    modal.style.display = 'block';

}

function closeTeamModal() {
    document.getElementById('teamModal').style.display = 'none';
}

async function handleTeamSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    // ---- Handle image upload ----
    const imageFileEl = document.getElementById('memberImageFile');
    const imageFile   = imageFileEl ? imageFileEl.files[0] : null;
    let imageUrl      = formData.get('prevImage') || '';

    if (imageFile) {
        const storageRef = ref(storage, `team/${Date.now()}_${imageFile.name}`);
        await uploadBytes(storageRef, imageFile);
        imageUrl = await getDownloadURL(storageRef);
    }

    const memberData = {
        name: formData.get('name'),
        role: formData.get('role'),
        description: formData.get('description'),
        image: imageUrl,
        skills: formData.get('skills'),
        linkedin: formData.get('linkedin'),
        github: formData.get('github'),
        updatedAt: new Date()
    };
    
    try {
        const memberId = formData.get('id');
        
        if (memberId) {
            // Update existing member
            await updateDoc(doc(db, 'team', memberId), memberData);
            showNotification('تم تحديث عضو الفريق بنجاح', 'success');
        } else {
            // Add new member
            memberData.createdAt = new Date();
            await addDoc(collection(db, 'team'), memberData);
            showNotification('تم إضافة عضو الفريق بنجاح', 'success');
        }
        
        closeTeamModal();
        loadTeamMembers();
    } catch (error) {
        console.error('Error saving team member:', error);
        showNotification('خطأ في حفظ البيانات', 'error');
    }
}

function editTeamMember(memberId) {
    openTeamModal(memberId);
}

async function deleteTeamMember(memberId) {
    if (confirm('هل أنت متأكد من حذف هذا العضو؟')) {
        try {
            await deleteDoc(doc(db, 'team', memberId));
            showNotification('تم حذف عضو الفريق بنجاح', 'success');
            loadTeamMembers();
        } catch (error) {
            console.error('Error deleting team member:', error);
            showNotification('خطأ في حذف العضو', 'error');
        }
    }
}

// Projects Management
function renderProjectsGrid() {
    const container = document.getElementById('projectsGrid');
    
    container.innerHTML = projects.map(project => `
        <div class="project-card-admin">
            <div class="project-image-admin">
                <img src="${project.image}" alt="${project.name}">
                <div class="project-overlay-admin">
                    <div class="project-actions">
                        <button class="btn btn-small btn-primary" onclick="editProject('${project.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-small btn-danger" onclick="deleteProject('${project.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
            <div class="project-info-admin">
                <div class="project-category-admin">${getCategoryName(project.category)}</div>
                <h3>${project.name}</h3>
                <p class="project-description">${project.description}</p>
                <div class="project-tech-admin">
                    ${project.technologies ? project.technologies.split(',').map(tech => 
                        `<span class="tech-tag-admin">${tech.trim()}</span>`
                    ).join('') : ''}
                </div>
                <span class="project-status status-${project.status}">${getStatusName(project.status)}</span>
            </div>
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

function getStatusName(status) {
    const statuses = {
        completed: 'مكتمل',
        'in-progress': 'قيد التطوير',
        planning: 'في التخطيط'
    };
    return statuses[status] || status;
}

function openProjectModal(projectId = null) {
    const modal = document.getElementById('projectModal');
    const form = document.getElementById('projectForm');
    const title = document.getElementById('projectModalTitle');
    
    if (projectId) {
        const project = projects.find(p => p.id === projectId);
        title.textContent = 'تعديل المشروع';
        
        document.getElementById('projectId').value = project.id;
        document.getElementById('projectName').value = project.name;
        document.getElementById('projectDescription').value = project.description;
        document.getElementById('projectCategory').value = project.category;
        document.getElementById('projectStatus').value = project.status;
        document.getElementById('projectPrevImage').value = project.image;
        document.getElementById('projectTech').value = project.technologies || '';
        document.getElementById('projectDemo').value = project.demoUrl || '';
        document.getElementById('projectGithub').value = project.githubUrl || '';
    } else {
        title.textContent = 'إضافة مشروع جديد';
        form.reset();
        document.getElementById('projectId').value = '';
    }
    
    modal.style.display = 'block';
}

function closeProjectModal() {
    document.getElementById('projectModal').style.display = 'none';
}

async function handleProjectSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    // ---- Handle project image upload ----
    const projImageEl = document.getElementById('projectImageFile');
    const projFile    = projImageEl ? projImageEl.files[0] : null;
    let projImageUrl  = formData.get('prevImage') || '';

    if (projFile) {
        const storageRef = ref(storage, `projects/${Date.now()}_${projFile.name}`);
        await uploadBytes(storageRef, projFile);
        projImageUrl = await getDownloadURL(storageRef);
    }

    const projectData = {
        name: formData.get('name'),
        description: formData.get('description'),
        category: formData.get('category'),
        status: formData.get('status'),
        image: projImageUrl,
        technologies: formData.get('technologies'),
        demoUrl: formData.get('demoUrl'),
        githubUrl: formData.get('githubUrl'),
        updatedAt: new Date()
    };
    
    try {
        const projectId = formData.get('id');
        
        if (projectId) {
            // Update existing project
            await updateDoc(doc(db, 'projects', projectId), projectData);
            showNotification('تم تحديث المشروع بنجاح', 'success');
        } else {
            // Add new project
            projectData.createdAt = new Date();
            await addDoc(collection(db, 'projects'), projectData);
            showNotification('تم إضافة المشروع بنجاح', 'success');
        }
        
        closeProjectModal();
        loadProjects();
    } catch (error) {
        console.error('Error saving project:', error);
        showNotification('خطأ في حفظ البيانات', 'error');
    }
}

function editProject(projectId) {
    openProjectModal(projectId);
}

async function deleteProject(projectId) {
    if (confirm('هل أنت متأكد من حذف هذا المشروع؟')) {
        try {
            await deleteDoc(doc(db, 'projects', projectId));
            showNotification('تم حذف المشروع بنجاح', 'success');
            loadProjects();
        } catch (error) {
            console.error('Error deleting project:', error);
            showNotification('خطأ في حذف المشروع', 'error');
        }
    }
}

// Services Management
function renderServicesGrid() {
    const container = document.getElementById('servicesGrid');
    
    container.innerHTML = services.map(service => `
        <div class="service-card-admin">
            <div class="service-actions">
                <button class="btn btn-small btn-primary" onclick="editService('${service.id}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-small btn-danger" onclick="deleteService('${service.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
            <div class="service-icon-admin">
                <i class="${service.icon}"></i>
            </div>
            <h3>${service.name}</h3>
            <p class="service-description">${service.description}</p>
            <div class="service-features">
                ${service.features ? service.features.split(',').map(feature => 
                    `<span class="feature-tag">${feature.trim()}</span>`
                ).join('') : ''}
            </div>
        </div>
    `).join('');
}

function openServiceModal(serviceId = null) {
    const modal = document.getElementById('serviceModal');
    const form = document.getElementById('serviceForm');
    const title = document.getElementById('serviceModalTitle');
    
    if (serviceId) {
        const service = services.find(s => s.id === serviceId);
        title.textContent = 'تعديل الخدمة';
        
        document.getElementById('serviceId').value = service.id;
        document.getElementById('serviceName').value = service.name;
        document.getElementById('serviceDescription').value = service.description;
        document.getElementById('serviceIcon').value = service.icon;
        document.getElementById('serviceFeatures').value = service.features || '';
    } else {
        title.textContent = 'إضافة خدمة جديدة';
        form.reset();
        document.getElementById('serviceId').value = '';
    }
    
    modal.style.display = 'block';
}

function closeServiceModal() {
    document.getElementById('serviceModal').style.display = 'none';
}

async function handleServiceSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const serviceData = {
        name: formData.get('name'),
        description: formData.get('description'),
        icon: formData.get('icon'),
        features: formData.get('features'),
        updatedAt: new Date()
    };
    
    try {
        const serviceId = formData.get('id');
        
        if (serviceId) {
            // Update existing service
            await updateDoc(doc(db, 'services', serviceId), serviceData);
            showNotification('تم تحديث الخدمة بنجاح', 'success');
        } else {
            // Add new service
            serviceData.createdAt = new Date();
            await addDoc(collection(db, 'services'), serviceData);
            showNotification('تم إضافة الخدمة بنجاح', 'success');
        }
        
        closeServiceModal();
        loadServices();
    } catch (error) {
        console.error('Error saving service:', error);
        showNotification('خطأ في حفظ البيانات', 'error');
    }
}

function editService(serviceId) {
    openServiceModal(serviceId);
}

async function deleteService(serviceId) {
    if (confirm('هل أنت متأكد من حذف هذه الخدمة؟')) {
        try {
            await deleteDoc(doc(db, 'services', serviceId));
            showNotification('تم حذف الخدمة بنجاح', 'success');
            loadServices();
        } catch (error) {
            console.error('Error deleting service:', error);
            showNotification('خطأ في حذف الخدمة', 'error');
        }
    }
}

// Settings
async function handleSettingsSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const settingsData = {
        siteName: formData.get('siteName'),
        siteDescription: formData.get('siteDescription'),
        heroTitle: formData.get('heroTitle'),
        heroSubtitle: formData.get('heroSubtitle'),
        contactEmail: formData.get('contactEmail'),
        contactPhone: formData.get('contactPhone'),
        updatedAt: new Date()
    };
    
    try {
        // Save settings to Firebase
        await setDoc(doc(db, 'settings', 'site'), settingsData, { merge: true });
        showNotification('تم حفظ الإعدادات بنجاح', 'success');
        
        // Update main website immediately
        updateMainWebsiteSettings(settingsData);
    } catch (error) {
        console.error('Error saving settings:', error);
        showNotification('خطأ في حفظ الإعدادات', 'error');
    }
}

async function handleDesignSettingsSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const designData = {
        primaryColor: formData.get('primaryColor'),
        secondaryColor: formData.get('secondaryColor'),
        accentColor: formData.get('accentColor'),
        backgroundColor: formData.get('backgroundColor'),
        fontFamily: formData.get('fontFamily'),
        updatedAt: new Date()
    };
    
    try {
        await setDoc(doc(db, 'settings', 'design'), designData, { merge: true });
        showNotification('تم تطبيق التصميم بنجاح', 'success');
        
        // Apply design changes immediately
        applyDesignChanges(designData);
    } catch (error) {
        console.error('Error saving design settings:', error);
        showNotification('خطأ في حفظ إعدادات التصميم', 'error');
    }
}

async function handleTitlesSettingsSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const titlesData = {
        aboutTitle: formData.get('aboutTitle'),
        servicesTitle: formData.get('servicesTitle'),
        teamTitle: formData.get('teamTitle'),
        projectsTitle: formData.get('projectsTitle'),
        whyUsTitle: formData.get('whyUsTitle'),
        contactTitle: formData.get('contactTitle'),
        updatedAt: new Date()
    };
    
    try {
        await setDoc(doc(db, 'settings', 'titles'), titlesData, { merge: true });
        showNotification('تم حفظ العناوين بنجاح', 'success');
        
        // Update titles immediately
        updateMainWebsiteTitles(titlesData);
    } catch (error) {
        console.error('Error saving titles:', error);
        showNotification('خطأ في حفظ العناوين', 'error');
    }
}

function applyDesignChanges(designData) {
    // Apply design changes to admin panel
    const root = document.documentElement;
    if (designData.primaryColor)   root.style.setProperty('--primary-color', designData.primaryColor);
    if (designData.secondaryColor) root.style.setProperty('--secondary-color', designData.secondaryColor);
    if (designData.accentColor)    root.style.setProperty('--accent-color', designData.accentColor);
    if (designData.backgroundColor)root.style.setProperty('--background-color', designData.backgroundColor);
    
    if (designData.fontFamily) {
        document.body.style.fontFamily = `'${designData.fontFamily}', sans-serif`;
    }
    
    // Send message to main website if in iframe or same origin
    try {
        if (window.parent && window.parent !== window) {
            window.parent.postMessage({
                type: 'designUpdate',
                data: designData
            }, '*');
        }
    } catch (error) {
        console.log('Could not communicate with parent window');
    }
}

function updateMainWebsiteSettings(settingsData) {
    try {
        if (window.parent && window.parent !== window) {
            window.parent.postMessage({
                type: 'settingsUpdate',
                data: settingsData
            }, '*');
        }
    } catch (error) {
        console.log('Could not communicate with parent window');
    }
}

function updateMainWebsiteTitles(titlesData) {
    try {
        if (window.parent && window.parent !== window) {
            window.parent.postMessage({
                type: 'titlesUpdate',
                data: titlesData
            }, '*');
        }
    } catch (error) {
        console.log('Could not communicate with parent window');
    }
}

// Utility Functions
function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
      
    });
}

function showNotification(message, type = 'info') {
    const container = document.getElementById('notificationContainer');
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    container.appendChild(notification);
    
    // Show notification
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);
    
    // Hide and remove notification
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 300);
    }, 3000);
}

// Make functions globally available
// -----------------------------
// DOM READY BINDINGS
// -----------------------------
document.addEventListener('DOMContentLoaded', () => {
    // ربط استمارات الإعدادات
    const siteForm   = document.getElementById('siteSettingsForm') || document.querySelector('form[name="siteSettings"]');
    const designForm = document.getElementById('designSettingsForm') || document.querySelector('form[name="designSettings"]');
    if (siteForm)   siteForm.addEventListener('submit', handleSettingsSubmit);
    if (designForm) designForm.addEventListener('submit', handleDesignSettingsSubmit);
});

// -----------------------------








globalThis.openTeamModal = openTeamModal;
globalThis.closeTeamModal = closeTeamModal;
globalThis.editTeamMember = editTeamMember;
globalThis.deleteTeamMember = deleteTeamMember;
globalThis.openProjectModal = openProjectModal;
globalThis.closeProjectModal = closeProjectModal;
globalThis.editProject = editProject;
globalThis.deleteProject = deleteProject;
globalThis.openServiceModal = openServiceModal;
globalThis.closeServiceModal = closeServiceModal;
globalThis.editService = editService;
globalThis.deleteService = deleteService;
globalThis.logout = logout;
globalThis.togglePassword = togglePassword;