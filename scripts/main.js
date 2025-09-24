import * as THREE from 'https://unpkg.com/three@0.158.0/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.158.0/examples/jsm/controls/OrbitControls.js';

const canvas = document.getElementById('hero-canvas');
const heroSection = document.querySelector('.hero');

if (!canvas || !heroSection) {
  throw new Error('Hero section or canvas element is missing.');
}

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x050510, 0.18);

const camera = new THREE.PerspectiveCamera(
  42,
  heroSection.clientWidth / heroSection.clientHeight,
  0.1,
  100
);
camera.position.set(0, 0, 8);
scene.add(camera);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.enableZoom = false;
controls.enablePan = false;
controls.minPolarAngle = Math.PI / 3;
controls.maxPolarAngle = Math.PI / 1.5;
controls.rotateSpeed = 0.45;
controls.autoRotate = true;
controls.autoRotateSpeed = 1.4;

const group = new THREE.Group();
scene.add(group);

const coreGeometry = new THREE.IcosahedronGeometry(1.6, 1);
const coreMaterial = new THREE.MeshStandardMaterial({
  color: 0x9f7bff,
  metalness: 0.6,
  roughness: 0.25,
  emissive: 0x251152,
  emissiveIntensity: 0.35,
});
const core = new THREE.Mesh(coreGeometry, coreMaterial);
core.layers.enable(1);

const innerWireframe = new THREE.LineSegments(
  new THREE.WireframeGeometry(coreGeometry),
  new THREE.LineBasicMaterial({ color: 0xffffff, opacity: 0.15, transparent: true })
);

const shellGeometry = new THREE.IcosahedronGeometry(2.2, 2);
const shellMaterial = new THREE.MeshPhysicalMaterial({
  color: 0x3a5dff,
  transparent: true,
  opacity: 0.28,
  reflectivity: 0.6,
  transmission: 0.75,
  thickness: 1.6,
  roughness: 0.05,
});
const shell = new THREE.Mesh(shellGeometry, shellMaterial);

const noiseGeometry = new THREE.IcosahedronGeometry(2.4, 4);
const noiseMaterial = new THREE.MeshStandardMaterial({
  color: 0x7f5af0,
  emissive: 0x1a0f35,
  emissiveIntensity: 0.7,
  wireframe: true,
  transparent: true,
  opacity: 0.12,
});
const noiseMesh = new THREE.Mesh(noiseGeometry, noiseMaterial);

const swirlGeometry = new THREE.TorusKnotGeometry(2.8, 0.18, 220, 14, 2, 3);
const swirlMaterial = new THREE.MeshStandardMaterial({
  color: 0x8ef6ff,
  metalness: 0.7,
  roughness: 0.15,
  transparent: true,
  opacity: 0.2,
});
const swirl = new THREE.Mesh(swirlGeometry, swirlMaterial);

const starCount = 1200;
const positions = new Float32Array(starCount * 3);
const scales = new Float32Array(starCount);
for (let i = 0; i < starCount; i += 1) {
  const radius = THREE.MathUtils.randFloat(4, 12);
  const angle = THREE.MathUtils.randFloatSpread(360);
  const y = THREE.MathUtils.randFloatSpread(10);
  positions[i * 3] = Math.cos(angle) * radius;
  positions[i * 3 + 1] = y;
  positions[i * 3 + 2] = Math.sin(angle) * radius;
  scales[i] = THREE.MathUtils.randFloat(0.4, 1.2);
}
const starsGeometry = new THREE.BufferGeometry();
starsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
starsGeometry.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));
const starsMaterial = new THREE.PointsMaterial({
  color: 0xc8f5ff,
  size: 0.06,
  sizeAttenuation: true,
  depthWrite: false,
  transparent: true,
  opacity: 0.8,
});
const stars = new THREE.Points(starsGeometry, starsMaterial);

