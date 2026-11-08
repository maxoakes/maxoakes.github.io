import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutlinePass } from 'three/addons/postprocessing/OutlinePass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import SlippyMapGlobe from 'https://esm.sh/three-slippy-map-globe?external=three';

// Scene Settings
const URL_ROOT = "https://images.maxoakes.dev"
const VIEW_KEY = "ZXACBRmfB2YEZWsxRu4S5tsxErUaTjPbeqqAK56UC4"
const START_LOCATION = "Willamette Valley"
const ALBUM_PIN_SCALE = 1;
const EARTH_RADIUS = 6.3781;
const PIN_COLORS = [
    0xff0000,
    0xffff00,
    0xff00ff,
    0x00ffff,
    0x0000ff
];
const REGION_ALBUM_NAME_PREFIX = "Region: ";
const SETTINGS = new URLSearchParams(window.location.search);

// Renderer
const renderer = new THREE.WebGLRenderer({
    antialias: true
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
document.getElementById('3d').appendChild(renderer.domElement);


// Scene
const scene = new THREE.Scene();
scene.add(new THREE.AmbientLight(0xffffff, 2));
scene.add(new THREE.DirectionalLight(0xffffff, 0.6 * Math.PI));

// Camera
const camera = new THREE.PerspectiveCamera();
camera.aspect = window.innerWidth/window.innerHeight;
camera.near = 1e-3;
camera.far = EARTH_RADIUS * 10;
camera.updateProjectionMatrix();
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
renderer.domElement.addEventListener('dblclick', (event) => {
    const bounds = renderer.domElement.getBoundingClientRect();
    pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
    pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);

    if (raycaster.intersectObjects(polaroids, true).length > 0) {
        console.log('Polaroid double-clicked');
    }
});
const focusDistance = EARTH_RADIUS * 1;
const focusNormalOffset = EARTH_RADIUS * 2;
const focusTangentOffset = EARTH_RADIUS * 1;

// Camera controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.maxDistance = EARTH_RADIUS;
controls.minDistance = 0.5;
controls.enableDamping = true;
controls.dampingFactor = 0.1;
controls.rotateSpeed = 0.3;
controls.zoomSpeed = 1;
controls.panSpeed = 1;
controls.target.set(0, 0, EARTH_RADIUS);
camera.position.set(0, 0, EARTH_RADIUS + focusDistance);
camera.lookAt(controls.target);
controls.update();

// Post-processing
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const outlinePass = new OutlinePass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    scene,
    camera
);
outlinePass.edgeStrength = 5;
outlinePass.edgeGlow = 1;
outlinePass.edgeThickness = 2;
outlinePass.pulsePeriod = 0;
outlinePass.visibleEdgeColor.set(0xfff176);
outlinePass.hiddenEdgeColor.set(0x5c4a18);
composer.addPass(outlinePass);
composer.addPass(new OutputPass());

// Earth
const earth = new SlippyMapGlobe(EARTH_RADIUS, {
  tileUrl: (X, Y, Z) => `https://server.arcgisonline.com/ArcGIS/rest/services/NatGeo_World_Map/MapServer/tile/${Z}/${Y}/${X}`,
  minZoom: 8,
  maxZoom: 11
});
scene.add(earth);

if (SETTINGS.get("helpers") === "true")
{
    // Axis
    const xyzAxis = new THREE.AxesHelper(EARTH_RADIUS*2);
    scene.add(xyzAxis);
    earth.attach(xyzAxis);

    // Widgets
    let xCube = new THREE.Mesh(new THREE.BoxGeometry( 1, 1, 1 ), new THREE.MeshBasicMaterial( { color: 0xff0000 }));
    xCube.position.x = EARTH_RADIUS*2;
    scene.add(xCube);
    let yCube = new THREE.Mesh(new THREE.BoxGeometry( 1, 1, 1 ), new THREE.MeshBasicMaterial( { color: 0x00ff00 }));
    yCube.position.y = EARTH_RADIUS*2;
    scene.add(yCube);
    let zCube = new THREE.Mesh(new THREE.BoxGeometry( 1, 1, 1 ), new THREE.MeshBasicMaterial( { color: 0x0000ff }));
    zCube.position.z = EARTH_RADIUS*2;
    scene.add(zCube);

    // Polar Grid
    scene.add(new THREE.PolarGridHelper( EARTH_RADIUS*10, 4, 10, 32));
}

// Get album locations
let albumLocations = await getAlbumLocationSummaries();

const albumList = document.getElementById('album-locations');
const albumButtons = new Map();
const polaroids = [];

