export interface Monoid<A> {
    mempty: A;
    mappend: (a1: A) => (a2: A) => A;
}

export const mSum: Monoid<number> = {
    mempty: 0,
    mappend: n1 => n2 => n1 + n2
};

export const mString: Monoid<string> = {
    mempty: '',
    mappend: n1 => n2 => n1.concat(n2)
};

export const mAll: Monoid<boolean> = {
    mempty: true,
    mappend: b1 => b2 => b1 && b2
};

export const mSome: Monoid<boolean> = {
    mempty: false,
    mappend: b1 => b2 => b1 || b2
};

export const mArray: Monoid<Array<any>> = {
    mempty: [],
    mappend: a1 => a2 => [...a1, ...a2]
};

export const mObjConcat: Monoid<Record<string, any>> = {
    mempty: {},
    mappend: o1 => o2 => ({ ...o1, ...o2 })
};

export const getObjectMonoid = <T extends { [k: string]: any }>(o: { [K in keyof T]: Monoid<T[K]> }): Monoid<T> => ({
    mempty: Object.keys(o).reduce(
        <K extends keyof T>(acc: { [U in K]: T[U] }, key: K) => (
            acc[key] = o[key].mempty,
            acc
        ),
        {} as { [K in keyof T]: T[K] }
    ),
    mappend: o1 => o2 => Object.keys(o).reduce(
        <K extends keyof T>(acc: { [U in K]: T[U] }, key: K) => (
            acc[key] = o[key].mappend(o1[key])(o2[key]),
            acc
        ),
        {} as { [K in keyof T]: T[K] }
    )
});
