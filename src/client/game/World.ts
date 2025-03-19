import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export class World {
    private scene: THREE.Scene;
    private physicsWorld: CANNON.World;
    private buildings: THREE.Group;
    private ground: THREE.Mesh;

    constructor(scene: THREE.Scene) {
        this.scene = scene;
        this.buildings = new THREE.Group();
        
        // Initialize physics world
        this.physicsWorld = new CANNON.World({
            gravity: new CANNON.Vec3(0, -9.82, 0)
        });
        
        // Create ground with smaller size to focus on central area
        const groundSize = 400; // Reduced from 600 for a more compact map focused on city
        const groundSegments = 20; // Reduced segments
        const groundGeometry = new THREE.PlaneGeometry(groundSize, groundSize, groundSegments, groundSegments);
        
        // Create a more interesting ground texture - green grass for daytime
        const groundMaterial = new THREE.MeshBasicMaterial({
            color: 0x497c43, // Green grass color
            side: THREE.DoubleSide
        });
        
        this.ground = new THREE.Mesh(groundGeometry, groundMaterial);
        this.ground.rotation.x = -Math.PI / 2;
        this.ground.receiveShadow = true;
    }

    init(): void {
        // Add ground to scene
        this.scene.add(this.ground);
        
        // Add ground to physics world
        const groundShape = new CANNON.Plane();
        const groundBody = new CANNON.Body({
            mass: 0,
            shape: groundShape,
            material: new CANNON.Material({
                friction: 0.3,
                restitution: 0.3
            })
        });
        groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
        this.physicsWorld.addBody(groundBody);

        // Add invisible boundary walls around the map
        this.createBoundaryWalls();

        // Set physics world parameters for better performance
        this.physicsWorld.broadphase = new CANNON.NaiveBroadphase();
        this.physicsWorld.allowSleep = true;

        // Create city environment with more buildings
        this.createCity();
        this.scene.add(this.buildings);

        // Add simplified road network
        this.createRoads();

        // Create simple daylight sky
        this.createDaylightSky();

        // Add fog with moderate distance - light blue for daytime
        const fogColor = new THREE.Color(0xb3d5ff);
        this.scene.fog = new THREE.Fog(fogColor, 50, 150);
        
        // Add ambient light - brighter for daytime
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
        this.scene.add(ambientLight);
        
        // Add sun light with basic shadows
        const sunLight = new THREE.DirectionalLight(0xffffff, 0.8);
        sunLight.position.set(100, 100, 50);
        sunLight.castShadow = true;
        
        // Reduced shadow quality for performance
        sunLight.shadow.mapSize.width = 512;
        sunLight.shadow.mapSize.height = 512;
        sunLight.shadow.camera.left = -100;
        sunLight.shadow.camera.right = 100;
        sunLight.shadow.camera.top = 100;
        sunLight.shadow.camera.bottom = -100;
        
        this.scene.add(sunLight);
    }

    private createDaylightSky(): void {
        // Create simple blue sky dome - smaller to match ground size
        const skyGeometry = new THREE.SphereGeometry(400, 24, 12); // Reduced from 600
        const skyMaterial = new THREE.MeshBasicMaterial({
            color: 0x87ceeb, // Sky blue
            side: THREE.BackSide
        });
        
        const sky = new THREE.Mesh(skyGeometry, skyMaterial);
        this.scene.add(sky);
        
        // Add sun
        const sunGeometry = new THREE.SphereGeometry(25, 16, 16); // Larger sun
        const sunMaterial = new THREE.MeshBasicMaterial({
            color: 0xffff99
        });
        
        const sun = new THREE.Mesh(sunGeometry, sunMaterial);
        sun.position.set(350, 400, -250);
        this.scene.add(sun);
        
        // Add clouds
        this.addClouds();
    }

    private addClouds(): void {
        const cloudGroup = new THREE.Group();
        const cloudMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xffffff,
            transparent: true,
            opacity: 0.8
        });
        
        // Create 20 clouds at random positions in the sky
        for (let i = 0; i < 20; i++) {
            const cloudSize = 20 + Math.random() * 40;
            const cloudGeometry = new THREE.SphereGeometry(cloudSize, 8, 8);
            const cloud = new THREE.Mesh(cloudGeometry, cloudMaterial);
            
            // Random position in the sky
            const angle = Math.random() * Math.PI * 2;
            const radius = 300 + Math.random() * 200;
            const height = 150 + Math.random() * 200;
            
            cloud.position.set(
                Math.cos(angle) * radius,
                height,
                Math.sin(angle) * radius
            );
            
            // Flatten clouds slightly
            cloud.scale.y = 0.3 + Math.random() * 0.3;
            
            cloudGroup.add(cloud);
        }
        
        this.scene.add(cloudGroup);
    }

    private createRoads(): void {
        const roadGroup = new THREE.Group();
        
        // Create road material with asphalt texture
        const roadMaterial = new THREE.MeshBasicMaterial({
            color: 0x111111 // Using MeshBasicMaterial for better performance
        });
        
        // Create road markings material
        const markingsMaterial = new THREE.MeshBasicMaterial({
            color: 0xFFFFFF
        });
        
        // Create main grid roads
        this.createGridRoads(roadGroup, roadMaterial, markingsMaterial);
        
        // Create curved/diagonal roads for more natural city feel
        this.createCurvedRoads(roadGroup, roadMaterial, markingsMaterial);
        
        this.scene.add(roadGroup);
    }

    private createGridRoads(roadGroup: THREE.Group, roadMaterial: THREE.Material, markingsMaterial: THREE.Material): void {
        const gridSize = 4; // Reduced from 5 for smaller grid
        const spacing = 20; // Reduced from 25 for tighter roads
        const roadWidth = 10; // Slightly reduced from 12
        
        // Create horizontal roads (along X axis) - denser grid
        for (let z = -gridSize; z <= gridSize; z += 1) {
            // Skip some roads for irregularity
            if (Math.random() < 0.3 && z !== 0) continue;
            
            const roadGeometry = new THREE.PlaneGeometry(gridSize * 2 * spacing + 20, roadWidth);
            const road = new THREE.Mesh(roadGeometry, roadMaterial);
            road.rotation.x = -Math.PI / 2;
            
            // Add small variations to make roads less straight
            const offset = (Math.random() - 0.5) * 2;
            road.position.set(offset, 0.01, z * spacing);
            road.receiveShadow = true;
            roadGroup.add(road);
            
            // Add center lines
            const centerLineGeometry = new THREE.PlaneGeometry(gridSize * 2 * spacing + 20, 0.3);
            const centerLine = new THREE.Mesh(centerLineGeometry, markingsMaterial);
            centerLine.rotation.x = -Math.PI / 2;
            centerLine.position.set(offset, 0.02, z * spacing);
            roadGroup.add(centerLine);
        }
        
        // Create vertical roads (along Z axis) - denser grid
        for (let x = -gridSize; x <= gridSize; x += 1) {
            // Skip some roads for irregularity
            if (Math.random() < 0.3 && x !== 0) continue;
            
            const roadGeometry = new THREE.PlaneGeometry(roadWidth, gridSize * 2 * spacing + 20);
            const road = new THREE.Mesh(roadGeometry, roadMaterial);
            road.rotation.x = -Math.PI / 2;
            
            // Add small variations to make roads less straight
            const offset = (Math.random() - 0.5) * 2;
            road.position.set(x * spacing, 0.01, offset);
            road.receiveShadow = true;
            roadGroup.add(road);
            
            // Add center lines
            const centerLineGeometry = new THREE.PlaneGeometry(0.3, gridSize * 2 * spacing + 20);
            const centerLine = new THREE.Mesh(centerLineGeometry, markingsMaterial);
            centerLine.rotation.x = -Math.PI / 2;
            centerLine.position.set(x * spacing, 0.02, offset);
            roadGroup.add(centerLine);
        }
    }

    private createCurvedRoads(roadGroup: THREE.Group, roadMaterial: THREE.Material, markingsMaterial: THREE.Material): void {
        // Create a few curved/diagonal roads to break up the grid pattern
        const curvedRoads = [
            { startX: -30, startZ: -30, endX: 30, endZ: 40, controlX: 0, controlZ: 0 },
            { startX: -40, startZ: 20, endX: 40, endZ: -10, controlX: 10, controlZ: 30 },
            { startX: 30, startZ: -30, endX: -20, endZ: 40, controlX: -10, controlZ: -20 }
        ];
        
        curvedRoads.forEach(road => {
            // Create a curved road using quadratic bezier curve
            this.createCurvedRoad(
                roadGroup,
                new THREE.Vector2(road.startX, road.startZ),
                new THREE.Vector2(road.endX, road.endZ),
                new THREE.Vector2(road.controlX, road.controlZ),
                roadMaterial,
                markingsMaterial
            );
        });
    }

    private createCurvedRoad(
        roadGroup: THREE.Group, 
        start: THREE.Vector2, 
        end: THREE.Vector2, 
        control: THREE.Vector2,
        roadMaterial: THREE.Material,
        markingsMaterial: THREE.Material
    ): void {
        const roadWidth = 12; // Increased from 8 for wider curved roads
        const segments = 20; // Number of segments in the curve
        
        // Create curve
        const curve = new THREE.QuadraticBezierCurve(
            new THREE.Vector2(start.x, start.y),
            new THREE.Vector2(control.x, control.y),
            new THREE.Vector2(end.x, end.y)
        );
        
        // Sample points along the curve
        const points = curve.getPoints(segments);
        
        // Create road segments
        for (let i = 0; i < points.length - 1; i++) {
            const current = points[i];
            const next = points[i + 1];
            
            // Calculate direction vector and perpendicular
            const direction = new THREE.Vector2().subVectors(next, current).normalize();
            const perpendicular = new THREE.Vector2(-direction.y, direction.x).multiplyScalar(roadWidth/2);
            
            // Calculate the four corners of this road segment
            const corners = [
                new THREE.Vector2().addVectors(current, perpendicular),
                new THREE.Vector2().subVectors(current, perpendicular),
                new THREE.Vector2().subVectors(next, perpendicular),
                new THREE.Vector2().addVectors(next, perpendicular)
            ];
            
            // Create geometry for this segment
            const shape = new THREE.Shape();
            shape.moveTo(corners[0].x, corners[0].y);
            shape.lineTo(corners[1].x, corners[1].y);
            shape.lineTo(corners[2].x, corners[2].y);
            shape.lineTo(corners[3].x, corners[3].y);
            shape.closePath();
            
            const geometry = new THREE.ShapeGeometry(shape);
            const segment = new THREE.Mesh(geometry, roadMaterial);
            segment.rotation.x = -Math.PI / 2;
            segment.position.y = 0.01;
            segment.receiveShadow = true;
            roadGroup.add(segment);
            
            // Create center line for this segment
            if (i % 2 === 0) { // Add lines every other segment to create dashed effect
                const lineShape = new THREE.Shape();
                const lineWidth = 0.3;
                
                // Calculate thinner line along center
                const lineDir = direction.clone().multiplyScalar(lineWidth/2);
                const linePerp = perpendicular.clone().normalize().multiplyScalar(lineWidth);
                
                const middle = new THREE.Vector2().addVectors(current, next).multiplyScalar(0.5);
                
                const lineCorners = [
                    new THREE.Vector2().addVectors(middle, linePerp).add(lineDir),
                    new THREE.Vector2().subVectors(middle, linePerp).add(lineDir),
                    new THREE.Vector2().subVectors(middle, linePerp).sub(lineDir),
                    new THREE.Vector2().addVectors(middle, linePerp).sub(lineDir)
                ];
                
                lineShape.moveTo(lineCorners[0].x, lineCorners[0].y);
                lineShape.lineTo(lineCorners[1].x, lineCorners[1].y);
                lineShape.lineTo(lineCorners[2].x, lineCorners[2].y);
                lineShape.lineTo(lineCorners[3].x, lineCorners[3].y);
                lineShape.closePath();
                
                const lineGeometry = new THREE.ShapeGeometry(lineShape);
                const line = new THREE.Mesh(lineGeometry, markingsMaterial);
                line.rotation.x = -Math.PI / 2;
                line.position.y = 0.02;
                roadGroup.add(line);
            }
        }
    }

    private createCity(): void {
        // City configuration with more concentrated zones
        const cityConfig = {
            // Downtown area - tall buildings, denser layout
            downtown: {
                centerX: 0,
                centerZ: 0,
                radius: 50, // Reduced from 60 for more compactness
                buildingDensity: 0.95, // Increased density
                minHeight: 15,
                maxHeight: 40,
                spacing: 8 // More dense
            },
            // Midtown - medium height, moderate spacing
            midtown: {
                radius: 80, // Reduced from 110
                buildingDensity: 0.85, // Increased density
                minHeight: 8,
                maxHeight: 25,
                spacing: 9 // More dense
            },
            // Suburbs - shorter buildings with higher density
            suburbs: {
                radius: 100, // Reduced from 140
                buildingDensity: 0.7, // Increased density
                minHeight: 5,
                maxHeight: 15,
                spacing: 12 // More dense
            }
        };

        // Building materials
        const buildingMaterials = [
            new THREE.MeshBasicMaterial({ color: 0xd3b8ac }), // Tan
            new THREE.MeshBasicMaterial({ color: 0xa0a0a0 }), // Gray
            new THREE.MeshBasicMaterial({ color: 0xb0c4de }), // Light blue
            new THREE.MeshBasicMaterial({ color: 0xdeb887 }), // Beige
            new THREE.MeshBasicMaterial({ color: 0xc2b280 }), // Sand
            new THREE.MeshBasicMaterial({ color: 0xe8e4c9 }), // Ivory
            new THREE.MeshBasicMaterial({ color: 0xbdb6a5 }), // Warm gray
            new THREE.MeshBasicMaterial({ color: 0xd9c9b6 }), // Soft tan
            new THREE.MeshBasicMaterial({ color: 0x8fa3b3 }), // Steel blue
            new THREE.MeshBasicMaterial({ color: 0xd1be9d }), // Khaki
            new THREE.MeshBasicMaterial({ color: 0xcdc9c3 })  // Platinum
        ];

        // Create city zones
        this.createCityZone(cityConfig.downtown, buildingMaterials);
        this.createCityZone(cityConfig.midtown, buildingMaterials);
        this.createCityZone(cityConfig.suburbs, buildingMaterials);
        
        // Add special building clusters - closer to center
        this.createSpecialDistricts(buildingMaterials);
        
        // Add more building clusters to fill in gaps - closer to center
        this.createFillerBuildings(buildingMaterials);
        
        // Add parks and green spaces
        this.createParks();
        
        // Add urban features like billboards
        this.createUrbanFeatures();
    }

    private createCityZone(
        config: { 
            centerX?: number, 
            centerZ?: number, 
            radius: number, 
            buildingDensity: number, 
            minHeight: number, 
            maxHeight: number, 
            spacing: number 
        }, 
        materials: THREE.Material[]
    ): void {
        const centerX = config.centerX || 0;
        const centerZ = config.centerZ || 0;
        
        // Calculate how many buildings to place in this zone
        const area = Math.PI * config.radius * config.radius;
        const buildingCapacity = area / (config.spacing * config.spacing);
        const buildingCount = Math.floor(buildingCapacity * config.buildingDensity);
        
        for (let i = 0; i < buildingCount; i++) {
            // Random angle and distance from center (using square root for even distribution)
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.sqrt(Math.random()) * config.radius;
            
            // Calculate position
            const x = centerX + Math.cos(angle) * distance;
            const z = centerZ + Math.sin(angle) * distance;
            
            // Road safety distance - moderate to allow buildings near roads but not on them
            if (this.isTooCloseToRoad(x, z, 6)) { // Adjusted from 8
                continue;
            }
            
            // Minimum building spacing - reduced to make buildings closer together
            if (this.isTooCloseToOtherBuildings(x, z, 5)) { // Adjusted from 8
                continue;
            }
            
            // Building properties with more variation
            const width = 2 + Math.random() * 5;
            const depth = 2 + Math.random() * 5;
            
            // Calculate height based on distance from center (taller near center)
            const heightFactor = Math.max(0.3, 1 - distance / config.radius);
            const heightRange = config.maxHeight - config.minHeight;
            const height = config.minHeight + heightRange * heightFactor * (0.7 + Math.random() * 0.3);
            
            // Occasionally create a different building style
            if (Math.random() < 0.15) {
                this.createModernBuilding(
                    new THREE.Vector3(x, height / 2, z), // Position y at half height to ensure bottom is at ground
                    new THREE.Vector3(width, height, depth),
                    materials[Math.floor(Math.random() * materials.length)]
                );
            } else {
                // Create simple building
                this.createSimpleBuilding(
                    new THREE.Vector3(x, height / 2, z), // Position y at half height to ensure bottom is at ground
                    new THREE.Vector3(width, height, depth),
                    materials[Math.floor(Math.random() * materials.length)]
                );
            }
        }
    }

    private createModernBuilding(position: THREE.Vector3, size: THREE.Vector3, material: THREE.Material): void {
        // Create a more modern-looking building with a unique shape
        const buildingGroup = new THREE.Group();
        
        // Main building body
        const mainGeometry = new THREE.BoxGeometry(size.x, size.y, size.z);
        const mainBuilding = new THREE.Mesh(mainGeometry, material);
        buildingGroup.add(mainBuilding);
        
        // Add a setback for taller buildings (stepped design)
        if (size.y > 15) {
            const setbackWidth = size.x * 0.7;
            const setbackDepth = size.z * 0.7;
            const setbackHeight = size.y * 0.3;
            const setbackGeometry = new THREE.BoxGeometry(setbackWidth, setbackHeight, setbackDepth);
            
            const setbackMaterial = material;
            const setback = new THREE.Mesh(setbackGeometry, setbackMaterial);
            setback.position.y = size.y / 2 - setbackHeight / 2;
            buildingGroup.add(setback);
        }
        
        // Position the building group
        buildingGroup.position.copy(position);
        this.buildings.add(buildingGroup);
        
        // Add building to physics world as a simple box for performance
        const shape = new CANNON.Box(new CANNON.Vec3(size.x / 2, size.y / 2, size.z / 2));
        const body = new CANNON.Body({
            mass: 0,
            shape,
            position: new CANNON.Vec3(position.x, position.y, position.z)
        });
        this.physicsWorld.addBody(body);
    }

    private createSpecialDistricts(materials: THREE.Material[]): void {
        // Create more varied special districts with more central positions
        const specialDistricts = [
            { x: -40, z: 40, radius: 30, buildingCount: 15, minHeight: 8, maxHeight: 18, type: 'industrial' },
            { x: 40, z: -40, radius: 25, buildingCount: 12, minHeight: 10, maxHeight: 30, type: 'business' },
            { x: -35, z: -35, radius: 25, buildingCount: 15, minHeight: 6, maxHeight: 14, type: 'residential' },
            { x: 40, z: 30, radius: 25, buildingCount: 10, minHeight: 12, maxHeight: 25, type: 'commercial' },
            { x: -25, z: 40, radius: 20, buildingCount: 8, minHeight: 5, maxHeight: 12, type: 'warehouse' }
        ];
        
        specialDistricts.forEach(district => {
            for (let i = 0; i < district.buildingCount; i++) {
                // Random position within district
                const angle = Math.random() * Math.PI * 2;
                const distance = Math.sqrt(Math.random()) * district.radius;
                const x = district.x + Math.cos(angle) * distance;
                const z = district.z + Math.sin(angle) * distance;
                
                // Skip if too close to a road
                if (this.isTooCloseToRoad(x, z, 6)) { // Adjusted from 3
                    continue;
                }
                
                // Skip if too close to other buildings
                if (this.isTooCloseToOtherBuildings(x, z, 5)) { // Add minimum spacing between buildings
                    continue;
                }
                
                // Building properties
                const width = 2 + Math.random() * 6;
                const depth = 2 + Math.random() * 6;
                const height = district.minHeight + Math.random() * (district.maxHeight - district.minHeight);
                
                // Create district-specific building styles
                switch(district.type) {
                    case 'industrial':
                        // Flat, wide buildings with smokestacks
                        this.createIndustrialBuilding(
                            new THREE.Vector3(x, height * 0.35, z), // Lower height to ensure bottom is at ground
                            new THREE.Vector3(width * 1.5, height * 0.7, depth * 1.5),
                            materials[Math.floor(Math.random() * materials.length)]
                        );
                        break;
                        
                    case 'warehouse':
                        // Long, low buildings
                        this.createSimpleBuilding(
                            new THREE.Vector3(x, height * 0.3, z), // Lower height to ensure bottom is at ground
                            new THREE.Vector3(width * 2, height * 0.6, depth * 2),
                            materials[Math.floor(Math.random() * materials.length)]
                        );
                        break;
                        
                    case 'business':
                        // Modern glass-like buildings
                        this.createModernBuilding(
                            new THREE.Vector3(x, height / 2, z), // Position y at half height to ensure bottom is at ground
                            new THREE.Vector3(width, height, depth),
                            materials[Math.floor(Math.random() * materials.length)]
                        );
                        break;
                        
                    default:
                        // Create standard building
                        this.createSimpleBuilding(
                            new THREE.Vector3(x, height / 2, z), // Position y at half height to ensure bottom is at ground
                            new THREE.Vector3(width, height, depth),
                            materials[Math.floor(Math.random() * materials.length)]
                        );
                }
            }
        });
        
        // Add more impressive landmark buildings
        const landmarks = [
            { x: 0, z: 0, width: 8, depth: 8, height: 60, type: 'skyscraper' },
            { x: -60, z: 60, width: 7, depth: 7, height: 45, type: 'tower' },
            { x: 70, z: 40, width: 6, depth: 10, height: 50, type: 'modern' },
            { x: -80, z: -60, width: 12, depth: 12, height: 25, type: 'dome' },
            { x: 50, z: -70, width: 15, depth: 8, height: 35, type: 'complex' }
        ];
        
        landmarks.forEach(landmark => {
            // Create landmark building based on type
            switch(landmark.type) {
                case 'skyscraper':
                    this.createSkyscraper(
                        new THREE.Vector3(landmark.x, landmark.height / 2, landmark.z), // Position y at half height to ensure bottom is at ground
                        new THREE.Vector3(landmark.width, landmark.height, landmark.depth),
                        materials[Math.floor(Math.random() * materials.length)]
                    );
                    break;
                    
                case 'tower':
                    this.createTowerBuilding(
                        new THREE.Vector3(landmark.x, landmark.height / 2, landmark.z), // Position y at half height to ensure bottom is at ground
                        new THREE.Vector3(landmark.width, landmark.height, landmark.depth),
                        materials[Math.floor(Math.random() * materials.length)]
                    );
                    break;
                    
                default:
                    // Create standard tall building
                    this.createSimpleBuilding(
                        new THREE.Vector3(landmark.x, landmark.height / 2, landmark.z), // Position y at half height to ensure bottom is at ground
                        new THREE.Vector3(landmark.width, landmark.height, landmark.depth),
                        materials[Math.floor(Math.random() * materials.length)]
                    );
            }
        });
    }

    private createIndustrialBuilding(position: THREE.Vector3, size: THREE.Vector3, material: THREE.Material): void {
        const buildingGroup = new THREE.Group();
        
        // Main building body
        const mainGeometry = new THREE.BoxGeometry(size.x, size.y, size.z);
        const mainBuilding = new THREE.Mesh(mainGeometry, material);
        buildingGroup.add(mainBuilding);
        
        // Add smokestacks randomly
        const numStacks = Math.floor(1 + Math.random() * 3);
        for (let i = 0; i < numStacks; i++) {
            const stackRadius = 0.5 + Math.random() * 0.5;
            const stackHeight = 3 + Math.random() * 4;
            const stackGeometry = new THREE.CylinderGeometry(stackRadius, stackRadius, stackHeight, 8);
            const stackMaterial = new THREE.MeshBasicMaterial({ color: 0x888888 });
            const stack = new THREE.Mesh(stackGeometry, stackMaterial);
            
            // Position on top of building
            stack.position.y = size.y / 2 + stackHeight / 2;
            stack.position.x = (Math.random() - 0.5) * (size.x * 0.6);
            stack.position.z = (Math.random() - 0.5) * (size.z * 0.6);
            
            buildingGroup.add(stack);
        }
        
        // Position the building group
        buildingGroup.position.copy(position);
        this.buildings.add(buildingGroup);
        
        // Add building to physics world as a simple box
        const shape = new CANNON.Box(new CANNON.Vec3(size.x / 2, size.y / 2, size.z / 2));
        const body = new CANNON.Body({
            mass: 0,
            shape,
            position: new CANNON.Vec3(position.x, position.y, position.z)
        });
        this.physicsWorld.addBody(body);
    }

    private createSkyscraper(position: THREE.Vector3, size: THREE.Vector3, material: THREE.Material): void {
        const buildingGroup = new THREE.Group();
        
        // Create a tapered skyscraper
        const segments = 4; // Number of segments
        let currentWidth = size.x;
        let currentDepth = size.z;
        const segmentHeight = size.y / segments;
        
        for (let i = 0; i < segments; i++) {
            const segmentGeometry = new THREE.BoxGeometry(currentWidth, segmentHeight, currentDepth);
            const segment = new THREE.Mesh(segmentGeometry, material);
            
            // Position segment
            segment.position.y = -size.y / 2 + segmentHeight / 2 + i * segmentHeight;
            
            buildingGroup.add(segment);
            
            // Taper the building as it goes up
            currentWidth *= 0.85;
            currentDepth *= 0.85;
        }
        
        // Add spire at the top for iconic skyscrapers
        const spireHeight = size.y * 0.2;
        const spireGeometry = new THREE.ConeGeometry(size.x * 0.1, spireHeight, 8);
        const spireMaterial = new THREE.MeshBasicMaterial({ color: 0xc0c0c0 });
        const spire = new THREE.Mesh(spireGeometry, spireMaterial);
        spire.position.y = size.y / 2 + spireHeight / 2;
        buildingGroup.add(spire);
        
        // Position the building group
        buildingGroup.position.copy(position);
        this.buildings.add(buildingGroup);
        
        // Add building to physics world as a simple box for performance
        const shape = new CANNON.Box(new CANNON.Vec3(size.x / 2, size.y / 2, size.z / 2));
        const body = new CANNON.Body({
            mass: 0,
            shape,
            position: new CANNON.Vec3(position.x, position.y, position.z)
        });
        this.physicsWorld.addBody(body);
    }

    private createTowerBuilding(position: THREE.Vector3, size: THREE.Vector3, material: THREE.Material): void {
        const buildingGroup = new THREE.Group();
        
        // Main building body
        const mainGeometry = new THREE.BoxGeometry(size.x, size.y * 0.8, size.z);
        const mainBuilding = new THREE.Mesh(mainGeometry, material);
        buildingGroup.add(mainBuilding);
        
        // Add observation deck at the top
        const deckWidth = size.x * 1.3;
        const deckDepth = size.z * 1.3;
        const deckHeight = size.y * 0.1;
        const deckGeometry = new THREE.BoxGeometry(deckWidth, deckHeight, deckDepth);
        const deckMaterial = material;
        const deck = new THREE.Mesh(deckGeometry, deckMaterial);
        deck.position.y = size.y * 0.4 - deckHeight/2;
        buildingGroup.add(deck);
        
        // Add antenna or spire
        const antennaHeight = size.y * 0.3;
        const antennaGeometry = new THREE.CylinderGeometry(0.5, 0.5, antennaHeight, 8);
        const antennaMaterial = new THREE.MeshBasicMaterial({ color: 0xa0a0a0 });
        const antenna = new THREE.Mesh(antennaGeometry, antennaMaterial);
        antenna.position.y = size.y * 0.4 + antennaHeight/2;
        buildingGroup.add(antenna);
        
        // Position the building group
        buildingGroup.position.copy(position);
        this.buildings.add(buildingGroup);
        
        // Add building to physics world as a simple box
        const shape = new CANNON.Box(new CANNON.Vec3(size.x / 2, size.y / 2, size.z / 2));
        const body = new CANNON.Body({
            mass: 0,
            shape,
            position: new CANNON.Vec3(position.x, position.y, position.z)
        });
        this.physicsWorld.addBody(body);
    }

    private createParks(): void {
        // Create several parks throughout the city - more central
        const parks = [
            { x: 15, z: 20, radius: 15 }, // Reduced size and moved closer to center
            { x: -25, z: -10, radius: 12 }, // Reduced size and moved closer to center
            { x: 30, z: -20, radius: 15 }, // Reduced size and moved closer to center
            { x: -20, z: 30, radius: 10 }  // Reduced size and moved closer to center
        ];
        
        // Green material for parks
        const grassMaterial = new THREE.MeshBasicMaterial({ color: 0x228B22 });
        
        parks.forEach(park => {
            // Create a park area
            const parkGeometry = new THREE.CircleGeometry(park.radius, 16);
            const parkMesh = new THREE.Mesh(parkGeometry, grassMaterial);
            parkMesh.rotation.x = -Math.PI / 2;
            parkMesh.position.set(park.x, 0.05, park.z); // Slightly above ground
            this.scene.add(parkMesh);
            
            // Add trees to the park
            const treeCount = Math.floor(park.radius / 2) + 2;
            
            for (let i = 0; i < treeCount; i++) {
                const angle = Math.random() * Math.PI * 2;
                const distance = Math.random() * park.radius * 0.8;
                const treeX = park.x + Math.cos(angle) * distance;
                const treeZ = park.z + Math.sin(angle) * distance;
                
                this.createSimpleTree(new THREE.Vector3(treeX, 0, treeZ));
            }
        });
    }

    private createSimpleTree(position: THREE.Vector3): void {
        const treeGroup = new THREE.Group();
        
        // Create tree trunk
        const trunkGeometry = new THREE.CylinderGeometry(0.5, 0.7, 3, 8);
        const trunkMaterial = new THREE.MeshBasicMaterial({ color: 0x8B4513 });
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.position.y = 1.5; // Half of trunk height
        treeGroup.add(trunk);
        
        // Create tree foliage
        const foliageGeometry = new THREE.SphereGeometry(2, 8, 8);
        const foliageMaterial = new THREE.MeshBasicMaterial({ color: 0x006400 });
        const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
        foliage.position.y = 4; // Position on top of trunk
        foliage.scale.y = 1.2; // Stretch slightly vertically
        treeGroup.add(foliage);
        
        // Position the tree
        treeGroup.position.copy(position);
        this.scene.add(treeGroup);
    }

    private createUrbanFeatures(): void {
        // Add urban features like billboards, fountains, etc.
        this.createBillboards();
    }

    private createBillboards(): void {
        // Add billboards at strategic locations
        const billboardLocations = [
            { x: 30, z: 40, rotation: Math.PI / 3 },
            { x: -50, z: 20, rotation: -Math.PI / 4 },
            { x: 70, z: -30, rotation: Math.PI },
            { x: -20, z: -60, rotation: Math.PI / 2 }
        ];
        
        billboardLocations.forEach(location => {
            // Create billboard structure
            const postGeometry = new THREE.BoxGeometry(1, 10, 1);
            const postMaterial = new THREE.MeshBasicMaterial({ color: 0x808080 });
            const post = new THREE.Mesh(postGeometry, postMaterial);
            post.position.set(location.x, 5, location.z);
            this.scene.add(post);
            
            // Create billboard sign
            const signGeometry = new THREE.PlaneGeometry(8, 4);
            const signMaterial = new THREE.MeshBasicMaterial({ 
                color: Math.random() < 0.5 ? 0xE91E63 : 0x2196F3, // Random bright colors
                side: THREE.DoubleSide 
            });
            const sign = new THREE.Mesh(signGeometry, signMaterial);
            sign.position.set(location.x, 8, location.z);
            sign.rotation.y = location.rotation;
            this.scene.add(sign);
        });
    }

    // New method to check if a position is too close to existing buildings
    private isTooCloseToOtherBuildings(x: number, z: number, minDistance: number): boolean {
        // Check against all existing buildings
        for (let i = 0; i < this.buildings.children.length; i++) {
            const building = this.buildings.children[i];
            const buildingPos = building.position;
            
            const distance = Math.sqrt(
                Math.pow(x - buildingPos.x, 2) + 
                Math.pow(z - buildingPos.z, 2)
            );
            
            if (distance < minDistance) {
                return true;
            }
        }
        
        return false;
    }

    // Helper method to check if a position is too close to any road
    private isTooCloseToRoad(x: number, z: number, minDistance: number): boolean {
        // Check grid roads
        const gridSize = 5;
        const spacing = 25; // Updated from 15 to match the new road spacing
        
        // Check horizontal roads
        for (let roadZ = -gridSize; roadZ <= gridSize; roadZ++) {
            const roadPos = roadZ * spacing;
            if (Math.abs(z - roadPos) < minDistance) {
                return true;
            }
        }
        
        // Check vertical roads
        for (let roadX = -gridSize; roadX <= gridSize; roadX++) {
            const roadPos = roadX * spacing;
            if (Math.abs(x - roadPos) < minDistance) {
                return true;
            }
        }
        
        // For curved roads, a simplified check using distance to roads' control points
        // (simplified implementation)
        
        return false;
    }

    private createSimpleBuilding(position: THREE.Vector3, size: THREE.Vector3, material: THREE.Material): void {
        // Create main building body - no details, no windows
        const geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
        const building = new THREE.Mesh(geometry, material);
        building.position.copy(position);
        building.castShadow = true;
        building.receiveShadow = true;
        
        this.buildings.add(building);

        // Add building to physics world
        const shape = new CANNON.Box(new CANNON.Vec3(size.x / 2, size.y / 2, size.z / 2));
        const body = new CANNON.Body({
            mass: 0,
            shape,
            position: new CANNON.Vec3(position.x, position.y, position.z)
        });
        this.physicsWorld.addBody(body);
    }

    // Method to add a physics body to the world
    addBody(body: CANNON.Body): void {
        this.physicsWorld.addBody(body);
    }

    // Method to get the physics world
    getPhysicsWorld(): CANNON.World {
        return this.physicsWorld;
    }

    update(deltaTime: number): void {
        // Update physics world
        this.physicsWorld.step(deltaTime);
    }

    dispose(): void {
        // Dispose of geometries and materials
        this.ground.geometry.dispose();
        (this.ground.material as THREE.Material).dispose();

        this.buildings.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                child.geometry.dispose();
                if (Array.isArray(child.material)) {
                    child.material.forEach(material => material.dispose());
                } else {
                    child.material.dispose();
                }
            }
        });

        // Remove from scene
        this.scene.remove(this.ground);
        this.scene.remove(this.buildings);
    }

    // New method to add additional filler buildings to make the city denser
    private createFillerBuildings(materials: THREE.Material[]): void {
        const fillerAreas = [
            { x: -20, z: 20, radius: 20, count: 15, minHeight: 5, maxHeight: 15 },
            { x: 25, z: 15, radius: 20, count: 18, minHeight: 8, maxHeight: 20 },
            { x: -20, z: -20, radius: 15, count: 12, minHeight: 6, maxHeight: 12 },
            { x: 30, z: -15, radius: 18, count: 15, minHeight: 5, maxHeight: 18 },
            { x: 5, z: -30, radius: 15, count: 12, minHeight: 7, maxHeight: 16 },
            { x: -35, z: 0, radius: 18, count: 15, minHeight: 6, maxHeight: 15 },
            { x: 35, z: 30, radius: 15, count: 12, minHeight: 5, maxHeight: 14 },
            { x: -25, z: 35, radius: 15, count: 10, minHeight: 8, maxHeight: 18 }
        ];
        
        fillerAreas.forEach(area => {
            for (let i = 0; i < area.count; i++) {
                // Random position within the area
                const angle = Math.random() * Math.PI * 2;
                const distance = Math.sqrt(Math.random()) * area.radius;
                const x = area.x + Math.cos(angle) * distance;
                const z = area.z + Math.sin(angle) * distance;
                
                // Skip if too close to roads or other buildings
                if (this.isTooCloseToRoad(x, z, 5) || this.isTooCloseToOtherBuildings(x, z, 4)) {
                    continue;
                }
                
                // Building properties
                const width = 2 + Math.random() * 4;
                const depth = 2 + Math.random() * 4;
                const height = area.minHeight + Math.random() * (area.maxHeight - area.minHeight);
                
                // Create building with varied styles
                if (Math.random() < 0.3) {
                    // Modern building
                    this.createModernBuilding(
                        new THREE.Vector3(x, height / 2, z),
                        new THREE.Vector3(width, height, depth),
                        materials[Math.floor(Math.random() * materials.length)]
                    );
                } else {
                    // Simple building
                    this.createSimpleBuilding(
                        new THREE.Vector3(x, height / 2, z),
                        new THREE.Vector3(width, height, depth),
                        materials[Math.floor(Math.random() * materials.length)]
                    );
                }
            }
        });
        
        // Add a few more landmark buildings scattered around
        const additionalLandmarks = [
            { x: 30, z: 70, width: 5, depth: 5, height: 30 },
            { x: -75, z: -50, width: 6, depth: 6, height: 35 },
            { x: 85, z: -65, width: 7, depth: 4, height: 28 }
        ];
        
        additionalLandmarks.forEach(landmark => {
            if (!this.isTooCloseToRoad(landmark.x, landmark.z, 7) && 
                !this.isTooCloseToOtherBuildings(landmark.x, landmark.z, 8)) {
                this.createSkyscraper(
                    new THREE.Vector3(landmark.x, landmark.height / 2, landmark.z),
                    new THREE.Vector3(landmark.width, landmark.height, landmark.depth),
                    materials[Math.floor(Math.random() * materials.length)]
                );
            }
        });
    }

    // Create invisible boundary walls to prevent players from going off-map
    private createBoundaryWalls(): void {
        const mapSize = 380; // Slightly smaller than the ground size (400)
        const wallHeight = 30; // Wall height
        const wallThickness = 10; // Wall thickness
        
        // Material for boundary walls (invisible)
        const wallMaterial = new CANNON.Material({ friction: 0, restitution: 0.5 });
        
        // Create four boundary walls
        const walls = [
            // North wall (positive Z)
            {
                position: new CANNON.Vec3(0, wallHeight / 2, mapSize / 2),
                size: new CANNON.Vec3(mapSize / 2 + wallThickness, wallHeight, wallThickness)
            },
            // South wall (negative Z)
            {
                position: new CANNON.Vec3(0, wallHeight / 2, -mapSize / 2),
                size: new CANNON.Vec3(mapSize / 2 + wallThickness, wallHeight, wallThickness)
            },
            // East wall (positive X)
            {
                position: new CANNON.Vec3(mapSize / 2, wallHeight / 2, 0),
                size: new CANNON.Vec3(wallThickness, wallHeight, mapSize / 2)
            },
            // West wall (negative X)
            {
                position: new CANNON.Vec3(-mapSize / 2, wallHeight / 2, 0),
                size: new CANNON.Vec3(wallThickness, wallHeight, mapSize / 2)
            }
        ];
        
        // Add each wall to the physics world
        walls.forEach(wall => {
            const wallBody = new CANNON.Body({
                mass: 0, // Static body
                shape: new CANNON.Box(wall.size),
                material: wallMaterial,
                position: wall.position
            });
            
            this.physicsWorld.addBody(wallBody);
            
            // For debugging - add visible representation (uncomment if needed)
            /*
            const wallGeometry = new THREE.BoxGeometry(wall.size.x * 2, wall.size.y * 2, wall.size.z * 2);
            const wallMesh = new THREE.Mesh(
                wallGeometry,
                new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.3 })
            );
            wallMesh.position.copy(wall.position as any);
            this.scene.add(wallMesh);
            */
        });
        
        // Add visual marker at the edges of the map (subtle border)
        const borderWidth = 2;
        const borderDepth = 0.1;
        const borderMaterial = new THREE.MeshBasicMaterial({ color: 0x444444 });
        
        const borderPaths = [
            // North border
            { start: [-mapSize/2, mapSize/2], end: [mapSize/2, mapSize/2] },
            // South border
            { start: [-mapSize/2, -mapSize/2], end: [mapSize/2, -mapSize/2] },
            // East border
            { start: [mapSize/2, -mapSize/2], end: [mapSize/2, mapSize/2] },
            // West border
            { start: [-mapSize/2, -mapSize/2], end: [-mapSize/2, mapSize/2] }
        ];
        
        borderPaths.forEach(path => {
            const length = Math.sqrt(
                Math.pow(path.end[0] - path.start[0], 2) + 
                Math.pow(path.end[1] - path.start[1], 2)
            );
            
            const borderGeometry = new THREE.BoxGeometry(
                path.end[0] - path.start[0] === 0 ? borderWidth : length,
                borderDepth,
                path.end[1] - path.start[1] === 0 ? borderWidth : length
            );
            
            const border = new THREE.Mesh(borderGeometry, borderMaterial);
            
            // Position the border at the center of the path
            border.position.set(
                (path.start[0] + path.end[0]) / 2,
                0.02, // Slightly above ground
                (path.start[1] + path.end[1]) / 2
            );
            
            // Rotate the border if needed
            if (path.end[0] - path.start[0] === 0) {
                border.rotation.y = Math.PI / 2;
            }
            
            border.rotation.x = -Math.PI / 2; // Flat on the ground
            this.scene.add(border);
        });
    }
} 