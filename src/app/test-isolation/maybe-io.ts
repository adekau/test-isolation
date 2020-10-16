import { IO, ioChain } from './io';
import { fold, Maybe } from './maybe';
import { pipe } from './pipe';

export const maybeIOChain = <A, B>(noneIO: (a: A) => IO<B>) => (someIO: (a: IO<A>, data: A) => IO<B>) => (mio: Maybe<IO<A>>) =>
    ioChain<A, B>(data => pipe(
        mio,
        fold(() => noneIO(data), c => someIO(c, data))
    ));
