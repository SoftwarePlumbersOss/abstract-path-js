import { Tokens, Token, TokenType, Tokenizer } from '@softwareplumber/abstract-tokenizer';
import { Pattern, Parsers, Builders } from '@softwareplumber/abstract-pattern';
import { IImmutableSet } from '@softwareplumber/immutable-set';
import { IPredicate } from '@softwareplumber/abstract-function';

import { DEFAULT_PATTERN_OPERATORS, DEFAULT_PATH_OPERATORS, MATRIX_PATH_OPERATORS, MATRIX_PATTERN_OPERATORS } from './constants';

function escapeString(value : string, escape : string, operators : IImmutableSet<string>) : string {
    const escapeToken = (token : Token)  => token.type === TokenType.OPERATOR ? escape + token.data : token.data;
    return [...Tokens.fromString(value, '', operators.add(escape))].map(escapeToken).join('');
}

type PathConstructor<T, P extends Path<T>> = {
    new (elements: T[]) : P;
}

export class Path<T> implements Iterable<T> {

    private elements: T[]

    public constructor(elements : T[] | Iterable<T> | undefined) {
        if (elements === undefined) {
            this.elements = []
        } else if (Array.isArray(elements)) {
            this.elements = elements;
        } else {
            this.elements = [ ...elements ];
        }
    }

    static of<T, P extends Path<T>>(this: PathConstructor<T,P>, ...elements : T[]) {
        return new this([...elements]);
    }

    static parse<T, P extends Path<T>>(this: PathConstructor<T,P>, path : string) : P {
        let elements : any[]= [];
        for (let token of Tokens.fromString(path, '\\', new Set(['/']))) {
            if (token.type === TokenType.CHAR_SEQUENCE) elements.push(token.data);
        }
        return new this(elements as T[]);
    }

    static isPath(object: any) : boolean {
        if (typeof object === 'object') {
            return object instanceof Path;
        } else {
            return false;
        }
    }

    private _createPath(elements : T[]) : this {
        return new (this.constructor as PathConstructor<T, this>)(elements);
    }

