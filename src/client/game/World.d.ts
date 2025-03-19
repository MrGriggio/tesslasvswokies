import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export declare class World {
    constructor(scene: THREE.Scene);
    addBody(body: CANNON.Body): void;
    getPhysicsWorld(): CANNON.World;
    update(deltaTime: number): void;
} 