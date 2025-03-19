import * as THREE from 'three';
import { PlayerType, PlayerState, Vector3 } from '../../shared/types';
import { InputState } from './InputHandler';
import * as CANNON from 'cannon-es';

export class Player {
    private type: PlayerType;
    private id: string = '';
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera | null;
    private mesh: THREE.Mesh;
    private carBody: CANNON.Body | null = null;
    private isLocalPlayer: boolean;
    private nameLabel: THREE.Sprite | null = null;
    private playerName: string = 'Player';
    private health: number;
    private boostCharges: number;
    private boostCooldown: number;
    private lastBoostTime: number;
    private isAlive: boolean;
    private moveSpeed: number;
    private turnSpeed: number;
    private boostSpeed: number;
    private physicsWorldAdded: boolean = false;
    private cameraDistance: number = 10;
    private cameraHeight: number = 4;
    private cameraLookAtHeight: number = 2;
    private lastShootTime: number = 0;
    private shootCooldown: number = 500; // 500ms between shots
    private shieldCharges: number = 3;
    private maxShieldCharges: number = 3;
    private shieldHealth: number = 0;
    private maxShieldHealth: number = 50;
    private shieldActive: boolean = false;
    private lastShieldTime: number = 0;
    private shieldCooldown: number = 8000; // 8 seconds
    private invisibilityCharges: number = 3;
    private maxInvisibilityCharges: number = 3;
    private isInvisible: boolean = false;
    private lastInvisibilityTime: number = 0;
    private invisibilityCooldown: number = 10000; // 10 seconds
    private invisibilityDuration: number = 6000; // 6 seconds
    private flameActive: boolean = false;
    private lastFlameTime: number = 0;
    private flameCooldown: number = 15000; // 15 seconds
    private flameDuration: number = 6000; // 6 seconds
    private flameEffect: THREE.Group | null = null;
    private groundRayLength: number = 1.0; // Length of the ray for ground detection
    private weapon: THREE.Group = new THREE.Group();
    private flameParticles: THREE.Points | null = null;

