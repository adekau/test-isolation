type F<T, U> = (t: T) => U;

export function pipe<T1>(a: T1): T1;
export function pipe<T1, T2>(a: T1, b: F<T1, T2>): T2;
export function pipe<T1, T2, T3>(a: T1, b: F<T1, T2>, c: F<T2, T3>): T3;
export function pipe<T1, T2, T3, T4>(a: T1, b: F<T1, T2>, c: F<T2, T3>, d: F<T3, T4>): T4;
export function pipe<T1, T2, T3, T4, T5>(a: T1, b: F<T1, T2>, c: F<T2, T3>, d: F<T3, T4>, e: F<T4, T5>): T5;
export function pipe<T1, T2, T3, T4, T5, T6>(a: T1, b: F<T1, T2>, c: F<T2, T3>, d: F<T3, T4>, e: F<T4, T5>, f: F<T5, T6>): T6;
export function pipe(initial: unknown, ...fns: F<unknown, unknown>[]): unknown {
    if (!fns?.length)
        return initial;
    return fns?.reduce((prev, cur) => cur(prev), initial) ?? initial;
}
