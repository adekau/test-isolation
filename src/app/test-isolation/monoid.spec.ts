import { getObjectMonoid, mAll, mArray, mObjConcat, Monoid, mSome, mString, mSum } from './monoid';

type Point = {
    x: number;
    y: number;
}

const mPoint = getObjectMonoid<Point>({
    x: mSum,
    y: mSum
});

describe('monoid', () => {
    it('point object monoid', () => {
        const t = mPoint.mappend({ x: 3, y: 4 })({ x: 7, y: 17 });

        expect(t).toEqual({
            x: 10,
            y: 21
        });
    });

    describe('identity', () => {
        const testIdentity = (name: string) => <T>(mon: Monoid<T>, o: T) => it(name, () => {
            const o2 = mon.mempty;

            expect(mon.mappend(o)(o2)).toEqual(o);
            expect(mon.mappend(o2)(o)).toEqual(o);
        });

        testIdentity('point')(mPoint, { x: 15, y: 5 });
        testIdentity('string')(mString, 'hello world');
        testIdentity('sum')(mSum, 5);
        testIdentity('all')(mAll, true);
        testIdentity('some')(mSome, false);
        testIdentity('arr')(mArray, ['hello', 'world']);
        testIdentity('obj')(mObjConcat, { hello: 5, world: '!' });
    });

    describe('associativity', () => {
        const testAssociativity = (name: string) => <T>(mon: Monoid<T>, o1: T, o2: T, o3: T) => it(name, () => {
            const result1 = mon.mappend(mon.mappend(o1)(o2))(o3);
            const result2 = mon.mappend(o1)(mon.mappend(o2)(o3));

            expect(result1).toEqual(result2);
        });

        testAssociativity('point')(mPoint, { x: 1, y: -1 }, { x: 15, y: 7 }, { x: -4, y: -5 });
        testAssociativity('string')(mString, 'hello ', 'how are ', 'you?');
        testAssociativity('sum')(mSum, 4, 5, 6);

        testAssociativity('all_1')(mAll, true, false, true);
        testAssociativity('all_2')(mAll, false, false, true);
        testAssociativity('all_3')(mAll, true, false, false);

        testAssociativity('some_1')(mSome, false, false, true);
        testAssociativity('some_2')(mSome, true, true, true);
        testAssociativity('some_3')(mSome, false, true, false);

        testAssociativity('arr')(mArray, ['hello', 'world'], [5, 10, 15], [5, 'hi']);

        testAssociativity('obj')(mObjConcat, { bigIf: true }, { carrots: 16, apples: 5 }, { hello: 'world' });
    });
});
