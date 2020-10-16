import { IO } from './io';
import { Monoid } from './monoid';

export type Some<A extends unknown> = { type: 'some', value: A };
export type None = { type: 'none' };

// Disjoint union 1 + A
export type Maybe<A extends unknown> = None | Some<A>;

export const none: Maybe<never> = ({ type: 'none' });
export const some = <A extends unknown>(value: A): Maybe<A> => ({ type: 'some', value });
export const fromIO = <A>(io: IO<A>): Maybe<A> => some(io());
export const fromNullable = <A>(a: A): A extends Maybe<any> ? A : Maybe<A> =>
    ((isMaybe(a)) ? a : (a === undefined || a === null) ? none : some(a)) as any;

export const isNone = <A extends unknown>(m: Maybe<A>): m is None => m.type === 'none';
export const isSome = <A extends unknown>(m: Maybe<A>): m is Some<A> => m.type === 'some';
export const isMaybe = (m: unknown): m is Maybe<unknown> =>
    typeof m === 'object'
    && !(m === undefined || m === null)
    && Object.prototype.hasOwnProperty.call(m, 'type')
    && ((m as any).type === 'none' || (m as any).type === 'some');

export const fold = <A extends unknown, B extends unknown>(ifNone: IO<B>, ifSome: (a: A) => B) => (m: Maybe<A>): B =>
    isNone(m) ? ifNone() : ifSome(m.value);

export const maybeMap = <A extends unknown, B extends unknown>(map: (a: A) => B) => (ma: Maybe<A>): Maybe<B> =>
    isNone(ma) ? none : some(map(ma.value));

export const maybeChain = <A extends unknown, B extends unknown>(map: (a: A) => Maybe<B>) => (ma: Maybe<A>): Maybe<B> =>
    isNone(ma) ? none : map(ma.value);

export const maybeAp = <A extends unknown>(a: Maybe<A>) => <B extends unknown>(m: Maybe<(a: A) => B>): Maybe<B> =>
    isSome(m) && isSome(a) ? some(m.value(a.value)) : none;

export const extractNullable = <A extends unknown>() => (m: Maybe<A>): A | null =>
    isNone(m) ? null : m.value;

export const getMaybeMonoid = <A extends unknown>(m: Monoid<A>): Monoid<Maybe<A>> => ({
    mempty: some(m.mempty),
    mappend: a1 => a2 => (isSome(a1) && isSome(a2)) ? some(m.mappend(a1.value)(a2.value)) : none
});

export const getMLastMaybe = <A extends unknown>(): Monoid<Maybe<A>> => ({
    mempty: none,
    mappend: m1 => m2 => isNone(m2) ? m1 : m2
});
