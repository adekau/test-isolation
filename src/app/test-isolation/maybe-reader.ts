import { IO, ioChain } from './io';
import { fold, Maybe } from './maybe';
import { pipe } from './pipe';
import { Reader } from './reader';

export const maybeReaderIOChain = <A, B>(noneIO: (a: A) => IO<B>) => (someIO: (a: Reader<A, IO<B>>, data: A) => IO<B>) => (mr: Maybe<Reader<A, IO<B>>>) =>
    ioChain<A, B>(data => pipe(
        mr,
        fold(() => noneIO(data), r => someIO(r, data))
    ));
