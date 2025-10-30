import { Injectable, NgZone } from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { ShelfConfig, MaterialType } from '../models/shelf-config.model';

@Injectable({ providedIn: 'root' })
export class ThreeService {
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private controls!: OrbitControls;
  private bookshelfGroup: THREE.Group | null = null;
  private textureLoader = new THREE.TextureLoader();

  private materials: { [key in MaterialType]: THREE.Material } = {
    'Gloss White': new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.1,
        metalness: 0.2,
    }),
    'Matte Black': new THREE.MeshStandardMaterial({
        color: 0x111111,
        roughness: 0.9,
        metalness: 0.1,
    }),
  };

  constructor(private ngZone: NgZone) {}

  public init(canvas: HTMLCanvasElement): void {
    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x334155); // slate-700
    this.scene.fog = new THREE.Fog(0x334155, 300, 800);

    // Camera
    this.camera = new THREE.PerspectiveCamera(50, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
    this.camera.position.set(150, 150, 300);
    this.camera.lookAt(this.scene.position);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 100;
    this.controls.maxDistance = 600;
    this.controls.target.set(0, 50, 0);
    this.controls.update();

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
    directionalLight.position.set(100, 200, 150);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 50;
    directionalLight.shadow.camera.far = 600;
    directionalLight.shadow.camera.left = -300;
    directionalLight.shadow.camera.right = 300;
    directionalLight.shadow.camera.top = 300;
    directionalLight.shadow.camera.bottom = -300;
    this.scene.add(directionalLight);
    
    // Ground Plane
    const groundGeo = new THREE.PlaneGeometry(1000, 1000);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9 }); // slate-800
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    ground.receiveShadow = true;
    this.scene.add(ground);
    
    // Initial animation call
    this.animate();

    // Handle window resize
    window.addEventListener('resize', () => this.onWindowResize(canvas));
  }
  
  private onWindowResize(canvas: HTMLCanvasElement): void {
      const parent = canvas.parentElement;
      if (!parent) return;

      const newWidth = parent.clientWidth;
      const newHeight = parent.clientHeight;

      canvas.width = newWidth;
      canvas.height = newHeight;
      
      this.camera.aspect = newWidth / newHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(newWidth, newHeight);
  }

  public updateBookshelf(config: ShelfConfig): void {
    if (!this.scene) {
      // Guard against running before init
      return;
    }
    
    if (this.bookshelfGroup) {
      this.scene.remove(this.bookshelfGroup);
      this.bookshelfGroup.traverse((object) => {
          if (object instanceof THREE.Mesh) {
              object.geometry.dispose();
          }
          if (object instanceof THREE.PointLight) {
              object.dispose();
          }
      });
    }

    this.bookshelfGroup = new THREE.Group();
    const material = this.materials[config.material];
    const t = config.boardThickness;
    const useRoundedEdges = config.edgeProfile === 'Rounded/Beveled';
    const edgeRadius = useRoundedEdges ? Math.min(t * 0.2, 0.5) : 0;
    const segments = useRoundedEdges ? 4 : 1;

    // Helper to create boards
    const createBoard = (width: number, height: number, depth: number) => {
        if(useRoundedEdges) {
            return new RoundedBoxGeometry(width, height, depth, segments, edgeRadius);
        }
        return new THREE.BoxGeometry(width, height, depth);
    };

    const halfW = config.width / 2;
    const halfH = config.height / 2;
    const halfD = config.depth / 2;
    
    // Bottom
    const bottomMesh = new THREE.Mesh(createBoard(config.width, t, config.depth), material);
    bottomMesh.position.y = t / 2;
    this.bookshelfGroup.add(bottomMesh);

    // Top
    const topMesh = new THREE.Mesh(createBoard(config.width, t, config.depth), material);
    topMesh.position.y = config.height - t / 2;
    this.bookshelfGroup.add(topMesh);

    // Left Side
    const sideH = config.height - 2 * t;
    const leftMesh = new THREE.Mesh(createBoard(t, sideH, config.depth), material);
    leftMesh.position.set(-halfW + t / 2, halfH, 0);
    this.bookshelfGroup.add(leftMesh);

    // Right Side
    const rightMesh = new THREE.Mesh(createBoard(t, sideH, config.depth), material);
    rightMesh.position.set(halfW - t / 2, halfH, 0);
    this.bookshelfGroup.add(rightMesh);
    
    // Back Panel
    const backMesh = new THREE.Mesh(createBoard(config.width - 2 * t, config.height - 2 * t, t), material);
    backMesh.position.set(0, halfH, -halfD + t/2);
    this.bookshelfGroup.add(backMesh);

    // Apply shadows to all main components
    this.bookshelfGroup.children.forEach(c => {
        c.castShadow = true;
        c.receiveShadow = true;
    });

    // --- Internal Structure ---
    const innerW = config.width - 2 * t;
    const innerH = config.height - 2 * t;
    
    // Internal Horizontal Shelves
    if (config.horizontalLevels > 1) {
        const hShelfGeo = createBoard(innerW, t, config.depth - t);
        const spacePerLevel = (innerH + t) / config.horizontalLevels;
        for (let i = 1; i < config.horizontalLevels; i++) {
            const hShelfMesh = new THREE.Mesh(hShelfGeo, material);
            const yPos = i * spacePerLevel;
            hShelfMesh.position.set(0, yPos, t / 2);
            hShelfMesh.castShadow = true;
            hShelfMesh.receiveShadow = true;
            this.bookshelfGroup.add(hShelfMesh);
        }
    }

    // Internal Vertical Dividers
    if (config.verticalDivisions > 1) {
        const vDividerGeo = createBoard(t, innerH, config.depth - t);
        const spacePerSection = (innerW + t) / config.verticalDivisions;
        for (let i = 1; i < config.verticalDivisions; i++) {
            const vDividerMesh = new THREE.Mesh(vDividerGeo, material);
            const xPos = -innerW / 2 - t / 2 + i * spacePerSection;
            vDividerMesh.position.set(xPos, halfH, t / 2);
            vDividerMesh.castShadow = true;
            vDividerMesh.receiveShadow = true;
            this.bookshelfGroup.add(vDividerMesh);
        }
    }
    
    // --- Add-ons ---
    this.createAddons(config, innerW, innerH);
    
    this.scene.add(this.bookshelfGroup);
    
    const box = new THREE.Box3().setFromObject(this.bookshelfGroup);
    const center = box.getCenter(new THREE.Vector3());
    this.controls.target.copy(center);
    this.controls.update();
  }

  private createAddons(config: ShelfConfig, innerW: number, innerH: number): void {
    if (!config.doors && !config.lamps && !config.hangers) return;

    const t = config.boardThickness;
    const cellW = (innerW - (config.verticalDivisions - 1) * t) / config.verticalDivisions;
    const cellH = (innerH - (config.horizontalLevels - 1) * t) / config.horizontalLevels;
    
    const handleMaterial = new THREE.MeshStandardMaterial({
        color: 0xbbbbbb,
        roughness: 0.2,
        metalness: 1.0,
    });
    const doorMaterial = this.materials[config.material];
    
    // Add Doors (Full Height)
    if (config.doors) {
      const doorHeight = innerH - 0.5;
      const handleHeight = doorHeight * 0.25;
      const handleGeo = new THREE.CylinderGeometry(0.5, 0.5, handleHeight, 16); // Vertical handle
      
      for (let col = 0; col < config.verticalDivisions; col++) {
          const cellCenterX = -innerW / 2 + col * (cellW + t) + cellW / 2;
          
          const doorGroup = new THREE.Group();
          const doorWidth = cellW - 0.5;
          
          const doorGeo = new THREE.BoxGeometry(doorWidth, doorHeight, 1);
          const doorMesh = new THREE.Mesh(doorGeo, doorMaterial);
          
          const handleMesh = new THREE.Mesh(handleGeo, handleMaterial);
          // Position handle near the right edge, vertically centered on the door
          handleMesh.position.set(doorWidth / 2 - 2, 0, 1);
          
          doorGroup.add(doorMesh, handleMesh);
          
          // Position the entire door group in front of the cabinet
          doorGroup.position.set(
              cellCenterX, 
              config.height / 2, // Vertically center in the cabinet's inner space
              config.depth / 2 - 0.5
          );
          
          doorGroup.traverse(obj => { obj.castShadow = true; });
          this.bookshelfGroup?.add(doorGroup);
      }
    }

    // Cell-based addons
    for (let row = 0; row < config.horizontalLevels; row++) {
        for (let col = 0; col < config.verticalDivisions; col++) {
            const cellCenterX = -innerW / 2 + col * (cellW + t) + cellW / 2;
            const cellCenterY = t + row * (cellH + t) + cellH / 2;
            const cellCenterZ = config.depth / 2 - t / 2;
            
            // Add Lamps
            if (config.lamps) {
                const lampLight = new THREE.PointLight(0xffeebb, 100, cellW * 1.5);
                lampLight.position.set(cellCenterX, cellCenterY + cellH/2 - 1.5, cellCenterZ - 5);
                this.bookshelfGroup?.add(lampLight);

                const fixtureGeo = new THREE.CylinderGeometry(3, 3, 0.5, 16);
                const fixtureMat = new THREE.MeshBasicMaterial({ color: 0x222222 });
                const fixtureMesh = new THREE.Mesh(fixtureGeo, fixtureMat);
                // Position fixture so it's slightly recessed into the shelf above
                fixtureMesh.position.set(cellCenterX, cellCenterY + cellH/2, cellCenterZ - 5);
                fixtureMesh.rotation.x = Math.PI / 2;
                this.bookshelfGroup?.add(fixtureMesh);
            }

             // Add Hanger (all top sections)
            if (config.hangers && row === config.horizontalLevels - 1) {
                const railGeo = new THREE.CylinderGeometry(0.75, 0.75, cellW - 2, 20);
                const railMesh = new THREE.Mesh(railGeo, handleMaterial);
                railMesh.rotation.z = Math.PI / 2;
                railMesh.position.set(cellCenterX, cellCenterY + cellH/2 - 5, cellCenterZ - config.depth/4);
                railMesh.castShadow = true;
                this.bookshelfGroup?.add(railMesh);
            }
        }
    }
  }
  
  private animate(): void {
    this.ngZone.runOutsideAngular(() => {
        requestAnimationFrame(() => this.animate());
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    });
  }
}