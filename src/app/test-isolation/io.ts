export type IO<T> = () => T;

export const ioOf = <T>(a: T): IO<T> => () => a;
export const ioMap = <T, U>(map: (t: T) => U) => (f: IO<T>): IO<U> => () => map(f());
export const ioRun = <T>() => (f: IO<T>): T => f();
