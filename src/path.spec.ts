/* global expect */

import { Path, PatternPath, MatrixPath, MatrixPathPattern } from './path';
import { Pattern, Parsers } from '@softwareplumber/abstract-pattern';

test('parses a Path', () => {
    let path = Path.parse('a/b/c');
    expect(path.length).toBe(3);
});

test('roundtrips a Path', () => {
    let path = Path.parse('a/b/c').toString();
    expect(path).toEqual('a/b/c');
});

test('can head and tail a path', () => {
    let path = Path.parse('a/b/c');
    expect(path.head()).toBe('a');
    expect(path.tail().head()).toBe('b');
});

test('tail of a path is an instance of path', () => {
    let path = Path.parse('a/b/c');
    expect(path.tail()).toBeInstanceOf(Path);
});

test('parses the empty string as an empty path', () => {
    let path = Path.parse('');
    expect(path.isEmpty()).toBe(true);
});

test('an empty path turns into an empty string', () => {
    let path = Path.parse('').toString();
    expect(path).toEqual('');
});

test('parses a Path with escapes', () => {
    let path = Path.parse('a\\/b/c');
    expect(path.length).toBe(2);
    expect(path.head()).toBe('a/b');
    expect(path.tail().head()).toBe('c');
});

test('roundtrips a Path with escapes', () => {
    let path = Path.parse('a\\/b/c').toString();
    expect(path).toEqual('a\\/b/c');
});

test('parses a Path with double escapes', () => {
    let path = Path.parse('a\\\\/b/c');
    expect(path.length).toBe(3);
    expect(path.head()).toBe('a\\');
    expect(path.tail().head()).toBe('b');
    expect(path.tail().tail().head()).toBe('c');
});

test('roundtrips a Path with double escapes', () => {
    let path = Path.parse('a\\\\/b/c').toString();
    expect(path).toEqual('a\\\\/b/c');
});

test('compares paths', () => {
    let path1 = Path.parse('a/b/c');
    let path2 = Path.parse('a/b/c');
    let path3 = Path.parse('a');
    let path4 = Path.parse('');
    expect(path1.equals(path2)).toBe(true);
    expect(path1.equals(path3)).toBe(false);
    expect(path1.equals(path4)).toBe(false);
});

test('parses a path with wildcards', () => {
    let path = PatternPath.parsePatterns('ab/*/def?.txt');
    expect(path.head().equals(Parsers.parseUnixWildcard('ab'))).toBe(true);
    expect(path.tail().head().equals(Parsers.parseUnixWildcard('*'))).toBe(true);
    expect(path.tail().tail().head().equals(Parsers.parseUnixWildcard('def?.txt'))).toBe(true);
});

test('tail of a pattern path is an instance of PatternPath', () => {
    let path = PatternPath.parsePatterns('ab/*/def?.txt');
    expect(path.tail()).toBeInstanceOf(PatternPath);
});

test('head of a pattern path converts to a meaningful string', () => {
    let path = PatternPath.parsePatterns('ab/*/def?.txt');
    expect(path.head().toString()).toEqual('ab');
    expect(path.tail().head().toString()).toEqual('*');
    expect(path.tail().tail().head().toString()).toEqual('def?.txt');
});

test('roundtrips a path with wildcards', ()=>{
    let path = PatternPath.parsePatterns('ab/*/def?.txt').toString();
    expect(path).toEqual('ab/*/def?.txt');
});

test('matches a path with wildcards', () => {
    let pattern = PatternPath.parsePatterns('ab/*/def?.txt');
    expect(Path.parse("ab/c/def3.txt").matches(pattern)).toBe(true);
    expect(Path.parse("ab/xyz/def4.txt").matches(pattern)).toBe(true);
    expect(Path.parse("abc/xyz/def4.txt").matches(pattern)).toBe(false);
    expect(Path.parse("abc/xyz/def.txt").matches(pattern)).toBe(false);
});

test('parses a matrix path', ()=> {
    let path = MatrixPath.parseMatrixPath('abc;version=1/def;version=2;color=green/xyz');
    expect(path.head().name).toBe('abc');
    expect(path.head().attr.get('version')).toBe('1');
    path = path.tail();
    expect(path.head().name).toBe('def');
    expect(path.head().attr.get('version')).toBe('2');
    expect(path.head().attr.get('color')).toBe('green');
    path = path.tail();
    expect(path.head().name).toBe('xyz');
    expect(path.head().attr.size).toBe(0);
});

