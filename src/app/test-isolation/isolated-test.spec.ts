import { Component, NO_ERRORS_SCHEMA } from '@angular/core';
import { TestBed, tick } from '@angular/core/testing';
import { Observable, Subject, timer } from 'rxjs';
import { take } from 'rxjs/operators';

import { FakeService } from '../fake.service';
import {
    cleanup,
    componentGen,
    dataGen,
    DataGenType,
    emptyDataGen,
    IsolatedTest,
    runTestAsync,
    runTestFakeAsync,
    spyConfig,
} from './isolated-test';
import { pipe } from './pipe';

@Component({ selector: 'test-component' })
class TestComponent { }

describe('isolate2', () => {
    const createComponent = () => {
        const fixture = TestBed.createComponent(TestComponent);
        return { fixture, component: fixture.componentInstance };
    };

    beforeEach(() => {
        TestBed.configureTestingModule({
            schemas: [NO_ERRORS_SCHEMA],
            declarations: [TestComponent],
            providers: [
                {
                    provide: FakeService,
                    useValue: {
                        fakeMethod: jasmine.createSpy('fakeMethod').and.returnValue('test')
                    } as Partial<FakeService>
                }
            ]
        })
    });

    const strTester = pipe(
        dataGen(() => ({ str: 'hello' })),
        componentGen(createComponent),
        cleanup(({ fixture }) => fixture.destroy()),
    );

    const fakeCreateComponent: typeof createComponent = jasmine.createSpy().and.callFake(createComponent);

    it('configures spies before component creation', pipe(
        strTester,
        // overwrite the existing one
        componentGen(fakeCreateComponent),
        spyConfig((q) => {
            const fakeService = TestBed.inject(FakeService);
            (fakeService.fakeMethod as jasmine.Spy).and.returnValue(`${q.str}, overridden`);
            expect(fakeCreateComponent).not.toHaveBeenCalled();
        }),
        runTestAsync(({ str, component, fixture }) => {
            expect(fakeCreateComponent).toHaveBeenCalledTimes(1);
            const fakeService = TestBed.inject(FakeService);
            fixture.detectChanges();

            expect(str).toEqual('hello');
            expect(fakeService.fakeMethod()).toEqual('hello, overridden');
            expect(component).toBeDefined();
        })
    ));

    it('commutes', pipe(
        dataGen(() => ({ str: 'hello' })),
        // since componentGen transforms the type, if cleanup comes before the type will be incorrectly assumed
        // so will need to specify it if needed
        // like so:
        cleanup<IsolatedTest<{ str: string }, ReturnType<typeof createComponent>>>(data => {
            expect(data).toEqual({
                str: 'hello',
                component: jasmine.anything(),
                fixture: jasmine.anything()
            });
        }),
        componentGen(createComponent),
        // only allows use of non-component data.
        spyConfig(data => {
            expect(data).toEqual({
                str: 'hello'
            });
        }),
        runTestAsync(({ str, fixture, component }) => {
            expect(str).toEqual('hello');
            expect(fixture.detectChanges).toEqual(jasmine.any(Function));
            expect(component).toBeInstanceOf(TestComponent);
        })
    ));

    const noop = () => { };

    describe('data creation/destruction', () => {
        const subjGen: (() => {
            subj: {
                next: jasmine.Spy,
                complete: jasmine.Spy
            }
        }) = jasmine.createSpy('dataGen').and.callFake(() => ({
            subj: {
                next: jasmine.createSpy('next'),
                complete: jasmine.createSpy('complete')
            }
        }));

        const subjCleanup = ((data: ReturnType<typeof subjGen>) => {
            expect(data).toEqual(jasmine.objectContaining({
                subj: jasmine.truthy()
            }));

            data.subj.complete();

            expect(data.subj.next).toHaveBeenCalledTimes(2);
            expect(data.subj.next).toHaveBeenCalledWith(5);
            expect(data.subj.next).toHaveBeenCalledWith(7);
            expect(data.subj.complete).toHaveBeenCalledTimes(1);
        });
        it('creates and passes data', pipe(
            dataGen(subjGen),
            cleanup(({ subj }) => subj.complete()),
            runTestAsync(data => {
                expect(subjGen).toHaveBeenCalled();
                expect(data).toEqual(jasmine.objectContaining({
                    subj: jasmine.truthy()
                }));
            })
        ));

        it('calls cleanup', pipe(
            dataGen(subjGen),
            cleanup(subjCleanup),
            runTestAsync(data => {
                data.subj.next(5);
                data.subj.next(7);
            })
        ));
    });

    describe('async', () => {
        const strGen = () => ({
            str: 'hello'
        });
        const strTest = dataGen(strGen);
        it('awaits asynchronous operations', pipe(
            strTest,
            runTestAsync(data => {
                new Promise<DataGenType<typeof strTest>>(resolve => {
                    setTimeout(() => resolve(data), 250);
                }).then(r => {
                    expect(r.str).toEqual('hello');
                });
            })
        ));

        const obsGen = () => ({ obs: timer(0, 250) });
        const cleanupIsCalled = (o: { obs: Observable<number> }) => {
            expect(o.obs).toBeInstanceOf(Observable);
        };
        it('waits for observables', pipe(
            dataGen(obsGen),
            cleanup(cleanupIsCalled),
            runTestAsync(({ obs }) => {
                const next = jasmine.createSpy('next');

                obs.pipe(
                    take(4)
                ).subscribe({
                    next,
                    complete: () => {
                        expect(next).toHaveBeenCalledTimes(4);
                    }
                });
            })
        ));

        const asyncDataGen = async () => ({
            something: await Promise.resolve(5)
        });
        it('can use async/await in testFn', pipe(
            dataGen(asyncDataGen),
            runTestAsync(async (data) => {
                const { something } = await data;
                const test = await new Promise(resolve => setTimeout(() => resolve(true), 250));

                expect(something).toBe(5);
                expect(test).toBe(true);
            })
        ));

        const asyncCleanup = async () => {
            const r = jasmine.createSpy('resolve').and.callFake((resolve) => resolve());
            await new Promise(resolve => setTimeout(() => r(resolve), 250));

            expect(r).toHaveBeenCalled();
        };
        it('cleanup is async', pipe(
            dataGen(() => ({})),
            cleanup(asyncCleanup),
            runTestAsync(noop)
        ));

        const subGen = () => {
            const sub = timer(0, 100).pipe(take(10)).subscribe();
            const unsub = spyOn(sub, 'unsubscribe');
            return { sub, unsub };
        };
        const subCleanup = ({ sub, unsub }: ReturnType<typeof subGen>) => {
            sub.unsubscribe();

            expect(unsub).toHaveBeenCalledTimes(1);
        }
        it('should allow subscriptions in data generation to be cleaned up after use', pipe(
            dataGen(subGen),
            cleanup(subCleanup),
            runTestAsync(({ unsub }) => {
                // it should not unsubscribe in the test run, only in cleanup
                expect(unsub).not.toHaveBeenCalled();
            })
        ));

        const longWaitGen = async () => {
            return await new Promise<{ test: string }>(resolve => {
                setTimeout(() => resolve({ test: 'data' }), 500);
            });
        };
        it('waits for long running async data', pipe(
            dataGen(longWaitGen),
            runTestAsync(async data => {
                const { test } = await data;

                expect(test).toEqual('data');
            })
        ));

        const testSubjectsGen = () => {
            const subj$ = new Subject<number>();
            const next = jasmine.createSpy('next');
            const sub = subj$.subscribe({ next });
            return { subj$, next, sub };
        };
        const testSubjectsCleanup = ({ subj$, next, sub }: ReturnType<typeof testSubjectsGen>) => {
            const complete = spyOn(subj$, 'complete');
            const unsub = spyOn(sub, 'unsubscribe');

            subj$.complete();
            sub.unsubscribe();

            expect(complete).toHaveBeenCalledTimes(1);
            expect(unsub).toHaveBeenCalledTimes(1);
            expect(next).toHaveBeenCalledTimes(3);
        };
        const testSubjectsSetup = pipe(
            dataGen(testSubjectsGen),
            cleanup(testSubjectsCleanup)
        );
        it('tests subjects', pipe(
            testSubjectsSetup,
            runTestAsync(({ subj$, next }) => {
                subj$.next(10);
                expect(next).toHaveBeenCalledTimes(1);
                expect(next).toHaveBeenCalledWith(10);

                subj$.next(15);
                subj$.next(-2);

                expect(next).toHaveBeenCalledTimes(3);
                expect(next).toHaveBeenCalledWith(15);
                expect(next).toHaveBeenCalledWith(-2);
            })
        ));
    });

    describe('tick', () => {
        it('cannot use tick in runTestAsync', runTestAsync(() => {
            expect(tick).toThrow();
        })(emptyDataGen()));

        it('can use tick in runTestFakeAsync', runTestFakeAsync(() => {
            expect(tick).not.toThrow();
        })(emptyDataGen()));
    });

    describe('errors', () => {
        it('errors if no datagen provided', () => {
            const spy = jasmine.createSpy().and.callFake(() => {
                runTestAsync(() => { })({} as IsolatedTest<any, any>);
            });
            expect(spy).toThrow();
        });

        it('does not error if datagen is provided', () => {
            const spy = jasmine.createSpy().and.callFake(() => {
                runTestAsync(() => { })(dataGen(() => ({})));
            });
            expect(spy).not.toThrow();
        });
    });
});
