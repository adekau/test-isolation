import { Monoid } from './monoid';

export type IO<T> = () => T;

export const ioOf = <T>(a: T): IO<T> => () => a;
export const ioMap = <T, U>(map: (t: T) => U) => (f: IO<T>): IO<U> => () => map(f());
export const ioChain = <T, U>(map: (t: T) => IO<U>) => (f: IO<T>): IO<U> => () => map(f())();
export const ioRun = <T>() => (f: IO<T>): T => f();

export const getIOMonoid = <A>(m: Monoid<A>): Monoid<IO<A>> => ({
    mempty: ioOf(m.mempty),
    mappend: a1 => a2 => () => m.mappend(a1())(a2())
});