let navMenu = []
for (const location of albumLocations) {

    function randomFromSeed(seed, min, max) {
        return ((seed) % (max - min)) + min;
    }

    // Ignore non-regional photo albums
    if (!location.name.startsWith(REGION_ALBUM_NAME_PREFIX) || !Object.hasOwn(location, "lat")) continue;
    // console.log(location)

    // Create pin object
    let pin = null;
    let polaroid = null
    const loader = new GLTFLoader();
    try {
        const pinModel = await loader.loadAsync('src/glb/pin.glb');
        pin = pinModel.scene;
        const polaroidModel = await loader.loadAsync('src/glb/polaroid.glb');
        polaroid = polaroidModel.scene;
    } catch (error) {
        console.error('Error loading GLB model:', error);
    }
    pin.scale.set(ALBUM_PIN_SCALE,ALBUM_PIN_SCALE,ALBUM_PIN_SCALE);
    polaroids.push(polaroid);
    const pinOutlineObjects = [];

    pin.traverse((child) => {
        if (!child.isMesh) return;
        pinOutlineObjects.push(child);
        if (child.material.name === "color") {
            child.material.color.set(PIN_COLORS[randomFromSeed(location.photoCount, 0, PIN_COLORS.length - 1)]);
            child.material.needsUpdate = true; 
        }
    });
    pin.userData.outlineObjects = pinOutlineObjects;

    // console.log(location)
    polaroid.traverse((child) => {
        if (child.isMesh && child.material.name === "image") {
            const textureLoader = new THREE.TextureLoader();
            const texture = textureLoader.load(location.image, (loadedTexture) => {
                const image = loadedTexture.image;
                child.userData.imageWidth = image.naturalWidth || image.width;
                child.userData.imageHeight = image.naturalHeight || image.height;
                loadedTexture.flipY = false;
                adjustTextureAspect(loadedTexture, 'cover');
            });
            
            child.material = new THREE.MeshBasicMaterial({ map: texture });
            child.material.needsUpdate = true; 
        }
    });

    // Place and rotate object
    let lat = location.lat * Math.PI / 180;
    let lon = location.lon * Math.PI / 180;
    pin.position.z = EARTH_RADIUS * Math.cos(lat) * Math.cos(lon);
    pin.position.x = EARTH_RADIUS * Math.cos(lat) * Math.sin(lon);
    pin.position.y = EARTH_RADIUS * Math.sin(lat);
    pin.rotation.z += Math.PI/2;
    pin.rotation.y += Math.PI/2 + lon;
    pin.rotation.x += lat;

    earth.attach(pin);
    scene.add(pin);

    const surfaceNormal = pin.getWorldPosition(new THREE.Vector3())
        .sub(earth.getWorldPosition(new THREE.Vector3()))
        .normalize();
    const rotationAxis = new THREE.Vector3().randomDirection();
    pin.rotateOnAxis(rotationAxis, THREE.MathUtils.degToRad((Math.random() - 0.5) * 15));
    const worldToPin = pin.getWorldQuaternion(new THREE.Quaternion()).invert();
    const pinLocalNormal = surfaceNormal.clone().applyQuaternion(worldToPin).normalize();
    const northDirection = new THREE.Vector3(
        -Math.sin(lat) * Math.sin(lon),
        Math.cos(lat),
        -Math.sin(lat) * Math.cos(lon)
    ).applyQuaternion(earth.getWorldQuaternion(new THREE.Quaternion())).normalize();
    const pinLocalNorth = northDirection.applyQuaternion(worldToPin).normalize();
    const pinLocalWest = pinLocalNormal.clone().cross(pinLocalNorth).normalize();
    const polaroidBounds = new THREE.Box3().setFromObject(polaroid);
    const topEdgeOffset = -0.04;
    polaroid.position.copy(pinLocalNorth).multiplyScalar(topEdgeOffset)
        .addScaledVector(pinLocalNormal, Math.random()*0.001);
    polaroid.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(
        pinLocalWest,
        pinLocalNormal,
        pinLocalNorth
    ));
    polaroid.rotateY(Math.PI);
    polaroid.rotateY(THREE.MathUtils.degToRad((Math.random() - 0.5) * 15));
    pin.add(polaroid);

    // Setup pin and actions
    location.pin = pin;
    if (location.name.replace(REGION_ALBUM_NAME_PREFIX, "") === START_LOCATION) {
        focusAlbumLocation(pin);
    }

    let newElementItem = {
        name: location.name,
        link: location.hyperlink
    }
    if (navMenu.some(e => e.name === location.country)) {
        let thisCountyIndex = navMenu.findIndex(e => e.name === location.country)
        if (navMenu[thisCountyIndex].value.some(e => e.name === location.state)) {
            let thisRegionIndex = navMenu[0].value.findIndex(e => e.name === location.state)
            navMenu[thisCountyIndex].value[thisRegionIndex].value.push(newElementItem)
        }
        else {
            let newRegionElement = {
                name: location.state || "Unknown",
                value: []
            }
            newRegionElement.value.push(newElementItem)
            navMenu[thisCountyIndex].value.push(newRegionElement)
        }
    }
    else {
        let newCountryElement = {
            name: location.country,
            value: []
        }
        let newRegionElement = {
            name: location.state,
            value: []
        }
        newRegionElement.value.push(newElementItem)
        newCountryElement.value.push(newRegionElement)
        navMenu.push(newCountryElement)
    }
}
console.log(navMenu)

