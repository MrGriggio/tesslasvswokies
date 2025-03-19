export interface InputState {
    forward: boolean;
    backward: boolean;
    left: boolean;
    right: boolean;
    boost: boolean;
    shoot: boolean;
    shield: boolean;
    lookAround: boolean;
    mouseX: number;
    mouseY: number;
}

export class InputHandler {
    private keys: { [key: string]: boolean } = {};
    private mousePosition: { x: number, y: number } = { x: 0, y: 0 };
    private mouseDown: boolean = false;
    
    constructor() {
        // Set up key and mouse listeners
        window.addEventListener('keydown', this.onKeyDown.bind(this));
        window.addEventListener('keyup', this.onKeyUp.bind(this));
        window.addEventListener('mousemove', this.onMouseMove.bind(this));
        window.addEventListener('mousedown', this.onMouseDown.bind(this));
        window.addEventListener('mouseup', this.onMouseUp.bind(this));
    }
    
    // Handle key down events
    private onKeyDown(event: KeyboardEvent): void {
        // Only handle if not in an input field
        if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
        
        this.keys[event.key.toLowerCase()] = true;
    }
    
    // Handle key up events
    private onKeyUp(event: KeyboardEvent): void {
        this.keys[event.key.toLowerCase()] = false;
    }
    
    // Handle mouse movement
    private onMouseMove(event: MouseEvent): void {
        this.mousePosition.x = event.clientX;
        this.mousePosition.y = event.clientY;
    }
    
    // Handle mouse down events
    private onMouseDown(event: MouseEvent): void {
        // Only handle left mouse button (button 0)
        if (event.button === 0) {
            this.mouseDown = true;
        }
    }
    
    // Handle mouse up events
    private onMouseUp(event: MouseEvent): void {
        // Only handle left mouse button (button 0)
        if (event.button === 0) {
            this.mouseDown = false;
        }
    }
    
    // Get current input state
    getState(): InputState {
        return {
            forward: this.keys['w'] || this.keys['arrowup'] || false,
            backward: this.keys['s'] || this.keys['arrowdown'] || false,
            left: this.keys['a'] || this.keys['arrowleft'] || false,
            right: this.keys['d'] || this.keys['arrowright'] || false,
            boost: this.keys['shift'] || false,
            shoot: this.keys['i'] || false,
            shield: this.keys['j'] || this.keys[' '] || false, // Space bar for shield
            lookAround: this.mouseDown, // Left mouse button for camera look-around
            mouseX: this.mousePosition.x,
            mouseY: this.mousePosition.y
        };
    }

    // Cleanup resources
    dispose(): void {
        // Remove event listeners to prevent memory leaks
        window.removeEventListener('keydown', this.onKeyDown.bind(this));
        window.removeEventListener('keyup', this.onKeyUp.bind(this));
        window.removeEventListener('mousemove', this.onMouseMove.bind(this));
        window.removeEventListener('mousedown', this.onMouseDown.bind(this));
        window.removeEventListener('mouseup', this.onMouseUp.bind(this));
    }
}