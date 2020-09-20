export type Reader<T, U> = (t: T) => U;

export const ask = <T>(): Reader<T, T> => t => t;
export const readerMap = <T, U>(map: (t: T) => U) => <R>(r: Reader<R, T>): Reader<R, U> => (ctx: R) => map(r(ctx));
export const readerChain = <T, U, V>(create: (t: T) => Reader<U, V>) => (r: Reader<U, T>): Reader<U, V> => ctx => create(r(ctx))(ctx);
