import { fold, maybeMap, Maybe, none, some } from "./maybe";
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
});
