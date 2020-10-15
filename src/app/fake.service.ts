import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class FakeService {
    constructor() { };

    public fakeMethod() {
        return 'if you get this return, the return of this method has not been overridden.';
    }
}
