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
        startDrawingMultipleLines();
    }
}

function clearPreviousAnimations() {
    // Remove existing lines
    activeLines.forEach(line => scene.remove(line));
    activeLines = [];
    
    // Remove existing text boxes
    activeTextBoxes.forEach(box => {
        if (box && box.parentNode) {
            box.parentNode.removeChild(box);
        }
    });
    activeTextBoxes = [];
}

function startDrawingMultipleLines() {
    const startPoint = new THREE.Vector3(0, 4, 0);
    const directions = [
        { angle: -30, length: 3, height: 0.5 },    // Right-up
        { angle: -60, length: 3, height: 0 },      // Right-middle
        { angle: -90, length: 3, height: -0.5 },   // Right-down
        { angle: -120, length: 3, height: -1 },    // Right-lower
        { angle: -150, length: 3, height: -1.5 }   // Right-lowest
    ];

    directions.forEach((direction, index) => {
        if (index < textContents.length) {
            drawAnimatedLine(startPoint, direction.angle, direction.length, direction.height, index);
        }
    });
}

function drawAnimatedLine(startPoint, angle, length, height, textIndex) {
    const points = [startPoint.clone()];
    const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
    const lineMaterial = new THREE.LineBasicMaterial({ 
        color: 0xffffff,
        transparent: true,
        opacity: 0.7
    });
    const line = new THREE.Line(lineGeometry, lineMaterial);
    scene.add(line);
    activeLines.push(line);

    const radians = THREE.MathUtils.degToRad(angle);
    let progress = 0;
    const animationDuration = 0.8;
    const finalX = startPoint.x + Math.cos(radians) * length;
    const finalY = startPoint.y + height;
    const finalZ = startPoint.z + Math.sin(radians) * length;

    function animateLine() {
        progress += 0.016;
        
        if (progress < animationDuration) {
            const t = progress / animationDuration;
            const currentX = startPoint.x + (finalX - startPoint.x) * t;
            const currentY = startPoint.y + (finalY - startPoint.y) * t;
            const currentZ = startPoint.z + (finalZ - startPoint.z) * t;
            points.push(new THREE.Vector3(currentX, currentY, currentZ));
            lineGeometry.setFromPoints(points);
            requestAnimationFrame(animateLine);
        } else {
            showTextBox(textContents[textIndex], finalX, finalY, finalZ);
        }
    }

    animateLine();
}

function showTextBox(content, x, y, z) {
    const textBox = document.createElement('div');
    textBox.className = 'info-text-box';
    textBox.innerHTML = `
        <div class="title">${content.title}</div>
        <div class="text"><span></span></div>
    `;
    document.body.appendChild(textBox);
    activeTextBoxes.push(textBox);

    // Position the text box in 3D space
    const vector = new THREE.Vector3(x, y, z);
    vector.project(camera);
    
    const widthHalf = window.innerWidth / 2;
    const heightHalf = window.innerHeight / 2;
    
    const screenX = (vector.x * widthHalf) + widthHalf;
    const screenY = -(vector.y * heightHalf) + heightHalf;

    // Update styles
    if (!document.getElementById('info-styles')) {
        const styles = `
            .info-text-box {
                position: fixed;
                background: rgba(0, 0, 0, 0.75);
                color: white;
                padding: 12px 15px;
                font-family: 'Arial', sans-serif;
                border-radius: 4px;
                border-left: 2px solid white;
                max-width: 250px;
                pointer-events: none;
                opacity: 0;
                animation: fadeIn 0.5s forwards;
                backdrop-filter: blur(5px);
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
            @keyframes fadeIn {
                to { opacity: 1; }
            }
        `;
        const styleSheet = document.createElement("style");
        styleSheet.id = 'info-styles';
        styleSheet.type = "text/css";
        styleSheet.innerText = styles;
        document.head.appendChild(styleSheet);
    }

    textBox.style.left = `${screenX}px`;
    textBox.style.top = `${screenY}px`;
    textBox.style.transform = 'translate(20px, -50%)';

    // Typing effect
    let i = 0;
    function type() {
        if (i < content.text.length) {
            textBox.querySelector(".text span").innerHTML += content.text.charAt(i);
            i++;
            setTimeout(type, 25);
        }
    }
    type();
}

// Add click event listener
window.addEventListener('click', onMouseClick);

// Update text positions in animation loop
function updateTextPositions() {
    activeTextBoxes.forEach((textBox, index) => {
        if (textBox && textBox.parentNode) {
            const line = activeLines[index];
            if (line) {
                const lastPoint = line.geometry.attributes.position.array;
                const length = lastPoint.length;
                const vector = new THREE.Vector3(
                    lastPoint[length - 3],
                    lastPoint[length - 2],
                    lastPoint[length - 1]
                );
                vector.project(camera);
                
                const widthHalf = window.innerWidth / 2;
                const heightHalf = window.innerHeight / 2;
                
                const screenX = (vector.x * widthHalf) + widthHalf;
                const screenY = -(vector.y * heightHalf) + heightHalf;
                
                textBox.style.left = `${screenX}px`;
                textBox.style.top = `${screenY}px`;
            }
        }
    });
}

// Modify the animate function to update text positions
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    updateTextPositions();
    renderer.render(scene, camera);
}

animate();
