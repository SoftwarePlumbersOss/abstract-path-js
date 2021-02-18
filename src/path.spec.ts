/* global expect */

import Path from './path';

test('parses a Path', () => {
    let path = Path.parse('a/b/c');
    expect(path.length).toBe(3);
});

test('can head and tail a path', () => {
    let path = Path.parse('a/b/c');
    expect(path.head()).toBe('a');
    expect(path.tail().head()).toBe('b');
});

test('parses the empty string as an empty path', () => {
    let path = Path.parse('');
    expect(path.isEmpty()).toBe(true);
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