test('tail of a matrix path is an instance of MatrixPath', () => {
    let path = MatrixPath.parseMatrixPath('abc;version=1/def;version=2;color=green/xyz');
    expect(path.tail()).toBeInstanceOf(MatrixPath);
});

test('head of a matrix path converts to a meaningful string', () => {
    let path = MatrixPath.parseMatrixPath('abc;version=1/def;version=2;color=green/xyz');
    expect(path.head().toString()).toEqual('abc;version=1');
    expect(path.tail().head().toString()).toEqual('def;version=2;color=green');
    expect(path.tail().tail().head().toString()).toEqual('xyz');
});

test('finds an element in a matrix path', ()=> {
    let path = MatrixPath.parseMatrixPath('abc;version=1/def;version=2;color=green/xyz');
    expect(path.find(element=>element.attr.get('color') === 'green')?.name).toBe('def');
    expect(path.findIndex(element=>element.attr.get('color') === 'green')).toBe(1);
});

test('roundtrips a matrix path', ()=> {
    let path = MatrixPath.parseMatrixPath('abc;version=1/def;version=2;color=green/xyz').toString();
    expect(path).toEqual('abc;version=1/def;version=2;color=green/xyz');
});

test('parses a matrix path with escapes', ()=> {
    let path = MatrixPath.parseMatrixPath('abc\\;version\\=1/def;version=2;color=green/xyz');
    expect(path.head().name).toBe('abc;version=1');
    expect(path.head().attr.size).toBe(0);
    path = path.tail();
    expect(path.head().name).toBe('def');
    expect(path.head().attr.get('version')).toBe('2');
    expect(path.head().attr.get('color')).toBe('green');
    path = path.tail();
    expect(path.head().name).toBe('xyz');
    expect(path.head().attr.size).toBe(0);
});

test('rountrips a matrix path with escapes', ()=> {
    let path = MatrixPath.parseMatrixPath('abc\\;version\\=1/def;version=2;color=green/xyz').toString();
    expect(path).toEqual('abc\\;version\\=1/def;version=2;color=green/xyz');
});

test('parses a matrix pattern', ()=> {
    let path = MatrixPathPattern.parseMatrixPattern('abc;version=?/def*;version=2;color=gr*/xyz');
    expect(path.head().name.equals(Parsers.parseUnixWildcard('abc'))).toBe(true);
    expect(path.head().attr.get('version')?.equals(Parsers.parseUnixWildcard('?'))).toBe(true);
    path = path.tail();
    expect(path.head().name.equals(Parsers.parseUnixWildcard('def*'))).toBe(true);
    expect(path.head().attr.get('version')?.equals(Parsers.parseUnixWildcard('2'))).toBe(true);
    expect(path.head().attr.get('color')?.equals(Parsers.parseUnixWildcard('gr*'))).toBe(true);
    path = path.tail();
    expect(path.head().name.equals(Parsers.parseUnixWildcard('xyz'))).toBe(true);
    expect(path.head().attr.size).toBe(0);
});

test('tail of a matrix pattern path is an instance of MatrixPath', () => {
    let path = MatrixPathPattern.parseMatrixPattern('abc;version=?/def*;version=2;color=gr*/xyz');
    expect(path.tail()).toBeInstanceOf(MatrixPathPattern);
});

test('roundtrips a matrix pattern', ()=> {
    let path = MatrixPathPattern.parseMatrixPattern('abc;version=?/def*;version=2;color=gr*/xyz').toString();
    expect(path).toEqual('abc;version=?/def*;version=2;color=gr*/xyz');
});

test('matches a matrix pattern', ()=> {
    let pattern = MatrixPathPattern.parseMatrixPattern('abc;version=?/def*;version=2;color=gr*/xyz');
    let path1 = MatrixPath.parseMatrixPath('abc;version=1/defghi;version=2;color=grey/xyz');
    let path2 = MatrixPath.parseMatrixPath('abc;version=12/defghi;version=2;color=grey/xyz');
    let path3 = MatrixPath.parseMatrixPath('abc;version=1/defghi;version=2;color=black/xyz');
    let path4 = MatrixPath.parseMatrixPath('abc;version=1;color=puce/defghi;version=2;color=grey/xyz');
    expect(path1.matches(pattern)).toBe(true);
    expect(path2.matches(pattern)).toBe(false);
    expect(path3.matches(pattern)).toBe(false);
    expect(path4.matches(pattern)).toBe(true);
});