// Create nav menu
const $navElement = $("nav#menu").empty();
navMenu.forEach(country => {
    $("<p>")
        .addClass("country-header")
        .text(country.name)
        .appendTo($navElement);

    country.value.forEach(region => {
        $("<p>")
            .addClass("region-header")
            .text(region.name)
            .appendTo($navElement);

        region.value.forEach(album => {
            $("<a>")
                .addClass("album-item")
                .attr({
                    target: "_blank",
                    rel: "noopener noreferrer"
                })
                .text(album.name.replace(REGION_ALBUM_NAME_PREFIX, ""))
                .on("click", () => {
                    const location = albumLocations.find(loc => loc.name === album.name);
                    if (location) focusAlbumLocation(location.pin);
                })
                .appendTo($navElement);
        })
    })
})

// Set the earth rotation after all children are attached
// earth.rotation.x = THREE.MathUtils.degToRad(23.5); 

// Update pov when camera moves
earth.updatePov(camera);
controls.addEventListener('change', () => {
    earth.updatePov(camera);
});

function focusAlbumLocation(pin) {
    outlinePass.selectedObjects = pin.userData.outlineObjects;

    const targetPosition = pin.getWorldPosition(new THREE.Vector3());
    const globeCenter = earth.getWorldPosition(new THREE.Vector3());
    const surfaceNormal = targetPosition.clone().sub(globeCenter).normalize();
    const tangentDirection = camera.position.clone().sub(targetPosition).projectOnPlane(surfaceNormal);

    if (tangentDirection.lengthSq() < 1e-6) {
        tangentDirection.set(0, 1, 0).projectOnPlane(surfaceNormal);
        if (tangentDirection.lengthSq() < 1e-6) {
            tangentDirection.set(1, 0, 0).projectOnPlane(surfaceNormal);
        }
    }
    tangentDirection.normalize();

    controls.target.copy(targetPosition);
    const cameraOffset = surfaceNormal.clone().multiplyScalar(focusNormalOffset)
        .addScaledVector(tangentDirection, focusTangentOffset)
        .setLength(controls.minDistance);
    camera.position.copy(targetPosition).add(cameraOffset);
    camera.lookAt(targetPosition);
    controls.update();
    earth.updatePov(camera);
}

function animate() {
    controls.update(); 
    composer.render();
}
renderer.setAnimationLoop(animate);

async function getSharedLinks() {
    const url = `${URL_ROOT}/api/shared-links?apiKey=${VIEW_KEY}`;
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Response status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.log(error.message)
    }
}

async function getAlbumMapMarkers(id) {
    const url = `${URL_ROOT}/api/albums/${id}/map-markers?apiKey=${VIEW_KEY}`;
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Response status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.log(error.message)
    }
}

async function getAlbumLocationSummaries() {
    let sharedLinks = await getSharedLinks();
    console.log(`Got ${sharedLinks.length} links`)
    let albums = []

    await Promise.all(sharedLinks.map(async (link) => {
        let albumLocations = await getAlbumMapMarkers(link.album.id);
        let thisLocation = getRepresentativeLocation(albumLocations);
        albums.push({
            name: link.album.albumName,
            description: link.description,
            photoCount: albumLocations.length,
            hyperlink: `${URL_ROOT}/s/${link.slug}`,
            image: `${URL_ROOT}/api/assets/${link.album.albumThumbnailAssetId}/thumbnail?apiKey=${VIEW_KEY}`, 
            ...thisLocation
        });
    }));

    return albums;

    function getRepresentativeLocation(locations) {
        if (!locations || locations.length === 0) return null;
        
        const sorted = [...locations].sort((a,b) => a.lat - b.lat || a.lon - b.lon);
        return sorted[Math.floor(sorted.length/2)]
    }
}

function getNavGroupName(element) {
    const $element = $(element);
    if (!$element.is("ul")) return undefined;

    const $title = $element.children("li").first().find("p").first();
    return $title.length ? $title.text() : undefined;
}

function adjustTextureAspect(texture, fitType = 'cover') {
    const image = texture.image;
    const imageWidth = image?.naturalWidth || image?.width;
    const imageHeight = image?.naturalHeight || image?.height;
    if (!imageWidth || !imageHeight) return;

  // 1. Enable wrapping so the offset/repeat calculations work correctly
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;

  // 2. Calculate aspect ratios
    const imageAspect = imageWidth / imageHeight;

    if (imageAspect > 1) {
            texture.repeat.set(1 / imageAspect, 1);
            texture.offset.set((1 - (1 / imageAspect)) / 2, 0);
    } else {
            texture.repeat.set(1, imageAspect);
            texture.offset.set(0, (1 - imageAspect) / 2);
    }
}

window.addEventListener('resize', onWindowResize, false);
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
    controls.update(); 
}