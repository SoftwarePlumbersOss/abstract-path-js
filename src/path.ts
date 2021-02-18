import { Tokens, Token, TokenType } from 'abstract-tokenizer';

export default class Path<T> implements Iterable<T> {

    private elements: T[]

    protected constructor(elements : T[] | undefined) {
        if (elements === undefined) {
            this.elements = []
        } else {
            this.elements = elements;
        }
    }

    static of<T>(elements : Iterable<T>) {
        return new Path([...elements]);
    }

    static parse(path : string) : Path<string> {
        let elements = [];
        for (let token of Tokens.fromString(path, '\\', new Set(['/']))) {
            if (token.type === TokenType.CHAR_SEQUENCE) elements.push(token.data);
        }
        return new Path(elements);
    }

    static isPath(object: any) : boolean {
        if (typeof object === 'object') {
            return object instanceof Path;
        } else {
            return false;
        }
    }

    protected compareElements(a : T, b : T) : boolean {
        return a === b;
    }
    
    protected matchElement(pattern: RegExp, element : T) : boolean {
        return pattern.test(String(element));
    }

    [Symbol.iterator]() : Iterator<T> {
        return this.elements[Symbol.iterator]();
    }

    element(i : number) : T {
        return this.elements[i];
    }

    get length() : number {
        return this.elements.length;
    }

    head() : T {
        return this.elements[0];
    }

    tail() : Path<T> {
        return new Path(this.elements.slice(1));
    }

    consume(length : number) : Path<T> {
        return new Path(this.elements.slice(length));
    }

    last() : T {
        return this.elements[this.elements.length-1];
    }

    parent() : Path<T> {
        return new Path(this.elements.slice(0,-1));
    }

    add(...elements : T[]) : Path<T> {
        return new Path([ ...this.elements, ...elements]);
    }

    addAll(path : Path<T>) : Path<T> {
        return this.add(...path.elements);        
    }

    prepend(element : T) : Path<T> {
        return new Path( [element, ...this.elements]);
    }

    isEmpty() : boolean {
        return this.elements.length === 0;
    }

    startsWith(path : Path<T>) : boolean {
        if (this.length >= path.elements.length) {
            return path.elements.every((v,i)=>this.compareElements(v, this.element(i)));
        } else {
            return false;        
        }
    }

    endsWith(path : Path<T>) : boolean {
        if (this.length >= path.length) {
            const offset = this.length - path.length;
            return path.elements.every((v,i)=>this.compareElements(v, this.element(i + offset)));
        } else {
            return false;
        }
    }

    equals(path : Path<T>) : boolean {
        if (path === this) return true;
        if (this.length === path.length) {
            return path.elements.every((v,i)=>this.compareElements(v, this.element(i)));
        } else {
            return false;
        }
    }

    match(wildcards: Path<RegExp>) {
        if (this.length === wildcards.length) {
            return wildcards.elements.every((v,i)=>this.matchElement(v, this.element(i)));
        } else {
            return false;
        }
    }

    find(predicate: (elem : T) => boolean) : T | undefined {
        return this.elements.find(predicate);
    }
}