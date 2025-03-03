});

// Create an arrow using lines
const arrowMaterial = new THREE.MeshBasicMaterial({ 
    color: 0xffffff,
    transparent: true,
    opacity: 0.9 
});

// Main line
const lineGeometry = new THREE.PlaneGeometry(0.02, 0.2);
const mainLine = new THREE.Mesh(lineGeometry, arrowMaterial);
mainLine.position.set(0, 4, 0);

// Arrow head
const arrowHead1 = new THREE.Mesh(lineGeometry, arrowMaterial);
arrowHead1.position.set(0, 4.1, 0);
arrowHead1.rotation.z = Math.PI / 4;
arrowHead1.scale.set(0.5, 0.5, 1);

const arrowHead2 = new THREE.Mesh(lineGeometry, arrowMaterial);
arrowHead2.position.set(0, 4.1, 0);
arrowHead2.rotation.z = -Math.PI / 4;
arrowHead2.scale.set(0.5, 0.5, 1);

scene.add(mainLine);
scene.add(arrowHead1);
scene.add(arrowHead2);

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
    const intersects = raycaster.intersectObject(mainLine);

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
    mainLine.quaternion.copy(camera.quaternion);
    arrowHead1.quaternion.copy(camera.quaternion);
    arrowHead2.quaternion.copy(camera.quaternion);

    // Subtle floating animation
    const positions = [-0.1, 0, 0.1]; // Y positions for dots
    const dots = [];
    positions.forEach((yPos, index) => {
        const dot = document.querySelector(`.info-container .info-text-box:nth-child(${index + 1})`);
        if (dot) {
            dot.style.transform = `translateY(${4 + yPos + Math.sin(Date.now() * 0.002 + index) * 0.02}px)`;
            dots.push(dot);
        }
    });

    renderer.render(scene, camera);
}

animate();
