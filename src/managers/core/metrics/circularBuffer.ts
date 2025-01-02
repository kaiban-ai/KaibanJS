export class CircularBuffer<T> {
    private buffer: T[];
    private _size: number;
    private head: number;
    private tail: number;

    constructor(capacity: number) {
        this.buffer = new Array(capacity);
        this._size = 0;
        this.head = 0;
        this.tail = 0;
    }

    push(item: T): void {
        this.buffer[this.tail] = item;
        this.tail = (this.tail + 1) % this.buffer.length;
        if (this._size === this.buffer.length) {
            this.head = (this.head + 1) % this.buffer.length;
        } else {
            this._size++;
        }
    }

    pop(): T | undefined {
        if (this._size === 0) return undefined;
        const item = this.buffer[this.head];
        this.head = (this.head + 1) % this.buffer.length;
        this._size--;
        return item;
    }

    add(item: T): void {
        this.push(item);
    }

    toArray(): T[] {
        const result: T[] = [];
        for (let i = 0; i < this._size; i++) {
            const index = (this.head + i) % this.buffer.length;
            result.push(this.buffer[index]);
        }
        return result;
    }

    clear(): void {
        this.buffer = new Array(this.buffer.length);
        this._size = 0;
        this.head = 0;
        this.tail = 0;
    }

    getSize(): number {
        return this._size;
    }
}
