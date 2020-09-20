import { async } from '@angular/core/testing';

import { IO, ioMap, ioRun } from './io';
import { pipe } from './pipe';
import { ask, readerMap, readerRun } from './reader';

const createAsyncIsolate = <T>(dataGenerator: IO<T>) => (cleanupFn: (data: T) => (void | Promise<void>)) =>
    (testFn: (data: T) => (void | Promise<void>)) =>
        () => pipe(
            ask<T>(),
            readerMap((data) => pipe(
                () => testFn(data),
                ioMap(() => cleanupFn(data))
            )),
            readerRun(dataGenerator()),
            ioRun()
        );

export const isolate = <T>(dataGenerator: IO<T>) => (cleanupFn: (data: T) => (void | Promise<void>)) =>
    (testFn: (data: T) => (void | Promise<void>)) =>
        pipe(
            testFn,
            createAsyncIsolate(dataGenerator)(cleanupFn),
            async
        );
