import { Constants } from '@softwareplumber/abstract-pattern';
import ImmutableSet from '@softwareplumber/immutable-set';

export const MATRIX_PATH_OPERATORS = new ImmutableSet<string>(['/',';','=']);
export const DEFAULT_PATTERN_OPERATORS = Constants.UNIX_WILDCARD_OPERATORS.add('/');
export const MATRIX_PATTERN_OPERATORS = new ImmutableSet<string>([...MATRIX_PATH_OPERATORS, ...Constants.UNIX_WILDCARD_OPERATORS]);
export const DEFAULT_PATH_OPERATORS = new ImmutableSet<string>(['/']);