    protected compareElements(a : T, b : T) : boolean {
        return a === b;
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

    tail() : this {
        return this._createPath(this.elements.slice(1));
    }

    consume(length : number) : this {
        return this._createPath(this.elements.slice(length));
    }

    last() : T {
        return this.elements[this.elements.length-1];
    }

    parent() : this {
        return this._createPath(this.elements.slice(0,-1));
    }

    add(...elements : T[]) : this {
        return this._createPath([ ...this.elements, ...elements]);
    }

    addAll(path : Path<T>) : this {
        return this.add(...path.elements);        
    }

    prepend(element : T) : this {
        return this._createPath( [element, ...this.elements]);
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

    matches<U extends IPredicate<T>>(wildcards: Path<U>) {
        if (this.length === wildcards.length) {
            return wildcards.elements.every((v,i)=>v.test(this.elements[i]));
        } else {
            return false;
        }
    }

    find(predicate: (elem : T) => boolean) : T | undefined {
        return this.elements.find(predicate);
    }

    findIndex(predicate: (elem : T) => boolean) : number {
        return this.elements.findIndex(predicate);
    }

    slice(begin: number, end: number) : this {
        return this._createPath(this.elements.slice(begin, end));
    }

    toString(escape = '\\', operators = DEFAULT_PATH_OPERATORS) : string {
        return [...this].map(element=>escapeString(String(element), escape, operators)).join('/');
    }
}

export class PatternPath extends Path<Pattern> {

    static parse<T, P extends Path<T>>(this: PathConstructor<T,P>, path : string) : P {
        let elements : any[] = [];
        let tokenizer = new Tokenizer(path[Symbol.iterator](), '\\', DEFAULT_PATTERN_OPERATORS);
        while (tokenizer.current) {
            if (tokenizer.current.type === TokenType.OPERATOR) {
                if (tokenizer.current.data === '/') {
                    tokenizer.next();
                } 
            }
            elements.push(Parsers.parseUnixWildcard(tokenizer));
        }
        return new this(elements);
    }

    toString(escape = '\\', operators = DEFAULT_PATTERN_OPERATORS) : string {
        return [...this].map(element=>element.build(Builders.toUnixWildcard(escape, operators))).join('/');
    }

    compareElements(a : Pattern, b: Pattern) : boolean {
        return a.equals(b);
    }
}

export interface PathElement<T> {
    readonly name: T,
    readonly attr : Map<string,T | null>
    equals(other : PathElement<T>) : boolean;
}

export class PathElementString implements PathElement<string> {
    readonly name: string
    readonly attr : Map<string,string | null>
    constructor(name : string, attr = new Map<string,string|null>()) {
        this.name = name; this.attr = attr;
    }
    toString() : string {
        return this.name + (this.attr.size > 0 ? ";" + [...this.attr.entries()].map(([name,value])=>`${name}=${value}`).join(';') : "");
    }
    equals(other: PathElement<string>) {
        return this.name === other.name 
            && this.attr.size === other.attr.size 
            && [...this.attr.keys()].every((name, index) => this.attr.get(name) === other.attr.get(name));
    }
 }

export class PathElementPattern implements PathElement<Pattern>, IPredicate<PathElement<string>> {
    readonly name
    readonly attr
    constructor(name : Pattern, attr = new Map<string, Pattern | null>()) {
        this.name = name; this.attr = attr;
    }
    test(target : PathElement<string>) : boolean {
        return this.name.test(target.name) && [...this.attr].every(([attribute,pattern]) => {
            let value = target.attr.get(attribute);
            if (pattern === null && value === null) return true;
            if (pattern === null || value === null || value === undefined) return false;
            return pattern.test(value);
        });
    }
    toString(escape = '\\', operators = MATRIX_PATH_OPERATORS) : string {
        return this.name.build(Builders.toUnixWildcard(escape, operators)) 
            + (this.attr.size > 0 
                ? ";" + [...this.attr.entries()]
                    .map(([name,value])=>`${name}=${value?.build(Builders.toUnixWildcard(escape, operators))}`)
                    .join(';') 
                : ""
            );
    }
    equals(other: PathElement<Pattern>) {
        if (this.name === other.name) return true;
        if (!this.name || !other.name) return false;        
        return this.name.equals(other.name) 
            && this.attr.size === other.attr.size 
            && [...this.attr.keys()].every((name, index) => {
                const patA = this.attr.get(name);
                const patB = other.attr.get(name);
                if (patA === patB) return true;
                if (!patA || !patB) return false;
                return patA.equals(patB);
            });
    }    
}

export interface PathBuilder<T, U extends PathElement<T>> {
    addValue(name : T) : void,
    addOperator(type: string) : void,
    build() : Iterable<U>
}

class MatrixPathBuilder<T, U extends PathElement<T>> implements PathBuilder<T,U> {
    
    name : T | undefined
    attr : Map<string,T | null>
    attrName: string | undefined
    path : U[]
    lastDelim : string
    nameof: (t:T)=>string
    Element: new (name: T, attr: Map<string,T | null>)=>U

    constructor(Element : new (name: T, attr: Map<string,T | null>)=>U, nameof : (t : T)=>string) {
        this.path = [];
        this.attr = new Map<string,T | null>();
        this.attrName = undefined;
        this.name = undefined;
        this.lastDelim = '/';
        this.nameof = nameof;
        this.Element = Element
    }

    addOperator(type: string) {
        this.lastDelim = type;
    }

    addValue(value : T) {
        switch(this.lastDelim) {
            case '=': 
                if (this.attrName === undefined) throw new Error('unexpected =');
                this.attr.set(this.attrName, value); 
                this.attrName = undefined;
                break;
            case ';':
                if (this.attrName !== undefined) this.attr.set(this.attrName, null);
                this.attrName = this.nameof(value); 
                break;
            case '/':
                if (this.name !== undefined) {
                    this.path.push(new this.Element(this.name, this.attr))
                    this.name = undefined;
                    this.attr = new Map();
                    this.attrName = undefined;
                }
                this.name = value;
        }
    }
    
    build() {
        if (this.attrName != undefined) this.attr.set(this.attrName, null);
        if (this.name !== undefined) this.path.push(new this.Element(this.name, this.attr));
        return this.path;
    }
}


export class MatrixPath extends Path<PathElement<string>> {    
    
    static parse<T, P extends Path<T>>(this: PathConstructor<T,P>, path : string, escape = '\\') : P {
        let builder = new MatrixPathBuilder<string, PathElementString>(PathElementString, t=>t);
        for (let token of Tokens.fromString(path, escape, MATRIX_PATH_OPERATORS)) {
            if (token.type === TokenType.CHAR_SEQUENCE) builder.addValue(token.data);
            if (token.type === TokenType.OPERATOR) builder.addOperator(token.data);
        }
        return new this(builder.build() as any[]);
    }  

    toString(escape = '\\', operators = MATRIX_PATH_OPERATORS) : string {

        function mapAttr ([key, value] : [string, any]) : string {
            return escapeString(key, escape, operators) + '=' + escapeString(String(value), escape, operators);
        }

        function mapElement (element : PathElement<string>) : string {
            let result = escapeString(element.name, escape, operators);
            if (element.attr.size > 0) 
                result = result + ";" + [...element.attr].map(mapAttr).join(';');
            return result;
        }

        return [...this].map(mapElement).join('/');
    }

    compareElements(a : PathElement<string>, b : PathElement<string>) : boolean {
        return a.equals(b);
    }
}  

export class MatrixPathPattern extends Path<PathElementPattern> {    
    
    static parse<T, P extends Path<T>>(this: PathConstructor<T,P>, path : string, escape = '\\') : P {
        let builder = new MatrixPathBuilder<Pattern,PathElementPattern>(PathElementPattern, pattern=>pattern.build(Builders.toSimplePattern(escape)));
        let tokenizer = new Tokenizer(path[Symbol.iterator](), escape, MATRIX_PATTERN_OPERATORS);
        while (tokenizer.current) {
            if (tokenizer.current.type === TokenType.OPERATOR && MATRIX_PATH_OPERATORS.has(tokenizer.current.data)) {
                builder.addOperator(tokenizer.current.data);
                tokenizer.next();
            } else {
                builder.addValue(Parsers.parseUnixWildcard(tokenizer));
            }
        }
        return new this(builder.build() as any[]);
    }  

    toString(escape = '\\', operators = MATRIX_PATTERN_OPERATORS) : string {

        function mapAttr ([key, value] : [string, Pattern | null]) : string {
            return escapeString(key, escape, operators) + (value ? '=' + value.build(Builders.toUnixWildcard(escape, operators)) : '')
        }

        function mapElement (element : PathElement<Pattern>) : string {
            let result = element.name.build(Builders.toUnixWildcard(escape, operators));
            if (element.attr.size > 0) 
                result = result + ";" + [...element.attr].map(mapAttr).join(';');
            return result;
        }

        return [...this].map(mapElement).join('/');
    }

    compareElements(a : PathElementPattern, b : PathElementPattern) : boolean {
        return a.equals(b);
    }    
}

export default Path;