// Fetch data from Firestore and inject into the public website (index.html)
// This file uses ES-Modules so it must be included with <script type="module" src="dashboard-to-main.js"></script>

import './firebase-config.js'; // ensures Firebase app is initialised
import { db, storage } from './firebase-config.js';
import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  increment,
  onSnapshot,
  query,
  orderBy
} from 'https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js';

import { getDownloadURL, ref as storageRef } from 'https://www.gstatic.com/firebasejs/10.5.0/firebase-storage.js';

/* ---------------- Site visit counter ---------------- */
(async function recordVisit() {
  try {
    const statsRef = doc(db, 'stats', 'site');
    await updateDoc(statsRef, { visits: increment(1) });
  } catch (err) {
    const statsRef = doc(db, 'stats', 'site');
    await setDoc(statsRef, { visits: 1 });
  }
})();

/* ---------------- Helper functions ---------------- */
async function resolveImage(url) {
  if (!url) return 'https://via.placeholder.com/300';
  if (url.startsWith('http')) return url;
  try {
    return await getDownloadURL(storageRef(storage, url));
  } catch {
    return 'https://via.placeholder.com/300';
  }
}

async function createTeamCard(member) {
  const idAttr = `data-fsid="${member.id}"`;
  return `
    <div class="team-card aos-animate" data-aos="zoom-in" ${idAttr}>
        <div class="team-image">
            <img src="${member._resolvedImage}" alt="${member.name}" onload="this.style.opacity='1'">
            <div class="team-overlay">
                <div class="social-links">
                    ${member.linkedin ? `<a href="${member.linkedin}" class="social-link"><i class="fab fa-linkedin"></i></a>` : ''}
                    ${member.github ? `<a href="${member.github}" class="social-link"><i class="fab fa-github"></i></a>` : ''}
                </div>
            </div>
        </div>
        <div class="team-info">
            <h3>${member.name}</h3>
            <p class="role">${member.role}</p>
            <p class="description">${member.description || ''}</p>
            <div class="team-skills">
                ${(member.skills || '')
                  .split(',')
                  .filter(Boolean)
                  .map((s) => `<span>${s.trim()}</span>`)
                  .join('')}
            </div>
        </div>
    </div>`;
}

async function createProjectCard(project) {
  const idAttr = `data-fsid="${project.id}"`;
  return `
    <div class="project-card aos-animate" data-category="${project.category || 'web'}" data-aos="fade-up" ${idAttr}>
        <div class="project-image">
            <img src="${project._resolvedImage}" alt="${project.name}" onload="this.style.opacity='1'">
            <div class="project-overlay">
                <div class="project-actions">
                    ${project.demo ? `<a href="${project.demo}" class="btn btn-small"><i class="fas fa-eye"></i> معاينة</a>` : ''}
                    ${project.details ? `<a href="${project.details}" class="btn btn-small btn-outline"><i class="fas fa-info-circle"></i> التفاصيل</a>` : ''}
                </div>
            </div>
        </div>
        <div class="project-info">
            <h3>${project.name}</h3>
            <p>${project.category}</p>
        </div>
    </div>`;
}

function renderCollection({ q, containerSelector, renderer }) {
  const container = document.querySelector(containerSelector);
  if (!container) return;

  onSnapshot(q, (snapshot) => {
    snapshot.docChanges().forEach(async (change) => {
      let data = { id: change.doc.id, ...change.doc.data() };

      // resolve image
      if (data.image) {
        data._resolvedImage = await resolveImage(data.image);
      } else {
        data._resolvedImage = 'https://via.placeholder.com/300';
      }

      if (data.thumbnail || data.cover || data.projectImage) {
        const path = data.thumbnail || data.cover || data.projectImage;
        data._resolvedImage = await resolveImage(path);
      }

      const selector = `[data-fsid="${data.id}"]`;

      if (change.type === 'added') {
        if (!container.querySelector(selector)) {
          container.insertAdjacentHTML('beforeend', await renderer(data));
        }
      } else if (change.type === 'modified') {
        const el = container.querySelector(selector);
        if (el) {
          el.outerHTML = await renderer(data);
        }
      }

      // لا نحذف العنصر عند 'removed' لإبقاء المحتوى القديم إن أراد المستخدم ذلك
    });
  });
}

/* ---------------- Site & Design Settings listeners ---------------- */
function applySiteSettings(data){
  if(!data) return;
  if(data.siteName){
    document.title = data.siteName;
    document.querySelectorAll('#siteName, .site-name, .brand-name').forEach(el=>el.textContent=data.siteName);
  }
  if(data.heroTitle){
    const el=document.getElementById('heroTitle');
    if(el) el.textContent=data.heroTitle;
  }
  if(data.heroSubtitle){
    const el=document.getElementById('heroSubtitle');
    if(el) el.textContent=data.heroSubtitle;
  }
  if(data.siteDescription){
    const meta=document.querySelector('meta[name="description"]');
    if(meta) meta.setAttribute('content',data.siteDescription);
  }
}
function applyDesign(data){
  if(!data) return;
  const root=document.documentElement;
  if(data.primaryColor) root.style.setProperty('--primary-color',data.primaryColor);
  if(data.secondaryColor) root.style.setProperty('--secondary-color',data.secondaryColor);
  if(data.accentColor) root.style.setProperty('--accent-color',data.accentColor);
  if(data.backgroundColor) root.style.setProperty('--background-color',data.backgroundColor);
  if(data.fontFamily) root.style.setProperty('font-family',`'${data.fontFamily}', sans-serif`);
}

// start listeners once DOM ready
onSnapshot(doc(db,'settings','site'), snap=>applySiteSettings(snap.data()));
onSnapshot(doc(db,'settings','design'), snap=>applyDesign(snap.data()));

/* ---------------- Real-time listeners ---------------- */
document.addEventListener('DOMContentLoaded', () => {
  // Team members
  const teamQuery = query(collection(db, 'team'), orderBy('name'));
  renderCollection({ q: teamQuery, containerSelector: '#team .team-grid, .team-grid', renderer: createTeamCard });

  // Projects
  const projectQuery = query(collection(db, 'projects'), orderBy('name'));
  renderCollection({ q: projectQuery, containerSelector: '#projects .projects-grid, .projects-grid', renderer: createProjectCard });
});
