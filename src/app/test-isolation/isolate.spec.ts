import { Observable, timer } from 'rxjs';
import { take } from 'rxjs/operators';

import { isolate } from './isolate';

describe('isolate', () => {
    const noop = () => { };

    describe('data creation/destruction', () => {
        const dataGen = jasmine.createSpy('dataGen').and.callFake(() => ({
            subj: {
                next: jasmine.createSpy('next'),
                complete: jasmine.createSpy('complete')
            }
        }));

        const cleanup = jasmine.createSpy('cleanup').and.callFake((data) => {
            expect(data).toEqual(jasmine.objectContaining({
                subj: jasmine.truthy()
            }));

            data.subj.complete();

            expect(data.subj.next).toHaveBeenCalledTimes(2);
            expect(data.subj.next).toHaveBeenCalledWith(5);
            expect(data.subj.next).toHaveBeenCalledWith(7);
            expect(data.subj.complete).toHaveBeenCalledTimes(1);
        });

        it('creates and passes data', isolate(dataGen)(noop)(data => {
            expect(dataGen).toHaveBeenCalled();
            expect(data).toEqual(jasmine.objectContaining({
                subj: jasmine.truthy()
            }));
        }));

        it('calls cleanup', isolate(dataGen)(cleanup)(data => {
            data.subj.next(5);
            data.subj.next(7);
        }));
    });

    describe('partial application', () => {
        const simpleDataGen = jasmine.createSpy('simpleDataGen').and.callFake(() => 500);
        const partialApplication = isolate(simpleDataGen)(noop);

        it('partially applies', partialApplication(data => {
            expect(data).toEqual(500);
        }));
    })

    describe('async', () => {
        const dataGen = () => 'hello';
        it('awaits asynchronous operations', isolate(dataGen)(noop)(data => {
            new Promise(resolve => {
                setTimeout(() => resolve(data), 1000);
            }).then(r => {
                expect(r).toEqual('hello');
            });
        }));

        const obsGen = () => timer(0, 250);
        const cleanupIsCalled = (obs: Observable<number>) => {
            expect(obs).toBeInstanceOf(Observable);
        };
        it('waits for observables', isolate(obsGen)(cleanupIsCalled)(obs => {
            const next = jasmine.createSpy('next');

            obs.pipe(
                take(4)
            ).subscribe({
                next,
                complete: () => {
                    expect(next).toHaveBeenCalledTimes(4);
                }
            });
        }));

        const asyncDataGen = async () => ({
            something: await Promise.resolve(5)
        });
        it('can use async/await in testFn', isolate(asyncDataGen)(noop)(async (data) => {
            const { something } = await data;
            const test = await new Promise(resolve => setTimeout(() => resolve(true), 1000));

            expect(something).toBe(5);
            expect(test).toBe(true);
        }));

        const asyncCleanup = async () => {
            const r = jasmine.createSpy('resolve').and.callFake((resolve) => resolve());
            await new Promise(resolve => setTimeout(() => r(resolve), 1000));

            expect(r).toHaveBeenCalled();
        };
        it('cleanup is async', isolate(noop)(asyncCleanup)(noop))

        const subGen = () => {
            const sub = timer(0, 100).pipe(take(10)).subscribe();
            const unsub = spyOn(sub, 'unsubscribe');
            return { sub, unsub };
        };
        const subCleanup = ({ sub, unsub }: ReturnType<typeof subGen>) => {
            sub.unsubscribe();

            expect(unsub).toHaveBeenCalledTimes(1);
        }
        it('should allow subscriptions in data generation to be cleaned up after use', isolate(subGen)(subCleanup)(({ unsub }) => {
            // it should not unsubscribe in the test run, only in cleanup
            expect(unsub).not.toHaveBeenCalled();
        }));
    });
});
