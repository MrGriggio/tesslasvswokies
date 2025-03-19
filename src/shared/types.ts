export enum PlayerType {
    TESLA = 'tesla',
    HUNTER = 'hunter'
}

export interface Vector3 {
    x: number;
    y: number;
    z: number;
}

export interface PlayerState {
    id: string;
    type: PlayerType;
    position: {
        x: number;
        y: number;
        z: number;
    };
    rotation: {
        x: number;
        y: number;
        z: number;
    };
    health: number;
    isAlive: boolean;
    boostCharges: number;
}

export interface ProjectileState {
    id: string;
    playerId: string;
    position: {
        x: number;
        y: number;
        z: number;
    };
    velocity: {
        x: number;
        y: number;
        z: number;
    };
    type: 'bullet' | 'flame';
}

export interface GameState {
    players: Map<string, PlayerState>;
    projectiles: ProjectileState[];
}

export interface GameConfig {
    maxPlayers: number;
    teslaMaxHealth: number;
    hunterMaxHealth: number;
    maxBoostCharges: number;
    boostRechargeTime: number;
    flameRechargeTime: number;
    maxFlames: number;
    worldSize: Vector3;
} 