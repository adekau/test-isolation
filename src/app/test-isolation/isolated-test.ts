import { async, fakeAsync } from '@angular/core/testing';
import { identity } from 'rxjs';

import { getIOMonoid, IO, ioChain, ioMap, ioOf } from './io';
import { fold, fromNullable, getMLastMaybe, Maybe, some } from './maybe';
import { maybeIOChain } from './maybe-io';
import { maybeReaderIOChain } from './maybe-reader';
import { getObjectMonoid, mObjConcat } from './monoid';
import { pipe } from './pipe';
import { Reader } from './reader';

type Obj = Record<string, any>;

export interface IsolatedTest<T extends Obj, U extends Obj = {}> {
    dataGen: Maybe<IO<T>>;
    componentGen: Maybe<IO<U>>,
    spyConfig: Maybe<Reader<T, IO<T>>>;
    cleanup: Maybe<Reader<T & U, IO<void>>>;
}

export type DataGenType<T extends IsolatedTest<unknown>> = T extends IsolatedTest<infer U, unknown> ? U : Obj;
export type ComponentGenType<T extends IsolatedTest<unknown, unknown>> = T extends IsolatedTest<unknown, infer U> ? U : Obj;

export const getMIsolatedTest = <T extends IsolatedTest<unknown, unknown>>() =>
    getObjectMonoid<IsolatedTest<DataGenType<T>, ComponentGenType<T>>>({
        dataGen: getMLastMaybe(),
        componentGen: getMLastMaybe(),
        spyConfig: getMLastMaybe(),
        cleanup: getMLastMaybe()
    });

export const mergeEmptyIsolatedTest = <A, B>(partial: Partial<IsolatedTest<A, B>>): IsolatedTest<A, B> =>
    mObjConcat.mappend(getMIsolatedTest().mempty)(partial) as IsolatedTest<A, B>;

export const dataGen = <A extends Obj>(gen: IO<A>): IsolatedTest<A> => mergeEmptyIsolatedTest({
    dataGen: some(gen)
});

export const emptyDataGen = () => dataGen(() => ({}));

export const spyConfig = <T extends IsolatedTest<any, any>>(config: (a: DataGenType<T>) => void) => (isolatedTest: T) =>
    getMIsolatedTest<T>().mappend(isolatedTest)(mergeEmptyIsolatedTest({
        spyConfig: some((a: DataGenType<T>) => pipe(
            () => config(a),
            ioMap(() => a)
        ))
    }));

export const componentGen = <A extends Obj, U extends Obj>(gen: IO<U>) => (isolatedTest: IsolatedTest<A, U>): IsolatedTest<A, U> =>
    getMIsolatedTest<IsolatedTest<A, U>>().mappend(isolatedTest)(mergeEmptyIsolatedTest({
        componentGen: some(gen)
    }));

export const cleanup = <T extends IsolatedTest<any, any>>(cleanupFn: (a: DataGenType<T> & ComponentGenType<T>) => void) => (isolatedTest: T) =>
    getMIsolatedTest<T>().mappend(isolatedTest)(mergeEmptyIsolatedTest({
        cleanup: some((a: DataGenType<T> & ComponentGenType<T>) => () => cleanupFn(a))
    }));

export const runTest = <T extends IsolatedTest<unknown, unknown>>(testFn: (a: DataGenType<T> & ComponentGenType<T>) => void) =>
    (isolatedTest: T) => pipe(
        fromNullable(isolatedTest.dataGen),
        fold(() => { throw new Error('DataGen expected.'); }, identity),
        maybeReaderIOChain(data => ioOf(data))
            ((sc, data) => sc(data))
            (isolatedTest.spyConfig),
        maybeIOChain(data => ioOf(data) as IO<DataGenType<T> & ComponentGenType<T>>)
            ((cg, data) => getIOMonoid(mObjConcat).mappend(ioOf(data))(cg) as IO<DataGenType<T> & ComponentGenType<T>>)
            (isolatedTest.componentGen),
        ioChain(data => pipe(
            () => testFn(data),
            ioMap(() => data)
        )),
        maybeReaderIOChain(() => ioOf<void>(void 0))
            ((cf, data) => cf(data))
            (isolatedTest.cleanup)
    );

export const runTestAsync = <T extends IsolatedTest<unknown, unknown>>(testFn: (a: DataGenType<T> & ComponentGenType<T>) => void) =>
    (isolatedTest: T) => pipe(
        isolatedTest,
        runTest(testFn),
        async
    );

export const runTestFakeAsync = <T extends IsolatedTest<unknown, unknown>>(testFn: (a: DataGenType<T> & ComponentGenType<T>) => void) =>
    (isolatedTest: T) => pipe(
        isolatedTest,
        runTest(testFn),
        fakeAsync
    );