    constructor(
        type: PlayerType, 
        scene: THREE.Scene, 
        camera: THREE.PerspectiveCamera | null = null,
        isLocalPlayer: boolean = false,
        playerName: string = 'Player'
    ) {
        this.type = type;
        this.scene = scene;
        this.camera = camera;
        this.isLocalPlayer = isLocalPlayer;
        this.playerName = playerName;
        
        // Create mesh for the player using original method
        this.mesh = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), new THREE.MeshBasicMaterial({ visible: false }));
        this.scene.add(this.mesh);
        
        // Add name label if not the local player
        if (!this.isLocalPlayer) {
            this.createNameLabel();
        }
        
        // Initialize properties based on player type
        this.health = type === PlayerType.HUNTER ? 80 : 100;
        this.boostCharges = 3;
        this.boostCooldown = 5000; // 5 seconds
        this.lastBoostTime = 0;
        this.isAlive = true;
        this.moveSpeed = type === PlayerType.HUNTER ? 20 : 25;
        this.turnSpeed = 1.5;
        this.boostSpeed = type === PlayerType.HUNTER ? 35 : 45;
        
        console.log("Creating physics body");
        this.createPhysicsBody();
        
        console.log("Creating mesh");
        this.createMesh();
    }

    init(): void {
        console.log("Initializing player");
        try {
            // Set initial position
            console.log("Setting initial position");
            this.mesh.position.set(0, 1, 0);
            this.carBody!.position.copy(this.mesh.position as any);
            
            // Update HUD
            console.log("Updating HUD");
            this.updateHUD();
            
            console.log("Player initialized successfully");
        } catch (error) {
            console.error("Error initializing player:", error);
            if (error instanceof Error) {
                console.error("Error details:", error.message);
                console.error("Stack trace:", error.stack);
            }
            throw error;
        }
    }

    private createPhysicsBody(): void {
        console.log("Creating physics body");
        try {
            // Create a box shape for the car
            const shape = new CANNON.Box(new CANNON.Vec3(1, 0.5, 2));
            
            // Create the physics body with car-like properties
            this.carBody = new CANNON.Body({
                mass: 1000,
                shape: shape,
                material: new CANNON.Material({
                    friction: 0.7,
                    restitution: 0.2
                }),
                fixedRotation: true, // Force car to stay upright
                allowSleep: false
            });
            
            // Set initial position
            this.carBody.position.set(0, 0.6, 0);
            
            // Set damping to simulate air/ground resistance
            this.carBody.linearDamping = 0.2;
            this.carBody.angularDamping = 0.9;
            
            // Lock rotation completely except for Y-axis
            this.carBody.angularFactor.set(0, 1, 0);
            
            console.log("Physics body created successfully");
        } catch (error) {
            console.error("Error creating physics body:", error);
            throw error;
        }
    }

    private updateCameraPosition(): void {
        if (!this.camera) return;

        const input = (window as any).lastInputState;
        const lookAround = input?.lookAround || false;
        
        // Calculate normal camera position (behind the car)
        const cameraOffset = new THREE.Vector3(
            0,
            this.cameraHeight,
            -this.cameraDistance
        );
        
        // Rotate offset based on car's rotation
        cameraOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.mesh.rotation.y);
        
        // Set normal camera target position relative to car
        const normalPosition = this.mesh.position.clone().add(cameraOffset);
        
        // Look at point slightly above the car
        const lookAtPoint = this.mesh.position.clone();
        lookAtPoint.y += this.cameraLookAtHeight;

        if (lookAround) {
            // Free look mode when left mouse button is held
            const sensitivity = 0.01; // Reduced sensitivity for camera movement
            const mouseX = input?.mouseX || 0;
            const mouseY = input?.mouseY || 0;
            
            // Apply mouse movement to camera rotation
            // Create a pivot point at the car's position
            const pivotPoint = this.mesh.position.clone();
            
            // Calculate new camera position based on current angles
            const theta = mouseX * sensitivity; // Horizontal angle
            const phi = Math.max(-Math.PI/3, Math.min(Math.PI/6, mouseY * sensitivity)); // Vertical angle with limits
            
            // Calculate target distance from pivot
            const distance = this.cameraDistance + 2; // Slightly further away when in look-around mode
            
            // Create offset from pivot point
            const offset = new THREE.Vector3(
                Math.sin(theta) * Math.cos(phi) * distance,
                Math.sin(phi) * distance,
                Math.cos(theta) * Math.cos(phi) * distance
            );
            
            // Set camera position based on car's position and offset
            const targetPosition = pivotPoint.clone().add(offset);
            this.camera.position.copy(targetPosition);
            
            // Look at player
            this.camera.lookAt(pivotPoint);
        } else {
            // When left mouse button is released, smoothly return to normal position
            this.camera.position.lerp(normalPosition, 0.1);
            this.camera.lookAt(lookAtPoint);
        }
    }

    private createMesh(): void {
        console.log("Creating player mesh for type:", this.type);
        if (this.type === PlayerType.TESLA) {
            // Create a simple Tesla-like car model with white color
            const carGroup = new THREE.Group();
            
            // Car body - white for Tesla
            const bodyGeometry = new THREE.BoxGeometry(3, 1, 5);
            const bodyMaterial = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
            const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
            body.position.y = 0.8;
            carGroup.add(body);
            
            // Car top
            const topGeometry = new THREE.BoxGeometry(2.5, 0.7, 3);
            const topMaterial = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
            const top = new THREE.Mesh(topGeometry, topMaterial);
            top.position.set(0, 1.6, -0.2);
            carGroup.add(top);
            
            // Wheels
            const wheelGeometry = new THREE.CylinderGeometry(0.5, 0.5, 0.4, 8);
            const wheelMaterial = new THREE.MeshBasicMaterial({ color: 0x333333 });
            
            // Front left wheel
            const wheelFL = new THREE.Mesh(wheelGeometry, wheelMaterial);
            wheelFL.position.set(-1.6, 0.5, 1.3);
            wheelFL.rotation.z = Math.PI / 2;
            carGroup.add(wheelFL);
            
            // Front right wheel
            const wheelFR = new THREE.Mesh(wheelGeometry, wheelMaterial);
            wheelFR.position.set(1.6, 0.5, 1.3);
            wheelFR.rotation.z = Math.PI / 2;
            carGroup.add(wheelFR);
            
            // Rear left wheel
            const wheelRL = new THREE.Mesh(wheelGeometry, wheelMaterial);
            wheelRL.position.set(-1.6, 0.5, -1.3);
            wheelRL.rotation.z = Math.PI / 2;
            carGroup.add(wheelRL);
            
            // Rear right wheel
            const wheelRR = new THREE.Mesh(wheelGeometry, wheelMaterial);
            wheelRR.position.set(1.6, 0.5, -1.3);
            wheelRR.rotation.z = Math.PI / 2;
            carGroup.add(wheelRR);
            
            // Headlights
            const headlightGeometry = new THREE.BoxGeometry(0.5, 0.2, 0.1);
            const headlightMaterial = new THREE.MeshBasicMaterial({ color: 0xffffcc });
            
            // Front left headlight
            const headlightFL = new THREE.Mesh(headlightGeometry, headlightMaterial);
            headlightFL.position.set(-1, 0.9, 2.5);
            carGroup.add(headlightFL);
            
            // Front right headlight
            const headlightFR = new THREE.Mesh(headlightGeometry, headlightMaterial);
            headlightFR.position.set(1, 0.9, 2.5);
            carGroup.add(headlightFR);
            
            // Taillights
            const taillightGeometry = new THREE.BoxGeometry(0.5, 0.2, 0.1);
            const taillightMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
            
            // Rear left taillight
            const taillightRL = new THREE.Mesh(taillightGeometry, taillightMaterial);
            taillightRL.position.set(-1, 0.9, -2.5);
            carGroup.add(taillightRL);
            
            // Rear right taillight
            const taillightRR = new THREE.Mesh(taillightGeometry, taillightMaterial);
            taillightRR.position.set(1, 0.9, -2.5);
            carGroup.add(taillightRR);
            
            // Set rotation to face forward
            carGroup.rotation.y = Math.PI;
            
            this.mesh.add(carGroup);
            
        } else {
            // Create simplified Hunter model
            const hunterGroup = new THREE.Group();
            
            // Main body with simplified design
            const bodyGeometry = new THREE.BoxGeometry(2.2, 1.2, 3.5);
            const bodyMaterial = new THREE.MeshPhongMaterial({ 
                color: 0xBF360C,
                shininess: 60
            });
            const bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
            bodyMesh.position.y = 0.6;
            bodyMesh.castShadow = true;
            bodyMesh.receiveShadow = true;
            hunterGroup.add(bodyMesh);
            
            // Front armor plate
            const armorGeometry = new THREE.BoxGeometry(2.3, 0.8, 0.4);
            const armorMaterial = new THREE.MeshStandardMaterial({
                color: 0x555555,
                metalness: 0.7,
                roughness: 0.3
            });
            const armorMesh = new THREE.Mesh(armorGeometry, armorMaterial);
            armorMesh.position.set(0, 0.5, 1.9);
            armorMesh.castShadow = true;
            hunterGroup.add(armorMesh);
            
            // Turret base - simplified
            const turretBaseGeometry = new THREE.CylinderGeometry(0.6, 0.6, 0.4, 8); // Reduced from 16
            const turretBaseMaterial = new THREE.MeshStandardMaterial({
                color: 0x444444,
                metalness: 0.8,
                roughness: 0.2
            });
            const turretBase = new THREE.Mesh(turretBaseGeometry, turretBaseMaterial);
            turretBase.position.set(0, 1.2, 0);
            hunterGroup.add(turretBase);
            
            // Main weapon with simplified detailing
            const weaponGroup = new THREE.Group();
            
            // Barrel
            const barrelGeometry = new THREE.CylinderGeometry(0.15, 0.2, 2.5, 8); // Reduced from 16
            const barrelMaterial = new THREE.MeshStandardMaterial({
                color: 0x333333,
                metalness: 0.9,
                roughness: 0.1
            });
            const barrel = new THREE.Mesh(barrelGeometry, barrelMaterial);
            barrel.rotation.x = Math.PI / 2;
            barrel.position.z = 1.25;
            weaponGroup.add(barrel);
            
            // Muzzle brake - simplified
            const muzzleGeometry = new THREE.CylinderGeometry(0.25, 0.3, 0.3, 8); // Reduced from 16
            const muzzleMaterial = new THREE.MeshStandardMaterial({
                color: 0x222222,
                metalness: 1.0,
                roughness: 0.1
            });
            const muzzle = new THREE.Mesh(muzzleGeometry, muzzleMaterial);
            muzzle.rotation.x = Math.PI / 2;
            muzzle.position.z = 2.35;
            weaponGroup.add(muzzle);
            
            // Position the weapon group
            weaponGroup.position.set(0, 1.2, 0.5);
            hunterGroup.add(weaponGroup);
            
            // Simplified wheels
            const wheelGeometry = new THREE.CylinderGeometry(0.45, 0.45, 0.4, 12); // Reduced from 24
            const wheelMaterial = new THREE.MeshPhongMaterial({ 
                color: 0x111111,
                shininess: 30
            });
            
            const wheelPositions = [
                [-1.1, 0, 1.3],   // Front left
                [1.1, 0, 1.3],    // Front right
                [-1.1, 0, -1.3],  // Rear left
                [1.1, 0, -1.3]    // Rear right
            ];
            
            wheelPositions.forEach(position => {
                const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
                wheel.rotation.z = Math.PI / 2;
                wheel.position.set(position[0], position[1], position[2]);
                wheel.castShadow = true;
                hunterGroup.add(wheel);
            });
            
            this.mesh.add(hunterGroup);
        }
    }
    
    private createExhaustEffect(position: THREE.Vector3): void {
        if (this.type !== PlayerType.HUNTER) return;
        
        const createSmoke = () => {
            // Use simpler geometry for smoke particles
            const smokeGeometry = new THREE.SphereGeometry(0.1, 4, 4); // Reduced segments from 8 to 4
            const smokeMaterial = new THREE.MeshBasicMaterial({
                color: 0x888888,
                transparent: true,
                opacity: 0.6
            });
            
            const smoke = new THREE.Mesh(smokeGeometry, smokeMaterial);
            
            // Position relative to exhaust
            const offset = new THREE.Vector3(
                (Math.random() - 0.5) * 0.1,
                (Math.random() - 0.5) * 0.1,
                -0.2 - Math.random() * 0.2
            );
            
            // Apply car's rotation to the offset
            offset.applyQuaternion(this.mesh.quaternion);
            
            // Set position
            smoke.position.copy(position.clone().add(offset));
            this.scene.add(smoke);
            
            // Animate smoke
            let scale = 1.0;
            let opacity = 0.6;
            const animateSmoke = () => {
                scale += 0.03;
                opacity -= 0.01;
                
                smoke.scale.set(scale, scale, scale);
                (smoke.material as THREE.MeshBasicMaterial).opacity = opacity;
                
                smoke.position.y += 0.02; // Rise
                
                // Apply small random movement
                smoke.position.x += (Math.random() - 0.5) * 0.01;
                smoke.position.z -= 0.03; // Move backward
                
                if (opacity > 0.05) {
                    requestAnimationFrame(animateSmoke);
                } else {
                    this.scene.remove(smoke);
                    smokeGeometry.dispose();
                    smokeMaterial.dispose();
                }
            };
            
            animateSmoke();
        };
        
        // Create smoke at less frequent intervals
        const smokeInterval = setInterval(() => {
            if (!this.isAlive || !this.physicsWorldAdded) {
                clearInterval(smokeInterval);
                return;
            }
            
            // Only create smoke when moving or moving slowly
            const speed = new THREE.Vector3(
                this.carBody!.velocity.x,
                0,
                this.carBody!.velocity.z
            ).length();
            
            if (speed < 5) {
                createSmoke();
            }
        }, 200); // Reduced frequency from 100ms to 200ms
    }

    private createProjectile(): void {
        if (this.type !== PlayerType.HUNTER) return;

        // Create projectile geometry with lower polygon count
        const projectileGeometry = new THREE.SphereGeometry(0.2, 6, 6); // Reduced from 8,8
        const projectileMaterial = new THREE.MeshPhongMaterial({
            color: 0xFF0000,
            emissive: 0xFF4500,
            emissiveIntensity: 0.5
        });
        const projectile = new THREE.Mesh(projectileGeometry, projectileMaterial);

        // Position projectile at the weapon tip
        const weaponOffset = new THREE.Vector3(0, 0.8, 2);
        weaponOffset.applyQuaternion(this.mesh.quaternion);
        projectile.position.copy(this.mesh.position).add(weaponOffset);

        // Get forward direction for projectile movement
        const direction = new THREE.Vector3(0, 0, 1);
        direction.applyQuaternion(this.mesh.quaternion);

        // Add to scene
        this.scene.add(projectile);

        // Create and add particle effect
        this.createMuzzleFlash(projectile.position.clone());

        // Animate projectile
        const speed = 30; // units per second
        const maxDistance = 50; // maximum travel distance
        const startPos = projectile.position.clone();

        const animateProjectile = () => {
            if (!this.isAlive) {
                this.scene.remove(projectile);
                projectileGeometry.dispose();
                projectileMaterial.dispose();
                return;
            }

            // Move projectile
            projectile.position.add(direction.clone().multiplyScalar(speed * 0.016)); // 0.016 is roughly 60fps

            // Check if projectile has traveled too far
            if (projectile.position.distanceTo(startPos) > maxDistance) {
                this.scene.remove(projectile);
                projectileGeometry.dispose();
                projectileMaterial.dispose();
                return;
            }

            requestAnimationFrame(animateProjectile);
        };

        animateProjectile();
    }

    private createMuzzleFlash(position: THREE.Vector3): void {
        // Create muzzle flash with lower polygon count
        const flashGeometry = new THREE.SphereGeometry(0.5, 4, 4); // Reduced from 8,8
        const flashMaterial = new THREE.MeshBasicMaterial({
            color: 0xFFFF00,
            transparent: true,
            opacity: 1
        });
        const flash = new THREE.Mesh(flashGeometry, flashMaterial);
        flash.position.copy(position);
        this.scene.add(flash);

        // Animate muzzle flash
        let scale = 1;
        const animateFlash = () => {
            scale *= 0.8;
            flash.scale.set(scale, scale, scale);
            (flash.material as THREE.MeshBasicMaterial).opacity = scale;

            if (scale > 0.1) {
                requestAnimationFrame(animateFlash);
            } else {
                this.scene.remove(flash);
                flashGeometry.dispose();
                flashMaterial.dispose();
            }
        };

        animateFlash();
    }

    private createFlameEffect(): void {
        if (!this.mesh) return;
        
        // Create a flame cone mesh with increased range
        const flameLength = 25; // Increased from original value for longer range
        const flameGeometry = new THREE.ConeGeometry(8, flameLength, 16);
        const flameMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xff4500, 
            transparent: true, 
            opacity: 0.7 
        });
        
        // Create flame mesh and group to hold the flame effects
        const flameMesh = new THREE.Mesh(flameGeometry, flameMaterial);
        this.flameEffect = new THREE.Group();
        this.flameEffect.add(flameMesh);
        
        // Position the flame in front of the weapon
        flameMesh.position.set(0, 0, flameLength/2 + 2);
        flameMesh.rotation.x = -Math.PI / 2;
        
        // Add to weapon
        if (this.weapon) {
            this.weapon.add(this.flameEffect);
        }
        
        // Create flame particles for a more realistic effect
        const particlesCount = 50; // More particles for a denser effect
        const particlesGeometry = new THREE.BufferGeometry();
        const particlesMaterial = new THREE.PointsMaterial({
            color: 0xff8c00,
            size: 0.8,
            transparent: true,
            opacity: 0.8
        });
        
        const particlesPositions = new Float32Array(particlesCount * 3);
        for (let i = 0; i < particlesCount; i++) {
            // Distribute particles along the cone with extended range
            const z = Math.random() * flameLength;
            const radius = 2 + (flameLength - z) / flameLength * 6; // Wider at the end
            const angle = Math.random() * Math.PI * 2;
            
            particlesPositions[i * 3] = Math.cos(angle) * radius;
            particlesPositions[i * 3 + 1] = Math.sin(angle) * radius;
            particlesPositions[i * 3 + 2] = z;
        }
        
        particlesGeometry.setAttribute('position', new THREE.BufferAttribute(particlesPositions, 3));
        this.flameParticles = new THREE.Points(particlesGeometry, particlesMaterial);
        this.flameParticles.rotation.x = -Math.PI / 2;
        this.flameParticles.position.z = 2;
        
        if (this.flameEffect) {
            this.flameEffect.add(this.flameParticles);
        }
        
        // Hide initially
        if (this.flameEffect) {
            this.flameEffect.visible = false;
        }
    }

    private activateFlamethrower(): void {
        if (!this.isAlive || !this.flameEffect) return;
        
        // Show flame effect
        this.flameEffect.visible = true;
        
        // Start hit detection for flame
        this.applyFlameHitDetection();
        
        // Set timeout to hide flame after duration
        setTimeout(() => {
            if (this.flameEffect) {
                this.flameEffect.visible = false;
                this.flameActive = false;
            }
        }, this.flameDuration);
    }

    private applyFlameHitDetection(): void {
        if (!this.mesh || !this.flameEffect) return;
        
        const checkForHits = () => {
            if (!this.flameActive || !this.isAlive) return;
            
            // Get the flamethrower's position and direction
            const flamePosition = new THREE.Vector3();
            const flameDirection = new THREE.Vector3(0, 0, 1);
            
            // Get the world position of the flame
            this.mesh.getWorldPosition(flamePosition);
            
            // Adjust position to match the flame's base
            flamePosition.y += 1.2; // Height of weapon on player
            
            // Apply the rotation of the player to the flame direction
            flameDirection.applyQuaternion(this.mesh.quaternion);
            
            // Increased flame hit range
            const flameRange = 25; // Extended range matching the visual flame length
            
            // Emit the hit detection event
            const socket = (window as any).socket;
            if (socket) {
                socket.emit('flameHit', {
                    origin: {
                        x: flamePosition.x,
                        y: flamePosition.y,
                        z: flamePosition.z
                    },
                    direction: {
                        x: flameDirection.x,
                        y: flameDirection.y,
                        z: flameDirection.z
                    },
                    range: flameRange,
                    angle: Math.PI / 6 // 30-degree cone
                });
            }
            
            // Continue checking for hits while the flame is active
            if (this.flameActive) {
                setTimeout(checkForHits, 100); // Check every 100ms
            }
        };
        
        checkForHits();
    }

    update(deltaTime: number, input: InputState): void {
        if (!this.isAlive || !this.physicsWorldAdded) return;
        
        // Store the input state on the window for the camera to access
        (window as any).lastInputState = input;

        // Handle abilities first
        this.handleAbilities(input);

        // Car movement controls
        const acceleration = input.forward ? 1 : input.backward ? -1 : 0;
        const steering = input.right ? -1 : input.left ? 1 : 0;

        // Calculate forward direction based on current rotation
        const forwardDir = new THREE.Vector3(0, 0, 1);
        forwardDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.mesh.rotation.y);
        forwardDir.normalize();

        // Get current velocity
        const currentVelocity = new THREE.Vector3(
            this.carBody!.velocity.x,
            0, // Ignore vertical velocity for speed calculation
            this.carBody!.velocity.z
        );
        const currentSpeed = currentVelocity.length();

        // Apply steering (rotate the car)
        if (steering !== 0 && (acceleration !== 0 || currentSpeed > 0.5)) {
            // Better turning
            const turnMultiplier = Math.min(1.0, currentSpeed / 10); 
            this.mesh.rotation.y += steering * this.turnSpeed * turnMultiplier * deltaTime;
            
            // Update physics body rotation
            const quaternion = new CANNON.Quaternion();
            quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), this.mesh.rotation.y);
            this.carBody!.quaternion.copy(quaternion);
        }

        // Calculate target speed
        let targetSpeed = input.boost && this.boostCharges > 0 ? this.boostSpeed : this.moveSpeed;
        targetSpeed *= acceleration;

        // Direct velocity control for car-like movement
        if (acceleration !== 0) {
            // Set x and z velocities directly based on car's forward direction
            const newVelocity = new CANNON.Vec3(
                forwardDir.x * targetSpeed,
                0, // Keep y velocity at 0 to prevent jumping
                forwardDir.z * targetSpeed
            );
            
            // Blend current and target velocity for smoother acceleration
            this.carBody!.velocity.x = 0.85 * this.carBody!.velocity.x + 0.15 * newVelocity.x;
            this.carBody!.velocity.z = 0.85 * this.carBody!.velocity.z + 0.15 * newVelocity.z;
        } else {
            // Gradually slow down when no input
            this.carBody!.velocity.x *= 0.95;
            this.carBody!.velocity.z *= 0.95;
        }
        
        // Force car to stay at a fixed height
        this.carBody!.position.y = 0.6; // Fixed height above ground
        this.carBody!.velocity.y = 0;   // Zero vertical velocity
        
        // Handle boost
        if (input.boost && this.boostCharges > 0 && acceleration !== 0) {
            const currentTime = performance.now();
            if (currentTime - this.lastBoostTime >= this.boostCooldown) {
                this.boostCharges--;
                this.lastBoostTime = currentTime;
            }
        }

        // Update mesh position from physics
        this.mesh.position.copy(this.carBody!.position as any);
        
        // Update camera
        if (this.camera) {
            this.updateCameraPosition();
        }

        // Update HUD
        this.updateHUD();
    }

    private handleAbilities(input: InputState): void {
        // Tesla abilities
        if (this.type === PlayerType.TESLA) {
            this.handleTeslaAbilities(input);
        }
        // Hunter abilities
        else if (this.type === PlayerType.HUNTER) {
            this.handleHunterAbilities(input);
        }
    }

    private handleTeslaAbilities(input: InputState): void {
        // Shield ability (J key)
        if (input.shield && this.shieldCharges > 0 && !this.shieldActive && 
            Date.now() - this.lastShieldTime > this.shieldCooldown) {
            this.activateShield();
        }
        
        // Invisibility ability (I key)
        if (input.shoot && this.invisibilityCharges > 0 && !this.isInvisible && 
            Date.now() - this.lastInvisibilityTime > this.invisibilityCooldown) {
            this.activateInvisibility();
        }
    }

    private handleHunterAbilities(input: InputState): void {
        // Handle shooting
        if (input.shoot && Date.now() - this.lastShootTime > this.shootCooldown) {
            this.lastShootTime = Date.now();
            this.createProjectile();
            this.createMuzzleFlash(new THREE.Vector3(0, 1.2, 2.5));
        }
        
        // Handle flame thrower
        if (input.shield && !this.flameActive && Date.now() - this.lastFlameTime > this.flameCooldown) {
            this.flameActive = true;
            this.lastFlameTime = Date.now();
            
            // Create flame effect if it doesn't exist
            if (!this.flameEffect) {
                // Initialize weapon for Hunter if not already done
                if (!this.weapon.parent && this.mesh) {
                    this.weapon = new THREE.Group();
                    this.weapon.position.set(0, 1.2, 0.5);
                    this.mesh.add(this.weapon);
                }
                this.createFlameEffect();
            }
            
            this.activateFlamethrower();
            this.updateHUD();
        }
    }

    private activateShield(): void {
        console.log("Activating shield!");
        this.shieldActive = true;
        this.shieldHealth = this.maxShieldHealth;
        this.shieldCharges--;
        this.lastShieldTime = Date.now();
        
        // Make the car mesh glow blue when shield is active
        const material = (this.mesh.children[0] as THREE.Mesh).material as THREE.MeshPhongMaterial;
        material.emissive.setHex(0x0044ff);
        material.emissiveIntensity = 0.5;

        // Disable shield after duration
        setTimeout(() => {
            this.shieldActive = false;
            material.emissive.setHex(0x000000);
            material.emissiveIntensity = 0;
        }, 5000);
    }

    private activateInvisibility(): void {
        console.log("Activating invisibility!");
        this.isInvisible = true;
        this.invisibilityCharges--;
        this.lastInvisibilityTime = Date.now();
        
        // Make the car completely invisible
        this.mesh.visible = false;
        
        // Show a fading effect before disappearing
        const fadeEffect = () => {
            let opacity = 1.0;
            const fadeInterval = setInterval(() => {
                opacity -= 0.1;
                this.mesh.traverse((child) => {
                    if (child instanceof THREE.Mesh) {
                        const material = child.material as THREE.MeshPhongMaterial;
                        material.transparent = true;
                        material.opacity = opacity;
                    }
                });
                
                if (opacity <= 0) {
                    clearInterval(fadeInterval);
                    this.mesh.visible = false;
                }
            }, 50);
        };
        
        fadeEffect();
        
        // Add subtle particle effects to show position without revealing the car
        const createGhostTrail = () => {
            if (!this.isInvisible) return;
            
            // Create a small particle at car's position
            const particleGeometry = new THREE.SphereGeometry(0.1, 4, 4);
            const particleMaterial = new THREE.MeshBasicMaterial({
                color: 0x88ccff,
                transparent: true,
                opacity: 0.3
            });
            
            const particle = new THREE.Mesh(particleGeometry, particleMaterial);
            particle.position.copy(this.mesh.position);
            particle.position.y += 0.2; // Slightly above ground
            this.scene.add(particle);
            
            // Fade out and remove
            setTimeout(() => {
                this.scene.remove(particle);
                particleGeometry.dispose();
                particleMaterial.dispose();
            }, 300);
            
            // Continue creating trail particles if still invisible
            if (this.isInvisible) {
                setTimeout(createGhostTrail, 200);
            }
        };
        
        createGhostTrail();
        
        // Disable invisibility after duration
        setTimeout(() => {
            this.isInvisible = false;
            this.mesh.visible = true;
            
            // Fade back in
            let opacity = 0;
            const fadeInInterval = setInterval(() => {
                opacity += 0.1;
                this.mesh.traverse((child) => {
                    if (child instanceof THREE.Mesh) {
                        const material = child.material as THREE.MeshPhongMaterial;
                        material.transparent = true;
                        material.opacity = opacity;
                    }
                });
                
                if (opacity >= 1) {
                    clearInterval(fadeInInterval);
                    this.mesh.traverse((child) => {
                        if (child instanceof THREE.Mesh) {
                            const material = child.material as THREE.MeshPhongMaterial;
                            material.transparent = false;
                            material.opacity = 1.0;
                        }
                    });
                }
            }, 50);
        }, this.invisibilityDuration);
    }

    private updateHUD(): void {
        // Update health bar
        const healthBar = document.getElementById('health-bar');
        const healthText = document.getElementById('health-text');
        if (healthBar) healthBar.style.width = `${(this.health / (this.type === PlayerType.TESLA ? 100 : 80)) * 100}%`;
        if (healthText) healthText.textContent = `${Math.ceil(this.health)}`;

        // Update boost charges
        const boostCharges = document.getElementById('boost-charges');
        if (boostCharges) boostCharges.textContent = `Boost: ${this.boostCharges}`;

        if (this.type === PlayerType.TESLA) {
            // Update Tesla-specific HUD
            const shieldCharges = document.getElementById('shield-charges');
            const invisibilityCharges = document.getElementById('invisibility-charges');
            const shieldBar = document.getElementById('shield-bar');

            if (shieldCharges) shieldCharges.textContent = `Shield: ${this.shieldCharges}`;
            if (invisibilityCharges) invisibilityCharges.textContent = `Invisibility: ${this.invisibilityCharges}`;
            if (shieldBar) shieldBar.style.width = this.shieldActive ? `${(this.shieldHealth / this.maxShieldHealth) * 100}%` : '0%';
        }

        // Update cooldown bars
        this.updateCooldownBar('boost-cooldown', this.lastBoostTime, this.boostCooldown);
        
        if (this.type === PlayerType.TESLA) {
            this.updateCooldownBar('shield-cooldown', this.lastShieldTime, this.shieldCooldown);
            this.updateCooldownBar('invisibility-cooldown', this.lastInvisibilityTime, this.invisibilityCooldown);
        } else {
            this.updateCooldownBar('shoot-cooldown', this.lastShootTime, this.shootCooldown);
            this.updateCooldownBar('flame-cooldown', this.lastFlameTime, this.flameCooldown);
        }
    }

    private updateCooldownBar(elementId: string, lastTime: number, cooldown: number): void {
        const element = document.getElementById(elementId);
        if (element) {
            const remaining = Math.max(0, cooldown - (Date.now() - lastTime));
            const percentage = (remaining / cooldown) * 100;
            element.style.width = `${percentage}%`;
        }
    }

    takeDamage(amount: number): void {
        this.health -= amount;
        if (this.health <= 0) {
            this.health = 0;
            this.isAlive = false;
        }
    }

    getState(): PlayerState {
        return {
            id: this.id,
            type: this.type,
            position: {
                x: this.mesh.position.x,
                y: this.mesh.position.y,
                z: this.mesh.position.z
            },
            rotation: {
                x: this.mesh.rotation.x,
                y: this.mesh.rotation.y,
                z: this.mesh.rotation.z
            },
            health: this.health,
            boostCharges: this.boostCharges,
            isAlive: this.isAlive
        };
    }

    updateState(state: PlayerState): void {
        this.id = state.id;
        // Only set player name once
        if (this.playerName === 'Player' && state.id) {
            this.playerName = this.type === PlayerType.TESLA ? `Tesla ${state.id.substr(0, 3)}` : `Hunter ${state.id.substr(0, 3)}`;
            
            // Update name label if it exists
            if (this.nameLabel) {
                this.mesh.remove(this.nameLabel);
                this.createNameLabel();
            }
        }
        
        // Update position
        if (state.position) {
            this.mesh.position.set(
                state.position.x,
                state.position.y,
                state.position.z
            );
        }
        
        // Update rotation
        if (state.rotation) {
            this.mesh.rotation.set(
                state.rotation.x,
                state.rotation.y,
                state.rotation.z
            );
        }
        
        // Update health - could add visual indicator
        this.health = state.health;
        this.isAlive = state.isAlive;
        
        // Update boost
        this.boostCharges = state.boostCharges;
    }

    getBody(): CANNON.Body {
        return this.carBody!;
    }

    dispose(): void {
        this.scene.remove(this.mesh);
        this.mesh.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                child.geometry.dispose();
                if (Array.isArray(child.material)) {
                    child.material.forEach(material => material.dispose());
                } else {
                    child.material.dispose();
                }
            }
        });
    }

    setPhysicsWorldAdded(added: boolean): void {
        this.physicsWorldAdded = added;
    }

    getType(): string {
        return this.type === PlayerType.HUNTER ? 'hunter' : 'tesla';
    }

    private createNameLabel(): void {
        // Create canvas for the label
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) return;
        
        canvas.width = 256;
        canvas.height = 64;
        
        // Draw background
        context.fillStyle = 'rgba(0, 0, 0, 0.6)';
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw text
        context.font = '24px Arial';
        context.textAlign = 'center';
        context.fillStyle = this.type === PlayerType.TESLA ? '#FFFFFF' : '#FF0000';
        context.fillText(this.playerName, canvas.width / 2, canvas.height / 2 + 8);
        
        // Create sprite
        const texture = new THREE.Texture(canvas);
        texture.needsUpdate = true;
        
        const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
        this.nameLabel = new THREE.Sprite(spriteMaterial);
        this.nameLabel.scale.set(5, 1.25, 1);
        this.nameLabel.position.y = 3; // Position above player
        
        this.mesh.add(this.nameLabel);
    }

    setId(id: string): void {
        this.id = id;
        this.playerName = this.type === PlayerType.TESLA ? `Tesla ${id.substr(0, 3)}` : `Hunter ${id.substr(0, 3)}`;
        
        // Update name label if it exists
        if (this.nameLabel) {
            this.mesh.remove(this.nameLabel);
            this.createNameLabel();
        }
    }

    // Get the player mesh
    getMesh(): THREE.Mesh {
        return this.mesh;
    }
} 