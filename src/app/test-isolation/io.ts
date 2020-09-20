export type IO<T> = () => T;

export const ioMap = <T, U>(map: (t: T) => U) => (f: IO<T>): IO<U> => () => map(f());
