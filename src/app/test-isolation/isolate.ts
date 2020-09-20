import { async } from '@angular/core/testing';

import { IO, ioMap } from './io';
import { pipe } from './pipe';
import { ask, readerMap } from './reader';

export const isolate = <T>(dataGenerator: IO<T>) => (cleanupFn: (data: T) => (void | Promise<void>)) =>
    (testFn: (data: T) => (void | Promise<void>)) =>
        async(() => pipe(
            ask<T>(),
            readerMap((data) => pipe(
                () => testFn(data),
                ioMap(() => cleanupFn(data))
            ))
        )(dataGenerator())());