const haloGeometry = new THREE.SphereGeometry(4.2, 32, 32);
const haloMaterial = new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 0 },
  },
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  vertexShader: /* glsl */ `
    varying vec3 vPos;
    void main() {
      vPos = position;
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  fragmentShader: /* glsl */ `
    varying vec3 vPos;
    void main() {
      float intensity = pow(0.8 - length(vPos) / 4.2, 3.0);
      gl_FragColor = vec4(0.45, 0.75, 1.0, intensity);
    }
  `,
});
const halo = new THREE.Mesh(haloGeometry, haloMaterial);

const ringGeometry = new THREE.RingGeometry(3.8, 4.3, 120);
const ringMaterial = new THREE.MeshBasicMaterial({
  color: 0x7f5af0,
  side: THREE.DoubleSide,
  transparent: true,
  opacity: 0.18,
});
const ring = new THREE.Mesh(ringGeometry, ringMaterial);
ring.rotation.x = Math.PI / 2.2;
ring.position.z = -0.8;

const lightGroup = new THREE.Group();
const light1 = new THREE.PointLight(0x8f5aff, 8, 30);
light1.position.set(4, 4, 6);
const light2 = new THREE.PointLight(0x36d6ff, 7, 32);
light2.position.set(-5, -3, -4);
const light3 = new THREE.PointLight(0xff6fae, 5, 25);
light3.position.set(3, -2, 4);
lightGroup.add(light1, light2, light3);

scene.add(lightGroup);
scene.add(new THREE.AmbientLight(0x404060, 1.2));

const objects = [core, innerWireframe, shell, noiseMesh, swirl];
objects.forEach((object) => group.add(object));
group.add(stars, halo, ring);

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let autoRotate = !prefersReducedMotion.matches;

if (prefersReducedMotion.matches) {
  controls.autoRotate = false;
}

const handleMotionChange = (event) => {
  autoRotate = !event.matches;
  controls.autoRotate = autoRotate;
};

if (typeof prefersReducedMotion.addEventListener === 'function') {
  prefersReducedMotion.addEventListener('change', handleMotionChange);
} else if (typeof prefersReducedMotion.addListener === 'function') {
  prefersReducedMotion.addListener(handleMotionChange);
}

const mouse = new THREE.Vector2(0, 0);
const targetRotation = new THREE.Vector2(0, 0);
const easedRotation = new THREE.Vector2(0, 0);

function handlePointerMove(event) {
  const bounds = heroSection.getBoundingClientRect();
  mouse.x = (event.clientX - bounds.left) / bounds.width;
  mouse.y = (event.clientY - bounds.top) / bounds.height;
  targetRotation.x = THREE.MathUtils.mapLinear(mouse.y, 0, 1, 0.4, -0.4);
  targetRotation.y = THREE.MathUtils.mapLinear(mouse.x, 0, 1, -0.6, 0.6);
}

document.addEventListener('pointermove', handlePointerMove);

const clock = new THREE.Clock();

function resizeRenderer() {
  const { clientWidth, clientHeight } = heroSection;
  renderer.setSize(clientWidth, clientHeight);
  camera.aspect = clientWidth / clientHeight;
  camera.updateProjectionMatrix();
}

resizeRenderer();

window.addEventListener('resize', resizeRenderer);

function animate() {
  const elapsed = clock.getElapsedTime();

  if (autoRotate) {
    easedRotation.x += (targetRotation.x - easedRotation.x) * 0.05;
    easedRotation.y += (targetRotation.y - easedRotation.y) * 0.05;
    group.rotation.x = easedRotation.x + Math.sin(elapsed / 3) * 0.08;
    group.rotation.y = easedRotation.y + elapsed * 0.1;
  }

  const noiseIntensity = Math.sin(elapsed * 0.6) * 0.3 + 0.7;
  shell.material.opacity = 0.28 + Math.sin(elapsed * 0.5) * 0.05;
  haloMaterial.uniforms.uTime.value = elapsed;

  core.rotation.x += 0.0018;
  core.rotation.y += 0.0025;
  innerWireframe.rotation.y -= 0.0012;
  swirl.rotation.y += 0.0008;
  swirl.rotation.x += 0.0005;
  noiseMesh.rotation.z += 0.0007 * noiseIntensity;
  stars.rotation.y += 0.0003;
  lightGroup.rotation.y = Math.sin(elapsed / 2.5) * 0.5;

  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

animate();

// Navigation toggle for mobile
const navToggle = document.querySelector('.nav-toggle');
const siteNav = document.getElementById('site-nav');

if (navToggle && siteNav) {
  navToggle.addEventListener('click', () => {
    const isVisible = siteNav.getAttribute('data-visible') === 'true';
    siteNav.setAttribute('data-visible', String(!isVisible));
    navToggle.setAttribute('aria-expanded', String(!isVisible));
    navToggle.classList.toggle('is-open', !isVisible);
  });

  // Close mobile nav after clicking a link
  siteNav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      if (window.innerWidth <= 780) {
        siteNav.setAttribute('data-visible', 'false');
        navToggle.setAttribute('aria-expanded', 'false');
        navToggle.classList.remove('is-open');
      }
    });
  });
}

// Modal controls
const modalTriggers = document.querySelectorAll('.work-card');
let activeModal = null;

function openModal(modal) {
  if (activeModal) {
    closeModal(activeModal);
  }
  modal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
  const iframe = modal.querySelector('iframe');
  if (iframe && iframe.dataset.src) {
    iframe.src = iframe.dataset.src;
    delete iframe.dataset.src;
  }
  const closeButton = modal.querySelector('.modal-close');
  closeButton?.focus();
  activeModal = modal;
}

function closeModal(modal) {
  modal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('modal-open');
  activeModal = null;
}

modalTriggers.forEach((card) => {
  card.addEventListener('click', (event) => {
    const target = event.currentTarget;
    if (!(target instanceof HTMLElement)) return;
    const modalId = target.dataset.target;
    const modal = modalId ? document.getElementById(modalId) : null;
    if (!modal) return;
    if (
      (event.target instanceof HTMLElement && event.target.closest('.open-modal')) ||
      window.innerWidth <= 720
    ) {
      openModal(modal);
    }
  });
});

const modals = document.querySelectorAll('.modal');
modals.forEach((modal) => {
  modal.addEventListener('click', (event) => {
    if (event.target instanceof HTMLElement && event.target.dataset.close !== undefined) {
      closeModal(modal);
    }
  });
});

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && activeModal) {
    closeModal(activeModal);
  }
});

// Dynamic footer year
const yearElement = document.getElementById('year');
if (yearElement) {
  yearElement.textContent = new Date().getFullYear().toString();
}

// Prevent submission (static demo)
const contactForm = document.querySelector('.contact-form');
contactForm?.addEventListener('submit', (event) => {
  event.preventDefault();
  const submitButton = contactForm.querySelector('button[type="submit"]');
  if (submitButton) {
    submitButton.textContent = '送信しました！';
    submitButton.disabled = true;
    setTimeout(() => {
      submitButton.textContent = '送信する';
      submitButton.disabled = false;
    }, 3000);
  }
  contactForm.reset();
});
