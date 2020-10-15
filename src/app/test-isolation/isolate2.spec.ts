import { Component, NO_ERRORS_SCHEMA } from '@angular/core';
import { TestBed, tick } from '@angular/core/testing';

import { FakeService } from '../fake.service';
import { cleanup, componentGen, dataGen, runTest, runTestAsync, spyConfig } from './isolate2';
import { pipe } from './pipe';

type t = string & unknown;

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

    it('tests', pipe(strTester,
        spyConfig((q) => {
            const fakeService = TestBed.inject(FakeService);
            (fakeService.fakeMethod as jasmine.Spy).and.returnValue(`${q.str}, overridden`);
        }),
        runTestAsync(({ str, component, fixture }) => {
            const fakeService = TestBed.inject(FakeService);
            fixture.detectChanges();

            expect(str).toEqual('hello');
            expect(fakeService.fakeMethod()).toEqual('hello, overridden');
            expect(component).toBeDefined();

            console.log('expectations have computed');
        })
    ));
});
