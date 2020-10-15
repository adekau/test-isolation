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

export type DataGenType<T extends IsolatedTest<any>> = T extends IsolatedTest<infer U, any> ? U : Obj;
export type ComponentGenType<T extends IsolatedTest<any, any>> = T extends IsolatedTest<any, infer U> ? U : Obj;
export type TestType<T extends IsolatedTest<any, any>> = [DataGenType<T>, ComponentGenType<T>];

export const getMIsolatedTest = <T extends IsolatedTest<any, any>>() =>
    getObjectMonoid<IsolatedTest<DataGenType<T>, ComponentGenType<T>>>({
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

export const spyConfig = <T extends IsolatedTest<any, any>>(config: (a: DataGenType<T>) => void) => (isolatedTest: T) =>
    getMIsolatedTest<T>().mappend(isolatedTest)({
        dataGen: none,
        componentGen: none,
        spyConfig: some((a: DataGenType<T>) => pipe(
            () => config(a),
            ioMap(() => a)
        )),
        cleanup: none
    });

export const componentGen = <A extends Obj, U extends Obj>(gen: IO<U>) => (isolatedTest: IsolatedTest<A, U>): IsolatedTest<A, U> =>
    getMIsolatedTest<IsolatedTest<A, U>>().mappend(isolatedTest)({
        dataGen: none,
        componentGen: some(gen),
        spyConfig: none,
        cleanup: none
    });

export const cleanup = <T extends IsolatedTest<any, any>>(cleanupFn: (a: DataGenType<T> & ComponentGenType<T>) => void) => (isolatedTest: T) =>
    getMIsolatedTest<T>().mappend(isolatedTest)({
        dataGen: none,
        componentGen: none,
        spyConfig: none,
        cleanup: some((a: DataGenType<T> & ComponentGenType<T>) => () => cleanupFn(a))
    });

export const runTest = <T extends IsolatedTest<any, any>>(testFn: (a: DataGenType<T> & ComponentGenType<T>) => void) =>
    (isolatedTest: T) => pipe(
        isolatedTest.dataGen,
        fold(() => { throw new Error('DataGen expected.'); }, identity),
        ioChain(data => pipe(
            isolatedTest.spyConfig,
            fold(() => ioOf(data), sc => sc(data))
        )),
        ioChain(data => pipe(
            isolatedTest.componentGen,
            fold(() => ioOf(
                data) as IO<DataGenType<T> & ComponentGenType<T>>,
                cg => getIOMonoid(mObjConcat).mappend(ioOf(data))(cg) as IO<DataGenType<T> & ComponentGenType<T>>
            )
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

export const runTestAsync = <T extends IsolatedTest<any, any>>(testFn: (a: DataGenType<T> & ComponentGenType<T>) => void) =>
    (isolatedTest: T) => pipe(
        isolatedTest,
        runTest(testFn),
        async
    );

export const runTestFakeAsync = <T extends IsolatedTest<any, any>>(testFn: (a: DataGenType<T> & ComponentGenType<T>) => void) =>
    (isolatedTest: T) => pipe(
        isolatedTest,
        runTest(testFn),
        fakeAsync
    );
