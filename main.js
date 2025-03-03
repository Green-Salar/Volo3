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

// Create info button
const infoGeometry = new THREE.CircleGeometry(0.3, 32);
const infoMaterial = new THREE.MeshBasicMaterial({ 
    color: 0xffffff,
    transparent: true,
    opacity: 0.8 
});
const infoButton = new THREE.Mesh(infoGeometry, infoMaterial);
infoButton.position.set(0, 4, 0);
scene.add(infoButton);

// Add "i" text to the button
const canvas = document.createElement('canvas');
canvas.width = 64;
canvas.height = 64;
const context = canvas.getContext('2d');
context.fillStyle = '#000000';
context.font = 'bold 40px Arial';
context.textAlign = 'center';
context.textBaseline = 'middle';
context.fillText('i', 32, 32);

const textTexture = new THREE.CanvasTexture(canvas);
const textMaterial = new THREE.MeshBasicMaterial({
    map: textTexture,
    transparent: true
});
const textGeometry = new THREE.PlaneGeometry(0.3, 0.3);
const textMesh = new THREE.Mesh(textGeometry, textMaterial);
textMesh.position.copy(infoButton.position);
textMesh.position.z += 0.01;
scene.add(textMesh);

// Raycaster setup
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// Text content for different points
const textContents = [
    { title: "VOLO Marshmallow Milk", text: "Phenotype-hunted by Capulator" },
    { title: "Cultivation", text: "Date: Feb 2025" },
    { title: "Effects", text: "Euphoric • Creative • Relaxing" },
    { title: "Potency", text: "THC: 26-32%" },
    { title: "Terpenes", text: "Lucky Cereal • Sweet • Creamy" }
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
    const container = document.createElement('div');
    container.className = 'info-container';
    document.body.appendChild(container);
    activeTextBoxes.push(container);

    // Add styles if they don't exist
    if (!document.getElementById('info-styles')) {
        const styles = `
            .info-container {
                position: fixed;
                top: 40px;
                left: 40px;
                display: flex;
                flex-direction: column;
                gap: 15px;
                max-width: 300px;
                pointer-events: none;
            }
            .info-text-box {
                background: rgba(0, 0, 0, 0.75);
                color: white;
                padding: 12px 15px;
                font-family: 'Arial', sans-serif;
                border-radius: 4px;
                border-left: 2px solid white;
                opacity: 0;
                backdrop-filter: blur(5px);
                transform: translateX(-20px);
                animation: slideIn 0.5s forwards;
                animation-delay: calc(var(--index) * 0.1s);
            }
            .info-text-box .title {
                font-size: 14px;
                font-weight: bold;
                margin-bottom: 4px;
                color: #fff;
                text-transform: uppercase;
                letter-spacing: 1px;
            }
            .info-text-box .text {
                font-size: 13px;
                color: rgba(255, 255, 255, 0.9);
                line-height: 1.4;
            }
            @keyframes slideIn {
                to {
                    opacity: 1;
                    transform: translateX(0);
                }
            }
        `;
        const styleSheet = document.createElement("style");
        styleSheet.id = 'info-styles';
        styleSheet.type = "text/css";
        styleSheet.innerText = styles;
        document.head.appendChild(styleSheet);
    }

    // Create and animate each text box
    textContents.forEach((content, index) => {
        const textBox = document.createElement('div');
        textBox.className = 'info-text-box';
        textBox.style.setProperty('--index', index);
        textBox.innerHTML = `
            <div class="title">${content.title}</div>
            <div class="text"><span></span></div>
        `;
        container.appendChild(textBox);

        // Typing effect with delay based on index
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
        }, index * 200); // Delay start of typing based on box index
    });
}

// Add click event listener
window.addEventListener('click', onMouseClick);

// Modify the animate function to update text positions
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

animate();
