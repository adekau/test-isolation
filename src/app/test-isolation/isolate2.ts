import { async, fakeAsync } from '@angular/core/testing';
import { identity } from 'rxjs';

import { getIOMonoid, IO, ioChain, ioMap, ioOf } from './io';
import { fold, getMLastMaybe, Maybe, none, some } from './maybe';
import { getObjectMonoid, mObjConcat } from './monoid';
import { pipe } from './pipe';

type Obj = Record<string, any>;

interface IsolatedTest<T extends Obj, U extends Obj = {}> {
    dataGen: Maybe<IO<T>>;
    componentGen: Maybe<IO<U>>,
    spyConfig: Maybe<(t: T) => IO<T>>;
    cleanup: Maybe<(tu: T & U) => IO<void>>;
}

export const getMIsolatedTest = <A extends Obj, U extends Obj = {}>() =>
    getObjectMonoid<IsolatedTest<A, U>>({
        dataGen: getMLastMaybe(),
        componentGen: getMLastMaybe(),
        spyConfig: getMLastMaybe(),
        cleanup: getMLastMaybe()
    });

export const dataGen = <A extends Obj>(gen: IO<A>): IsolatedTest<A> => ({
    dataGen: some(gen),
    componentGen: none,
    spyConfig: none,
    cleanup: none
});

export const spyConfig = <A extends Obj, U extends Obj = {}>(config: (a: A) => void) => (isolatedTest: IsolatedTest<A, U>) =>
    getMIsolatedTest<A, U>().mappend(isolatedTest)({
        dataGen: none,
        componentGen: none,
        spyConfig: some((a: A) => pipe(
            () => config(a),
            ioMap(() => a)
        )),
        cleanup: none
    });

export const componentGen = <A extends Obj, U extends Obj>(gen: IO<U>) => (isolatedTest: IsolatedTest<A, U>): IsolatedTest<A, U> =>
    getMIsolatedTest<A, U>().mappend(isolatedTest)({
        dataGen: none,
        componentGen: some(gen),
        spyConfig: none,
        cleanup: none
    });

export const cleanup = <A extends Obj, U extends Obj = {}>(cleanupFn: (a: A & U) => void) => (isolatedTest: IsolatedTest<A, U>) =>
    getMIsolatedTest<A, U>().mappend(isolatedTest)({
        dataGen: none,
        componentGen: none,
        spyConfig: none,
        cleanup: some((a: A & U) => () => cleanupFn(a))
    });

export const runTest = <A extends Obj, U extends Obj = {}>(testFn: (a: A & U) => void) =>
    (isolatedTest: IsolatedTest<A, U>) => pipe(
        isolatedTest.dataGen,
        fold(() => { throw new Error('DataGen expected.'); }, identity),
        ioChain(data => pipe(
            isolatedTest.spyConfig,
            fold(() => ioOf(data), sc => sc(data))
        )),
        ioChain(data => pipe(
            isolatedTest.componentGen,
            fold(() => ioOf(data) as IO<A & U>, cg => getIOMonoid(mObjConcat).mappend(ioOf(data))(cg) as IO<A & U>)
        )),
        ioChain(data => pipe(
            () => testFn(data),
            ioMap(() => data)
        )),
        ioChain(data => pipe(
            isolatedTest.cleanup,
            fold(() => ioOf(void 0), cf => cf(data))
        ))
    );

export const runTestAsync = <A extends Obj, U extends Obj = {}>(testFn: (a: A & U) => void) =>
    (isolatedTest: IsolatedTest<A, U>) => pipe(
        isolatedTest,
        runTest(testFn),
        async
    );

export const runTestFakeAsync = <A extends Obj, U extends Obj = {}>(testFn: (a: A & U) => void) =>
    (isolatedTest: IsolatedTest<A, U>) => pipe(
        isolatedTest,
        runTest(testFn),
        fakeAsync
    );
