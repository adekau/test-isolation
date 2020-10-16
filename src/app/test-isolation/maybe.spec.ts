import { fold, maybeMap, Maybe, none, some, fromNullable } from "./maybe";
import { pipe } from './pipe';

describe('Maybe functor', () => {
    it('folds', () => {
        const m = some(55);
        const m2 = none;
        const spy = jasmine.createSpy();
        const spyNothing = jasmine.createSpy();

        const f = fold(() => spyNothing('nothing'), (data: number) => spy(data));
        f(m);
        f(m2);

        expect(spy).toHaveBeenCalledWith(55);
        expect(spyNothing).toHaveBeenCalledWith('nothing');
    });

    it('maps', () => {
        const m1 = some('hello');
        const m2: Maybe<string> = none;

        expect(pipe(
            m1,
            maybeMap(a => a.length)
        )).toEqual(some(5));
        expect(pipe(
            m2,
            maybeMap(a => a.length)
        )).toEqual(none);
    });

    it('from nullable', () => {
        const t = fromNullable(undefined);
        const u = fromNullable(null);
        const v = fromNullable(5);
        const a = fromNullable(some(5));
        const b = fromNullable(none);

        expect(t).toEqual(none);
        expect(u).toEqual(none);
        expect(v).toEqual(some(5));
        expect(a).toEqual(some(5));
        expect(v).toEqual(a);
        expect(b).toEqual(none);
    });
});
