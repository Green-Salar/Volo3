import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
// Renderer Setup
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// Scene & Camera Setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 1000);
camera.position.set(4, 6, 11);

// Orbit Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enablePan = false;
controls.minDistance = 5;
controls.maxDistance = 20;
controls.minPolarAngle = 0.5;
controls.maxPolarAngle = 1.5;
controls.autoRotate = false;
controls.target = new THREE.Vector3(0, 1, 0);
controls.update();

// Function to Create a High-Resolution Segmented Ring Texture
function createRingTexture(size = 2048, segments = 8, gapSize = Math.PI / 12) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, size, size);

    const center = size / 2;
    const outerRadius = size * 0.15;
    const innerRadius = size * 0.147;

    ctx.lineWidth = outerRadius - innerRadius;
    ctx.strokeStyle = "white";
    ctx.lineCap = "round";  // Smooth segment edges
    ctx.shadowColor = "rgba(255, 255, 255, 0.2)";
    ctx.shadowBlur = 1;
    for (let i = 0; i < segments; i++) {
        const startAngle = (i * (Math.PI * 2)) / segments;
        const endAngle = startAngle + ((Math.PI * 2) / segments) - gapSize;

        ctx.beginPath();
        ctx.arc(center, center, (outerRadius + innerRadius) / 2, startAngle, endAngle);
        ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearMipMapLinearFilter;
    texture.needsUpdate = true;
    return texture;
}

// Ground Plane with High-Res Segmented Ring Texture
const ringTexture = createRingTexture(2048, 12, Math.PI / 18);  // 12 segments, small gaps
const groundGeometry = new THREE.PlaneGeometry(20, 20, 128  , 128);
groundGeometry.rotateX(-Math.PI / 2);

const groundMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    side: THREE.DoubleSide,
    transparent: true,
    alphaMap: ringTexture
});

const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
groundMesh.receiveShadow = true;
scene.add(groundMesh);

// Spotlight for Light Effect
const spotLight = new THREE.SpotLight(0xffffff, 1500, 100, Math.PI / 4, 1);
spotLight.position.set(0, 25, 0);
spotLight.castShadow = true;
spotLight.shadow.bias = -0.0005;
spotLight.penumbra = 0.5;
spotLight.shadow.mapSize.width = 2048;
spotLight.shadow.mapSize.height = 2048;
scene.add(spotLight);

// Ambient Light for Balance
const ambientLight = new THREE.AmbientLight(0xffffff, 0.1);
scene.add(ambientLight);

// Load GLTF Model
const loader = new GLTFLoader().setPath('public/gol/');
loader.load('gol.gltf', (gltf) => {
    console.log('loading model');
    const mesh = gltf.scene;

    mesh.traverse((child) => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });

    mesh.position.set(0, 2, 0);
    mesh.scale.set(20, 20, 20);
    mesh.rotation.set(THREE.MathUtils.degToRad(-90), 0, THREE.MathUtils.degToRad(50));

    scene.add(mesh);
    document.getElementById('progress-container').style.display = 'none';
}, (xhr) => {
    console.log(`loading ${xhr.loaded / xhr.total * 100}%`);
}, (error) => {
    console.error(error);
});

// Handle Window Resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Replace the existing info button creation with this
const infoGeometry = new THREE.CircleGeometry(0.3, 32);
const infoMaterial = new THREE.MeshBasicMaterial({ 
    color: 0xffffff,
    transparent: true,
    opacity: 0.15 
});
const infoButton = new THREE.Mesh(infoGeometry, infoMaterial);
infoButton.position.set(0, 4, 0);
scene.add(infoButton);

// Create plus sign using two lines
const lineGeometry1 = new THREE.PlaneGeometry(0.2, 0.02);
const lineGeometry2 = new THREE.PlaneGeometry(0.02, 0.2);
const lineMaterial = new THREE.MeshBasicMaterial({ 
    color: 0xffffff,
    transparent: true,
    opacity: 0.9
});
const line1 = new THREE.Mesh(lineGeometry1, lineMaterial);
const line2 = new THREE.Mesh(lineGeometry2, lineMaterial);
line1.position.copy(infoButton.position);
line2.position.copy(infoButton.position);
line1.position.z = 0.01;
line2.position.z = 0.01;
scene.add(line1);
scene.add(line2);

// Raycaster setup
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// Text content with updated structure
const textContents = [
    { 
        title: "MARSHMALLOW MILK", 
        text: "Phenotype-hunted by Capulator",
        highlight: "VOLO EXCLUSIVE"
    },
    { 
        title: "CULTIVATION", 
        text: "February 2025",
        highlight: "ONTARIO GROWN"
    },
    { 
        title: "EFFECTS", 
        text: "Euphoric • Creative • Relaxing",
        highlight: "HYBRID"
    },
    { 
        title: "POTENCY", 
        text: "THC: 26-32%",
        highlight: "HIGH"
    },
    { 
        title: "TERPENES", 
        text: "Lucky Cereal • Sweet • Creamy",
        highlight: "RARE"
    }
];

// Store lines and text boxes
let activeLines = [];
let activeTextBoxes = [];

// Handle click events
function onMouseClick(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(infoButton);

    if (intersects.length > 0) {
        clearPreviousAnimations();
        showAllTextBoxes();
    }
}

function clearPreviousAnimations() {
    activeTextBoxes.forEach(box => {
        if (box && box.parentNode) {
            box.parentNode.removeChild(box);
        }
    });
    activeTextBoxes = [];
}

function showAllTextBoxes() {
    // Remove any existing containers first
    const existingContainer = document.querySelector('.info-container');
    if (existingContainer) {
        existingContainer.remove();
    }

    const container = document.createElement('div');
    container.className = 'info-container';
    document.body.appendChild(container);
    activeTextBoxes.push(container);

    // Create and animate each text box
    textContents.forEach((content, index) => {
        const textBox = document.createElement('div');
        textBox.className = 'info-text-box';
        textBox.style.setProperty('--index', index);
        textBox.innerHTML = `
            <div class="highlight">${content.highlight}</div>
            <div class="title">${content.title}</div>
            <div class="text"><span></span></div>
        `;
        container.appendChild(textBox);

        // Typing effect with delay
        setTimeout(() => {
            let i = 0;
            function type() {
                if (i < content.text.length) {
                    textBox.querySelector(".text span").innerHTML += content.text.charAt(i);
                    i++;
                    setTimeout(type, 25);
                }
            }
            type();
        }, index * 200);
    });
}

// Add click event listener
window.addEventListener('click', onMouseClick);

// Modify the animate function to update text positions
function animate() {
    requestAnimationFrame(animate);
    controls.update();

    // Make button and text face the camera
    infoButton.quaternion.copy(camera.quaternion);
    line1.quaternion.copy(camera.quaternion);
    line2.quaternion.copy(camera.quaternion);

    renderer.render(scene, camera);
}

animate();